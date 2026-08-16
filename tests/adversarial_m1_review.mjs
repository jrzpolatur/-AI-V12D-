/**
 * Adversarial Stress Tests for Milestone 1: Pixel Viewport & Rendering Pipeline
 */

import assert from "node:assert/strict";

async function runAdversarialTests() {
  console.log("=== Running Adversarial Stress Tests for Milestone 1 ===");

  const { GameEngine } = await import("../server/engine.bundle.mjs");
  const dummyEngine = new GameEngine(null, {
    characterId: "raider",
    outfitId: "tactical",
    skillId: "dash",
    gunId: "smg",
    gunIds: ["smg", "pistol"],
    gadgetIds: ["grenade_frag", "turret_mg", "healing_station"],
    gameMode: "biohazard"
  }, () => {}, { mode: "server" });

  const ViewportClass = dummyEngine.viewport.constructor;
  const RenderQueueClass = dummyEngine.renderQueue.constructor;
  const createPixelViewport = (cfg) => new ViewportClass(cfg);
  const createRenderQueue = (cap) => new RenderQueueClass(cap);
  const RenderLayer = {
    Ground: 0,
    Shadow: 1,
    YSorted: 2,
    Overhead: 3,
    AirborneFX: 4,
    ScreenUI: 5
  };

  // --- Test 1: Viewport Extreme Resolutions & Boundary Resizing ---
  console.log("[Test 1] Viewport Extreme Resolutions & Bounds...");
  const vp = createPixelViewport({ virtualW: 480, virtualH: 270, integerScale: true });

  // 1.1 Zero and negative dimensions
  vp.resize(0, 0);
  assert(vp.scale >= 1, "Scale must remain >= 1 even with 0x0 display");
  assert(vp.displayW >= 1 && vp.displayH >= 1, "Display dimensions must be clamped to >= 1");

  vp.resize(-100, -500);
  assert(vp.scale >= 1, "Scale must remain >= 1 with negative display");

  // 1.2 Smaller than virtual buffer (e.g. 320x240)
  vp.resize(320, 240);
  assert.equal(vp.scale, 1, "Integer scale must clamp to minimum 1 for small screens");
  assert.equal(vp.scaledW, 480);
  assert.equal(vp.scaledH, 270);
  assert.equal(vp.offsetX, Math.floor((320 - 480) / 2)); // Negative offset (centered crop)
  assert.equal(vp.offsetY, Math.floor((240 - 270) / 2));

  // 1.3 Fractional display resolutions
  vp.resize(1920.7, 1080.3);
  assert.equal(vp.displayW, 1920, "Display dimensions should be floored/integer");
  assert.equal(vp.displayH, 1080);
  assert.equal(vp.scale, 4);

  // 1.4 Ultra high resolution 8K (7680x4320)
  vp.resize(7680, 4320);
  assert.equal(vp.scale, 16);
  assert.equal(vp.offsetX, 0);
  assert.equal(vp.offsetY, 0);
  console.log("  ✓ Viewport extreme resolution tests passed");

  // --- Test 2: Coordinate Roundtrip Mathematical Invariants ---
  console.log("[Test 2] Coordinate Roundtrip Invariants...");
  vp.resize(1920, 1080);
  const testCams = [
    { x: 0, y: 0 },
    { x: 1234.56, y: 7890.12 },
    { x: -500.25, y: -800.75 },
    { x: 1e5, y: 1e5 },
  ];

  for (const cam of testCams) {
    for (let i = 0; i < 100; i++) {
      const sx = Math.floor(Math.random() * 1920);
      const sy = Math.floor(Math.random() * 1080);

      // Screen -> World -> Screen
      const world = vp.screenToWorld(sx, sy, cam.x, cam.y);
      const screenBack = vp.worldToScreen(world.x, world.y, cam.x, cam.y);
      assert(Math.abs(screenBack.x - sx) < 1e-9, `Screen X roundtrip mismatch: ${screenBack.x} vs ${sx}`);
      assert(Math.abs(screenBack.y - sy) < 1e-9, `Screen Y roundtrip mismatch: ${screenBack.y} vs ${sy}`);

      // Screen -> Virtual -> Screen
      const virt = vp.screenToVirtual(sx, sy);
      const screenBack2 = vp.virtualToScreen(virt.x, virt.y);
      assert(Math.abs(screenBack2.x - sx) < 1e-9, `Virtual X roundtrip mismatch: ${screenBack2.x} vs ${sx}`);
      assert(Math.abs(screenBack2.y - sy) < 1e-9, `Virtual Y roundtrip mismatch: ${screenBack2.y} vs ${sy}`);
    }
  }
  console.log("  ✓ Coordinate roundtrip fidelity passed (400 random points)");

  // --- Test 3: Zero-GC Memory Allocation & Rapid Loop Stress ---
  console.log("[Test 3] Zero-GC Loop Stress...");
  const rq = createRenderQueue(1024);
  const mockCtx = {
    save() {},
    restore() {},
    translate() {},
    fillRect() {},
  };

  const startMem = process.memoryUsage().heapUsed;
  for (let frame = 0; frame < 5000; frame++) {
    rq.clear();
    for (let i = 0; i < 50; i++) {
      rq.push(RenderLayer.Ground, 0, () => {});
      rq.push(RenderLayer.Shadow, 0, () => {});
      rq.push(RenderLayer.YSorted, i * 10, () => {}, null, i);
      rq.push(RenderLayer.AirborneFX, 0, () => {});
      rq.push(RenderLayer.ScreenUI, 0, () => {});
    }
    rq.flush(mockCtx);
  }
  const endMem = process.memoryUsage().heapUsed;
  const memDiffMB = (endMem - startMem) / (1024 * 1024);
  console.log(`  ✓ 5,000 frame loop stress completed. Heap diff: ${memDiffMB.toFixed(2)} MB`);

  // --- Test 4: Pathological Sorting (Duplicates, Reverses, Heavy Ties) ---
  console.log("[Test 4] Pathological Sorting Stress...");
  rq.clear();
  // 500 items with identical sortY to test stability with tieBreaker
  const identicalY = 150;
  const flushedOrder = [];
  for (let i = 0; i < 500; i++) {
    rq.push(RenderLayer.YSorted, identicalY, (c, t) => {
      flushedOrder.push(t);
    }, i, i);
  }
  rq.flush(mockCtx);
  assert.equal(flushedOrder.length, 500, "All 500 identical sortY items must be flushed");
  for (let i = 0; i < 500; i++) {
    assert.equal(flushedOrder[i], i, `Tie-breaker order violated at index ${i}`);
  }

  // Reverse sorted order
  rq.clear();
  const reverseOrder = [];
  for (let i = 499; i >= 0; i--) {
    rq.push(RenderLayer.YSorted, i, (c, t) => {
      reverseOrder.push(t);
    }, i, i);
  }
  rq.flush(mockCtx);
  assert.equal(reverseOrder.length, 500);
  for (let i = 0; i < 500; i++) {
    assert.equal(reverseOrder[i], i, `Reverse sort order violated at index ${i}`);
  }
  console.log("  ✓ Pathological sorting passed (identical keys & reversed inputs)");

  // --- Test 5: Dynamic Capacity Expansion ---
  console.log("[Test 5] Dynamic Capacity Expansion...");
  const smallRq = createRenderQueue(64); // initial capacity 64 (10 per bucket)
  // Push 200 items to YSorted to force multiple doublings
  for (let i = 0; i < 200; i++) {
    smallRq.push(RenderLayer.YSorted, 200 - i, () => {}, null, i);
  }
  assert.equal(smallRq.getCount(RenderLayer.YSorted), 200, "Capacity expansion must retain all pushed items");
  smallRq.flush(mockCtx);
  assert.equal(smallRq.getCount(), 0);
  console.log("  ✓ Dynamic capacity expansion passed");

  // --- Test 6: Headless Canvas Guard & Null Safety ---
  console.log("[Test 6] Headless Canvas Guard Safety...");
  rq.clear();
  rq.push(RenderLayer.Ground, 0, () => {});
  rq.push(RenderLayer.YSorted, 100, () => {});
  rq.push(RenderLayer.ScreenUI, 0, () => {});
  // Flush with null
  assert.doesNotThrow(() => rq.flush(null), "Flush with null must never throw");
  assert.doesNotThrow(() => rq.flushWorld(null), "flushWorld with null must never throw");
  assert.doesNotThrow(() => rq.flushScreenUI(null), "flushScreenUI with null must never throw");

  assert.doesNotThrow(() => vp.beginFrame(), "beginFrame in headless mode must return null or ctx without throwing");
  assert.doesNotThrow(() => vp.endFrame(null), "endFrame with null displayCtx must never throw");
  assert.doesNotThrow(() => vp.clear(), "clear in headless mode must never throw");
  console.log("  ✓ Headless null safety passed");

  console.log("\nALL ADVERSARIAL STRESS TESTS PASSED WITH ZERO ERRORS!");
}

runAdversarialTests().catch((err) => {
  console.error("Adversarial Test Failed:", err);
  process.exit(1);
});
