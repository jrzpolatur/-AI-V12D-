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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../dist");
const PORT = Number(process.env.PORT) || 8080;

// ---- Static file serving (only dist/index.html is needed, single-file build) ----
const server = http.createServer((req, res) => {
  // Any path serves the single-file build (SPA-style fallback).
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
});

// ---- WebSocket relay (same logic as server/relay.mjs) ----
const wss = new WebSocketServer({ server });
const rooms = new Map();
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
    } else if (msg.t === "msg") {
      const room = ws.room && rooms.get(ws.room);
      if (!room) return;
      for (const peer of room.peers.values())
        if (peer.pid !== ws.pid) send(peer.ws, { t: "msg", data: msg.data });
    }
  });

  ws.on("close", () => {
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
