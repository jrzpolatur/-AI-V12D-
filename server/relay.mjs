// Lightweight WebSocket relay for 1v1 co-op-base-defense + PvP.
// It does NOT run any game logic — it only pairs two clients by room code
// and forwards opaque game messages between them.
//
//   npm run server            # listens on :8080 (set PORT to change)
//   WS URL for clients:  ws://<host>:8080
//
// Control messages (server <-> client):
//   C->S { t:"create", name }              create a room, become host
//   C->S { t:"join",   room, name }        join an existing room
//   C->S { t:"find",   name }              quick match: pair with next waiting player
//   C->S { t:"msg",    data }              opaque game payload -> forwarded to peer
//   S->C { t:"created", room, pid }        you created a room
//   S->C { t:"joined",  room, pid }        you joined a room
//   S->C { t:"queued" }                    find() accepted, waiting for an opponent
//   S->C { t:"peer",    pid, name, host }  info about the other player
//   S->C { t:"start" }                     both players present, game may begin
//   S->C { t:"msg",     data }             a game payload from your peer
//   S->C { t:"peerLeft" }                  your opponent disconnected
//   S->C { t:"error",   msg }              something went wrong

import http from "http";
import { WebSocketServer } from "ws";
import { handleAnnouncement } from "./common.mjs";

const PORT = Number(process.env.PORT) || 8080;

// HTTP server: serves the announcement / message-board API + admin page.
// (The relay itself only forwards opaque game messages over WebSocket.)
const server = http.createServer((req, res) => {
  if (handleAnnouncement(req, res)) return;
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("not found");
});

const wss = new WebSocketServer({ server });

/** roomCode -> { peers: Map<pid, {ws, name, host}> } */
const rooms = new Map();
/** players waiting for a quick match */
const queue = [];
let pidCounter = 1;

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

function peerInfo(peer) {
  return { t: "peer", pid: peer.pid, name: peer.name, host: peer.host };
}

function notifyPeers(room, exceptPid) {
  for (const peer of room.peers.values()) {
    if (peer.pid === exceptPid) continue;
    send(peer.ws, { t: "peerLeft" });
  }
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
      const pid = pidCounter++;
      const room = { peers: new Map() };
      const peer = { pid, ws, name: String(msg.name || "Host").slice(0, 16), host: true };
      room.peers.set(pid, peer);
      rooms.set(code, room);
      ws.pid = pid;
      ws.room = code;
      send(ws, { t: "created", room: code, pid });
    } else if (msg.t === "join") {
      const code = String(msg.room || "").toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        send(ws, { t: "error", msg: "房间不存在" });
        return;
      }
      if (room.peers.size >= 2) {
        send(ws, { t: "error", msg: "房间已满" });
        return;
      }
      const pid = pidCounter++;
      const peer = { pid, ws, name: String(msg.name || "Guest").slice(0, 16), host: false };
      room.peers.set(pid, peer);
      ws.pid = pid;
      ws.room = code;
      send(ws, { t: "joined", room: code, pid });
      // tell everyone (including the new peer) about each other
      for (const p of room.peers.values()) {
        for (const other of room.peers.values()) {
          if (other.pid !== p.pid) send(p.ws, peerInfo(other));
        }
      }
      // both present -> start
      for (const p of room.peers.values()) send(p.ws, { t: "start" });
    } else if (msg.t === "find") {
      const name = String(msg.name || "玩家").slice(0, 16);
      const qi = queue.findIndex((q) => q.ws === ws);
      if (qi >= 0) queue.splice(qi, 1);
      if (queue.length > 0) {
        const other = queue.shift();
        const code = genRoom();
        const room = { peers: new Map() };
        const pidA = other.pid;
        const pidB = pidCounter++;
        room.peers.set(pidA, { pid: pidA, ws: other.ws, name: other.name, host: true });
        room.peers.set(pidB, { pid: pidB, ws, name, host: false });
        rooms.set(code, room);
        other.ws.pid = pidA; other.ws.room = code;
        ws.pid = pidB; ws.room = code;
        send(other.ws, { t: "created", room: code, pid: pidA });
        send(ws, { t: "joined", room: code, pid: pidB });
        for (const p of room.peers.values())
          for (const o of room.peers.values())
            if (o.pid !== p.pid) send(p.ws, peerInfo(o));
        for (const p of room.peers.values()) send(p.ws, { t: "start" });
      } else {
        const pid = pidCounter++;
        queue.push({ ws, pid, name });
        ws.pid = pid; ws.room = null;
        send(ws, { t: "queued" });
      }
    } else if (msg.t === "msg") {
      const room = ws.room && rooms.get(ws.room);
      if (!room) return;
      for (const peer of room.peers.values()) {
        if (peer.pid !== ws.pid) send(peer.ws, { t: "msg", data: msg.data });
      }
    }
  });

  ws.on("close", () => {
    const qi = queue.findIndex((q) => q.ws === ws);
    if (qi >= 0) queue.splice(qi, 1);
    const room = ws.room && rooms.get(ws.room);
    if (room) {
      notifyPeers(room, ws.pid);
      room.peers.delete(ws.pid);
      if (room.peers.size === 0) rooms.delete(ws.room);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[relay] http + ws listening on http://localhost:${PORT}`);
});
