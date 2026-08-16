## 2026-08-15T12:28:18Z
You are Explorer 2 for Milestone 2 (Character & Weapon Sprite Sheet Animation System).
Your working directory is: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_m2\explorer_2
Project root: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini
User Request file: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\ORIGINAL_REQUEST.md
Project specification: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\PROJECT.md
Milestone scope: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_m2\SCOPE.md

Your Task:
Investigate codebase architecture and design requirements for:
- F11: 360° Orbital Weapon Mount (`src/game/weaponMount.ts`, pivot offset math, dynamic flip scaleY(-1) when aiming left, aim angle depth sorting: behind body when aiming up, in front when aiming down)
- F12: Weapon Recoil Kick & Tremor (displacement along -theta with angular decay jitter)
- F13: Directional Muzzle Flashes (pixel starburst / cone muzzle flash matching weapon element & angle at gun barrel tip)
- F18: 38 Weapons Arsenal Visuals (rendering all 38 weapons in `data/guns.json` in crisp pixel dungeon aesthetic)

Inspect `data/guns.json`, weapon types, engine rendering queue, and coordinate transformations.
Produce a detailed technical plan and recommendations in `c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\sub_orch_m2\explorer_2\handoff.md` with:
- Complete math for orbital weapon placement, hand pivots, muzzle tip position calculation in world space
- Categorization and procedural pixel drawing specs for all 38 weapons (Pistols, SMGs, Shotguns, Rifles, Heavy, Energy, Exotic, Melee)
- Recoil spring / damping physics model and screen tremor integration
- Muzzle flash generation (color palettes by element: Kinetic, Fire, Plasma, Toxic, Void, Shock)
- RenderQueue integration and draw sorting
When done, send a message to parent with path to your handoff.md.
