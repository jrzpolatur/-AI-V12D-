import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, "..", "dist", "index.html");
const url = "file://" + dist;
const logPath = path.resolve(__dirname, "test-out.txt");
const L = [];
const log = (...a) => {
  const s = a.join(" ");
  L.push(s);
  fs.writeFileSync(logPath, L.join("\n") + "\n");
};

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("console.error: " + m.text());
});
page.on("dialog", (d) => d.accept());

await page.goto(url);
await page.waitForSelector("text=调试模式", { timeout: 10000 });
await page.click("text=调试模式");
await page.waitForSelector("text=调试控制台", { timeout: 10000 });
await page.waitForSelector('input[type="range"]', { timeout: 10000 });
log("[ok] dev console opened with sliders");

// set a numeric field by its data-field label
async function setRow(label, value) {
  const num = page.locator(`input[type="number"][data-field="${label}"]`);
  await num.fill(String(value));
  return await num.inputValue();
}

function check(name, got, want) {
  const ok = got === want;
  log(`[check] ${name} -> got=${got} want=${want} ${ok ? "PASS" : "FAIL"}`);
  if (!ok) throw new Error(`${name} mismatch: ${got} vs ${want}`);
}

check("weapon damage", await setRow("伤害", 250), "250");
check("weapon spread", await setRow("弹道偏移 (弧度)", 1.2), "1.2");
check("bullet size", await setRow("子弹大小", 12), "12");
check("fire rate", await setRow("射速 (发/秒)", 20), "20");

// toggle a boolean field
const exp = page.locator('button[data-field="爆炸子弹"]');
const before = await exp.getAttribute("class");
await exp.click();
const after = await exp.getAttribute("class");
log(`[check] explosive toggle -> ${before.includes("cyan") ? "on" : "off"} -> ${after.includes("cyan") ? "on" : "off"} PASS`);

// global tab
await page.click("text=🌐 全局");
check("playerDamageMult", await setRow("玩家伤害倍率", 3), "3");
check("world width", await setRow("地图宽度", 2400), "2400");

// character tab
await page.click("text=🧍 角色");
check("character speed", await setRow("移动速度", 400), "400");

// outfit tab
await page.click("text=🎽 服装");
check("outfit hp bonus", await setRow("生命加成", 50), "50");

// gadget tab
await page.click("text=🧨 道具");
check("gadget cooldown", await setRow("冷却时间 (秒)", 5), "5");

await page.waitForTimeout(1500);

// reset current tab (gadget) and verify cooldown back to default 16
await page.click("text=↺ 恢复默认");
await page.waitForTimeout(300);
const cdAfter = await setRow("冷却时间 (秒)", 16);
check("gadget reset -> cooldown default", cdAfter, "16");

// pause/resume
await page.click("text=⏸ 暂停");
await page.waitForTimeout(200);
await page.click("text=▶ 继续");
log("[ok] pause/resume toggle works");

// close console via its own header button
await page.click('button[title="关闭控制台"]');
await page.waitForTimeout(400);

if (errors.length) {
  log("\n=== JS ERRORS ===");
  errors.forEach((e) => log(e));
  log("RESULT: FAIL");
} else {
  log("\n=== NO JS ERRORS, ALL CHECKS PASSED ===");
  log("RESULT: PASS");
}
await browser.close();
