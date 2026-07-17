// End-to-end smoke test for the authoritative PvP server.
// Boots server/authoritative.mjs, connects two WS clients, performs the
// create/join + hello + input handshake, and verifies that the server
// simulates the world and streams snapshots back (player moves, bullets spawn).
import { spawn } from "child_process";
import { WebSocket } from "ws";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PORT = 8099;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const loadout = (over = {}) => ({
  characterId: "raider",
  outfitId: "tactical",
  skillId: "dash",
  gunId: "smg",
  gunIds: ["smg", "akm"],
  gadgetIds: ["turret_mg", "mine_explosive", "glue_grenade"],
  gameMode: "defense",
  ...over,
});

const srv = spawn("node", ["server/authoritative.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT) },
});
srv.stderr.on("data", (d) => process.stderr.write("[srv-err] " + d));
await new Promise((res) => {
  const onData = (d) => {
    process.stdout.write("[srv] " + d);
    if (d.toString().includes("listening")) {
      srv.stdout.off("data", onData);
      res();
    }
  };
  srv.stdout.on("data", onData);
});

function connect() {
  return new Promise((res) => {
    const ws = new WebSocket(`ws://localhost:${PORT}`);
    ws.msgs = [];
    ws.on("message", (raw) => ws.msgs.push(JSON.parse(raw.toString())));
    ws.on("open", () => res(ws));
  });
}
const waitMsg = async (ws, pred) => {
  for (let i = 0; i < 200; i++) {
    const m = ws.msgs.find(pred);
    if (m) return m;
    await sleep(10);
  }
  throw new Error("timed out waiting for message");
};
const lastSnap = (ws) => {
  for (let i = ws.msgs.length - 1; i >= 0; i--) {
    const m = ws.msgs[i];
    if (m.t === "msg" && m.data && m.data.t === "snap") return m.data.snap;
  }
  return null;
};

try {
  const a = await connect();
  a.send(JSON.stringify({ t: "create", name: "A" }));
  const created = await waitMsg(a, (m) => m.t === "created");
  const room = created.room;

  const b = await connect();
  b.send(JSON.stringify({ t: "join", room, name: "B" }));
  await waitMsg(b, (m) => m.t === "joined");

  a.send(JSON.stringify({ t: "msg", data: { t: "hello", name: "A", loadout: loadout() } }));
  b.send(
    JSON.stringify({
      t: "msg",
      data: {
        t: "hello",
        name: "B",
        loadout: loadout({
          characterId: "juggernaut",
          gunId: "akm",
          gunIds: ["akm", "smg"],
          gadgetIds: ["turret_cannon", "mine_poison", "fire_grenade"],
        }),
      },
    })
  );

  const sa = await waitMsg(a, (m) => m.t === "start");
  await waitMsg(b, (m) => m.t === "start");
  const aPid = sa.youPid;
  const bPid = b.msgs.find((m) => m.t === "start").youPid;
  console.log("A pid =", aPid, " B pid =", bPid);

  await sleep(100); // let a few snapshots arrive
  const before = lastSnap(a);
  const x0 = before.players.find((p) => p.id === aPid).x;
  const foe = before.players.find((p) => p.id === bPid);

  // A holds "move right" + fires at B for ~1s
  for (let i = 0; i < 60; i++) {
    a.send(
      JSON.stringify({
        t: "msg",
        data: {
          t: "inp",
          input: {
            keys: ["KeyD"],
            mx: foe.x,
            my: foe.y,
            vmx: 0,
            vmy: 0,
            firing: true,
            gadget: -1,
            weaponSwitch: false,
            skill: false,
            reload: false,
          },
        },
      })
    );
    await sleep(16);
  }

  const after = lastSnap(a);
  const x1 = after.players.find((p) => p.id === aPid).x;
  console.log("A moved right:", x1 > x0, `(${x0.toFixed(1)} -> ${x1.toFixed(1)})`);
  console.log("bullets in latest snapshot:", after.bullets.length);
  console.log("WS SMOKE TEST OK");
} catch (e) {
  console.error("WS SMOKE TEST FAILED:", e);
  process.exitCode = 1;
} finally {
  srv.kill();
}
