# Comprehensive Survey Report: Entities, Animations, Weapons & Pixel Particles

**Target Project**: FIRING STICKERS Refactor to 16/32-Bit Pixel Dungeon Shooter (Enter the Gungeon / Soul Knight style)  
**Survey Scope**: Entity Drawing & Animation, R2 Sprite System Requirements, Pixel Particle & Shell Physics System, Complete Weapon Arsenal Inventory  
**Investigator**: Explorer 2  
**Date**: 2026-08-15  

---

## 1. Executive Summary

The current FIRING STICKERS codebase is a high-performance top-down 2D shooter built on HTML5 Canvas and TypeScript. While it currently employs procedural 16-bit-styled pixel art primitives and canvas path drawing, the rendering perspective is strictly **top-down 360° rotational** (the entire character body and weapon rotate continuously based on aim angle). 

To refactor the game into a **16/32-bit pixel dungeon shooter** (comparable to *Enter the Gungeon* and *Soul Knight*), the entity rendering pipeline must transition from top-down continuous rotation to a **3/4 isometric/dungeon perspective with discrete directional sprite animations (Idle, Run, Hurt, Death)**, coupled with an **independent 360° orbiting weapon mount** featuring dynamic horizontal flipping, recoil kick, and depth layering. In addition, the current basic particle system must be upgraded to a dedicated **retro pixel particle engine** supporting directional muzzle flashes, 2.5D bouncing shell casing physics, bullet trails, blood/debris splatter decals, and pixelated explosion shockwaves.

All **38 existing weapons** across 8 weapon classes, **4 playable characters**, **15 outfits**, **8 hats**, **9 biohazard monster archetypes**, and **14 gadgets** have been comprehensively surveyed and cataloged with zero functional regressions planned.

---

## 2. Current Entity Architecture & Rendering Pipeline

### 2.1 Character & Player System
* **Definitions**: `CharacterDef` and `OutfitDef` defined in `src/game/types.ts`, configured in `src/game/content.ts`.
* **Playable Characters (4 Archetypes)**:
  1. **Raider (突袭者)**: Balanced stats (`speed: 235`, `maxHp: 100`, `damageMult: 1.0`, `fireRateMult: 1.0`, `size: 16`, cyan theme).
  2. **Juggernaut (重装兵)**: High HP tank (`speed: 178`, `maxHp: 165`, `damageMult: 0.92`, `fireRateMult: 0.95`, `size: 19`, emerald theme).
  3. **Phantom (灵狐)**: Fast assassin (`speed: 296`, `maxHp: 72`, `damageMult: 1.12`, `fireRateMult: 1.18`, `size: 14`, crimson theme).
  4. **Sentinel (哨兵)**: Heavy firepower (`speed: 214`, `maxHp: 96`, `damageMult: 1.28`, `fireRateMult: 0.86`, `size: 16`, amber theme).
* **Outfits & Skins (15 Options)**:
  `tactical` (战术), `night` (暗夜), `desert` (沙漠), `neon` (霓虹), `crimson` (赤焰), `emerald` (翡翠), `alien` (外星人), `monkey` (猴子), `tycoon` (大亨), `medic` (医疗兵), `cyber_ninja` (赛博忍者), `pirate` (星际海盗), `royal_guard` (皇家卫士), `hazard` (防化清道夫), `ghost` (幽灵特工).
* **Hats (8 Types)**:
  `none`, `cap`, `helmet`, `hood`, `visor`, `alien`, `monkey`, `tycoon`.
* **Current Rendering (`src/game/draw.ts: drawCharacter`)**:
  - The canvas context rotates by `angle` (facing mouse aim).
  - Renders top-down dithered shadow, chunky boots with 6-frame run stepping cycle, tactical backpack with 4-frame idle bob, torso polygon block, chest armor plate with accent insignia, shoulder and hand blocks, head square with Isaac/Gungeon-style twin eyes, and hat attachment.
  - Handles status visuals: cloak shimmer (dithered corner pixels + 0.15 alpha), i-frames pulse ring, shield bubbles, thrust sword charging corridor and overhead charging status bar, electric arcs on lightsaber hit.
  - **Limitation**: When aiming to the left ($|\text{angle}| > \frac{\pi}{2}$), the entire character and held weapon are rendered upside down because of the continuous context rotation.

### 2.2 Monster & PvE Bestiary System
* **Definition**: `MonsterDef` in `src/game/types.ts`, `MONSTERS` array in `src/game/content.ts`.
* **9 Biohazard Monster Archetypes**:
  1. **Walker (行尸)**: Slow melee grunt (`hp: 80`, `speed: 68`, `damage: 12`, `size: 16`). Rendered as hunchbacked zombie with forward reaching arms.
  2. **Runner (奔尸)**: Fast lunging predator (`hp: 55`, `speed: 160`, `damage: 16`, `size: 14`). Lunges on a timer, elongated body.
  3. **Brute (巨尸)**: Giant tank (`hp: 420`, `speed: 42`, `damage: 28`, `size: 28`). Hulking blocky shoulders and heavy hit.
  4. **Spitter (吐酸者)**: Ranged acid artillery (`hp: 110`, `speed: 56`, `damage: 10`, `size: 17`, `range: 360`). Blocky acid sac snout.
  5. **Abomination (母体 Boss)**: Giant boss (`hp: 2600`, `speed: 30`, `damage: 45`, `size: 46`). Heavy AOE ground slam, rotating orbiting dark nodes, pulsating core, massive death explosion.
  6. **Crawler (爬虫)**: Tiny swarmer (`hp: 30`, `speed: 205`, `damage: 7`, `size: 10`). Flat scuttling body, rushes point-blank.
  7. **Bloater (毒爆体)**: Exploding poison carrier (`hp: 190`, `speed: 46`, `damage: 14`, `size: 26`). Pulsates with poison sac; bursts into poison gas cloud upon death (`explodeRadius: 130`, `explodeDamage: 60`).
  8. **Screamer (尖啸者)**: Support buffer (`hp: 130`, `speed: 72`, `damage: 8`, `size: 18`). Emits speed buff aura to surrounding monsters (`buffRadius: 270`) and staggers player.
  9. **Spore (孢子怪)**: Environmental hazard emitter (`hp: 165`, `speed: 50`, `damage: 10`, `size: 20`). Emits lingering poison clouds (`cloudRadius: 95`, `cloudDamage: 42`).
* **Current Rendering (`src/game/draw.ts: drawMonster`)**:
  - Top-down rotated block primitives with glowing eyes, buff rings, charging stretches, and hit flashes.

### 2.3 Defend-Base & PvP Bots / Combatants
* Human combatants (`Combatant` in `src/game/engine.ts`) use `CharacterDef` and `OutfitDef` with AI targeting, weapon swapping, and pathfinding.
* In Deathmatch / Team Deathmatch, 4 combatants are rendered simultaneously via `Renderer.ts: drawNetCharacter` with overhead health bars and name tags.

### 2.4 Projectiles & Ballistics
* **Projectile Kinds (`ProjectileKind`)**:
  `bullet`, `rocket`, `pellet`, `tracer`, `flame`, `ion`, `grenade`, `knife`, `boomerang`.
* **Special Mechanics**:
  - **Mortar Lob**: 2.5D parabolic arc (`lobSx`, `lobSy`, `lobTx`, `lobTy`, `lobDur`, `z` height) with shadow projected underneath.
  - **Ion Ball**: Bounces off walls 3 times, passes through targets, ignores walls.
  - **Flame Cone**: Continuous sector fire/poison cloud damage with radial fade.
  - **Continuous Laser Beam**: Hitscan raycast with muzzle glow and target impact sparks.
  - **Bouncing Grenades / MGL32**: Wall bounce physics with timed/collision detonation.
  - **Boomerang / Shuriken**: Outward travel followed by homing return to owner.
  - **Parallel Twin-Barrels (SHAK-50)**: Two parallel projectiles drifting apart during flight.
  - **Wall-Piercing (Plasma Rifle)**: Individual rounds have a 25% chance to penetrate walls.

### 2.5 Deployables & Gadgets (14 Types)
* Turrets (`turret_mg`, `turret_cannon`, `turret_sniper`), Mines (`mine_explosive`, `mine_poison`, `mine_fire`, `mine_stun`), Grenades (`glue_grenade`, `fire_grenade`, `poison_grenade`, `cluster_grenade`), Healing Hub (`healing_station`), and Special Weapons (`healing_beam`, `rpg`, `stun_gun`).
* Rendered via `drawGadgetModel` in `src/game/draw.ts` with pixel bases, rotating barrels, and blinking sensor lights.

---

## 3. Complete Weapon Arsenal Inventory (38 Weapons)

The following table catalogs every weapon currently defined in `data/guns.json` and supported by the engine:

| ID | Name | Class | Damage | Fire Rate | Bullet Speed | Mag / Reload | Projectile Kind | Special Behaviors & Properties | Shape Key |
|---|---|---|---|---|---|---|---|---|---|
| `silenced_pistol` | 消音手枪 | ranged | 37 | 7.0/s | 1860 | 22 / 1.4s | bullet | Semi-auto, low spread (0.03), medium range | `pistol` |
| `mac11` | MAC11 | ranged | 16 | 16.0/s | 1950 | 40 / 1.6s | bullet | High rate-of-fire spray, spread 0.13, close range | `mac11` |
| `mp5` | MP5 | ranged | 18 | 14.0/s | 2220 | 30 / 1.7s | tracer | High velocity, tight spread (0.08) | `mp5` |
| `mortar` | 投射榴弹炮 | ranged | 78 | 1.6/s | 1040 | 8 / 2.6s | grenade | 2.5D lob arc with ground indicator, explosive (r=140), 1 bounce | `mortar` |
| `sniper` | 狙击枪 | ranged | 162 | 0.9/s | 2750 | 5 / 2.8s | tracer | High pierce (5), zero spread, high knockback (420) | `sniper` |
| `rocket` | 火箭筒 | ranged | 115 | 0.72/s | 480 | 1 / 2.0s | rocket | Heavy explosion (r=192), knockback 320 | `rocket` |
| `akm` | AKM | ranged | 20 | 10.0/s | 2270 | 36 / 2.2s | tracer | Balanced assault rifle, medium range | `akm` |
| `fcar` | FCAR | ranged | 23 | 9.0/s | 2350 | 24 / 2.6s | tracer | Heavy assault rifle, pierce 1, knockback 240 | `fcar` |
| `pulse` | 脉冲 | beam | 185/s | 1.0/s | 0 (beam) | Overheat | tracer | Continuous hitscan beam (r=780), heat: 0.73/s, cool: 0.5/s | `pulse` |
| `lightsaber` | 光剑 | melee | 110 | 3.0/s | Melee | — | bullet | Sweep arc 2.705 rad, electric arcs shock & slow enemies | `lightsaber` |
| `hammer` | 大锤 | melee | 120 | 1.5/s | Melee | — | bullet | Left-click swing, Right-click slam (dmg 260, r=100, destroys walls) | `hammer` |
| `flamethrower` | 火焰喷射器 | flamethrower | 190/s | 1.0/s | 0 (cone) | Overheat | flame | Sector cone (0.08 rad, range 300px), heat: 0.35/s, cool: 0.55/s | `flamethrower` |
| `sa1216` | SA1216 | ranged | 6x12 | 3.5/s | 1710 | 16 / 2.6s | pellet | Combat shotgun (12 pellets/shot, spread 0.18) | `sa1216` |
| `mgl32` | MGL32 | ranged | 84 | 1.8/s | 1260 | 6 / 2.4s | grenade | 6-round grenade launcher, 1 bounce then explosive (r=78) | `mgl32` |
| `spear` | 长矛 | melee | 68 | 3.2/s | Melee | — | bullet | 3-step thrust combo, forward lunge + i-frames on each step | `spear` |
| `drone` | 浮游炮 | ranged | 56 | 1.6/s | 380 | 4 / 1.8s | ion | 3 bounces, ignores walls, high pierce (99) | `drone` |
| `recurve_bow` | 反曲弓 | bow | 46~101 | 1.5/s | 1200~2760 | Charge | tracer | Charge bow (0.6x~2.2x damage, 2.3x speed, movement slow 0.7) | `recurve_bow` |
| `riot_shield` | 防爆盾 | shield | 90 | 1.8/s | Melee | Shield | bullet | Left-click bash, Right-click shield block (2000 HP, 0.7 rad arc) | `riot_shield` |
| `shak50` | SHAK-50 | ranged | 16x2 | 7.0/s | 1900 | 20 / 2.2s | tracer | Twin parallel barrels (gap 7px, drift 30px/s), pierce 1 | `shak50` |
| `r357` | R.357 左轮 | ranged | 74 | 3.2/s | 2200 | 6 / 1.9s | tracer | Semi-auto heavy revolver, high single-shot damage | `pistol` / `revolver` |
| `gold_barrett` | 黄金巴雷特 | ranged | 175 | 0.85/s | 2900 | 6 / 3.0s | tracer | Anti-materiel sniper, pierce 8, knockback 480 | `gold_barrett` |
| `gatling` | 加特林 | ranged | 12 | 19.0/s | 2650 | 300 / 3.4s | tracer | Spin-up spooling (0.55s spinup, 0.18 min mult, 300-round mag) | `gatling` |
| `poison_mist` | 毒雾喷射机 | poison_mist | 80/s | 1.0/s | 0 (cone) | Overheat | flame | Poison gas cone (0.34 rad, range 130px), lingering poison DoT | `poison_mist` |
| `lightning_whip` | 闪电鞭 | melee | 54 | 4.0/s | Melee | — | bullet | Alternating left/right slash, arc 3.4 rad, slows targets for 2.0s | `lightning_whip` |
| `dual_blades` | 双刃 | melee | 55~200 | 4.5/s | Melee | — | bullet | 5-step combo [55,55,70,70,200], Right-click reflects enemy bullets | `dual_blades` |
| `thrust_sword` | 突刺长剑 | melee | 84 | 2.2/s | Melee | — | bullet | Left-click swing, Right-click charge dash (>=0.5s charge, 140 dmg, 210px dash) | `thrust_sword` |
| `dragon_breath` | 龙息喷 | shotgun | 16x6 | 3.2/s | 720 | 8 / 1.8s | bullet | Incendiary shotgun (6 pellets, spread 0.24, 1.5s burn DoT) | `dragon_breath` |
| `plasma_rifle` | 电浆步枪 | ranged | 22 | 4.5/s | 2280 | 27 / 2.2s | tracer | 3-round burst, semi-auto, 25% wall pierce chance | `plasma_rifle` |
| `lewis` | 刘易斯机枪 | ranged | 24 | 8.5/s | 1900 | 47 / 3.0s | tracer | Classic pan-mag LMG, high damage, 47-round drum | `lewis` |
| `scout` | 斥候 | ranged | 55 | 2.8/s | 2460 | 15 / 2.3s | bullet | Semi-auto marksman rifle, pierce 2, precision dot | `sniper` |
| `m1887` | M1887 泵动霰弹枪 | ranged | 14x9 | 1.7/s | 2000 | 6 / 1.8s | pellet | Pump-action shotgun (9 pellets, spread 0.09) | `m1887` |
| `throwing_knife` | 飞刀 | ranged | 50 | 3.2/s | 1480 | — | knife | Rapid throwing blade, pierce 1, chargeMin 0.15s | `knife` |
| `flame_boomerang` | 火焰回旋镖 | ranged | 46 | 1.5/s | 1120 | — | boomerang | Returns along flight path, multi-hit pierce 999, burn DoT | `boomerang` |
| `railgun` | 轨道狙击炮 | ranged | 140 | 0.8/s | 2500 | — | tracer | High penetration energy beam, pierce 99, heavy knockback | `sniper` |
| `plasma_repeater` | 等离子连发枪 | ranged | 25 | 6.0/s | 750 | — | bullet | Bouncing plasma orbs (3 wall bounces) | `rifle` |
| `chemical_sprayer` | 化学喷射器 | ranged | 18 | 15.0/s | 450 | — | flame | Rapid toxic jet stream, pierce 99, lingering poison | `heavy` |
| `shuriken` | 影流手里剑 | ranged | 31x3 | 3.0/s | 900 | — | boomerang | 3-blade fan spread (spread 0.15), pierce 2 | `knife` |
| `chainsaw` | 狂怒电锯 | melee | 21 | 12.0/s | Melee | — | bullet | Continuous high-speed melee grind (12 hits/sec) | `sword` |

---

## 4. Requirements & Architecture for R2 Character & Weapon Sprite System

### 4.1 3/4 Dungeon Perspective & Viewport Alignment
In classic 16/32-bit pixel dungeon crawlers (e.g. *Enter the Gungeon*), characters and entities stand upright on the ground plane ($Y$), viewed from a slightly elevated $45^\circ$ angle (3/4 perspective):
* **Body Orientation**: Characters face either **Left** or **Right** (2-directional or 4-directional: Down-Right, Up-Right, Down-Left, Up-Left).
* **Ground Footprint vs. Visual Box**: The collision box is a circle or flat ellipse centered at the character's feet ($(x, y)$), while the visual sprite extends upward from $(x, y)$ toward $(y - \text{height})$.
* **Y-Sort Depth Occlusion**: Entities are sorted along the $Y$ coordinate so that lower $Y$ entities are drawn behind higher $Y$ entities.

### 4.2 Sprite Frame System & State Machine
Each character and monster requires discrete pixel animation frames:
1. **Idle**: 4-frame breathing/bobbing loop ($4 \text{ fps}$).
2. **Run / Walk**: 6-frame stepping/running animation ($10\text{--}12 \text{ fps}$).
3. **Hurt**: 1-2 frame knockback reaction with full white-palette flash overlay.
4. **Death / Downed**: 4-6 frame collapse, puff of dust, or soul dissipation.

*Implementation Mechanism*:
- Can be generated via pre-rendered PNG sprite atlas sheets OR procedural offscreen canvas pixel rasterization generators (which create crisp pixel buffers on startup, matching the zero-external-asset lightweight philosophy of the project).

### 4.3 360-Degree Independent Weapon Mount & Recoil System
Unlike the character body which only flips horizontally, weapons orbit around the character's hand anchor $(x_{\text{hand}}, y_{\text{hand}})$ in full $360^\circ$:
1. **Pivot & Offset Anchoring**:
   - Weapon grip origin $(0, 0)$ attaches to character hand position.
   - Barrel tip offset $(L_{\text{barrel}}, 0)$ determines the exact spawn location for projectiles, muzzle flashes, and ejected shell casings.
2. **Dynamic Horizontal Flipping**:
   - When aiming right ($-\frac{\pi}{2} \le \text{angle} \le \frac{\pi}{2}$): weapon is drawn right-side up (`ctx.scale(1, 1)`).
   - When aiming left ($|\text{angle}| > \frac{\pi}{2}$): weapon is flipped vertically (`ctx.scale(1, -1)`) so tops of guns/sights remain facing upward.
3. **Z-Order Layering with Body**:
   - Aiming Up ($\text{angle} \in [-\pi, 0]$): Weapon is drawn **behind** the character sprite.
   - Aiming Down ($\text{angle} \in [0, \pi]$): Weapon is drawn **in front of** the character sprite.
4. **Recoil Kickback & Tremor**:
   - Firing creates an instantaneous backward impulse vector along the firing angle: $\Delta x = -\cos(\theta) \cdot d_{\text{kick}}$, $\Delta y = -\sin(\theta) \cdot d_{\text{kick}}$ (e.g. $4\text{--}10\text{ px}$).
   - Decays back to rest position over $0.08\text{--}0.15\text{ s}$ with subtle rotational angular jitter.

---

## 5. Pixel Particle System Architecture

The existing particle system in `src/game/engine.ts` (`Particle` interface) uses basic velocity decay and circle arcs. R2 requires a unified **Retro Pixel Particle Engine**:

```
                       ┌──────────────────────────────────────┐
                       │      Pixel Particle Engine Pool      │
                       └──────────────────┬───────────────────┘
                                          │
    ┌─────────────────┬───────────────────┼───────────────────┬─────────────────┐
    ▼                 ▼                   ▼                   ▼                 ▼
[Muzzle Flash]   [Shell Casing]    [Bullet Trails]     [Blood/Debris]     [Explosions]
- Multi-ray star - 2.5D z-hop arc  - Pixel smoke puffs - Ground splatters - Pixel shock rings
- Ammo palette   - Floor bounce    - Energy sparks     - Wall debris chips- Dithered smoke
- 0.04-0.08s life- Rest & settle   - Fading tracer tips- Directional spurts- Fire bursts
```

### 5.1 Muzzle Flash System
* **Visuals**: Directional 2-3 frame pixelated starburst / cone flashes at the weapon barrel tip.
* **Palette Variations**:
  - Yellow / Orange Gunpowder: AKM, FCAR, MAC11, Shotguns.
  - Cyan / Blue Energy: Pulse, Ion Drone, Lightsaber.
  - Purple / Violet Plasma: Plasma Rifle, Railgun, Abomination.
  - Lime / Neon Green Toxic: Poison Mist, Chemical Sprayer.
* **Duration**: Very short ($0.04\text{--}0.08\text{ s}$).

### 5.2 Shell Casing Physics Ejection (2.5D Simulation)
When ranged weapons fire, a physical shell casing particle is ejected:
* **Ejection Vector**: Ejection angle $\theta_{\text{eject}} = \theta_{\text{aim}} \pm \frac{\pi}{2} + \text{random}(-0.3, 0.3)$ with initial velocity $v_{xy} = 60\text{--}140\text{ px/s}$.
* **Z-Axis Height & Gravity**:
  - Spawns at hand height $z_0 = 12\text{--}16\text{ px}$.
  - Initial upward velocity $v_z = 80\text{--}160\text{ px/s}$.
  - Gravity $g_z = -450\text{ px/s}^2$.
  - When $z \le 0$, the shell strikes the floor: $v_z \leftarrow -v_z \cdot e$ (elasticity $e \approx 0.4$), $v_{xy} \leftarrow v_{xy} \cdot 0.6$.
  - After 2 bounces, $z \leftarrow 0$, $v_{xy} \leftarrow 0$, state transitions to `landed: true`.
* **Visuals**:
  - 1x2 or 2x3 rectangular pixel sprite rotating in flight.
  - Drops a small ground shadow at $(x, y)$ while $z > 0$.
  - Once settled, rests on the dungeon floor and fades out after $4\text{--}8\text{ s}$ (or joins static ground layer).
* **Casing Types**:
  - Small Brass (9mm/Pistol/SMG)
  - Medium Copper/Steel (5.56mm/7.62mm Rifles)
  - Red / Blue Plastic Hull (Shotguns)
  - Micro Cyan Energy Battery Cell (Plasma/Laser)

### 5.3 Bullet Trails & Impact Sparks
* **Tracer Trails**: Pixel smoke puffs and fading spark particles emitted along the bullet's flight path.
* **Wall / Obstacle Ricochet Sparks**: 3-6 bright yellow/orange or cyan pixel sparks that bounce off wall collision normal vectors.

### 5.4 Blood, Slime & Debris Splatters
* **Monster Hit**: Directional blood/green acid spray in the direction of bullet impact ($+\theta_{\text{bullet}} \pm 0.4\text{ rad}$).
* **Permanent / Lingering Floor Decals**: Blood drops and acid droplets that settle on the floor and stay for several seconds before fading.
* **Destructible Prop Debris**: Wooden crate splinters and stone chips that scatter with gravity upon wall/crate destruction.

### 5.5 Pixel Explosions & Shockwaves
* **Shockwaves**: Stepped pixelated concentric expanding rings (`roundRect` / stepped diamond-circle).
* **Explosion Core**: Multi-layered dithered pixel fireballs that expand rapidly, transition from white $\to$ yellow $\to$ orange $\to$ dark smoke gray, and disperse into rising smoke particles.

---

## 6. Gap Analysis & Refactoring Recommendations

| Area | Current State | R2 Target State | Action Items |
|---|---|---|---|
| **Character Rendering** | Top-down continuous rotation (`ctx.rotate(angle)`), upside down when facing left | 3/4 Dungeon Perspective with Left/Right facing and discrete Idle/Run/Hurt/Death frames | Implement directional sprite generator / atlas with 3/4 front-side perspective |
| **Weapon Mounting** | Fixed offset on right hand, rotates with character body | Independent 360° orbital mount with dynamic horizontal flipping (`scaleY(-1)`) and recoil kick | Create weapon mount transform handler with dynamic flip & barrel anchor |
| **Z-Order Occlusion** | Flat drawing order | Y-Sort depth sorting for characters, enemies, props, and aim-dependent weapon layering | Implement Y-Sort render queue in `Renderer.ts` |
| **Muzzle Flashes** | Generic circular particles spawned at muzzle | Directional pixel starburst / cone frames matching weapon element & angle | Implement `drawPixelMuzzleFlash` integrated into gun mount tip |
| **Shell Casings** | Non-existent | 2.5D physics ejection with height $z$, gravity, floor bounce, and lingering decals | Add shell casing particle type with $z$-axis bounce simulation |
| **Monster Visuals** | Top-down polygon blocks | 3/4 pixel sprites for all 9 monster archetypes and Abomination boss | Build 3/4 pixel monster sprite frames (Idle/Walk/Hurt/Death) |
| **Particle System** | Circles / squares with simple velocity decay | Pure grid-aligned pixel particles with physics (sparks, smoke, debris, blood) | Refactor `Particle` update loop to support pixel snapping & bounce physics |

---

## 7. Conclusion

The FIRING STICKERS codebase possesses robust game mechanics, extensive weapon diversity (38 weapons), rich PvE monster behavior (9 archetypes), multiplayer networking, and solid performance. Upgrading the entity rendering and particle systems to R2 standards will deliver the desired 16/32-bit pixel dungeon shooter aesthetic (*Enter the Gungeon / Soul Knight*) without disrupting any existing game modes, weapon attributes, or network synchronization protocols.
