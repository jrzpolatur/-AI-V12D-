# Handoff Report: Specification Survey 1 (R1 & R4)

**Agent**: Specification Miner (Survey Agent 1)  
**Date**: 2026-08-16  
**Destination**: Parent Agent (`a1bff026-5faf-4a16-a2ce-e8c116d6efec`)  
**Artifacts Produced**:
- `.agents/spec_miner_survey_1/analysis.md`
- `.agents/spec_miner_survey_1/handoff.md`
- `.agents/spec_miner_survey_1/progress.md`
- `.agents/spec_miner_survey_1/BRIEFING.md`

---

## 1. Observation

1. **Character & Entity Rendering Pipeline**:
   - `src/game/draw.ts:193-432`: `drawCharacter` implements 10-layer top-down rendering (stepped shadow, boots with 6-frame run stepping, backpack, torso, chest armor plate, shoulders/arms, head with Isaac-style eyes, hat, held weapon/gadget, highlight rim).
   - `src/game/draw.ts:77-163`: `drawHat` defines 7 hats (`helmet`, `cap`, `hood`, `visor`, `alien`, `monkey`, `tycoon`). Visor slit in `helmet` is static `rgba(190,230,255,0.9)`; cyber visor in `visor` is static `accent`.
   - `src/game/draw.ts:235` & `src/game/engine.ts:6706`: `p.flash` triggers full `#ffffff` flash across character parts.
   - `src/game/engine.ts:12324-12347` & `src/game/systems/Renderer.ts:1212-1239`: Shield forcefield is drawn when `p.shieldTime > 0`. `engine.ts` uses 8 octagon nodes + 4 rotating corners; `Renderer.ts` uses concentric circles.
   - `src/game/engine.ts:12429-12440`: Invulnerability when `p.iframes > 0` currently draws 4 small light-blue `#e0f2fe` rectangles; not a golden protection ring.
   - `src/game/draw.ts:212-214, 420-431`: Cloaking applies `globalAlpha = 0.15` and 4 corner pixels.

2. **Weapons & Visual FX Pipeline**:
   - `src/game/pixelWeapons.ts:1-1083`: `drawPixelWeapon` contains custom 16-bit pixel models for all 38 weapons in `data/guns.json`. `drawPixelWeaponIcon` provides UI scaling.
   - `src/game/weaponMount.ts:84-143`: `computeWeaponMount` calculates 360° orbital mount around hand anchor, vertical flip on left aim (`flipY`), depth sorting behind torso (`drawBehindBody`), and barrel tip/eject port coordinates.
   - `src/game/pixelParticles.ts:1-549`: `PixelParticleSystem` is a 512-slot zero-GC pool supporting 10 particle kinds: `muzzle_flash`, `shell_casing` (2.5D gravity + bounce + decals), `bullet_trail`, `blood_splat`, `explosion_spark`, `explosion_smoke`, `debris_chunk`, `coin_sparkle`, `poison_cloud`, `flame_ember`.
   - `src/game/engine.ts:12443-12518` & `src/game/systems/Renderer.ts:1357-1400`: `drawThrustSwordChargeIndicator` implements charging corridor, dashed guide lines, endpoint marker, and status bar.
   - `src/game/systems/Renderer.ts:1715-1841`: `drawEffects` handles `dual_slash` with 5-step combo and X finisher.
   - `src/game/engine.ts:5440-5470`: Dual blades parry reflects enemy bullets with 5% self damage, but visual feedback is only generic particles.
   - `src/game/engine.ts:12982-13000`: `slam` effect draws 4-direction pixel ground fissure cracks.
   - `src/game/engine.ts:5109-5134`: Riot shield blocks bullets in arc and spawns blue impact particles.
   - `src/game/floatingText.ts:1-260`: `FloatingTextSystem` renders popping combat text on Layer 5.
   - `src/game/minimap.ts:1-211`: `PixelMinimap` renders top-right radar with sweep line and blips.
   - **Missing features identified**:
     - No off-screen enemy radar warning arrows in `engine.ts` or `Renderer.ts`.
     - No CRT scanline post-processing filter in canvas or CSS.
     - No dedicated retro arcade pixel font (e.g. `'Press Start 2P'`, `'Silkscreen'`) imported or styled.

---

## 2. Logic Chain

1. **Observation 1** establishes that character rendering is already modular in `draw.ts` and `Renderer.ts`, but lacks glowing visor pulse, multi-layer cloak shadow depth, unified dashed shield halo, and golden protection ring.
2. **Observation 2** establishes that weapon models (all 38 weapons in `guns.json`), 360° orbital mounting, 2.5D shell physics, and particle pooling are implemented with high fidelity.
3. However, specific combat effects required by **R4** (dual blades parry flash clash, branching hammer fissures, directional shield ricochet sparks) need visual enhancement.
4. Furthermore, three major presentation components specified in **R4** (off-screen enemy radar arrows, CRT scanline overlay filter, and retro arcade pixel fonts) are currently absent from the codebase.
5. Therefore, satisfying R1 and R4 requires adding the missing visual enhancements into `draw.ts`, `pixelParticles.ts`, `Renderer.ts`, `engine.ts`, `index.html`, and `index.css`.

---

## 3. Caveats

- R2 (Dynamic Lighting & Ambient Lantern) and R3 (5-Themed World & Pixel Props) were surveyed by Survey Agent 2 and are not covered in detail here.
- The physics and authoritative simulation calculations in `engine.ts` must remain completely intact; all changes for R1/R4 are purely visual and client-side rendering enhancements.

---

## 4. Conclusion

The specification survey for **R1 (Arcade Pixel Characters & Animation)** and **R4 (Pixel Weapons & FX)** is complete.
- All 38 weapons and character systems have been mapped.
- All missing features and gaps (visor pulse, cloak depth, dashed shield halo, golden protection ring, dual blades parry clash FX, CRT scanlines, off-screen radar arrows, pixel fonts) are thoroughly documented in `analysis.md`.
- Implementation can proceed cleanly in designated client rendering modules without risking regression to server simulation or network sync.

---

## 5. Verification Method

To verify the findings and code baseline:
1. Run TypeScript build: `npm run build` or `npx tsc --noEmit`
2. Inspect `analysis.md` at `c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\spec_miner_survey_1\analysis.md`
3. Verify all file references and line numbers cited above match the actual repository.
