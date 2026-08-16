## 2026-08-16T08:17:49Z

You are the Implementation Worker for Milestone 1: R1 Arcade Pixel Character & Animation System.

Your Working Directory: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\worker_m1
Project Root: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini
User Request Reference: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\ORIGINAL_REQUEST.md
Project Plan Reference: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\PROJECT.md
Survey Analysis Reference: c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\spec_miner_survey_1\analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Write Ownership:
You own `src/game/draw.ts` and character rendering methods in `src/game/engine.ts`.
Implement the following features (F01–F07):
1. **Modular Helmets & Glowing Visor (F01)**: Enhance hat drawing routines in `draw.ts` (`drawHat`) with animated pulsating glowing visors, visor slit intensity oscillation, and cyber visor highlight pulses.
2. **Multi-layer Cloak & Armor (F02)**: Add multi-layer cape/cloak with shading depth, chestplate armor grading, and shoulder pad layers in `drawCharacter`.
3. **Gait Bobbing & Run Animation (F03)**: Refine 6-frame run stepping, vertical torso/head bobbing sync, and stepped pixel drop shadow under feet.
4. **Hurt White Flash (F04)**: Ensure full white silhouette flash on hit (`p.flash > 0`), overriding all sub-parts with pure white while retaining geometric silhouette.
5. **Dashed Shield Halo (F05)**: Upgrade shield forcefield rendering (`p.shieldTime > 0`) to feature an animated rotating octagonal dashed shield boundary with corner node highlights.
6. **Golden Protection Ring (F06)**: Upgrade respawn / iframe invulnerability (`p.iframes > 0`) from plain rectangles to a golden concentric glowing protection ring with shimmering radian ticks.
7. **Stealth Refraction & Transparency (F07)**: Implement ghostly refractive transparency with edge glitch highlights when cloaked.

Verification Requirements:
1. Run TypeScript check: `node node_modules/typescript/bin/tsc --noEmit` or `npm run build`
2. Run E2E tests: `node tests/e2e/runner.mjs`
3. Verify zero regressions in game physics, movement, and server simulation.

Write your changes report to `c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\worker_m1\changes.md` and handoff to `c:\Users\86139\Documents\2d-shooter-for-claudeorgemini\.agents\worker_m1\handoff.md`. Send completion message when finished.
