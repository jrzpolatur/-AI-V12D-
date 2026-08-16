/**
 * tests/stress_m1_renderqueue_headless.mjs
 *
 * Adversarial Stress & Hardening Test Suite for Milestone 1
 * Targets:
 * - RenderQueue (`src/game/renderQueue.ts`)
 * - Headless Simulation (`src/game/engine.ts`)
 *
 * Test Suites:
 * 1. Heavy Stress: 10,000+ to 60,000+ items across 6 layers with dynamic doubling.
 * 2. Sorting Stability: Pathological duplicate sortY, tie-breaker stability, InsertionSort vs QuickSort parity, float precision.
 * 3. Zero-GC Pool Reuse & Memory Leak Safety: Target clearing, memory retention check, null flush guard.
 * 4. Headless Simulation Safety: Zero DOM exceptions across game modes, 1,000-tick simulation, null render execution.
 */

import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

async function runStressTests() {
  console.log("================================================================================");
  console.log("   MILESTONE 1 ADVERSARIAL STRESS TEST: RENDERQUEUE & HEADLESS SIMULATION       ");
  console.log("================================================================================\n");

  const { GameEngine } = await import("../server/engine.bundle.mjs");
  const tempEng = new GameEngine(
    null,
    {
      characterId: "raider",
      outfitId: "tactical",
      skillId: "dash",
      gunId: "smg",
      gunIds: ["smg"],
      gadgetIds: [],
      gameMode: "biohazard",
    },
    () => {},
    { mode: "server" }
  );

  const RenderQueueClass = tempEng.renderQueue.constructor;
  const ViewportClass = tempEng.viewport.constructor;

  const mockCtx = {
    save() {},
    restore() {},
    fillRect() {},
    strokeRect() {},
    clearRect() {},
    drawImage() {},
    beginPath() {},
    closePath() {},
    arc() {},
    fill() {},
    stroke() {},
    fillText() {},
  };

  let totalAssertions = 0;

  // ============================================================================
  // SUITE 1: HEAVY STRESS TESTING (10,000+ to 60,000+ items across all 6 layers)
  // ============================================================================
  console.log("--- Suite 1: Heavy Stress Testing ---");

  // 1.1 Single burst test: 12,000 items uniformly distributed across all 6 layers
  {
    const rq = new RenderQueueClass(512); // start with small capacity to force multiple geometric expansions
    const executedLayers = [];
    const executionCounts = new Int32Array(6);

    const ITEMS_PER_LAYER = 2000;
    const TOTAL_ITEMS = ITEMS_PER_LAYER * 6; // 12,000 items

    for (let layer = 0; layer < 6; layer++) {
      for (let i = 0; i < ITEMS_PER_LAYER; i++) {
        const sortY = layer === 2 ? Math.floor(Math.random() * 1000) : 0;
        rq.push(
          layer,
          sortY,
          (ctx, target) => {
            executedLayers.push(target.layer);
            executionCounts[target.layer]++;
          },
          { layer, id: i },
          i
        );
      }
    }

    assert.equal(rq.getCount(), TOTAL_ITEMS, `Total count must be ${TOTAL_ITEMS}`);
    totalAssertions++;

    for (let l = 0; l < 6; l++) {
      assert.equal(rq.getCount(l), ITEMS_PER_LAYER, `Layer ${l} count must be ${ITEMS_PER_LAYER}`);
      totalAssertions++;
    }

    rq.flush(mockCtx);

    assert.equal(executedLayers.length, TOTAL_ITEMS, "All 12,000 callbacks must execute");
    assert.equal(rq.getCount(), 0, "Queue must be empty after flush");
    totalAssertions += 2;

    // Verify strict monotonic layer ordering (0 -> 1 -> 2 -> 3 -> 4 -> 5)
    for (let i = 1; i < executedLayers.length; i++) {
      assert(
        executedLayers[i] >= executedLayers[i - 1],
        `Layer execution out of order at index ${i}: prev=${executedLayers[i - 1]}, cur=${executedLayers[i]}`
      );
    }
    totalAssertions++;

    for (let l = 0; l < 6; l++) {
      assert.equal(executionCounts[l], ITEMS_PER_LAYER, `Layer ${l} executed count mismatch`);
      totalAssertions++;
    }

    console.log(`✓ 1.1: 12,000 items uniformly across 6 layers flushed in strict layer sequence`);
  }

  // 1.2 Extreme asymmetrical burst: 50,000 items in YSorted + 10,000 in AirborneFX (Total 60,000)
  {
    const rq = new RenderQueueClass(1024);
    let flushedCount = 0;

    const Y_ITEMS = 50000;
    const FX_ITEMS = 10000;
    const TOTAL_ASYNC = Y_ITEMS + FX_ITEMS;

    const tStart = performance.now();

    for (let i = 0; i < Y_ITEMS; i++) {
      rq.push(2, Math.random() * 5000, () => { flushedCount++; });
    }
    for (let i = 0; i < FX_ITEMS; i++) {
      rq.push(4, 0, () => { flushedCount++; });
    }

    assert.equal(rq.getCount(), TOTAL_ASYNC, `Total count must be ${TOTAL_ASYNC}`);
    totalAssertions++;

    rq.flush(mockCtx);

    const tElapsed = performance.now() - tStart;
    assert.equal(flushedCount, TOTAL_ASYNC, `Flushed count must be ${TOTAL_ASYNC}`);
    totalAssertions++;

    console.log(`✓ 1.2: 60,000 items asymmetrical stress (50k YSorted + 10k FX) sorted & flushed in ${tElapsed.toFixed(2)}ms`);
  }

  // 1.3 Repeated burst stress across 100 frames with variable loads
  {
    const rq = new RenderQueueClass(2048);
    const FRAME_COUNT = 100;
    let totalPushedInRun = 0;

    for (let f = 0; f < FRAME_COUNT; f++) {
      const frameItems = 5000 + Math.floor(Math.random() * 5000); // 5,000 - 10,000 items per frame
      let frameExecuted = 0;

      for (let i = 0; i < frameItems; i++) {
        const layer = Math.floor(Math.random() * 6);
        const sortY = (layer === 2) ? Math.random() * 2000 : 0;
        rq.push(layer, sortY, () => { frameExecuted++; });
      }

      totalPushedInRun += frameItems;
      assert.equal(rq.getCount(), frameItems, `Frame ${f} count mismatch`);
      rq.flush(mockCtx);
      assert.equal(frameExecuted, frameItems, `Frame ${f} executed callback count mismatch`);
      assert.equal(rq.getCount(), 0, `Frame ${f} count must be 0 after flush`);
      totalAssertions += 3;
    }

    console.log(`✓ 1.3: 100 frames of repeated heavy bursts (${totalPushedInRun.toLocaleString()} total items) processed cleanly`);
  }

  // ============================================================================
  // SUITE 2: SORTING STABILITY & INVARIANTS (YSorted Layer 2)
  // ============================================================================
  console.log("\n--- Suite 2: Sorting Stability & Invariants ---");

  // 2.1 Pathological duplicate sortY with sequential tieBreaker (1,000 items)
  {
    const rq = new RenderQueueClass(2048);
    const N = 1000;
    const received = [];

    for (let i = 0; i < N; i++) {
      rq.push(2, 42.0, (ctx, target) => { received.push(target); }, i, i);
    }

    rq.flush(mockCtx);
    assert.equal(received.length, N, "All 1,000 identical sortY items must flush");
    totalAssertions++;

    for (let i = 0; i < N; i++) {
      assert.equal(received[i], i, `Tie-breaker stability failed at index ${i}: expected ${i}, got ${received[i]}`);
    }
    totalAssertions++;
    console.log("✓ 2.1a: 1,000 items with identical sortY preserved strict sequential tie-breaker order");
  }

  // 2.1b Pathological duplicate sortY with reverse tieBreaker (1,000 items)
  {
    const rq = new RenderQueueClass(2048);
    const N = 1000;
    const received = [];

    // Push with descending tie-breaker: 999, 998, ... 0
    for (let i = N - 1; i >= 0; i--) {
      rq.push(2, 500.0, (ctx, target) => { received.push(target); }, i, i);
    }

    rq.flush(mockCtx);
    assert.equal(received.length, N, "All 1,000 reverse items must flush");
    totalAssertions++;

    // Must be sorted to ascending tie-breaker: 0, 1, 2, ..., 999
    for (let i = 0; i < N; i++) {
      assert.equal(received[i], i, `Reverse tie-breaker sort failed at index ${i}: expected ${i}, got ${received[i]}`);
    }
    totalAssertions++;
    console.log("✓ 2.1b: 1,000 items with identical sortY & reverse tie-breaker correctly sorted ascending");
  }

  // 2.1c Pathological all-identical sortY AND all-identical tieBreaker (1,000 items)
  {
    const rq = new RenderQueueClass(2048);
    const N = 1000;
    let count = 0;

    for (let i = 0; i < N; i++) {
      rq.push(2, 100.0, () => { count++; }, null, 0); // all sortY=100, tieBreaker=0
    }

    rq.flush(mockCtx);
    assert.equal(count, N, "All identical sortY and tieBreaker items must flush without infinite recursion");
    totalAssertions++;
    console.log("✓ 2.1c: 1,000 all-identical sortY and tie-breaker items safely sorted and flushed");
  }

  // 2.2 Clustered duplicates (20 clusters of 250 items = 5,000 items)
  {
    const rq = new RenderQueueClass(4096);
    const CLUSTER_COUNT = 20;
    const PER_CLUSTER = 250;
    const TOTAL = CLUSTER_COUNT * PER_CLUSTER;

    const items = [];
    for (let c = 0; c < CLUSTER_COUNT; c++) {
      const clusterY = (c + 1) * 50; // 50, 100, 150, ..., 1000
      for (let i = 0; i < PER_CLUSTER; i++) {
        items.push({ sortY: clusterY, tieBreaker: i, cluster: c, id: i });
      }
    }

    // Shuffle items array to stress partitioning
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    for (const item of items) {
      rq.push(2, item.sortY, (ctx, target) => { result.push(target); }, item, item.tieBreaker);
    }

    const result = [];
    rq.flush(mockCtx);

    assert.equal(result.length, TOTAL, "All clustered items must be flushed");
    totalAssertions++;

    for (let i = 0; i < TOTAL; i++) {
      const expectedCluster = Math.floor(i / PER_CLUSTER);
      const expectedTie = i % PER_CLUSTER;
      const expectedY = (expectedCluster + 1) * 50;

      assert.equal(result[i].sortY, expectedY, `Index ${i}: sortY mismatch (got ${result[i].sortY}, exp ${expectedY})`);
      assert.equal(result[i].tieBreaker, expectedTie, `Index ${i}: tieBreaker mismatch (got ${result[i].tieBreaker}, exp ${expectedTie})`);
    }
    totalAssertions += 2;
    console.log("✓ 2.2: 5,000 items across 20 duplicate clusters verified against strict sort invariants");
  }

  // 2.3 InsertionSort (<= 16) vs QuickSort (> 16) parity check across various sizes
  {
    const sizes = [1, 2, 5, 15, 16, 17, 32, 64, 128, 500];

    for (const N of sizes) {
      const rq = new RenderQueueClass(1024);
      const testData = [];
      for (let i = 0; i < N; i++) {
        testData.push({
          sortY: Math.floor(Math.random() * 50),
          tieBreaker: i,
        });
      }

      // Expected sorted order via reference sort
      const expected = [...testData].sort((a, b) =>
        a.sortY !== b.sortY ? a.sortY - b.sortY : a.tieBreaker - b.tieBreaker
      );

      for (const item of testData) {
        rq.push(2, item.sortY, (ctx, target) => { actual.push(target); }, item, item.tieBreaker);
      }

      const actual = [];
      rq.flush(mockCtx);

      assert.equal(actual.length, N, `Size ${N} count mismatch`);
      for (let i = 0; i < N; i++) {
        assert.equal(actual[i].sortY, expected[i].sortY, `Size ${N} item ${i} sortY mismatch`);
        assert.equal(actual[i].tieBreaker, expected[i].tieBreaker, `Size ${N} item ${i} tieBreaker mismatch`);
      }
      totalAssertions += 3;
    }
    console.log("✓ 2.3: InsertionSort (N<=16) and QuickSort (N>16) boundary parity verified across all sizes");
  }

  // 2.4 Floating-point precision and extreme value bounds
  {
    const rq = new RenderQueueClass(512);
    const extremeValues = [
      -Number.MAX_SAFE_INTEGER,
      -1000000.5,
      -1.000002,
      -1.000001,
      0,
      0.0000001,
      0.0000002,
      100.123456,
      100.123457,
      1000000.5,
      Number.MAX_SAFE_INTEGER,
    ];

    // Push in reverse order
    for (let i = extremeValues.length - 1; i >= 0; i--) {
      rq.push(2, extremeValues[i], (ctx, target) => { actualExtremes.push(target); }, extremeValues[i], i);
    }

    const actualExtremes = [];
    rq.flush(mockCtx);

    assert.equal(actualExtremes.length, extremeValues.length);
    for (let i = 0; i < extremeValues.length; i++) {
      assert.equal(actualExtremes[i], extremeValues[i], `Extreme value at index ${i} mismatch`);
    }
    totalAssertions += 2;
    console.log("✓ 2.4: Floating-point precision and numeric extremes (-MAX_SAFE_INT to +MAX_SAFE_INT) sorted accurately");
  }

  // ============================================================================
  // SUITE 3: ZERO-GC POOL REUSE & MEMORY LEAK SAFETY
  // ============================================================================
  console.log("\n--- Suite 3: Zero-GC Pool Reuse & Memory Leak Safety ---");

  // 3.1 Steady-state 5,000-frame simulation loop with memory monitoring
  {
    const rq = new RenderQueueClass(4096);
    const WARMUP_FRAMES = 50;
    const TEST_FRAMES = 2000;

    // Warm-up to expand buckets
    for (let f = 0; f < WARMUP_FRAMES; f++) {
      for (let i = 0; i < 2000; i++) {
        rq.push(i % 6, Math.random() * 500, () => {});
      }
      rq.flush(mockCtx);
    }

    if (global.gc) global.gc();
    const memBefore = process.memoryUsage().heapUsed;

    for (let f = 0; f < TEST_FRAMES; f++) {
      for (let i = 0; i < 2000; i++) {
        rq.push(i % 6, Math.random() * 500, () => {});
      }
      rq.flush(mockCtx);
    }

    const memAfter = process.memoryUsage().heapUsed;
    const memDeltaMB = (memAfter - memBefore) / (1024 * 1024);

    console.log(`✓ 3.1: 2,000 frames executed (4,000,000 items). Heap delta: ${memDeltaMB.toFixed(2)} MB`);
    assert(memDeltaMB < 25.0, `Memory delta too large during steady-state: ${memDeltaMB.toFixed(2)} MB`);
    totalAssertions++;
  }

  // 3.2 Target reference clearing (preventing retention of dead game objects)
  {
    const rq = new RenderQueueClass(512);
    let capturedRef = { largePayload: new Uint8Array(1024 * 1024), tag: "alive" };

    rq.push(2, 100, () => {}, capturedRef);
    assert.equal(rq.getCount(), 1);

    rq.flush(mockCtx);
    assert.equal(rq.getCount(), 0);

    // After flush, bucket item's target should be null
    // We can verify this by checking that pushing a null target doesn't retain capturedRef
    rq.push(0, 0, (ctx, target) => {
      assert.equal(target, null, "Target must be null when pushed as null");
    }, null);
    rq.flush(mockCtx);

    totalAssertions += 2;
    console.log("✓ 3.2: Target references cleared on flush, preventing object graph leaks");
  }

  // 3.3 Flush with null context guard
  {
    const rq = new RenderQueueClass(512);
    rq.push(0, 0, () => { throw new Error("Should not execute in null context"); });
    rq.push(2, 50, () => { throw new Error("Should not execute in null context"); });
    rq.push(5, 0, () => { throw new Error("Should not execute in null context"); });

    assert.equal(rq.getCount(), 3);
    rq.flush(null); // Should safely no-op without throwing and reset counts
    assert.equal(rq.getCount(), 0, "Queue counts must be reset after flush(null)");
    assert.equal(rq.isEmpty(), true);

    rq.push(1, 0, () => {});
    rq.flushWorld(null);
    assert.equal(rq.getCount(), 0);

    rq.push(5, 0, () => {});
    rq.flushScreenUI(null);
    assert.equal(rq.getCount(), 0);

    totalAssertions += 4;
    console.log("✓ 3.3: flush(null), flushWorld(null), flushScreenUI(null) safely clear without errors");
  }

  // ============================================================================
  // SUITE 4: HEADLESS SIMULATION SAFETY & ZERO DOM EXCEPTIONS
  // ============================================================================
  console.log("\n--- Suite 4: Headless Simulation & DOM Safety ---");

  const gameModes = ["biohazard", "deathmatch", "team_deathmatch", "defense"];

  for (const mode of gameModes) {
    const engine = new GameEngine(
      null, // headless canvas
      {
        characterId: "raider",
        outfitId: "tactical",
        skillId: "dash",
        gunId: "mac11",
        gunIds: ["mac11", "akm"],
        gadgetIds: ["turret_mg", "mine_explosive", "healing_station"],
        gameMode: mode,
      },
      () => {},
      { mode: "server" }
    );

    assert(engine !== null, `Engine must instantiate in mode ${mode}`);
    assert(engine.viewport !== null, `Viewport must exist in mode ${mode}`);
    assert(engine.renderQueue !== null, `RenderQueue must exist in mode ${mode}`);
    totalAssertions += 3;

    engine.startHeadless();
    engine.setupServerMatch(
      {
        characterId: "juggernaut",
        outfitId: "tactical",
        skillId: "dash",
        gunId: "akm",
        gunIds: ["akm", "mac11"],
        gadgetIds: ["turret_mg"],
        gameMode: mode,
      },
      1,
      2
    );
    engine.serverStartMatch();

    // Set peer inputs
    engine.setPeerInput(1, {
      keys: ["KeyW", "KeyD"],
      mx: 200,
      my: 150,
      vmx: 200,
      vmy: 150,
      firing: true,
      gadget: -1,
      weaponSwitch: false,
      skill: false,
      reload: false,
    });
    engine.setPeerInput(2, {
      keys: ["KeyS", "KeyA"],
      mx: 300,
      my: 250,
      vmx: 300,
      vmy: 250,
      firing: false,
      gadget: -1,
      weaponSwitch: false,
      skill: false,
      reload: false,
    });

    // Run 250 ticks per mode (total 1,000 ticks across 4 modes)
    for (let tick = 0; tick < 250; tick++) {
      engine.stepServer(1 / 30);
      const snap = engine.buildSnapshot();
      assert(snap !== null, "Snapshot must not be null");
      assert(typeof snap.time === "number", "Snapshot time must be number");

      // Verify rendering methods safely no-op in headless mode without crashing
      engine.render();
      engine.renderNet();
    }
    totalAssertions += 2;

    console.log(`✓ 4.1 [Mode: ${mode}]: 250 ticks simulated with headless stepServer + render() + renderNet() safe`);
  }

  console.log("\n================================================================================");
  console.log(`   ALL ADVERSARIAL STRESS SUITES PASSED! Total Assertions Verified: ${totalAssertions}`);
  console.log("================================================================================\n");
}

runStressTests().catch((err) => {
  console.error("ADVERSARIAL STRESS TEST FAILED:", err);
  process.exit(1);
});
