import { chromium } from "playwright";

const URL = process.env.E2E_URL || "http://localhost:5173";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runClient(browser, name) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") console.log(`[${name}:console.error]`, m.text());
  });
  page.on("pageerror", (e) => console.log(`[${name}:pageerror]`, e.message));
  await page.goto(URL, { waitUntil: "load" });
  await page.getByText("联机对战").click();
  // wait until the relay socket is actually open before requesting a match
  await page
    .getByText("已连接服务器")
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(() => {});
  await sleep(300);
  await page.getByRole("button", { name: "快速匹配" }).click();
  await page
    .getByRole("button", { name: "进入装配 →", exact: true })
    .waitFor({ state: "visible", timeout: 20000 });
  await sleep(300);
  await page.getByRole("button", { name: "进入装配 →", exact: true }).click();
  await page.getByText("开始战斗 ▶").waitFor({ state: "visible", timeout: 10000 });
  await sleep(300);
  await page.getByText("开始战斗 ▶").click();
  await page.waitForFunction(() => !!window.__game, null, { timeout: 10000 });
  await sleep(1500);
  return { ctx, page };
}

async function read(page) {
  return await page.evaluate(() => {
    const g = window.__game;
    const snap = g.lastSnap;
    return {
      x: Math.round(g.player.x),
      y: Math.round(g.player.y),
      hp: g.player.hp,
      deadTimer: g.player.deadTimer ?? 0,
      mode: g.mode,
      paused: g.paused,
      gameOver: g.gameOver,
      hasFoe: !!g.foe,
      remoteInput: g.remoteInput ? { keys: g.remoteInput.keys, vmx: g.remoteInput.vmx } : null,
      lastSnap: !!g.lastSnap,
      selfPid: g.selfPid,
      foe: g.foe ? { x: Math.round(g.foe.x), y: Math.round(g.foe.y) } : null,
      snapPlayers: snap
        ? snap.players.map((p) => ({ id: p.id, x: Math.round(p.x), y: Math.round(p.y), hp: p.hp }))
        : null,
    };
  });
}

(async () => {
  const hostBrowser = await chromium.launch();
  const guestBrowser = await chromium.launch();
  const [host, guest] = await Promise.all([
    runClient(hostBrowser, "HOST"),
    runClient(guestBrowser, "GUEST"),
  ]);

  const h0 = await read(host.page);
  const g0 = await read(guest.page);
  console.log("BEFORE host ", JSON.stringify(h0));
  console.log("BEFORE guest", JSON.stringify(g0));

  // --- HOST presses D ---
  await host.page.mouse.click(400, 300);
  await host.page.keyboard.down("KeyD");
  await sleep(1200);
  await host.page.keyboard.up("KeyD");
  await sleep(300);
  const h1 = await read(host.page);
  console.log("AFTER  host-D", JSON.stringify(h1));

  // --- GUEST presses D ---
  await guest.page.mouse.click(400, 300);
  await guest.page.keyboard.down("KeyD");
  await sleep(1200);
  await guest.page.keyboard.up("KeyD");
  await sleep(600);
  const g1 = await read(guest.page);
  console.log("AFTER  guest-D", JSON.stringify(g1));

  console.log("HOST  deltaX =", (h1.x - h0.x).toFixed(1));
  console.log("GUEST deltaX =", (g1.x - g0.x).toFixed(1));

  // --- GUEST joystick (mobile virtual move) ---
  await guest.page.evaluate(() => window.__game.setVirtualMove(1, 0));
  await sleep(1200);
  await guest.page.evaluate(() => window.__game.setVirtualMove(0, 0));
  await sleep(400);
  const gj = await read(guest.page);
  console.log("AFTER  guest-joystick", JSON.stringify(gj));
  console.log("GUEST joystick deltaX =", (gj.x - g1.x).toFixed(1));

  // --- HOST death must down+respawn (NOT end the match / freeze the guest) ---
  const beforeDeath = await read(host.page);
  await host.page.evaluate(() => window.__game.damagePlayer(99999));
  await sleep(700);
  const duringDeath = await read(host.page);
  // guest should still be able to move while the host is downed
  await guest.page.mouse.click(400, 300);
  await guest.page.keyboard.down("KeyD");
  await sleep(1000);
  await guest.page.keyboard.up("KeyD");
  await sleep(400);
  const guestDuringHostDeath = await read(guest.page);
  await sleep(5500); // wait out RESPAWN_TIME
  const afterRespawn = await read(host.page);
  console.log("HOST before death  ", JSON.stringify(beforeDeath));
  console.log("HOST during death  ", JSON.stringify(duringDeath));
  console.log("GUEST during host death (should still move)", JSON.stringify(guestDuringHostDeath));
  console.log("HOST after respawn ", JSON.stringify(afterRespawn));
  console.log("HOST gameOver after death:", afterRespawn.gameOver, "| host alive after respawn:", afterRespawn.hp > 0);
  console.log("GUEST moved while host downed, x=", guestDuringHostDeath.x, "(was", gj.x, ")");
  // host can move again after respawn
  await host.page.mouse.click(400, 300);
  await host.page.keyboard.down("KeyD");
  await sleep(800);
  await host.page.keyboard.up("KeyD");
  const hostMoveAfter = await read(host.page);
  console.log("HOST can move after respawn, deltaX=", (hostMoveAfter.x - afterRespawn.x).toFixed(1));

  await host.ctx.close();
  await guest.ctx.close();
  await hostBrowser.close();
  await guestBrowser.close();
})();
