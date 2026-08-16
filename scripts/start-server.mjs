import { spawn, execSync } from "child_process";
import { networkInterfaces, platform } from "os";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// 1. Get LAN IPs
const nets = networkInterfaces();
const ips = [];
for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === "IPv4" && !net.internal) {
      ips.push(net.address);
    }
  }
}

console.log("\n============================================================");
console.log("  🎮 2D 射击游戏 - 权威多人联机服务器已启动 (8人死斗/房间模式)");
console.log("============================================================");
console.log(`\n  ✅ 本机直接访问 (浏览器打开即玩):`);
console.log(`     👉 http://localhost:8080\n`);

if (ips.length > 0) {
  console.log(`  🌐 局域网联机 (同一 WiFi / 局域网下的其他电脑/手机在浏览器输入):`);
  ips.forEach((ip) => {
    console.log(`     👉 http://${ip}:8080`);
  });
  console.log("");
}
console.log("  💡 提示: 网页端只是客户端 (Thin Client)，不需要在网页里开服务器！");
console.log("  💡 本机测试: 打开 2 个浏览器标签页，即可分别加入房间开始对战 (2真人+6人机)。");
console.log("============================================================\n");

// Auto open browser
function openBrowser(url) {
  let cmd;
  if (platform() === "win32") cmd = `start "" "${url}"`;
  else if (platform() === "darwin") cmd = `open "${url}"`;
  else cmd = `xdg-open "${url}"`;
  try {
    execSync(cmd, { stdio: "ignore" });
  } catch {}
}

// 2. Start authoritative server
const serverProcess = spawn("node", ["server/authoritative.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PORT: "8080" },
});

setTimeout(() => {
  openBrowser("http://localhost:8080");
}, 1000);

process.on("SIGINT", () => {
  serverProcess.kill();
  process.exit();
});
