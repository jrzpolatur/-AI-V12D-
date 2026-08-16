# Project: 16-Bit Arcade Pixel Graphics, Dynamic Lighting & Themed World Retrofit

## Architecture
The system adopts a strict decoupling between:
1. **Authoritative Simulation Layer** (`src/game/engine.ts`, `src/net/protocol.ts`, `server/authoritative.mjs`): 30Hz fixed timestep simulation, AABB collision, weapon state machines, damage calculations, and snapshot networking. Headless guards (`if (!ctx) return;`) ensure execution without browser DOM or Canvas.
2. **2D Pixel Viewport & Rendering Pipeline** (`src/game/viewport.ts`, `src/game/renderQueue.ts`, `src/game/draw.ts`): 480×270 integer-snapped virtual pixel buffer with a 6-layer zero-GC Y-sorted render queue (Ground L0, Shadow L1, YSorted L2 with `footY` ground anchor sorting, Overhead L3, Dynamic Lighting Mask L3.5, AirborneFX L4, ScreenUI/HUD L5).
3. **Dynamic Lighting Subsystem** (`src/game/lighting.ts`): Offscreen 480×270 canvas mask filled with theme-dependent ambient darkness, using `destination-out` composite operations to carve out player lantern halos, bullet glows, explosion shockwaves, and acid highlights before compositing to virtual canvas.
4. **Interactive Props Subsystem** (`src/game/props.ts`): Dedicated entity system for portals, armory holograms, target dummies, chests, and destructible barrels, mapping visual rendering to Layer 2 and physics colliders to engine `Wall[]`.
5. **Weapon & Combat VFX System** (`src/game/pixelWeapons.ts`, `src/game/pixelParticles.ts`, `src/game/weaponMount.ts`): 38 pixel weapon models, 360° orbital mount, directional melee feedback (parry flash, rapier rail, hammer fissures, riot shield sparks), 2.5D shell physics, and CRT scanlines / off-screen radar indicators.

```
+-----------------------------------------------------------------------------------+
|                              Client Rendering Loop                                |
|                                                                                   |
|  [ Layer 0: Ground Tiles ] -> [ Layer 1: Shadows ] -> [ Layer 2: Y-Sorted Props/  |
|                                                          Entities/Players ]       |
|                                                                                   |
|  -> [ Layer 3: Overhead ] -> [ Dynamic Lighting Mask (destination-out) ]         |
|                                                                                   |
|  -> [ Layer 4: AirborneFX / Beams / Explosions ] -> [ Layer 5: ScreenUI / Radar ] |
|                                                                                   |
|  -> [ CRT Scanlines & Retro Filter Post-Process ] -> Blit to Screen Canvas        |
+-----------------------------------------------------------------------------------+
                                         ^
                                         | snapshot / local state
+-----------------------------------------------------------------------------------+
|                        Authoritative GameEngine / Server                          |
|  - Physics & AABB Collisions (`Wall[]`, `Props[]`)                                |
|  - 30Hz Fixed Timestep & Snapshot Replication                                     |
|  - Headless-safe (Zero DOM / Canvas Dependencies)                                |
+-----------------------------------------------------------------------------------+
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F01 | Modular Helmet & Glowing Visor | 7 hat types with pulsating cyber visors and animated emission | M1 | ORIGINAL_REQUEST §R1 |
| F02 | Multi-layer Cloak & Armor | Layered cape with shadow depth, chestplate, shoulder pads | M1 | ORIGINAL_REQUEST §R1 |
| F03 | Gait Bobbing & Run Animation | 6-frame stepping with vertical bobbing and stepped drop shadow | M1 | ORIGINAL_REQUEST §R1 |
| F04 | Hurt White Flash & Status FX | Pure white silhouette flash upon taking damage | M1 | ORIGINAL_REQUEST §R1 |
| F05 | Dashed Shield Forcefield Halo | Octagonal dashed shield boundary with rotating corner nodes | M1 | ORIGINAL_REQUEST §R1 |
| F06 | Golden Protection Ring | Golden concentric radiant ring on respawn invulnerability | M1 | ORIGINAL_REQUEST §R1 |
| F07 | Stealth Refraction Transparency | Ghostly refractive silhouette with corner glitch marks for cloaking | M1 | ORIGINAL_REQUEST §R1 |
| F08 | Dynamic Lighting Offscreen Mask | 480×270 reusable buffer with `destination-out` light carving | M2 | ORIGINAL_REQUEST §R2 |
| F09 | 5-Theme Ambient Darkness | Presets for Dark Night, Ice Outpost, Wild West, Cyber City, Dungeon | M2 | ORIGINAL_REQUEST §R2 |
| F10 | Player Ambient Lantern Halo | Breathing flicker radius with forward aim-cone illumination bias | M2 | ORIGINAL_REQUEST §R2 |
| F11 | Bullet Glow & Projectile Trail | Dynamic light punchout traveling with bullets & plasma bolts | M2 | ORIGINAL_REQUEST §R2 |
| F12 | Explosion Shockwave Punchout | Expanding light circle revealing ground on detonations | M2 | ORIGINAL_REQUEST §R2 |
| F13 | Acid Pool & Hazard Luminescence | Soft green toxic luminescence around slime and chemical pools | M2 | ORIGINAL_REQUEST §R2 |
| F14 | 5-Themed Procedural Tilemaps | Custom palettes & ground textures for all 5 map environments | M3 | ORIGINAL_REQUEST §R3 |
| F15 | Interactive Pixel Props Engine | Dedicated prop registry, lifecycle, HP, crack overlays, loot | M3 | ORIGINAL_REQUEST §R3 |
| F16 | Signature Base Props | Warp Portal, Armory Hologram Pedestal, Orbital Target Dummy | M3 | ORIGINAL_REQUEST §R3 |
| F17 | Destructible Barrels & Chests | Explosive, Cryo, and Acid barrels with particle debris & effects | M3 | ORIGINAL_REQUEST §R3 |
| F18 | Prop Physics & Y-Sorting | Decoupled AABB collision boxes with ground anchor `footY` sorting | M3 | ORIGINAL_REQUEST §R3 |
| F19 | 38-Weapon Pixel Model Arsenal | Complete 16-bit pixel models for all guns & melee weapons | M4 | ORIGINAL_REQUEST §R4 |
| F20 | Melee Combat Special FX | Dual blade parry flash, rapier charge rail, hammer fissures, shield sparks | M4 | ORIGINAL_REQUEST §R4 |
| F21 | Enhanced Particle Pool | Zero-GC 512-slot pool with 2.5D shell casings, embers, smoke, blood | M4 | ORIGINAL_REQUEST §R4 |
| F22 | Off-Screen Enemy Radar Arrows | Screen-edge directional indicator arrows tracking distant foes | M4 | ORIGINAL_REQUEST §R4 |
| F23 | CRT Scanline & Retro Styling | Toggleable scanline shader/canvas overlay and retro typography | M4 | ORIGINAL_REQUEST §R4 |
| F24 | E2E & Headless System Integrity | Full test suite pass, zero TypeScript errors, 60 FPS zero-GC | M5 | ORIGINAL_REQUEST §Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Arcade Pixel Character & Animation | F01–F07: Modular hats/visors, cloak/armor, bobbing, hurt flash, shield, golden ring, stealth | None | DONE |
| M2 | Dynamic Lighting & Ambient Lantern | F08–F13: `src/game/lighting.ts`, Canvas mask, destination-out, 5 darkness themes, lantern, bullets, explosions, acid | None | IN_PROGRESS |
| M3 | 5-Themed Tiles & Interactive Props | F14–F18: `src/game/props.ts`, `src/game/tilemap.ts`, 5 themes, base props, barrels, chests, collision | None | PLANNED |
| M4 | Pixel Weapons, Combat FX & HUD | F19–F23: `src/game/pixelWeapons.ts`, `src/game/pixelParticles.ts`, melee FX, radar arrows, CRT scanlines | M1 | PLANNED |
| M5 | E2E Test Suite & Adversarial Final Verification | F24: Pass 100% E2E tests (Tiers 1-4), Tier 5 adversarial stress verification, build & headless checks | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### `src/game/lighting.ts` (PixelLightingSystem)
```typescript
export interface LightSource {
  x: number;
  y: number;
  radius: number;
  intensity: number; // 0.0 to 1.0
  color?: string;
  coneAngle?: number; // radians for directional lantern
  coneDir?: number;   // aim angle in radians
}

export class PixelLightingSystem {
  constructor(width?: number, height?: number);
  resize(width: number, height: number): void;
  setTheme(theme: string | number): void;
  beginFrame(): void;
  addLight(light: LightSource): void;
  addBulletLight(x: number, y: number, radius?: number, color?: string): void;
  addExplosionLight(x: number, y: number, progress: number, maxRadius: number): void;
  addHazardGlow(x: number, y: number, radius: number, color?: string): void;
  renderMask(worldCameraX: number, worldCameraY: number): void;
  composite(targetCtx: CanvasRenderingContext2D, renderX?: number, renderY?: number): void;
  dispose(): void;
}
```

### `src/game/props.ts` (PixelPropsSystem)
```typescript
export interface PixelProp {
  id: string;
  type: 'portal' | 'armory_holo' | 'target_dummy' | 'crate' | 'chest_treasure' | 'chest_bio' | 'barrel_explosive' | 'barrel_cryo' | 'barrel_acid';
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  active: boolean;
  solid: boolean;
  animTimer: number;
  theme: string;
}

export class PixelPropsSystem {
  constructor();
  initSceneProps(theme: string, bounds: { width: number; height: number }, walls: any[]): PixelProp[];
  damageProp(prop: PixelProp, amount: number, engine: any): boolean;
  update(dt: number, engine: any): void;
  drawProp(ctx: CanvasRenderingContext2D, prop: PixelProp, tick: number): void;
}
```

## Code Layout
- `src/game/draw.ts`: Modular pixel character, hats, visors, armor, cloak, and status effects. (Done in M1)
- `src/game/lighting.ts`: New `PixelLightingSystem` for dynamic darkness mask and `destination-out` light carving. (In Progress M2)
- `src/game/props.ts`: New `PixelPropsSystem` for interactive map props and destructibles. (Planned M3)
- `src/game/tilemap.ts`: Procedural tilemap with 5 theme palettes and custom floor patterns. (Planned M3)
- `src/game/pixelWeapons.ts`: 38 pixel weapon models and icon renderer. (Planned M4)
- `src/game/pixelParticles.ts`: Zero-GC 512-slot particle engine with 2.5D casings and debris. (Planned M4)
- `src/game/weaponMount.ts`: 360° weapon orbital positioning and aiming calculations.
- `src/game/viewport.ts`: Virtual pixel viewport and 2-stage coordinate transformation.
- `src/game/renderQueue.ts`: 6-layer Y-sorted ground contact render queue.
- `src/game/engine.ts`: Core game engine integrating simulation, subsystems, and rendering pipeline.
- `tests/e2e/runner.mjs`: Requirement-driven E2E test runner (Tiers 1-4).
- `scripts/stress-e2e-challenger.mjs`: Adversarial stress and endurance verification suite.
