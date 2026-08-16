## 2026-08-15T12:00:15Z

You are Explorer 1 for the E2E Testing Track of FIRING STICKERS 16/32-Bit Pixel Dungeon Shooter Refactor.
Your working directory is: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_e2e\explorer_1\

Please read:
- c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\ORIGINAL_REQUEST.md
- c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\PROJECT.md
- c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\TEST_INFRA.md

Your Task:
Investigate Features F01 through F18:
- F01: Fixed Virtual Viewport Buffer (480x270 virtual canvas)
- F02: Integer Nearest-Neighbor Blit
- F03: 2-Stage Coordinate Mapping (Screen -> Virtual -> World)
- F04: Integer Camera Snapping
- F05: Zero-GC Y-Sort Render Queue (Layers 0-5, sortY=footY)
- F06: 3/4 Perspective Wall Split (Top Face overhead, Front Face Y-sorted, Collision)
- F07: Headless Canvas Guard (Rendering safely skipped when ctx === null or headless)
- F08: Character 3/4 Sprite System (Idle, Run, Hurt, Death for 4 archetypes)
- F09: Monster 3/4 Sprite System (9 monster archetypes + Abomination Boss)
- F10: Outfit & Hat Pixel Styling (15 outfits, 8 hats)
- F11: 360 Orbital Weapon Mount (recoil, angle, flip on left aim)
- F12: Weapon Recoil Kick & Tremor
- F13: Directional Muzzle Flashes
- F14: 2.5D Shell Casing Physics (vz height, gravity, floor bounce restitution, decals)
- F15: Bullet Trails & Impact Sparks
- F16: Blood & Debris Splatters
- F17: Pixel Explosion Shockwaves
- F18: 38 Weapons Arsenal Visuals & data (check data/guns.json, weapon types)

Examine existing files in `src/game/` (e.g. `engine.ts`, `types.ts`, `content.ts`, `viewport.ts`, `renderQueue.ts`, `sprites.ts`, `weaponMount.ts`, `pixelParticles.ts`, `draw.ts`, `data/guns.json`).
Analyze how these features can be tested in an opaque-box requirement-driven way across:
1. Tier 1 (Feature coverage: >=5 happy path tests per feature)
2. Tier 2 (Boundary & Corner cases: >=5 tests per feature, e.g. scale=0/negative/fractional, extreme coordinates, maximum sort entities, null contexts, 360 deg wrap, extreme recoil, max particles, boundary shells, zero ammo, missing textures)
3. Combinations & Workloads

Produce a comprehensive investigation report and save it to:
`c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_e2e\explorer_1\analysis.md`
And write `c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_e2e\explorer_1\handoff.md`.
Send a message when complete.
