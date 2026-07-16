import { WebSocketServer } from "ws";
import WebSocket from "ws";

// In-process replica of the find() pairing logic from server/prod.mjs
const wss = new WebSocketServer({ port: 8099 });
const rooms = new Map();
const queue = [];
let pidCounter = 1;
const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genRoom() {
  let code;
  do { code = ""; for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]; } while (rooms.has(code));
  return code;
}
function send(ws, o) { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(o)); }
wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.t === "find") {
      const name = String(msg.name || "玩家").slice(0, 16);
      const qi = queue.findIndex((q) => q.ws === ws);
      if (qi >= 0) queue.splice(qi, 1);
      if (queue.length > 0) {
        const other = queue.shift();
        const code = genRoom();
        const room = { peers: new Map() };
        const pidA = other.pid, pidB = pidCounter++;
        room.peers.set(pidA, { pid: pidA, ws: other.ws, name: other.name, host: true });
        room.peers.set(pidB, { pid: pidB, ws, name, host: false });
        rooms.set(code, room);
        other.ws.pid = pidA; other.ws.room = code;
        ws.pid = pidB; ws.room = code;
        send(other.ws, { t: "created", room: code, pid: pidA });
        send(ws, { t: "joined", room: code, pid: pidB });
        for (const p of room.peers.values()) for (const o of room.peers.values()) if (o.pid !== p.pid) send(p.ws, { t: "peer", pid: o.pid, name: o.name, host: o.host });
        for (const p of room.peers.values()) send(p.ws, { t: "start" });
      } else {
        const pid = pidCounter++;
        queue.push({ ws, pid, name });
        ws.pid = pid; ws.room = null;
        send(ws, { t: "queued" });
      }
    }
  });
});

const URL = "ws://localhost:8099";
const a = new WebSocket(URL);
let matched = false;
a.on("open", () => a.send(JSON.stringify({ t: "find", name: "A" })));
a.on("message", (m) => {
  const x = JSON.parse(m);
  console.log("A", x.t, x.room || "");
  if (x.t === "queued") {
    const b = new WebSocket(URL);
    b.on("open", () => b.send(JSON.stringify({ t: "find", name: "B" })));
    b.on("message", (m2) => {
      const y = JSON.parse(m2);
      console.log("B", y.t, y.room || "");
      if (y.t === "start") { matched = true; console.log(">>> MATCH OK, B in room", y.room); }
    });
  }
  if (x.t === "start") console.log(">>> A start (matched)");
});
setTimeout(() => {
  console.log(matched ? "RESULT: PASS" : "RESULT: FAIL");
  wss.close();
  process.exit(matched ? 0 : 1);
}, 4000);
