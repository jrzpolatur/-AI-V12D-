# Scope: Milestone 2 — Character & Weapon Sprite Sheet Animation System (R2)

## Architecture & Responsibilities
- Sprite rendering system: 3/4 top-down perspective character and monster sprites with Idle, Run, Hurt, Death animation states.
- 4 Player Archetypes: Raider, Juggernaut, Phantom, Sentinel.
- 9 Monster Types: Walker, Runner, Brute, Spitter, Abomination Boss, Crawler, Bloater, Screamer, Spore.
- 15 Outfits & 8 Hats pixel styling in 3/4 pixel dungeon aesthetic.
- 360° Orbital Weapon Mount (`src/game/weaponMount.ts`): independent weapon rotation around hand pivot, dynamic flip `scaleY(-1)` when aiming left ($\pi/2 < |\theta| \le \pi$), aim-dependent depth sorting (behind body when aiming upward, in front when aiming downward).
- Weapon Recoil Kick & Tremor: recoil displacement along $-\theta_{\text{aim}}$ with angular decay jitter.
- Directional Muzzle Flashes: pixel starburst / cone muzzle flash matching weapon element & angle at gun barrel tip.
- 2.5D Shell Casing Physics (`src/game/pixelParticles.ts`): ejected casings with initial $v_z$, gravity, floor bounce restitution, resting decals.
- Bullet Trails & Impact Sparks: pixel smoke puffs, energy tracer trails, wall collision spark bursts.
- Blood & Debris Splatters: directional blood/acid splatters and destructible chunk debris.
- Pixel Explosion Shockwaves: stepped pixelated expanding rings, fireballs, rising dithered smoke.
- 38 Weapons Arsenal Visuals: crisp pixel dungeon rendering for all 38 weapons in `data/guns.json`.
- Integration into `src/game/engine.ts` and `src/game/draw.ts` submitting all world rendering calls to `engine.renderQueue` using `RenderLayer` enum (`Ground`, `Decals`, `YSorted`, `AirborneFX`, `LightingOverlay`, `UI`).

## Feature Inventory Mapping
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F08 | Character 3/4 Sprite System | Idle, Run, Hurt, Death animation states for 4 player archetypes (Raider, Juggernaut, Phantom, Sentinel) | M2 | Request |
| F09 | Monster 3/4 Sprite System | Idle, Run, Hurt, Death for all 9 monster types (Walker, Runner, Brute, Spitter, Abomination Boss, Crawler, Bloater, Screamer, Spore) | M2 | Request |
| F10 | Outfit & Hat Pixel Styling | 15 outfits and 8 hats rendered in 3/4 pixel dungeon aesthetic | M2 | Request |
| F11 | 360° Orbital Weapon Mount | `src/game/weaponMount.ts`, independent weapon rotation, dynamic flip scaleY(-1), aim-dependent depth sorting | M2 | Request |
| F12 | Weapon Recoil Kick & Tremor | Recoil displacement along $-\theta_{\text{aim}}$ with angular decay jitter | M2 | Request |
| F13 | Directional Muzzle Flashes | Pixel starburst / cone muzzle flash matching weapon element & angle at gun barrel tip | M2 | Request |
| F14 | 2.5D Shell Casing Physics | `src/game/pixelParticles.ts`, ejected casings with initial $v_z$, gravity, floor bounce restitution, decals | M2 | Request |
| F15 | Bullet Trails & Impact Sparks | Pixel smoke puffs, energy tracer trails, wall collision spark bursts | M2 | Request |
| F16 | Blood & Debris Splatters | Directional blood/acid splatters and destructible chunk debris | M2 | Request |
| F17 | Pixel Explosion Shockwaves | Stepped pixelated expanding rings, fireballs, rising dithered smoke | M2 | Request |
| F18 | 38 Weapons Arsenal Visuals | Crisp pixel dungeon rendering for all 38 weapons in `data/guns.json` | M2 | Request |

## Code Layout Ownership
- `src/game/sprites.ts`: Procedural pixel sprite generation and sprite sheet / animation cache for characters, monsters, outfits, hats.
- `src/game/weaponMount.ts`: Weapon rendering, pivot orbital math, recoil kick, barrel flash coordinates, aim flip, depth sorting.
- `src/game/pixelParticles.ts`: High performance particle pool for 2.5D casings, bullet trails, sparks, blood/acid, chunk debris, shockwaves.
- `src/game/draw.ts`: Rendering dispatcher and helper methods integrating sprite drawer and particle drawer into renderQueue.
- `src/game/engine.ts`: Game engine lifecycle updates for particles, animation frames, weapon mount state, and renderQueue flushing.
