// Production server: serves the built single-file frontend (dist/index.html)
// AND runs the WebSocket relay on the SAME HTTP server.
//
// Why combined?
//   - One process, one URL, one deploy. You share a single https link with
//     your friend and they're playing — no local install needed.
//   - WebSocket rides on the same HTTP server, so behind an HTTPS proxy
//     (Render / Railway / Fly / etc.) it becomes wss:// automatically and is
//     never blocked by browser mixed-content rules.
//
//   PORT env      -> listen port (platforms inject this; default 8080)
//   npm start     -> node server/prod.mjs
//
// Relay protocol is identical to server/relay.mjs — see that file for docs.

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { handleAnnouncement } from "./common.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../dist");
const PORT = Number(process.env.PORT) || 8080;

// ---- Static file serving ----
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
  const file = path.join(DIST, "index.html");
  fs.readFile(file, (err, data) => {
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
  // prevent path traversal
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
  if (handleAnnouncement(req, res)) return;
  serveStatic(req, res);
});

// ---- WebSocket relay (same logic as server/relay.mjs) ----
const wss = new WebSocketServer({ server });
const rooms = new Map();
const queue = []; // players waiting for a quick match
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
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (!msg || typeof msg.t !== "string") return;

    if (msg.t === "create") {
      const code = genRoom();
      const pid = pidCounter++;
      const room = { peers: new Map() };
      room.peers.set(pid, { pid, ws, name: String(msg.name || "Host").slice(0, 16), host: true });
      rooms.set(code, room);
      ws.pid = pid; ws.room = code;
      send(ws, { t: "created", room: code, pid });
    } else if (msg.t === "join") {
      const code = String(msg.room || "").toUpperCase();
      const room = rooms.get(code);
      if (!room) { send(ws, { t: "error", msg: "房间不存在" }); return; }
      if (room.peers.size >= 2) { send(ws, { t: "error", msg: "房间已满" }); return; }
      const pid = pidCounter++;
      room.peers.set(pid, { pid, ws, name: String(msg.name || "Guest").slice(0, 16), host: false });
      ws.pid = pid; ws.room = code;
      send(ws, { t: "joined", room: code, pid });
      for (const p of room.peers.values())
        for (const other of room.peers.values())
          if (other.pid !== p.pid) send(p.ws, peerInfo(other));
      for (const p of room.peers.values()) send(p.ws, { t: "start" });
    } else if (msg.t === "find") {
      // Quick match: pair with the first player already waiting in the queue.
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
      for (const peer of room.peers.values())
        if (peer.pid !== ws.pid) send(peer.ws, { t: "msg", data: msg.data });
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
  console.log(`[prod] http + ws listening on http://localhost:${PORT}`);
});
