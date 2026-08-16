# Handoff Report: R2 (Dynamic Lighting) & R3 (5-Themed World Tiles & Props)

**Author**: Explorer (Survey Agent 2)  
**Date**: 2026-08-16  
**Milestone**: M0 Survey & Planning  
**Target Scope**: R2 (Dynamic Lighting & Ambient Lantern) and R3 (5-Themed Pixel Tiles & Props)  
**Deliverables Reference**: `c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\explorer_survey_2\analysis.md`

---

## 1. Observation

1. **Dynamic Lighting State (R2)**:
   - File `src/game/draw.ts` lines 676-684 contains a single localized usage of `destination-out` strictly for drawing icon cutouts on gadgets (`turret_mg`, `turret_cannon`).
   - File `src/game/engine.ts` lines 12713-12749 (`drawWeatherOverlays`) applies flat solid color rects (`rgba(10, 15, 35, 0.28)` for night) over the screen with `globalCompositeOperation = "source-over"`.
   - There is currently **no dynamic lighting layer**, no canvas darkness mask, no player lantern halo, no bullet glow punchout, and no dynamic explosion light shockwaves.

2. **Tilemap & Themes State (R3)**:
   - File `src/game/tilemap.ts` (537 lines) defines `PixelTilemap` with 4 basic styles (`stone`, `metal`, `wood`, `dirt`) and 4-bit autotiling wall bitmasking, but lacks theme-specific ground patterns (asphalt, ice sheets, sand dunes, dungeon slime) and multi-theme palettes.
   - File `src/game/props.ts` **does not exist** in the repository.
   - File `src/game/content.ts` lines 683-764 defines 8 scenes (`SCENES`), but they are not fully unified with the 5 target environments:
     1. 大厅基地 (Lobby Base)
     2. 冰原前哨 (Ice Outpost)
     3. 狂野西部 (Wild West)
     4. 废弃未来都市 (Cyber City / Abandoned Future City)
     5. 生化废墟地牢 (Bio-hazard Dungeon)
   - Interactive props like **传送门 (Warp Portals)**, **军械库全息台 (Armory Hologram Pedestals)**, **轨道标靶 (Orbital Targets)**, **破坏性宝箱与油桶 (Chests & Explosive/Cryo/Acid Barrels)** are missing or only exist as plain walls.

3. **Rendering Pipeline & Collision Invariants**:
   - `src/game/renderQueue.ts` implements a 6-layer zero-GC Y-sorted render queue (Layers 0-5).
   - In `src/game/engine.ts` lines 10631-10789 (`render()`), the world layers are flushed at line 10764 (`this.renderQueue.flushWorld(vCtx)`), followed by screen overlays and ScreenUI.
   - In server headless mode (`server/authoritative.mjs` / `server/engine.bundle.mjs`), `ctx === null`, and simulation runs headlessly with zero DOM dependency.

---

## 2. Logic Chain

1. **R2 Dynamic Lighting Pipeline**:
   - To achieve the 16-bit arcade atmospheric lighting without impacting 60 FPS performance, dynamic lighting must use a dedicated offscreen canvas mask (`lightCanvas` of 480×270 virtual pixels) allocated once at startup.
   - The light mask is filled with theme-specific ambient darkness (`rgba(color, darkness)`).
   - `destination-out` compositing is then applied to carve out visibility circles for:
     - Player lantern (radial gradient with breathing flicker and forward aim cone bias)
     - Flying bullets (colored radial glow following projectile coordinates)
     - Explosion shockwaves (expanding punchout disk scaling with blast radius)
     - Acid pool highlights (soft green luminescence over toxic puddles)
     - Stationary lanterns / base power crystals
   - The resulting lighting mask is blitted over the world scene **between Layer 3 (Overhead)** and **Layer 4 (AirborneFX / High-Emissive Particles & Beams)**. This ensures energy lasers, muzzle flashes, and UI elements pop brightly through the dark atmosphere.

2. **R3 Multi-Themed World & Props System**:
   - The 5 target themes require distinct procedural floor patterns and palettes in `tilemap.ts` (polished high-tech slate for Lobby, blue permafrost for Ice Outpost, ochre sand for Wild West, wet neon asphalt for Cyber City, and flagstone slime for Biohazard Dungeon).
   - Creating `src/game/props.ts` decouples prop visual rendering and animation from physics collision.
   - Physics colliders remain clean AABB boxes in `Wall[]` and server simulation, while `footY = prop.y + prop.h` ensures correct Layer 2 Y-sorting so entities walk seamlessly in front of and behind props.
   - Props incorporate full destruction lifecycles (HP, damage crack overlays, particle debris via `pixelParticles.emitDebris()`, and pickup drops).

---

## 3. Caveats

1. **Headless Server Execution**:
   - Node.js server (`server/authoritative.mjs` via `server/engine.bundle.mjs`) has no `document` or `HTMLCanvasElement`.
   - All lighting (`lighting.ts`), sprite caching, and offscreen canvas operations in `tilemap.ts` and `props.ts` must maintain strict headless guards (`canCreateCanvas()`, `if (!ctx) return;`).
2. **Network Replication Bandwidth**:
   - The 30Hz snapshot protocol (`net/protocol.ts`) does not need to synchronize lighting masks or light rays directly. Clients reconstruct identical dynamic lighting locally using snapshot entity coordinates (bullets, players, explosions, map theme index).
3. **Integer Pixel Viewport Consistency**:
   - The lighting buffer and all prop draw calls must snap coordinates through the virtual pixel buffer (480×270) to prevent sub-pixel jitter or blurred lighting edges.

---

## 4. Conclusion

- **R2 (Dynamic Lighting)** requires creating `src/game/lighting.ts` with `PixelLightingSystem`, providing zero-GC 480×270 offscreen buffer masking, 5-theme ambient darkness presets, `destination-out` punchouts (lantern, bullet glow, explosion shockwave, acid highlights), and insertion between Layer 3 and Layer 4.
- **R3 (5 Themes & Pixel Props)** requires creating `src/game/props.ts` (portals, armory holograms, orbital targets, interactive crates, chests, explosive/acid barrels) and upgrading `src/game/tilemap.ts` with 5-theme palettes and procedural ground patterns, adhering to strict collision-geometry vs visual-rendering decoupling.
- Detailed specifications, architectural diagrams, and interfaces are fully documented in `analysis.md`.

---

## 5. Verification Method

1. **TypeScript Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
2. **Engine Bundle & Headless Server Build**:
   ```powershell
   npm run build:engine
   node tests/stress_m1_renderqueue_headless.mjs
   ```
3. **Multiplayer & Server Smoke Tests**:
   ```powershell
   node scripts/smoke-server.mjs
   node scripts/smoke-ws.mjs
   ```
4. **Visual Inspection**:
   - Load each of the 5 map themes in singleplayer and multiplayer.
   - Verify ambient darkness tint and player lantern halo visibility.
   - Verify bullet glow and explosion shockwaves carving out darkness.
   - Verify prop placement, Y-sorting depth, and destructible physics.
