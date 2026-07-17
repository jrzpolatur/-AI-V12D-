import WebSocket from "ws";

const URL = "ws://localhost:8080";
const log = (...a) => console.log(...a);
log("start relay test, connecting to", URL);

function client(name) {
  return new Promise((resolve) => {
    let ws;
    try {
      ws = new WebSocket(URL);
    } catch (e) {
      log(`[${name}] construct error`, e.message);
      return resolve({ name, ws: null, msgs: [] });
    }
    const msgs = [];
    ws.on("open", () => {
      log(`[${name}] OPEN`);
      ws.send(JSON.stringify({ t: "find", name }));
      log(`[${name}] sent find`);
    });
    ws.on("error", (e) => log(`[${name}] ERROR`, e.message));
    ws.on("message", (raw) => {
      const m = JSON.parse(raw.toString());
      msgs.push(m);
      log(`[${name}] recv`, JSON.stringify(m).slice(0, 80));
      if (m.t === "start") {
        ws.send(JSON.stringify({ t: "msg", data: { t: "hello", name } }));
      }
    });
    setTimeout(() => resolve({ name, ws, msgs }), 1800);
  });
}

(async () => {
  const a = await client("A");
  const b = await client("B");
  await new Promise((r) => setTimeout(r, 800));
  const aStart = a.msgs.some((m) => m.t === "start");
  const bStart = b.msgs.some((m) => m.t === "start");
  const aGotHello = a.msgs.some((m) => m.t === "msg" && m.data?.t === "hello");
  const bGotHello = b.msgs.some((m) => m.t === "msg" && m.data?.t === "hello");
  log("RESULT A start:", aStart, "B start:", bStart);
  log("RESULT A got peer hello:", aGotHello, "B got peer hello:", bGotHello);
  a.ws?.close();
  b.ws?.close();
  process.exit(0);
})();
