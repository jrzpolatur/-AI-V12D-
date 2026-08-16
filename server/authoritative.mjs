// Authoritative Multiplayer Server (supporting 8-Player Deathmatch Rooms).
//
// Responsibilities:
//   - Manage room creation, joining, lobby state, ready checks, and public room lists.
//   - On match start (min 2 real players, up to 8), spin up an authoritative GameEngine.
//   - Dynamically fill vacant slots with AI bots (e.g. 2 humans + 6 bots, or 8 humans + 0 bots).
//   - Run a fixed 30Hz authoritative simulation loop (stepping real player inputs and AI bots).
//   - Broadcast 30Hz Snapshots to all connected room clients.

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

const TICK_HZ = 30;
const TICK_MS = 1000 / TICK_HZ;
const STEP = 1 / TICK_HZ;
const RECONNECT_GRACE_MS = 15000;

// ---------------------------------------------------------------- static files
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
  if (handleAnnouncementAuth(req, res)) return;

  const url = (req.url || "").split("?")[0];
  if (url === "/api/online") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ count: wss ? wss.clients.size : 0 }));
    return;
  }

  serveStatic(req, res);
});

// ---------------------------------------------------------------- authoritative rooms
const wss = new WebSocketServer({ server });
const rooms = new Map(); // code -> Room
const queues = {}; // mode -> queue[]

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
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

function broadcast(room, obj) {
  for (const p of room.peers.values()) {
    if (p.ws && !p.disconnected) send(p.ws, obj);
  }
}

function getRoomState(room) {
  const peers = [];
  for (const [pid, p] of room.peers) {
    peers.push({
      pid,
      name: p.name,
      isHost: pid === room.hostPid,
      ready: p.ready,
      loadout: p.loadout,
      ping: p.ping ?? 0,
    });
  }
  return {
    code: room.code,
    name: room.name || `${room.peers.get(room.hostPid)?.name || "玩家"}的房间`,
    hostPid: room.hostPid,
    mode: room.mode || "deathmatch",
    maxPlayers: room.maxPlayers || 8,
    targetKills: room.targetKills || 24,
    state: room.state || "lobby",
    peers,
  };
}

function broadcastRoomState(room) {
  const state = getRoomState(room);
  for (const [pid, p] of room.peers) {
    if (p.ws && !p.disconnected) {
      send(p.ws, { t: "roomState", room: state, youPid: pid });
    }
  }
}

function getRoomList() {
  const list = [];
  for (const room of rooms.values()) {
    if (room.state !== "lobby" && room.state !== "in_game") continue;
    const hostPeer = room.peers.get(room.hostPid);
    list.push({
      code: room.code,
      name: room.name || `${hostPeer?.name || "玩家"}的房间`,
      hostName: hostPeer?.name || "房主",
      count: room.peers.size,
      max: room.maxPlayers || 8,
      mode: room.mode || "deathmatch",
      state: room.state || "lobby",
    });
  }
  return list;
}

function broadcastRoomList() {
  const list = getRoomList();
  for (const client of wss.clients) {
    if (client.readyState === 1 && !client.room) {
      send(client, { t: "roomList", rooms: list });
    }
  }
}

/** (Re)start the authoritative 30Hz tick for a room. */
function startTick(room) {
  if (room.timer) clearInterval(room.timer);
  room.acc = 0;
  room.lastTick = Date.now();
  room.timer = setInterval(() => {
    const now = Date.now();
    room.acc += (now - room.lastTick) / 1000;
    room.lastTick = now;
    if (room.acc > STEP * 5) room.acc = STEP;
    if (room.acc < STEP) return;
    room.acc -= STEP;
    try {
      if (room.engine) {
        room.engine.stepServer(STEP);
        const snap = room.engine.buildSnapshot();
        broadcast(room, { t: "msg", data: { t: "snap", snap } });
      }
    } catch (e) {
      console.error(`[auth] room ${room.code} tick error:`, e);
    }
  }, Math.max(4, Math.floor(TICK_MS / 4)));
}

/** Start multiplayer match simulation with N real peers + (8 - N) bots. */
function startMultiplayerEngine(room) {
  if (room.engine) return;
  const peerList = [];
  for (const [pid, p] of room.peers) {
    peerList.push({ pid, name: p.name, loadout: p.loadout });
  }
  if (peerList.length < 1) return;

  const hostLoadout = peerList[0].loadout;
  const engine = new GameEngine(null, hostLoadout, () => {}, { mode: "server" });
  engine.startHeadless();
  engine.setupServerMultiplayerMatch(peerList, room.maxPlayers || 8);
  engine.serverStartMatch();
  room.engine = engine;
  startTick(room);
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

    // -------------------------------- Room Lobby Messages --------------------------------
    if (msg.t === "roomList") {
      send(ws, { t: "roomList", rooms: getRoomList() });
    } else if (msg.t === "createRoom") {
      const code = genRoom();
      const room = {
        code,
        name: String(msg.roomName || `${msg.name || "玩家"}的房间`).slice(0, 24),
        hostPid: 1,
        mode: msg.mode || "deathmatch",
        maxPlayers: 8,
        targetKills: msg.targetKills || 24,
        state: "lobby",
        peers: new Map(),
        engine: null,
        timer: null,
        graceTimers: new Map(),
      };
      rooms.set(code, room);
      ws.room = code;
      ws.pid = 1;
      room.peers.set(1, {
        pid: 1,
        ws,
        name: String(msg.name || "房主").slice(0, 16),
        ready: true,
        loadout: msg.loadout || null,
        disconnected: false,
      });
      broadcastRoomState(room);
      broadcastRoomList();
    } else if (msg.t === "joinRoom") {
      const code = String(msg.room || "").toUpperCase();
      const room = rooms.get(code);
      if (!room) return send(ws, { t: "error", msg: "房间不存在" });
      if (room.peers.size >= (room.maxPlayers || 8)) return send(ws, { t: "error", msg: "房间已满" });
      if (room.state !== "lobby") return send(ws, { t: "error", msg: "对局已在进行中" });

      let pid = 1;
      while (room.peers.has(pid)) pid++;

      ws.room = code;
      ws.pid = pid;
      room.peers.set(pid, {
        pid,
        ws,
        name: String(msg.name || `玩家${pid}`).slice(0, 16),
        ready: false,
        loadout: msg.loadout || null,
        disconnected: false,
      });
      broadcastRoomState(room);
      broadcastRoomList();
    } else if (msg.t === "leaveRoom") {
      const room = ws.room && rooms.get(ws.room);
      if (room) {
        room.peers.delete(ws.pid);
        ws.room = null;
        ws.pid = null;
        if (room.peers.size === 0) {
          if (room.timer) clearInterval(room.timer);
          rooms.delete(room.code);
        } else {
          if (room.hostPid === ws.pid) {
            const newHostPid = room.peers.keys().next().value;
            room.hostPid = newHostPid;
            const newHost = room.peers.get(newHostPid);
            if (newHost) newHost.ready = true;
          }
          broadcastRoomState(room);
        }
        broadcastRoomList();
      }
    } else if (msg.t === "setReady") {
      const room = ws.room && rooms.get(ws.room);
      if (room && room.peers.has(ws.pid)) {
        const p = room.peers.get(ws.pid);
        if (ws.pid !== room.hostPid) {
          p.ready = !!msg.ready;
          broadcastRoomState(room);
        }
      }
    } else if (msg.t === "updateRoomLoadout") {
      const room = ws.room && rooms.get(ws.room);
      if (room && room.peers.has(ws.pid)) {
        const p = room.peers.get(ws.pid);
        p.loadout = msg.loadout;
        broadcastRoomState(room);
      }
    } else if (msg.t === "startMatch") {
      const room = ws.room && rooms.get(ws.room);
      if (!room) return;
      if (ws.pid !== room.hostPid) return send(ws, { t: "error", msg: "只有房主才能开始游戏" });
      if (room.peers.size < 2) return send(ws, { t: "error", msg: "至少需要 2 名真人玩家才能开局" });

      for (const [pid, p] of room.peers) {
        if (pid !== room.hostPid && !p.ready) {
          return send(ws, { t: "error", msg: `玩家 ${p.name} 尚未准备就绪` });
        }
      }

      room.state = "in_game";
      startMultiplayerEngine(room);

      for (const [pid, p] of room.peers) {
        send(p.ws, { t: "matchStart", room: room.code, youPid: pid, totalPlayers: room.maxPlayers || 8 });
      }
      broadcastRoomList();
    }

    // -------------------------------- In-Game / Legacy Control Messages --------------------------------
    else if (msg.t === "create") {
      const code = genRoom();
      const room = {
        code,
        name: `${msg.name || "玩家"}的房间`,
        hostPid: 1,
        mode: "deathmatch",
        maxPlayers: 8,
        targetKills: 24,
        state: "lobby",
        peers: new Map(),
        engine: null,
        timer: null,
        graceTimers: new Map(),
      };
      rooms.set(code, room);
      ws.room = code;
      ws.pid = 1;
      room.peers.set(1, { pid: 1, ws, name: String(msg.name || "玩家1").slice(0, 16), loadout: null, ready: true, disconnected: false });
      send(ws, { t: "created", room: code, pid: 1 });
    } else if (msg.t === "join") {
      const code = String(msg.room || "").toUpperCase();
      const room = rooms.get(code);
      if (!room) return send(ws, { t: "error", msg: "房间不存在" });
      if (room.peers.size >= 8) return send(ws, { t: "error", msg: "房间已满" });
      let pid = 1;
      while (room.peers.has(pid)) pid++;
      ws.room = code;
      ws.pid = pid;
      room.peers.set(pid, { pid, ws, name: String(msg.name || `玩家${pid}`).slice(0, 16), loadout: null, ready: false, disconnected: false });
      send(ws, { t: "joined", room: code, pid });
    } else if (msg.t === "find") {
      const name = String(msg.name || "玩家").slice(0, 16);
      const mode = msg.mode || "default";
      if (!queues[mode]) queues[mode] = [];
      if (queues[mode].length > 0) {
        const other = queues[mode].shift();
        const code = genRoom();
        const room = {
          code,
          name: "快速匹配房间",
          hostPid: 1,
          mode: "deathmatch",
          maxPlayers: 8,
          targetKills: 20,
          state: "lobby",
          peers: new Map(),
          engine: null,
          timer: null,
          graceTimers: new Map(),
        };
        rooms.set(code, room);
        other.ws.room = code;
        other.ws.pid = 1;
        room.peers.set(1, { pid: 1, ws: other.ws, name: other.name, loadout: null, ready: true, disconnected: false });
        ws.room = code;
        ws.pid = 2;
        room.peers.set(2, { pid: 2, ws, name, loadout: null, ready: true, disconnected: false });
        send(other.ws, { t: "created", room: code, pid: 1 });
        send(ws, { t: "joined", room: code, pid: 2 });
        send(other.ws, { t: "peer", pid: 2, name, host: false });
        send(other.ws, { t: "start", youPid: 1 });
        send(ws, { t: "peer", pid: 1, name: other.name, host: false });
        send(ws, { t: "start", youPid: 2 });
      } else {
        queues[mode].push({ ws, name });
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
        if (!room.engine && room.peers.size >= 2) {
          const allHaveLoadout = Array.from(room.peers.values()).every(p => !!p.loadout);
          if (allHaveLoadout) {
            startMultiplayerEngine(room);
          }
        }
      } else if (data.t === "inp") {
        if (room.engine && ws.pid != null) {
          room.engine.setPeerInput(ws.pid, data.input);
        }
      }
    } else if (msg.t === "rejoin") {
      const code = String(msg.room || "").toUpperCase();
      const room = rooms.get(code);
      if (!room) return send(ws, { t: "error", msg: "房间已失效，请重新匹配" });
      const pid = Number(msg.pid);
      const peer = room.peers.get(pid);
      if (!peer) return send(ws, { t: "error", msg: "房间已失效，请重新匹配" });

      if (room.graceTimers?.has(pid)) {
        clearTimeout(room.graceTimers.get(pid));
        room.graceTimers.delete(pid);
      }

      peer.ws = ws;
      peer.disconnected = false;
      peer.name = String(msg.name || peer.name || "玩家").slice(0, 16);
      if (msg.loadout) peer.loadout = msg.loadout;
      ws.room = code;
      ws.pid = pid;

      send(ws, { t: "matchStart", room: code, youPid: pid, totalPlayers: room.maxPlayers || 8 });
      send(ws, { t: "start", youPid: pid });
      broadcast(room, { t: "peerBack" });

      if (room.engine) startTick(room);
    }
  });

  ws.on("close", () => {
    for (const k of Object.keys(queues)) {
      const qi = queues[k].findIndex((q) => q.ws === ws);
      if (qi >= 0) { queues[k].splice(qi, 1); break; }
    }
    const room = ws.room && rooms.get(ws.room);
    if (!room) return;
    const peer = ws.pid != null ? room.peers.get(ws.pid) : null;
    if (!peer) return;

    if (room.state === "lobby") {
      // In lobby: drop immediately
      room.peers.delete(ws.pid);
      if (room.peers.size === 0) {
        rooms.delete(room.code);
      } else {
        if (room.hostPid === ws.pid) {
          const newHostPid = room.peers.keys().next().value;
          room.hostPid = newHostPid;
          const newHost = room.peers.get(newHostPid);
          if (newHost) newHost.ready = true;
        }
        broadcastRoomState(room);
      }
      broadcastRoomList();
      return;
    }

    // In match: grace period for reconnection
    peer.disconnected = true;
    broadcast(room, { t: "peerGone" });
    if (!room.graceTimers) room.graceTimers = new Map();
    room.graceTimers.set(ws.pid, setTimeout(() => {
      room.peers.delete(ws.pid);
      broadcast(room, { t: "peerLeft" });
      room.graceTimers.delete(ws.pid);
      const activeCount = Array.from(room.peers.values()).filter(p => !p.disconnected).length;
      if (activeCount === 0) {
        if (room.timer) {
          clearInterval(room.timer);
          room.timer = null;
        }
        room.engine = null;
        rooms.delete(room.code);
        broadcastRoomList();
      }
    }, RECONNECT_GRACE_MS));
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[auth] Authoritative multiplayer server listening on http://0.0.0.0:${PORT}`);
});
