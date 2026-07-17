// Authoritative PvP server.
//
// Unlike relay.mjs / prod.mjs (which only forward opaque game messages
// peer-to-peer and let the host client simulate), THIS server runs the actual
// game simulation. The bundled GameEngine lives inside this Node process:
//   - each client only sends its InputFrame (movement / fire / gadget / ...)
//   - the server simulates BOTH players + the whole world every tick
//   - the server broadcasts a full Snapshot to both clients 30x/sec
//
// So the "players' host client" never computes anything — it's a thin input
// sender + snapshot mirror, exactly as requested for server-authoritative PvP.
//
//   npm run server:auth        # listens on :8081 (set PORT to change)
//   WS URL for clients:  ws://<host>:<PORT>

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { GameEngine } from "./engine.bundle.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../dist");
const PORT = Number(process.env.PORT) || 8080;
const TICK_HZ = 60;
const TICK_MS = 1000 / TICK_HZ;

// ---------------------------------------------------------------- static files
const server = http.createServer((req, res) => {
  fs.readFile(path.join(DIST, "index.html"), (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("dist/index.html not found. Run `npm run build` first.");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(data);
  });
});

// ---------------------------------------------------------------- authoritative rooms
const wss = new WebSocketServer({ server });
const rooms = new Map(); // code -> room
const queue = []; // quick-match waiting players
let pidCounter = 1; // only used to tag sockets; per-room roles are fixed 1/2

function genRoom() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = "";
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

function send(ws, obj) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

function broadcast(room, obj) {
  for (const p of room.peers.values()) send(p.ws, obj);
}

/** Tell both peers the match is paired and they may enter the loadout screen.
 *  We must NOT start the simulation yet: clients only send their loadout via
 *  `hello` once they are inside the game. Starting the sim here would deadlock —
 *  a client can't enter the game until it receives `start`, but `start` was
 *  previously only sent after BOTH loadouts had arrived (which never happens). */
function notifyReady(room) {
  if (room.notified) return;
  room.notified = true;
  for (const [pid, peer] of room.peers) {
    const other = pid === 1 ? room.peers.get(2) : room.peers.get(1);
    send(peer.ws, { t: "peer", pid: other.pid, name: other.name, host: false });
    send(peer.ws, { t: "start", youPid: pid });
  }
}

/** Spin up the authoritative simulation for a room once both loadouts are known. */
function startEngine(room) {
  if (room.engine) return;
  const a = room.peers.get(1);
  const b = room.peers.get(2);
  if (!a || !b || !a.loadout || !b.loadout) return;

  const engine = new GameEngine(null, a.loadout, () => {}, { mode: "server" });
  engine.startHeadless();
  engine.setupServerMatch(b.loadout, 1, 2);
  engine.serverStartMatch();
  room.engine = engine;

  // fixed 60Hz authoritative tick: step the sim, then broadcast the snapshot
  room.timer = setInterval(() => {
    try {
      engine.stepServer(1 / TICK_HZ);
      const snap = engine.buildSnapshot();
      broadcast(room, { t: "msg", data: { t: "snap", snap } });
    } catch (e) {
      console.error(`[auth] room ${room.code} tick error:`, e);
    }
  }, TICK_MS);
}

function addPeer(room, ws, name, role) {
  // role is the FIXED per-room pid: creator = 1, joiner = 2
  const pid = role;
  room.peers.set(pid, { pid, ws, name: String(name || "玩家").slice(0, 16), loadout: null });
  ws.pid = pid;
}

wss.on("connection", (ws) => {
  ws.pid = null;
  ws.room = null;

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg.t !== "string") return;

    if (msg.t === "create") {
      const code = genRoom();
      const room = { code, peers: new Map(), engine: null, timer: null };
      rooms.set(code, room);
      ws.room = code;
      addPeer(room, ws, msg.name, 1);
      send(ws, { t: "created", room: code, pid: 1 });
    } else if (msg.t === "join") {
      const code = String(msg.room || "").toUpperCase();
      const room = rooms.get(code);
      if (!room) return send(ws, { t: "error", msg: "房间不存在" });
      if (room.peers.size >= 2) return send(ws, { t: "error", msg: "房间已满" });
      ws.room = code;
      addPeer(room, ws, msg.name, 2);
      send(ws, { t: "joined", room: code, pid: 2 });
      if (room.peers.size === 2) notifyReady(room);
    } else if (msg.t === "find") {
      const name = String(msg.name || "玩家").slice(0, 16);
      if (queue.length > 0) {
        const other = queue.shift();
        const code = genRoom();
        const room = { code, peers: new Map(), engine: null, timer: null };
        rooms.set(code, room);
        other.ws.room = code;
        addPeer(room, other.ws, other.name, 1);
        ws.room = code;
        addPeer(room, ws, name, 2);
        send(other.ws, { t: "created", room: code, pid: 1 });
        send(ws, { t: "joined", room: code, pid: 2 });
        notifyReady(room);
      } else {
        queue.push({ ws, name });
        ws.pid = pidCounter++;
        send(ws, { t: "queued" });
      }
    } else if (msg.t === "msg") {
      const room = ws.room && rooms.get(ws.room);
      if (!room) return;
      const data = msg.data;
      if (!data || typeof data.t !== "string") return;

      if (data.t === "hello") {
        const peer = room.peers.get(ws.pid);
        if (peer) peer.loadout = data.loadout;
        // once both loadouts are known, boot the authoritative simulation
        startEngine(room);
      } else if (data.t === "inp") {
        // route the peer's input frame into the authoritative engine
        if (room.engine && ws.pid != null) room.engine.setPeerInput(ws.pid, data.input);
      }
      // client-sent "snap" is ignored (server is authoritative)
    }
  });

  ws.on("close", () => {
    const qi = queue.findIndex((q) => q.ws === ws);
    if (qi >= 0) queue.splice(qi, 1);
    const room = ws.room && rooms.get(ws.room);
    if (room) {
      for (const p of room.peers.values()) if (p.ws !== ws) send(p.ws, { t: "peerLeft" });
      if (room.timer) clearInterval(room.timer);
      room.peers.delete(ws.pid);
      if (room.peers.size === 0) rooms.delete(ws.room);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[auth] authoritative PvP server listening on http://localhost:${PORT}`);
});
