// ---------------------------------------------------------------------------
// editor-server.mjs — local weapon data editor.
//
//   npm run editor   ->  http://localhost:5178
//
// Reads/writes data/guns.json (the single source of truth consumed by BOTH the
// client bundle and the server engine bundle). On save it rewrites the JSON and
// then runs `npm run build`, which regenerates:
//   • dist/index.html          (single-player + multiplayer client)
//   • server/engine.bundle.mjs (authoritative multiplayer server)
// so one edit propagates to every end. Restart the game server afterwards to
// load the fresh engine bundle.
// ---------------------------------------------------------------------------
import http from "http";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(root, "data/guns.json");
const HTML = path.join(root, "tools/editor.html");
const PORT = 5178;

const send = (res, code, type, body) => {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 5_000_000) reject(new Error("payload too large"));
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });

/** Run `npm run build` and capture its output. */
function runBuild() {
  return new Promise((resolve) => {
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const proc = spawn(npm, ["run", "build"], { cwd: root, shell: true });
    let log = "";
    proc.stdout.on("data", (d) => (log += d));
    proc.stderr.on("data", (d) => (log += d));
    proc.on("close", (code) => resolve({ code, log }));
    proc.on("error", (e) => resolve({ code: -1, log: String(e) }));
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
      if (!existsSync(HTML)) return send(res, 500, "text/plain", "editor.html missing");
      return send(res, 200, "text/html; charset=utf-8", readFileSync(HTML));
    }

    if (req.method === "GET" && req.url === "/api/guns") {
      return send(res, 200, "application/json; charset=utf-8", readFileSync(DATA));
    }

    if (req.method === "POST" && req.url === "/api/guns") {
      const raw = await readBody(req);
      let guns;
      try {
        guns = JSON.parse(raw);
        if (!Array.isArray(guns)) throw new Error("expected an array");
      } catch (e) {
        return send(res, 400, "application/json", JSON.stringify({ ok: false, error: "invalid JSON: " + e.message }));
      }
      writeFileSync(DATA, JSON.stringify(guns, null, 2) + "\n", "utf8");
      const { code, log } = await runBuild();
      return send(
        res,
        200,
        "application/json; charset=utf-8",
        JSON.stringify({ ok: code === 0, code, log })
      );
    }

    send(res, 404, "text/plain", "not found");
  } catch (e) {
    send(res, 500, "text/plain", String(e));
  }
});

server.listen(PORT, () => {
  console.log(`\n  武器数据编辑器  ->  http://localhost:${PORT}\n`);
  console.log("  保存后会自动 `npm run build`（客户端 + 服务端引擎一起重建）。");
  console.log("  联机需重启游戏服务器进程以加载新引擎。\n");
});
