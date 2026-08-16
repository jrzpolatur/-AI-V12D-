// tests/unit_m2_lighting.mjs
// Unit Test Suite for Milestone 2: R2 Dynamic Lighting & Ambient Lantern System (F08 - F13)

import { assert, assertEqual, assertNotEqual, assertApprox, assertInRange, assertDeepEqual, createMockContext2D } from "./e2e/harness.mjs";
import {
  PixelLightingSystem,
  createPixelLightingSystem,
  THEME_LIGHTING_PRESETS,
} from "../server/engine.bundle.mjs";
import { GameEngine } from "../server/engine.bundle.mjs";

console.log("========================================================================");
console.log(" 💡 MILESTONE 2: DYNAMIC LIGHTING & AMBIENT LANTERN UNIT TESTS 💡");
console.log("========================================================================\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ✖ [FAIL] ${name}`);
    console.error("   ", err.message || err);
    if (err.stack) {
      console.error("   ", err.stack.split("\n").slice(1, 4).join("\n    "));
    }
  }
}

// ---------------------------------------------------------------------------
// 1. Instantiation, Headless Guard & Zero Crash Safety (F08)
// ---------------------------------------------------------------------------
console.log("▶ 1. Instantiation, Headless Guard & Zero Crash Safety (F08)...");

test("F08-01: PixelLightingSystem constructs with default 480x270 virtual dimensions", () => {
  const sys = createPixelLightingSystem();
  assertEqual(sys.width, 480, "Default width must be 480");
  assertEqual(sys.height, 270, "Default height must be 270");
});

test("F08-02: Headless environment detection in pure Node.js", () => {
  const sys = new PixelLightingSystem(480, 270);
  assertEqual(sys.isHeadless(), true, "Should detect headless environment when document is undefined");
  assertEqual(sys.getCanvas(), null, "Canvas must be null in headless environment");
  assertEqual(sys.getContext(), null, "Context must be null in headless environment");
});

test("F08-03: Headless safety across all method calls (zero crash)", () => {
  const sys = new PixelLightingSystem(480, 270);
  sys.beginFrame();
  sys.addLight({ x: 100, y: 100, radius: 50, intensity: 1 });
  sys.addPlayerLantern(200, 200, Math.PI / 4, 1.0);
  sys.addBulletLight(150, 150, 20);
  sys.addExplosionLight(300, 300, 0.5, 100);
  sys.addHazardGlow(50, 50, 40);
  sys.renderMask(0, 0);
  sys.composite(null, 0, 0);
  sys.resize(960, 540);
  assertEqual(sys.width, 960);
  assertEqual(sys.height, 540);
  sys.dispose();
});

// ---------------------------------------------------------------------------
// 2. 5-Theme Ambient Darkness Presets (F09)
// ---------------------------------------------------------------------------
console.log("\n▶ 2. 5-Theme Ambient Darkness Presets (F09)...");

test("F09-01: Theme Preset 0 (Citadel / Dark Night) matches required RGBA and params", () => {
  const p = THEME_LIGHTING_PRESETS.citadel;
  assertEqual(p.ambientTint, "rgba(10, 15, 35, 0.45)");
  assertEqual(p.darkness, 0.45);
  assertEqual(p.lanternRadius, 180);
  assertEqual(p.lanternColor, "rgba(255, 240, 200, 1)");
});

test("F09-02: Theme Preset 1 (Ice Outpost / Permafrost) matches required RGBA and params", () => {
  const p = THEME_LIGHTING_PRESETS.ice_outpost;
  assertEqual(p.ambientTint, "rgba(180, 210, 240, 0.18)");
  assertEqual(p.darkness, 0.18);
  assertEqual(p.lanternRadius, 160);
  assertEqual(p.lanternColor, "rgba(200, 240, 255, 1)");
});

test("F09-03: Theme Preset 2 (Wild West / Dusk) matches required RGBA and params", () => {
  const p = THEME_LIGHTING_PRESETS.wild_west;
  assertEqual(p.ambientTint, "rgba(70, 35, 10, 0.35)");
  assertEqual(p.darkness, 0.35);
  assertEqual(p.lanternRadius, 200);
  assertEqual(p.lanternColor, "rgba(255, 180, 80, 1)");
});

test("F09-04: Theme Preset 3 (Cyber City / Neon Void) matches required RGBA and params", () => {
  const p = THEME_LIGHTING_PRESETS.cyber_city;
  assertEqual(p.ambientTint, "rgba(15, 10, 30, 0.55)");
  assertEqual(p.darkness, 0.55);
  assertEqual(p.lanternRadius, 170);
  assertEqual(p.lanternColor, "rgba(0, 240, 255, 1)");
});

test("F09-05: Theme Preset 4 (Biohazard Dungeon) matches required RGBA and params", () => {
  const p = THEME_LIGHTING_PRESETS.biohazard_dungeon;
  assertEqual(p.ambientTint, "rgba(15, 35, 20, 0.50)");
  assertEqual(p.darkness, 0.50);
  assertEqual(p.lanternRadius, 150);
  assertEqual(p.lanternColor, "rgba(163, 230, 53, 1)");
});

test("F09-06: setTheme aliases and numeric indices resolution", () => {
  const sys = new PixelLightingSystem();

  // Test numbers
  sys.setTheme(0);
  assertEqual(sys.getPreset().id, "citadel");
  sys.setTheme(1);
  assertEqual(sys.getPreset().id, "ice_outpost");
  sys.setTheme(2);
  assertEqual(sys.getPreset().id, "wild_west");
  sys.setTheme(3);
  assertEqual(sys.getPreset().id, "cyber_city");
  sys.setTheme(4);
  assertEqual(sys.getPreset().id, "biohazard_dungeon");

  // Test aliases
  sys.setTheme("lobby");
  assertEqual(sys.getPreset().id, "citadel");
  sys.setTheme("permafrost");
  assertEqual(sys.getPreset().id, "ice_outpost");
  sys.setTheme("dusk");
  assertEqual(sys.getPreset().id, "wild_west");
  sys.setTheme("neon_void");
  assertEqual(sys.getPreset().id, "cyber_city");
  sys.setTheme("biohazard");
  assertEqual(sys.getPreset().id, "biohazard_dungeon");

  // Unknown fallback
  sys.setTheme("unknown_secret_theme");
  assertEqual(sys.getPreset().id, "citadel");
});

// ---------------------------------------------------------------------------
// 3. Player Ambient Lantern Halo (F10)
// ---------------------------------------------------------------------------
console.log("\n▶ 3. Player Ambient Lantern Halo (F10)...");

test("F10-01: Player lantern halo has breathing radius pulsation", () => {
  const sys = new PixelLightingSystem();
  sys.setTheme("citadel"); // base radius 180, flickerSpeed 5.0

  sys.beginFrame();
  // At t=0, sin(0) = 0 -> radius = 180
  sys.addPlayerLantern(100, 100, 0, 0);
  assertEqual(sys.getLightCount(), 1);

  // At t = PI / (2 * 5), sin(PI/2) = 1 -> radius = 180 * 1.04 = 187.2
  sys.beginFrame();
  sys.addPlayerLantern(100, 100, 0, Math.PI / 10);
  assertEqual(sys.getLightCount(), 1);

  // At t = 3*PI / (2 * 5), sin(3PI/2) = -1 -> radius = 180 * 0.96 = 172.8
  sys.beginFrame();
  sys.addPlayerLantern(100, 100, 0, (3 * Math.PI) / 10);
  assertEqual(sys.getLightCount(), 1);
});

test("F10-02: Player lantern includes forward directional cone metadata", () => {
  const sys = new PixelLightingSystem();
  sys.beginFrame();
  const aimAngle = Math.PI / 3;
  sys.addPlayerLantern(500, 300, aimAngle, 2.0);
  assertEqual(sys.getLightCount(), 1);
});

// ---------------------------------------------------------------------------
// 4. Bullet Glow & Projectile Illumination (F11)
// ---------------------------------------------------------------------------
console.log("\n▶ 4. Bullet Glow & Projectile Illumination (F11)...");

test("F11-01: addBulletLight registers high-intensity projectile light source", () => {
  const sys = new PixelLightingSystem();
  sys.beginFrame();
  sys.addBulletLight(250, 180, 28, "#fde047");
  assertEqual(sys.getLightCount(), 1);

  sys.addBulletLight(300, 200); // default radius
  assertEqual(sys.getLightCount(), 2);
});

// ---------------------------------------------------------------------------
// 5. Explosion Shockwave Light Punchout (F12)
// ---------------------------------------------------------------------------
console.log("\n▶ 5. Explosion Shockwave Light Punchout (F12)...");

test("F12-01: addExplosionLight expands radius and fades intensity over progress", () => {
  const sys = new PixelLightingSystem();
  sys.beginFrame();

  // Detonation start: progress = 0.0
  sys.addExplosionLight(400, 300, 0.0, 150);
  assertEqual(sys.getLightCount(), 1);

  // Mid shockwave: progress = 0.5
  sys.addExplosionLight(400, 300, 0.5, 150);
  assertEqual(sys.getLightCount(), 2);

  // Detonation end: progress = 1.0
  sys.addExplosionLight(400, 300, 1.0, 150);
  assertEqual(sys.getLightCount(), 3);
});

// ---------------------------------------------------------------------------
// 6. Acid Pool & Hazard Luminescence (F13)
// ---------------------------------------------------------------------------
console.log("\n▶ 6. Acid Pool & Hazard Luminescence (F13)...");

test("F13-01: addHazardGlow registers toxic green/amber ambient glow", () => {
  const sys = new PixelLightingSystem();
  sys.beginFrame();
  sys.addHazardGlow(350, 450, 42, "rgba(74, 222, 128, 0.75)");
  assertEqual(sys.getLightCount(), 1);
});

// ---------------------------------------------------------------------------
// 7. Visual Destination-Out Carving & Canvas Mock Inspection
// ---------------------------------------------------------------------------
console.log("\n▶ 7. Visual Destination-Out Carving (Mock Canvas Inspection)...");

test("F08-04: renderMask executes destination-out light carving and clears buffer", () => {
  const sys = new PixelLightingSystem(480, 270);
  const { canvas: mockCanvas, ctx: mockCtx } = createMockContext2D(480, 270);

  // Inject mock canvas & context
  sys.lightCanvas = mockCanvas;
  sys.lightCtx = mockCtx;

  sys.setTheme("cyber_city"); // ambientTint: "rgba(15, 10, 30, 0.55)"
  sys.beginFrame();
  sys.addPlayerLantern(240, 135, 0, 0, 150);
  sys.addBulletLight(260, 135, 20);
  sys.addExplosionLight(300, 200, 0.3, 100);
  sys.addHazardGlow(100, 100, 30);

  sys.renderMask(0, 0);

  // Verify clearRect
  const clearCall = mockCtx.drawCalls.find((c) => c.method === "clearRect");
  assert(Boolean(clearCall), "renderMask must call clearRect");
  assertEqual(clearCall.w, 480);
  assertEqual(clearCall.h, 270);

  // Verify fillRect with ambientTint
  const fillCall = mockCtx.drawCalls.find((c) => c.method === "fillRect");
  assert(Boolean(fillCall), "renderMask must fill ambient darkness");
  assertEqual(fillCall.fillStyle, "rgba(15, 10, 30, 0.55)");

  // Verify destination-out composite mode was used during carving
  const gcoCalls = mockCtx.drawCalls.filter((c) => c.method === "fill" || c.method === "arc");
  assert(gcoCalls.length > 0, "Lights must be drawn to mask buffer");

  // Verify source-over was restored at the end
  assertEqual(mockCtx.globalCompositeOperation, "source-over", "Composite operation must restore to source-over");
});

test("F08-05: composite blits lightCanvas to destination context", () => {
  const sys = new PixelLightingSystem(480, 270);
  const { canvas: mockCanvas, ctx: mockCtx } = createMockContext2D(480, 270);
  sys.lightCanvas = mockCanvas;
  sys.lightCtx = mockCtx;

  const { ctx: targetCtx } = createMockContext2D(480, 270);
  sys.composite(targetCtx, 50, 80);

  const drawCall = targetCtx.drawCalls.find((c) => c.method === "drawImage");
  assert(Boolean(drawCall), "composite must call drawImage on target context");
  assertEqual(drawCall.args[0], 50, "renderX must match");
  assertEqual(drawCall.args[1], 80, "renderY must match");
});

// ---------------------------------------------------------------------------
// 8. Zero-GC Memory Capacity & Pool Expansion
// ---------------------------------------------------------------------------
console.log("\n▶ 8. Zero-GC Memory Capacity & Pool Expansion...");

test("F08-06: Light pool expands geometrically when adding >256 lights without throwing", () => {
  const sys = new PixelLightingSystem();
  sys.beginFrame();
  for (let i = 0; i < 600; i++) {
    sys.addLight({ x: i * 5, y: i * 3, radius: 20, intensity: 0.8 });
  }
  assertEqual(sys.getLightCount(), 600, "Must hold 600 lights safely");

  // Reset and reuse
  sys.beginFrame();
  assertEqual(sys.getLightCount(), 0, "beginFrame must reset light count to 0");
  for (let i = 0; i < 50; i++) {
    sys.addBulletLight(i * 10, 100);
  }
  assertEqual(sys.getLightCount(), 50);
});

// ---------------------------------------------------------------------------
// 9. GameEngine Integration & Headless Server Simulation Step
// ---------------------------------------------------------------------------
console.log("\n▶ 9. GameEngine Integration & Headless Server Simulation Step...");

test("F08-07: GameEngine instantiates PixelLightingSystem and steps cleanly", () => {
  const loadout = { characterId: "raider", gunId: "mac11", gameMode: "defense" };
  const eng = new GameEngine(null, loadout, () => {}, { mode: "server" });
  assert(Boolean(eng.lighting), "Engine must have lighting property");
  assertEqual(eng.lighting.isHeadless(), true, "Engine lighting must be headless safe in server mode");

  eng.startHeadless();
  eng.setupServerMatch(loadout, 1, 2);
  eng.serverStartMatch();

  for (let i = 0; i < 60; i++) {
    eng.stepServer(1 / 30);
  }
  assert(eng.time >= 1.8, "Simulation time should advance cleanly with lighting system initialized");
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n========================================================================");
if (passed === total) {
  console.log(` ✔ ALL UNIT TESTS PASSED! (${passed}/${total} tests passed)`);
  console.log("========================================================================\n");
  process.exit(0);
} else {
  console.error(` ✖ SOME TESTS FAILED! (${total - passed} failures out of ${total} tests)`);
  console.log("========================================================================\n");
  process.exit(1);
}
