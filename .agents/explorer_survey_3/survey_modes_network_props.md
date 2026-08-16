# FIRING STICKERS Refactor Survey Report: Modes, Network Sync, Map/Props & HUD/UI

**Date**: 2026-08-15  
**Author**: Explorer 3 (Survey Phase)  
**Target Architecture**: 16/32-Bit Pixel Dungeon Shooter (Enter the Gungeon / Soul Knight aesthetic)

---

## 1. Executive Summary

This survey analyzes four critical subsystems of the FIRING STICKERS codebase to prepare for the 16/32-bit pixel dungeon shooter refactor:
1. **Map & Tile System (R3)**: Arena layouts, obstacles, collision boundaries, destructible props, airdrops, and cashout vault.
2. **HUD & UI System (R4)**: Current modern glassmorphism UI vs. requirements for a retro pixel arcade HUD, pixel minimap, floating combat text, and retro typography.
3. **Game Modes & Network Synchronization (R5)**: Biohazard (zombie survival), Deathmatch, Team Deathmatch, Co-op/Defense, authoritative WebSocket server architecture, snapshot replication, and BOT AI behavior/pathfinding.
4. **Test Suite & Build Infrastructure**: Existing build tools, esbuild server bundler, and automated regression/stress tests.

---

## 2. Map & Tile System (Current State & R3 Requirements)

### 2.1 Arena Architecture & Coordinate System
- **File**: `src/game/engine.ts` (lines 863, 1680, 2215, 2266-2620), `src/game/runtimeConfig.ts` (lines 45-70)
- **World Dimensions**: Default `worldW = 6000`, `worldH = 3000` (configurable via `RUNTIME.worldW/worldH` or scaled for Deathmatch).
- **Coordinate Space**: Continuous 2D world coordinates `(x, y)`.
- **Air Walls (Boundaries)**: `src/game/engine.ts:2415-2432` generates 4 thick boundary bounding boxes (`w.invisible = true`) outside `[0, worldW] x [0, worldH]` to prevent entities/projectiles from escaping the arena.

### 2.2 Current Obstacles & Wall Types
In `src/game/engine.ts:717-730` and `2294-2334`:
| Type | Structure | Dimensions | HP / Durability | Destructible | Current Rendering (`Renderer.ts:10850-10930`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Pillar** | Indestructible column | 40 x 40 px | `Infinity` | No | Metallic pillar or stone obelisk with rivets |
| **Cover Wall** | Destructible barrier | 60-120 x 40 px | 150 HP | Yes | Wooden crate / cross-brace plank styling |
| **Building** | Large defensive tower slab | 80-240 x 80-240 px | 420-1000 HP | Yes | Multi-tile concrete/steel tower block with seed |
| **Glue Wall** | Slowing barrier | Custom | N/A | No (Slowing) | Translucent cyan cyber barrier with floating bubbles |
| **Boundary** | Invisible air wall | Boundary width | `Infinity` | No | Not rendered |

### 2.3 Collision Detection Mechanics
- **Circle-to-AABB (Player/Monster to Wall)**: `src/game/engine.ts:5048-5065` and `ai.worker.ts:16-29`
  Checks if `(x, y)` circle overlaps `[w.x - r, w.x + w.w + r] x [w.y - r, w.y + w.h + r]`. Slips along obstacle tangent vectors when colliding.
- **Ray-to-AABB (Bullets to Wall)**: `src/game/engine.ts:5260-5290`
  Ray casting with AABB intersection. Triggers projectile impact, bounce (for ion/bouncy projectiles), or penetration (if `wallPierceChance > 0`).
- **Wall Destruction & Particle Scattering**:
  `src/game/engine.ts:9408-9445` (`damageWall`, `breakWall`):
  When damaged, spawns wood/debris particles (`spawnParticles(cx, cy, color, count, speed, life)`). On destruction, removes wall from `this.walls`, sets `wallsDirty = true` to trigger snapshot synchronization, and spawns explosion shockwaves and debris effects.

### 2.4 Gap Analysis & R3 Requirements for Pixel Dungeon Refactor
1. **3/4 Perspective Pixel Tilemap & Autotiling**:
   - Current: Procedural vector rectangles and cached background canvas grids (`Renderer.ts:371-410`).
   - R3 Requirement: 3/4 perspective tile engine with discrete tile sizes (e.g. 16x16 or 32x32 px). Walls require a distinct **Top Face** (walkable depth / overhead perspective) and **Front Face** (vertical height wall face with shadows). Autotiling algorithm (16-bit Bitmasking / 47-tile Wang autotiler) to seamlessly connect dungeon walls, corners, inner corners, and floor transitions.
2. **Y-Sort Depth Occlusion**:
   - In 3/4 top-down perspective, entities at `y1 > y2` must render in front of `y2`. The base of walls/props must occlude entities behind them and be occluded by entities in front.
3. **Interactive & Destructible Props Overhaul**:
   - Transform flat cover boxes into animated 16-bit pixel dungeon props: breakable wooden barrels, dungeon crates, reinforced iron treasure chests, stone urns, explosive toxic barrels.
   - Upon destruction: Trigger pixel debris physics ejection (chunk particles bouncing with gravity and friction).
4. **Dynamic Cashout Vault & Airdrop Crates**:
   - **Airdrop Crates**: Falling pixel supply crate with swaying parachute, landing smoke puff, beacon light blinking at 2Hz, and loot burst upon opening.
   - **Cashout Vault**: Animated dungeon safe/chest with dynamic pulsing magical/electronic glow, extraction progress circle, and golden coin eruption.

---

## 3. HUD & UI System (Current State & R4 Requirements)

### 3.1 Current HUD Structure (`src/components/GameScreen.tsx`)
The current UI is implemented using React 19 + Tailwind CSS 4 overlaying the Canvas viewport:
- **Health Bar & Avatar** (`GameScreen.tsx:613-664`): Bottom-left panel with avatar letter, gradient HP bar (`linear-gradient(90deg, #4ade80...)`), numerical HP (`hp/maxHp`), and active status effect badges.
- **Weapon Status & Secondary Meters** (`GameScreen.tsx:1056-1150`): Dynamic renderers for Bow Charge (`bowChargePct`), Shield HP (`shieldHp/shieldMaxHp`), Melee combo hint, Beam heat meter (`heat/overheated`).
- **Skill & Weapon Slots** (`GameScreen.tsx:667-752`): Bottom-right panel with 3 weapon slot cards, skill cooldown circle/overlay, dash charge pips (1-3 cyan dots), and shortcut hints (Q, E, 1-3).
- **Gadget Bar** (`GameScreen.tsx:575-610`): Right-edge vertical stack of 3 gadget deployable buttons with cooldown sweeps and deployed instance counters.
- **Damage Log & Respawn Feed** (`GameScreen.tsx:848-950`): Right-side animated damage sequence showing incoming/outgoing damage breakdown, killer attribution, and bottom respawn countdown.
- **Combat Score Popups & Kill Feed** (`GameScreen.tsx:954-1015`): Battlefield-style pop-in score feed (+100 击败, +25 助攻) and top-right kill notification feed.
- **Settings & Pause Overlay** (`SettingsOverlay.tsx`): Quality settings, volume sliders, bot AI strength selector (8Hz - 60Hz), fullscreen toggle.
- **Post-Game Summary** (`GameSummaryScreen.tsx`): Victory/Defeat screen with match statistics (kills, damage dealt, score, gold, time survived).

### 3.2 Current Floating Combat Text
- Located in `src/game/engine.ts:409-415` (`ScorePopup` interface) and `4758-4760`.
- Currently only deployed for healing beam numbers; normal projectile damage numbers are aggregated into the React HTML score feed instead of rendering on the in-game canvas above hit targets.

### 3.3 Gap Analysis & R4 Requirements for Pixel Arcade HUD
1. **Retro Pixel Arcade Aesthetic**:
   - Replace smooth modern web borders with chunky 2px/3px pixel-art borders, dark outlines, and high-contrast retro arcade palettes (amber gold, neon cyan, crimson red, emerald green, deep purple).
   - Integrate pixel typography (e.g. `Press Start 2P`, `Fusion Pixel`, or high-resolution pixel font rendering with crisp integer pixel metrics).
2. **Pixel Health & Energy Bars**:
   - Distinct pixel-notched segmented health gauges (reminiscent of Enter the Gungeon / Mega Man / Castlevania).
   - Distinct pixel mana/energy/shield bars with flashing warning indicators on low health (<25%).
3. **Retro Weapon & Ammo Display**:
   - 16-bit pixel weapon silhouette frames with animated ammunition pips / pixel bullet icons instead of plain text numbers.
4. **In-Game Pixel Minimap / Radar**:
   - Top-corner 16-bit pixel minimap showing arena bounds, player dot, teammate dots (blue/green), enemy/monster blips (red), vault/airdrop beacon markers, and destructible cover outlines.
5. **Canvas-Rendered Floating Combat Text**:
   - Direct canvas-rendered retro pixel damage numbers popping and arching upward from hit entities:
     - Normal damage: Crisp white/yellow pixel numbers with black outline.
     - Critical hit: Enlarged bold red/orange pixel numbers with screen shake.
     - Healing: Emerald green `+HP` floaters.
     - Shield absorption: Sky blue `BLOCKED` floaters.

---

## 4. Game Modes & Network Synchronization (Current State & R5 Requirements)

### 4.1 Game Modes Overview
`src/game/engine.ts:142, 968, 1677-1768` supports 4 distinct gameplay modes:

| Game Mode | Mechanics | Victory / Defeat Conditions | Spawning & Entities |
| :--- | :--- | :--- | :--- |
| **`biohazard`** (生化危机) | Wave-based PvE zombie survival | Survive endless waves or complete target wave; Defeat on player death | 9 monster types (`walker`, `runner`, `brute`, `spitter`, `abomination`, `crawler`, `bloater`, `screamer`, `spore`); gold & score pickups; no bases |
| **`deathmatch`** (个人竞技) | Free-For-All 4-10 combatants (humans + bots) | First player/bot to reach target kills (e.g. 20-30 kills) wins | Dynamic distributed respawn points across arena avoiding walls; respawn timers; individual scores |
| **`team_deathmatch`** (团队竞技) | Red Team vs Blue Team | First team to reach target kill quota | Team spawn balancing; friendly-fire prevention; teammate healing support |
| **`defense` / Co-op** (基地保卫) | Player Base vs Enemy Base | Destroy enemy base (win); Player base destroyed (defeat) | Waves of enemies attack player base; automated defenses; host + guest co-op |

### 4.2 Multiplayer Architecture & Authoritative Protocol
The multiplayer system uses an authoritative server architecture with client snapshot interpolation:

```
+-------------------------------------------------------------------------------+
|                       Authoritative Server (Node.js)                         |
|   server/authoritative.mjs (30Hz TICK_HZ, engine.bundle.mjs headless)         |
|   - Manages 8-player rooms, matchmaking queues, ready checks                  |
|   - Simulates GameEngine headless (physics, weapons, bots, collisions)        |
|   - Ingests InputFrame (60Hz/render-rate) from clients                        |
|   - Broadcasts authoritative 30Hz Snapshot to all room clients                |
|   - 15s Reconnection Grace Window (peerGone -> rejoin -> peerBack)           |
+-------------------------------------------------------------------------------+
                                      ▲ │
                    InputFrame (60Hz) │ │ Snapshot (30Hz)
                    { keys, mx, my,   │ │ { time, players, enemies,
                      firing, gunIndex,│ │   bullets, walls, effects,
                      skill, reload } │ │   feed, scores, gameOver }
                                      │ ▼
+-------------------------------------------------------------------------------+
|                             Client (Browser / Net.ts)                         |
|   src/net/Net.ts & src/game/engine.ts (Client-side Renderer & Net Mode)        |
|   - Sends live InputFrame each frame                                          |
|   - Ingests Snapshot: interpolates player positions, mirrors bullets/walls    |
|   - Local visual effects & particle rendering for responsive feel             |
+-------------------------------------------------------------------------------+
```

### 4.3 Bot AI Architecture & Pathfinding
- **Source**: `src/game/engine.ts:7621-7750` (`botThink`, `simulateBot`) and `src/game/ai.worker.ts`
- **Pathfinding**:
  - Direct Line-of-Sight (LOS) check via fast ray-AABB test (`botLOS`).
  - If blocked by walls, dispatches A* search over 60px navigation grid (`findBotPath` in `ai.worker.ts` or synchronous server fallback).
- **Combat Decision Tree**:
  1. Target selection: Scans nearest living enemy player/bot (or monster in Biohazard mode); ignores cloaked players.
  2. Weapon selection: Computes effective range (`gunEffRange`), DPS, and proximity score (switches to melee/shotgun within 120px; switches to sniper/rifle at distance).
  3. Aiming: Calculates target lead aiming based on projectile velocity (`lead = dist / bulletSpeed`).
  4. Movement: Strafe around targets, advance with melee, retreat when reloading or low health, navigate to injured teammates to deploy healing stations.
  5. Bot Strength Control: Regulated by `botAiHz` (8Hz, 16Hz, 30Hz, 60Hz), controlling decision tick frequency independent of frame rate.

### 4.4 Zero Breaking Regression Plan (R5)
- All network message types (`RelayIn`, `RelayOut`, `InputFrame`, `Snapshot`, `SnapPlayer`, `SnapWall`, `SnapFeedEvent`) in `src/net/protocol.ts` must remain 100% backward-compatible.
- `GameEngine` headless simulation in `server/engine.bundle.mjs` must continue to step identically without Canvas or DOM dependencies.
- All weapon classes (ranged, melee, beam, flamethrower, bow, shield, throwables, deployables) and bot behaviors must remain identical in physics and combat logic while visuals are upgraded.

---

## 5. Existing Test Suite & Build Verification

### 5.1 Build System
- **Client Build**: `npm run build` -> `vite build && node scripts/fix-file-protocol.mjs && npm run build:engine`
- **Engine Bundle**: `npm run build:engine` -> `node build-engine.cjs` (uses `esbuild` to compile `src/game/engine.ts` into ESM bundle for Node.js server with Web Worker stubbing).
- **TypeScript**: TypeScript 5.9.3, zero type errors.

### 5.2 Test Scripts Catalog & Verification Results
We independently executed the existing test scripts to establish our verified baseline:

| Test Script | Purpose | Execution Command | Result |
| :--- | :--- | :--- | :--- |
| `npm run smoke:server` | Headless engine simulation & player movement | `cmd.exe /c "npm run smoke:server"` | **PASS** (exited 0) |
| `test-multiplayer-rooms.mjs` | 8-player room creation, join, ready, bot filling | `cmd.exe /c "node scripts/test-multiplayer-rooms.mjs"` | **PASS** (exited 0) |
| `test-multiplayer-full-refactor.mjs` | Multi-client weapon switch, reload, snapshot test | `cmd.exe /c "node scripts/test-multiplayer-full-refactor.mjs"` | **PASS** (exited 0) |
| `test-damage-feed.mjs` | Authoritative damage attribution & score events | `cmd.exe /c "node scripts/test-damage-feed.mjs"` | **PASS** (exited 0) |
| `test-3player.mjs` | 3 humans + 5 bots dynamic slot fill test | `cmd.exe /c "node scripts/test-3player.mjs"` | **PASS** (exited 0) |
| `test-freeze.mjs` | 2000-frame simulation freeze / memory leak test | `cmd.exe /c "node scripts/test-freeze.mjs"` | **PASS** (exited 0) |
| `test-kill-bot-crash.mjs` | 5000-frame combat stress test with all weapons | `cmd.exe /c "node scripts/test-kill-bot-crash.mjs"` | **PASS** (exited 0) |
| `bench-sim.mjs` | Server simulation throughput benchmark | `cmd.exe /c "node scripts/bench-sim.mjs"` | **PASS** (32,243 Hz throughput) |

---

## 6. Synthesis & Key Architecture Recommendations

```
+---------------------------------------------------------------------------------------------------+
|                                 16/32-BIT PIXEL DUNGEON REFACTOR ARCHITECTURE                     |
+---------------------------------------------------------------------------------------------------+
|  [R1: Viewport & Render Pipeline]                                                                 |
|   Fixed internal pixel canvas (e.g. 480x270 / 640x360), integer nearest-neighbor upscaling,       |
|   Y-Sort depth rendering layer queue (Floors -> Decals -> Props/Entities [Y-Sorted] -> Ceiling/FX)  |
+---------------------------------------------------------------------------------------------------+
|  [R2: Sprite & Character Animation]      |  [R3: Pixel Tilemap & Props]                           |
|   PNG sprite atlas / procedural sheets,   |   3/4 autotiling dungeon walls (Top face + Front face),|
|   Idle/Run/Hurt/Death 3/4 perspective,   |   Breakable crates/barrels with bouncing pixel debris, |
|   360 deg weapon pivot & recoil shake,    |   Glowing Cashout Vault & parachuting Airdrop crates   |
|   Ejected shell casing & muzzle particles|                                                        |
+------------------------------------------+--------------------------------------------------------+
|  [R4: Retro Pixel Arcade HUD & UI]                                                                |
|   16-bit notched HP/shield bars, pixel bullet ammo counter, canvas floating combat damage numbers, |
|   top-corner pixel radar minimap, retro arcade typography and victory/defeat screens               |
+---------------------------------------------------------------------------------------------------+
|  [R5: Game Modes & Authoritative Sync - ZERO REGRESSIONS]                                         |
|   Biohazard (9 zombie types), Deathmatch & Team Deathmatch (4-10 players/bots), Base Defense Co-op|
|   30Hz Authoritative WebSocket server (`server/authoritative.mjs`), 15s reconnect grace period,    |
|   A* bot navigation & lead-aiming, 100% protocol and build-pipeline compatibility                   |
+---------------------------------------------------------------------------------------------------+
```

---

## 7. Next Steps for Implementation Team
1. **Tilemap & Props Engine**: Implement 3/4 autotiling algorithm and breakable prop entity definitions with pixel particle debris.
2. **HUD & Minimap Module**: Build retro pixel HUD components, canvas-based floating combat text system, and top-corner minimap renderer.
3. **Continuous Verification**: Keep `npm run build`, `npm run smoke:server`, and all `scripts/test-*.mjs` green at every milestone step.
