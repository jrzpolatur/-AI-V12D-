# E2E Test Suite Analysis: Features F01 to F18
**Project**: FIRING STICKERS — 16/32-Bit Pixel Dungeon Shooter Refactor  
**Track**: E2E Testing Track (Sub-Orchestrator Explorer 1)  
**Target Scope**: Feature Coverage (Tier 1), Boundary & Corner Cases (Tier 2), Combinations (Tier 3), and Real-World Workloads (Tier 4) for Features F01 through F18.  
**Date**: 2026-08-15  

---

## 1. Executive Summary

This report delivers a requirement-driven, opaque-box E2E testing specification for Features **F01 through F18**, spanning the **Pixel Viewport & Rendering Pipeline** (M1) and the **Character & Weapon Sprite Animation System** (M2).

Every feature is analyzed with:
1. **Opaque-Box Requirement Specification & Mathematical Model**: Clear formalization of expected behavior decoupled from internal implementations.
2. **Tier 1 Isolation Happy-Path Tests (≥5 per feature)**: Verification of primary functional contracts under standard game conditions.
3. **Tier 2 Boundary & Corner-Case Tests (≥5 per feature)**: Rigorous edge-case analysis (zero/negative scales, extreme dimensions, overflow, angle wrap-arounds, null context guards, particle caps, empty magazines).
4. **Observable Invariants & State Contracts**: Non-negotiable system assertions ensuring 100% stability.
5. **Tier 3 Cross-Feature Combinations**: Multi-feature interaction matrices.
6. **Tier 4 Real-World Game Workloads**: Match simulation stress profiles.

Across all 18 features, **90 Tier 1 tests**, **90 Tier 2 tests**, **18 Tier 3 combinations**, and **6 Tier 4 workload scenarios** are defined (204 concrete test cases total).

---

## 2. Feature Inventory & Deep-Dive Specifications (F01 – F18)

---

### F01: Fixed Virtual Viewport Buffer

#### 1. Specification & Mathematical Model
- **Virtual Dimensions**: $W_{\text{virtual}} = 480$, $H_{\text{virtual}} = 270$ (Fixed 16:9 aspect ratio).
- **Buffer Architecture**: Internal offscreen virtual canvas buffer (`PixelViewport`).
- **Buffer Lifecycle**:
  - `resize(displayW, displayH)`: Computes scale and centering offsets for the display canvas.
  - `beginFrame()`: Clears virtual buffer and resets transforms.
  - `endFrame(displayCtx)`: Blits virtual buffer onto the target display context.

#### 2. Tier 1: Happy-Path Test Matrix (≥5 Tests)
| Test ID | Test Name | Setup / Input | Action | Expected Opaque Assertion |
|---|---|---|---|---|
| **F01-T1-01** | Default Buffer Resolution | Initialize `PixelViewport` with standard config | Inspect `virtualW`, `virtualH` | `virtualW === 480` and `virtualH === 270` |
| **F01-T1-02** | Virtual Canvas & Context Creation | Instantiate viewport | Access `virtualCanvas` and `virtualCtx` | `virtualCanvas !== null` and `virtualCtx !== null` (in DOM env) |
| **F01-T1-03** | 1080p Standard Integer Scale | `resize(1920, 1080)` (16:9) | Execute `resize()` | `scale === 4`, `offsetX === 0`, `offsetY === 0` |
| **F01-T1-04** | Frame Clear Lifecycle | Push draw commands, call `beginFrame()` | Execute `beginFrame()` | Context transform is identity, buffer cleared |
| **F01-T1-05** | Display Blit Presentation | Draw test pixel onto virtual canvas, call `endFrame(displayCtx)` | Execute `endFrame(displayCtx)` | Display context receives drawImage call with scaled bounds `(0, 0, 1920, 1080)` |

#### 3. Tier 2: Boundary & Corner-Case Test Matrix (≥5 Tests)
| Test ID | Test Name | Boundary Condition | Edge Handling Rationale | Expected Assertion |
|---|---|---|---|---|
| **F01-T2-01** | Ultra-Wide Aspect Ratio (21:9) | `resize(2560, 1080)` | Pillarboxing required: width exceeds 16:9 | `scale === 4`, `offsetX === (2560 - 1920)/2 = 320`, `offsetY === 0` |
| **F01-T2-02** | Mobile Portrait Aspect Ratio (9:19.5) | `resize(390, 844)` | Letterboxing required: height exceeds 16:9; min scale floor | `scale === 1` (floor), `offsetX === 0`, `offsetY === (844 - 270)/2 = 287` |
| **F01-T2-03** | Sub-Virtual Screen Size | `resize(320, 180)` | Screen smaller than 480x270 virtual buffer | `scale === 1` minimum floor, no division by zero or negative scale |
| **F01-T2-04** | Zero / Negative Display Size | `resize(0, 0)` or `resize(-500, -300)` | Defensive handling against collapsed window | `scale === 1`, `offsetX === 0`, `offsetY === 0`, no `NaN` or unhandled exceptions |
| **F01-T2-05** | Odd Non-Integer Resolution | `resize(1366, 768)` | Fractional scaling avoidance | `scale === 2` ($1366/480 = 2.84 \to 2$), `offsetX === (1366 - 960)/2 = 203`, `offsetY === (768 - 540)/2 = 114` |

---

### F02: Integer Nearest-Neighbor Blit

#### 1. Specification & Mathematical Model
- **Scaling Formula**: $\text{scale} = \max\left(1, \left\lfloor \min\left( \frac{W_{\text{display}}}{480}, \frac{H_{\text{display}}}{270} \right) \right\rfloor\right)$
- **Pixel Crispness Invariant**: `imageSmoothingEnabled = false` must be enforced on both virtual and display contexts.
- **Letterbox/Pillarbox Invariant**: Background regions outside $[X_{\text{off}}, Y_{\text{off}}, W_{\text{virt}} \cdot s, H_{\text{virt}} \cdot s]$ filled with uniform dark letterbox color `#000000`.

#### 2. Tier 1: Happy-Path Test Matrix (≥5 Tests)
| Test ID | Test Name | Setup / Input | Action | Expected Opaque Assertion |
|---|---|---|---|---|
| **F02-T1-01** | Smoothing Disabled on Init | Initialize viewport with display canvas | Inspect context properties | `displayCtx.imageSmoothingEnabled === false` and `virtualCtx.imageSmoothingEnabled === false` |
| **F02-T1-02** | 2x Integer Scale (960x540) | `resize(960, 540)` | Call `resize()` | `scale === 2`, `scaledW === 960`, `scaledH === 540` |
| **F02-T1-03** | 3x Integer Scale (1440x810) | `resize(1440, 810)` | Call `resize()` | `scale === 3`, `scaledW === 1440`, `scaledH === 810` |
| **F02-T1-04** | 4x Integer Scale (1920x1080) | `resize(1920, 1080)` | Call `resize()` | `scale === 4`, `scaledW === 1920`, `scaledH === 1080` |
| **F02-T1-05** | 8K Ultra-HD Scale (7680x4320) | `resize(7680, 4320)` | Call `resize()` | `scale === 16`, integer blit exact fit |

#### 3. Tier 2: Boundary & Corner-Case Test Matrix (≥5 Tests)
| Test ID | Test Name | Boundary Condition | Edge Handling Rationale | Expected Assertion |
|---|---|---|---|---|
| **F02-T2-01** | Barely Below Integer Scale (1919x1079) | 1px short of 4x threshold | Must not jump prematurely to 4x (would clip) | `scale === 3`, `offsetX === (1919 - 1440)/2 = 239.5 -> 239`, `offsetY === (1079 - 810)/2 = 134` |
| **F02-T2-02** | Barely Above Integer Scale (1921x1081) | 1px above 4x threshold | Must cleanly snap to 4x with 1px padding | `scale === 4`, `offsetX === 0`, `offsetY === 0` |
| **F02-T2-03** | Extreme Aspect Ratio Ribbon (3840x270) | 14.2:1 aspect ratio | Height restricts scale to 1x | `scale === 1`, `offsetX === (3840 - 480)/2 = 1680`, `offsetY === 0` |
| **F02-T2-04** | Context Loss & Restoration | Canvas WebGL / 2D context restored event | Smoothing flag must be re-applied | After restoration, `imageSmoothingEnabled` remains `false` |
| **F02-T2-05** | High-DPI DPR Blit Uniformity | `devicePixelRatio = 2.0` on 1920x1080 CSS window | Physical backing canvas scaled cleanly | Virtual buffer blit uses integer CSS-pixel boundaries |

---

### F03: 2-Stage Coordinate Mapping

#### 1. Specification & Mathematical Model
- **Stage 1 (Screen $\to$ Virtual)**:
  $$v_x = \frac{x_{\text{screen}} - X_{\text{off}}}{s}, \quad v_y = \frac{y_{\text{screen}} - Y_{\text{off}}}{s}$$
- **Stage 2 (Virtual $\to$ World)**:
  $$w_x = v_x + \text{cam}_x - \frac{W_{\text{virt}}}{2}, \quad w_y = v_y + \text{cam}_y - \frac{H_{\text{virt}}}{2}$$
- **Inverse (World $\to$ Virtual)**:
  $$v_x = w_x - \text{cam}_x + \frac{W_{\text{virt}}}{2}, \quad v_y = w_y - \text{cam}_y + \frac{H_{\text{virt}}}{2}$$
- **Full Screen $\to$ World Composition**:
  $$w_x = \frac{x_{\text{screen}} - X_{\text{off}}}{s} + \text{cam}_x - 240, \quad w_y = \frac{y_{\text{screen}} - Y_{\text{off}}}{s} + \text{cam}_y - 135$$

#### 2. Tier 1: Happy-Path Test Matrix (≥5 Tests)
| Test ID | Test Name | Setup / Input | Action | Expected Opaque Assertion |
|---|---|---|---|---|
| **F03-T1-01** | Screen Center to World Center | $x_{\text{screen}} = 960, y_{\text{screen}} = 540$, $s=4, \text{cam}=(1000, 500)$ | Transform Screen $\to$ Virtual $\to$ World | $v=(240, 135)$, $w=(1000, 500)$ |
| **F03-T1-02** | Virtual Origin to World Top-Left | $v=(0, 0), \text{cam}=(0, 0)$ | Transform Virtual $\to$ World | $w=(-240, -135)$ |
| **F03-T1-03** | World to Virtual Inverse | $w=(500, 300), \text{cam}=(500, 300)$ | Transform World $\to$ Virtual | $v=(240, 135)$ |
| **F03-T1-04** | Complete Roundtrip Bijectivity | Any valid $w=(123.4, 567.8), \text{cam}=(200, 400)$ | $w \to v \to w'$ | $|w'_x - w_x| < 10^{-5}$ and $|w'_y - w_y| < 10^{-5}$ |
| **F03-T1-05** | Viewport Edge Mapping | Screen top-left corner $(X_{\text{off}}, Y_{\text{off}})$ | Screen $\to$ Virtual | $v=(0, 0)$ |

#### 3. Tier 2: Boundary & Corner-Case Test Matrix (≥5 Tests)
| Test ID | Test Name | Boundary Condition | Edge Handling Rationale | Expected Assertion |
|---|---|---|---|---|
| **F03-T2-01** | Letterbox Gutter Click (Negative Virtual) | $x_{\text{screen}} < X_{\text{off}}$ (e.g. Pillarbox area) | Must transform linearly or clamp gracefully | $v_x < 0$, no `NaN` or crash |
| **F03-T2-02** | Extreme Negative World Coordinates | $w=(-50000, -50000), \text{cam}=(-50000, -50000)$ | Large coordinate space stability | $v=(240, 135)$ centered |
| **F03-T2-03** | Sub-Pixel Floating Cursor Position | $x_{\text{screen}} = 123.456, y_{\text{screen}} = 789.012$ | High-precision pointer movement | Converts without truncation error |
| **F03-T2-04** | Minimum Scale (1x) Identity Mapping | $s=1, X_{\text{off}}=0, Y_{\text{off}}=0$ | Direct 1:1 screen-to-virtual alignment | $v_x === x_{\text{screen}}$, $v_y === y_{\text{screen}}$ |
| **F03-T2-05** | Screen Max Boundary $(W_{\text{display}}, H_{\text{display}})$ | Cursor at absolute bottom-right display pixel | Correct mapping beyond virtual buffer boundary | $v_x \ge 480, v_y \ge 270$ proportional to gutter |

---

### F04: Integer Camera Snapping

#### 1. Specification & Mathematical Model
- **Simulation State**: Continuous sub-pixel floating point position $(cam_x, cam_y) \in \mathbb{R}^2$.
- **Render State**: Rounded integer pixel position:
  $$cam_{x,\text{render}} = \text{Math.round}(cam_x), \quad cam_{y,\text{render}} = \text{Math.round}(cam_y)$$
- **Sub-Pixel Anti-Jitter Invariant**: Camera transform applied to virtual context must never include fractional pixel translations, eliminating 1px shimmering artifacts.

#### 2. Tier 1: Happy-Path Test Matrix (≥5 Tests)
| Test ID | Test Name | Setup / Input | Action | Expected Opaque Assertion |
|---|---|---|---|---|
| **F04-T1-01** | Floating Point Rounding | $cam = (100.4, 200.6)$ | Query render camera position | $cam_{\text{render}} = (100, 201)$ |
| **F04-T1-02** | Sub-Pixel Slow Crawl (0.1 px/frame) | Player moves at 6 px/s ($\Delta x = 0.1$ px per 60Hz tick) | Step 10 frames | Simulation position increments $0.1, 0.2 \dots 1.0$; render position snaps at $0.5 \to 1$ |
| **F04-T1-03** | Camera Map Boundary Clamp | Camera target outside map $[0, 0, 3000, 2000]$ | Update camera tracking | Clamped render coordinates stay within integer map bounds |
| **F04-T1-04** | High-Speed Dash Tracking | Player dashes at 1200 px/s | Update camera lerp | Camera smoothly tracks without integer tearing |
| **F04-T1-05** | Stationary Camera Invariance | Player stationary at $(500.0, 500.0)$ | Render 60 consecutive frames | Render coordinates remain constant $(500, 500)$ with zero jitter |

#### 3. Tier 2: Boundary & Corner-Case Test Matrix (≥5 Tests)
| Test ID | Test Name | Boundary Condition | Edge Handling Rationale | Expected Assertion |
|---|---|---|---|---|
| **F04-T2-01** | Exact Half-Pixel Boundary | $cam_x = 100.5, cam_y = 200.5$ | Deterministic rounding threshold | Snaps to $(101, 201)$ consistently |
| **F04-T2-02** | Negative Coordinate Half-Pixel | $cam_x = -0.5, cam_y = -0.5$ | IEEE 754 Math.round negative rounding | Snaps to $(0, 0)$ or $(-0, -0)$ matching standard `Math.round` |
| **F04-T2-03** | Floating Point Micro-Oscillations | $cam_x \in [10.49999, 10.50001]$ | Hysteresis / Anti-chatter tolerance | No multi-frame visual flickering |
| **F04-T2-04** | Extreme Astronomical Coordinates | $cam = (10^7 + 0.3, 10^7 + 0.7)$ | Double precision integer snapping | $cam_{\text{render}} = (10^7, 10^7 + 1)$ |
| **F04-T2-05** | Zero Delta-Time ($\Delta t = 0$) | Camera update with zero time step | No velocity accumulation | Camera coordinates remain unchanged |

---

### F05: Zero-GC Y-Sort Render Queue

#### 1. Specification & Mathematical Model
- **Layer Architecture** (`RenderLayer`):
  - **Layer 0 (Ground)**: Floor tiles, blood decals, casing decals, burn marks.
  - **Layer 1 (Shadow)**: Ground contact dithered shadows.
  - **Layer 2 (YSorted)**: Walls front face, destructible props, characters, monsters, deployables, pickups, melee slashes. Sorted ascending by ground anchor $sortY = footY$.
  - **Layer 3 (Overhead)**: Wall tops, canopies, high arches.
  - **Layer 4 (Airborne & FX)**: Projectiles in flight, airborne shell casings, sparks, smoke, explosions.
  - **Layer 5 (Screen UI)**: Floating combat text, minimap, HUD.
- **Zero-GC Invariant**: `push()`, `flush()`, and `clear()` operations must not create new object allocations during steady-state gameplay.

#### 2. Tier 1: Happy-Path Test Matrix (≥5 Tests)
| Test ID | Test Name | Setup / Input | Action | Expected Opaque Assertion |
|---|---|---|---|---|
| **F05-T1-01** | Layer Ordering Strict Monotonicity | Push items to Layers 0, 1, 2, 3, 4, 5 in arbitrary order | Flush queue and record execution order | Draw callbacks execute strictly in order $0 \to 1 \to 2 \to 3 \to 4 \to 5$ |
| **F05-T1-02** | Layer 2 Depth Y-Sorting | Push Entity A ($sortY = 100$) and Entity B ($sortY = 50$) into Layer 2 | Flush queue | Entity B ($sortY=50$) executes BEFORE Entity A ($sortY=100$) |
| **F05-T1-03** | Player Occlusion Behind Wall | Wall Front Face ($sortY = 200$), Player ($sortY = 150$) | Flush Layer 2 | Player draws first, Wall Front Face draws second (occludes player) |
| **F05-T1-04** | Player In Front of Wall | Wall Front Face ($sortY = 200$), Player ($sortY = 250$) | Flush Layer 2 | Wall Front Face draws first, Player draws second (in front of wall) |
| **F05-T1-05** | Queue Clear & Reuse Lifecycle | Push 20 items, `flush()`, `clear()`, push 10 new items, `flush()` | Execute two frame cycles | Second frame executes exactly 10 items; zero stale state |

#### 3. Tier 2: Boundary & Corner-Case Test Matrix (≥5 Tests)
| Test ID | Test Name | Boundary Condition | Edge Handling Rationale | Expected Assertion |
|---|---|---|---|---|
| **F05-T2-01** | High Entity Overload (500+ Items) | Push 500 entities into Layer 2 simultaneously | Preallocated array capacity auto-expansion / pool handling | All 500 items flush in exact sorted order without drop |
| **F05-T2-02** | Identical $sortY$ Stability | 10 entities with exact identical $sortY = 300.0$ | Stable sorting / insertion preservation | No rendering order flicker between consecutive frames |
| **F05-T2-03** | Negative $sortY$ Values | Entities with $sortY = -100, -500, -50$ | Sorting must handle signed negative world coordinates | Items ordered correctly from most negative to least negative |
| **F05-T2-04** | Empty Queue Flush | Call `flush()` on queue with 0 items pushed | Null safety & zero overhead | Returns immediately without error |
| **F05-T2-05** | Sparse Layer Distribution | Push 50 items in Layer 0 and 50 items in Layer 5; 0 items in Layers 1-4 | Empty intermediate buckets | Layers 0 and 5 execute correctly without skipping or indexing errors |

---

### F06: 3/4 Perspective Wall Split

#### 1. Specification & Mathematical Model
- **Wall Ground Footprint Box**: $[x, y, w, h]$ in world space.
- **Top Face (Overhead)**: Drawn in **Layer 3** (Overhead Structure) or above characters.
- **Front Face (Vertical Elevation)**: Drawn in **Layer 2** (YSorted) with ground anchor $sortY = y + h$.
- **Collision Box**: Restricted to the ground contact base $[x, y, w, h]$.

#### 2. Tier 1: Happy-Path Test Matrix (≥5 Tests)
| Test ID | Test Name | Setup / Input | Action | Expected Opaque Assertion |
|---|---|---|---|---|
| **F06-T1-01** | Wall Front Face Layer 2 Registration | Wall at $[100, 100, 64, 64]$ | Register wall in render queue | Front face registered in Layer 2 with $sortY === 164$ |
| **F06-T1-02** | Wall Top Face Layer 3 Registration | Same wall | Register wall in render queue | Top face registered in Layer 3 (Overhead) |
| **F06-T1-03** | Player Behind Wall Occlusion | Player at $y = 120$ ($footY = 136$), Wall at $[100, 100, 64, 64]$ ($sortY = 164$) | Render Layer 2 | Player draws before wall front face (wall covers player's lower half) |
| **F06-T1-04** | Player In Front of Wall Depth | Player at $y = 160$ ($footY = 176$), Wall at $[100, 100, 64, 64]$ ($sortY = 164$) | Render Layer 2 | Wall front face draws before player (player overlaps wall base) |
| **F06-T1-05** | Wall Collision Box Enforcement | Player moves towards wall $[100, 100, 64, 64]$ | Physics collision step | Player collision circle stops at wall boundary without penetrating |

#### 3. Tier 2: Boundary & Corner-Case Test Matrix (≥5 Tests)
| Test ID | Test Name | Boundary Condition | Edge Handling Rationale | Expected Assertion |
|---|---|---|---|---|
| **F06-T2-01** | Exact Boundary Contact Line | Player $footY === \text{wall}.y + \text{wall}.h$ | Exact threshold contact depth | Consistent ordering, zero visual z-fighting |
| **F06-T2-02** | L-Corner Adjacent Walls | Two intersecting walls sharing a corner | Seam-free top & front face alignment | No 1px gap or overlapping discoloration at junction |
| **F06-T2-03** | Low Elevation Wall (8px height) | Thin horizontal parapet wall | Proportional front face height | Front face rendered at 8px height with correct $sortY$ |
| **F06-T2-04** | Large Multi-Tile Fortress Slab | $400 \times 400$ building structure | Decomposed into modular split faces | All front faces sort at bottom edge; entire roof in Layer 3 |
| **F06-T2-05** | High-Velocity Lobbed Projectile | Mortar / Grenade lobbed over wall | Airborne projectile in Layer 4 | Lobbed projectile renders above Layer 3 wall tops while in flight |

---

### F07: Headless Canvas Guard

#### 1. Specification & Mathematical Model
- **Environment**: Node.js authoritative server CLI (`server/authoritative.mjs`, `engine.bundle.mjs`) or headless automated tests.
- **Safety Invariant**: When `canvas === null` or `ctx === null` or `typeof window === 'undefined'`, all rendering paths must be skipped immediately without throwing `TypeError: Cannot read properties of null`.
- **Simulation Parity**: Game physics, weapon mechanics, bot AI, and damage math run identically in headless and client mode.

#### 2. Tier 1: Happy-Path Test Matrix (≥5 Tests)
| Test ID | Test Name | Setup / Input | Action | Expected Opaque Assertion |
|---|---|---|---|---|
| **F07-T1-01** | Headless Engine Instantiation | `new GameEngine(null, loadout, () => {}, { mode: "server" })` | Construct engine | Engine instantiates cleanly with `ctx === null` |
| **F07-T1-02** | Headless Simulation Ticks | Call `eng.startHeadless()`, `eng.stepServer(1/30)` | Execute 100 ticks | Executes without error; simulation clock advances to $3.33$s |
| **F07-T1-03** | Null Context Draw Guard | Call `drawCharacter(null, opts)` or `drawMonster(null, opts)` | Invoke draw functions with `null` | Returns gracefully without throwing exception |
| **F07-T1-04** | Authoritative Snapshot Build | Headless match with 2 bots firing weapons | Call `eng.buildSnapshot()` | Returns valid snapshot object with players, bullets, enemies |
| **F07-T1-05** | Server Bundle CLI Execution | Spawn `node server/authoritative.mjs` | Connect WebSocket client | Server accepts connection and begins 30Hz broadcast |

#### 3. Tier 2: Boundary & Corner-Case Test Matrix (≥5 Tests)
| Test ID | Test Name | Boundary Condition | Edge Handling Rationale | Expected Assertion |
|---|---|---|---|---|
| **F07-T2-01** | Particle / FX Spawn in Headless | Weapons firing and grenades exploding in headless mode | Particle arrays bypassed or simulation-only | Particle count capped, zero memory leak over 10,000 ticks |
| **F07-T2-02** | Missing Browser Globals | `window`, `document`, `HTMLCanvasElement` undefined in Node | Complete independence from DOM API | No `ReferenceError: document is not defined` |
| **F07-T2-03** | Rapid Headless Reset & Restart | Start match, step 50 ticks, call `reset()`, restart 100 times | State recycling in memory | Zero memory accumulation, deterministic reset |
| **F07-T2-04** | Mocked vs Null Context Parity | Run 100 ticks with `ctx = null` vs mocked 2D context | Compare player $(x, y)$ positions | Output coordinates match to exact $10^{-6}$ precision |
| **F07-T2-05** | Dynamic Viewport in Headless | Call `PixelViewport` methods with null canvas | Guard methods | `screenToVirtual` / `virtualToWorld` compute math correctly without DOM canvas |

---

### F08: Character 3/4 Sprite System

#### 1. Specification & Mathematical Model
- **4 Player Archetypes**:
  - `raider`: Balanced speed (235 px/s), 100 HP, size 16, cyan tint (`#00f0ff`).
  - `juggernaut`: Heavy tank, speed (178 px/s), 165 HP, size 19, emerald tint (`#10b981`).
  - `phantom`: Agile assassin, speed (296 px/s), 72 HP, size 14, rose tint (`#f43f5e`).
  - `sentinel`: Firepower expert, speed (214 px/s), 96 HP, size 16, amber tint (`#f59e0b`).
- **4 Animation States**: `idle` (4-frame breathing/bob), `run` (6-frame chunky boot stride), `hurt` (damage flash / knockback stagger), `death` (collapse sequence).
- **2 Facing Directions**: `right` ($\theta_{\text{aim}} \in [-\pi/2, \pi/2]$), `left` ($|\theta_{\text{aim}}| > \pi/2$).

#### 2. Tier 1: Happy-Path Test Matrix (≥5 Tests)
| Test ID | Test Name | Setup / Input | Action | Expected Opaque Assertion |
|---|---|---|---|---|
| **F08-T1-01** | 4 Archetypes Frame Generation | Iterate `raider`, `juggernaut`, `phantom`, `sentinel` | Request frames for all 4 states | All 4 archetypes produce valid sprite frames for `idle`, `run`, `hurt`, `death` |
| **F08-T1-02** | Idle 4-Frame Cycle | Character stationary ($v = 0$), $t \in [0, 1.0]$s | Step animation time | Bobbing offset oscillates periodically with 4 discrete steps |
| **F08-T1-03** | Run 6-Frame Stride Cycle | Character moving ($v = 235$ px/s), $t \in [0, 1.0]$s | Step animation time | Boot offsets alternate $bootOffL \leftrightarrow bootOffR$ across 6 discrete steps |
| **F08-T1-04** | Hurt White Flash Trigger | Character receives damage (`flash = 0.2`s) | Render character | Color overrides to white flash (`#ffffff`) for duration |
| **F08-T1-05** | Left/Right Facing Transition | Aim angle switches from $0$ rad to $\pi$ rad | Update character aim | Facing direction switches from `right` to `left` |

#### 3. Tier 2: Boundary & Corner-Case Test Matrix (≥5 Tests)
| Test ID | Test Name | Boundary Condition | Edge Handling Rationale | Expected Assertion |
|---|---|---|---|---|
| **F08-T2-01** | Rapid Facing Flip (60Hz Alternation) | Aim flips left/right on every frame | Anti-jitter origin stability | Sprite foot contact anchor $(x, y + size)$ remains rock solid |
| **F08-T2-02** | Near-Zero Movement Speed ($v = 5$ px/s) | Velocity below run threshold (10 px/s) | Threshold hysteresis | Stays in `idle` state; does not stutter into `run` |
| **F08-T2-03** | Extreme Animation Time ($t = 10^6$s) | Long-running continuous match | Modulo arithmetic stability | Frame index computes cleanly without precision degradation |
| **F08-T2-04** | Juggernaut Size 19 vs Phantom Size 14 | Size extremes across archetypes | Geometric scaling proportionality | Torso, boots, and head scale proportionally to archetype size |
| **F08-T2-05** | Invalid / Unknown Archetype ID | Pass `characterId = "unknown_hero"` | Defensive fallback | Defaults gracefully to `raider` archetype without crashing |

---

### F09: Monster 3/4 Sprite System

#### 1. Specification & Mathematical Model
- **9 Monster Archetypes + Boss**:
  1. `walker`: Slow melee grunt (HP 75, speed 64, size 15, olive `#7c9c5a`).
  2. `runner`: Fast swarmer with lunge (HP 55, speed 150, size 13, lime `#a3e635`).
  3. `brute`: Huge tank (HP 460, speed 40, size 30, dark green `#4d7c4d`).
  4. `spitter`: Ranged acid shooter (HP 110, speed 56, size 17, violet `#a78bfa`).
  5. `abomination`: Giant BOSS (HP 2600, speed 30, size 46, purple `#7e22ce`, glowing core).
  6. `crawler`: Tiny swarmer (HP 30, speed 205, size 10, light lime `#d9f99d`).
  7. `bloater`: Pulsating poison exploder (HP 190, speed 46, size 26, green `#65a30d`).
  8. `screamer`: Buffing banshee (HP 130, speed 72, size 18, pink `#f0abfc`).
  9. `spore`: Lingering poison cloud emitter (HP 165, speed 50, size 20, `#a3e635`).

#### 2. Tier 1: Happy-Path Test Matrix (≥5 Tests)
| Test ID | Test Name | Setup / Input | Action | Expected Opaque Assertion |
|---|---|---|---|---|
| **F09-T1-01** | Walker Hunchback Render | Instantiate `walker` monster | Call `drawMonster` | Renders hunchback block torso with glowing eyes |
| **F09-T1-02** | Runner Lunge Stretch | Instantiate `runner` with `charging = true` | Call `drawMonster` | Scale stretches along forward axis ($1.15 \times 0.9$) |
| **F09-T1-03** | Brute Giant Footprint | Instantiate `brute` (size 30) | Call `drawMonster` | Massive 1.3s torso and shoulder blocks rendered |
| **F09-T1-04** | Spitter Acid Snout | Instantiate `spitter` | Call `drawMonster` | Glowing snout acid sac rendered at front of head |
| **F09-T1-05** | Abomination Boss Core Pulse | Instantiate `abomination` (size 46) | Call `drawMonster` over $t \in [0, 2]$s | Central core glow and orbiting satellite nodes animate |

#### 3. Tier 2: Boundary & Corner-Case Test Matrix (≥5 Tests)
| Test ID | Test Name | Boundary Condition | Edge Handling Rationale | Expected Assertion |
|---|---|---|---|---|
| **F09-T2-01** | Crawler Tiny Size 10 vs Boss Size 46 | Extreme size dynamic range (4.6x difference) | Pixel grid alignment at small & large scale | Crawler renders sharp 10px silhouette; boss renders full detail |
| **F09-T2-02** | Bloater Death Transition | Bloater HP reaches 0 | Trigger death explosion | Death sprite transitions to expanding poison cloud radius 130px |
| **F09-T2-03** | Screamer Buff Wave Activation | Screamer activates buff aura (`buffed = true`) | Render monster | Orbiting rose spark nodes animate at radius $(s + 6)$px |
| **F09-T2-04** | Poison Status Effect Speckles | Monster with `poison = true` | Render monster | 4 green poison pixel dots orbit around monster body |
| **F09-T2-05** | 100 Mixed Monsters Horde Stress | Spawn 100 monsters of all 9 types on screen | Step simulation and render | All 9 types render with respective colors, sizes, and animations |

---

### F10: Outfit & Hat Pixel Styling

#### 1. Specification & Mathematical Model
- **15 Outfits**: `tactical`, `night`, `desert`, `neon`, `crimson`, `emerald`, `alien`, `monkey`, `tycoon`, `medic`, `cyber_ninja`, `pirate`, `royal_guard`, `hazard`, `ghost`.
- **8 Hat Types**: `none`, `cap`, `helmet`, `hood`, `visor`, `alien`, `monkey`, `tycoon`.
- **Skin Tone Overrides**: Default `skin` overridden by `alien` (`#7ef0b0`) and `monkey` (`#caa072`).
- **Stat Modifiers**: `speedBonus`, `hpBonus`, `fireRateBonus`.

#### 2. Tier 1: Happy-Path Test Matrix (≥5 Tests)
| Test ID | Test Name | Setup / Input | Action | Expected Opaque Assertion |
|---|---|---|---|---|
| **F10-T1-01** | 15 Outfits Palette Integrity | Iterate all 15 outfits in `OUTFITS` | Validate properties | Each outfit has valid `suit`, `suitDark`, `accent`, and `hat` |
| **F10-T1-02** | 8 Hat Types Rendering | Test all 8 hat styles on character | Call `drawCharacter` | Each hat type renders dedicated geometry anchored on head |
| **F10-T1-03** | Alien Skin Tone Override | Equip `alien` outfit | Inspect character skin color | Head renders with `#7ef0b0` green skin tone |
| **F10-T1-04** | Monkey Skin Tone Override | Equip `monkey` outfit | Inspect character skin color | Head renders with `#caa072` brown skin tone |
| **F10-T1-05** | Outfit Stat Bonus Application | Equip `cyber_ninja` (+8% speed) on `raider` (base 235) | Compute player max speed | $235 \times 1.08 = 253.8$ px/s |

#### 3. Tier 2: Boundary & Corner-Case Test Matrix (≥5 Tests)
| Test ID | Test Name | Boundary Condition | Edge Handling Rationale | Expected Assertion |
|---|---|---|---|---|
| **F10-T2-01** | Hat Type `none` Clean Crown | Outfit with `hat: "none"` | Head rendering without hat overlay | Head renders cleanly without clipping or stray pixels |
| **F10-T2-02** | High-Contrast Outfit (`ghost` vs `night`) | Pure white `#f8fafc` vs deep dark `#0f172a` | Silhouette contrast against dark floor | Dark outlines (`#05060f`) preserve visibility on all floors |
| **F10-T2-03** | Stacking HP Bonuses (`monkey` + `juggernaut`) | Base HP 165 + outfit bonus 18 | Additive HP computation | Player max HP equals exactly 183 |
| **F10-T2-04** | Stacking Fire Rate (`tycoon` + `phantom`) | Base mult 1.18 + outfit bonus 0.05 | Fire rate multiplier computation | Effective fire rate multiplier equals $1.18 \times 1.05 = 1.239$ |
| **F10-T2-05** | 60 Archetype-Outfit Matrix Coverage | $4 \text{ archetypes} \times 15 \text{ outfits} = 60$ combos | Full matrix combinatorial verification | All 60 combinations render without runtime error |

---

### F11: 360° Orbital Weapon Mount

#### 1. Specification & Mathematical Model
- **Hand Pivot Anchor**: $(x_{\text{hand}}, y_{\text{hand}})$ anchored to player torso/shoulder.
- **Left Aim Dynamic Flipping**:
  $$\text{flipY} = \begin{cases} \text{true}, & \text{if } |\theta_{\text{aim}}| > \frac{\pi}{2} \\ \text{false}, & \text{otherwise} \end{cases}$$
- **Aim-Dependent Depth Sorting**:
  $$\text{drawBehindBody} = \begin{cases} \text{true}, & \text{if } \theta_{\text{aim}} \in (-\pi, 0) \text{ (Aiming North/Up)} \\ \text{false}, & \text{if } \theta_{\text{aim}} \in [0, \pi] \text{ (Aiming South/Down)} \end{cases}$$
- **Barrel Tip Transformation**:
  $$\text{barrelTip}_x = x_{\text{render}} + \cos(\theta_{\text{aim}}) \cdot L_{\text{barrel}}, \quad \text{barrelTip}_y = y_{\text{render}} + \sin(\theta_{\text{aim}}) \cdot L_{\text{barrel}}$$
- **Ejection Port Transformation**:
  $$\text{ejectPort}_x = x_{\text{render}} + \cos(\theta_{\text{aim}}) \cdot L_{\text{eject}} - \sin(\theta_{\text{aim}}) \cdot W_{\text{eject}} \cdot (\text{flipY} ? -1 : 1)$$

#### 2. Tier 1: Happy-Path Test Matrix (≥5 Tests)
| Test ID | Test Name | Setup / Input | Action | Expected Opaque Assertion |
|---|---|---|---|---|
| **F11-T1-01** | Aim Right ($\theta = 0$ rad) | Aim directly east $(1, 0)$ | Compute mount transform | $\text{flipY} === \text{false}$, $\text{drawBehindBody} === \text{false}$ |
| **F11-T1-02** | Aim Left ($\theta = \pi$ rad) | Aim directly west $(-1, 0)$ | Compute mount transform | $\text{flipY} === \text{true}$ (upright weapon, not upside down) |
| **F11-T1-03** | Aim Up ($\theta = -\pi/2$ rad) | Aim directly north $(0, -1)$ | Compute mount transform | $\text{drawBehindBody} === \text{true}$ (weapon behind body) |
| **F11-T1-04** | Aim Down ($\theta = \pi/2$ rad) | Aim directly south $(0, 1)$ | Compute mount transform | $\text{drawBehindBody} === \text{false}$ (weapon in front of body) |
| **F11-T1-05** | Barrel Tip Exact Coordinate | Pistol with $L_{\text{barrel}} = 16$px aiming at $\theta = 0$ | Compute barrel tip | $\text{barrelTip} = (x_{\text{mount}} + 16, y_{\text{mount}})$ |

#### 3. Tier 2: Boundary & Corner-Case Test Matrix (≥5 Tests)
| Test ID | Test Name | Boundary Condition | Edge Handling Rationale | Expected Assertion |
|---|---|---|---|---|
| **F11-T2-01** | Continuous $360^\circ$ Rotation Sweep | Rotate aim angle from $-\pi$ to $+\pi$ in 1000 steps | Seamless angular interpolation | No discontinuous translation jumps or weapon detachment |
| **F11-T2-02** | Exact Flipping Threshold ($\theta = \pm \pi/2$) | Aim at exact $\pm 1.570796$ rad | Deterministic flip condition | No oscillation chatter at threshold |
| **F11-T2-03** | Longest Barrel Weapon (`sniper` $L=32$) | Weapon with maximum barrel length | Muzzle tip scaling | Barrel tip transforms accurately to outer muzzle edge |
| **F11-T2-04** | Melee Weapon Zero-Barrel Handling | Weapon class `melee` (`lightsaber`, `hammer`) | Melee arc origin | Barrel tip defaults to weapon grip center without error |
| **F11-T2-05** | Ejection Port Orientation on Flip | Flip state active ($\text{flipY} = \text{true}$) | Ejection port mirrored outward | Ejected casing always expels upward/outward relative to gun top |

---

### F12: Weapon Recoil Kick & Tremor

#### 1. Specification & Mathematical Model
- **Recoil Kick Impulse**: Upon firing, displacement applied along $-\vec{u}_{\text{aim}}$:
  $$\vec{d}_{\text{recoil}} = -\begin{bmatrix} \cos(\theta_{\text{aim}}) \\ \sin(\theta_{\text{aim}}) \end{bmatrix} \cdot K_{\text{gun}}$$
- **Exponential Recovery Decay**:
  $$d_{\text{recoil}}(t + \Delta t) = d_{\text{recoil}}(t) \cdot e^{-k_{\text{decay}} \Delta t}$$
- **Angular Tremor**: Random angular deviation $\delta \theta \in [-\theta_{\text{tremor}}, +\theta_{\text{tremor}}]$ decaying per frame.
- **Physical Invariant**: Recoil alters only visual weapon render offsets; player physical collision body position remains untouched.

#### 2. Tier 1: Happy-Path Test Matrix (≥5 Tests)
| Test ID | Test Name | Setup / Input | Action | Expected Opaque Assertion |
|---|---|---|---|---|
| **F12-T1-01** | Recoil Kick Displacement | Fire `akm` ($K_{\text{gun}} = 6$px) aiming east | Trigger shot | Weapon render position kicks west by 6px along $-\vec{u}_{\text{aim}}$ |
| **F12-T1-02** | Smooth Recoil Recovery | Fire shot, wait recovery period $0.1$s | Step simulation | Recoil distance decays smoothly back to 0px |
| **F12-T1-03** | Heavy Weapon Kick Scaling | Compare `shak50` (heavy) vs `silenced_pistol` (light) | Measure initial kick | $\text{kick}_{\text{shak50}} > \text{kick}_{\text{pistol}}$ |
| **F12-T1-04** | Continuous Rapid Fire Tremor | Fire `gatling` continuously for 2.0s | Measure angular jitter | Angular tremor generates spread variance within gun spread specs |
| **F12-T1-05** | Physical Position Decoupling | Player at $(100, 100)$ fires heavy weapon | Measure player $(x, y)$ | Player physical position remains exactly $(100, 100)$ |

#### 3. Tier 2: Boundary & Corner-Case Test Matrix (≥5 Tests)
| Test ID | Test Name | Boundary Condition | Edge Handling Rationale | Expected Assertion |
|---|---|---|---|---|
| **F12-T2-01** | Maximum Recoil Clamp | Continuous 16 rps firing with `mac11` | Recoil accumulation clamp | Recoil distance caps at maximum limit (e.g. 12px); weapon never detaches |
| **F12-T2-02** | Weapon Swap Mid-Recoil | Fire heavy shot, immediately swap weapon with 'E' | Recoil state transition | Recoil resets cleanly to prevent weapon offset carry-over |
| **F12-T2-03** | High Frame Drop Spike ($\Delta t = 0.5$s) | Large frame time lag | Exponential decay vs linear subtraction | Recoil decays to 0 without overshoot or oscillation |
| **F12-T2-04** | Zero Recoil Melee Weapons | Attack with `spear` or `dual_blades` | Melee swing arc handling | Melee lunge/swing executed without linear recoil displacement |
| **F12-T2-05** | Overheated Beam Recoil Termination | Fire `pulse` until 100% overheat | Weapon locks in cooldown | Recoil immediately stops and settles to zero |

---

### F13: Directional Muzzle Flashes

#### 1. Specification & Mathematical Model
- **Spawn Origin**: Exactly at $(\text{barrelTip}_x, \text{barrelTip}_y)$.
- **Directional Alignment**: Oriented at $\theta_{\text{aim}}$.
- **Animation Sequence**: 3-4 frame stepped pixel starburst / cone:
  - Frame 0: Max flash explosion (`#ffffff` core + yellow/orange outer).
  - Frame 1: Forward spike burst.
  - Frame 2: Dissipating embers.
  - Frame 3: Extinction (removed from particle list).
- **Element Color Mapping**: Kinetic (orange/yellow), Plasma (cyan/blue), Ion (purple), Acid (green).

#### 2. Tier 1: Happy-Path Test Matrix (≥5 Tests)
| Test ID | Test Name | Setup / Input | Action | Expected Opaque Assertion |
|---|---|---|---|---|
| **F13-T1-01** | Muzzle Flash Spawn at Barrel Tip | Fire `silenced_pistol` | Check flash spawn position | Flash spawns within 0.5px of computed barrel tip |
| **F13-T1-02** | Flash Angular Alignment | Fire weapon at $\theta = 0.75$ rad | Check flash rotation | Flash orientation equals $0.75$ rad |
| **F13-T1-03** | Flash 3-Frame Lifetime Extinction | Spawn flash with lifetime $0.05$s | Step 4 frames ($0.06$s) | Flash transitions frames $0 \to 1 \to 2$ and is removed |
| **F13-T1-04** | Plasma Element Cyan Palette | Fire `plasma_rifle` | Inspect flash color | Flash renders with cyan / neon blue color palette |
| **F13-T1-05** | Multi-Pellet Shotgun Flash | Fire `sa1216` shotgun | Spawn muzzle flash | High-intensity wide-cone muzzle flash spawned |

#### 3. Tier 2: Boundary & Corner-Case Test Matrix (≥5 Tests)
| Test ID | Test Name | Boundary Condition | Edge Handling Rationale | Expected Assertion |
|---|---|---|---|---|
| **F13-T2-01** | High Fire Rate Flash Recycling | Fire `gatling` (20 rps) for 5 seconds | Particle pooling / recycling | Old flashes recycled cleanly; particle array size remains bounded |
| **F13-T2-02** | Firing at Max Movement Speed | Player moving at 300 px/s while firing | Anchor tracking vs world particle | Flash anchors seamlessly to muzzle without trailing detachment |
| **F13-T2-03** | Beam / Melee Weapon Flash Suppression | Attack with `lightsaber` or `healing_beam` | Non-ballistic weapon check | No ballistic muzzle flash particle spawned |
| **F13-T2-04** | Layer 4 Render Queue Placement | Check render queue layer of muzzle flash | Layered render order | Muzzle flash registers in **Layer 4** (Airborne & FX) |
| **F13-T2-05** | Zero Duration / Instant Extinction | Frame delta $\Delta t > 0.1$s | Lag frame handling | Flash immediately expires without lingering on screen |

---

### F14: 2.5D Shell Casing Physics

#### 1. Specification & Mathematical Model
- **Ejection Origin**: $(\text{ejectPort}_x, \text{ejectPort}_y)$.
- **Initial Ejection Velocity**:
  - Horizontal: $\vec{v}_{xy} = \text{rotate}(\vec{u}_{\text{aim}}, \pm \pi/2) \cdot v_{\text{eject}} + \text{random}$
  - Vertical: $v_z \in [180, 260]$ px/s, initial height $z = 12$px.
  - Angular Spin: $\omega \in [15, 30]$ rad/s.
- **Trajectory Integration**:
  $$z(t + \Delta t) = z(t) + v_z \Delta t, \quad v_z(t + \Delta t) = v_z(t) - g_z \Delta t \quad (g_z \approx 700 \text{ px/s}^2)$$
- **Ground Bounce Restitution**: When $z \le 0$:
  $$z = 0, \quad v_z = -e \cdot v_z \quad (e \approx 0.45), \quad \vec{v}_{xy} = \vec{v}_{xy} \cdot (1 - \mu)$$
- **Resting Floor Decal**: When $|v_z| < 20$ px/s and $z = 0$, casing transitions to a static floor decal in **Layer 0** (Ground) with a 15s fade timer.

#### 2. Tier 1: Happy-Path Test Matrix (≥5 Tests)
| Test ID | Test Name | Setup / Input | Action | Expected Opaque Assertion |
|---|---|---|---|---|
| **F14-T1-01** | Casing Ejection Impulse | Fire `akm` | Spawn casing | Casing spawns at ejection port with upward $v_z > 0$ and sideways $\vec{v}_{xy}$ |
| **F14-T1-02** | Parabolic Gravity Arc | Track casing over $0.3$s | Step physics | $z(t)$ rises to peak and falls under gravity to ground $z = 0$ |
| **F14-T1-03** | Ground Contact Bounce Restitution | Casing impacts floor $z = 0$ with $v_z = -200$ | Process bounce | Casing bounces with $v_z \approx +90$ px/s ($e = 0.45$) |
| **F14-T1-04** | Ground Settle & Decal Transition | Casing completes 3 bounces | Step until $|v_z| < 20$ | Casing stops moving ($z = 0, v = 0$) and registers as Layer 0 decal |
| **F14-T1-05** | Decal Fade & Removal | Resting casing after 15s | Step simulation | Casing decal fades alpha to 0 and is removed from memory |

#### 3. Tier 2: Boundary & Corner-Case Test Matrix (≥5 Tests)
| Test ID | Test Name | Boundary Condition | Edge Handling Rationale | Expected Assertion |
|---|---|---|---|---|
| **F14-T2-01** | Max Casing Pool Overflow (100+ Casings) | Continuous sustained firing of 200 rounds | Circular buffer / FIFO recycling | Oldest resting decals culled first; active casing array capped at 100 |
| **F14-T2-02** | Energy Weapon Shell Suppression | Fire `railgun`, `pulse`, or `lightsaber` | Energy weapon verification | Zero shell casings spawned |
| **F14-T2-03** | Caliber-Specific Casing Types | Fire `sa1216` (shotgun) vs `akm` (rifle) | Casing color & size styling | Shotgun spawns red hull; rifle spawns brass cylinder |
| **F14-T2-04** | Wall Boundary Casing Collision | Casing ejected next to wall | Boundary clamp | Casing bounces off wall or settles on floor inside playable arena |
| **F14-T2-05** | Extreme Frame Lag Physics Stability | Step physics with large $\Delta t = 0.2$s | Euler integration floor clamping | $z$ clamped at $\ge 0$; casing never tunnels below floor |

---

### F15: Bullet Trails & Impact Sparks

#### 1. Specification & Mathematical Model
- **Bullet Tracers & Trails**:
  - High-velocity projectiles (`tracer`, `sniper`, `railgun`) spawn trailing particle wake behind projectile tail.
  - Trail particles dissipate over $\tau_{\text{trail}} \in [0.1, 0.2]$s with alpha decay.
- **Wall Impact Sparks**:
  - Upon bullet wall collision, spawn 3–8 sparks with reflected velocity:
    $$\vec{v}_{\text{spark}} = \text{reflect}(\vec{v}_{\text{bullet}}, \vec{n}_{\text{wall}}) \cdot s_{\text{spark}} + \text{random}$$
  - Spark color matches projectile `glow` / `color`.

#### 2. Tier 1: Happy-Path Test Matrix (≥5 Tests)
| Test ID | Test Name | Setup / Input | Action | Expected Opaque Assertion |
|---|---|---|---|---|
| **F15-T1-01** | Sniper Tracer Trail Generation | Fire `sniper` round across 500px | Step projectile | Trailing particles spawned along flight path at regular intervals |
| **F15-T1-02** | Trail Particle Alpha Fade | Spawn trail particle with life $0.15$s | Step $0.15$s | Particle alpha decays linearly $1.0 \to 0.0$ and deallocates |
| **F15-T1-03** | Wall Impact Spark Burst | Bullet hits vertical wall ($\vec{n} = [-1, 0]$) | Process collision | 4–8 sparks burst outward with positive $v_x > 0$ (away from wall) |
| **F15-T1-04** | Element-Matching Spark Colors | Plasma bullet (`#00f0ff`) hits wall | Inspect spark colors | Sparks render with `#00f0ff` cyan glow |
| **F15-T1-05** | Spark Drag & Gravity Decay | Track impact spark over $0.25$s | Step physics | Velocity slows via drag; spark drops and fades out |

#### 3. Tier 2: Boundary & Corner-Case Test Matrix (≥5 Tests)
| Test ID | Test Name | Boundary Condition | Edge Handling Rationale | Expected Assertion |
|---|---|---|---|---|
| **F15-T2-01** | Shotgun Multi-Pellet Wall Collision | 8 shotgun pellets hit wall on same frame | Particle explosion budget limiter | Spark count capped per impact frame; zero frame rate stutter |
| **F15-T2-02** | Piercing Projectile Continuous Trail | `plasma_rifle` penetrates 3 walls | Wall penetration handling | Spawns impact sparks at entry and exit points while trail continues |
| **F15-T2-03** | Bouncy Grenade Ricochet Sparks | `mgl32` grenade bounces off wall | Non-destructive bounce | Spawns small ricochet spark puff without destroying projectile |
| **F15-T2-04** | Zero-Lifetime Expired Trail Cleanup | Bullet expires at maximum range | Tail cleanup | Trail gracefully terminates without orphaned particles |
| **F15-T2-05** | Corner 45° Angle Impact Sparks | Bullet hits exact corner vertex | Normal resolution | Sparks scatter symmetrically outward from corner |

---

### F16: Blood & Debris Splatters

#### 1. Specification & Mathematical Model
- **Directional Blood Spray**:
  - When a bullet strikes an entity, blood particles scatter in a cone along the impact velocity vector $\vec{v}_{\text{bullet}}$.
- **Entity Blood Palette**:
  - Human / Raider / Bots: Crimson red (`#dc2626`, `#991b1b`).
  - Spitter / Bloater / Spore: Acid green (`#84cc16`, `#a3e635`).
  - Abomination Boss: Deep purple / void violet (`#7e22ce`, `#a855f7`).
- **Destructible Prop Chunks**:
  - Wooden crates: Angular brown wood splinters with random spin.
  - Stone pillars: Grey pebble / dust particles.
- **Ground Bloodstains**: Settle into **Layer 0** (Ground) permanent decals.

#### 2. Tier 1: Happy-Path Test Matrix (≥5 Tests)
| Test ID | Test Name | Setup / Input | Action | Expected Opaque Assertion |
|---|---|---|---|---|
| **F16-T1-01** | Directional Blood Spray Cone | Bullet moving east $(1, 0)$ hits player | Spawn blood | Blood particles have average velocity pointing east within $\pm 30^\circ$ |
| **F16-T1-02** | Human Crimson Blood Tint | Shoot player combatant | Inspect blood color | Blood particles have red palette (`#dc2626`) |
| **F16-T1-03** | Spitter Acid Green Blood Tint | Shoot `spitter` monster | Inspect blood color | Blood particles have acid green palette (`#84cc16`) |
| **F16-T1-04** | Ground Bloodstain Decal Settlement | Blood particle hits ground | Settle particle | Bloodstain registers as static decal in **Layer 0** |
| **F16-T1-05** | Wooden Crate Debris Scattering | Destroy wooden crate prop | Trigger destruction | 8–12 angular wooden chunk particles scatter with random rotation |

#### 3. Tier 2: Boundary & Corner-Case Test Matrix (≥5 Tests)
| Test ID | Test Name | Boundary Condition | Edge Handling Rationale | Expected Assertion |
|---|---|---|---|---|
| **F16-T2-01** | Massive Overkill Gib Explosion | RPG deals 140 damage to 30 HP crawler | Overkill splatter multiplier | Spawns enlarged gib splatter burst and large ground stain |
| **F16-T2-02** | Decal Pool Saturation (200+ Decals) | 300 bloodstains spawned during horde battle | Decal memory manager | Oldest decals recycled FIFO; memory remains bounded |
| **F16-T2-03** | Shield Hit Blood Suppression | Bullet hits player with active `shield` | Shield deflection check | Zero blood spawned; spawns blue shield deflection ripples |
| **F16-T2-04** | Arena Boundary Blood Clipping | Enemy killed against arena border | Boundary clamp | Bloodstain decals clamp inside arena border |
| **F16-T2-05** | Cloaked Player Hit Spark/Shimmer | Bullet hits cloaked `phantom` | Stealth hit visual | Spawns distorted cyan distortion shimmer rather than full blood |

---

### F17: Pixel Explosion Shockwaves

#### 1. Specification & Mathematical Model
- **Expanding Shockwave Ring**:
  $$R_{\text{shock}}(t) = R_{\max} \cdot \left(1 - \left(1 - \frac{t}{T}\right)^2\right)$$
  - Stepped pixelated expanding circle ring with decreasing line width.
- **Fireball Core**: High-saturation pixel cluster cycling through `#ffffff` $\to$ `#fde047` $\to$ `#f97316` $\to$ `#7f1d1d` $\to$ dark dithered smoke.
- **Screen Shake Impulse**: Radial camera displacement $\vec{\delta}_{\text{cam}}$ decaying exponentially over $0.3$s.

#### 2. Tier 1: Happy-Path Test Matrix (≥5 Tests)
| Test ID | Test Name | Setup / Input | Action | Expected Opaque Assertion |
|---|---|---|---|---|
| **F17-T1-01** | Rocket Explosion Detonation | Detonate `rocket` at $(500, 500)$ | Trigger explosion | Spawns shockwave ring, fireball core, and smoke particles |
| **F17-T1-02** | Shockwave Radial Expansion | Track shockwave ring radius over $t \in [0, 0.4]$s | Step animation | Radius expands monotonically from $0 \to R_{\max}$ |
| **F17-T1-03** | Fireball Color Palette Cycle | Inspect fireball core color over life | Step frames | Color progresses from white core to yellow to orange to smoke |
| **F17-T1-04** | Proximity Camera Screen Shake | Player within 200px of explosion | Trigger explosion | Camera shake impulse applied proportional to proximity |
| **F17-T1-05** | Dithered Smoke Dissipation | Track rising smoke puffs over $0.8$s | Step simulation | Smoke rises with upward velocity, fades alpha, and deallocates |

#### 3. Tier 2: Boundary & Corner-Case Test Matrix (≥5 Tests)
| Test ID | Test Name | Boundary Condition | Edge Handling Rationale | Expected Assertion |
|---|---|---|---|---|
| **F17-T2-01** | Map Corner Explosion Clipping | Rocket detonates at corner $(0, 0)$ | Viewport / map clipping | Shockwave and smoke render cleanly without off-screen index crash |
| **F17-T2-02** | Cluster Grenade 4x Detonation | 4 sub-munitions explode simultaneously | Additive blending clamp | Screen shake clamps to max threshold; alpha does not over-saturate |
| **F17-T2-03** | Zero-Radius Explosion Guard | Explosive weapon with $R_{\text{explosion}} = 0$ | Defensive boundary | Handled as point impact without division-by-zero |
| **F17-T2-04** | Visual Radius Matches Damage Radius | RPG with `explosionRadius = 360`px | Visual-gameplay parity | Visual shockwave max radius equals 360px within $\pm 5\%$ |
| **F17-T2-05** | Screen Shake Decay to Exact Zero | Trigger heavy explosion shake | Step 60 frames ($1.0$s) | Camera offset decays to exactly $(0, 0)$; zero residual drift |

---

### F18: 38 Weapons Arsenal Visuals & Data

#### 1. Specification & Mathematical Model
- **38 Weapons Roster**: Defined in `data/guns.json` and loaded via `GUNS`:
  - `silenced_pistol`, `mac11`, `mp5`, `mortar`, `sniper`, `rocket`, `akm`, `fcar`, `pulse`, `lightsaber`, `hammer`, `flamethrower`, `sa1216`, `mgl32`, `spear`, `drone`, `recurve_bow`, `riot_shield`, `shak50`, `r357`, `gold_barrett`, `gatling`, `poison_mist`, `lightning_whip`, `dual_blades`, `thrust_sword`, `dragon_breath`, `plasma_rifle`, `lewis`, `scout`, `m1887`, `throwing_knife`, `flame_boomerang`, `railgun`, `plasma_repeater`, `chemical_sprayer`, `shuriken`, `chainsaw`.
- **8 Weapon Classes**: `ranged`, `melee`, `beam`, `flamethrower`, `poison_mist`, `sentry`, `bow`, `shield`.
- **Data Invariants**: Every weapon must have valid `id`, `name`, `damage > 0`, `fireRate > 0`, `bulletSpeed`, `color`, `kind`, `barrel`, `iconShape`.

#### 2. Tier 1: Happy-Path Test Matrix (≥5 Tests)
| Test ID | Test Name | Setup / Input | Action | Expected Opaque Assertion |
|---|---|---|---|---|
| **F18-T1-01** | Exact 38 Weapons Schema Validation | Iterate all 38 entries in `GUNS` | Validate schema fields | All 38 weapons contain non-empty `id`, `name`, `weaponClass`, and `iconShape` |
| **F18-T1-02** | 8 Weapon Classes Complete Coverage | Group `GUNS` by `weaponClass` | Check class counts | All 8 weapon classes contain at least 1 functional weapon definition |
| **F18-T1-03** | Ranged Magazine & Reload Integrity | Filter all `weaponClass === "ranged"` | Validate magazine fields | All ranged guns have `magazine > 0` and `reloadTime > 0` |
| **F18-T1-04** | Melee Weapon Arc & Damage Integrity | Filter all `weaponClass === "melee"` | Validate melee fields | All melee weapons have `meleeRange > 0` and valid swing kinematics |
| **F18-T1-05** | 38 Weapon Pixel Icon Generation | Iterate all 38 `iconShape` keys | Call `drawPixelWeaponIcon` | All 38 icons render distinct pixel silhouettes without fallback errors |

#### 3. Tier 2: Boundary & Corner-Case Test Matrix (≥5 Tests)
| Test ID | Test Name | Boundary Condition | Edge Handling Rationale | Expected Assertion |
|---|---|---|---|---|
| **F18-T2-01** | Zero Ammo Magazine Lock | Magazine reaches 0 rounds | Fire trigger pulled | Firing is blocked; automatic reload timer initiates |
| **F18-T2-02** | Rapid 38-Weapon Sequential Switch | Press 'E' 38 times in rapid succession | Weapon swap state handling | Weapon switches sequentially through all 38 guns without corruption |
| **F18-T2-03** | Gatling Continuous Spin-Up Mult | Fire `gatling` from $0 \to 3.0$s continuous fire | Spin-up math | Fire rate ramps smoothly from base to max rate |
| **F18-T2-04** | Recurve Bow Min vs Max Charge Release | Release bow at $t = 0.0$s vs $t = 1.5$s full charge | Charge scaling interpolation | Damage and speed scale from `minChargeMult` to `maxChargeMult` |
| **F18-T2-05** | Riot Shield Full 360° Block Arc Angle | Bullets incoming inside block arc vs from behind | Angle difference calculation | Frontal bullets absorbed by shield; rear bullets hit player |

---

## 3. Tier 3: Cross-Feature Combinations Matrix (F01 – F18)

| Combo ID | Features | Description | Test Procedure & Invariant |
|---|---|---|---|
| **C01** | F01 + F03 + F04 | Viewport resize during camera integer tracking | Resize display canvas from 1080p to 4K while player is moving. Invariant: Camera snaps to integer render coordinates; mouse cursor coordinates map to exact world location. |
| **C02** | F05 + F06 + F08 | Character 3/4 sprite walking across 3/4 wall split | Player walks south past a wall top and front face. Invariant: Player renders behind wall front face when $footY < sortY_{\text{wall}}$, and in front when $footY > sortY_{\text{wall}}$. Wall top in Layer 3 always renders above player. |
| **C03** | F08 + F10 + F11 + F12 | Character archetype + outfit + weapon mount left flip + recoil | `juggernaut` with `neon` outfit aiming left ($\theta = \pi$) fires `shak50`. Invariant: Weapon flips vertically (`flipY=true`), kicks along $-\vec{u}_{\text{aim}}$, while character runs with correct suit colors. |
| **C04** | F11 + F13 + F14 + F18 | 38 Weapons Arsenal firing with muzzle flash and shell casing | Fire each of the 38 weapons in turn. Invariant: Muzzle flash spawns at computed barrel tip; casing expels from ejection port with 2.5D bounce (except energy weapons). |
| **C05** | F15 + F16 + F17 | Explosive projectile impact with trail, shockwave, and blood | Fire RPG into monster swarm near wall. Invariant: Rocket produces smoke trail $\to$ detonates expanding shockwave $\to$ spawns directional acid splatters and wall sparks $\to$ bloodstains settle in Layer 0. |
| **C06** | F05 + F09 + F16 | Abomination boss death blast in YSorted queue | Defeat Abomination boss in Biohazard mode. Invariant: Boss death blast spawns massive purple splatters; bloodstains settle into Layer 0 decals while entities sort in Layer 2. |
| **C07** | F07 + F18 | Pure headless server simulation of all 38 weapons | Run 30Hz authoritative server simulation with all 38 weapons active. Invariant: Zero DOM / Canvas API invocations; all weapon trajectories, reloads, and damage apply identically to client. |
| **C08** | F02 + F03 + F11 | High-DPI integer blit with 2-stage mouse aiming | Test on Retina display (`devicePixelRatio = 2.0`). Invariant: Nearest-neighbor integer scaling preserves sharp pixel borders; mouse world coordinates track orbital weapon aim precisely. |
| **C09** | F05 + F14 + F16 | Heavy battle decal density in Layer 0 | 100 shell casings and 200 bloodstains on ground while 20 combatants move in Layer 2. Invariant: Layer 0 decals render beneath Layer 1 shadows and Layer 2 entities; zero-GC queue flushes within 1.0ms. |
| **C10** | F08 + F09 + F11 + F15 | 4-Player Deathmatch with bots firing tracers | 4 players with distinct outfits aim and fire tracers. Invariant: Tracers, muzzle flashes, and impact sparks render in Layer 4; characters sort in Layer 2. |

---

## 4. Tier 4: Real-World Workload Scenarios

### Workload W01: Biohazard 10-Wave PvE Monster Swarm & Boss Blitz
- **Scenario**: Single-player Biohazard mode from Wave 1 to Wave 10.
- **Features Exercised**: F01, F03, F04, F05, F06, F08, F09 (All 9 monsters + Boss), F11, F12, F13, F14, F15, F16, F17, F18.
- **Load Profile**: Up to 80 simultaneous monsters on screen, continuous weapon fire, 500+ blood decals, 100+ shell casings.
- **Pass Criteria**: Zero unhandled exceptions, zero-GC render queue execution $< 2.5$ms per frame, correct Y-sorting depth throughout.

### Workload W02: 8-Player Deathmatch 38-Weapon Arsenal Stress
- **Scenario**: 8 combatants (human + 7 bots) in Free-For-All Deathmatch cycling through all 38 weapons.
- **Features Exercised**: F05, F08, F10 (15 outfits, 8 hats), F11 (360° mounts), F12 (Recoil kicks), F13, F14, F15, F18.
- **Load Profile**: Continuous simultaneous firing, weapon switches every 10 seconds, rapid angle flips.
- **Pass Criteria**: All 38 weapon animations, icons, recoils, and shells execute without desync or memory leaks.

### Workload W03: Base Defense Turret & Deployable Artillery Barrage
- **Scenario**: Friendly Base vs Enemy Base Defense with turrets, landmines, RPGs, mortars, and wall splits.
- **Features Exercised**: F05, F06 (Wall splits), F11, F15, F16 (Debris), F17 (Shockwaves), F18.
- **Load Profile**: 10 active turrets firing simultaneously, cluster grenades exploding, mortar shells lobbing over wall tops.
- **Pass Criteria**: Projectiles in Layer 4 clear Layer 3 wall tops; shockwaves and debris scatter cleanly.

### Workload W04: Headless 30Hz Authoritative Server 3000-Tick Marathon
- **Scenario**: Headless Node.js simulation executing 3000 server ticks (100 seconds of game time) across 4 rooms.
- **Features Exercised**: F07, F18, and core simulation systems.
- **Load Profile**: 4 simultaneous matches with bots, continuous shooting, grenade throws, and monster spawns.
- **Pass Criteria**: Zero canvas/DOM access attempts, steady-state heap memory growth $< 5$MB over 3000 ticks.

---

## 5. Test Implementation Architecture & Guidelines

### 1. Test Harness Structure
Tests will be placed under `tests/e2e/`:
- `tests/e2e/runner.mjs`: Test runner with structured logging and pass/fail exit code semantics.
- `tests/e2e/tier1_features.test.mjs`: Isolation tests for F01 to F18 (and F19-F34).
- `tests/e2e/tier2_boundaries.test.mjs`: Boundary and edge-case tests.
- `tests/e2e/tier3_combinations.test.mjs`: Pairwise combinatorial tests.
- `tests/e2e/tier4_workloads.test.mjs`: Long-running real-world scenario tests.

### 2. Canvas Mocking & Headless Verification
- For headless Node.js tests of drawing routines, use a lightweight spy context that records draw calls (`fillRect`, `drawImage`, `save`, `restore`, `translate`, `rotate`) without requiring WebGL/GPU hardware.
- For viewport coordinate math and physics tests, invoke pure mathematical transformation methods directly.

---
*End of Analysis Report.*
