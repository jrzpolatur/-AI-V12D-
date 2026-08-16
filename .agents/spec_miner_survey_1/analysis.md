# Specification Survey & Codebase Mapping: R1 & R4

**Project**: 2D Shooter (FIRING STICKERS / 16-Bit Arcade Refactor)  
**Agent**: Specification Miner (Survey Agent 1)  
**Date**: 2026-08-16  
**Focus Areas**: 
- **R1**: Arcade Pixel Player Character & Entity Rendering, Animation Pipeline, Visor, Hurt Flash, Cloak/Armor Layers, Walk Bobbing, Shield Halo, Respawn Golden Protection Ring, Stealth Refraction/Transparency.
- **R4**: Pixel Weapons & Visual FX, Melee FX (Dual Blades Parry, Thrust Sword Charge Rail, Hammer Ground Crack, Riot Shield Sparks), Projectiles/Bullets, Particle Systems, CRT Scanline Filter, Retro Pixel Fonts, Off-Screen Enemy Radar Arrows.

---

## 1. Executive Summary

A comprehensive survey of the codebase was conducted across `src/game/`, `src/components/`, `data/`, and `server/`.
The project has already built foundational elements of a 16-bit pixel aesthetic (a 6-layer `RenderQueue`, fixed/dynamic `PixelViewport`, zero-GC `PixelParticleSystem`, procedural `pixelWeapons`, and top-down `drawCharacter`). 

However, to fully satisfy the specifications laid out in **ORIGINAL_REQUEST.md** (R1 and R4), several crucial visual features, shader/filter layers, and UI feedback mechanisms must be formally mapped, refactored, or implemented:
1. **R1 Gaps**: 
   - Missing glowing/pulsing visor animation on helmets.
   - Missing multi-layered cloak/robe/cape shadow depth rendering.
   - Incomplete / inconsistent shield halo (needs unified dashed hexagonal/circular halo with rotating nodes).
   - Incomplete respawn protection visual (currently plain blue dots; needs arcade golden protection ring with runes and orbiting sparkles).
   - Basic stealth transparency (needs arcade pixel-dither shimmer / chromatic refraction outline).
2. **R4 Gaps**:
   - Missing CRT scanline post-processing filter (canvas / CSS scanline overlay with dither and vignette).
   - Missing retro arcade pixel fonts across HUD, floating text, and Canvas text.
   - Missing off-screen enemy radar warning arrows (screen-edge clamped tracking chevrons with threat coloring and pulsing).
   - Incomplete parry clash visual FX for dual blades (bullet reflect currently only emits generic particles).

---

## 2. Features Discovered (Table)

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | R1: Rendering | Character 2.5D Rendering (`drawCharacter`) | Modular top-down pixel character renderer with boots, backpack, torso, chest armor, head, eyes, and weapon mount | `ctx`, `DrawCharOpts` (`x, y, angle, character, outfit, size, speed, t, flash, glow, gun, gadget, meleeSwing, lunge, isCloaked, cloakAlpha`) | Canvas draw calls | Safe fallback to default suit/skin if outfit attributes undefined | `src/game/draw.ts:193-432` |
| 2 | R1: Animation | Walk Bobbing & Gait Stepping | 6-frame discrete leg stepping cycle (`bootOffL/R`) and body bobbing during run/idle | `speed > 10`, time `t` | Frame offset pixel translation | Zero offset when idle | `src/game/draw.ts:201-210` |
| 3 | R1: Rendering | Modular Helmet & Hat System (`drawHat`) | 7 pixel hat types: `helmet`, `cap`, `hood`, `visor`, `alien`, `monkey`, `tycoon` | `ctx`, `HatType`, `accent`, radius `r` | Rendered hat over character head | Falls back to no hat if `hat === 'none'` | `src/game/draw.ts:77-163` |
| 4 | R1: FX | Hurt Flash (受击全白闪烁) | Entity flashes pure `#ffffff` on receiving damage for ~0.1-0.5s | `p.flash > 0` | All character sub-blocks fill with `#ffffff` | Clamped to 0 when decayed | `src/game/draw.ts:235`, `engine.ts:6706` |
| 5 | R1: FX | Forcefield Shield Halo (护盾光环) | Octagon node / circular barrier when shield is active | `p.shieldTime > 0` | Glowing barrier around player | Fades out as `shieldTime` approaches 0 | `src/game/engine.ts:12324`, `Renderer.ts:1212` |
| 6 | R1: FX | Golden Protection Ring (金色保护环) | Invulnerability ring on respawn (`iframes > 0` / respawn protection) | `p.iframes > 0 && p.dashTime <= 0` | Golden pulsing barrier / runes / orbiting sparks | Inactive when `iframes === 0` | `src/game/engine.ts:12429` (needs upgrade to golden ring) |
| 7 | R1: FX | Stealth Refraction & Transparency | Alpha reduction and pixel shimmer when cloaked | `p.isCloaked`, `t` | Semi-transparent rendering + corner shimmer pixels | Disabled when not cloaked | `src/game/draw.ts:212,420` |
| 8 | R1: Sprites | Offscreen Procedural Sprite Sheet System | Pre-baked 24x32 4-state sprite sheet (`idle`, `run`, `hurt`, `death`) for players and 9 monster archetypes | `CharacterDef`, `OutfitDef`, `MonsterDef` | Cached `HTMLCanvasElement` frames | Headless fallback returns empty canvas | `src/game/sprites.ts:1-680` |
| 9 | R4: Weapons | 38 Master Pixel Weapons (`drawPixelWeapon`) | Hand-crafted 16-bit pixel art models for all 38 weapons in `data/guns.json` | `ctx`, `GunDef`, `accent`, `t`, `swing` | Rendered pixel firearm/melee model | Falls back to tactical rifle model on unknown shape | `src/game/pixelWeapons.ts:170-1031` |
| 10 | R4: Weapons | Orbital Weapon Mounting & Recoil (`computeWeaponMount`) | 360° orbital hand mounting, left aim auto-flip (`flipY`), depth sorting behind body (`drawBehindBody`), recoil vector | `bodyX, bodyY, aimAngle, recoilDist, gunDef` | `WeaponMountTransform` (`renderX, renderY, rotation, flipY, drawBehindBody, barrelTip, ejectPort`) | Reuses preallocated transform object (Zero-GC) | `src/game/weaponMount.ts:84-143` |
| 11 | R4: Melee FX | Thrust Sword Charge Indicator | Dash corridor rectangle, trajectory line, endpoint diamond, and overhead charge bar | `gun.id === 'thrust_sword'`, `p.thrustCharging`, `p.thrustCharge` | Visual dash range indicator | Only rendered on active charging | `src/game/engine.ts:12443`, `Renderer.ts:1357` |
| 12 | R4: Melee FX | Dual Blades Slash & Combo FX | 5-step combo slash arcs including step-5 crossing X finisher | `Effect` type `"dual_slash"`, combo step 1-5 | Glowing curved slash polygons + white core | Disposed when effect duration expires | `src/game/systems/Renderer.ts:1715-1841` |
| 13 | R4: Melee FX | Dual Blades Parry & Reflect | Reflects incoming bullets within range while secondary fire is held, dealing 5% self damage | `p.bladeRaising`, bullet collision with reflect radius | Reflected bullet reversal + sparks + audio | Ignored if blades not raised | `src/game/engine.ts:5440-5470` |
| 14 | R4: Melee FX | Hammer Ground Crack (震地裂纹) | 4-directional stepped ground crack fissures + shock ring on heavy slam | `Effect` type `"slam"`, `e.radius` | Stepped fissure pixel blocks + shockwave ring | Fades out over effect duration | `src/game/engine.ts:12982-13000` |
| 15 | R4: Melee FX | Riot Shield Spark & Arc Barrier | Frontal arc barrier absorbing bullets + spark emissions on impact | `p.shieldBlockTime > 0`, bullet hit inside `shieldArc` | Stepped pixel shield barrier + impact sparks | Shield breaks when `shieldHp <= 0` | `src/game/engine.ts:5109-5134, 12350` |
| 16 | R4: FX | 2.5D Pixel Particle Engine (`PixelParticleSystem`) | 512-particle zero-GC pool for muzzle flashes, bouncing shells ($z$-axis gravity/bounce), trails, blood/acid, explosions, smoke, debris | `dt`, particle emitters (`emitMuzzleFlash`, `emitShellCasing`, `emitExplosion`, etc.) | Canvas pixel drawing on Layer 4 | Reuses inactive pool slots; expands if needed | `src/game/pixelParticles.ts:1-549` |
| 17 | R4: FX | Floating Combat Text (`FloatingTextSystem`) | Popping damage/heal/shield/gold combat numbers with gravity drift and outline | `x, y, text, opts` (`critical, heal, shield, gold`) | Canvas text rendering on Layer 5 | Evicts oldest entries if pool full | `src/game/floatingText.ts:1-260` |
| 18 | R4: UI | Pixel Radar Minimap (`PixelMinimap`) | Top-right radar displaying arena borders, walls, player, enemy blips, pickups, and sweep line | `arenaW, arenaH, walls, blips, playerX, playerY` | Scaled canvas minimap box | Clamps blips to minimap boundary | `src/game/minimap.ts:1-211` |
| 19 | R4: UI | Off-Screen Enemy Radar Arrows | Screen-edge clamped directional chevrons indicating off-screen enemies/bosses | Enemy world coords $(x,y)$, Camera $(cx,cy)$, Viewport dimensions | Directional edge arrows with threat color & distance pulse | Hidden when enemies are on-screen | **Missing — Required by R4** |
| 20 | R4: PostFX | CRT Scanline & Retro Filter | Horizontal scanline raster overlay, subtle phosphor glow, and edge vignette | Canvas dimensions $(W, H)$ | Scanline raster overlay | Can be toggled in settings | **Missing — Required by R4** |
| 21 | R4: Typography | Arcade Retro Pixel Typography | Crisp bitmap/retro arcade font styling across canvas damage text, HUD, and menus | Font family declarations | Crisp pixel typography | Fallbacks to monospace | **Missing / Incomplete** |

---

## 3. Edge Cases & Observed Behaviors

| # | Feature | Input / Scenario | Observed Behavior | Handling / Spec Recommendation |
|---|---------|------------------|-------------------|---------------------------------|
| 1 | Weapon Mounting | Aim angle precisely vertical ($\theta = -\pi/2$) | `drawBehindBody` is true ($-\pi \cdot 0.85 < \theta < -\pi \cdot 0.15$), sorting weapon behind head/torso | Handled correctly in `computeWeaponMount` |
| 2 | Weapon Mounting | Aiming left ($\theta > \pi/2$ or $\theta < -\pi/2$) | `flipY` is true; weapon sprite flips vertically so topside detailing faces up | Handled correctly via `scale(1, -1)` transform |
| 3 | Hurt Flash | Player hit continuously by DoT (poison / fire) | `flash` timer constantly refreshed to $> 0$, keeping player continuously white-flashing | Flash should pulsate or blink rather than stay solid white for long DoTs |
| 4 | Respawn / iframes | Player respawns in Deathmatch / PvP | `p.iframes = 3.0`, `deadTimer = 0`, player invincible | Current rendering shows faint blue squares; must show prominent Golden Protection Ring with countdown |
| 5 | Cloaked Player | Enemy cloaks in PvP or PvE | `cloakAlpha = 0.15`, 4 corner pixels rendered | Friendly teammates see ghosted blue outline; enemies see subtle dither shimmer |
| 6 | Off-screen Radar | 50+ enemies off-screen simultaneously in Biohazard PvE | Potential visual clutter on screen edges | Aggregate close-angle enemies, prioritize nearest threats & boss, cap maximum arrows to 8-12 |
| 7 | CRT Scanline | Canvas scaled to high DPR (Retina / 4K) | Subpixel scaling may cause uneven scanline thickness or moiré patterns | Draw scanlines aligned to internal virtual buffer (480x270 / 960x540) before integer blit |
| 8 | Headless Server | Simulation running in Node.js server (`ctx === null`) | Canvas creation & draw calls throw if not guarded | All rendering systems (`sprites`, `particles`, `viewport`, `Renderer`) have strict `!ctx` / `canCreateCanvas()` guards |

---

## 4. Codebase Architecture & File Mapping

```
src/
├── game/
│   ├── draw.ts              # Core pixel rendering routines (drawCharacter, drawMonster, drawHat, shade, rgba)
│   ├── pixelWeapons.ts      # 38 Hand-crafted pixel weapon models & icon renderer (drawPixelWeapon, drawPixelWeaponIcon)
│   ├── weaponMount.ts       # 360° orbital weapon mounting, aim flip, depth sorting, recoil impulse
│   ├── pixelParticles.ts    # Zero-GC pooled particle engine & 2.5D shell physics (PixelParticleSystem)
│   ├── sprites.ts           # 3/4 perspective offscreen sprite sheet generator & animator
│   ├── floatingText.ts      # Floating combat text (damage, crit, heal, shield, gold)
│   ├── minimap.ts           # Retro pixel radar minimap in top-right corner
│   ├── viewport.ts          # PixelViewport virtual buffer (480x270 / 960x540) & coordinate mapper
│   ├── renderQueue.ts       # 6-layer Zero-GC Y-Sorted render queue (Ground, Shadow, YSorted, Overhead, AirborneFX, ScreenUI)
│   ├── engine.ts            # Core dual-stack game engine (headless simulation + client loop)
│   ├── types.ts             # TypeScript interface contracts for characters, outfits, guns, monsters
│   └── systems/
│       └── Renderer.ts      # Client rendering subsystem (drawPlayer, drawNetCharacter, renderNet, drawEffects)
├── components/
│   ├── GameScreen.tsx       # Main canvas container, HUD overlays, mobile controls
│   ├── GameSummaryScreen.tsx# Fullscreen end-game statistics & MVP showcase
│   └── SettingsOverlay.tsx  # Game settings (quality, volume, pixel scale, bot difficulty)
└── data/
    └── guns.json            # 38 weapon definitions & balance parameters
```

---

## 5. Detailed Gap Analysis & Porting Requirements

### 5.1 R1 Requirements Breakdown & Implementation Plan

1. **发光目镜 (Glowing Visor)**:
   - **Current State**: `drawHat` in `draw.ts:112` draws static cyan rect for `"visor"` and light blue slit for `"helmet"`.
   - **Requirement**: Pulsing neon visor eye glint with animated intensity:
     $$\text{alpha} = 0.75 + 0.25 \sin(t \cdot 8)$$
     visors should support dynamic accent glowing core with 1px outer halo.

2. **多层披风/战袍阴影分层 (Multi-layer Cloak / Robe Shadow Layering)**:
   - **Current State**: `drawCharacter` draws backpack and torso directly.
   - **Requirement**: Outfits with cloaks/capes (e.g. Assassin Hood, Battle Robe) should render a background flowing cape layer (Layer 1.5, behind torso, with 2-step darker shade + wind sway animation) and ground contact drop shadow underneath.

3. **受击全白闪烁 (Hurt Flash)**:
   - **Current State**: `isFlash` overrides torso/boots/head fill with `#ffffff`.
   - **Requirement**: Verify all character accessories, shoulders, hands, insignia, and hat are uniformly painted in flash white `#ffffff` on damage frames ($t < 0.15\text{s}$).

4. **虚线护盾光环 (Dashed Shield Halo)**:
   - **Current State**: Inconsistent between `Renderer.ts` (solid circle + arcs) and `engine.ts` (octagonal nodes).
   - **Requirement**: Unify into a crisp 16-bit dashed rotating forcefield ring:
     - Dash pattern: `[6, 4]` or 8 segmented pixel nodes.
     - Rotating angle: $\theta = t \cdot 2.5$.
     - Color: neon cyan/blue `#60a5fa` / `#93c5fd` with pulsing radial core.

5. **重生成金色保护环 (Respawn Golden Protection Ring)**:
   - **Current State**: Renders 4 small blue squares `#e0f2fe`.
   - **Requirement**: Render an arcade-style golden protection barrier:
     - Golden dashed ring (`#fbbf24`, `#fde047`) with 6 rotating diamond rune nodes.
     - Orbiting golden spark particles.
     - Expanding pulse effect when timer expires.

6. **隐身折射透明度 (Stealth Refraction / Transparency)**:
   - **Current State**: `globalAlpha = 0.15` and 4 static corner pixels.
   - **Requirement**:
     - 2.5D pixel dither pattern (checkerboard pixel discard) for retro arcade cloaking.
     - Cyan-violet iridescent outline shimmer (`#22d3ee` / `#c084fc`).

---

### 5.2 R4 Requirements Breakdown & Implementation Plan

1. **38 种像素武器造型 (Pixel Weapons Arsenal)**:
   - **Current State**: `src/game/pixelWeapons.ts` contains detailed models for all 38 weapons in `data/guns.json`.
   - **Requirement**: Verify alignment between `drawPixelWeapon` (world model) and `drawPixelWeaponIcon` (HUD/UI icon). Ensure weapon muzzle position (`barrelTipX/Y`) and shell ejection port (`ejectPortX/Y`) match the geometry of each firearm.

2. **双刀招架与格挡光效 (Dual Blades Parry Visual FX)**:
   - **Current State**: When bullet reflection triggers (`engine.ts:5465`), only basic particles are spawned.
   - **Requirement**:
     - On successful parry: Spawn a radial metallic clash burst (crossed spark blades `X`, white core flash, sound sync).
     - While holding parry (secondary fire): Render a glowing criss-cross guard stance with pulsing energy arcs.

3. **刺剑突刺充能导轨 (Thrust Sword Charge Rail)**:
   - **Current State**: Fully implemented in `Renderer.ts:1357` and `engine.ts:12443` (`drawThrustSwordChargeIndicator`).
   - **Requirement**: Keep synchronized between local player and network peers; ensure crisp dashed corridor rendering on virtual canvas.

4. **重锤震地裂纹 (Heavy Hammer Ground Crack)**:
   - **Current State**: `engine.ts:12982` `type === "slam"` draws 4-direction pixel cracks.
   - **Requirement**: Add branching jagged pixel fissure paths radiating from impact point with rising dust/debris particles (`emitDebris(x, y, "stone")`).

5. **防暴盾火花 (Riot Shield Sparks)**:
   - **Current State**: Spawns blue particles on bullet absorption.
   - **Requirement**: Spawn directional ricochet spark fan (`emitMuzzleFlash` / spark bursts along reflection normal) + shield impact ripple ring.

6. **屏幕边缘敌方预警雷达箭头 (Off-Screen Enemy Radar Arrows)**:
   - **Current State**: Missing from renderer.
   - **Requirement**:
     - For enemies outside visible viewport bounds $\text{AABB}(\text{camX}, \text{camY}, W, H)$:
     - Compute angle $\theta = \operatorname{atan2}(e_y - \text{camY}, e_x - \text{camX})$.
     - Intersect ray with screen edge rectangle (inset by 16px).
     - Draw directional pixel chevron/arrow $(\blacktriangleright)$ pointing toward enemy.
     - Color coding: Standard enemy = `#ef4444`, Elite/Boss = `#a855f7` / `#f59e0b`, Hostile Player = `#f43f5e`.
     - Distance scaling: Smaller/fainter when far ($> 800\text{px}$), larger/pulsing when near entering screen.

7. **CRT 扫描线滤镜 (CRT Scanline Filter)**:
   - **Current State**: Missing.
   - **Requirement**:
     - Screen-space post-processing overlay (RenderLayer.ScreenUI or canvas overlay):
     - Horizontal scanlines: alternate lines darkened with `rgba(0, 0, 0, 0.12)`.
     - Vignette: radial gradient darkening screen corners.
     - Toggleable in `SettingsOverlay` (CRT On/Off).

8. **像素复古字体样式 (Retro Pixel Font Styles)**:
   - **Current State**: Monospace / sans-serif used in canvas; Google Font `Saira Condensed` in HTML.
   - **Requirement**:
     - Import a pixel arcade font (`Press Start 2P`, `VT323`, or `Silkscreen`) in `index.html`.
     - Standardize floating damage text, minimap coordinates, HUD labels, and kill feed to use pixel font typography.

---

## 6. Verification & Test Plan

1. **TypeScript Build**: `npx tsc --noEmit` & `npm run build` zero errors.
2. **Headless Engine Compatibility**: Ensure Node.js authoritative server bundle builds and runs without DOM/Canvas reference errors.
3. **Frame Rate & Performance**: Zero memory allocations per frame in `RenderQueue`, `PixelParticleSystem`, and `FloatingTextSystem` (stable 60 FPS).
4. **Visual Testing**:
   - Player character renders with walk bobbing, visor glow, and hurt flash.
   - Shield halo displays dashed rotating perimeter.
   - Respawn gives golden protection ring.
   - All 38 weapons render in hand and UI.
   - Off-screen enemies show edge radar arrows.
   - CRT filter renders crisp scanlines without blur.
