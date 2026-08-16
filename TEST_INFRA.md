# E2E Test Infra: 2D Shooter Retrofit

## Test Philosophy
- **Requirement-driven**: Derived strictly from `ORIGINAL_REQUEST.md` (R1-R4) and user-facing acceptance criteria.
- **Opaque-box**: Exercises the game engine, renderer, particle pools, lighting systems, and prop lifecycles via their public API and simulation runs.
- **Methodology**: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Interaction Testing + Real-World Workload Endurance Testing.

## Feature Inventory & Test Mapping
| # | Feature | Requirement | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Workload) |
|---|---------|-------------|:-----------------:|:-----------------:|:-----------------:|:-----------------:|
| F01 | Modular Helmet & Glowing Visor | R1 | 5 | 5 | ✓ | ✓ |
| F02 | Multi-layer Cloak & Armor | R1 | 5 | 5 | ✓ | ✓ |
| F03 | Gait Bobbing & Run Animation | R1 | 5 | 5 | ✓ | ✓ |
| F04 | Hurt White Flash & Status FX | R1 | 5 | 5 | ✓ | ✓ |
| F05 | Dashed Shield Forcefield Halo | R1 | 5 | 5 | ✓ | ✓ |
| F06 | Golden Protection Ring | R1 | 5 | 5 | ✓ | ✓ |
| F07 | Stealth Refraction Transparency | R1 | 5 | 5 | ✓ | ✓ |
| F08 | Dynamic Lighting Offscreen Mask | R2 | 5 | 5 | ✓ | ✓ |
| F09 | 5-Theme Ambient Darkness | R2 | 5 | 5 | ✓ | ✓ |
| F10 | Player Ambient Lantern Halo | R2 | 5 | 5 | ✓ | ✓ |
| F11 | Bullet Glow & Projectile Trail | R2 | 5 | 5 | ✓ | ✓ |
| F12 | Explosion Shockwave Punchout | R2 | 5 | 5 | ✓ | ✓ |
| F13 | Acid Pool & Hazard Luminescence | R2 | 5 | 5 | ✓ | ✓ |
| F14 | 5-Themed Procedural Tilemaps | R3 | 5 | 5 | ✓ | ✓ |
| F15 | Interactive Pixel Props Engine | R3 | 5 | 5 | ✓ | ✓ |
| F16 | Signature Base Props | R3 | 5 | 5 | ✓ | ✓ |
| F17 | Destructible Barrels & Chests | R3 | 5 | 5 | ✓ | ✓ |
| F18 | Prop Physics & Y-Sorting | R3 | 5 | 5 | ✓ | ✓ |
| F19 | 38-Weapon Pixel Model Arsenal | R4 | 5 | 5 | ✓ | ✓ |
| F20 | Melee Combat Special FX | R4 | 5 | 5 | ✓ | ✓ |
| F21 | Enhanced Particle Pool | R4 | 5 | 5 | ✓ | ✓ |
| F22 | Off-Screen Enemy Radar Arrows | R4 | 5 | 5 | ✓ | ✓ |
| F23 | CRT Scanline & Retro Styling | R4 | 5 | 5 | ✓ | ✓ |
| F24 | E2E & Headless System Integrity | Acceptance | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Test Runner**: `node tests/e2e/runner.mjs` executing all 4 tiers of opaque-box tests.
- **Stress Suite**: `node scripts/stress-e2e-challenger.mjs` verifying memory stability, zero-GC throughput, and multi-player stress loads.
- **Headless Server Verification**: `node scripts/smoke-server.mjs` and `npm run build:engine`.
- **TypeScript Typecheck**: `node node_modules/typescript/bin/tsc --noEmit` or `npm run build`.

## Real-World Application Scenarios (Tier 4)
1. **Lobby Base Briefing & Gear Selection**: Player navigates base, interacts with Armory Hologram, tests weapons against Orbital Target Dummy, and enters Warp Portal.
2. **Ice Outpost Cryo Skirmish**: Intense blizzard combat with low visibility, player lantern cone navigating dark crevasses, shooting cryo barrels to freeze enemies.
3. **Wild West Saloon Showdown**: High-speed combat around destructible wooden crates, utilizing dual blade parries against enemy bullet barrages and hammer ground slams.
4. **Cyber City Dark Alley Infiltration**: Navigating deep darkness in neon future city, stealth cloaking past enemy turrets, utilizing off-screen radar indicators for ambush awareness.
5. **Bio-hazard Dungeon Raid**: Navigating toxic slime puddles with green luminescence, detonating acid barrels, breaking biohazard chests for loot, enduring sustained 18,000-tick horde defense.

## Coverage Thresholds
- Tier 1: ≥5 per feature (Total ≥ 120 tests)
- Tier 2: ≥5 per feature (Total ≥ 120 tests)
- Tier 3: Pairwise interaction matrix across all major gameplay & visual features (Total ≥ 35 tests)
- Tier 4: ≥5 comprehensive multi-minute gameplay workloads (Total ≥ 15 tests)
- Target Total: >400 tests passing with 100% success rate.
