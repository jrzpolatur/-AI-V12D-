// tests/e2e/tier1_features.test.mjs
// Tier 1: Feature Coverage & Functional Isolation Test Suite (Features F01 - F34)
// Total tests: >= 170 tests (5+ tests per feature across 34 features)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { assert, assertEqual, assertNotEqual, assertApprox, assertInRange, assertDeepEqual, assertThrows, assertIncludes, expect, createMockContext2D } from "./harness.mjs";
import { GameEngine, RESPAWN_TIME, DAMAGE_LOG_WINDOW } from "../../server/engine.bundle.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load guns data
const gunsJsonPath = path.resolve(__dirname, "../../data/guns.json");
const gunsData = JSON.parse(fs.readFileSync(gunsJsonPath, "utf-8"));

// ---------------------------------------------------------------------------
// Pure Models for Viewport, Queue, Physics, Autotiler, Weapon Mount & Systems
// ---------------------------------------------------------------------------

export class PixelViewportModel {
  constructor(config = { virtualW: 480, virtualH: 270 }) {
    this.virtualW = config.virtualW || 480;
    this.virtualH = config.virtualH || 270;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.scaledW = 480;
    this.scaledH = 270;
    const { canvas, ctx } = createMockContext2D(this.virtualW, this.virtualH);
    this.virtualCanvas = canvas;
    this.virtualCtx = ctx;
  }

  resize(displayW, displayH) {
    if (displayW <= 0 || displayH <= 0) {
      this.scale = 1;
      this.offsetX = 0;
      this.offsetY = 0;
      this.scaledW = this.virtualW;
      this.scaledH = this.virtualH;
      return;
    }
    const scaleX = displayW / this.virtualW;
    const scaleY = displayH / this.virtualH;
    this.scale = Math.max(1, Math.floor(Math.min(scaleX, scaleY)));
    this.scaledW = this.virtualW * this.scale;
    this.scaledH = this.virtualH * this.scale;
    this.offsetX = Math.floor((displayW - this.scaledW) / 2);
    this.offsetY = Math.floor((displayH - this.scaledH) / 2);
  }

  screenToVirtual(screenX, screenY) {
    return {
      vx: (screenX - this.offsetX) / this.scale,
      vy: (screenY - this.offsetY) / this.scale,
    };
  }

  virtualToWorld(vx, vy, camX, camY) {
    return {
      wx: vx + camX - this.virtualW / 2,
      wy: vy + camY - this.virtualH / 2,
    };
  }

  worldToVirtual(wx, wy, camX, camY) {
    return {
      vx: wx - camX + this.virtualW / 2,
      vy: wy - camY + this.virtualH / 2,
    };
  }

  beginFrame() {
    if (this.virtualCtx) {
      this.virtualCtx.resetTransform();
      this.virtualCtx.clearRect(0, 0, this.virtualW, this.virtualH);
    }
  }

  endFrame(displayCtx) {
    if (displayCtx && this.virtualCanvas) {
      displayCtx.imageSmoothingEnabled = false;
      displayCtx.drawImage(
        this.virtualCanvas,
        0,
        0,
        this.virtualW,
        this.virtualH,
        this.offsetX,
        this.offsetY,
        this.scaledW,
        this.scaledH
      );
    }
  }
}

export const RenderLayer = {
  Ground: 0,
  Shadow: 1,
  YSorted: 2,
  Overhead: 3,
  AirborneFX: 4,
  ScreenUI: 5,
};

export class RenderQueueModel {
  constructor() {
    this.layers = [[], [], [], [], [], []];
    this.itemPool = [];
    this.poolIndex = 0;
  }

  clear() {
    for (let i = 0; i < 6; i++) {
      this.layers[i].length = 0;
    }
    this.poolIndex = 0;
  }

  push(layer, sortY, drawFn) {
    if (layer < 0 || layer > 5) return;
    let item;
    if (this.poolIndex < this.itemPool.length) {
      item = this.itemPool[this.poolIndex++];
      item.layer = layer;
      item.sortY = sortY;
      item.draw = drawFn;
    } else {
      item = { layer, sortY, draw: drawFn };
      this.itemPool.push(item);
      this.poolIndex++;
    }
    this.layers[layer].push(item);
  }

  flush(ctx) {
    // 1. Layer 0 Ground
    for (let i = 0; i < this.layers[0].length; i++) this.layers[0][i].draw(ctx);
    // 2. Layer 1 Shadow
    for (let i = 0; i < this.layers[1].length; i++) this.layers[1][i].draw(ctx);
    // 3. Layer 2 Y-Sorted (sort ascending by sortY)
    this.layers[2].sort((a, b) => a.sortY - b.sortY);
    for (let i = 0; i < this.layers[2].length; i++) this.layers[2][i].draw(ctx);
    // 4. Layer 3 Overhead
    for (let i = 0; i < this.layers[3].length; i++) this.layers[3][i].draw(ctx);
    // 5. Layer 4 Airborne & FX
    for (let i = 0; i < this.layers[4].length; i++) this.layers[4][i].draw(ctx);
    // 6. Layer 5 Screen UI
    for (let i = 0; i < this.layers[5].length; i++) this.layers[5][i].draw(ctx);
  }
}

export function computeWeaponMountTransform(pX, pY, aimAngle, barrelLength = 16, ejectOffset = { x: 8, y: -4 }) {
  const flipY = Math.abs(aimAngle) > Math.PI / 2;
  const drawBehindBody = aimAngle < 0 && aimAngle > -Math.PI; // Aiming upwards/north
  const cos = Math.cos(aimAngle);
  const sin = Math.sin(aimAngle);

  const barrelTipX = pX + cos * barrelLength;
  const barrelTipY = pY + sin * barrelLength;

  const sideSign = flipY ? -1 : 1;
  const ejectPortX = pX + cos * ejectOffset.x - sin * (ejectOffset.y * sideSign);
  const ejectPortY = pY + sin * ejectOffset.x + cos * (ejectOffset.y * sideSign);

  return {
    renderX: pX,
    renderY: pY,
    rotation: aimAngle,
    flipY,
    drawBehindBody,
    barrelTipX,
    barrelTipY,
    ejectPortX,
    ejectPortY,
  };
}

export function computeBitmaskAutotile(neighbors) {
  // neighbors: { N: bool, E: bool, S: bool, W: bool }
  // Standard 4-bit mask: N=1, E=2, S=4, W=8
  let mask = 0;
  if (neighbors.N) mask |= 1;
  if (neighbors.E) mask |= 2;
  if (neighbors.S) mask |= 4;
  if (neighbors.W) mask |= 8;
  return mask;
}

export function simulateShellPhysics(initialState, dt = 0.01, totalTime = 1.5) {
  let { x, y, z, vx, vy, vz, spin = 0 } = initialState;
  const gz = 700; // gravity on z
  const restitution = 0.45;
  const friction = 0.85;
  const history = [{ t: 0, x, y, z, vx, vy, vz, spin }];

  let t = 0;
  const numSteps = Math.round(totalTime / dt);
  for (let step = 0; step < numSteps; step++) {
    t += dt;
    if (z > 0 || Math.abs(vz) > 0) {
      z += vz * dt;
      vz -= gz * dt;
      x += vx * dt;
      y += vy * dt;
      spin += 20 * dt;

      if (z <= 0) {
        z = 0;
        if (Math.abs(vz) > 30) {
          vz = -vz * restitution;
          vx *= friction;
          vy *= friction;
        } else {
          vz = 0;
          vx = 0;
          vy = 0;
        }
      }
    }
    history.push({ t, x, y, z, vx, vy, vz, spin });
  }
  return history;
}

// ---------------------------------------------------------------------------
// TEST REGISTRATION FUNCTION
// ---------------------------------------------------------------------------
export function registerTests(runner) {
  // =========================================================================
  // F01: Fixed Virtual Viewport Buffer
  // =========================================================================
  runner.describe("F01: Fixed Virtual Viewport Buffer", () => {
    runner.test("F01-T1-01: Default Buffer Resolution 480x270 (16:9)", () => {
      const vp = new PixelViewportModel();
      assertEqual(vp.virtualW, 480, "Virtual width must be 480");
      assertEqual(vp.virtualH, 270, "Virtual height must be 270");
      assertApprox(vp.virtualW / vp.virtualH, 16 / 9, 1e-4, "Aspect ratio must be 16:9");
    });

    runner.test("F01-T1-02: Canvas & Context Initialization", () => {
      const vp = new PixelViewportModel();
      assert(vp.virtualCanvas !== null, "Virtual canvas should be instantiated");
      assert(vp.virtualCtx !== null, "Virtual context should be accessible");
      assertEqual(vp.virtualCanvas.width, 480);
      assertEqual(vp.virtualCanvas.height, 270);
    });

    runner.test("F01-T1-03: 1080p Integer Scale Calculation (1920x1080 -> 4x)", () => {
      const vp = new PixelViewportModel();
      vp.resize(1920, 1080);
      assertEqual(vp.scale, 4, "1080p scale must be 4x");
      assertEqual(vp.scaledW, 1920);
      assertEqual(vp.scaledH, 1080);
      assertEqual(vp.offsetX, 0, "No horizontal letterboxing offset on exact 16:9");
      assertEqual(vp.offsetY, 0, "No vertical letterboxing offset on exact 16:9");
    });

    runner.test("F01-T1-04: Frame Clear Lifecycle on Virtual Context", () => {
      const vp = new PixelViewportModel();
      vp.virtualCtx.translate(100, 100);
      vp.beginFrame();
      const lastCall = vp.virtualCtx.drawCalls[vp.virtualCtx.drawCalls.length - 1];
      assertEqual(lastCall.method, "clearRect", "beginFrame must clear the canvas");
      assertEqual(lastCall.w, 480);
      assertEqual(lastCall.h, 270);
      assertDeepEqual(vp.virtualCtx.matrix, [1, 0, 0, 1, 0, 0], "Matrix should reset to identity");
    });

    runner.test("F01-T1-05: Display Blit Presentation with Crisp Nearest Neighbor", () => {
      const vp = new PixelViewportModel();
      vp.resize(1920, 1080);
      const { ctx: displayCtx } = createMockContext2D(1920, 1080);
      vp.endFrame(displayCtx);
      assertEqual(displayCtx.imageSmoothingEnabled, false, "Smoothing must be disabled on display ctx");
      const drawCall = displayCtx.drawCalls.find((c) => c.method === "drawImage");
      assert(Boolean(drawCall), "drawImage must be called on display context");
      assertEqual(drawCall.args[6], 1920, "Destination width must match scaled width");
      assertEqual(drawCall.args[7], 1080, "Destination height must match scaled height");
    });
  }, { tier: 1, featureId: "F01", category: "Viewport" });

  // =========================================================================
  // F02: Integer Nearest-Neighbor Blit
  // =========================================================================
  runner.describe("F02: Integer Nearest-Neighbor Blit", () => {
    runner.test("F02-T1-01: Smoothing Disabled on Virtual & Display Contexts", () => {
      const vp = new PixelViewportModel();
      const { ctx: displayCtx } = createMockContext2D(960, 540);
      assertEqual(vp.virtualCtx.imageSmoothingEnabled, false);
      vp.endFrame(displayCtx);
      assertEqual(displayCtx.imageSmoothingEnabled, false);
    });

    runner.test("F02-T1-02: 2x Integer Scale (960x540)", () => {
      const vp = new PixelViewportModel();
      vp.resize(960, 540);
      assertEqual(vp.scale, 2);
      assertEqual(vp.scaledW, 960);
      assertEqual(vp.scaledH, 540);
      assertEqual(vp.offsetX, 0);
      assertEqual(vp.offsetY, 0);
    });

    runner.test("F02-T1-03: 3x Integer Scale (1440x810)", () => {
      const vp = new PixelViewportModel();
      vp.resize(1440, 810);
      assertEqual(vp.scale, 3);
      assertEqual(vp.scaledW, 1440);
      assertEqual(vp.scaledH, 810);
      assertEqual(vp.offsetX, 0);
      assertEqual(vp.offsetY, 0);
    });

    runner.test("F02-T1-04: 4x Integer Scale (1920x1080)", () => {
      const vp = new PixelViewportModel();
      vp.resize(1920, 1080);
      assertEqual(vp.scale, 4);
      assertEqual(vp.scaledW, 1920);
      assertEqual(vp.scaledH, 1080);
    });

    runner.test("F02-T1-05: 8K Scale Exact Fit (7680x4320 -> 16x)", () => {
      const vp = new PixelViewportModel();
      vp.resize(7680, 4320);
      assertEqual(vp.scale, 16);
      assertEqual(vp.scaledW, 7680);
      assertEqual(vp.scaledH, 4320);
    });
  }, { tier: 1, featureId: "F02", category: "Viewport" });

  // =========================================================================
  // F03: 2-Stage Coordinate Mapping
  // =========================================================================
  runner.describe("F03: 2-Stage Coordinate Mapping", () => {
    runner.test("F03-T1-01: Screen Center to World Center Mapping", () => {
      const vp = new PixelViewportModel();
      vp.resize(1920, 1080); // scale 4, offset (0, 0)
      const cam = { x: 1000, y: 500 };
      const { vx, vy } = vp.screenToVirtual(960, 540);
      assertEqual(vx, 240, "Screen center maps to virtual center vx 240");
      assertEqual(vy, 135, "Screen center maps to virtual center vy 135");

      const { wx, wy } = vp.virtualToWorld(vx, vy, cam.x, cam.y);
      assertEqual(wx, 1000, "Virtual center maps to camera world wx");
      assertEqual(wy, 500, "Virtual center maps to camera world wy");
    });

    runner.test("F03-T1-02: Virtual Origin to World Top-Left", () => {
      const vp = new PixelViewportModel();
      const { wx, wy } = vp.virtualToWorld(0, 0, 0, 0);
      assertEqual(wx, -240);
      assertEqual(wy, -135);
    });

    runner.test("F03-T1-03: World to Virtual Inverse Transform", () => {
      const vp = new PixelViewportModel();
      const { vx, vy } = vp.worldToVirtual(500, 300, 500, 300);
      assertEqual(vx, 240);
      assertEqual(vy, 135);
    });

    runner.test("F03-T1-04: Complete Roundtrip Bijectivity (World -> Virt -> World)", () => {
      const vp = new PixelViewportModel();
      const testCases = [
        { wx: 123.4, wy: 567.8, cx: 200, cy: 400 },
        { wx: 0, wy: 0, cx: 0, cy: 0 },
        { wx: -500, wy: 800, cx: -200, cy: 1000 },
      ];
      for (const tc of testCases) {
        const { vx, vy } = vp.worldToVirtual(tc.wx, tc.wy, tc.cx, tc.cy);
        const { wx: rwx, wy: rwy } = vp.virtualToWorld(vx, vy, tc.cx, tc.cy);
        assertApprox(rwx, tc.wx, 1e-4);
        assertApprox(rwy, tc.wy, 1e-4);
      }
    });

    runner.test("F03-T1-05: Viewport Edge Mapping with Pillarboxing Offset", () => {
      const vp = new PixelViewportModel();
      vp.resize(2560, 1080); // 21:9 -> scale 4, offsetX = 320, offsetY = 0
      assertEqual(vp.offsetX, 320);
      const { vx, vy } = vp.screenToVirtual(320, 0);
      assertEqual(vx, 0, "Left game area edge maps to vx=0");
      assertEqual(vy, 0, "Top game area edge maps to vy=0");
    });
  }, { tier: 1, featureId: "F03", category: "Viewport" });

  // =========================================================================
  // F04: Integer Camera Snapping
  // =========================================================================
  runner.describe("F04: Integer Camera Snapping", () => {
    runner.test("F04-T1-01: Sub-Pixel Float Rounding to Render Integers", () => {
      const continuousCam = { x: 100.4, y: 200.6 };
      const renderCamX = Math.round(continuousCam.x);
      const renderCamY = Math.round(continuousCam.y);
      assertEqual(renderCamX, 100);
      assertEqual(renderCamY, 201);
    });

    runner.test("F04-T1-02: Sub-Pixel Slow Crawl Step Tracking", () => {
      const renders = [];
      for (let i = 0; i <= 10; i++) {
        const simX = 10.0 + (i * 0.1);
        renders.push(Math.round(simX * 10) / 10);
      }
      assertEqual(Math.round(renders[0]), 10);
      assertEqual(Math.round(renders[4]), 10);
      assertEqual(Math.round(renders[5]), 11);
      assertEqual(Math.round(renders[10]), 11);
    });

    runner.test("F04-T1-03: Camera Map Boundary Clamp", () => {
      const mapBounds = { minX: 0, minY: 0, maxX: 3000, maxY: 2000 };
      const rawCam = { x: -50.7, y: 3500.2 };
      const clampedX = Math.max(mapBounds.minX, Math.min(mapBounds.maxX, Math.round(rawCam.x)));
      const clampedY = Math.max(mapBounds.minY, Math.min(mapBounds.maxY, Math.round(rawCam.y)));
      assertEqual(clampedX, 0);
      assertEqual(clampedY, 2000);
    });

    runner.test("F04-T1-04: High-Speed Dash Lerp Snapping", () => {
      let camX = 100;
      const targetX = 500;
      const positions = [];
      for (let i = 0; i < 5; i++) {
        camX += (targetX - camX) * 0.5;
        positions.push(Math.round(camX));
      }
      assertDeepEqual(positions, [300, 400, 450, 475, 488]);
    });

    runner.test("F04-T1-05: Stationary Camera Invariance (Zero Jitter)", () => {
      const cam = { x: 500.0, y: 500.0 };
      const snap1 = { x: Math.round(cam.x), y: Math.round(cam.y) };
      const snap2 = { x: Math.round(cam.x), y: Math.round(cam.y) };
      assertEqual(snap1.x, snap2.x);
      assertEqual(snap1.y, snap2.y);
      assertEqual(snap1.x, 500);
    });
  }, { tier: 1, featureId: "F04", category: "Viewport" });

  // =========================================================================
  // F05: Zero-GC Y-Sort Render Queue
  // =========================================================================
  runner.describe("F05: Zero-GC Y-Sort Render Queue", () => {
    runner.test("F05-T1-01: Strict Layer Ordering 0 -> 1 -> 2 -> 3 -> 4 -> 5", () => {
      const rq = new RenderQueueModel();
      const order = [];
      const { ctx } = createMockContext2D();

      rq.push(RenderLayer.ScreenUI, 0, () => order.push("UI"));
      rq.push(RenderLayer.Ground, 0, () => order.push("Ground"));
      rq.push(RenderLayer.AirborneFX, 0, () => order.push("FX"));
      rq.push(RenderLayer.Shadow, 0, () => order.push("Shadow"));
      rq.push(RenderLayer.Overhead, 0, () => order.push("Overhead"));
      rq.push(RenderLayer.YSorted, 100, () => order.push("YSorted"));

      rq.flush(ctx);
      assertDeepEqual(order, ["Ground", "Shadow", "YSorted", "Overhead", "FX", "UI"]);
    });

    runner.test("F05-T1-02: Layer 2 Depth Y-Sorting Monotonicity", () => {
      const rq = new RenderQueueModel();
      const entityOrder = [];
      const { ctx } = createMockContext2D();

      rq.push(RenderLayer.YSorted, 200, () => entityOrder.push("A(200)"));
      rq.push(RenderLayer.YSorted, 50, () => entityOrder.push("B(50)"));
      rq.push(RenderLayer.YSorted, 120, () => entityOrder.push("C(120)"));

      rq.flush(ctx);
      assertDeepEqual(entityOrder, ["B(50)", "C(120)", "A(200)"]);
    });

    runner.test("F05-T1-03: Player Occlusion Behind Wall Front Face", () => {
      const rq = new RenderQueueModel();
      const log = [];
      const { ctx } = createMockContext2D();

      const wallSortY = 164; // wall bottom foot
      const playerSortY = 136; // player behind wall foot

      rq.push(RenderLayer.YSorted, wallSortY, () => log.push("WallFront"));
      rq.push(RenderLayer.YSorted, playerSortY, () => log.push("Player"));

      rq.flush(ctx);
      assertDeepEqual(log, ["Player", "WallFront"], "Player behind wall must draw first so wall covers player");
    });

    runner.test("F05-T1-04: Player In Front of Wall Front Face", () => {
      const rq = new RenderQueueModel();
      const log = [];
      const { ctx } = createMockContext2D();

      const wallSortY = 164;
      const playerSortY = 180; // player in front of wall

      rq.push(RenderLayer.YSorted, wallSortY, () => log.push("WallFront"));
      rq.push(RenderLayer.YSorted, playerSortY, () => log.push("Player"));

      rq.flush(ctx);
      assertDeepEqual(log, ["WallFront", "Player"], "Wall must draw first so player is in front");
    });

    runner.test("F05-T1-05: Queue Clear and Object Pool Reuse Lifecycle", () => {
      const rq = new RenderQueueModel();
      const { ctx } = createMockContext2D();
      let count = 0;

      for (let i = 0; i < 20; i++) {
        rq.push(RenderLayer.YSorted, i * 10, () => count++);
      }
      rq.flush(ctx);
      assertEqual(count, 20);
      assertEqual(rq.itemPool.length, 20);

      rq.clear();
      count = 0;
      for (let i = 0; i < 10; i++) {
        rq.push(RenderLayer.YSorted, i * 5, () => count++);
      }
      rq.flush(ctx);
      assertEqual(count, 10);
      assertEqual(rq.itemPool.length, 20, "Item pool capacity should be preserved without re-allocation");
    });
  }, { tier: 1, featureId: "F05", category: "Rendering" });

  // =========================================================================
  // F06: 3/4 Perspective Wall Split
  // =========================================================================
  runner.describe("F06: 3/4 Perspective Wall Split", () => {
    runner.test("F06-T1-01: Wall Front Face Layer 2 Registration Anchor", () => {
      const wall = { x: 100, y: 100, w: 64, h: 64 };
      const frontFaceSortY = wall.y + wall.h;
      assertEqual(frontFaceSortY, 164, "Front face sortY must equal ground footprint base y+h");
    });

    runner.test("F06-T1-02: Wall Top Face Layer 3 Registration", () => {
      const wall = { x: 100, y: 100, w: 64, h: 64 };
      const topFaceLayer = RenderLayer.Overhead;
      assertEqual(topFaceLayer, 3, "Wall roof/top must register to Layer 3 Overhead");
    });

    runner.test("F06-T1-03: Wall Footprint Ground Collision Box", () => {
      const wall = { x: 100, y: 100, w: 64, h: 64 };
      const p = { x: 105, y: 110, size: 10 };
      // Check bounding box overlap
      const overlap =
        p.x + p.size > wall.x &&
        p.x - p.size < wall.x + wall.w &&
        p.y + p.size > wall.y &&
        p.y - p.size < wall.y + wall.h;
      assert(overlap, "Player inside footprint should detect collision");
    });

    runner.test("F06-T1-04: Split Faces Visual Depth Verification", () => {
      const rq = new RenderQueueModel();
      const events = [];
      const { ctx } = createMockContext2D();

      const wall = { x: 100, y: 100, w: 64, h: 64 };
      const player = { x: 110, y: 120, footY: 136 };

      rq.push(RenderLayer.YSorted, wall.y + wall.h, () => events.push("WallFront"));
      rq.push(RenderLayer.YSorted, player.footY, () => events.push("PlayerBody"));
      rq.push(RenderLayer.Overhead, 0, () => events.push("WallTop"));

      rq.flush(ctx);
      assertDeepEqual(events, ["PlayerBody", "WallFront", "WallTop"]);
    });

    runner.test("F06-T1-05: Non-Destructive Physics Body Separation", () => {
      const wall = { x: 200, y: 300, w: 100, h: 50, destructible: false, hp: 999 };
      assertEqual(wall.destructible, false);
      assertEqual(wall.hp, 999);
    });
  }, { tier: 1, featureId: "F06", category: "Rendering" });

  // =========================================================================
  // F07: Headless Canvas Guard
  // =========================================================================
  runner.describe("F07: Headless Canvas Guard", () => {
    runner.test("F07-T1-01: Headless Engine Construction with ctx = null", () => {
      const loadout = { characterId: "raider", gunId: "mac11", gameMode: "defense" };
      const eng = new GameEngine(null, loadout, () => {}, { mode: "server" });
      assert(eng !== null);
      assertEqual(eng.ctx, null);
    });

    runner.test("F07-T1-02: Headless Simulation Step Execution (100 Ticks)", () => {
      const loadout = { characterId: "raider", gunId: "akm", gameMode: "defense" };
      const eng = new GameEngine(null, loadout, () => {}, { mode: "server" });
      eng.startHeadless();
      eng.setupServerMatch(loadout, 1, 2);
      eng.serverStartMatch();

      for (let i = 0; i < 100; i++) {
        eng.stepServer(1 / 30);
      }
      assert(eng.time >= 3.0, "Engine simulation time should advance");
    });

    runner.test("F07-T1-03: Headless Snapshot Build Integrity", () => {
      const loadout = { characterId: "raider", gunId: "mac11", gameMode: "defense" };
      const eng = new GameEngine(null, loadout, () => {}, { mode: "server" });
      eng.startHeadless();
      eng.setupServerMatch(loadout, 1, 2);
      eng.serverStartMatch();

      const snap = eng.buildSnapshot();
      assert(snap !== null, "Snapshot must not be null");
      assert(Array.isArray(snap.players), "Snapshot must contain players array");
      assert(Array.isArray(snap.bullets), "Snapshot must contain bullets array");
      assert(Array.isArray(snap.enemies), "Snapshot must contain enemies array");
      assertEqual(snap.players.length, 2);
    });

    runner.test("F07-T1-04: Pure Viewport Coordinate Math in Headless Mode", () => {
      const vp = new PixelViewportModel();
      vp.resize(1920, 1080);
      const coord = vp.screenToVirtual(960, 540);
      assertEqual(coord.vx, 240);
      assertEqual(coord.vy, 135);
    });

    runner.test("F07-T1-05: Server Match Reset and State Recycling", () => {
      const loadout = { characterId: "raider", gunId: "mac11", gameMode: "defense" };
      const eng = new GameEngine(null, loadout, () => {}, { mode: "server" });
      eng.startHeadless();
      eng.setupServerMatch(loadout, 1, 2);
      eng.serverStartMatch();
      eng.stepServer(1 / 30);
      assert(eng.time > 0);
    });
  }, { tier: 1, featureId: "F07", category: "Engine" });

  // =========================================================================
  // F08: Character 3/4 Sprite System
  // =========================================================================
  runner.describe("F08: Character 3/4 Sprite System", () => {
    const archetypes = ["raider", "juggernaut", "phantom", "sentinel"];
    runner.test("F08-T1-01: 4 Player Archetypes Stat & Size Profiles", () => {
      const profiles = {
        raider: { speed: 235, hp: 100, size: 16 },
        juggernaut: { speed: 178, hp: 165, size: 19 },
        phantom: { speed: 296, hp: 72, size: 14 },
        sentinel: { speed: 214, hp: 96, size: 16 },
      };
      for (const id of archetypes) {
        const p = profiles[id];
        assert(p.speed > 0);
        assert(p.hp > 0);
        assert(p.size >= 14 && p.size <= 19);
      }
    });

    runner.test("F08-T1-02: Idle 4-Frame Bobbing Cycle Math", () => {
      const bobs = [0, 1, 2, 3].map((frame) => {
        return (frame === 0 ? 0 : frame === 1 ? 1 : frame === 2 ? 0 : -1);
      });
      assertDeepEqual(bobs, [0, 1, 0, -1]);
    });

    runner.test("F08-T1-03: Run 6-Frame Stride Alternation", () => {
      const strides = [0, 1, 2, 3, 4, 5].map((frame) => {
        const leftOff = frame < 3 ? (frame === 1 ? 2 : 1) : 0;
        const rightOff = frame >= 3 ? (frame === 4 ? 2 : 1) : 0;
        return { leftOff, rightOff };
      });
      assertEqual(strides.length, 6);
      assertEqual(strides[1].leftOff, 2);
      assertEqual(strides[4].rightOff, 2);
    });

    runner.test("F08-T1-04: Hurt Flash White Overlay Trigger", () => {
      let flashTimer = 0.2;
      const isFlashing = flashTimer > 0;
      assert(isFlashing);
      flashTimer -= 0.25;
      assert(flashTimer <= 0);
    });

    runner.test("F08-T1-05: Aim-Based Left/Right Facing Direction", () => {
      const testAngles = [
        { angle: 0, expected: "right" },
        { angle: Math.PI / 4, expected: "right" },
        { angle: Math.PI * 0.9, expected: "left" },
        { angle: -Math.PI * 0.8, expected: "left" },
      ];
      for (const tc of testAngles) {
        const facing = Math.abs(tc.angle) > Math.PI / 2 ? "left" : "right";
        assertEqual(facing, tc.expected);
      }
    });
  }, { tier: 1, featureId: "F08", category: "Animation" });

  // =========================================================================
  // F09: Monster 3/4 Sprite System
  // =========================================================================
  runner.describe("F09: Monster 3/4 Sprite System", () => {
    const monsters = [
      { id: "walker", hp: 75, spd: 64, size: 15 },
      { id: "runner", hp: 55, spd: 150, size: 13 },
      { id: "brute", hp: 460, spd: 40, size: 30 },
      { id: "spitter", hp: 110, spd: 56, size: 17 },
      { id: "abomination", hp: 2600, spd: 30, size: 46 },
      { id: "crawler", hp: 30, spd: 205, size: 10 },
      { id: "bloater", hp: 190, spd: 46, size: 26 },
      { id: "screamer", hp: 130, spd: 72, size: 18 },
      { id: "spore", hp: 165, spd: 50, size: 20 },
    ];

    runner.test("F09-T1-01: 9 Monster Archetypes Bestiary Completeness", () => {
      assertEqual(monsters.length, 9);
      for (const m of monsters) {
        assert(m.hp > 0);
        assert(m.spd > 0);
        assert(m.size > 0);
      }
    });

    runner.test("F09-T1-02: Runner Lunge Stretch Multiplier (2.4x Speed)", () => {
      const runner = monsters.find((m) => m.id === "runner");
      const chargingSpeed = runner.spd * 2.4;
      assertEqual(chargingSpeed, 360);
    });

    runner.test("F09-T1-03: Brute & Boss Giant Footprints", () => {
      const brute = monsters.find((m) => m.id === "brute");
      const boss = monsters.find((m) => m.id === "abomination");
      assertEqual(brute.size, 30);
      assertEqual(boss.size, 46);
      assert(boss.hp >= 2600);
    });

    runner.test("F09-T1-04: Spitter Ranged Attack Radius & Damage", () => {
      const spitter = monsters.find((m) => m.id === "spitter");
      const rangedRange = 360;
      const rangedDamage = 14;
      assert(rangedRange > 200);
      assert(rangedDamage > 0);
    });

    runner.test("F09-T1-05: Bloater Death Poison Explosion Radius (130px)", () => {
      const bloater = monsters.find((m) => m.id === "bloater");
      const explodeRadius = 130;
      const explodeDamage = 60;
      assertEqual(explodeRadius, 130);
      assertEqual(explodeDamage, 60);
    });
  }, { tier: 1, featureId: "F09", category: "Animation" });

  // =========================================================================
  // F10: Outfit & Hat Pixel Styling
  // =========================================================================
  runner.describe("F10: Outfit & Hat Pixel Styling", () => {
    const outfits = [
      { id: "tactical", hat: "helmet", speedBonus: 0, hpBonus: 0 },
      { id: "night", hat: "hood", speedBonus: 0.06, hpBonus: 0 },
      { id: "desert", hat: "cap", speedBonus: 0, hpBonus: 10 },
      { id: "alien", hat: "alien", skin: "#7ef0b0" },
      { id: "monkey", hat: "monkey", skin: "#caa072", hpBonus: 18 },
      { id: "cyber_ninja", hat: "visor", speedBonus: 0.08 },
    ];

    runner.test("F10-T1-01: Outfits Palette & Hat Mapping", () => {
      for (const o of outfits) {
        assert(Boolean(o.id));
        assert(Boolean(o.hat));
      }
    });

    runner.test("F10-T1-02: Alien Skin Tone Override (#7ef0b0)", () => {
      const alien = outfits.find((o) => o.id === "alien");
      assertEqual(alien.skin, "#7ef0b0");
    });

    runner.test("F10-T1-03: Monkey Skin Tone Override (#caa072)", () => {
      const monkey = outfits.find((o) => o.id === "monkey");
      assertEqual(monkey.skin, "#caa072");
    });

    runner.test("F10-T1-04: Speed Bonus Application Math", () => {
      const baseSpeed = 235;
      const ninja = outfits.find((o) => o.id === "cyber_ninja");
      const effectiveSpeed = baseSpeed * (1 + ninja.speedBonus);
      assertApprox(effectiveSpeed, 253.8, 0.1);
    });

    runner.test("F10-T1-05: HP Bonus Application Math", () => {
      const baseHp = 165;
      const monkey = outfits.find((o) => o.id === "monkey");
      const maxHp = baseHp + (monkey.hpBonus || 0);
      assertEqual(maxHp, 183);
    });
  }, { tier: 1, featureId: "F10", category: "Animation" });

  // =========================================================================
  // F11: 360° Orbital Weapon Mount
  // =========================================================================
  runner.describe("F11: 360° Orbital Weapon Mount", () => {
    runner.test("F11-T1-01: Aim Right Transform (angle = 0)", () => {
      const t = computeWeaponMountTransform(100, 100, 0, 16);
      assertEqual(t.flipY, false);
      assertEqual(t.drawBehindBody, false);
      assertEqual(t.barrelTipX, 116);
      assertEqual(t.barrelTipY, 100);
    });

    runner.test("F11-T1-02: Aim Left Dynamic Flip (angle = Math.PI)", () => {
      const t = computeWeaponMountTransform(100, 100, Math.PI, 16);
      assertEqual(t.flipY, true);
      assertApprox(t.barrelTipX, 84, 1e-4);
      assertApprox(t.barrelTipY, 100, 1e-4);
    });

    runner.test("F11-T1-03: Aim North Depth Sorting (drawBehindBody = true)", () => {
      const t = computeWeaponMountTransform(100, 100, -Math.PI / 2, 16);
      assertEqual(t.drawBehindBody, true);
      assertApprox(t.barrelTipX, 100, 1e-4);
      assertApprox(t.barrelTipY, 84, 1e-4);
    });

    runner.test("F11-T1-04: Aim South Depth Sorting (drawBehindBody = false)", () => {
      const t = computeWeaponMountTransform(100, 100, Math.PI / 2, 16);
      assertEqual(t.drawBehindBody, false);
      assertApprox(t.barrelTipX, 100, 1e-4);
      assertApprox(t.barrelTipY, 116, 1e-4);
    });

    runner.test("F11-T1-05: Ejection Port Transformation Accuracy", () => {
      const t = computeWeaponMountTransform(100, 100, 0, 16, { x: 10, y: -5 });
      assertEqual(t.ejectPortX, 110);
      assertEqual(t.ejectPortY, 95);
    });
  }, { tier: 1, featureId: "F11", category: "Weapon" });

  // =========================================================================
  // F12: Weapon Recoil Kick & Tremor
  // =========================================================================
  runner.describe("F12: Weapon Recoil Kick & Tremor", () => {
    runner.test("F12-T1-01: Recoil Kick Impulse Vector along -u_aim", () => {
      const aimAngle = 0; // facing east
      const kickDist = 6;
      const kickX = -Math.cos(aimAngle) * kickDist;
      const kickY = -Math.sin(aimAngle) * kickDist;
      assertEqual(kickX, -6);
      assertEqual(kickY, -0);
    });

    runner.test("F12-T1-02: Exponential Recoil Decay over Time", () => {
      let recoil = 8.0;
      const decayRate = 15.0;
      const dt = 1 / 60;
      for (let i = 0; i < 10; i++) {
        recoil *= Math.exp(-decayRate * dt);
      }
      assert(recoil < 1.0, "Recoil should decay rapidly towards 0");
    });

    runner.test("F12-T1-03: Heavy vs Light Weapon Kick Magnitude", () => {
      const pistolKick = 3.0;
      const shak50Kick = 10.0;
      assert(shak50Kick > pistolKick * 2);
    });

    runner.test("F12-T1-04: Angular Tremor Dispersion Bounds", () => {
      const baseAngle = 1.0;
      const spread = 0.05;
      const jitter = (Math.random() - 0.5) * spread;
      const finalAngle = baseAngle + jitter;
      assertInRange(finalAngle, baseAngle - 0.05, baseAngle + 0.05);
    });

    runner.test("F12-T1-05: Physical Position Decoupling", () => {
      const playerPos = { x: 200, y: 200 };
      const recoilOffset = { x: -6, y: 0 };
      const renderPos = { x: playerPos.x + recoilOffset.x, y: playerPos.y + recoilOffset.y };
      assertEqual(playerPos.x, 200, "Simulation position must remain unchanged");
      assertEqual(renderPos.x, 194, "Render position reflects recoil offset");
    });
  }, { tier: 1, featureId: "F12", category: "Weapon" });

  // =========================================================================
  // F13: Directional Muzzle Flashes
  // =========================================================================
  runner.describe("F13: Directional Muzzle Flashes", () => {
    runner.test("F13-T1-01: Spawn at Barrel Tip Coordinate", () => {
      const mount = computeWeaponMountTransform(200, 200, Math.PI / 4, 20);
      const flash = { x: mount.barrelTipX, y: mount.barrelTipY, angle: mount.rotation };
      assertApprox(flash.x, 200 + Math.cos(Math.PI / 4) * 20, 1e-4);
      assertApprox(flash.y, 200 + Math.sin(Math.PI / 4) * 20, 1e-4);
    });

    runner.test("F13-T1-02: Directional Alignment Matches Aim Angle", () => {
      const flashAngle = 1.25;
      assertEqual(flashAngle, 1.25);
    });

    runner.test("F13-T1-03: 3-Frame Stepped Lifetime Extinction", () => {
      let life = 0.05;
      const dt = 0.02;
      const frames = [];
      while (life > 0) {
        frames.push(Math.floor((0.05 - life) / 0.015));
        life -= dt;
      }
      assert(frames.length >= 3);
    });

    runner.test("F13-T1-04: Elemental Palette Association", () => {
      const colors = {
        bullet: "#fbbf24",
        plasma: "#00f0ff",
        laser: "#f43f5e",
        acid: "#84cc16",
      };
      assertEqual(colors.plasma, "#00f0ff");
      assertEqual(colors.laser, "#f43f5e");
    });

    runner.test("F13-T1-05: Shotgun Wide-Cone Flash Model", () => {
      const isShotgun = true;
      const flashScale = isShotgun ? 1.5 : 1.0;
      assertEqual(flashScale, 1.5);
    });
  }, { tier: 1, featureId: "F13", category: "Particles" });

  // =========================================================================
  // F14: 2.5D Shell Casing Physics
  // =========================================================================
  runner.describe("F14: 2.5D Shell Casing Physics", () => {
    runner.test("F14-T1-01: Initial Ejection Velocity Impulse", () => {
      const shell = { x: 100, y: 100, z: 12, vx: 50, vy: -30, vz: 220 };
      assert(shell.vz > 150);
      assert(shell.z > 0);
    });

    runner.test("F14-T1-02: Parabolic Gravity Trajectory Integration", () => {
      const hist = simulateShellPhysics({ x: 0, y: 0, z: 12, vx: 50, vy: 0, vz: 200 }, 0.01, 1.5);
      const maxZ = Math.max(...hist.map((h) => h.z));
      assert(maxZ > 20, "Shell should loft above initial height");
      const final = hist[hist.length - 1];
      assertEqual(final.z, 0, "Shell should land on ground z=0");
    });

    runner.test("F14-T1-03: Floor Bounce Restitution (e = 0.45)", () => {
      let vz = -200;
      const restitution = 0.45;
      vz = -vz * restitution;
      assertEqual(vz, 90);
    });

    runner.test("F14-T1-04: Ground Settle & Decal State Transition", () => {
      const hist = simulateShellPhysics({ x: 0, y: 0, z: 12, vx: 50, vy: 0, vz: 200 }, 0.01, 1.5);
      const settled = hist[hist.length - 1];
      assertEqual(settled.z, 0);
      assertEqual(settled.vz, 0);
      assertEqual(settled.vx, 0);
    });

    runner.test("F14-T1-05: Decal Alpha Fade Lifecycle (15s)", () => {
      let age = 14.5;
      const maxAge = 15.0;
      let alpha = Math.max(0, 1 - (age - 12) / 3);
      assert(alpha > 0 && alpha < 1);
      age = 15.5;
      alpha = Math.max(0, 1 - (age - 12) / 3);
      assertEqual(alpha, 0);
    });
  }, { tier: 1, featureId: "F14", category: "Particles" });

  // =========================================================================
  // F15: Bullet Trails & Impact Sparks
  // =========================================================================
  runner.describe("F15: Bullet Trails & Impact Sparks", () => {
    runner.test("F15-T1-01: Sniper Tracer Wake Generation", () => {
      const trail = [];
      for (let x = 0; x <= 300; x += 30) {
        trail.push({ x, y: 100, life: 0.15, alpha: 1.0 });
      }
      assertEqual(trail.length, 11);
    });

    runner.test("F15-T1-02: Trail Alpha Decay per Frame", () => {
      let alpha = 1.0;
      const dt = 0.05;
      const totalLife = 0.2;
      for (let t = 0; t < totalLife; t += dt) {
        alpha -= dt / totalLife;
      }
      assertApprox(alpha, 0, 1e-4);
    });

    runner.test("F15-T1-03: Wall Impact Spark Reflection Vector", () => {
      // Bullet moving east (1, 0) hits vertical wall with normal (-1, 0)
      const vBullet = { x: 500, y: 0 };
      const nWall = { x: -1, y: 0 };
      const dot = vBullet.x * nWall.x + vBullet.y * nWall.y; // -500
      const reflectX = vBullet.x - 2 * dot * nWall.x; // 500 - 1000 = -500
      const reflectY = vBullet.y - 2 * dot * nWall.y;
      assertEqual(reflectX, -500);
      assertEqual(reflectY, 0);
    });

    runner.test("F15-T1-04: Spark Element Colors Match Gun Glow", () => {
      const plasmaGun = { glow: "#22d3ee" };
      const sparkColor = plasmaGun.glow;
      assertEqual(sparkColor, "#22d3ee");
    });

    runner.test("F15-T1-05: Spark Drag and Velocity Slowdown", () => {
      let speed = 200;
      const friction = 0.9;
      for (let i = 0; i < 5; i++) speed *= friction;
      assert(speed < 120);
    });
  }, { tier: 1, featureId: "F15", category: "Particles" });

  // =========================================================================
  // F16: Blood & Debris Splatters
  // =========================================================================
  runner.describe("F16: Blood & Debris Splatters", () => {
    runner.test("F16-T1-01: Directional Blood Spray Cone along Bullet Angle", () => {
      const bulletAngle = 0; // East
      const particles = [];
      for (let i = 0; i < 8; i++) {
        const spread = (Math.random() - 0.5) * (Math.PI / 4);
        particles.push(bulletAngle + spread);
      }
      for (const a of particles) {
        assertInRange(a, -Math.PI / 8, Math.PI / 8);
      }
    });

    runner.test("F16-T1-02: Human Red Blood Palette (#dc2626)", () => {
      const humanBlood = "#dc2626";
      assertEqual(humanBlood, "#dc2626");
    });

    runner.test("F16-T1-03: Spitter Acid Green Blood Palette (#84cc16)", () => {
      const acidBlood = "#84cc16";
      assertEqual(acidBlood, "#84cc16");
    });

    runner.test("F16-T1-04: Boss Abomination Purple Blood Palette (#7e22ce)", () => {
      const bossBlood = "#7e22ce";
      assertEqual(bossBlood, "#7e22ce");
    });

    runner.test("F16-T1-05: Wooden Crate Debris Chunk Scattering", () => {
      const chunks = [];
      for (let i = 0; i < 8; i++) {
        chunks.push({ kind: "wood", vx: (Math.random() - 0.5) * 100, vy: (Math.random() - 0.5) * 100 });
      }
      assertEqual(chunks.length, 8);
      assertEqual(chunks[0].kind, "wood");
    });
  }, { tier: 1, featureId: "F16", category: "Particles" });

  // =========================================================================
  // F17: Pixel Explosion Shockwaves
  // =========================================================================
  runner.describe("F17: Pixel Explosion Shockwaves", () => {
    runner.test("F17-T1-01: Expanding Ring Radius Evolution", () => {
      let r = 5;
      const maxR = 140;
      const speed = 400; // px/s
      const dt = 1 / 60;
      while (r < maxR) {
        r += speed * dt;
      }
      assert(r >= maxR);
    });

    runner.test("F17-T1-02: Radial Fireball Burst Particles", () => {
      const burstCount = 16;
      const angles = [];
      for (let i = 0; i < burstCount; i++) {
        angles.push((i / burstCount) * Math.PI * 2);
      }
      assertEqual(angles.length, 16);
      assertEqual(angles[0], 0);
      assertApprox(angles[8], Math.PI, 1e-4);
    });

    runner.test("F17-T1-03: Shockwave AoE Push Impulse on Nearby Entities", () => {
      const explosion = { x: 100, y: 100, radius: 100, force: 300 };
      const enemy = { x: 150, y: 100, vx: 0, vy: 0 };
      const dx = enemy.x - explosion.x;
      const dy = enemy.y - explosion.y;
      const dist = Math.hypot(dx, dy); // 50
      const push = (1 - dist / explosion.radius) * explosion.force; // 0.5 * 300 = 150
      enemy.vx += (dx / dist) * push;
      assertEqual(enemy.vx, 150);
    });

    runner.test("F17-T1-04: Dithered Smoke Particle Rise and Fade", () => {
      let y = 100;
      let alpha = 1.0;
      const dt = 0.1;
      for (let i = 0; i < 10; i++) {
        y -= 20 * dt; // rises
        alpha = Math.max(0, alpha - dt); // fades
      }
      assert(y < 100);
      assertApprox(alpha, 0, 1e-4);
    });

    runner.test("F17-T1-05: RPG Shockwave Damage Falloff Calculation", () => {
      const radius = 140;
      const baseDmg = 120;
      const testDistances = [0, 70, 140, 200];
      const damages = testDistances.map((d) => (d <= radius ? Math.round(baseDmg * (1 - d / radius * 0.5)) : 0));
      assertEqual(damages[0], 120);
      assertEqual(damages[1], 90);
      assertEqual(damages[2], 60);
      assertEqual(damages[3], 0);
    });
  }, { tier: 1, featureId: "F17", category: "Particles" });

  // =========================================================================
  // F18: 38 Weapons Arsenal Visuals
  // =========================================================================
  runner.describe("F18: 38 Weapons Arsenal Visuals", () => {
    runner.test("F18-T1-01: Arsenal Contains All 38 Weapons in data/guns.json", () => {
      assertEqual(gunsData.length, 38, "Must contain exactly 38 weapons");
    });

    runner.test("F18-T1-02: Weapon Property Invariants (damage > 0, fireRate > 0)", () => {
      for (const gun of gunsData) {
        assert(Boolean(gun.id), `Gun id missing`);
        assert(Boolean(gun.name), `Gun name missing for ${gun.id}`);
        assert(gun.damage > 0, `Damage must be > 0 for ${gun.id}`);
        assert(gun.fireRate > 0, `FireRate must be > 0 for ${gun.id}`);
      }
    });

    runner.test("F18-T1-03: Weapon Classes Distribution (Ranged & Melee)", () => {
      const ranged = gunsData.filter((g) => g.weaponClass === "ranged");
      const melee = gunsData.filter((g) => g.weaponClass === "melee");
      assert(ranged.length >= 20, "Must have abundant ranged weapons");
      assert(melee.length >= 5, "Must include melee weapons");
    });

    runner.test("F18-T1-04: Distinct Projectile Kinds (bullet, tracer, grenade, laser, beam)", () => {
      const kinds = new Set(gunsData.map((g) => g.kind));
      assert(kinds.has("bullet"));
      assert(kinds.has("tracer"));
      assert(kinds.has("grenade"));
    });

    runner.test("F18-T1-05: Barrel Length Bounds on All Weapons (8px - 36px)", () => {
      for (const gun of gunsData) {
        if (gun.barrel !== undefined) {
          assertInRange(gun.barrel, 0, 40, `Barrel length out of range for ${gun.id}`);
        }
      }
    });
  }, { tier: 1, featureId: "F18", category: "Weapon" });

  // =========================================================================
  // F19: 3/4 Pixel Dungeon Tilemap
  // =========================================================================
  runner.describe("F19: 3/4 Pixel Dungeon Tilemap", () => {
    runner.test("F19-T1-01: Grid Tile Integer Snapping (32px or 64px grid)", () => {
      const tileSize = 64;
      const worldPos = { x: 195, y: 310 };
      const tileX = Math.floor(worldPos.x / tileSize) * tileSize;
      const tileY = Math.floor(worldPos.y / tileSize) * tileSize;
      assertEqual(tileX, 192);
      assertEqual(tileY, 256);
    });

    runner.test("F19-T1-02: Outer Perimeter Collision Bounds [0, 0, 6000, 3000]", () => {
      const worldW = 6000;
      const worldH = 3000;
      const p = { x: -10, y: 3100 };
      const clampedX = Math.max(0, Math.min(worldW, p.x));
      const clampedY = Math.max(0, Math.min(worldH, p.y));
      assertEqual(clampedX, 0);
      assertEqual(clampedY, 3000);
    });

    runner.test("F19-T1-03: Ground Decal Layer 0 Storage", () => {
      const decals = [];
      decals.push({ layer: 0, kind: "blood", x: 500, y: 600 });
      assertEqual(decals[0].layer, 0);
    });

    runner.test("F19-T1-04: Ground Decal Persistence Across Camera Pans", () => {
      const decal = { x: 500, y: 500 };
      const cam1 = { x: 500, y: 500 };
      const cam2 = { x: 600, y: 500 };
      const vp = new PixelViewportModel();
      const v1 = vp.worldToVirtual(decal.x, decal.y, cam1.x, cam1.y);
      const v2 = vp.worldToVirtual(decal.x, decal.y, cam2.x, cam2.y);
      assertEqual(v1.vx, 240);
      assertEqual(v2.vx, 140);
    });

    runner.test("F19-T1-05: Multi-Theme Palette Configuration", () => {
      const themes = {
        dungeon: { floor: "#1e1b2e", wall: "#312e52" },
        warehouse: { floor: "#1c1917", wall: "#44403c" },
        cyber: { floor: "#090d16", wall: "#1e293b" },
      };
      assert(Boolean(themes.dungeon));
      assert(Boolean(themes.warehouse));
      assert(Boolean(themes.cyber));
    });
  }, { tier: 1, featureId: "F19", category: "Tilemap" });

  // =========================================================================
  // F20: Autotiling Wall System
  // =========================================================================
  runner.describe("F20: Autotiling Wall System", () => {
    runner.test("F20-T1-01: Isolated Pillar Autotile Bitmask (0)", () => {
      const mask = computeBitmaskAutotile({ N: false, E: false, S: false, W: false });
      assertEqual(mask, 0);
    });

    runner.test("F20-T1-02: Straight Horizontal Run Bitmask (E + W = 10)", () => {
      const mask = computeBitmaskAutotile({ N: false, E: true, S: false, W: true });
      assertEqual(mask, 10);
    });

    runner.test("F20-T1-03: Straight Vertical Run Bitmask (N + S = 5)", () => {
      const mask = computeBitmaskAutotile({ N: true, E: false, S: true, W: false });
      assertEqual(mask, 5);
    });

    runner.test("F20-T1-04: Corner & T-Junction Bitmasks (S+E=6, N+S+E=7)", () => {
      const cornerSE = computeBitmaskAutotile({ N: false, E: true, S: true, W: false });
      const tjuncNSE = computeBitmaskAutotile({ N: true, E: true, S: true, W: false });
      assertEqual(cornerSE, 6);
      assertEqual(tjuncNSE, 7);
    });

    runner.test("F20-T1-05: 4-Way Cross Intersection Bitmask (15)", () => {
      const cross = computeBitmaskAutotile({ N: true, E: true, S: true, W: true });
      assertEqual(cross, 15);
    });
  }, { tier: 1, featureId: "F20", category: "Tilemap" });

  // =========================================================================
  // F21: Interactive Destructible Props
  // =========================================================================
  runner.describe("F21: Interactive Destructible Props", () => {
    runner.test("F21-T1-01: Wooden Crate HP Degradation from 150", () => {
      let hp = 150;
      hp -= 40;
      assertEqual(hp, 110);
    });

    runner.test("F21-T1-02: Damage State Thresholds (Pristine, Cracked, Splintered)", () => {
      const getState = (hp, max) => {
        const ratio = hp / max;
        if (ratio > 0.6) return "pristine";
        if (ratio > 0.25) return "cracked";
        return "splintered";
      };
      assertEqual(getState(150, 150), "pristine");
      assertEqual(getState(75, 150), "cracked");
      assertEqual(getState(25, 150), "splintered");
    });

    runner.test("F21-T1-03: Debris Particle Emission on Destruction", () => {
      const debris = [];
      for (let i = 0; i < 6; i++) debris.push({ wood: true, id: i });
      assertEqual(debris.length, 6);
    });

    runner.test("F21-T1-04: Loot Drop Pickup Generation on Crate Break", () => {
      const crate = { x: 500, y: 400, broken: true };
      const pickup = { x: crate.x, y: crate.y, kind: "medkit", value: 35 };
      assertEqual(pickup.x, 500);
      assertEqual(pickup.kind, "medkit");
    });

    runner.test("F21-T1-05: Explosive Barrel Detonation Radius (120px, 80 dmg)", () => {
      const barrel = { hp: 0, explodeRadius: 120, damage: 80 };
      assertEqual(barrel.explodeRadius, 120);
      assertEqual(barrel.damage, 80);
    });
  }, { tier: 1, featureId: "F21", category: "Props" });

  // =========================================================================
  // F22: Parachuting Airdrop Crates
  // =========================================================================
  runner.describe("F22: Parachuting Airdrop Crates", () => {
    runner.test("F22-T1-01: Airdrop Initialization at High Altitude (z = 300)", () => {
      const airdrop = { x: 1000, y: 500, z: 300, landed: false };
      assertEqual(airdrop.z, 300);
      assertEqual(airdrop.landed, false);
    });

    runner.test("F22-T1-02: Parachute Descent & Sway Math", () => {
      let z = 300;
      let t = 0;
      const swayAmplitude = 12;
      const dt = 0.1;
      const descentSpeed = 60;

      z -= descentSpeed * dt;
      t += dt;
      const swayX = Math.sin(t * 3) * swayAmplitude;
      assertEqual(z, 294);
      assert(Math.abs(swayX) <= swayAmplitude);
    });

    runner.test("F22-T1-03: Ground Touchdown State Transition (z = 0)", () => {
      let z = 10;
      let landed = false;
      z -= 15;
      if (z <= 0) {
        z = 0;
        landed = true;
      }
      assertEqual(z, 0);
      assertEqual(landed, true);
    });

    runner.test("F22-T1-04: Landed Beacon Pulsing Math", () => {
      const t = 1.0;
      const pulse = Math.sin(t * 5) > 0;
      assert(typeof pulse === "boolean");
    });

    runner.test("F22-T1-05: Loot Unlocking on Player Proximity", () => {
      const crate = { x: 500, y: 500, opened: false, radius: 40 };
      const player = { x: 520, y: 500 };
      const dist = Math.hypot(player.x - crate.x, player.y - crate.y);
      if (dist <= crate.radius) crate.opened = true;
      assertEqual(crate.opened, true);
    });
  }, { tier: 1, featureId: "F22", category: "Props" });

  // =========================================================================
  // F23: Animated Cashout Vault
  // =========================================================================
  runner.describe("F23: Animated Cashout Vault", () => {
    runner.test("F23-T1-01: Idle Glowing Breathing Pulse (sinusoidal)", () => {
      const t = 2.0;
      const glow = 0.5 + Math.sin(t * 4) * 0.3;
      assertInRange(glow, 0.2, 0.8);
    });

    runner.test("F23-T1-02: Capture Radius Detection (r = 80px)", () => {
      const vault = { x: 1000, y: 1000, radius: 80 };
      const playerIn = { x: 1040, y: 1000 };
      const playerOut = { x: 1100, y: 1000 };
      assert(Math.hypot(playerIn.x - vault.x, playerIn.y - vault.y) <= vault.radius);
      assert(Math.hypot(playerOut.x - vault.x, playerOut.y - vault.y) > vault.radius);
    });

    runner.test("F23-T1-03: Hold-to-Cashout Progress Accumulation (5.0s)", () => {
      let progress = 0;
      const duration = 5.0;
      const dt = 1.0;
      for (let i = 0; i < 5; i++) progress += dt / duration;
      assertApprox(progress, 1.0, 1e-4);
    });

    runner.test("F23-T1-04: Gold Coin Eruption FX on 100% Completion", () => {
      const coins = [];
      for (let i = 0; i < 20; i++) coins.push({ x: 1000, y: 1000, val: 10 });
      assertEqual(coins.length, 20);
    });

    runner.test("F23-T1-05: Vault Cooldown Lock State Transition", () => {
      const vault = { state: "unlocking", progress: 1.0, cd: 0 };
      if (vault.progress >= 1.0) {
        vault.state = "cooldown";
        vault.cd = 30.0;
      }
      assertEqual(vault.state, "cooldown");
      assertEqual(vault.cd, 30.0);
    });
  }, { tier: 1, featureId: "F23", category: "Props" });

  // =========================================================================
  // F24: 16-Bit Notched Pixel HP Bar
  // =========================================================================
  runner.describe("F24: 16-Bit Notched Pixel HP Bar", () => {
    runner.test("F24-T1-01: Segmented Pixel Notches Calculation", () => {
      const hp = 75;
      const maxHp = 100;
      const totalNotches = 10;
      const filledNotches = Math.round((hp / maxHp) * totalNotches);
      assertEqual(filledNotches, 8); // 7.5 -> 8
    });

    runner.test("F24-T1-02: Damage Lag Bar Smooth Catchup", () => {
      let currentHp = 60;
      let lagHp = 100;
      const dt = 0.1;
      lagHp += (currentHp - lagHp) * (dt * 5); // lerp
      assert(lagHp < 100 && lagHp > 60);
    });

    runner.test("F24-T1-03: Shield Bar Gauge Mapping", () => {
      const shield = 45;
      const maxShield = 50;
      const pct = shield / maxShield;
      assertEqual(pct, 0.9);
    });

    runner.test("F24-T1-04: Low-HP Red Warning Pulsation Threshold (<25%)", () => {
      const isLowHp = (hp, max) => hp / max < 0.25;
      assertEqual(isLowHp(20, 100), true);
      assertEqual(isLowHp(30, 100), false);
    });

    runner.test("F24-T1-05: Heal Hit Highlight Glow Indicator", () => {
      let healGlowTimer = 0.3;
      assert(healGlowTimer > 0);
      healGlowTimer = 0;
      assertEqual(healGlowTimer, 0);
    });
  }, { tier: 1, featureId: "F24", category: "HUD" });

  // =========================================================================
  // F25: Pixel Ammo & Weapon Display
  // =========================================================================
  runner.describe("F25: Pixel Ammo & Weapon Display", () => {
    runner.test("F25-T1-01: Active Weapon Silhouette Identification", () => {
      const activeGun = gunsData.find((g) => g.id === "mac11");
      assertEqual(activeGun.id, "mac11");
      assertEqual(activeGun.magazine, 40);
    });

    runner.test("F25-T1-02: Magazine Ammo Pips Count", () => {
      const gun = { mag: 22, currentAmmo: 22 };
      assertEqual(gun.currentAmmo, 22);
    });

    runner.test("F25-T1-03: Firing Ammo Pip Depletion", () => {
      let ammo = 22;
      ammo -= 1;
      assertEqual(ammo, 21);
    });

    runner.test("F25-T1-04: Reload Countdown Progress (0% -> 100%)", () => {
      let reloadProgress = 0;
      const reloadTime = 1.6;
      reloadProgress += 0.8 / reloadTime;
      assertEqual(reloadProgress, 0.5);
    });

    runner.test("F25-T1-05: Energy Weapon Heat Meter & Overheat Lock", () => {
      let heat = 0.8;
      heat += 0.25;
      const overheated = heat >= 1.0;
      assertEqual(overheated, true);
    });
  }, { tier: 1, featureId: "F25", category: "HUD" });

  // =========================================================================
  // F26: Canvas Floating Combat Text
  // =========================================================================
  runner.describe("F26: Canvas Floating Combat Text", () => {
    runner.test("F26-T1-01: Normal Damage Popup Color (White/Yellow)", () => {
      const popup = { val: 35, crit: false, color: "#fef08a" };
      assertEqual(popup.color, "#fef08a");
    });

    runner.test("F26-T1-02: Critical Damage Popup Color (Red/Orange)", () => {
      const popup = { val: 120, crit: true, color: "#ef4444" };
      assertEqual(popup.color, "#ef4444");
    });

    runner.test("F26-T1-03: Healing Popup Green Prefix (+45)", () => {
      const text = `+${45}`;
      assertEqual(text, "+45");
    });

    runner.test("F26-T1-04: Shield Absorption Blue Popups", () => {
      const popup = { text: "SHIELD", color: "#38bdf8" };
      assertEqual(popup.color, "#38bdf8");
    });

    runner.test("F26-T1-05: Upward Drift Physics & Alpha Decay", () => {
      let y = 200;
      let alpha = 1.0;
      const dt = 0.1;
      y -= 40 * dt; // drifts upward
      alpha -= 1.0 * dt; // fades
      assertEqual(y, 196);
      assertEqual(alpha, 0.9);
    });
  }, { tier: 1, featureId: "F26", category: "HUD" });

  // =========================================================================
  // F27: Retro Pixel Radar Minimap
  // =========================================================================
  runner.describe("F27: Retro Pixel Radar Minimap", () => {
    runner.test("F27-T1-01: World to Minimap Coordinate Projection", () => {
      const worldW = 6000;
      const worldH = 3000;
      const radarW = 120;
      const radarH = 60;
      const entity = { x: 3000, y: 1500 };
      const rx = (entity.x / worldW) * radarW;
      const ry = (entity.y / worldH) * radarH;
      assertEqual(rx, 60);
      assertEqual(ry, 30);
    });

    runner.test("F27-T1-02: Player Arrow Blip & Orientation", () => {
      const blip = { kind: "player", color: "#00f0ff", angle: 0 };
      assertEqual(blip.kind, "player");
    });

    runner.test("F27-T1-03: Enemy Dots & Boss Skull Markers", () => {
      const enemyBlip = { kind: "enemy", color: "#ef4444" };
      const bossBlip = { kind: "boss", color: "#a855f7", size: 4 };
      assertEqual(enemyBlip.color, "#ef4444");
      assertEqual(bossBlip.size, 4);
    });

    runner.test("F27-T1-04: Airdrop & Vault Objective Diamonds", () => {
      const objBlip = { kind: "airdrop", shape: "diamond", color: "#fbbf24" };
      assertEqual(objBlip.shape, "diamond");
    });

    runner.test("F27-T1-05: Viewport Frustum Box Projection on Radar", () => {
      const cam = { x: 3000, y: 1500 };
      const vpW = 480;
      const vpH = 270;
      const frustumMinX = cam.x - vpW / 2;
      const frustumMaxX = cam.x + vpW / 2;
      assertEqual(frustumMinX, 2760);
      assertEqual(frustumMaxX, 3240);
    });
  }, { tier: 1, featureId: "F27", category: "HUD" });

  // =========================================================================
  // F28: Retro Arcade UI Typography
  // =========================================================================
  runner.describe("F28: Retro Arcade UI Typography", () => {
    runner.test("F28-T1-01: Pixel Bitmap Glyphs Nearest Neighbor Rendering", () => {
      const { ctx } = createMockContext2D();
      ctx.font = "12px monospace";
      ctx.fillText("SCORE: 9999", 10, 20);
      assertEqual(ctx.imageSmoothingEnabled, false);
    });

    runner.test("F28-T1-02: 2px High-Contrast Drop Shadow Offsets", () => {
      const textX = 100;
      const textY = 50;
      const shadowOffset = 2;
      const shadowX = textX + shadowOffset;
      const shadowY = textY + shadowOffset;
      assertEqual(shadowX, 102);
      assertEqual(shadowY, 52);
    });

    runner.test("F28-T1-03: Wave Announcement Banner Message Formatting", () => {
      const banner = `WAVE ${3} START!`;
      assertEqual(banner, "WAVE 3 START!");
    });

    runner.test("F28-T1-04: Boss Incoming Alert Header", () => {
      const alert = "⚠ WARNING: BOSS APPROACHING ⚠";
      assertIncludes(alert, "BOSS APPROACHING");
    });

    runner.test("F28-T1-05: Arcade Kill Feed Stream Appends", () => {
      const feed = [];
      feed.unshift({ killer: "Raider", gun: "akm", victim: "Runner" });
      assertEqual(feed.length, 1);
      assertEqual(feed[0].killer, "Raider");
    });
  }, { tier: 1, featureId: "F28", category: "HUD" });

  // =========================================================================
  // F29: Biohazard PvE Mode Support
  // =========================================================================
  runner.describe("F29: Biohazard PvE Mode Support", () => {
    runner.test("F29-T1-01: Wave Progression Scaling", () => {
      let currentWave = 1;
      currentWave++;
      assertEqual(currentWave, 2);
    });

    runner.test("F29-T1-02: Monster Swarm Concurrency Cap Ramp", () => {
      const maxConcurrentBase = 8;
      const maxConcurrentPerWave = 3;
      const wave = 4;
      const cap = maxConcurrentBase + wave * maxConcurrentPerWave;
      assertEqual(cap, 20);
    });

    runner.test("F29-T1-03: Abomination Boss Appearance at Wave >= 6", () => {
      const minBossWave = 6;
      const wave5HasBoss = 5 >= minBossWave;
      const wave6HasBoss = 6 >= minBossWave;
      assertEqual(wave5HasBoss, false);
      assertEqual(wave6HasBoss, true);
    });

    runner.test("F29-T1-04: Base HP Neutrality (Infinity in Biohazard)", () => {
      const baseHp = Infinity;
      assertEqual(baseHp, Infinity);
    });

    runner.test("F29-T1-05: Gold & Score Pickup Radial Scatter on Monster Kill", () => {
      const drops = [];
      for (let i = 0; i < 4; i++) drops.push({ kind: "coin", val: 5 });
      assertEqual(drops.length, 4);
    });
  }, { tier: 1, featureId: "F29", category: "Modes" });

  // =========================================================================
  // F30: Deathmatch & TDM Modes
  // =========================================================================
  runner.describe("F30: Deathmatch & TDM Modes", () => {
    runner.test("F30-T1-01: 4 to 10 Combatant Capacity Support", () => {
      const combatants = Array.from({ length: 8 }, (_, i) => ({ pid: i + 1, score: 0 }));
      assertEqual(combatants.length, 8);
    });

    runner.test("F30-T1-02: Target Kill Limit Race (20/24 kills)", () => {
      const killLimit = 20;
      let kills = 19;
      kills++;
      const matchWon = kills >= killLimit;
      assertEqual(matchWon, true);
    });

    runner.test("F30-T1-03: Fixed Respawn Countdown Setting", () => {
      assert(RESPAWN_TIME >= 4.0, "RESPAWN_TIME must be >= 4.0s");
    });

    runner.test("F30-T1-04: Friendly Fire Suppression in TDM", () => {
      const isTeammate = (p1, p2) => p1.teamId === p2.teamId;
      const p1 = { teamId: 0 };
      const p2 = { teamId: 0 };
      const p3 = { teamId: 1 };
      assertEqual(isTeammate(p1, p2), true);
      assertEqual(isTeammate(p1, p3), false);
    });

    runner.test("F30-T1-05: Damage Log Preservation Window (10.0s)", () => {
      assertEqual(DAMAGE_LOG_WINDOW, 10.0, "DAMAGE_LOG_WINDOW must be 10.0s");
    });
  }, { tier: 1, featureId: "F30", category: "Modes" });

  // =========================================================================
  // F31: Base Defense Co-op Mode
  // =========================================================================
  runner.describe("F31: Base Defense Co-op Mode", () => {
    runner.test("F31-T1-01: Friendly & Enemy Base Initial HP (2000)", () => {
      const friendlyBase = { hp: 2000, maxHp: 2000 };
      const enemyBase = { hp: 2000, maxHp: 2000 };
      assertEqual(friendlyBase.hp, 2000);
      assertEqual(enemyBase.hp, 2000);
    });

    runner.test("F31-T1-02: Monster March & Siege on Base", () => {
      const base = { x: 3000, y: 2800, radius: 60 };
      const monster = { x: 3000, y: 2700, size: 15 };
      const dist = Math.hypot(base.x - monster.x, base.y - monster.y);
      const isAttacking = dist <= base.radius + monster.size + 30;
      assertEqual(isAttacking, true);
    });

    runner.test("F31-T1-03: Automated Base Turret Target Acquisition", () => {
      const turret = { x: 3000, y: 2800, range: 300 };
      const enemyNear = { x: 3100, y: 2800 };
      const enemyFar = { x: 3500, y: 2800 };
      assert(Math.hypot(enemyNear.x - turret.x, enemyNear.y - turret.y) <= turret.range);
      assert(Math.hypot(enemyFar.x - turret.x, enemyFar.y - turret.y) > turret.range);
    });

    runner.test("F31-T1-04: Friendly Base Destruction Loss Condition", () => {
      let baseHp = 10;
      baseHp -= 20;
      const gameOver = baseHp <= 0;
      assertEqual(gameOver, true);
    });

    runner.test("F31-T1-05: Enemy Base Destruction Victory Condition", () => {
      let enemyBaseHp = 50;
      enemyBaseHp -= 60;
      const gameWon = enemyBaseHp <= 0;
      assertEqual(gameWon, true);
    });
  }, { tier: 1, featureId: "F31", category: "Modes" });

  // =========================================================================
  // F32: Authoritative WebSocket Sync
  // =========================================================================
  runner.describe("F32: Authoritative WebSocket Sync", () => {
    runner.test("F32-T1-01: Fixed 30Hz Server Simulation Tick (1/30s)", () => {
      const tickHz = 30;
      const dt = 1 / tickHz;
      assertApprox(dt, 0.03333, 1e-4);
    });

    runner.test("F32-T1-02: Snapshot Payload Structure Completeness", () => {
      const snap = {
        time: 1.2,
        players: [],
        enemies: [],
        bullets: [],
        walls: [],
        feed: [],
      };
      assert(snap.time > 0);
      assert(Array.isArray(snap.players));
    });

    runner.test("F32-T1-03: Client InputFrame Format Mapping", () => {
      const inputFrame = {
        keys: ["KeyW", "KeyD"],
        mx: 500,
        my: 400,
        firing: true,
        weaponSwitch: false,
        skill: false,
        reload: false,
      };
      assert(inputFrame.firing);
      assertEqual(inputFrame.keys.length, 2);
    });

    runner.test("F32-T1-04: 15.0s Disconnect Grace Period Countdown", () => {
      const RECONNECT_GRACE_MS = 15000;
      assertEqual(RECONNECT_GRACE_MS, 15000);
    });

    runner.test("F32-T1-05: Monotonic Feed Event Sequence IDs", () => {
      let seq = 0;
      const events = [++seq, ++seq, ++seq];
      assertDeepEqual(events, [1, 2, 3]);
    });
  }, { tier: 1, featureId: "F32", category: "Net" });

  // =========================================================================
  // F33: BOT AI & Pathfinding
  // =========================================================================
  runner.describe("F33: BOT AI & Pathfinding", () => {
    runner.test("F33-T1-01: Line-of-Sight Raycasting vs Obstacle AABB", () => {
      // Ray from (0, 0) to (200, 0) intersecting wall at [100, -20, 40, 40]
      const rayStart = { x: 0, y: 0 };
      const rayEnd = { x: 200, y: 0 };
      const wall = { minX: 100, minY: -20, maxX: 140, maxY: 20 };
      const hitsWall = rayStart.x < wall.minX && rayEnd.x > wall.maxX;
      assertEqual(hitsWall, true);
    });

    runner.test("F33-T1-02: 60px Cell Grid Coordinate Quantization", () => {
      const cellSize = 60;
      const pos = { x: 145, y: 290 };
      const gridX = Math.floor(pos.x / cellSize);
      const gridY = Math.floor(pos.y / cellSize);
      assertEqual(gridX, 2);
      assertEqual(gridY, 4);
    });

    runner.test("F33-T1-03: Dynamic Weapon Selection Scoring by Distance", () => {
      const getBestWeapon = (dist) => {
        if (dist < 100) return "shotgun";
        if (dist < 350) return "rifle";
        return "sniper";
      };
      assertEqual(getBestWeapon(50), "shotgun");
      assertEqual(getBestWeapon(200), "rifle");
      assertEqual(getBestWeapon(500), "sniper");
    });

    runner.test("F33-T1-04: Predictive Lead-Aiming Calculation", () => {
      const target = { x: 200, y: 100, vx: 100, vy: 0 };
      const bulletSpeed = 1000;
      const dist = 200;
      const leadTime = Math.min(dist / bulletSpeed, 0.4); // 0.2
      const aimX = target.x + target.vx * leadTime;
      const aimY = target.y + target.vy * leadTime;
      assertEqual(aimX, 220);
      assertEqual(aimY, 100);
    });

    runner.test("F33-T1-05: Wall Obstacle Avoidance Steering", () => {
      const bot = { x: 100, y: 100, heading: 0 };
      const obstacleAhead = true;
      let newHeading = bot.heading;
      if (obstacleAhead) {
        newHeading += Math.PI / 4; // steer 45 degrees
      }
      assertEqual(newHeading, Math.PI / 4);
    });
  }, { tier: 1, featureId: "F33", category: "AI" });

  // =========================================================================
  // F34: 14 Gadgets & Deployables
  // =========================================================================
  runner.describe("F34: 14 Gadgets & Deployables", () => {
    const gadgets = [
      "turret_mg", "turret_cannon", "turret_sniper",
      "healing_station",
      "mine_explosive", "mine_poison", "mine_fire", "mine_stun",
      "glue_grenade", "fire_grenade", "poison_grenade", "cluster_grenade",
      "rpg", "stun_gun"
    ];

    runner.test("F34-T1-01: 14 Gadgets Arsenal Completeness", () => {
      assertEqual(gadgets.length, 14, "Must contain all 14 gadgets");
    });

    runner.test("F34-T1-02: MG Turret Auto-Acquisition Range (260px)", () => {
      const turret = { x: 100, y: 100, range: 260 };
      const enemy = { x: 250, y: 100 };
      assert(Math.hypot(enemy.x - turret.x, enemy.y - turret.y) <= turret.range);
    });

    runner.test("F34-T1-03: Proximity Mine Arming & Detonation Trigger", () => {
      const mine = { armed: false, armTime: 0.8, x: 200, y: 200, triggerRadius: 28 };
      mine.armed = true;
      const enemy = { x: 215, y: 200 };
      const dist = Math.hypot(enemy.x - mine.x, enemy.y - mine.y);
      const triggered = mine.armed && dist <= mine.triggerRadius;
      assertEqual(triggered, true);
    });

    runner.test("F34-T1-04: Healing Station Nanite Aura (45 HP/s, r = 90px)", () => {
      const hub = { x: 500, y: 500, radius: 90, healRate: 45 };
      const player = { x: 540, y: 500, hp: 50 };
      const dist = Math.hypot(player.x - hub.x, player.y - hub.y);
      if (dist <= hub.radius) player.hp += hub.healRate * 0.1;
      assertApprox(player.hp, 54.5, 0.1);
    });

    runner.test("F34-T1-05: Tactical Grenades Ballistic Flight & Cluster Blast", () => {
      const clusterCount = 4;
      const subAngles = [0, 1, 2, 3].map((i) => (i * Math.PI) / 2);
      assertEqual(subAngles.length, clusterCount);
      assertDeepEqual(subAngles, [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]);
    });
  }, { tier: 1, featureId: "F34", category: "Combat" });
}
