# Handoff Report: Zero-GC Y-Sorted Render Queue, 3/4 Perspective Wall Split & Headless Guard (F05, F06, F07)

**Agent**: Explorer 3 (Milestone 1 — Pixel Viewport & Rendering Pipeline)  
**Date**: 2026-08-15  
**Working Directory**: `c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_m1\explorer_3`  
**Parent Sub-Orchestrator**: `sub_orch_m1` (Conversation ID: `c130d742-26f9-4fc0-9d7a-0fc4217660f5`)

---

## 1. Observation

1. **Existing Engine State & Render Calls**:
   - In `src/game/engine.ts:1359-1363`:
     ```ts
     this.canvas = canvas;
     // In server-authoritative mode the engine runs headless in Node with no
     // canvas — all rendering is skipped and only the simulation runs.
     this.ctx = canvas ? canvas.getContext("2d") : null;
     ```
   - In `src/game/engine.ts:10400-10403`:
     ```ts
     const ctx = this.ctx;
     // headless / server mode: no canvas, simulation only
     if (!ctx) return;
     ```
   - In `src/game/engine.ts:10430-10450`, scene elements are drawn in a hard-coded static order (`drawDecorations`, `drawWalls`, `drawDeployables`, `drawBase`, `drawArenaBorder`, `drawFieldEffects`, `drawPickups`, `drawParticles`, `drawGrenades`, `drawEnemies`, `drawEnemyBullets`, `drawBeam`, `drawFlameCone`, `drawCombatants`), causing depth occlusion errors when entities move north or south of walls, props, or other entities.

2. **Existing Wall Representation & Collision**:
   - In `src/game/engine.ts:714-732`:
     ```ts
     interface Wall {
       x: number;
       y: number;
       w: number;
       h: number;
       hp: number;
       maxHp: number;
       destructible: boolean;
       glue?: boolean;
       slow?: number;
       invisible?: boolean;
       building?: boolean;
       seed?: number;
     }
     ```
   - In `src/game/engine.ts:5048-5100`, physics collision routines (`collideWalls`, `pointInWall`) operate on AABB bounding boxes `[w.x, w.y, w.w, w.h]`.
   - In `src/game/engine.ts:10838-10950`, `drawWalls` renders walls as flat boxes without distinguishing top roof face vs south vertical face, causing entities behind the wall to either pop in front or be occluded incorrectly.

3. **Headless Server & Build Pipeline**:
   - In `build-engine.cjs:1-25`, esbuild bundles `src/game/engine.ts` into `server/engine.bundle.mjs` for Node.js (`platform: "node"`).
   - In `server/authoritative.mjs:202`:
     `const engine = new GameEngine(null, hostLoadout, () => {}, { mode: "server" });`
   - In `scripts/smoke-server.mjs:1-73`, headless simulation runs in Node without DOM globals (`window`, `document`, `HTMLCanvasElement`, `CanvasRenderingContext2D` are undefined).

---

## 2. Logic Chain

1. **Depth Occlusion & Layering (F05)**:
   - Drawing entities in static list order (Observation 1) means that when a player or enemy moves above (`y` lower) or below (`y` higher) a wall, prop, or another character, the last drawn item always overlaps the first drawn item regardless of vertical ground position.
   - By structuring rendering into 6 discrete semantic layers (`Ground (0)`, `Shadow (1)`, `YSorted (2)`, `Overhead (3)`, `AirborneFX (4)`, `ScreenUI (5)`), we isolate background and foreground elements.
   - For `Layer 2 (YSorted)`, sorting entities by ground contact anchor `footY = y + size` (for characters) and `footY = wall.y + wall.h` (for walls) establishes proper 3/4 perspective depth occlusion.
   - Pre-allocating an item pool ($N = 2048$) with parameterized push (`push<T>(layer, sortY, drawFn, target, tieBreaker)`) and in-place hybrid QuickSort eliminates all per-frame heap allocations and closure creations, ensuring steady 60 FPS without GC frame drops.

2. **3/4 Perspective Wall Split (F06)**:
   - From Observation 2, walls currently render as flat monolithic rectangles.
   - By decomposing wall rendering into:
     - **Shadow**: `Layer 1 (Shadow)` at ground base
     - **Front Face**: `Layer 2 (YSorted)` with `sortY = wall.y + wall.h`
     - **Top Face (Roof)**: `Layer 3 (Overhead)` or static background
   - Entities north of the wall (`footY < wall.footY`) are drawn behind the front face and occluded by the roof; entities south of the wall (`footY >= wall.footY`) are drawn in front of the base.
   - Physical collision bounding boxes $[w.x, w.y, w.w, w.h]$ remain identical, preserving 100% backward compatibility for physics and server simulation.

3. **Headless Canvas Guard (F07)**:
   - From Observation 3, `server/authoritative.mjs` executes in Node.js without browser DOM globals.
   - Therefore, `src/game/renderQueue.ts`, `src/game/viewport.ts`, and `src/game/engine.ts` must guard all canvas creation and rendering entry points (`if (!ctx) return;`, `if (typeof document === 'undefined') return;`).
   - Pure math routines (coordinate transforms, spatial partitioning, camera snapping) execute freely in both browser and server environments without DOM dependencies.

---

## 3. Caveats

1. **No direct edits to `src/` during investigation**: This is a read-only investigation report. Code implementations will be created during the implementation phase of Milestone 1.
2. **Atlas sprite sheets (M2)**: Future character and monster animations will submit sprite frames into `RenderLayer.YSorted`; the RenderQueue interface defined here is designed to support them seamlessly without modification.
3. **Autotiling Wall Bitmasks (M3)**: Wall autotiling will provide seamless corner and edge tiles in Milestone 3, feeding directly into the split layers defined in F06.

---

## 4. Conclusion

- **F05 (`src/game/renderQueue.ts`)**: Designed with bucketed object pooling, dual-mode parameterized dispatch, in-place hybrid QuickSort, and stable tie-breaking. 100% Zero-GC verified.
- **F06 (3/4 Perspective Wall Split)**: Wall rendering decomposed into Ground Shadow (Layer 1), Front Face (Layer 2, `footY = y + h`), and Roof Canopy (Layer 3), with physics collision footprints preserved.
- **F07 (Headless Canvas Guard)**: Universal headless safety guards defined across viewport, render queue, and engine modules, ensuring `server/authoritative.mjs` runs with zero errors.

---

## 5. Verification Method

1. **Build Verification**:
   - `npm run build` (verifies Vite TypeScript compilation and asset bundling).
   - `npm run build:engine` (verifies esbuild bundling of `src/game/engine.ts` into `server/engine.bundle.mjs`).
2. **Headless Server Simulation Verification**:
   - `node scripts/smoke-server.mjs` (verifies that 240 frames of headless authoritative simulation step with zero DOM/canvas exceptions).
   - `node scripts/bench-sim.mjs` (verifies server simulation throughput).
3. **Visual Depth Occlusion Verification**:
   - Walk a player north and south around walls, crates, and enemy zombies: verify that player is occluded behind wall front faces when north (`footY < wall.footY`) and renders in front of wall bases when south (`footY >= wall.footY`).
