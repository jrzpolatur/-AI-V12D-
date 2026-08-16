# Handoff Report — Explorer Survey 1 (Rendering & Build System)

## 1. Observation
- **Original User Request (`ORIGINAL_REQUEST.md`)**: Specifies refactoring "FIRING STICKERS" into a 16-bit / 32-bit pixel dungeon shooter (like *Enter the Gungeon* / *Soul Knight*) with a 3/4 perspective, fixed internal resolution (e.g. 480x270 or 640x360), integer nearest-neighbor scaling, and 3/4 perspective Y-Sort depth occlusion.
- **Canvas Setup & Viewport (`src/components/GameScreen.tsx:339-342`, `src/game/engine.ts:2775-2792`)**:
  - `canvas.width` and `canvas.height` are dynamically set to window bounding rect (`screenW = Math.max(320, rect.width)`, `screenH = Math.max(240, rect.height)`).
  - No fixed internal virtual resolution or integer letterboxing currently exists; viewport dimensions expand with monitor size.
- **Render Sequence & Layering (`src/game/engine.ts:10399-10530`, `src/game/systems/Renderer.ts:239-369`)**:
  - Entities are drawn in hardcoded type-based batches: `drawBackground` → `drawDecorations` → `drawWalls` → `drawDeployables` → `drawBase` → `drawArenaBorder` → `drawFieldEffects` → `drawPickups` → `drawParticles` → `drawGrenades` → `drawEnemies` → `drawEnemyBullets` → `drawBeam/FlameCone` → `drawPixelTrain` → `drawPlayer/drawNetCharacter` → `drawBullets` → `drawEffects` → `drawCrosshair` → `drawOverlays`.
  - There is zero Y-sorting based on ground foot coordinates (`footY`), leading to occlusion errors in 3/4 perspective.
- **Build System & Toolchain (`package.json`, `vite.config.ts`, `build-engine.cjs`, `tsconfig.json`)**:
  - `npm run build` executed successfully via `cmd.exe /c "npm run build"`, yielding standalone single-file `dist/index.html` (742 kB) in 1.26s.
  - `build-engine.cjs` bundles `src/game/engine.ts` via `esbuild` into `server/engine.bundle.mjs` for the authoritative Node.js server (`server/authoritative.mjs`). Headless mode (`canvas === null`) is strictly required.

## 2. Logic Chain
1. *Observation*: The canvas size currently matches physical screen pixels (`screenW` × `screenH`), causing high-DPI displays to render vector graphics at arbitrary scales rather than uniform pixel sizes.
   *Inference*: To achieve the Enter the Gungeon / Soul Knight retro pixel aesthetic, the engine must render to a fixed low-resolution internal buffer (`480×270` or `640×360`), which is then upscaled using integer nearest-neighbor scaling (`scale = Math.floor(...)`, `imageSmoothingEnabled = false`) with centered letterbox bars.
2. *Observation*: The current rendering pipeline executes rigid type-based passes where all walls render before all characters, and all characters render before all bullets.
   *Inference*: In a 3/4 top-down dungeon perspective, vertical elevation and horizontal depth are unified on the Y-axis. Objects with smaller Y (further north) must render before objects with larger Y (further south). A unified Y-sorted render queue (sorting by `sortY = footY`) across walls, props, characters, enemies, deployables, pickups, and ground projectiles is necessary.
3. *Observation*: Continuous camera coordinates cause sub-pixel interpolation jitter when scaled 3x–4x.
   *Inference*: Camera translations must be snapped to whole integer pixels (`Math.round(camX)`, `Math.round(camY)`) during the world rendering pass.
4. *Observation*: `src/game/engine.ts` is shared with Node.js via `build-engine.cjs`.
   *Inference*: Any rendering abstraction must keep simulation logic decoupled and check `if (this.ctx)` to avoid breaking server builds or tests.

## 3. Caveats
- No caveats regarding current rendering analysis or build verification.
- Note: Future phases (R2 for sprite atlas animation, R3 for tilemap chunks, R4 for pixel HUD) will plug directly into the Y-sort queue and pixel viewport defined in R1.

## 4. Conclusion
- The survey for R1 (Rendering & Viewport Architecture) is complete.
- Complete detailed technical documentation is saved at:
  `c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\explorer_survey_1\survey_render.md`
- Key technical blueprints established:
  1. **Fixed 480×270 Internal Buffer**: 16:9 aspect ratio, 4x scale at 1080p, crisp nearest-neighbor integer scaling with letterbox/pillarbox padding.
  2. **Zero-GC Y-Sorted Render Queue**: Pre-allocated render pool sorting items by `footY` across all visible world entities, props, and wall faces.
  3. **Two-Stage Input Mapping**: Client window coords → Letterbox offset → Virtual Pixel coords → World coords.
  4. **Headless / Server Invariance**: Preserved `engine.ts` structure so `build:engine` and `server/authoritative.mjs` run without errors.

## 5. Verification Method
- Independent verification commands:
  - Build validation: `cmd.exe /c "npm run build"`
  - Smoke server validation: `cmd.exe /c "npm run smoke:server"`
  - File verification: inspect `.agents/explorer_survey_1/survey_render.md` and `.agents/explorer_survey_1/handoff.md`.
