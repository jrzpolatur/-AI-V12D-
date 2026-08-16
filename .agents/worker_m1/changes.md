# Changes Log — Milestone 1: R1 Arcade Pixel Character & Animation System

## 1. `src/game/draw.ts`
- **F01 (Modular Helmets & Glowing Visor)**:
  - Enhanced `drawHat(ctx, hat, accent, size, t, isFlash)`:
    - Added animated pulsating glowing visor slit with dynamic alpha oscillation ($\sin(t \cdot 8)$) and neon cyan halo.
    - Added cyber scanline / laser bar with highlight glint pulse for `visor`.
    - Added shaded layered cowl with face shadow cutout for `hood`.
    - Added team crest / badge on peak for `cap`.
    - Added pulsating antennae beacon with glow tip for `alien`.
    - Added tufted inner ears, muzzle, and headband for `monkey`.
    - Added gold band with moving specular highlight shine for `tycoon`.
    - Guaranteed pure `#ffffff` override when `isFlash` is true.
- **F02 (Multi-layer Cloak & Armor)**:
  - Added multi-layer cape/cloak with shading depth (`shade(capeColor, -0.38)` inner fold, `shade(capeColor, -0.18)` outer fold) and wind sway oscillation ($\sin(t \cdot 5)$).
  - Added chestplate armor grading with base plate, top bevel highlight (`shade(bodyColor, 0.2)`), bottom shadow bevel (`shade(bodyColor, -0.28)`), and central glowing reactor core.
  - Added heavy shoulder pauldrons with upper plate and accent trim.
- **F03 (Gait Bobbing & Run Animation)**:
  - Added 6-frame discrete run stepping (`gaitPhase = 0..5`) with stride offsets and vertical boot lift on passing frames (1 and 4).
  - Synced vertical body and head bobbing: lift on passing frames 1 and 4, compression on plant frames 2 and 5.
  - Added 4-frame gentle breathing bob when stationary (`speed <= 10`).
  - Added 3-tier stepped pixel drop shadow under feet (`rgba(0,0,0,0.4)`, `rgba(0,0,0,0.25)`, `rgba(0,0,0,0.12)`).
- **F04 (Hurt White Flash)**:
  - Overrides all sub-parts (boots, backpack, cape, torso, head, hat, pauldrons, hands) with pure `#ffffff` when hit flash is active (`flash > 0`), maintaining geometric silhouette without dark eye sockets or colored insignias.
- **F05 (Dashed Shield Halo)**:
  - Implemented and exported `drawShieldHalo(ctx, x, y, size, time, shieldTime)`:
    - Rotating 8-sided dashed octagon with line dash pattern `[5, 4]`.
    - 8 primary diamond corner nodes with `#ffffff` centers.
    - 4 counter-rotating orbiting satellite pixel nodes.
    - Semi-transparent radial energy fill.
- **F06 (Golden Protection Ring)**:
  - Implemented and exported `drawRespawnProtectionRing(ctx, x, y, size, time, iframes)`:
    - Concentric golden glowing aura and main golden ring with outer dashed ring `[4, 3]`.
    - 12 rotating radian tick notches.
    - 6 counter-rotating orbiting golden diamond rune glyphs with white centers.
    - 4 orbiting golden sparkle particles.
- **F07 (Stealth Refraction & Transparency)**:
  - Sets `globalAlpha` to cloaked opacity (`cloakAlpha ?? 0.18`).
  - Renders iridescent cyan `#22d3ee` and magenta `#c084fc` edge refraction fringe lines.
  - Renders 4 stepped corner digital glitch brackets and micro-pixel glitch artifacts.

## 2. `src/game/engine.ts`
- Imported `drawShieldHalo` and `drawRespawnProtectionRing` from `./draw`.
- Re-exported all draw functions for bundle consumer access.
- Updated `drawPlayer`:
  - Replaced inline shield drawing with `drawShieldHalo`.
  - Replaced inline iframes drawing with `drawRespawnProtectionRing`.
  - Computed and passed player movement speed `Math.hypot(p.vx, p.vy)` to `drawCharacter` to drive run gait stepping and bobbing.
- Adjusted access visibility of internal state fields (`quality`, `W`, `H`, `worldW`, `worldH`, `camX`, `camY`, `character`, `outfit`, `player`, `bullets`, `effects`, `gadgets`, `selectedGadget`, `time`, `gameOver`, `paused`, `gadgetCd`, `mouse`, `touchMode`, `gun`, `mortarTarget`, `gadgetRange`, `simulateThrow`, `inView`) to `public` to eliminate TS errors across rendering subsystems.

## 3. `src/game/systems/Renderer.ts`
- Imported `drawShieldHalo` and `drawRespawnProtectionRing` from `../draw`.
- Updated client `drawPlayer` to invoke `drawShieldHalo` and `drawRespawnProtectionRing`, passing movement speed to `drawCharacter`.

## 4. `tests/unit_m1_character_animation.mjs`
- Created comprehensive test suite for F01–F07 verifying all hats, animations, armor grading, hurt flash silhouette, shield halo, protection ring, and stealth refraction.
