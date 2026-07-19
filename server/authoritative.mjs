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
import { handleAnnouncement as handleAnnouncementAuth } from "./common.mjs";
import { GameEngine } from "./engine.bundle.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../dist");
const PORT = Number(process.env.PORT) || 8080;
// The authoritative loop runs at a fixed 30Hz. This is a deliberate trade-off:
// stepping + serializing a full snapshot every tick is the dominant server cost,
// and on busy matches a 60Hz loop drops well below 30Hz (and feels like 5-10fps).
// 30Hz stays comfortably under the per-tick budget, and the client interpolates
// snapshots via `ease()`, so 30Hz looks smooth. (Physics/input are still sampled
// at 30Hz, which is plenty for a top-down shooter.)
const TICK_HZ = 30;
const TICK_MS = 1000 / TICK_HZ;
const STEP = 1 / TICK_HZ; // fixed simulation timestep (seconds)
// After a client disconnects we keep the room (and its authoritative engine)
// alive for this long, so a transient reconnect can rejoin the SAME match
// instead of being forced to re-match from scratch.
const RECONNECT_GRACE_MS = 15000;

// ---------------------------------------------------------------- static files
// Serve real files from dist (e.g. public/ads.txt copied during build) before
// falling back to the single-file build for SPA routes.
const STATIC_TYPES = {
  ".txt": "text/plain; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".css": "text/css",
  ".js": "text/javascript",
  ".map": "application/json",
  ".xml": "application/xml",
};

function serveIndex(res) {
  fs.readFile(path.join(DIST, "index.html"), (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("dist/index.html not found. Run `npm run build` first.");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(data);
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  const rel = decodeURIComponent(url.pathname);
  if (rel === "/" || rel === "") return serveIndex(res);
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, "");
  const file = path.join(DIST, safe);
  if (!file.startsWith(DIST)) return serveIndex(res);
  fs.readFile(file, (err, data) => {
    if (err) return serveIndex(res);
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "Content-Type": STATIC_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  // Announcement / message-board API + admin page (handled before static).
  if (handleAnnouncementAuth(req, res)) return;
  serveStatic(req, res);
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

/** (Re)start the authoritative 60Hz tick for a room. Safe to call when the
 *  tick is already paused (timer === null) so a rejoining peer resumes smoothly. */
function startTick(room) {
  if (room.timer) clearInterval(room.timer);
  room.acc = 0;
  room.lastTick = Date.now();
  // Drive the loop with a tight scheduler (well above the target rate) and step
  // the simulation from a real-time accumulator. A naive setInterval(TICK_MS)
  // drifts badly under event-loop load (timer coalescing drops ticks even when
  // each step is sub-millisecond), which is what made the match feel like 5-10fps.
  // The accumulator guarantees a true TICK_HZ regardless of timer slack.
  room.timer = setInterval(() => {
    const now = Date.now();
    room.acc += (now - room.lastTick) / 1000;
    room.lastTick = now;
    // never let a stalled loop "catch up" with a burst of steps
    if (room.acc > STEP * 5) room.acc = STEP;
    if (room.acc < STEP) return;
    room.acc -= STEP;
    try {
      room.engine.stepServer(STEP);
      const snap = room.engine.buildSnapshot();
      broadcast(room, { t: "msg", data: { t: "snap", snap } });
    } catch (e) {
      console.error(`[auth] room ${room.code} tick error:`, e);
    }
  }, Math.max(4, Math.floor(TICK_MS / 4)));
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
  startTick(room);
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
    } else if (msg.t === "rejoin") {
      // A previously-matched client is reconnecting after a transient drop.
      // Re-attach its socket to the SAME room/pid so the match resumes instead
      // of forcing a fresh re-match.
      const code = String(msg.room || "").toUpperCase();
      const room = rooms.get(code);
      if (!room) return send(ws, { t: "error", msg: "房间已失效，请重新匹配" });
      const pid = Number(msg.pid);
      const peer = room.peers.get(pid);
      if (!peer) return send(ws, { t: "error", msg: "房间已失效，请重新匹配" });

      // cancel the grace timer we started on disconnect
      if (room.graceTimers?.has(pid)) {
        clearTimeout(room.graceTimers.get(pid));
        room.graceTimers.delete(pid);
      }

      // re-bind this socket to the existing peer slot
      peer.ws = ws;
      peer.disconnected = false;
      peer.name = String(msg.name || peer.name || "玩家").slice(0, 16);
      if (msg.loadout) peer.loadout = msg.loadout;
      ws.room = code;
      ws.pid = pid;

      const other = pid === 1 ? room.peers.get(2) : room.peers.get(1);
      // tell the rejoining peer who the opponent is + that play may resume
      send(ws, { t: "peer", pid: other?.pid ?? 0, name: other?.name ?? "", host: false });
      send(ws, { t: "start", youPid: pid });
      // tell the opponent the peer is back
      if (other && !other.disconnected) send(other.ws, { t: "peerBack" });

      // resume (or boot) the authoritative sim
      if (room.engine) startTick(room);
      else startEngine(room);
    }
  });

  ws.on("close", () => {
    const qi = queue.findIndex((q) => q.ws === ws);
    if (qi >= 0) queue.splice(qi, 1);
    const room = ws.room && rooms.get(ws.room);
    if (!room) return;
    const peer = ws.pid != null ? room.peers.get(ws.pid) : null;
    if (!peer) return;

    // The peer dropped, but we keep the room + engine alive for a grace period
    // so a quick reconnect can resume the match. The opponent is told the peer
    // is gone (not permanently left) and the sim is paused to avoid desync.
    peer.disconnected = true;
    const other = ws.pid === 1 ? room.peers.get(2) : room.peers.get(1);
    if (other && !other.disconnected) send(other.ws, { t: "peerGone" });
    if (room.timer) {
      clearInterval(room.timer);
      room.timer = null;
    }
    if (!room.graceTimers) room.graceTimers = new Map();
    room.graceTimers.set(ws.pid, setTimeout(() => {
      // grace expired without a rejoin: tear the room down for good
      room.peers.delete(ws.pid);
      if (other && !other.disconnected) send(other.ws, { t: "peerLeft" });
      if (room.timer) {
        clearInterval(room.timer);
        room.timer = null;
      }
      room.engine = null;
      room.graceTimers.delete(ws.pid);
      if (room.peers.size === 0) rooms.delete(room.code);
    }, RECONNECT_GRACE_MS));
  });
});

server.listen(PORT, () => {
  console.log(`[auth] authoritative PvP server listening on http://localhost:${PORT}`);
});
