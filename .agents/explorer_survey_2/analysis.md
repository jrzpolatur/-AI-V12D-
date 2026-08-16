# Codebase Survey & Gap Analysis Report: R2 (Dynamic Lighting) & R3 (5-Themed Tiles & Props)

**Survey Agent**: Explorer (Survey Agent 2)  
**Date**: 2026-08-16  
**Project**: 2D Shooter (16-Bit Arcade Pixel Refactor)  
**Scope**: 
1. **R2: Dynamic Lighting & Ambient Lantern System**
2. **R3: Multi-Themed Pixel Tiles & Props System (5 Themes & Pixel Props)**

---

## Executive Summary

This survey provides a comprehensive architectural and codebase analysis for implementing **R2 (Dynamic Lighting & Ambient Lantern)** and **R3 (5-Themed World Tiles & Pixel Props)** into the 2D Shooter engine.

Currently:
- **Lighting (R2)**: There is **no dynamic lighting pass** or canvas masking system in the codebase. Only crude flat screen-space overlays for time-of-day/weather exist. There are no player lantern halos, bullet glows, explosion shockwave punchouts, or theme-specific ambient darkness masks using `destination-out`.
- **Tiles & Props (R3)**: `src/game/tilemap.ts` exists in basic form (supporting generic stone/metal/wood/dirt), but lacks multi-theme ground patterns, biome autotiling, and distinct palettes for the 5 target environments. `src/game/props.ts` does **not exist yet**; interactive/destructible props (portals, armory holograms, orbital targets, interactive crates, chests, explosive/acid barrels) are missing or rudimentary.

Below is the detailed mapping of existing source files, architectural blueprints, interface contracts, collision models, and step-by-step implementation roadmaps for both R2 and R3.

---

## 1. R2: Dynamic Lighting & Ambient Lantern System

### 1.1 Current Architecture & Identified Gaps

| Component | Current State | Required State (R2) | Gap / Missing Implementation |
|---|---|---|---|
| **Lighting Pipeline** | No lighting pipeline. Direct draw to canvas. | Offscreen lighting mask with `destination-out` punchouts & ambient darkness. | Need `PixelLightingSystem` with virtual resolution buffer (480×270) & zero-GC reuse. |
| **Ambient Darkness** | Flat screen rect in `drawWeatherOverlays` with `rgba(10,15,35,0.28)`. | Theme-driven ambient darkness with color tints (Deep Blue, Glacial Day, Western Dusk, Biohazard Slime Green, Cyber Neon Midnight). | Missing per-theme ambient darkness configuration and uniform background mask fill. |
| **Player Lantern Halo** | None. Player is drawn without lighting emission. | 16-bit smooth radial falloff halo centered on player, breathing pulse, forward aim bias. | Missing lantern light source emitter, radial gradient cache, and punchout logic. |
| **Bullet Glow** | Small additive pixel core in `drawBullets`, no darkness carving. | High-luminance radial punchouts tracking projectile heads with weapon-tinted colors. | Missing bullet light registration in lighting pass. |
| **Explosion Shockwaves** | Visual particle ring in `pixelParticles.ts` and `engine.ts`, no lighting impact. | Dynamic expanding light shockwave carving away ambient darkness during detonation. | Missing explosive flash & shockwave light expansion in lighting pass. |
| **Acid Pool Highlights** | Static green rects in `drawFieldEffects`. | Emissive green glow punching out soft light around toxic puddles. | Missing acid pool light registration. |
| **Layer Ordering** | All elements flushed directly to canvas. | Lighting mask applied over World YSorted/Overhead, below high-emissive AirborneFX/Lasers/ScreenUI. | Need exact placement in `RenderQueue` flushing order. |

---

### 1.2 Proposed Dynamic Lighting Architecture (`src/game/lighting.ts`)

#### A. Offscreen Buffer & Zero-GC Memory Design
- Dedicated offscreen canvas (`lightCanvas` + `lightCtx`) created once at virtual viewport resolution (480×270 or configured virtual dimensions).
- In headless/server mode (`document === undefined` or `ctx === null`), all lighting code is safely bypassed with zero overhead.
- Cached radial gradients: Pre-allocated gradient lookup table parameterized by `(radius, innerColor, outerColor)` to eliminate runtime allocation.

#### B. 5 Theme Ambient Darkness Presets
```ts
export interface AmbientLightingPreset {
  color: string;      // Base ambient hex/rgb
  darkness: number;   // 0.0 (full bright day) to 1.0 (pitch black)
  ambientTint: string;// CSS color string for full-screen mask fill
  lanternRadius: number; // Base player lantern radius in pixels
  lanternColor: string;  // Light color (warm amber, cool cyan, etc.)
  flickerSpeed: number;  // Ambient light flicker rate
}

export const THEME_LIGHTING_PRESETS: Record<string, AmbientLightingPreset> = {
  lobby: {
    color: "#0a1020",
    darkness: 0.35,
    ambientTint: "rgba(10, 16, 32, 0.35)",
    lanternRadius: 180,
    lanternColor: "rgba(255, 240, 200, 1)",
    flickerSpeed: 2.0,
  },
  ice_outpost: {
    color: "#08182b",
    darkness: 0.25, // Bright daytime snow with subtle cold fog
    ambientTint: "rgba(8, 24, 43, 0.25)",
    lanternRadius: 160,
    lanternColor: "rgba(200, 240, 255, 1)",
    flickerSpeed: 1.5,
  },
  wild_west: {
    color: "#261005",
    darkness: 0.60, // Sunset dusk / twilight
    ambientTint: "rgba(38, 16, 5, 0.60)",
    lanternRadius: 200,
    lanternColor: "rgba(255, 180, 80, 1)",
    flickerSpeed: 4.5,
  },
  cyber_city: {
    color: "#08041a",
    darkness: 0.78, // Dark cyber night with high contrast neon
    ambientTint: "rgba(8, 4, 26, 0.78)",
    lanternRadius: 170,
    lanternColor: "rgba(0, 240, 255, 1)",
    flickerSpeed: 3.0,
  },
  biohazard_dungeon: {
    color: "#041408",
    darkness: 0.85, // Pitch-dark dungeon with toxic green luminescence
    ambientTint: "rgba(4, 20, 8, 0.85)",
    lanternRadius: 150,
    lanternColor: "rgba(163, 230, 53, 1)",
    flickerSpeed: 5.0,
  },
};
```

#### C. Light Punchout Mechanism (`destination-out`)
1. **Clear**: `lightCtx.clearRect(0, 0, virtualW, virtualH)`
2. **Fill Ambient Darkness**: `lightCtx.fillStyle = preset.ambientTint; lightCtx.fillRect(0, 0, virtualW, virtualH)`
3. **Begin Punchouts**: `lightCtx.globalCompositeOperation = "destination-out"`
4. **Draw Light Sources**:
   - **Player Lantern**: Radial gradient from `rgba(0,0,0,1)` at center to `rgba(0,0,0,0)` at `lanternRadius * (1 + 0.04 * sin(time * flickerSpeed))`. Forward offset along player `aimAngle` creates natural directional torch illumination.
   - **Active Bullets**: Punchout circle radius 20-50px at `(bullet.x - camX, bullet.y - camY)`.
   - **Explosion Flash & Shockwaves**: Radial punchout scaling up to `radius * 2.2` during initial explosion frames (`t < 0.25`).
   - **Acid Pools / Firefields**: Punchout ovals with bubbling/pulsing radius over ground hazards.
   - **Fixed Scene Props**: Street lanterns (`drawPixelStreetLantern`), base power crystals, tech terminals.
5. **Reset & Blit**: Reset `lightCtx.globalCompositeOperation = "source-over"`.
   In main render pipeline: Blit `lightCanvas` onto game frame canvas with `ctx.drawImage(lightCanvas, 0, 0)`.

---

### 1.3 Rendering Pipeline Layer Integration

The dynamic lighting pass integrates seamlessly into the 6-layer `RenderQueue`:

```
=============================================================
Layer 0: Ground (Floor tiles, paths, craters, decals)
Layer 1: Shadows (Contact drop shadows of entities & walls)
Layer 2: YSorted Entities (Walls front face, props, characters, enemies, deployables, pickups)
Layer 3: Overhead Structures (Wall tops, roof overhangs, tree canopies)
-------------------------------------------------------------
>>> DYNAMIC LIGHTING MASK PASS <<< (Blitted over World layers)
- Darkens world based on theme ambient level
- Punches out holes for player lantern, bullets, explosions, acid pools
-------------------------------------------------------------
Layer 4: AirborneFX & Emissive (Lasers, energy beams, muzzle flashes, sparks, high-luminance tracer particles)
Layer 5: ScreenUI & HUD (Pixel HP gauges, ammo pips, minimap radar, damage numbers, CRT scanlines)
=============================================================
```

*Note: Placing Layer 4 (AirborneFX/Lasers/Muzzle Flashes) **above** the lighting mask ensures energy weapons, lightning bolts, and fire cones glow brightly through the darkness, creating high-contrast arcade visual appeal.*

---

## 2. R3: Multi-Themed Pixel Tiles & Props System

### 2.1 5 Target Themes Mapping & Specifications

| Theme ID | Name (ZH/EN) | Visual Aesthetics & Ground Materials | Signature Buildings & Walls | Signature Pixel Props |
|---|---|---|---|---|
| `lobby` | 大厅基地 / Lobby Base | Clean steel plates, high-tech asphalt, yellow/black hazard perimeter stripes, docking pads | High-tech reinforced alloy bunker, blue LED conduits, sliding security bulkhead | **传送门 (Warp Portal)**, **军械库全息台 (Armory Hologram)**, **轨道标靶 (Orbital Targets)**, Security Barricades |
| `ice_outpost` | 冰原前哨 / Ice Outpost | Compacted glacial ice, cracked permafrost, snowdrifts, anti-slip metal grating | Arctic research stations, frosted steel walls, heated doorway frames | **防冻补给箱 (Arctic Crates)**, **冰封油桶 (Cryo Barrels)**, Radar Dish Antennae, Weather Stations |
| `wild_west` | 狂野西部 / Wild West | Ochre desert sand, cracked clay, dusty dirt trails, saloon boardwalks | Timber saloon facades, frontier cabin shops, adobe fort walls | **木质货箱 (Wooden Crates)**, **老旧酒桶 (Oak Barrels)**, **藏宝箱 (Treasure Chests)**, Windmill, Well |
| `cyber_city` | 废弃未来都市 / Cyber City | Wet neon asphalt, grid roadway markings, puddle reflections, neon grates | Brutalist skyscrapers, neon trim rooftops, electronic server towers | **高能电浆桶 (Plasma Barrels)**, **能量补给箱 (Tech Crates)**, Holographic Roadblocks, Terminal Consoles |
| `biohazard_dungeon` | 生化废墟地牢 / Biohazard Dungeon | Corrosive acid-etched stone slabs, toxic slime waterways, necrotic moss tiles | Ancient mossy stone crypt walls, rusted iron portcullises | **生化辐射桶 (Acid Barrels)**, **腐化宝箱 (Corrupted Chests)**, Incubation Vats, Bone Piles |

---

### 2.2 Tilemap Architecture (`src/game/tilemap.ts`)

#### A. Enhanced Autotiling & Multi-Biome Palettes
`PixelTilemap` needs to expand from 4 basic styles to 5 full theme palettes with procedural generation:
1. **Floor Palettes**:
   - `lobby`: Steel alloy base (`#334155`), seam grid (`#1e293b`), hazard warning accent (`#eab308`).
   - `ice_outpost`: Ice base (`#7dd3fc`), frost crack (`#38bdf8`), permafrost dark (`#0369a1`), snow accent (`#ffffff`).
   - `wild_west`: Ochre dirt (`#b45309`), dry sand (`#d97706`), clay crack (`#78350f`), pebble accent (`#fde047`).
   - `cyber_city`: Wet asphalt (`#0f172a`), cyber grid (`#1e293b`), neon line accent (`#00f0ff` / `#f43f5e`).
   - `biohazard_dungeon`: Crypt flagstone (`#27272a`), slime seam (`#166534`), corrosive crack (`#14532d`), toxic speck (`#84cc16`).

#### B. Wall 3/4 Perspective Splitting
- **Top Face (Overhead Layer 3)**: Overhead horizontal projection drawn after Y-sorted entities, giving top-down depth.
- **Front Face (YSorted Layer 2)**: Vertical face with brickwork/panel rivets, sorted at `footY = wall.y + wall.h`.
- **Corner & Edge Autotiling**: 4-bit bitmasking (NESW) generates seamless inner/outer corner outlines.

---

### 2.3 Interactive & Destructible Pixel Props System (`src/game/props.ts`)

`props.ts` will be created to manage all 5-theme props with full visual, collision, and destruction logic.

#### A. Prop Interface Contract
```ts
export type PropTheme = "lobby" | "ice_outpost" | "wild_west" | "cyber_city" | "biohazard_dungeon";

export type PropKind =
  // Lobby Base
  | "portal_gate"
  | "armory_hologram"
  | "orbital_target"
  // General & Theme-Specific Destructibles
  | "crate_wood"
  | "crate_tech"
  | "crate_arctic"
  | "barrel_explosive"
  | "barrel_cryo"
  | "barrel_acid"
  | "chest_treasure"
  | "chest_corrupted"
  | "incubation_vat"
  | "street_lantern"
  | "water_well";

export interface PropDef {
  kind: PropKind;
  theme: PropTheme;
  name: string;
  w: number;           // Visual width
  h: number;           // Visual height
  collisionW: number;  // Physical collider width
  collisionH: number;  // Physical collider height
  maxHp: number;       // >0 for destructible, Infinity for indestructible
  destructible: boolean;
  material: "wood" | "metal" | "stone" | "glass" | "organic";
  isLightSource?: boolean;
  lightRadius?: number;
  lightColor?: string;
}

export interface ActiveProp {
  id: number;
  kind: PropKind;
  theme: PropTheme;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  destructible: boolean;
  footY: number; // Ground contact point for Layer 2 Y-sorting
  animTime: number;
  state: "idle" | "hit" | "opening" | "destroyed";
  def: PropDef;
}
```

#### B. Detailed Behavior of Signature Props
1. **传送门 (Warp Portal)** (`lobby`):
   - Visual: 2.5D elliptical vortex with rotating accretion particle ring and pulsating blue/purple core.
   - Lighting: Emits radial blue light halo (radius 120px).
   - Collision: Solid pillar base with pass-through trigger center.
2. **军械库全息台 (Armory Hologram)** (`lobby`):
   - Visual: Hexagonal chrome podium projecting a rotating 3D wireframe weapon (pistol/rifle) with horizontal scanlines.
   - Lighting: Emits subtle cyan holographic glow (radius 90px).
   - Interaction: Interacting or stepping near cycles weapon preview.
3. **轨道标靶 (Orbital Target Dummy)** (`lobby`):
   - Visual: Concentric yellow/red bullseye dummy on high-tension steel spring.
   - Collision: Cylindrical hitbox (32×32).
   - Dynamic: Takes damage, tilts back and wobbles with spring oscillation (`sin(t * 18) * decay`), displays popping damage numbers without taking fatal destruction.
4. **木箱 / 科技箱 / 防冻箱 (Crates)**:
   - Visual: Distinct 16-bit pixel textures per theme (wood planks with nails, carbon-fiber panels with status LEDs, frosted thermal crates).
   - Collision: 36×36 square collider.
   - Destruction: HP 80-150. Emits splinter debris chunks (`emitDebris`), plays breaking sound, has 40% chance to drop first aid kit / ammo pickup.
5. **爆炸桶 / 冰冻桶 / 酸液桶 (Barrels)**:
   - Visual: Red hazard drum (explosive), Cyan insulated canister (cryo), Fluorescent green radioactive drum (acid).
   - Collision: 28×28 collider.
   - Destruction: Explodes upon reaching 0 HP, triggering area damage, radial shockwave, dynamic light flash, and spawning lingering field effects (firefield, cryo-slow frost, or acid puddle).
6. **宝箱 / 腐化宝箱 (Chests)**:
   - Visual: Golden latched chest or bio-organic chest with pulsing eye.
   - Destruction / Opening: Pops open with upward golden coin fountain (`emitCoinSparkle`), awarding gold points.

---

### 2.4 Collision Geometry vs Visual Rendering Separation

A crucial architectural principle for R3 is strict separation between **Physics Collision Geometry** and **Visual 3/4 Perspective Rendering**:

```
+------------------------------------------+  <-- Visual Top (e.g. y - 24)
|         3/4 Visual Sprite Top            |      (Rendered in YSorted Layer 2)
|       (Hologram, Tree Canopy, Arch)      |
+------------------------------------------+
|                                          |
|        +------------------------+        |  <-- Collision Box Top (y)
|        |                        |        |
|        |   PHYSICS COLLIDER     |        |      (Used for engine movement,
|        |  (AABB / Circle in     |        |       bullets, pathfinding A*)
|        |   engine.ts & server)  |        |
|        |                        |        |
|        +------------------------+        |  <-- Collision Box Bottom (y + h)
|                                          |
+------------------------------------------+  <-- footY Anchor (y + h)
                 (Ground Contact)                 (Determines YSort Layer 2 order)
```

**Key Invariants**:
1. **Simulation Determinism**: Physics colliders remain clean AABB rectangles or circles. The server simulation (`server/authoritative.mjs`) computes collisions solely using `(x, y, w, h)` without loading canvas rendering assets.
2. **True Y-Sorting**: Entities and props sort strictly by their ground contact line (`footY = y + h`). When the player walks above a prop (`player.y + player.size < prop.footY`), the prop renders in front of the player. When the player walks below (`player.y + player.size > prop.footY`), the player renders in front of the prop.
3. **No Collision Glitches**: Bullets collide with the exact physical bounding box, while explosion shockwaves and light halos cast across the full visual footprint.

---

## 3. Codebase File Map & Modification Checklist

### New Modules to Create:
1. `src/game/lighting.ts`:
   - `PixelLightingSystem` class.
   - Offscreen light buffer management (480×270 virtual resolution).
   - Theme ambient darkness presets.
   - `destination-out` light carving for player lantern, bullet glow, explosions, acid pools, street lights.
   - Layer compositing functions.
2. `src/game/props.ts`:
   - `PixelPropsSystem` class.
   - Prop definitions, visual rendering routines, and state machines for all 5 themes (portals, holograms, targets, crates, barrels, chests, terminals, vats).
   - Debris, particle, and pickup drop hooks on destruction.

### Existing Modules to Update:
3. `src/game/tilemap.ts`:
   - Add 5-theme floor palettes and procedural pattern generators (asphalt, ice floes, desert sand, crypt stone, tech panels).
   - Enhance autotiling bitmasking and cached ground canvas generation.
4. `src/game/systems/Renderer.ts` & `src/game/engine.ts`:
   - Wire `PixelLightingSystem` into main render loop and `renderNet` between Layer 3 (Overhead) and Layer 4 (AirborneFX).
   - Replace legacy hardcoded wall/prop routines with `PixelPropsSystem`.
   - Update `buildWalls()` to generate theme-specific props and layouts.
5. `src/game/content.ts` & `src/components/LoadoutScreen.tsx`:
   - Align `SCENES` and `ADVANCED_MAP_THEMES` to the 5 standard themes (`lobby`, `ice_outpost`, `wild_west`, `cyber_city`, `biohazard_dungeon`).

---

## 4. Verification & Testing Strategy

1. **Compilation & Build**:
   - `npx tsc --noEmit` to verify strict TypeScript type compliance.
   - `npm run build:engine` to verify esbuild bundle builds cleanly for headless Node.js server.
   - `npm run build` to verify Vite bundle packaging.
2. **Headless & Multiplayer Compatibility**:
   - Run `node tests/stress_m1_renderqueue_headless.mjs` to ensure zero DOM/Canvas dependencies in server mode.
   - Run `node scripts/smoke-server.mjs` and `node scripts/smoke-ws.mjs` to ensure snapshot synchronization is intact.
3. **Visual & Performance Benchmark**:
   - Verify Canvas loop runs at stable 60 FPS on virtual 480×270 buffer without GC spikes.
   - Inspect dynamic lighting mask rendering across all 5 map themes (darkness contrast, lantern falloff, bullet glows, explosion shockwaves).
   - Verify prop collision vs visual Y-sorting behavior (player walks smoothly behind and in front of all props).
