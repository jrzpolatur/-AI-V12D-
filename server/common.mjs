// Shared announcement / message-board feature for all server variants
// (relay.mjs, prod.mjs, authoritative.mjs).
//
//   GET  /api/announcements        -> { text: string }   (public, CORS *)
//   POST /api/announcements        -> { ok, msg }         (requires `token`)
//   GET  /admin                    -> small HTML admin page to paste notices
//
// The notice is persisted to server/announcements.json so it survives restarts.
// Admin token: env ANNOUNCE_TOKEN, default "admin".
//
// * CORS is open because players may load the game from a different origin
//   (e.g. a Vite dev server) while fetching the notice from the game server.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(__dirname, "announcements.json");
const TOKEN = process.env.ANNOUNCE_TOKEN || "admin";

function load() {
  try {
    const d = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return { text: typeof d.text === "string" ? d.text : "" };
  } catch {
    return { text: "" };
  }
}

function save(text) {
  fs.writeFileSync(FILE, JSON.stringify({ text, updatedAt: Date.now() }, null, 2));
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const ADMIN_HTML = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>公告管理 · FIRING STICKERS</title>
<style>
  body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#0b0c22;color:#e2e8f0;max-width:640px;margin:48px auto;padding:0 16px}
  h1{font-size:20px;font-weight:800;margin:0 0 4px}
  .sub{color:#94a3b8;font-size:13px;margin-bottom:20px}
  label{display:block;margin:16px 0 6px;font-size:13px;color:#94a3b8}
  input,textarea{width:100%;box-sizing:border-box;border-radius:8px;border:1px solid #334155;background:#11132e;color:#e2e8f0;padding:10px;font-size:14px;font-family:inherit}
  textarea{min-height:170px;resize:vertical;line-height:1.5}
  button{margin-top:16px;width:100%;background:#22d3ee;color:#04212a;font-weight:800;font-size:15px;border:none;border-radius:8px;padding:12px;cursor:pointer}
  button:hover{filter:brightness(1.05)}
  #msg{margin-top:14px;font-size:13px;min-height:18px}
</style>
</head>
<body>
  <h1>📢 公告发布</h1>
  <div class="sub">FIRING STICKERS · 连接此服务器的玩家会在主界面看到公告</div>

  <label>管理密码（ANNOUNCE_TOKEN，默认 admin）</label>
  <input id="token" type="password" placeholder="默认 admin" autocomplete="current-password" />

  <label>公告内容（支持多行，留空则清空公告）</label>
  <textarea id="text" placeholder="在此粘贴公告 / 通知内容…"></textarea>

  <button id="post">发布公告</button>
  <div id="msg"></div>

  <script>
    const api = "/api/announcements";
    const $ = (id) => document.getElementById(id);
    fetch(api).then(r => r.json()).then(d => { if (d && d.text) $("text").value = d.text; }).catch(() => {});
    $("post").onclick = async () => {
      const msg = $("msg");
      try {
        const r = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: $("token").value, text: $("text").value })
        });
        const d = await r.json();
        msg.style.color = d.ok ? "#34d399" : "#fb7185";
        msg.textContent = (d.ok ? "✅ " : "❌ ") + (d.msg || "");
        if (d.ok) setTimeout(() => location.reload(), 700);
      } catch (e) {
        msg.style.color = "#fb7185";
        msg.textContent = "请求失败：" + e;
      }
    };
  </script>
</body>
</html>`;

/**
 * Handle an announcement-related HTTP request.
 * Returns true if the request was handled (caller should stop), false otherwise.
 */
export function handleAnnouncement(req, res) {
  const url = (req.url || "").split("?")[0];

  if (url === "/api/announcements") {
    if (req.method === "OPTIONS") {
      cors(res);
      res.writeHead(204);
      res.end();
      return true;
    }
    if (req.method === "GET") {
      cors(res);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(load()));
      return true;
    }
    if (req.method === "POST") {
      cors(res);
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        let ok = false;
        let msg = "";
        try {
          const d = JSON.parse(body || "{}");
          if (d.token !== TOKEN) {
            msg = "密码错误";
          } else {
            save(String(d.text || "").slice(0, 2000));
            ok = true;
            msg = "已发布";
          }
        } catch {
          msg = "请求格式错误";
        }
        res.writeHead(ok ? 200 : 403, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(JSON.stringify({ ok, msg }));
      });
      return true;
    }
  }

  if (url === "/admin") {
    cors(res);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(ADMIN_HTML);
    return true;
  }

  return false;
}
