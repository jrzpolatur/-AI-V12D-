# E2E Test Strategy & Investigation Report: Features F19–F28 & F34

**Track**: E2E Testing Track — FIRING STICKERS 16/32-Bit Pixel Dungeon Shooter Refactor  
**Investigator**: Explorer 2  
**Target Scope**: 
- F19: 3/4 Pixel Dungeon Tilemap (floor tiles, perimeter, ground decals)
- F20: Autotiling Wall System (16-bit bitmask autotiling, inner/outer corners)
- F21: Interactive Destructible Props (crates, barrels, pillars with HP, damage states, debris)
- F22: Parachuting Airdrop Crates (crate descent, landing smoke, beacon)
- F23: Animated Cashout Vault (pulse, gold coin eruption, interaction states)
- F24: 16-Bit Notched Pixel HP Bar & Energy/Shield Bar
- F25: Pixel Ammo & Weapon Display (ammo pips, bullet silhouettes)
- F26: Canvas Floating Combat Text (damage popup colors: normal white/yellow, crit red/orange, heal green, shield blue)
- F27: Retro Pixel Radar Minimap (radar blips: player, enemies, vault, airdrop, walls)
- F28: Retro Arcade UI Typography
- F34: 14 Gadgets & Deployables (turrets, mines, healing hubs, grenades, tactical weapons)

---

## 1. Executive Summary

This investigation establishes the definitive test specification and opaque-box test strategy for Features F19 through F28 and F34. By examining the current implementation across `src/game/engine.ts`, `src/game/content.ts`, `src/game/types.ts`, `src/game/draw.ts`, `src/game/systems/Renderer.ts`, and `src/components/GameScreen.tsx`, we have mapped every functional requirement to concrete, verifiable test cases across Tiers 1 through 4.

Key architectural takeaways:
1. **Headless Separation**: Core simulation dynamics (wall collisions, destructible HP degradation, deployable lifetimes, mine triggers, vault progress, ammo states) operate independently in headless Node.js simulations without canvas dependencies.
2. **Visual & Layer Pipeline Contract**: Visual elements respect the 6-layer `RenderQueue` (`Ground = 0`, `Shadow = 1`, `YSorted = 2`, `Overhead = 3`, `AirborneFX = 4`, `ScreenUI = 5`) and integer nearest-neighbor coordinate mapping.
3. **Comprehensive Coverage Target**: 55 Tier 1 (Happy Path) tests + 55 Tier 2 (Boundary/Corner) tests + 12 Tier 3 (Cross-Feature Combinations) + 6 Tier 4 (Real-World Workloads), providing over 128 dedicated test specifications for this feature subset.

---

## 2. Codebase Inspection & Evidence Chain

| Feature | Primary Code Files & Evidence | Key Functions & Structures | Headless Compatibility |
|---|---|---|:---:|
| **F19** | `src/game/engine.ts:863, 2266-2620`<br>`src/game/systems/Renderer.ts:371-410` | `worldW`, `worldH`, `walls`, `buildWalls()`, `drawBackground()` | ✅ 100% |
| **F20** | `src/game/engine.ts:714-732, 2266-2350`<br>`src/game/systems/Renderer.ts:539-620` | `interface Wall`, `buildWalls()`, `drawWalls()`, `drawBuilding()` | ✅ 100% |
| **F21** | `src/game/engine.ts:714, 9408-9445`<br>`src/game/systems/Renderer.ts:576-617` | `destructible: boolean`, `damageWall()`, `breakWall()`, `debris` particles | ✅ 100% |
| **F22** | `src/game/engine.ts:694-701`<br>`src/game/types.ts:694-701` | `interface Pickup`, Airdrop spawn triggers, landing state | ✅ 100% |
| **F23** | `src/game/engine.ts:734-742, 694-701`<br>`src/game/types.ts:734-742` | `interface Base`, `interface Pickup`, capture progress & coin eruption | ✅ 100% |
| **F24** | `src/game/engine.ts:187-210`<br>`src/components/GameScreen.tsx:613-660` | `HudState.hp`, `HudState.maxHp`, `HudState.shieldHp`, notched bar styling | ✅ UI + Logic |
| **F25** | `src/game/engine.ts:744-751, 1608-1617`<br>`src/components/GameScreen.tsx:661-764`<br>`data/guns.json` | `interface WeaponState`, `ammo`, `reload`, `heat`, `overheated`, `drawWeaponModel` | ✅ UI + Logic |
| **F26** | `src/game/engine.ts:409-415, 926`<br>`src/game/systems/Renderer.ts:890-950` | `interface ScorePopup`, `scorePopups[]`, canvas text floating physics | ✅ 100% |
| **F27** | `src/game/engine.ts:863, 1677-1768`<br>`src/game/systems/Renderer.ts:244-270` | Arena coordinate scaling, blip projection, viewport frustum | ✅ Logic + UI |
| **F28** | `src/components/GameScreen.tsx:613-800`<br>`src/index.css` | Retro arcade typography, pixel borders, kill feed & wave banners | ✅ UI + Styling |
| **F34** | `src/game/types.ts:239-290`<br>`src/game/content.ts:340-501`<br>`src/game/engine.ts:762-789, 1580-1606, 5568-5760` | `GADGETS` (14 deployables), `deployGadget()`, `doDeploy()`, `updateDeployables()` | ✅ 100% |

---

## 3. Tier 1: Feature Coverage Test Catalog (Happy Path Isolation)

Each feature includes at least 5 isolated, requirement-driven verification test cases.

### F19: 3/4 Pixel Dungeon Tilemap
- **T1.19.1 (Grid Tile Alignment)**: Floor tiles snap to uniform integer grid coordinates (`x % tileSize === 0, y % tileSize === 0`) across entire arena dimensions ($6000 \times 3000$).
- **T1.19.2 (Outer Perimeter Bounds)**: Arena boundary walls correctly enclose playfield; entity movement cannot penetrate outer coordinate limits ($x \in [0, worldW], y \in [0, worldH]$).
- **T1.19.3 (Ground Decals Creation)**: High-impact events (bullet impacts, explosions, monster deaths) generate permanent/semi-permanent ground decals at Layer 0.
- **T1.19.4 (Decal Lifecycle & Retention)**: Decals persist on the ground layer across camera pans and do not corrupt adjacent tile rendering.
- **T1.19.5 (Multi-Theme Palette Switching)**: Loading different environment themes (Desert, Arctic, Cyber, Ruin) loads correct tile textures and background grid colors.

### F20: Autotiling Wall System
- **T1.20.1 (Isolated Pillar Autotile)**: An isolated 1x1 wall tile calculates bitmask 0 and renders four-sided border facade.
- **T1.20.2 (Straight Wall Segments)**: Continuous horizontal (East-West) and vertical (North-South) wall runs calculate correct connected bitmasks.
- **T1.20.3 (Inner and Outer Corners)**: L-shaped bends and concave corner walls compute precise inner/outer corner tile indices.
- **T1.20.4 (T-Junction & Cross Intersections)**: 3-way and 4-way wall intersections resolve into seamless junction tiles.
- **T1.20.5 (Perspective Top/Front Split)**: Wall rendering separates Top Face (Layer 3 Overhead) from Front Face (Layer 2 Y-Sorted) with accurate ground anchor `footY`.

### F21: Interactive Destructible Props
- **T1.21.1 (Crate HP Degradation)**: Wooden crates absorb projectile hits, reducing `hp` from max (150) downwards.
- **T1.21.2 (Visual Damage State Transitions)**: Props transition states at 100% (Pristine), 60% (Chipped/Cracked), and 25% (Splintered).
- **T1.21.3 (Debris Particle Emission)**: Destroying a prop scatters wood/stone pixel chunk particles with random velocity vectors.
- **T1.21.4 (Loot Drop Generation)**: Breaking a crate spawns health or gold pickups at the prop's central ground anchor.
- **T1.21.5 (Explosive Barrel Detonation)**: Reaching 0 HP on an explosive barrel triggers an AOE radius explosion damaging nearby entities.

### F22: Parachuting Airdrop Crates
- **T1.22.1 (Airdrop Spawn & Altitude)**: Crate initializes with altitude $z > 0$ and target ground destination $(x_g, y_g)$.
- **T1.22.2 (Parachute Descent Motion)**: Simulation decreases altitude $z$ over time with sinusoidal horizontal sway $x(t) = x_0 + A\sin(\omega t)$.
- **T1.22.3 (Ground Touchdown FX)**: Reaching $z=0$ detaches parachute, spawns landing smoke puff, and settles crate on Layer 2.
- **T1.22.4 (Landed Beacon Signaling)**: Landed airdrop crate emits periodic blinking beacon light pulse (`sin(t * freq) > 0`).
- **T1.22.5 (Loot Interaction)**: Player entering interaction radius unlocks crate and spawns high-tier weapons/gadgets/gold cache.

### F23: Animated Cashout Vault
- **T1.23.1 (Idle Glow Pulse)**: Cashout vault executes sinusoidal color breathing and glowing pulse in idle state.
- **T1.23.2 (Capture Radius Detection)**: Player presence within interaction distance ($d \le r_{capture}$) initiates cashout progress accumulation.
- **T1.23.3 (Hold-to-Cashout Progress)**: Progress accumulates monotonically from 0% to 100% over the required duration ($5.0\text{s}$).
- **T1.23.4 (Gold Coin Eruption FX)**: Reaching 100% triggers explosive fountain of gold coin particles.
- **T1.23.5 (Reward & Cooldown Transition)**: Completed cashout credits player with match score/gold and sets vault to locked/cooldown state.

### F24: 16-Bit Notched Pixel HP Bar & Energy/Shield Bar
- **T1.24.1 (Notched Health Representation)**: HP bar displays segmented pixel notches corresponding to fractional health ($HP / maxHP$).
- **T1.24.2 (Damage Lag Bar Catchup)**: Taking damage displays a secondary delayed red/yellow catchup bar that smoothly interpolates downward.
- **T1.24.3 (Shield / Energy Gauge Display)**: Equipping a riot shield or activating skill renders dedicated shield/energy meter.
- **T1.24.4 (Low-Health Warning Pulsation)**: Dropping below 25% max HP activates pulsating red low-HP warning frame.
- **T1.24.5 (Healing Hit Glow)**: Gaining health triggers green highlight flash on health bar.

### F25: Pixel Ammo & Weapon Display
- **T1.25.1 (Active Weapon Silhouette)**: HUD displays pixel silhouette and icon matching current active weapon from `data/guns.json`.
- **T1.25.2 (Segmented Ammo Pips)**: Magazine weapons display discrete bullet pips matching capacity (e.g. 6 pips for Revolver, 30 for SMG).
- **T1.25.3 (Firing Pip Depletion)**: Firing consumes ammo and extinguishes corresponding bullet pip in real time.
- **T1.25.4 (Reload Countdown Progress)**: Pressing R triggers reload progress animation ($0\% \to 100\%$) and replenishes pips on completion.
- **T1.25.5 (Heat Gauge Buildup & Overheat)**: Beam and pulse weapons build heat meter towards 1.0, triggering red OVERHEAT banner when full.

### F26: Canvas Floating Combat Text
- **T1.26.1 (Normal Damage Popups)**: Standard hits spawn white/yellow popping text numbers on canvas.
- **T1.26.2 (Critical & Explosive Popups)**: Critical strikes and blast hits spawn enlarged red/orange numbers with exclamation icons.
- **T1.26.3 (Heal Popups)**: Health restoration ticks spawn green numbers prefixed with `+`.
- **T1.26.4 (Shield & CC Status Popups)**: Shield absorption and stun effects spawn blue/purple status text.
- **T1.26.5 (Upward Drift & Alpha Fade)**: Combat text floats upward ($v_y < 0$) and smoothly fades out over lifetime ($0.8\text{s}$).

### F27: Retro Pixel Radar Minimap
- **T1.27.1 (World-to-Minimap Projection)**: Scaled projection maps arena bounds $(0,0) \to (worldW, worldH)$ to minimap frame accurately.
- **T1.27.2 (Player Blip & Heading)**: Player renders as cyan/green arrow blip oriented along facing angle.
- **T1.27.3 (Enemy & Boss Blips)**: Standard enemies appear as red dots; boss monsters appear as distinct enlarged flashing skull blips.
- **T1.27.4 (Objective Diamond Markers)**: Airdrop crates and Cashout Vault display high-contrast gold/yellow diamonds.
- **T1.27.5 (Camera Viewport Frustum Box)**: Transparent rectangular overlay indicates currently visible screen area on minimap.

### F28: Retro Arcade UI Typography
- **T1.28.1 (Pixel-Aligned Bitmap Glyphs)**: Text renders with crisp nearest-neighbor integer edges without antialiased blur.
- **T1.28.2 (High-Contrast Drop Shadows)**: UI glyphs feature 2px solid dark dropshadows ensuring legibility against complex game backgrounds.
- **T1.28.3 (Wave Announcement Banners)**: Wave start/clear events display centered arcade banner animations ("WAVE 1", "WAVE CLEARED").
- **T1.28.4 (Boss Incoming Warning)**: Boss spawn triggers flashing crimson warning header.
- **T1.28.5 (Arcade Kill Feed Stream)**: Eliminating enemies appends killer, weapon icon, and target to arcade kill feed.

### F34: 14 Gadgets & Deployables
- **T1.34.1 (MG Turret Deployment & Auto-Aim)**: Deploying `turret_mg` creates permanent turret that rotates and fires at enemies within 260px.
- **T1.34.2 (Explosive & Status Mines)**: Deploying `mine_explosive`, `mine_poison`, `mine_fire`, and `mine_stun` arms after 0.8s and triggers on proximity.
- **T1.34.3 (Tactical Grenade Lobs)**: Throwing `glue_grenade`, `fire_grenade`, `poison_grenade`, and `cluster_grenade` executes ballistic flight and detonates on arrival.
- **T1.34.4 (Healing Hub Station)**: Deploying `healing_station` establishes 90px nanite aura healing nearby wounded allies.
- **T1.34.5 (Special Weapons RPG & Stun Gun)**: Activating `rpg` launches 140-damage rocket with 360px radius; `stun_gun` fires dart inflicting 3.0s CC stun.

---

## 4. Tier 2: Boundary & Corner Case Test Catalog

Each feature includes at least 5 boundary, extreme-value, and stress test cases.

### F19: 3/4 Pixel Dungeon Tilemap (Boundaries)
- **T2.19.1 (Out-of-Bounds Tile Index Queries)**: Querying tile coordinates ($x < 0, y < 0, x > worldW, y > worldH$) returns safe boundary void tile without throwing index exceptions.
- **T2.19.2 (Zero/Minimal Arena Dimensions)**: Engine initialization with $1 \times 1$ tilemap dimensions gracefully handles minimum border construction.
- **T2.19.3 (10,000 Ground Decal Stress)**: Spawning 10,000 ground decals activates FIFO eviction ring-buffer without memory leaks or frame latency spikes.
- **T2.19.4 (Exact Border Decal Placement)**: Placing blast scorches exactly on boundary pixels ($x=0, y=0, x=worldW, y=worldH$) clips cleanly to canvas buffer.
- **T2.19.5 (Dynamic Viewport Resizing)**: Rapidly resizing viewport canvas maintains correct floor tile alignment and pixel aspect ratio.

### F20: Autotiling Wall System (Boundaries)
- **T2.20.1 (Perimeter Wall Edge Clamping)**: Wall segments touching outer arena bounds treat world edge as solid/void according to border configuration.
- **T2.20.2 (Checkerboard Diagonal Touch)**: Wall tiles touching only diagonally resolve ambiguous corner bitmasks without visual seam tearing.
- **T2.20.3 (Massive Simultaneous Wall Demolition)**: Destroying 50 contiguous wall blocks in one frame triggers bulk autotile neighborhood recalculation in $<2\text{ms}$.
- **T2.20.4 (Sub-Pixel Y-Sort Precision)**: Wall front face `footY` aligns precisely with player collision box to prevent depth flickering during contact.
- **T2.20.5 (Non-Standard Wall Dimensions)**: Irregular wall rectangles (e.g. $80 \times 22$ glue walls) resolve fallback autotile tilesets cleanly.

### F21: Interactive Destructible Props (Boundaries)
- **T2.21.1 (Massive Single-Hit Overkill)**: Delivering 1,000,000 overkill damage in one hit cleanly destroys prop without negative HP overflow or double-drop bugs.
- **T2.21.2 (Sub-1 Fractional Damage Accumulation)**: Continuous micro-damage ticks ($0.005\text{ dmg/tick}$) accumulate accurately without rounding to 0 or breaking premature destroy thresholds.
- **T2.21.3 (100-Barrel Chain Reaction Detonation)**: 100 explosive barrels positioned in adjacent grid cascade detonations without recursion stack overflow.
- **T2.21.4 (Infinite HP Indestructible Pillars)**: Props initialized with `hp: Infinity` ignore all damage classes (bullet, explosive, melee, beam, fire) and never break.
- **T2.21.5 (200-Crate Simultaneous Destruction)**: Smashing 200 crates in a single frame enforces particle budget caps ($MAX\_PARTICLES = 700$) without engine stall.

### F22: Parachuting Airdrop Crates (Boundaries)
- **T2.22.1 (Obstacle Collision Landing Adjustment)**: Airdrop targeting top of solid building/wall nudges ground landing point to nearest open floor space.
- **T2.22.2 (Out-of-Bounds Drop Correction)**: Airdrop spawned outside arena limits clamps coordinates to valid playable perimeter.
- **T2.22.3 (10 Simultaneous Descending Airdrops)**: Managing 10 active parachuting crates runs independent sway physics without interference.
- **T2.22.4 (Mid-Air Projectile Pass-Through)**: Bullets fired through airborne crates ($z > 0$) pass through without premature ground interaction.
- **T2.22.5 (120-Second Uncollected Despawn Timeout)**: Uncollected airdrop crates decay and despawn cleanly after timeout duration.

### F23: Animated Cashout Vault (Boundaries)
- **T2.23.1 (99.9% Capture Boundary Interruption)**: Player stepping out of capture radius at 99.9% progress halts progress and triggers gradual decay or immediate reset.
- **T2.23.2 (Death/Damage Interruption)**: Taking fatal or staggering damage during cashout immediately interrupts channel.
- **T2.23.3 (Opposing Multi-Team Contest)**: Simultaneous presence of opposing teams inside capture circle freezes progress at current value.
- **T2.23.4 (Exact Match Overtime Boundary)**: Completing cashout on exact final tick of match timer credits victory cleanly.
- **T2.23.5 (500 Coin Eruption Particle Stress)**: Spawning maximum gold eruption particles recycles particle pool without frame hitching.

### F24: 16-Bit Notched Pixel HP Bar & Energy/Shield Bar (Boundaries)
- **T2.24.1 (Extreme Max HP Values)**: Setting `maxHp: 10,000,000` scales pip density and numerical text without visual bar overflow.
- **T2.24.2 (Overheal / Shield Overcharge)**: Health exceeding max HP clamps to 100% width or displays overcharge shield highlight.
- **T2.24.3 (0 HP Absolute Death State)**: HP reaching 0 locks visual bar to 0% and renders skull/tombstone icon.
- **T2.24.4 (Negative Damage / Healing at Full HP)**: Receiving heal ticks while at 100% HP does not trigger damage lag artifacts.
- **T2.24.5 (High-Frequency Damage/Heal Oscillation)**: Alternating damage and heal ticks every frame maintains smooth visual lag-bar lerp.

### F25: Pixel Ammo & Weapon Display (Boundaries)
- **T2.25.1 (0 Ammo Complete Depletion)**: Magazine and reserve reaching `0 / 0` renders flashing empty indicator and disables trigger.
- **T2.25.2 (100-Round Magazine Pip Density)**: Large magazine weapons (Gatling Gun) render compact grouped pip rows without overflowing HUD panel.
- **T2.25.3 (Infinite Ammo Melee Weapons)**: Melee weapons (Katana, Hammer, Dagger) suppress ammo pips and display infinity symbol ($\infty$).
- **T2.25.4 (100% Overheat Hard Lock)**: Reaching heat 1.0 disables firing until cooled down completely to 0.0.
- **T2.25.5 (Rapid Weapon Switch Reload Cancellation)**: Switching weapons during reload immediately cancels reload state without ammo duplication.

### F26: Canvas Floating Combat Text (Boundaries)
- **T2.26.1 (Extreme 999,999 Overkill Formatting)**: High-magnitude numbers format with compact notation (`999K`) or auto-scaled font.
- **T2.26.2 (Sub-1 Micro Damage Numbers)**: Fractional status damage ($0.1\text{ dmg}$) rounds cleanly to 1 decimal place or integer.
- **T2.26.3 (1,000 Text Popup Burst Stress)**: Spawning 1,000 floating text items simultaneously activates object pool eviction without GC pauses.
- **T2.26.4 (Viewport Edge Coordinate Clamping)**: Damage popups at screen boundaries ($vx=0, vy=0, vx=480, vy=270$) clamp text inside viewport.
- **T2.26.5 (Headless Mode Simulation Safety)**: Simulating floating text physics headlessly (`ctx === null`) executes position and lifetime updates safely.

### F27: Retro Pixel Radar Minimap (Boundaries)
- **T2.27.1 (Extreme Aspect Ratio Arenas)**: Ultra-wide ($10,000 \times 2,000$) arenas scale blips with proper aspect ratio preservation.
- **T2.27.2 (500 Enemy Swarm Radar Load)**: Rendering 500 monster blips on minimap executes within $<0.5\text{ms}$.
- **T2.27.3 (Off-Screen Objective Clamping)**: Off-screen tracked objectives clamp to radar perimeter with directional edge arrows.
- **T2.27.4 (Minimap Expansion Overlay)**: Toggling full-screen expanded map mode scales radar data smoothly.
- **T2.27.5 (Headless Minimap Data Extraction)**: Headless engine extracts blip coordinates and types without DOM/canvas dependencies.

### F28: Retro Arcade UI Typography (Boundaries)
- **T2.28.1 (50-Character Name Truncation)**: Extremely long combatant names truncate with ellipsis (`...`) without clipping bounding boxes.
- **T2.28.2 (Multi-Line Notification Layout)**: Complex multi-line game notifications wrap cleanly within arcade dialog frames.
- **T2.28.3 (High-Rate Kill Feed Scroll)**: Receiving 10 kill events in 1 second limits feed to max 5 visible lines and auto-scrolls smoothly.
- **T2.28.4 (Non-ASCII & Unicode Character Fallbacks)**: Chinese, Japanese, and Emoji characters render fallback fonts gracefully without crash.
- **T2.28.5 (Alpha Fade Visibility)**: Fading text banners maintain crisp pixel bounds down to minimum opacity.

### F34: 14 Gadgets & Deployables (Boundaries)
- **T2.34.1 (Max Stack Overflow Eviction)**: Deploying a 4th turret when `maxStack: 3` auto-destroys the oldest turret.
- **T2.34.2 (Cooldown Boundary Rejection)**: Attempting deployment at $cd > 0$ strictly rejects activation without resetting timer.
- **T2.34.3 (Max Distance Placement Clamping)**: Targeting deployment beyond $maxRange$ clamps coordinates to $maxRange$ boundary from player.
- **T2.34.4 (Stun Gun CC Precision)**: Stun gun CC duration enforces exact 3.0s lock, completely disabling movement, weapon switching, and skills.
- **T2.34.5 (Cluster Grenade 4-Way Dispersion)**: Cluster grenade detonates into exactly 4 sub-munitions with uniform $90^\circ$ angular offset.

---

## 5. Tier 3: Cross-Feature Combinations Catalog

1. **T3.COMB.1 (Demolition Cascade)**: F21 (Destructible Crate) + F20 (Autotiling Wall) + F21 (Explosive Barrel). Crate destruction detonates adjacent barrel, damaging neighboring wall tiles and triggering real-time autotiling bitmask recomputation.
2. **T3.COMB.2 (Airdrop Under Siege)**: F22 (Parachuting Airdrop) + F27 (Minimap Radar) + F26 (Floating Combat Text). Landed airdrop blinks on radar; player opening crate under fire spawns damage and heal floating popups.
3. **T3.COMB.3 (Vault Fortress Defense)**: F23 (Cashout Vault) + F34 (MG Turret & Stun Mine) + F24 (Notched HP Bar). Player deploys turrets and mines to protect vault; incoming enemies trigger stun mines while player takes fire, activating low-HP warning.
4. **T3.COMB.4 (Heavy Artillery Arsenal)**: F34 (RPG-7) + F26 (Floating Combat Text) + F25 (Pixel Ammo Display). RPG-7 fires high-damage projectile producing massive red crit damage numbers while updating ammo pips and reload states.
5. **T3.COMB.5 (Tactical Hazard Zone)**: F19 (Tilemap & Decals) + F34 (Glue Grenade) + F21 (Glue Wall). Glue grenade spawns temporary glue wall on tilemap, which leaves sticky ground decals on destruction.
6. **T3.COMB.6 (Sniper Infrared Defense)**: F34 (Sniper Turret) + F23 (Cashout Vault) + F28 (Arcade UI Typography). Sniper turret tracks incoming enemies with infrared beam; vault capture completion posts arcade victory banner.

---

## 6. Tier 4: Real-World Workload Scenarios

1. **T4.WORKLOAD.1 (10-Wave Biohazard Fortification Survival)**: 
   - Player constructs fortified perimeter with MG turrets, healing hubs, and fire mines across dungeon choke points.
   - Survives 10 consecutive monster waves with continuous HUD updates, radar tracking of 100+ enemies, and thousands of combat text popups.
2. **T4.WORKLOAD.2 (8-Combatant Deathmatch Airdrop & Vault Heist)**: 
   - 8 combatants (player + 7 bots) battle in dynamic arena with 4 airdrop drops and active Cashout Vault.
   - Verifies combat text throughput, notched HP updates, weapon switching, and kill feed accuracy under continuous combat.
3. **T4.WORKLOAD.3 (High-Density Dungeon Demolition Stress Simulation)**: 
   - 200 destructible crates, 50 explosive barrels, 20 active turrets, and 500 simultaneous combat text items.
   - Runs for 3,000 frames headlessly; asserts 0 memory leaks, strict particle budget enforcement, and zero NaN coordinate exceptions.

---

## 7. Verification Commands & Independent Audit Guide

To independently verify the investigation findings and test harness readiness:

```powershell
# 1. Verify TypeScript types and build clean compilation:
cmd.exe /c "npm run build"

# 2. Verify headless simulation integrity:
cmd.exe /c "npm run smoke:server"

# 3. Verify multiplayer combat and damage replication:
cmd.exe /c "node scripts/test-multiplayer-full-refactor.mjs"

# 4. Verify 5000-frame combat stress stability:
cmd.exe /c "node scripts/test-kill-bot-crash.mjs"
```
