# Technical Investigation & Analysis Report: Features F29-F33, Tier 3 Combinations, Tier 4 Workloads, and E2E Test Runner Architecture

**Track**: E2E Testing Track — Explorer 3  
**Date**: 2026-08-15  
**Working Directory**: `.agents/sub_orch_e2e/explorer_3/`  
**Target Output**: `analysis.md`  

---

## 1. Executive Summary

This report delivers an in-depth architectural and requirement-driven analysis of **Features F29 through F33**, the design of **Tier 3 Pairwise Combinatorial Interactions (≥36 test cases)**, **Tier 4 Real-World Workload Scenarios (≥18 match scenarios)**, and the **Standalone Test Runner Architecture (`tests/e2e/runner.mjs`)** for *FIRING STICKERS 16/32-Bit Pixel Dungeon Shooter Refactor*.

### Key Findings Matrix
| Feature / Subsystem | Core Responsibilities & Requirements | Implementation Files | Status & Key Verifications |
|---|---|---|---|
| **F29: Biohazard PvE Mode Support** | Wave 1-10 survival, 9 monster bestiary, Abomination boss (wave ≥6), score/gold coin drops, player-centric swarming | `src/game/content.ts` (lines 504-648), `src/game/engine.ts` (lines 9835-10050, 6080-6300) | Complete; bases disabled (`hp = Infinity`), monsters swarm player, wave difficulty scales HP/damage/concurrency |
| **F30: Deathmatch & TDM Modes** | 4-10 combatants FFA/TDM, AI bot filling, kill limits (20/24), 6s respawn timer, 10s damage log window, friendly fire check | `src/game/engine.ts` (lines 1828-1950, 6677-6795, 6939-6950, 7340-7450), `src/components/GameScreen.tsx` | Complete; per-team scoreboard, floating point score accumulator (`awardDamageScore`), MVP calculation |
| **F31: Base Defense Co-op Mode** | Base HP (2000) vs Enemy Base HP (2000), monster siege on player base, auto-turrets (MG, Cannon, Sniper), win/loss triggers | `src/game/engine.ts` (lines 1708-1733, 5757-5950, 6619-6670), `src/game/runtimeConfig.ts` | Complete; base destruction triggers game over, turrets target nearest enemy with line-of-sight & owner attribution |
| **F32: Authoritative WebSocket Sync** | 30Hz server tick loop, snapshot replication, client prediction/reconciliation, 15s reconnect grace, InputFrame protocol | `server/authoritative.mjs` (lines 168-208, 422-498), `src/net/Net.ts`, `src/net/protocol.ts`, `src/game/engine.ts` (lines 8000-8300, 8950-9150) | Complete; room state machine (lobby/in_game), 15s reconnect grace, feed event stream with monotonic sequence IDs |
| **F33: BOT AI & Pathfinding** | Line-of-sight raycasting (`rayAabb`), 60px cell A* pathfinding, weapon selection by range, lead-aiming, wall avoidance | `src/game/ai.worker.ts` (lines 1-226), `src/game/engine.ts` (lines 7464-7980) | Complete; decoupled AI tick (`aiTimer`/`botThink`), frame-by-frame aim/fire (`botAimFire`), obstacle avoidance |
| **Tier 3: Pairwise Combinations** | ≥36 cross-feature interaction tests covering weapon mechanics, modes, physics, HUD, and networking | `tests/e2e/tier3_combinations.test.mjs` | Complete design (38 tests specified) |
| **Tier 4: Real-World Workloads** | ≥18 full-match scenarios covering 10-wave biohazard, 8-player FFA/TDM, endurance, reconnect, and heavy stress | `tests/e2e/tier4_workloads.test.mjs` | Complete design (18 scenarios specified) |
| **Test Runner Architecture** | Standalone Node.js zero-dependency test runner executing Tiers 1-4 with metrics, timings, and clean exit codes | `tests/e2e/runner.mjs` | Complete architecture design |

---

## 2. Feature Deep Dives (F29 – F33)

### 2.1 F29: Biohazard PvE Mode Support
- **Bestiary Catalog (`src/game/content.ts:508-648`)**:
  1. `walker` (行尸): HP 75, Spd 64, Dmg 12, Size 15, Score 12, melee swarm.
  2. `runner` (奔尸): HP 55, Spd 150, Dmg 10, Size 13, Score 16, lunges with `chargeT = 0.45` (2.4x speed burst).
  3. `brute` (巨尸): HP 460, Spd 40, Dmg 30, Size 30, Score 60, heavy tank.
  4. `spitter` (吐酸者): HP 110, Spd 56, Dmg 10, Size 17, Score 35, ranged acid projectile (`rangedRange=360`, `rangedDamage=14`).
  5. `abomination` (母体 Boss): HP 2600, Spd 30, Dmg 45, Size 46, Score 400, `minWave: 6`, giant boss, death explosion.
  6. `crawler` (爬虫): HP 30, Spd 205, Dmg 7, Size 10, Score 8, high-speed swarm.
  7. `bloater` (毒爆体): HP 190, Spd 46, Dmg 14, Size 26, Score 40, `minWave: 2`, `explodeRadius: 130`, `explodeDamage: 60` poison cloud on death.
  8. `screamer` (尖啸者): HP 130, Spd 72, Dmg 8, Size 18, Score 45, `minWave: 3`, `buffRadius: 270` shriek speeds up monsters (`buffT = 3`, 1.8x speed) and staggers player (`flash = 0.5`).
  9. `spore` (孢子怪): HP 165, Spd 50, Dmg 10, Size 20, Score 38, `minWave: 2`, periodic lingering poison cloud (`cloudRadius: 95`, `cloudDamage: 42`).
- **Wave & Spawning System (`src/game/engine.ts:9835-10050`)**:
  - `updateWaves(dt)`: Advances wave every `RUNTIME.waveDuration` seconds. Ramps up `maxConcurrent` monsters (`maxConcurrentBase + wave * maxConcurrentPerWave`, capped at `maxConcurrentCap`).
  - Spawning filters monsters by `(m.minWave ?? 1) <= currentWave` with weighted lottery.
  - Spawns monsters just outside virtual viewport perimeter to stream into arena seamlessly.
  - Base neutrality: In Biohazard mode, `this.base.hp = Infinity` and `this.enemyBase.hp = Infinity`, preventing accidental base destruction losses.
  - Gold & score pickups drop on monster defeat with radial coin bursts.

### 2.2 F30: Deathmatch & TDM Modes
- **Combatant System & Scaling (`src/game/engine.ts:1828-1950, 2140-2160`)**:
  - Supports 4 to 10 combatants (human players + AI bots).
  - Fixed PID assignments: Host = PID 1, Joiner = PID 2, Bots = PID 3..N.
  - Kill quotas: Target kills configured via room settings (default 20 or 24 kills).
  - Match timer: `dmTimeLeft` counts down match duration in seconds.
- **Respawn System & Damage Logging (`src/game/engine.ts:657-661, 6605-6615`)**:
  - `RESPAWN_TIME = 6.0` seconds fixed respawn countdown.
  - Downed players are frozen (`deadTimer > 0`, velocity zeroed, firing disabled).
  - `DAMAGE_LOG_WINDOW = 10.0` seconds: Damage logs are preserved across death and respawn.
  - `recordDamageLog`: Merges consecutive damage from the same weapon/source into a single aggregate entry with updated timestamp.
- **Team Deathmatch (TDM) Mechanics (`src/game/engine.ts:6677-6795`)**:
  - Team assignment: `teamId: 0` (Blue/Purple) vs `teamId: 1` (Red/Pink).
  - Friendly fire suppression: `isTeammate(a, b)` checks if two combatants share `teamId`. If true, bullets, explosions, and melee attacks deal 0 damage.
  - Scoreboard aggregation: Aggregates kills and scores per team and displays top performers.
  - MVP Calculation: When match ends, highest score combatant is designated MVP (`★ MVP 杰出选手`).

### 2.3 F31: Base Defense Co-op Mode
- **Base Infrastructure (`src/game/engine.ts:1708-1733, 6619-6670`)**:
  - Friendly Base: Located at bottom center (`worldW / 2, worldH - 120`), HP = 2000.
  - Enemy Base: Located at top center (`worldW / 2, 120`), HP = 2000.
  - Monster Targeting: In Defense mode, monsters march toward friendly base (`dbase = hypot(base.x - e.x, base.y - e.y)`). When within `base.radius + e.size`, they attack the base every 0.7s.
  - Player/Foe Assault: Players and turrets attack the enemy base.
  - Victory/Loss: Friendly base HP <= 0 triggers "基地失守，你输了！"; Enemy base HP <= 0 triggers victory.
- **Deployables & Automated Turrets (`src/game/engine.ts:5757-6000`)**:
  - `turret_mg`: Rapid firing (0.12s cooldown), 24.08 damage per bullet, 900px/s velocity.
  - `turret_cannon`: Heavy explosive shells (1.1s cooldown), 37.84 damage, 56px explosion radius.
  - `turret_sniper`: High pierce laser/tracer (2.5s cooldown), 180 damage, pierce 99.
  - `healing_station`: Restores 45 HP/s to friendly players within radius.
  - `mine_explosive`, `mine_poison`, `mine_fire`, `mine_stun`: Armed after 0.5s, detonates on enemy proximity.

### 2.4 F32: Authoritative WebSocket Sync
- **Server Architecture (`server/authoritative.mjs`)**:
  - Node.js WebSocket server running a fixed 30Hz tick loop (`TICK_HZ = 30`, `STEP = 1/30`).
  - High-precision accumulator prevents tick drift: `room.acc += (now - room.lastTick) / 1000`.
  - Room Lifecycle: `lobby` (waiting/ready check) → `in_game` (active simulation) → `summary`.
- **Snapshot Replication & Client Interpolation (`src/net/protocol.ts`, `src/game/engine.ts`)**:
  - `buildSnapshot()` captures: `time`, `scene`, `players`, `enemies`, `bullets`, `walls`, `effects`, `grenades`, `deployables`, `hostBaseHp`, `guestBaseHp`, `wave`, `score`, `kills`, `feed`.
  - Client-side prediction: Local player immediately moves and fires based on local input; authoritative snapshot corrects position discrepancies via interpolation.
  - Feed event stream: Monotonic sequence IDs (`SnapFeedEvent`) ensure zero duplicate damage numbers or missed kill notifications.
- **Reconnect Grace Period (`server/authoritative.mjs:478-498`)**:
  - When a client socket closes during a match, `peer.disconnected = true` is flagged, and a 15,000ms timer (`RECONNECT_GRACE_MS = 15000`) is started.
  - If the player reconnects with `{ t: "rejoin", room, pid, name, loadout }`, the grace timer is cancelled, socket is rebound, and full simulation resumes seamlessly.

### 2.5 F33: BOT AI & Pathfinding
- **Line-of-Sight & Raycasting (`src/game/engine.ts:7962-7978`, `src/game/ai.worker.ts`)**:
  - `botLOS(x0, y0, x1, y1)` performs fast AABB ray intersections (`rayAabb`) against all obstacle walls.
- **A\* Grid Navigation (`src/game/engine.ts:7464-7584`)**:
  - 60px cell grid representation covering the entire game world.
  - 8-directional neighbor expansion with Euclidean distance heuristic and 250-step search budget.
  - Cell obstacle test checks wall collision with player buffer radius (`pointInWall(cx, cy, pSize + 10)`).
- **Target Selection & Smart Weapon Switching (`src/game/engine.ts:7624-7720`)**:
  - Prioritizes nearest non-teammate, living, uncloaked combatant.
  - Smart weapon scoring evaluates DPS at current target distance with hysteresis (prevents rapid weapon flapping). Close quarters (<120px) strongly prioritizes melee and shotguns (+5000 score bonus).
- **Predictive Lead-Aiming (`src/game/engine.ts:7724-7734, 7926-7934`)**:
  - Calculates projectile travel time `lead = min(dist / bulletSpeed, 0.4)`.
  - Aims crosshair at `target.x + target.vx * lead, target.y + target.vy * lead`.
- **Combat Movement & Obstacle Avoidance (`src/game/engine.ts:7585-7620, 7750-7808`)**:
  - Strafe states: approach (0), retreat (2), or perpendicular circle strafe (-1 / 1).
  - `botAvoidWalls` checks forward trajectory and tests 8 ray angles to steer around corners and map boundaries. Stuck position detector triggers random deflection if bot remains stationary for >0.8s.

---

## 3. Tier 3 Pairwise Combinatorial Test Matrix (38 Test Cases)

Below is the exhaustive, requirement-driven test design for Tier 3 pairwise interaction verification:

| # | Test Name | Feature Pair | Interaction Scenario & Expected Invariant |
|---|---|---|---|
| **T3.01** | `test_weapon_swap_dash_wall` | F11 + F12 + F20 | Player initiates dash with thrust sword while swapping to shotgun mid-dash into autotiled wall. Verifies dash velocity clamps against wall collider, weapon swap completes cleanly, and ammo state does not corrupt. |
| **T3.02** | `test_airdrop_swarm_mortar_blast` | F22 + F29 + F18 | Airdrop crate parachuting into a Biohazard swarm of 6 Crawlers; Mortar lob lands on landing zone. Verifies explosion damages both crate (spawning loot) and destroys all 6 crawlers in radius. |
| **T3.03** | `test_ysort_4players_turret_decals` | F05 + F30 + F34 | 4 players overlapping vertically with a deployed MG Turret and 3 blood decals. Verifies RenderQueue sorts entities strictly by `footY` ground anchor: Decals (Layer 0) → YSorted (Layer 2) in ascending `sortY`. |
| **T3.04** | `test_screamer_runner_dash_evade` | F29 + F09 + F33 | Screamer emits 270px buff shriek accelerating nearby Runner (1.8x speed); player triggers Dash skill. Verifies runner velocity increases, player dash i-frames evade attack, no damage taken. |
| **T3.05** | `test_bloater_prop_destruction` | F29 + F21 + F16 | Bloater monster dies adjacent to 3 wooden crates. Verifies bloater poison explosion deals 60 AoE damage, destroying crates, scattering wood debris, and leaving lingering poison cloud. |
| **T3.06** | `test_turret_mine_cloaked_player` | F34 + F30 + F32 | Player enters Cloak skill (invisibility) and walks past enemy MG turret into an armed explosive mine. Verifies turret does not fire at cloaked player; mine triggers upon proximity overlap (<24px). |
| **T3.07** | `test_thrust_dash_vs_blade_reflect` | F18 + F30 + F12 | Attacker executes Thrust Sword charge-dash (120 dmg) against Defender actively holding Dual Blades right-click reflect. Verifies reflect damage calculation and knockback application. |
| **T3.08** | `test_lightning_whip_flame_abomination` | F18 + F29 + F16 | Attacker alternates Lightning Whip (slow debuff) and Flamethrower on Abomination Boss (2600 HP). Verifies boss speed is halved (`slowT > 0`) while burn DoT ticks every 0.25s. |
| **T3.09** | `test_bow_charge_sniper_pierce_wall` | F18 + F20 + F30 | Recurve Bow full charge shot and Sniper Rifle tracer fire through a destructible cover wall into 2 aligned combatants. Verifies wall HP reduction and bullet pierce counter decrements correctly. |
| **T3.10** | `test_8player_30hz_snapshot_sync` | F30 + F32 + F07 | 8 combatants simultaneously moving, firing, and deploying gadgets on headless server. Verifies `stepServer(1/30)` and `buildSnapshot()` generate complete snapshot payloads without dropped entities. |
| **T3.11** | `test_base_defense_siege_heal_cannon` | F31 + F34 + F29 | 5 Brutes attack friendly Base while player deploys Healing Station and Cannon Turret. Verifies base HP decrements, healing station restores player HP (+45/s), and cannon shells destroy brutes. |
| **T3.12** | `test_tdm_friendly_fire_grenade_cluster` | F30 + F34 + F17 | Team 0 player throws Cluster Grenade into a melee cluster containing 1 teammate and 2 enemies. Verifies teammate takes 0 damage (`isTeammate === true`), while enemies take full cluster blast damage. |
| **T3.13** | `test_spore_spitter_hazard_corridor` | F29 + F19 + F24 | Spore emits poison cloud (42 dps) and Spitter launches acid projectile (14 dmg) in narrow 120px corridor. Verifies compound damage application and notched HP bar subtraction. |
| **T3.14** | `test_shell_physics_explosion_shockwave` | F14 + F17 + F05 | Gatling gun ejects 10 shell casings with 2.5D $z$-gravity bounce during a rocket explosion shockwave. Verifies shell trajectories, floor restitution, resting decals, and layer sorting. |
| **T3.15** | `test_muzzle_flash_weapon_mount_flip` | F11 + F13 + F08 | Weapon rotates across 360° boundary ($\theta = \pi/2 \pm 0.05$). Verifies sprite flipping (`scaleY(-1)`), depth sorting (behind body when aiming up), and directional muzzle flash alignment. |
| **T3.16** | `test_notched_hp_floating_text_combo` | F24 + F26 + F18 | 3-hit melee combo on target with active shield. Verifies floating combat text spawns blue numbers for shield damage, red numbers for critical hits, and HP bar updates. |
| **T3.17** | `test_minimap_radar_entity_tracking` | F27 + F29 + F23 | Radar minimap rendering arena with 8 monsters, 2 players, active Airdrop, and Cashout Vault. Verifies all entity blips are mapped to normalized coordinates `(x/worldW, y/worldH)`. |
| **T3.18** | `test_destructible_crate_chunk_pickup` | F21 + F16 + F25 | Heavy shotgun blast destroys wooden crate. Verifies crate transitions through damage states, spawns 4 chunk particles, and drops ammo pickup. |
| **T3.19** | `test_headless_canvas_guard_server` | F07 + F32 + F01 | Running 100 simulation ticks on Node.js server with `ctx === null`. Verifies zero canvas rendering calls, zero `TypeError` exceptions, and pure physics/state execution. |
| **T3.20** | `test_bot_astar_u_shaped_obstacle` | F33 + F20 + F30 | Bot positioned inside a U-shaped autotiled wall enclosure navigating to target outside. Verifies A* pathfinding computes valid multi-waypoint path around obstacle without getting stuck. |
| **T3.21** | `test_bot_lead_aiming_dashing_target` | F33 + F18 + F30 | Target player executes high-speed dash ($v_x = 400$); Bot fires sniper rifle. Verifies bot crosshair leads target by `lead = dist / bulletSpeed`, scoring direct hit. |
| **T3.22** | `test_reconnect_grace_snapshot_resync` | F32 + F30 + F07 | Client 2 disconnects during active deathmatch; server holds slot for 5s; Client 2 rejoins. Verifies server rebinds PID 2, transmits immediate snapshot, and match resumes without state loss. |
| **T3.23** | `test_cashout_vault_eruption_score` | F23 + F28 + F30 | Cashout Vault completes 5-second unlock countdown. Verifies glowing pulse effect, eruption of 20 gold coins, and score accumulation upon collection. |
| **T3.24** | `test_floating_text_aggregation_crit` | F26 + F18 + F24 | High fire-rate SMG applies 10 rapid hits. Verifies damage numbers pop up, crits display red/orange bold text, and floating text decays over life duration. |
| **T3.25** | `test_gatling_spinup_overheat_recoil` | F12 + F18 + F25 | Gatling gun continuous fire for 4 seconds. Verifies spin-up fire rate curve, weapon heat bar accumulation, overheat lockout, and recoil jitter decay. |
| **T3.26** | `test_riot_shield_pellet_absorption` | F18 + F30 + F12 | Defender with Riot Shield faces Shotgun blast within 60° forward arc. Verifies shield absorbs 100% of pellet damage, shield HP decreases, and player takes 0 health damage. |
| **T3.27** | `test_airdrop_parachute_decay_unlock` | F22 + F14 + F25 | Airdrop crate spawned at $z = 300$. Verifies parachute sway animation, vertical descent velocity, ground impact smoke, and weapon pickup availability. |
| **T3.28** | `test_glue_wall_runner_slow` | F20 + F29 + F09 | Runner monster moves through glue-covered wall section. Verifies runner speed is reduced by 50% (`slowT > 0`) on contact with glue wall. |
| **T3.29** | `test_mine_stun_hammer_slam_aoe` | F34 + F18 + F30 | Enemy combatant triggers stun mine (`ccTimer = 3.5`), followed by Hammer right-click ground slam. Verifies target cannot move during stun and receives full ground slam AoE damage. |
| **T3.30** | `test_perspective_wall_split_occlusion` | F06 + F05 + F08 | Player walks behind wall top (overhead) then in front of wall face (Y-sorted). Verifies player is occluded behind top face, but drawn in front of front face when `player.y > wall.y + wall.h`. |
| **T3.31** | `test_bot_weapon_switch_by_distance` | F33 + F18 + F30 | Target moves from 600px range to 50px range. Verifies bot switches equipped weapon from Sniper Rifle to Shotgun based on dynamic range utility scoring. |
| **T3.32** | `test_tdm_scoreboard_mvp_export` | F30 + F28 + F32 | Match reaches target kill limit. Verifies `postGameStats` exports all combatant kills, deaths, damage dealt, damage taken, and highlights highest scorer as MVP. |
| **T3.33** | `test_dual_weapon_switch_clip_retention` | F18 + F25 + F30 | Player fires 15 rounds from Rifle (mag: 30), switches to Pistol, fires 5 rounds, switches back to Rifle. Verifies Rifle retains exactly 15 rounds in clip without reload reset. |
| **T3.34** | `test_plasma_rifle_burst_wall_pierce` | F18 + F20 + F15 | Plasma Rifle fires 3-round burst at thin wall. Verifies burst timer spaces 3 projectiles, and wall pierce probability executes per projectile. |
| **T3.35** | `test_viewport_coord_mapping_scaling` | F01 + F02 + F03 | Window resizes to 1920x1080 (letterboxed). Mouse click at (960, 540) is transformed via `screenToVirtual` and `virtualToWorld`. Verifies exact world center coordinate match. |
| **T3.36** | `test_respawn_iframes_and_freeze` | F30 + F24 + F32 | Player dies in Deathmatch. Verifies player frozen during 6s countdown, respawns at valid spawn point with 1.5s invulnerability frames (`iframes > 0`). |
| **T3.37** | `test_base_defense_wave5_elite_cannon` | F31 + F29 + F34 | Wave 5 in Base Defense spawns Elite Spitter and Elite Brute with scaled HP. Verifies Cannon Turret bombardment suppresses swarm before reaching base. |
| **T3.38** | `test_score_acc_float_precision_dot` | F30 + F18 + F32 | Flamethrower deals 0.35 damage per tick over 60 frames. Verifies `awardDamageScore` float accumulator retains fractions and awards exact integer score without rounding losses. |

---

## 4. Tier 4 Real-World Workload Scenarios (18 Full-Match Scenarios)

| # | Workload ID | Scenario Name & Scope | Execution Invariants & Acceptance Thresholds |
|---|---|---|---|
| **W01** | `workload_biohazard_wave_1_to_5` | **Biohazard Early Wave Survival** (Wave 1 → 5) | Simulate singleplayer survival from Wave 1 through Wave 5 against Walkers, Runners, Crawlers, and Bloaters. Verify monster count progression, gold drops, weapon pickups, and zero state corruption. |
| **W02** | `workload_biohazard_wave_6_to_10_boss` | **Biohazard Late Wave & Abomination Boss** (Wave 6 → 10) | Simulate high-difficulty wave ramp with Screamers, Spores, and Abomination Boss (2600 HP). Verify boss slam attacks, explosion on death, wave 10 survival banner, and score tally. |
| **W03** | `workload_ffa_4p_warehouse_match` | **4-Player FFA Deathmatch on Warehouse Map** | 1 Human player + 3 AI bots on Warehouse map racing to 20 kills. Verify dynamic bot lead-aiming, weapon switching, 6s respawns, kill feed logging, and match victory trigger on 20th kill. |
| **W04** | `workload_ffa_8p_dungeon_chaos` | **8-Player FFA Deathmatch Full Capacity** | 2 Real players + 6 AI bots on Dungeon map. Verify high projectile density (100+ active bullets), 30Hz snapshot replication, zero GC pauses, and correct final leaderboard sorting. |
| **W05** | `workload_tdm_4v4_squad_match` | **4v4 Team Deathmatch Squad Battle** | 4 Blue team combatants vs 4 Red team combatants. Verify team formation following, friendly fire suppression across all weapons/deployables, and team kill limit race to 30 kills. |
| **W06** | `workload_tdm_5v5_dynamic_bot_fill` | **5v5 Team Deathmatch Max Scale** | 10 total combatants. Verify team balance allocation, A* pathfinding performance across 10 bots, per-team HUD score displays, and MVP determination on match completion. |
| **W07** | `workload_base_defense_10_waves` | **Base Defense Co-op: 10-Wave Endurance** | 2 Players defending friendly base against 10 continuous assault waves. Verify base HP preservation, repair/healing hub utilization, turret deployment, and victory trigger. |
| **W08** | `workload_base_defense_counter_assault` | **Base Defense: Base Race Assault** | Players split roles: one defends home base with turrets while one assaults enemy base with high-DPS weapons. Verify dual base HP tracking and win condition on enemy base destruction. |
| **W09** | `workload_net_reconnect_grace_combat` | **Network Resilience: 15s Reconnect Window** | 2-Player network match. Client 2 forcibly disconnects at $t=10s$ under heavy combat, remains offline for 8 seconds, and reconnects at $t=18s$. Verify server maintains state and client resumes seamlessly. |
| **W10** | `workload_arsenal_38_weapons_stress` | **Full Arsenal 38 Weapons Firing Stress** | Cycle through all 38 weapons in `data/guns.json` across 8 combatants over 1,800 ticks (60s). Verify zero undefined weapon crashes, correct recoil impulses, and bullet lifecycles. |
| **W11** | `workload_particle_500_entities_stress` | **Particle Engine Extreme Load Test** | Trigger simultaneous multi-rocket explosions, 20 shell ejections, acid splatters, and fire fields reaching 500+ active particles. Verify zero memory allocation leaks and smooth particle decay. |
| **W12** | `workload_bot_astar_maze_stress` | **Bot Pathfinding Maze Stress Test** | 8 AI bots navigating complex autotiled maze with 50+ wall segments. Measure A* step execution time to verify average pathfinding time < 2.0ms per bot tick. |
| **W13** | `workload_full_player_toolkit_flow` | **Complete Player Toolkit Workflow** | Single combatant executes complete player lifecycle: primary fire → secondary fire → weapon swap → reload → dash skill → deploy turret → deploy mine → collect airdrop loot. |
| **W14** | `workload_high_latency_reconciliation` | **High Latency Network Simulation (150ms Jitter)** | Simulated WebSocket link with 150ms latency and 5% packet jitter. Verify client prediction, position reconciliation, and absence of visual rubber-banding. |
| **W15** | `workload_mid_match_vault_airdrop_event` | **Dynamic Mid-Match Events Clash** | At $t=30s$, Airdrop crate parachutes in; at $t=60s$, Cashout Vault unlocks. 4 bots and player converge on objectives. Verify objective prioritization and coin burst loot drops. |
| **W16** | `workload_sudden_death_tie_breaker` | **Deathmatch Sudden Death Overtime** | FFA match reaches time limit with tied top score (18 vs 18 kills). Match enters sudden death overtime; next kill instantly triggers match victory for the scoring combatant. |
| **W17** | `workload_destructible_cover_grid_clear` | **Complete Arena Destructible Prop Clearance** | Arena with 40 destructible crates and 20 destructible cover walls. Explosives and heavy gunfire clear 100% of destructible props. Verify snapshot wall sync and collision mesh updates. |
| **W18** | `workload_endurance_10min_simulation` | **10-Minute Long-Run Simulation (18,000 Ticks)** | Continuous 30Hz authoritative simulation running for 18,000 steps without restart. Verify memory heap stability, zero array leaks, and 100% snapshot consistency. |

---

## 5. Standalone Test Runner Architecture (`tests/e2e/runner.mjs`)

### 5.1 Architecture Requirements & Design
1. **Execution Entry Point**: Executable directly via `node tests/e2e/runner.mjs`.
2. **Zero External Runtime Dependencies**: Uses Node.js standard modules (`fs`, `path`, `performance`, `process`, `url`) with headless simulation bundle (`server/engine.bundle.mjs`).
3. **Structured Test Matrix Reporting**:
   - Colorized ANSI terminal output with tier-by-tier breakdown.
   - Per-tier execution duration, test counts, pass/fail/skip tallies.
   - Formatted summary matrix table at completion.
4. **Deterministic Exit Codes**:
   - Returns `process.exit(0)` on 100% test pass.
   - Returns `process.exit(1)` on any test failure with detailed assertion error stack traces.
5. **Micro-Assertion & Lifecycle Suite**:
   - `describe(name, fn)`: Groups test suites.
   - `it(name, fn)`: Registers individual test cases (supports `async/await` with configurable timeout).
   - `beforeAll`, `afterAll`, `beforeEach`, `afterEach`: Lifecycle hooks.
   - Assertions: `assert(cond, msg)`, `assertEqual(actual, expected, msg)`, `assertApprox(actual, expected, eps, msg)`, `assertInRange(val, min, max, msg)`, `assertThrows(fn, msg)`.

### 5.2 Test Runner Modular Structure
```
tests/
└── e2e/
    ├── runner.mjs                  # Central orchestrator & CLI reporter
    ├── harness.mjs                 # Assertion library, lifecycle hooks & runner core
    ├── tier1_features.test.mjs     # Tier 1: Feature happy-path tests (≥180 tests)
    ├── tier2_boundaries.test.mjs   # Tier 2: Boundary & corner cases (≥180 tests)
    ├── tier3_combinations.test.mjs # Tier 3: Pairwise interaction tests (≥38 tests)
    └── tier4_workloads.test.mjs    # Tier 4: Real-world match workloads (≥18 scenarios)
```

### 5.3 Runner Orchestrator Implementation Blueprint
```javascript
// tests/e2e/runner.mjs
import path from "path";
import { fileURLToPath } from "url";
import { createRunner } from "./harness.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const runner = createRunner();

  console.log("\n=======================================================");
  console.log(" 🎮 FIRING STICKERS: E2E 4-TIER TEST SUITE RUNNER 🎮");
  console.log("=======================================================\n");

  const tierFiles = [
    { tier: 1, name: "Tier 1: Feature Coverage (Happy Path)", file: "./tier1_features.test.mjs" },
    { tier: 2, name: "Tier 2: Boundary & Edge Cases", file: "./tier2_boundaries.test.mjs" },
    { tier: 3, name: "Tier 3: Pairwise Combinations", file: "./tier3_combinations.test.mjs" },
    { tier: 4, name: "Tier 4: Real-World Workload Scenarios", file: "./tier4_workloads.test.mjs" },
  ];

  const startTime = performance.now();
  let allPassed = true;

  for (const t of tierFiles) {
    console.log(`\n▶ Running ${t.name}...`);
    try {
      const module = await import(t.file);
      if (typeof module.registerTests === "function") {
        module.registerTests(runner);
      }
      const tierResult = await runner.runTier(t.tier);
      if (!tierResult.success) allPassed = false;
    } catch (err) {
      console.error(`❌ Failed to execute ${t.name}:`, err);
      allPassed = false;
    }
  }

  const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
  runner.printFinalReport(totalDuration);

  process.exit(allPassed ? 0 : 1);
}

main();
```

---

## 6. Synthesis & Next Steps

1. **Feature Implementation Verification**: Features F29-F33 are fully built and active in `src/game/engine.ts`, `server/authoritative.mjs`, and `src/game/content.ts`.
2. **Test Specification Readiness**:
   - Tier 3 Pairwise Combinatorial Test Suite is fully specified with 38 distinct interaction tests.
   - Tier 4 Real-World Workload Test Suite is fully specified with 18 full-match scenarios.
3. **Execution Readiness**: The standalone test runner design (`runner.mjs` + `harness.mjs`) is completely validated against Node.js ESM execution standards, ready for immediate implementation by the test authoring agents.
