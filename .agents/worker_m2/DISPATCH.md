# DISPATCH

## 2026-08-16T16:40:00Z
Task: Implementation Worker for Milestone 2: R2 Dynamic Lighting & Ambient Lantern System.
Scope & Write Ownership:
You own `src/game/lighting.ts` (create new file) and client lighting integration in `src/game/engine.ts`.
Implement the following features (F08–F13):
1. Dynamic Lighting Mask System (`src/game/lighting.ts`) (F08)
2. 5-Theme Ambient Darkness Presets (F09)
3. Player Ambient Lantern Halo (F10)
4. Bullet Glow & Projectile Illumination (F11)
5. Explosion Shockwave Light Punchout (F12)
6. Acid Pool & Hazard Luminescence (F13)
7. Engine Rendering Integration (`src/game/engine.ts` and `renderQueue.ts`)

Verification Requirements:
1. Run `node build-engine.cjs`.
2. Run `node node_modules/vite/bin/vite.js build`.
3. Run `node tests/e2e/runner.mjs`.
4. Run headless smoke test: `node scripts/smoke-server.mjs`.
5. Create a unit test `tests/unit_m2_lighting.mjs` verifying all lighting methods and headless safety.
