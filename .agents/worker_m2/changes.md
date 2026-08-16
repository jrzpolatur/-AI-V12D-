# Milestone 2: R2 Dynamic Lighting & Ambient Lantern System Changes

**Author**: Implementation Worker (M2)  
**Date**: 2026-08-16  
**Scope**: F08 - F13 (Dynamic Lighting Mask, 5 Darkness Presets, Player Lantern Halo, Bullet Glow, Explosion Punchout, Acid/Hazard Luminescence, Engine Render Integration)

---

## 1. Files Created & Modified

### 1.1 `src/game/lighting.ts` (New File)
- **Feature F08 (Dynamic Lighting Mask System)**:
  - Created `PixelLightingSystem` class matching `PROJECT.md` interface specification.
  - Implemented reusable 480×270 virtual offscreen buffer (`lightCanvas` + `lightCtx`) with zero runtime heap allocation per frame.
  - Added Node.js headless guard (`typeof document !== 'undefined' && typeof document.createElement === 'function'`) ensuring 100% safe no-op on authoritative server.
  - Implemented `destination-out` light carving for radial halos and directional aim cones.
- **Feature F09 (5-Theme Ambient Darkness Presets)**:
  - `citadel` (Dark Night / Citadel / Lobby): `rgba(10, 15, 35, 0.45)`, base darkness 0.45, lantern radius 180px, amber light `rgba(255, 240, 200, 1)`.
  - `ice_outpost` (Ice Outpost / Permafrost): `rgba(180, 210, 240, 0.18)`, base darkness 0.18, lantern radius 160px, cold cyan light `rgba(200, 240, 255, 1)`.
  - `wild_west` (Wild West / Dusk): `rgba(70, 35, 10, 0.35)`, base darkness 0.35, lantern radius 200px, warm orange light `rgba(255, 180, 80, 1)`.
  - `cyber_city` (Cyber City / Neon Void): `rgba(15, 10, 30, 0.55)`, base darkness 0.55, lantern radius 170px, electric cyan light `rgba(0, 240, 255, 1)`.
  - `biohazard_dungeon` (Biohazard Dungeon): `rgba(15, 35, 20, 0.50)`, base darkness 0.50, lantern radius 150px, radioactive green light `rgba(163, 230, 53, 1)`.
  - Support for string aliases and 0-4 numeric index mapping with robust fallback.
- **Feature F10 (Player Ambient Lantern Halo)**:
  - Breathing radius oscillation formula: `lanternRadius * (1 + 0.04 * Math.sin(time * flickerSpeed))`.
  - Forward aim-cone illumination bias: 72° arc (`coneAngle = Math.PI * 0.45`, `coneDir = aimAngle`, `coneRadius = r * 1.4`) expanding in player aim direction.
- **Feature F11 (Bullet Glow & Projectile Illumination)**:
  - Helper `addBulletLight(x, y, radius, color)` punching out 20-35px radius light cores for bullets, rockets, and plasma bolts.
- **Feature F12 (Explosion Shockwave Light Punchout)**:
  - Helper `addExplosionLight(x, y, progress, maxRadius)` expanding with `Math.sin(progress * PI / 2)` and fading intensity from 1.0 to 0.0.
- **Feature F13 (Acid Pool & Hazard Luminescence)**:
  - Helper `addHazardGlow(x, y, radius, color)` emitting soft toxic green/amber luminescence for poison clouds and fire fields.

### 1.2 `src/game/renderQueue.ts` (Modified)
- Updated `flushWorld(ctx, onLightingMask)` and `flush(ctx, onLightingMask)` to support optional callback executed strictly between Layer 3 (Overhead) and Layer 4 (AirborneFX).

### 1.3 `src/game/engine.ts` (Modified)
- Imported and exported `PixelLightingSystem`, `createPixelLightingSystem`, `THEME_LIGHTING_PRESETS`.
- Instantiated `this.lighting = createPixelLightingSystem(this.viewport.virtualW, this.viewport.virtualH)`.
- Updated `resize()` to synchronize lighting buffer dimensions with virtual viewport resolution.
- Integrated dynamic lighting pass in both `render()` and `renderNet()`:
  1. `lighting.beginFrame()`
  2. Set theme darkness preset
  3. Register player lantern halos with breathing flicker and aim cone
  4. Register active bullet glows
  5. Register explosion shockwaves and acid/fire hazard glows
  6. Execute `lighting.renderMask(snapCam.x, snapCam.y)`
  7. Composite lighting mask inside `renderQueue.flushWorld(vCtx, (c) => lighting.composite(c, snapCam.x, snapCam.y))` between Layer 3 and Layer 4.

### 1.4 `tests/unit_m2_lighting.mjs` (New File)
- 18 comprehensive unit tests covering:
  - Headless instantiation, detection, and zero-crash execution.
  - All 5 theme darkness presets, color strings, lantern radii, and index mappings.
  - Breathing lantern pulsation and forward directional aim-cone metadata.
  - Projectile light punchout and explosion shockwave scaling.
  - Toxic hazard luminescence.
  - Canvas mock destination-out carving, clearRect, fillRect, and composite blitting.
  - Zero-GC light pool geometric expansion (>256 lights).
  - Headless GameEngine stepping and snapshot integrity.

---

## 2. Verification Results
1. `node build-engine.cjs`: PASS (code 0)
2. `node node_modules/vite/bin/vite.js build`: PASS (code 0)
3. `node tests/unit_m2_lighting.mjs`: PASS (18/18 tests passed)
4. `node tests/e2e/runner.mjs`: PASS (401/401 tests passed across Tiers 1-4)
5. `node scripts/smoke-server.mjs`: PASS (code 0, snapshot simulation OK)
