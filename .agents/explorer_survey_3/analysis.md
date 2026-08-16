# Comprehensive Architectural & Codebase Survey Report

**Project**: 2D Pixel Dungeon Shooter (Transplanting Project2.0's 16-Bit Arcade Pixel Aesthetic, Dynamic Lighting & World System)  
**Surveyor**: Explorer (Survey Agent 3)  
**Date**: 2026-08-16  
**Project Root**: `c:\Users\86139\Documents\2d-shooter-for-claudeorgemini`

---

## 1. Executive Summary

This investigation surveys the architecture, build system, runtime simulation & state synchronization, rendering pipeline, and regression testing infrastructure of the 2D Shooter codebase. The project is an authoritative-server multiplayer top-down 2D pixel shooter built in TypeScript, React 19, Tailwind CSS 4, and HTML5 Canvas 2D, with a dual client/server simulation engine (`src/game/engine.ts`).

### Core Architectural Pillars
1. **Authoritative Server + Client-Side Interpolation**: Node.js WebSocket server (`server/authoritative.mjs`) simulates match physics at a fixed 30Hz tick (`stepServer`), broadcasting compact binary/JSON snapshots (`Snapshot`) to clients. Clients perform local input prediction and render remote entities via snapshot interpolation.
2. **Fixed Virtual Pixel Viewport & Rendering Pipeline**: Internal 480×270 (or 960×540 dynamic) virtual canvas buffer (`PixelViewport` in `src/game/viewport.ts`) scaled using crisp integer nearest-neighbor blitting (`imageSmoothingEnabled = false`, letterboxed/pillarboxed).
3. **Zero-GC Y-Sorted Layered Render Queue**: 6 semantic rendering layers (`RenderQueue` in `src/game/renderQueue.ts`):
   - Layer 0: Ground (Floor tiles, terrain, decals, bloodstains)
   - Layer 1: Shadow (Ground contact drop shadows)
   - Layer 2: YSorted (3/4 perspective walls front face, props, characters, monsters, deployables, pickups)
   - Layer 3: Overhead (Wall tops, roof overhangs, canopy)
   - Layer 4: AirborneFX (Flying shell casings, lobbed grenades, sparks, tracers, smoke puffs)
   - Layer 5: ScreenUI (Floating combat damage numbers, retro radar minimap, HUD overlays)
4. **Offline Single-File Bundle & Headless Server Dual-Target Build**:
   - Single-file distribution via `vite-plugin-singlefile` and `scripts/fix-file-protocol.mjs` allowing `file://` double-click offline execution without CORS issues.
   - Node.js headless engine bundling via esbuild (`build-engine.cjs` -> `server/engine.bundle.mjs`) with web worker stubs, fully protected by headless canvas guards (`ctx === null`).
5. **4-Tier Comprehensive E2E Test Suite (401 Tests, 100% Pass Rate)**: Standalone test runner (`tests/e2e/runner.mjs`) verifying Happy-Path features, Boundary/Edge limits, Pairwise cross-feature interactions, and Real-World multi-wave workloads with 0 test failures.

---

## 2. Overall Architecture & Build System

### 2.1 File & Module Organization
```
c:\Users\86139\Documents\2d-shooter-for-claudeorgemini/
├── src/
│   ├── main.tsx                  # React DOM entry point
│   ├── App.tsx                   # Main lobby, mode routing, loadout & game screen host
│   ├── index.css                 # Tailwind CSS 4 setup + retro arcade scanlines & animations
│   ├── components/
│   │   ├── GameScreen.tsx        # Canvas game loop lifecycle, React HUD, damage recap
│   │   ├── PixelHUD.tsx          # 16-bit notched HP/shield, ammo & weapon HUD
│   │   ├── LoadoutScreen.tsx     # Character, outfit, weapon & gadget selection
│   │   ├── MultiplayerLobby.tsx  # Room list, quick match, room creation
│   │   ├── RoomScreen.tsx        # 8-player room lobby, ready check & match countdown
│   │   ├── GameSummaryScreen.tsx # The Finals-style full screen MVP match recap
│   │   └── SettingsOverlay.tsx   # Quality, sound volume, pixel density controls
│   ├── game/
│   │   ├── engine.ts             # Core simulation & state machine (shared client/server, 13k+ lines)
│   │   ├── types.ts              # TypeScript contracts (CharacterDef, GunDef, GadgetDef, MonsterDef)
│   │   ├── content.ts            # Registries for characters, outfits, weapons, gadgets, monsters
│   │   ├── viewport.ts           # PixelViewport virtual buffer & 2-stage coordinate mapping (M1)
│   │   ├── renderQueue.ts        # Zero-GC 6-layer Y-Sorted RenderQueue (M1)
│   │   ├── pixelSprites.ts       # 16-bit pixel decorations, 5-theme architectures & muzzle flashes
│   │   ├── pixelWeapons.ts       # 16-bit pixel weapon silhouettes & HUD vector models (38 weapons)
│   │   ├── pixelParticles.ts     # 2.5D shell casing physics, blood/acid splatters, shockwaves
│   │   ├── tilemap.ts            # 3/4 perspective autotiling tilemap & walls (M3)
│   │   ├── weaponMount.ts        # 360° orbital weapon mounting, horizontal flip & recoil impulse
│   │   ├── floatingText.ts       # Canvas popping damage/heal/shield floating combat text (M4)
│   │   ├── minimap.ts            # Retro pixel radar minimap with sweep animation (M4)
│   │   ├── draw.ts               # Legacy & specialized render routines (weapons, characters)
│   │   └── sound.ts              # Web Audio sound FX manager
│   ├── net/
│   │   ├── Net.ts                # Client network manager & snapshot interpolation
│   │   └── protocol.ts           # Shared WebSocket protocol (RelayIn, RelayOut, Snapshot, InputFrame)
│   └── utils/
│       ├── cn.ts                 # Tailwind class merging utility (clsx + twMerge)
│       └── device.ts             # Mobile touch detection & orientation
├── server/
│   ├── authoritative.mjs         # 30Hz authoritative Node.js WebSocket & HTTP server
│   ├── engine.bundle.mjs         # Headless esbuild bundle of engine.ts for server
│   ├── common.mjs                # Shared HTTP announcement & maintenance utilities
│   └── relay.mjs                 # Fallback relay server
├── tests/
│   ├── e2e/
│   │   ├── runner.mjs            # Standalone Node.js test runner with ANSI matrix reporter
│   │   ├── harness.mjs           # Opaque-box test assertion & tier execution engine
│   │   ├── tier1_features.test.mjs    # 170 happy-path isolation tests (F01–F34)
│   │   ├── tier2_boundaries.test.mjs  # 170 boundary, limit & invariant tests (F01–F34)
│   │   ├── tier3_combinations.test.mjs# 42 pairwise cross-feature interaction tests
│   │   └── tier4_workloads.test.mjs   # 19 full-match workload & endurance tests
│   ├── adversarial_m1_viewport.mjs
│   ├── adversarial_m1_review.mjs
│   └── stress_m1_renderqueue_headless.mjs
├── scripts/
│   ├── build-engine.cjs          # esbuild script generating server/engine.bundle.mjs
│   ├── fix-file-protocol.mjs     # Post-build script converting ES module script to classic script
│   ├── smoke-server.mjs          # Fast server simulation smoke verification
│   ├── smoke-ws.mjs              # WebSocket network loopback test
│   └── stress-e2e-challenger.mjs # Multi-run 18,000-tick endurance runner
└── data/
    └── guns.json                 # 38 weapons raw JSON metadata
```

### 2.2 Package Dependencies & Build Pipeline
- **Runtime Dependencies**:
  - `react` / `react-dom` (`^19.2.6`): Declarative UI menus, lobby, HUD overlays.
  - `clsx` (`2.1.1`) & `tailwind-merge` (`3.4.0`): Dynamic class combining.
  - `ws` (`^8.18.0`): WebSocket server in Node.js.
- **Dev Dependencies & Tooling**:
  - `vite` (`7.3.2`) + `@vitejs/plugin-react` (`5.1.1`) + `@tailwindcss/vite` (`4.1.17`): Frontend bundler.
  - `vite-plugin-singlefile` (`2.3.0`): Single-file HTML inlining.
  - `typescript` (`^5.9.3`): Static typing.
  - `esbuild` (`^0.24.0` via dev tools): Fast bundling of headless `engine.ts` into `server/engine.bundle.mjs`.

### 2.3 Build Scripts & Single-File Compatibility Architecture
| Command | Action | Key Characteristics |
|---|---|---|
| `npm run build` | `vite build && node scripts/fix-file-protocol.mjs && npm run build:engine` | Generates `dist/index.html` (single-file bundle) and `server/engine.bundle.mjs`. |
| `npm run build:engine` | `node build-engine.cjs` | Runs esbuild with `stub-worker` plugin to package `src/game/engine.ts` into `server/engine.bundle.mjs` for Node.js server. |
| `npm run dev` | `vite` | Starts local dev server with API proxy (`:8080`). |
| `npm run server` | `node server/authoritative.mjs` | Starts authoritative Node.js WebSocket server on port 8080. |
| `npm run smoke:server` | `node scripts/smoke-server.mjs` | Runs headless headless simulation step verification. |

#### Critical Build Pitfalls & Architectural Invariants (from `AgentsMUSTREADBeforeYouWork.md`):
1. **Single-File `<script>` Downgrade (`scripts/fix-file-protocol.mjs`)**:
   - `fix-file-protocol.mjs` replaces `<script type="module">` with `<script>` so the bundle can be opened directly with `file://` in browsers without CORS blocking.
   - **Never introduce `import.meta` into runtime client code** or use `base: "./"` with dynamic imports in `vite.config.ts`, as classic scripts throw a fatal `SyntaxError` on `import.meta`.
2. **Static Asset Placement (`public/` vs `src/assets/`)**:
   - Large media assets (e.g. `home-bg.png` 5.5MB) reside in `public/` and are referenced as literal strings (e.g., `"home-bg.png"`), preventing `vite-plugin-singlefile` from base64-inlining 6MB+ into the HTML.
3. **Headless Engine Stubbing (`build-engine.cjs`)**:
   - Browser Web Workers (`ai.worker.ts`) are stubbed out during the server build using an esbuild plugin (`DummyWorker`) so that `engine.bundle.mjs` can run seamlessly in headless Node.js.

---

## 3. Game Loop & State Management

### 3.1 Client vs. Server Architecture

```
+-------------------------------------------------------------------------------+
|                               NODE.JS SERVER                                  |
|                          (server/authoritative.mjs)                           |
|                                                                               |
|   +-----------------------+     30Hz Tick     +---------------------------+   |
|   |  WebSocket Clients    | --------------->  |  Authoritative Engine     |   |
|   |  (ws.pid: 1, 2, ...)  |   Input Frames    |  (src/game/engine.ts)     |   |
|   +-----------------------+                   +---------------------------+   |
|               |                                             |                 |
|               |                                             v                 |
|               |   30Hz Snapshot Broadcast          buildSnapshot()            |
+---------------|---------------------------------------------|-----------------+
                |                                             |
                v                                             v
+-------------------------------------------------------------------------------+
|                               REACT CLIENT                                    |
|                       (src/components/GameScreen.tsx)                         |
|                                                                               |
|   +-----------------------+                   +---------------------------+   |
|   |  WebSocket Manager    | ----------------> |  Client Engine Instance   |   |
|   |  (src/net/Net.ts)     |  applySnapshot()  |  (src/game/engine.ts)     |   |
|   +-----------------------+                   +---------------------------+   |
|                                                             |                 |
|                                                             v                 |
|                                                    requestAnimationFrame      |
|                                                             |                 |
|                                                             v                 |
|                                                +--------------------------+   |
|                                                |  PixelViewport (M1)      |   |
|                                                |  RenderQueue 6 Layers    |   |
|                                                |  HTML5 Canvas Blit       |   |
|                                                +--------------------------+   |
+-------------------------------------------------------------------------------+
```

### 3.2 State Synchronization & Snapshot Replication
1. **Server Tick (30Hz)**:
   - `authoritative.mjs` maintains high-resolution timer (`setInterval(..., 8ms)`) with accumulator `acc` advancing `stepServer(1/30)`.
   - `stepServer` simulates each connected combatant using their latest `takePeerFrame(pid)` input packet or default idle input, steps AI bots (`simulateBot`), and advances the world physics (`simulateWorld(1/30)`).
   - Generates compact snapshot via `buildSnapshot()` and broadcasts to room sockets.
2. **Snapshot Structure (`Snapshot` in `src/net/protocol.ts`)**:
   - `time`, `scene`, `paused`
   - `players`: Array of `SnapPlayer` (id, x, y, angle, hp, maxHp, gunIndex, outfit, shield, gadgets, ammo, electrified)
   - `enemies`: Array of `SnapEnemy`
   - `bullets`: Array of `SnapBullet` (x, y, vx, vy, color, glow, kind, owner)
   - `grenades`: Array of `SnapGrenade`
   - `deployables`: Array of `SnapDeployable` (turrets, mines, healing stations)
   - `walls`: Array of `SnapWall` (destructible wall health & building seeds)
   - `effects`: Array of `SnapEffect` (explosions, shockwaves, slashes, whip strikes)
   - `feed`: Array of `SnapFeedEvent` (damage/kill events with monotonic ID watermark)
3. **Client Interpolation & Handshake**:
   - Client calls `applySnapshot(snap)` in `src/game/engine.ts`.
   - Positions of remote peers and enemies are smoothly lerped (`ease` with factor 0.4) across frames.
   - `peerReady` flag unblocks client rendering and dismisses the "Waiting for peer synchronization" loader.

### 3.3 The `simulatePeer` & Context Switching Pitfall
In `engine.ts`, the server simulates multiple players using a single `GameEngine` instance by dynamically swapping active references:
```ts
// Context-swapped fields during peer simulation:
this.player = combatant.player;
this.guns = combatant.guns;
this.weaponStates = combatant.weaponStates;
this.gadgets = combatant.gadgets;
this.gadgetCd = combatant.gadgetCd;
```
**Critical Rule**: All mutated pointers must be safely restored to the host/primary state upon function return or exception. Failure to restore results in state bleed, `TypeError` crashes, and client-side character rubber-banding.

### 3.4 Physics, Collision & Spatial Partitioning
1. **Spatial Hash Grid**:
   - `grid = new Map<string, GridItem[]>()` partitions the world into cells of size 128×128.
   - Entities (enemies, players, deployables, props) register in grid cells each frame for $O(1)$ broad-phase collision detection.
2. **Raycasting & Line of Sight**:
   - `hasLineOfSight(x1, y1, x2, y2)` checks line-rectangle intersection against all solid walls for AI targeting and cover evaluation.
3. **Explosions & Area of Effect**:
   - `explode(x, y, radius, maxDamage, ownerId, options)` queries the spatial grid, applying radial falloff damage to combatants, destructible walls, props, and deployables.
4. **2.5D Shell Casing Physics**:
   - `PixelParticleSystem` (`src/game/pixelParticles.ts`) models shell ejection with 3D height $z$, upward impulse $v_z$, downward gravity acceleration, and ground restitution bounce before settling into background decals.

### 3.5 Input Handling & 2-Stage Coordinate Mapping
`PixelViewport` (`src/game/viewport.ts`) provides clean 2-stage coordinate transformations:
1. **Stage 1 (Screen $\leftrightarrow$ Virtual)**:
   $$\text{vx} = \frac{\text{screenX} - \text{offsetX}}{\text{scale}},\quad \text{vy} = \frac{\text{screenY} - \text{offsetY}}{\text{scale}}$$
2. **Stage 2 (Virtual $\leftrightarrow$ World)**:
   $$\text{wx} = \text{vx} + \text{round}(\text{camX}),\quad \text{wy} = \text{vy} + \text{round}(\text{camY})$$
3. **Camera Snapping**: Integer camera snapping (`snapCamera`) eliminates sub-pixel rendering jitter on pixel art sprites.

### 3.6 GameRenderer & Zero-GC Render Pipeline
- Virtual canvas buffer: 480×270 virtual resolution.
- Display blit: Crisp nearest-neighbor integer scaling with letterbox/pillarbox margins.
- `RenderQueue` flushing sequence:
  ```
  Layer 0: Ground (FIFO)
  Layer 1: Shadow (FIFO)
  Layer 2: YSorted (In-place Hybrid 3-Way QuickSort / InsertionSort on sortY = footY)
  Layer 3: Overhead (FIFO)
  Layer 4: AirborneFX (FIFO)
  --- (World transform restored) ---
  Layer 5: ScreenUI (FIFO in screen pixel coordinates)
  ```
- Headless Guard: If `ctx === null` (Node.js server mode), `RenderQueue.flush()` and `PixelViewport.beginFrame()` immediately return without touching DOM APIs.

---

## 4. Quality & Regression Assurance

### 4.1 Test Architecture Overview
The project has an automated, standalone, opaque-box E2E test runner located in `tests/e2e/runner.mjs`.

```
========================================================================
 🎮 FIRING STICKERS: 16/32-BIT PIXEL DUNGEON SHOOTER — E2E TEST RUNNER 🎮
========================================================================
TIER     | NAME                                       |  TOTAL |   PASS |   FAIL |       TIME
---------+--------------------------------------------+--------+--------+--------+-----------
Tier 1   | Tier 1: Feature Coverage (Happy Path Is... |    170 |    170 |      0 |     19.1ms
Tier 2   | Tier 2: Boundary & Corner Cases (Edge I... |    170 |    170 |      0 |     54.4ms
Tier 3   | Tier 3: Pairwise Cross-Feature Interact... |     42 |     42 |      0 |     35.0ms
Tier 4   | Tier 4: Real-World Match Workload Scena... |     19 |     19 |      0 |   7036.1ms
---------+--------------------------------------------+--------+--------+--------+-----------
TOTAL    | All Executed Test Suites                   |    401 |    401 |      0 |   7168.7ms
========================================================================
 ✔ ALL TESTS PASSED SUCCESSFULLY! (401/401 passed in 7168.7ms)
```

### 4.2 Test Tier Breakdown
1. **Tier 1: Feature Coverage (170 tests)**:
   - 5 isolated happy-path tests for each of the 34 core features (F01–F34).
   - Covers viewport scaling, coordinate transforms, render queue layering, sprite generators, weapon mounting, recoil decay, particle pooling, autotiling, destructible props, HUD gauges, game modes, authoritative sync, and bot pathfinding.
2. **Tier 2: Boundary & Invariant Cases (170 tests)**:
   - 5 boundary limit and edge tests per feature (F01–F34).
   - Tests extreme aspect ratios, negative/zero screen dimensions, 0/max ammo, 360° flip angle thresholds, extreme recoil impulses, high-density particle capacity overflows, and zero HP transitions.
3. **Tier 3: Pairwise Cross-Feature Combinations (42 tests)**:
   - Evaluates simultaneous cross-system interactions (e.g. Weapon swap during dash into wall collision; Airdrop parachute landing into poison cloud with turret targeting; Y-sort queue with 8 overlapping players + deployables).
4. **Tier 4: Real-World Match Workloads (19 tests)**:
   - Full-match workload simulations:
     - Biohazard PvE Waves 1–10 full survival simulation.
     - 8-Player Deathmatch with AI bot filling and 24-kill score quota.
     - Team Deathmatch 4v4 base assault.
     - Client disconnection and 15-second grace window reconnection under fire.
     - 18,000-Tick Full Match Endurance Stress Run.

### 4.3 Test & Verification Commands
```powershell
# 1. Run Complete E2E Suite (401 tests)
node tests/e2e/runner.mjs

# 2. Run Specific Tiers
node tests/e2e/runner.mjs --tier=1
node tests/e2e/runner.mjs --tier=2
node tests/e2e/runner.mjs --tier=3,4

# 3. Run Multi-Run Stress & Endurance Challenger
node scripts/stress-e2e-challenger.mjs

# 4. Run Server Smoke Test
node scripts/smoke-server.mjs

# 5. Typecheck Source
node node_modules/typescript/bin/tsc --noEmit

# 6. Production Build
node node_modules/vite/bin/vite.js build && node scripts/fix-file-protocol.mjs && node build-engine.cjs
```

### 4.4 Invariants & Guidelines for Future Agents
1. **Damage Score Floating Accumulator (`awardDamageScore`)**:
   - Damage score points must be accumulated in a float accumulator (`scoreAcc`) before taking `Math.floor`. Never do per-frame `Math.round(hpDiff)`, as low-damage continuous weapons (flamethrowers, poison, whips) lose all points due to zero-rounding.
2. **Base HP Invariant in Non-Base Modes**:
   - In Deathmatch and Biohazard modes, `this.base.hp` and `this.enemyBase.hp` must be set to `Infinity` (never `null`), preventing base-damage checks from crashing with `TypeError`.
3. **Weapon Visuals vs. Combat FX Separation**:
   - Static weapon models & HUD icons belong in `src/game/pixelWeapons.ts` and `src/game/draw.ts`.
   - Runtime visual effects (bullet trajectories, shockwaves, flame cones, poison clouds) belong in `src/game/pixelParticles.ts` and `engine.ts`.
4. **Headless Safety**:
   - Any new rendering code inside `src/game/` must guard against headless execution (`ctx === null` or `typeof document === "undefined"`).

---

## 5. Architectural Constraints & Risk Matrix

| Risk Area | Architectural Constraint | Mitigation / Enforcement |
|---|---|---|
| **Single-File File:// CORS** | Cannot use ES module `<script type="module">` or `import.meta` in bundled output | `scripts/fix-file-protocol.mjs` converts module scripts to classic scripts; static assets kept in `public/` |
| **Server Headless Crash** | DOM / Canvas API calls in `engine.ts` cause Node.js server crash | All render calls check `if (!ctx) return;` or `PixelViewport.beginFrame() === null` |
| **Server Concurrency Pollution** | Mutating shared engine state during `simulatePeer` corrupts player pointers | Strict context backup and restoration before returning from `simulatePeer` |
| **Sub-Pixel Jitter on Pixel Art** | Floating camera coordinates cause uneven pixel shimmering | `PixelViewport.snapCamera` integer rounding applied prior to world-to-screen transforms |
| **Garbage Collection Spikes** | Dynamic object instantiation in 60 FPS render loop triggers GC stutter | Zero-GC preallocated object pools in `RenderQueue`, `PixelParticleSystem`, `FloatingTextSystem`, and `weaponMount` |
| **Unreferenced / Zombie Files** | Files in `src/` not part of runtime bundle can fail `tsc` | Verify `tsc` clean compilation before merging changes |

---

## 6. Synthesis & Next Steps for Upcoming Milestones

1. **Pixel Viewport & Pipeline (M1)**: `PixelViewport` and `RenderQueue` are fully operational, tested across Tiers 1-4, and integrated into `engine.ts`.
2. **Pixel Characters & Weapons (M2)**: 38 weapons in `pixelWeapons.ts` and 2.5D particle physics in `pixelParticles.ts` ready. The upcoming milestone will focus on expanding character sprite sheets (Walk bobbing, hurt flashes, shields, cloaking refraction).
3. **Pixel Tilemap & Props (M3)**: 5-theme environments, autotiling, and destructible props implemented in `tilemap.ts` and `pixelSprites.ts`.
4. **HUD & Dynamic Lighting (M4)**: 16-bit notched HP bar and radar minimap in place; dynamic lantern lighting (`destination-out` ambient masking layer) ready for full theme tuning.
