## 2026-08-15T12:07:06Z
You are Worker 1 for Milestone 1: Pixel Viewport & Rendering Pipeline.
Your working directory: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_m1\worker_1
Parent Sub-Orchestrator working directory: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_m1
Project Root: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini

Read these documents first:
- ORIGINAL_REQUEST: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\ORIGINAL_REQUEST.md
- PROJECT.md: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\PROJECT.md
- SCOPE.md: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_m1\SCOPE.md
- Explorer 1 Handoff: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_m1\explorer_1\handoff.md and analysis.md
- Explorer 2 Handoff: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_m1\explorer_2\handoff.md and analysis.md
- Explorer 3 Handoff: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_m1\explorer_3\handoff.md and analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Assigned Files:
You own exclusively:
- `src/game/viewport.ts` (Implement F01, F02, F03, F04)
- `src/game/renderQueue.ts` (Implement F05, F06, F07)
- Integration into `src/game/engine.ts` (and any necessary types / helper imports)

Detailed Requirements:
1. `src/game/viewport.ts`:
   - Fixed 480×270 virtual canvas buffer (F01).
   - Headless guard (`typeof document !== 'undefined'` or null ctx).
   - Integer scale computation $S = \max(1, \lfloor\min(W/480, H/270)\rfloor)$ and centered offset calculations $Ox, Oy$ (F02).
   - Nearest-neighbor rendering (`imageSmoothingEnabled = false`) and letterbox/pillarbox fill on display canvas (F02).
   - 2-Stage coordinate mapping (F03):
     - `screenToVirtual(screenX, screenY)`: converts DOM screen/client coordinates to virtual pixel buffer (0..480, 0..270).
     - `virtualToWorld(virtualX, virtualY, camX, camY)`: converts virtual coordinates to world coordinates.
     - `screenToWorld(screenX, screenY, camX, camY)`: end-to-end screen to world mapping.
     - `worldToVirtual(worldX, worldY, camX, camY)`: world to virtual coordinate.
     - `worldToScreen(worldX, worldY, camX, camY)`: world to screen coordinate.
   - Integer camera snapping (F04): `Math.round(camX)`, `Math.round(camY)` to avoid sub-pixel edge jitter.
   - `beginFrame(screenCtx, camX, camY)` and `endFrame(screenCtx)`.

2. `src/game/renderQueue.ts`:
   - Zero-GC pre-allocated pool (e.g. 2048 reusable items) (F05).
   - 6 Semantic Render Layers:
     - `Ground = 0` (Floor tiles, terrain, decals)
     - `Shadow = 1` (Drop shadows under characters, entities, walls)
     - `YSorted = 2` (Dynamic depth sorted by `footY` ground anchor)
     - `Overhead = 3` (Wall roof caps, tree canopies, high decor)
     - `AirborneFX = 4` (Tracers, flying projectiles, particles)
     - `ScreenUI = 5` (Floating healthbars, damage numbers, crosshairs)
   - Zero-GC push operations (both parameterized target+callback and function types).
   - In-place hybrid QuickSort/InsertionSort on the `YSorted` layer with stable secondary tie-breaker (e.g. insertion order or entity ID).
   - 3/4 perspective wall splitting support (F06): split walls into shadow/base, front face (YSorted at `wall.y + wall.h`), and top face/roof (Overhead or Background), while keeping collision box `[x, y, w, h]` intact.
   - Headless canvas guard (F07): All render/flush calls safely handle null context.

3. `src/game/engine.ts`:
   - Instantiate `PixelViewport` and `RenderQueue`.
   - Update `resize()`, mouse coordinate event handlers, camera updating, and `render()` / `renderNet()` to utilize the viewport and renderQueue.
   - Ensure headless server mode (`server/authoritative.mjs` and `npm run smoke:server`) works seamlessly without DOM/canvas errors.

Verification:
- Run `npm run build` (or `npm.cmd run build`).
- Run `npm run smoke:server` (or `node scripts/smoke-server.mjs`).
- Run `node scripts/bench-sim.mjs`.
- Write your report and test results to `handoff.md` and `changes.md` in your working directory. Send a message to parent when done.
