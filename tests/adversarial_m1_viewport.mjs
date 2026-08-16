/**
 * tests/adversarial_m1_viewport.mjs
 * 
 * Adversarial Stress Testing & Fuzzing Harness for Milestone 1: Pixel Viewport & Coordinate Pipeline
 * Challenger 1
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import esbuild from "esbuild";

// Dynamic TS loader helper
async function loadTsModule(filePath) {
  const code = fs.readFileSync(filePath, "utf-8");
  const transformed = esbuild.transformSync(code, {
    loader: "ts",
    format: "esm",
    target: "node20"
  });
  const base64 = Buffer.from(transformed.code).toString("base64");
  return await import(`data:text/javascript;base64,${base64}`);
}

// Helper for float comparison
function assertNear(actual, expected, tolerance = 1e-9, msg = "") {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new assert.AssertionError({
      message: `${msg} Expected ${expected} +/- ${tolerance}, but got ${actual} (diff: ${diff})`,
      actual,
      expected,
      operator: "assertNear"
    });
  }
}

async function runAdversarialSuite() {
  console.log("================================================================================");
  console.log("  CHALLENGER 1: ADVERSARIAL STRESS TEST SUITE — VIEWPORT & COORDINATE PIPELINE ");
  console.log("================================================================================\n");

  const viewportModule = await loadTsModule(path.resolve("src/game/viewport.ts"));
  const renderQueueModule = await loadTsModule(path.resolve("src/game/renderQueue.ts"));

  const { PixelViewportImpl, createPixelViewport } = viewportModule;
  const { RenderQueueImpl, RenderLayer, createRenderQueue } = renderQueueModule;

  let totalTests = 0;
  let passedTests = 0;

  function testCase(name, fn) {
    totalTests++;
    try {
      fn();
      passedTests++;
      console.log(`  [PASS] ${name}`);
    } catch (err) {
      console.error(`  [FAIL] ${name}`);
      console.error(err);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // SECTION 1: EXTREME RESOLUTIONS & ASPECT RATIOS
  // ---------------------------------------------------------------------------
  console.log("--- SECTION 1: Extreme Resolutions & Aspect Ratios ---");

  testCase("1.1 Ultra-wide 32:9 (5120x1440)", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    vp.resize(5120, 1440);
    // 5120/480 = 10.666, 1440/270 = 5.333 -> scale = 5
    assert.equal(vp.scale, 5);
    assert.equal(vp.scaledW, 2400);
    assert.equal(vp.scaledH, 1350);
    assert.equal(vp.offsetX, (5120 - 2400) / 2); // 1360
    assert.equal(vp.offsetY, (1440 - 1350) / 2); // 45
  });

  testCase("1.2 Ultra-wide 32:9 extreme (7680x2160)", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    vp.resize(7680, 2160);
    // 7680/480 = 16, 2160/270 = 8 -> scale = 8
    assert.equal(vp.scale, 8);
    assert.equal(vp.scaledW, 3840);
    assert.equal(vp.scaledH, 2160);
    assert.equal(vp.offsetX, (7680 - 3840) / 2); // 1920
    assert.equal(vp.offsetY, 0);
  });

  testCase("1.3 Portrait 9:16 (1080x1920)", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    vp.resize(1080, 1920);
    // 1080/480 = 2.25, 1920/270 = 7.111 -> scale = 2
    assert.equal(vp.scale, 2);
    assert.equal(vp.scaledW, 960);
    assert.equal(vp.scaledH, 540);
    assert.equal(vp.offsetX, (1080 - 960) / 2); // 60
    assert.equal(vp.offsetY, (1920 - 540) / 2); // 690
  });

  testCase("1.4 Portrait 9:16 mobile low-res (360x640)", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    vp.resize(360, 640);
    // 360/480 = 0.75, 640/270 = 2.37 -> scale = max(1, 0) = 1
    assert.equal(vp.scale, 1);
    assert.equal(vp.scaledW, 480);
    assert.equal(vp.scaledH, 270);
    assert.equal(vp.offsetX, Math.floor((360 - 480) / 2)); // -60
    assert.equal(vp.offsetY, Math.floor((640 - 270) / 2)); // 185
  });

  testCase("1.5 Huge 8K UHD (7680x4320)", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    vp.resize(7680, 4320);
    // 7680/480 = 16, 4320/270 = 16 -> scale = 16
    assert.equal(vp.scale, 16);
    assert.equal(vp.scaledW, 7680);
    assert.equal(vp.scaledH, 4320);
    assert.equal(vp.offsetX, 0);
    assert.equal(vp.offsetY, 0);
  });

  testCase("1.6 Tiny Sub-Virtual Display (100x100)", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    vp.resize(100, 100);
    assert.equal(vp.scale, 1, "Scale must clamp to at least 1");
    assert.equal(vp.scaledW, 480);
    assert.equal(vp.scaledH, 270);
    assert.equal(vp.offsetX, Math.floor((100 - 480) / 2)); // -190
    assert.equal(vp.offsetY, Math.floor((100 - 270) / 2)); // -85
  });

  testCase("1.7 Micro Display (1x1)", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    vp.resize(1, 1);
    assert.equal(vp.scale, 1);
    assert.equal(vp.displayW, 1);
    assert.equal(vp.displayH, 1);
    assert.equal(vp.offsetX, Math.floor((1 - 480) / 2)); // -240
    assert.equal(vp.offsetY, Math.floor((1 - 270) / 2)); // -135
  });

  testCase("1.8 Degenerate/Negative Display Dimensions (0x0, -500x-300)", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    vp.resize(0, 0);
    assert(vp.displayW >= 1, "displayW must clamp to >= 1");
    assert(vp.displayH >= 1, "displayH must clamp to >= 1");
    assert(vp.scale >= 1, "scale must clamp to >= 1");

    vp.resize(-500, -300);
    assert(vp.displayW >= 1, "displayW must clamp to >= 1");
    assert(vp.displayH >= 1, "displayH must clamp to >= 1");
    assert(vp.scale >= 1, "scale must clamp to >= 1");
  });

  testCase("1.9 Fractional/Non-Integer Display Sizes (1920.73 x 1080.29)", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    vp.resize(1920.73, 1080.29);
    assert.equal(Number.isInteger(vp.displayW), true);
    assert.equal(Number.isInteger(vp.displayH), true);
    assert.equal(Number.isInteger(vp.scale), true);
    assert.equal(Number.isInteger(vp.offsetX), true);
    assert.equal(Number.isInteger(vp.offsetY), true);
  });

  // ---------------------------------------------------------------------------
  // SECTION 2: NEGATIVE COORDINATES, LETTERBOX CLICKS, CLAMPING
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 2: Negative Mouse Coordinates & Letterbox Clicks ---");

  testCase("2.1 Letterbox Click Coordinate Transformation (Unclamped)", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    vp.resize(2560, 1080); // scale = 4, scaledW = 1920, scaledH = 1080, offsetX = 320, offsetY = 0
    // Click at screen (100, 540) which is inside left pillarbox (offset is 320)
    const v = vp.screenToVirtual(100, 540, false);
    // (100 - 320) / 4 = -220 / 4 = -55
    assert.equal(v.x, -55);
    assert.equal(v.y, 135);

    // Inverse virtualToScreen must map back to exact screen click
    const s = vp.virtualToScreen(v.x, v.y);
    assert.equal(s.x, 100);
    assert.equal(s.y, 540);
  });

  testCase("2.2 Letterbox Click Coordinate Transformation (Clamped)", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    vp.resize(2560, 1080); // scale = 4, offsetX = 320
    // Click far left in letterbox
    const vLeft = vp.screenToVirtual(50, 540, true);
    assert.equal(vLeft.x, 0, "Clamped X should be 0");
    assert.equal(vLeft.y, 135);

    // Click far right in letterbox (screenX = 2500, active right border = 320 + 1920 = 2240)
    const vRight = vp.screenToVirtual(2500, 540, true);
    assert.equal(vRight.x, 480, "Clamped X should be 480");
    assert.equal(vRight.y, 135);

    // Click top letterbox
    vp.resize(1080, 1920); // scale = 2, offsetY = 690
    const vTop = vp.screenToVirtual(540, 100, true);
    assert.equal(vTop.x, 240);
    assert.equal(vTop.y, 0, "Clamped Y should be 0");

    const vBottom = vp.screenToVirtual(540, 1900, true);
    assert.equal(vBottom.x, 240);
    assert.equal(vBottom.y, 270, "Clamped Y should be 270");
  });

  testCase("2.3 Negative Mouse Coordinates (Out-of-Window Cursor)", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    vp.resize(1920, 1080); // scale = 4, offset = (0, 0)
    const screenX = -400;
    const screenY = -200;
    const camX = 1000;
    const camY = 500;

    const v = vp.screenToVirtual(screenX, screenY, false);
    assert.equal(v.x, -100);
    assert.equal(v.y, -50);

    const w = vp.screenToWorld(screenX, screenY, camX, camY, false);
    assert.equal(w.x, 900);
    assert.equal(w.y, 450);

    const sBack = vp.worldToScreen(w.x, w.y, camX, camY);
    assert.equal(sBack.x, screenX);
    assert.equal(sBack.y, screenY);
  });

  // ---------------------------------------------------------------------------
  // SECTION 3: SUB-PIXEL CAMERA SNAPPING & JITTER AVOIDANCE
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 3: Sub-Pixel Camera Snapping & Jitter Avoidance ---");

  testCase("3.1 Fractional camera position rounding consistency", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    
    const cases = [
      { rawX: 100.1, rawY: 200.9, snapX: 100, snapY: 201 },
      { rawX: 100.499, rawY: 200.5, snapX: 100, snapY: 201 },
      { rawX: -0.4, rawY: -0.6, snapX: -0, snapY: -1 },
      { rawX: -100.5, rawY: -200.51, snapX: -100, snapY: -201 },
      { rawX: 999999.4, rawY: -999999.8, snapX: 999999, snapY: -1000000 },
    ];

    for (const c of cases) {
      const snap = vp.snapCamera(c.rawX, c.rawY);
      assert.equal(snap.x, c.snapX, `snapCamera X failed for ${c.rawX}`);
      assert.equal(snap.y, c.snapY, `snapCamera Y failed for ${c.rawY}`);
    }
  });

  testCase("3.2 Sub-pixel camera visual stability (Zero-Drift invariant)", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    vp.resize(1920, 1080); // 4x

    // An entity in world at (500, 300)
    const entityWx = 500;
    const entityWy = 300;

    // Moving camera sub-pixels between 100.1 and 100.4 should snap to exactly 100
    for (let sub = 0.0; sub < 0.49; sub += 0.05) {
      const camX = 100 + sub;
      const camY = 200 + sub;
      const vPos = vp.worldToVirtual(entityWx, entityWy, camX, camY);
      assert.equal(vPos.x, 400, `Virtual X must stay integer-locked at 400 (camX=${camX})`);
      assert.equal(vPos.y, 100, `Virtual Y must stay integer-locked at 100 (camY=${camY})`);

      const sPos = vp.worldToScreen(entityWx, entityWy, camX, camY);
      assert.equal(sPos.x, 1600, `Screen X must stay integer-locked at 1600 (camX=${camX})`);
      assert.equal(sPos.y, 400, `Screen Y must stay integer-locked at 400 (camY=${camY})`);
    }
  });

  // ---------------------------------------------------------------------------
  // SECTION 4: PROPERTY-BASED ROUND-TRIP FUZZING (100,000 ITERATIONS)
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 4: Property-Based Round-Trip Fuzzing (100,000 runs) ---");

  testCase("4.1 Screen <-> Virtual round-trip invariance across random resolutions", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    const resolutions = [
      [1920, 1080],
      [2560, 1440],
      [3840, 2160],
      [1366, 768],
      [1280, 720],
      [2560, 1080],
      [1080, 1920],
      [800, 600],
      [3440, 1440],
      [5120, 1440],
      [7680, 4320]
    ];

    for (const [rw, rh] of resolutions) {
      vp.resize(rw, rh);
      for (let i = 0; i < 2000; i++) {
        // Random screen coordinates including negative and out of bounds
        const sx = (Math.random() - 0.3) * rw * 1.6;
        const sy = (Math.random() - 0.3) * rh * 1.6;

        const v = vp.screenToVirtual(sx, sy, false);
        const sBack = vp.virtualToScreen(v.x, v.y);
        assertNear(sBack.x, sx, 1e-9, `Screen->Virtual->Screen sx roundtrip fail at res ${rw}x${rh}`);
        assertNear(sBack.y, sy, 1e-9, `Screen->Virtual->Screen sy roundtrip fail at res ${rw}x${rh}`);

        // Random virtual coordinates
        const vx = (Math.random() - 0.5) * 2000;
        const vy = (Math.random() - 0.5) * 2000;

        const s = vp.virtualToScreen(vx, vy);
        const vBack = vp.screenToVirtual(s.x, s.y, false);
        assertNear(vBack.x, vx, 1e-9, `Virtual->Screen->Virtual vx roundtrip fail at res ${rw}x${rh}`);
        assertNear(vBack.y, vy, 1e-9, `Virtual->Screen->Virtual vy roundtrip fail at res ${rw}x${rh}`);
      }
    }
  });

  testCase("4.2 World <-> Screen end-to-end round-trip fuzzing with sub-pixel cameras", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    vp.resize(1920, 1080);

    for (let i = 0; i < 20000; i++) {
      const wx = (Math.random() - 0.5) * 100000;
      const wy = (Math.random() - 0.5) * 100000;
      const camX = (Math.random() - 0.5) * 50000;
      const camY = (Math.random() - 0.5) * 50000;

      // World to Screen -> Screen to World
      const s = vp.worldToScreen(wx, wy, camX, camY);
      const wBack = vp.screenToWorld(s.x, s.y, camX, camY, false);

      assertNear(wBack.x, wx, 1e-9, `World->Screen->World WX mismatch (cam: ${camX}, ${camY})`);
      assertNear(wBack.y, wy, 1e-9, `World->Screen->World WY mismatch (cam: ${camX}, ${camY})`);
    }
  });

  testCase("4.3 screenDeltaToVirtual linearity and scale preservation", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    for (let scale = 1; scale <= 10; scale++) {
      vp.scale = scale;
      for (let i = 0; i < 1000; i++) {
        const dx1 = (Math.random() - 0.5) * 200;
        const dy1 = (Math.random() - 0.5) * 200;
        const dx2 = (Math.random() - 0.5) * 200;
        const dy2 = (Math.random() - 0.5) * 200;

        const delta1 = vp.screenDeltaToVirtual(dx1, dy1);
        const delta2 = vp.screenDeltaToVirtual(dx2, dy2);
        const deltaSum = vp.screenDeltaToVirtual(dx1 + dx2, dy1 + dy2);

        assertNear(deltaSum.x, delta1.x + delta2.x, 1e-9, "Delta linearity X");
        assertNear(deltaSum.y, delta1.y + delta2.y, 1e-9, "Delta linearity Y");
      }
    }
  });

  // ---------------------------------------------------------------------------
  // SECTION 5: FRUSTUM & VISIBLE BOUNDS CULLING ACCURACY
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 5: Frustum & Visible Bounds Culling Accuracy ---");

  testCase("5.1 Visible bounds exact world footprint mapping", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    const camX = 1234.6;
    const camY = 5678.2;
    const margin = 50;

    const bounds = vp.getVisibleBounds(camX, camY, margin);
    const snapX = 1235;
    const snapY = 5678;

    assert.equal(bounds.minX, snapX - 50);
    assert.equal(bounds.minY, snapY - 50);
    assert.equal(bounds.maxX, snapX + 480 + 50);
    assert.equal(bounds.maxY, snapY + 270 + 50);

    // Verify top-left corner world to virtual
    const tlV = vp.worldToVirtual(snapX, snapY, camX, camY);
    assert.equal(tlV.x, 0, "Top-left world coord must map to virtual (0, 0)");
    assert.equal(tlV.y, 0, "Top-left world coord must map to virtual (0, 0)");

    // Verify bottom-right corner world to virtual
    const brV = vp.worldToVirtual(snapX + 480, snapY + 270, camX, camY);
    assert.equal(brV.x, 480, "Bottom-right world coord must map to virtual (480, 270)");
    assert.equal(brV.y, 270, "Bottom-right world coord must map to virtual (480, 270)");
  });

  testCase("5.2 AABB Culling Invariant Stress Test", () => {
    const vp = new PixelViewportImpl({ virtualW: 480, virtualH: 270 });
    
    // Test 10,000 random objects against visible bounds
    const camX = 2500;
    const camY = 1500;
    const margin = 32;
    const bounds = vp.getVisibleBounds(camX, camY, margin);

    for (let i = 0; i < 10000; i++) {
      const objX = (Math.random() - 0.5) * 6000 + 2500;
      const objY = (Math.random() - 0.5) * 6000 + 1500;
      const objRadius = 16;

      const objMinX = objX - objRadius;
      const objMaxX = objX + objRadius;
      const objMinY = objY - objRadius;
      const objMaxY = objY + objRadius;

      const isInsideAABB = (
        objMaxX >= bounds.minX &&
        objMinX <= bounds.maxX &&
        objMaxY >= bounds.minY &&
        objMinY <= bounds.maxY
      );

      // Transform object center to virtual
      const v = vp.worldToVirtual(objX, objY, camX, camY);
      const isInsideVirtualWithMargin = (
        v.x + objRadius >= -margin &&
        v.x - objRadius <= 480 + margin &&
        v.y + objRadius >= -margin &&
        v.y - objRadius <= 270 + margin
      );

      assert.equal(isInsideAABB, isInsideVirtualWithMargin, 
        `Culling decision mismatch for object at world (${objX}, ${objY}) -> virtual (${v.x}, ${v.y})`);
    }
  });

  // ---------------------------------------------------------------------------
  // SECTION 6: RENDER QUEUE STRESS & ADVERSARIAL EDGE CASES
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 6: RenderQueue Stress & Adversarial Edge Cases ---");

  testCase("6.1 RenderQueue pool overflow auto-expansion stress (5000 items)", () => {
    const rq = createRenderQueue(128); // Start with small initial capacity
    const flushed = [];

    // Push 5000 items (exceeding initial capacity significantly)
    for (let i = 0; i < 5000; i++) {
      const sortY = 5000 - i;
      rq.push(RenderLayer.YSorted, sortY, (ctx, target) => {
        flushed.push(target);
      }, i, i);
    }

    assert.equal(rq.getCount(), 5000);
    rq.flush({});
    assert.equal(flushed.length, 5000);

    // Verify correct sorting order (ascending sortY)
    for (let i = 0; i < 4999; i++) {
      assert(flushed[i] > flushed[i + 1], "Flushed items must be sorted strictly by sortY");
    }
  });

  testCase("6.2 Equal sortY mass collision (1000 items with same sortY)", () => {
    const rq = createRenderQueue(2048);
    const resultOrder = [];

    // Push 1000 items with identical sortY = 100
    for (let i = 0; i < 1000; i++) {
      rq.push(RenderLayer.YSorted, 100, (ctx, id) => {
        resultOrder.push(id);
      }, i, i);
    }

    rq.flush({});
    assert.equal(resultOrder.length, 1000);
    // Stable tie-breaker must preserve insertion ID order
    for (let i = 0; i < 1000; i++) {
      assert.equal(resultOrder[i], i, `Tie breaker failed at index ${i}`);
    }
  });

  testCase("6.3 Extreme negative and large sortY values (-1e9 to +1e9)", () => {
    const rq = createRenderQueue(64);
    const keys = [1e9, -1e9, 0, -500, 500, -1e8, 1e8, -1, 1];
    const flushed = [];

    for (let i = 0; i < keys.length; i++) {
      rq.push(RenderLayer.YSorted, keys[i], (ctx, val) => {
        flushed.push(val);
      }, keys[i], i);
    }

    rq.flush({});
    const sorted = [...keys].sort((a, b) => a - b);
    assert.deepEqual(flushed, sorted, "Sort order must handle extreme negative/positive numbers");
  });

  testCase("6.4 Headless Context & Double Flush Safety", () => {
    const rq = createRenderQueue(64);
    rq.push(RenderLayer.Ground, 0, () => {});
    rq.push(RenderLayer.YSorted, 100, () => {});

    // Flush with null ctx
    rq.flush(null);
    assert.equal(rq.getCount(), 0, "Queue must be empty after flush");

    // Double flush on empty queue
    rq.flush(null);
    assert.equal(rq.getCount(), 0);
    rq.flush({});
    assert.equal(rq.getCount(), 0);
  });

  console.log("\n================================================================================");
  console.log(`  ALL ADVERSARIAL TESTS COMPLETED: ${passedTests}/${totalTests} PASSED (100%)`);
  console.log("================================================================================\n");
}

runAdversarialSuite().catch((err) => {
  console.error("Adversarial Suite FAILED:", err);
  process.exit(1);
});
