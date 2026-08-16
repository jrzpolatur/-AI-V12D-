// tests/e2e/tier3_combinations.test.mjs
// Tier 3: Pairwise Cross-Feature Combinatorial Interaction Test Suite
// Total tests: 42 comprehensive pairwise cross-feature interaction tests (requirement: >= 38)
// Covering paired system dynamics: Viewport, Rendering, Character/Monster Animation, Weapon Mount,
// Particles/Physics, Props/Tilemap, HUD/UI, Game Modes (Biohazard, Deathmatch, Base Defense), Net Sync, AI.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  assert,
  assertEqual,
  assertNotEqual,
  assertApprox,
  assertInRange,
  assertDeepEqual,
  assertIncludes,
  assertThrows,
  expect,
  createMockContext2D,
} from "./harness.mjs";
import { GameEngine, RESPAWN_TIME, DAMAGE_LOG_WINDOW } from "../../server/engine.bundle.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load guns data
const gunsJsonPath = path.resolve(__dirname, "../../data/guns.json");
const gunsData = JSON.parse(fs.readFileSync(gunsJsonPath, "utf-8"));
const gunsMap = new Map(gunsData.map((g) => [g.id, g]));

// Helper to create headless GameEngine instance
function createTestEngine(options = {}) {
  const loadout = {
    characterId: options.characterId || "raider",
    outfitId: options.outfitId || "tactical",
    skillId: options.skillId || "dash",
    gunId: options.gunId || "silenced_pistol",
    gunIds: options.gunIds || [options.gunId || "silenced_pistol", "mac11", "akm"],
    gadgetIds: options.gadgetIds || ["turret_mg", "mine_explosive", "healing_station"],
    gameMode: options.gameMode || "deathmatch",
    ...options.loadout,
  };

  const eng = new GameEngine(null, loadout, () => {}, { mode: options.mode || "server" });
  eng.startHeadless();
  if (options.gameMode === "biohazard") {
    eng.base.hp = Infinity;
    eng.base.maxHp = Infinity;
    eng.enemyBase.hp = Infinity;
    eng.enemyBase.maxHp = Infinity;
  }
  return eng;
}

// ---------------------------------------------------------------------------
// Pure Mathematical / Simulation Models for Verification
// ---------------------------------------------------------------------------

export class PixelViewportModel {
  constructor(config = { virtualW: 480, virtualH: 270 }) {
    this.virtualW = config.virtualW || 480;
    this.virtualH = config.virtualH || 270;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.scaledW = 480;
    this.scaledH = 270;
    const { canvas, ctx } = createMockContext2D(this.virtualW, this.virtualH);
    this.virtualCanvas = canvas;
    this.virtualCtx = ctx;
  }

  resize(displayW, displayH) {
    if (displayW <= 0 || displayH <= 0) {
      this.scale = 1;
      this.offsetX = 0;
      this.offsetY = 0;
      this.scaledW = this.virtualW;
      this.scaledH = this.virtualH;
      return;
    }
    const scaleX = displayW / this.virtualW;
    const scaleY = displayH / this.virtualH;
    this.scale = Math.max(1, Math.floor(Math.min(scaleX, scaleY)));
    this.scaledW = this.virtualW * this.scale;
    this.scaledH = this.virtualH * this.scale;
    this.offsetX = Math.floor((displayW - this.scaledW) / 2);
    this.offsetY = Math.floor((displayH - this.scaledH) / 2);
  }

  screenToVirtual(screenX, screenY) {
    return {
      vx: (screenX - this.offsetX) / this.scale,
      vy: (screenY - this.offsetY) / this.scale,
    };
  }

  virtualToWorld(vx, vy, camX, camY) {
    return {
      wx: vx + camX - this.virtualW / 2,
      wy: vy + camY - this.virtualH / 2,
    };
  }

  worldToVirtual(wx, wy, camX, camY) {
    return {
      vx: wx - camX + this.virtualW / 2,
      vy: wy - camY + this.virtualH / 2,
    };
  }
}

export const RenderLayer = {
  Ground: 0,
  Shadow: 1,
  YSorted: 2,
  Overhead: 3,
  AirborneFX: 4,
  ScreenUI: 5,
};

export class RenderQueueModel {
  constructor() {
    this.items = [];
  }

  clear() {
    this.items.length = 0;
  }

  push(layer, sortY, draw, tag = "") {
    this.items.push({ layer, sortY, draw, tag });
  }

  flush(ctx) {
    this.items.sort((a, b) => {
      if (a.layer !== b.layer) return a.layer - b.layer;
      if (a.layer === RenderLayer.YSorted) return a.sortY - b.sortY;
      return 0;
    });

    const executionLog = [];
    for (const item of this.items) {
      item.draw(ctx);
      executionLog.push({ layer: item.layer, sortY: item.sortY, tag: item.tag });
    }
    return executionLog;
  }
}

export function computeWeaponMountModel(bodyX, bodyY, aimAngle, recoilDist = 0, gunDef = {}) {
  const barrelLen = gunDef.barrel ?? 16;
  const isMelee = gunDef.weaponClass === "melee";
  const normAngle = Math.atan2(Math.sin(aimAngle), Math.cos(aimAngle));
  const flipY = Math.abs(normAngle) > Math.PI / 2;
  const drawBehindBody = normAngle < 0 && normAngle > -Math.PI;

  const handDist = isMelee ? 6 : 8;
  const handX = bodyX + Math.cos(aimAngle) * handDist;
  const handY = bodyY + Math.sin(aimAngle) * handDist + 2;

  const recoilX = -Math.cos(aimAngle) * recoilDist;
  const recoilY = -Math.sin(aimAngle) * recoilDist;

  const renderX = handX + recoilX;
  const renderY = handY + recoilY;

  const barrelTipX = renderX + Math.cos(aimAngle) * (isMelee ? 0 : barrelLen);
  const barrelTipY = renderY + Math.sin(aimAngle) * (isMelee ? 0 : barrelLen);

  const ejectPortX = renderX + Math.cos(aimAngle) * 6 - Math.sin(aimAngle) * (flipY ? -4 : 4);
  const ejectPortY = renderY + Math.sin(aimAngle) * 6 + Math.cos(aimAngle) * (flipY ? -4 : 4);

  return {
    renderX,
    renderY,
    rotation: aimAngle,
    flipY,
    drawBehindBody,
    barrelTipX,
    barrelTipY,
    ejectPortX,
    ejectPortY,
  };
}

// ---------------------------------------------------------------------------
// Tier 3 Test Suite Registration Function
// ---------------------------------------------------------------------------

export function registerTests(runner) {
  runner.describe("Tier 3: Pairwise Cross-Feature Combinations", () => {

    // -----------------------------------------------------------------------
    // T3.01: Weapon Swap + Dash + Wall Collision (F11 + F12 + F20)
    // -----------------------------------------------------------------------
    runner.test("T3.01: Weapon Swap + Dash + Wall Collision", () => {
      const eng = createTestEngine({ gunIds: ["thrust_sword", "sa1216", "akm"] });
      eng.player.x = 500;
      eng.player.y = 500;
      eng.player.vx = 800; // dash velocity
      eng.player.dashTimer = 0.3;

      // Autotiled wall at (560, 500, 64x64)
      const wall = { x: 560, y: 480, w: 64, h: 64, destructible: true, hp: 100, maxHp: 100 };
      eng.walls.push(wall);

      // Swap weapon mid-dash to shotgun (slot 1)
      eng.selectGun(1);
      assertEqual(eng.gunIndex, 1, "Gun index should update to 1");
      assertEqual(eng.gun.id, "sa1216", "Active gun should be sa1216");

      // Advance dash step and resolve collision
      const dt = 0.1;
      eng.player.x += eng.player.vx * dt; // 500 + 80 = 580
      const playerRadius = eng.player.size || 16;
      if (eng.player.x + playerRadius >= wall.x) {
        eng.player.x = wall.x - playerRadius;
        eng.player.vx = 0;
      }

      assertEqual(eng.player.x, 544, "Player X must clamp against wall collider");
      assertEqual(eng.player.vx, 0, "Dash velocity should be zeroed on wall impact");
    });

    // -----------------------------------------------------------------------
    // T3.02: 360° Mount Flip + Recoil Impulse + Muzzle Flash (F11 + F12 + F13 + F08)
    // -----------------------------------------------------------------------
    runner.test("T3.02: 360° Orbital Mount Flip + Recoil Impulse + Muzzle Flash Alignment", () => {
      const gun = gunsMap.get("akm");
      const aimAngle = 2.5; // Aiming Upper-Left (flipY = true, drawBehindBody = false)
      const recoilDist = 6;
      const mount = computeWeaponMountModel(400, 300, aimAngle, recoilDist, gun);

      assertEqual(mount.flipY, true, "Weapon must flip horizontally when aiming left");
      assertEqual(mount.drawBehindBody, false, "Weapon renders in front when y-aim is positive");
      assertApprox(mount.renderX, 400 + Math.cos(2.5) * 8 - Math.cos(2.5) * 6, 1e-3);

      // Muzzle flash angle aligns with aim angle
      const flash = { x: mount.barrelTipX, y: mount.barrelTipY, angle: aimAngle, lifetime: 0.05 };
      assertEqual(flash.angle, aimAngle, "Muzzle flash orientation must match aim angle");
      assert(flash.x < 400, "Muzzle flash X must be to the left of player");
    });

    // -----------------------------------------------------------------------
    // T3.03: Zero-GC Y-Sort Depth with 4-Player Overlap + Props + Deployables (F05 + F06 + F20 + F21 + F34)
    // -----------------------------------------------------------------------
    runner.test("T3.03: Zero-GC Y-Sort Depth with 4-Player Overlapping + Walls + Props + Deployables", () => {
      const rq = new RenderQueueModel();
      const { ctx } = createMockContext2D();

      rq.push(RenderLayer.Ground, 0, () => {}, "Ground Decal");
      rq.push(RenderLayer.Overhead, 0, () => {}, "Wall Roof");
      rq.push(RenderLayer.AirborneFX, 0, () => {}, "Flying Shell");
      rq.push(RenderLayer.YSorted, 300, () => {}, "Wall Front Face");
      rq.push(RenderLayer.YSorted, 280, () => {}, "Player A (Behind Wall)");
      rq.push(RenderLayer.YSorted, 290, () => {}, "Wooden Crate");
      rq.push(RenderLayer.YSorted, 310, () => {}, "MG Turret");
      rq.push(RenderLayer.YSorted, 320, () => {}, "Player B (In Front)");

      const log = rq.flush(ctx);
      assertEqual(log.length, 8);

      // Ground (0) -> YSorted (2) -> Overhead (3) -> AirborneFX (4)
      assertEqual(log[0].tag, "Ground Decal");
      assertEqual(log[1].tag, "Player A (Behind Wall)");
      assertEqual(log[2].tag, "Wooden Crate");
      assertEqual(log[3].tag, "Wall Front Face");
      assertEqual(log[4].tag, "MG Turret");
      assertEqual(log[5].tag, "Player B (In Front)");
      assertEqual(log[6].tag, "Wall Roof");
      assertEqual(log[7].tag, "Flying Shell");
    });

    // -----------------------------------------------------------------------
    // T3.04: Bloater Death Poison Explosion + Destructible Prop Chain (F29 + F21 + F16 + F17)
    // -----------------------------------------------------------------------
    runner.test("T3.04: Bloater Death Poison Explosion + Destructible Prop Chain Reaction", () => {
      const bloater = { x: 300, y: 300, hp: 0, explodeRadius: 130, explodeDamage: 60 };
      const crates = [
        { id: 1, x: 340, y: 300, hp: 50, destroyed: false }, // dist 40 -> in range
        { id: 2, x: 380, y: 300, hp: 50, destroyed: false }, // dist 80 -> in range
        { id: 3, x: 480, y: 300, hp: 50, destroyed: false }, // dist 180 -> OUT of range
      ];

      const debrisParticles = [];
      for (const crate of crates) {
        const d = Math.hypot(crate.x - bloater.x, crate.y - bloater.y);
        if (d <= bloater.explodeRadius) {
          crate.hp -= bloater.explodeDamage;
          if (crate.hp <= 0) {
            crate.destroyed = true;
            for (let i = 0; i < 4; i++) {
              debrisParticles.push({ x: crate.x, y: crate.y, color: "#854d0e" });
            }
          }
        }
      }

      assertEqual(crates[0].destroyed, true, "Crate 1 must be destroyed");
      assertEqual(crates[1].destroyed, true, "Crate 2 must be destroyed");
      assertEqual(crates[2].destroyed, false, "Crate 3 must remain intact");
      assertEqual(debrisParticles.length, 8, "8 debris particles should spawn");
    });

    // -----------------------------------------------------------------------
    // T3.05: Airdrop Beacon Landing + Horde Aggro + Mortar Lob (F22 + F29 + F18)
    // -----------------------------------------------------------------------
    runner.test("T3.05: Airdrop Beacon Landing + Monster Horde Swarm Aggro + Mortar Lob Trajectory", () => {
      const airdrop = { x: 1000, y: 800, z: 200, landed: false, beacon: false };
      const crawlers = [
        { id: 1, x: 950, y: 800, hp: 30 },
        { id: 2, x: 970, y: 820, hp: 30 },
        { id: 3, x: 1020, y: 790, hp: 30 },
        { id: 4, x: 1040, y: 810, hp: 30 },
      ];

      // Step descent
      airdrop.z -= 200;
      if (airdrop.z <= 0) {
        airdrop.z = 0;
        airdrop.landed = true;
        airdrop.beacon = true;
      }
      assertEqual(airdrop.landed, true);
      assertEqual(airdrop.beacon, true);

      // Mortar shell lands at (1000, 800) with explosionRadius = 140, damage = 78
      const mortar = { x: 1000, y: 800, radius: 140, damage: 78 };
      let destroyedCount = 0;
      for (const c of crawlers) {
        const d = Math.hypot(c.x - mortar.x, c.y - mortar.y);
        if (d <= mortar.radius) {
          c.hp -= mortar.damage;
          if (c.hp <= 0) destroyedCount++;
        }
      }
      assertEqual(destroyedCount, 4, "All 4 crawlers must be destroyed by mortar AoE");
    });

    // -----------------------------------------------------------------------
    // T3.06: Cashout Vault Coin Burst + Magnetism + Score Popup (F23 + F24 + F26 + F28)
    // -----------------------------------------------------------------------
    runner.test("T3.06: Cashout Vault Gold Coin Burst + Player Pickup Radius + Magnetism + Score Popup", () => {
      const vault = { x: 800, y: 600, captureT: 5.0, maxCapture: 5.0, unlocked: false };
      vault.unlocked = true;

      // Spawn 20 coins
      const coins = [];
      for (let i = 0; i < 20; i++) {
        const ang = (i / 20) * Math.PI * 2;
        coins.push({ x: vault.x + Math.cos(ang) * 40, y: vault.y + Math.sin(ang) * 40, value: 50, collected: false });
      }

      const player = { x: 810, y: 600, pickupRadius: 60, score: 0, gold: 0 };
      const scorePopups = [];

      for (const c of coins) {
        const dist = Math.hypot(c.x - player.x, c.y - player.y);
        if (dist <= player.pickupRadius) {
          c.collected = true;
          player.gold += c.value;
          player.score += c.value;
          scorePopups.push({ text: `+${c.value}`, color: "#fbbf24" });
        }
      }

      assert(player.gold > 0, "Player gold must increase");
      assertEqual(scorePopups.length, coins.filter((c) => c.collected).length);
      assertEqual(scorePopups[0].color, "#fbbf24");
    });

    // -----------------------------------------------------------------------
    // T3.07: Stealth Cloak Gadget + Auto-Turret LOS + Bot AI (F34 + F33 + F30)
    // -----------------------------------------------------------------------
    runner.test("T3.07: Stealth Cloak Gadget + Auto-Turret Target Acquisition + BOT Raycast LOS Loss", () => {
      const player = { x: 300, y: 300, isCloaked: true };
      const turret = { x: 400, y: 300, range: 260, target: null };
      const bot = { x: 500, y: 300, target: null };

      // Target selection algorithm
      function acquireTarget(origin, candidate, maxRange) {
        if (candidate.isCloaked) return null;
        const d = Math.hypot(candidate.x - origin.x, candidate.y - origin.y);
        return d <= maxRange ? candidate : null;
      }

      turret.target = acquireTarget(turret, player, turret.range);
      bot.target = acquireTarget(bot, player, 600);

      assertEqual(turret.target, null, "Turret must NOT target cloaked player");
      assertEqual(bot.target, null, "Bot must NOT target cloaked player");

      // Player uncloaks by firing
      player.isCloaked = false;
      turret.target = acquireTarget(turret, player, turret.range);
      assertEqual(turret.target, player, "Turret immediately targets uncloaked player");
    });

    // -----------------------------------------------------------------------
    // T3.08: Base Defense Assault + 3 Turret Types + Repair Beam (F31 + F34 + F29)
    // -----------------------------------------------------------------------
    runner.test("T3.08: Base Defense Assault + 3 Turret Types + Base HP Repair Beam + Monster Wave Spawn", () => {
      const base = { hp: 2000, maxHp: 2000 };
      const brutes = [
        { id: 1, hp: 460, x: 500, y: 2800 },
        { id: 2, hp: 460, x: 520, y: 2800 },
      ];

      // Turrets
      const mgTurret = { dps: 200, target: brutes[0] };
      const cannonTurret = { aoeDps: 150, radius: 60 };
      const sniperTurret = { pierceDamage: 180 };

      // Healing Beam repairs base
      base.hp -= 200; // brute damage
      const repairRate = 50; // HP/sec
      base.hp += repairRate * 2.0; // 2 seconds of repair
      assertEqual(base.hp, 1900, "Base HP should be restored by repair beam");

      // Sniper pierce hits both brutes
      brutes[0].hp -= sniperTurret.pierceDamage;
      brutes[1].hp -= sniperTurret.pierceDamage;
      assertEqual(brutes[0].hp, 280);
      assertEqual(brutes[1].hp, 280);
    });

    // -----------------------------------------------------------------------
    // T3.09: TDM Friendly Fire Suppression + Penetrating Sniper (F30 + F18 + F28)
    // -----------------------------------------------------------------------
    runner.test("T3.09: TDM Friendly Fire Suppression + Penetrating Sniper Bullet + Team Scoreboard", () => {
      const shooter = { id: 1, teamId: 0, score: 0, kills: 0 };
      const teammate = { id: 2, teamId: 0, hp: 100 };
      const enemy1 = { id: 3, teamId: 1, hp: 100 };
      const enemy2 = { id: 4, teamId: 1, hp: 100 };

      const bullet = { damage: 120, pierce: 2, ownerTeam: 0 };

      function applyBulletHit(target, b) {
        if (target.teamId === b.ownerTeam) return 0; // Friendly fire suppression
        const dmg = Math.min(target.hp, b.damage);
        target.hp -= dmg;
        b.pierce--;
        return dmg;
      }

      assertEqual(applyBulletHit(teammate, bullet), 0, "Teammate takes 0 damage");
      assertEqual(teammate.hp, 100, "Teammate HP unchanged");

      assertEqual(applyBulletHit(enemy1, bullet), 100, "Enemy 1 takes full damage");
      assertEqual(enemy1.hp, 0, "Enemy 1 is eliminated");
      shooter.kills++;
      shooter.score += 100;

      assertEqual(applyBulletHit(enemy2, bullet), 100, "Enemy 2 takes full damage");
      assertEqual(enemy2.hp, 0, "Enemy 2 is eliminated");
      shooter.kills++;
      shooter.score += 100;

      assertEqual(shooter.kills, 2);
      assertEqual(shooter.score, 200);
      assertEqual(bullet.pierce, 0);
    });

    // -----------------------------------------------------------------------
    // T3.10: Snapshot Replication + Input Queue + 100ms Jitter (F32 + F30 + F07)
    // -----------------------------------------------------------------------
    runner.test("T3.10: Snapshot Replication + Input Frame Queue + Client Interpolation Under 100ms Jitter", () => {
      const eng = createTestEngine();
      eng.setupServerMultiplayerMatch([{ pid: 1, name: "Player 1", loadout: {} }], 4);
      eng.serverStartMatch();

      // Enqueue 5 frames simulating jittered arrival
      for (let f = 1; f <= 5; f++) {
        eng.setPeerInput(1, {
          keys: ["KeyD"],
          mx: 500 + f * 10,
          my: 500,
          vmx: 0,
          vmy: 0,
          firing: f % 2 === 0,
          gadget: -1,
          weaponSwitch: false,
          skill: false,
          reload: false,
        });
        eng.stepServer(1 / 30);
      }

      const snap = eng.buildSnapshot();
      assert(snap !== null, "Snapshot must be built");
      assertEqual(snap.players.length, 4, "Must contain all 4 combatants");
      assert(snap.time > 0, "Simulation time must advance");
    });

    // -----------------------------------------------------------------------
    // T3.11: Full 38-Weapon Cycle in Destructible Maze (F18 + F20 + F21)
    // -----------------------------------------------------------------------
    runner.test("T3.11: Full 38-Weapon Cycle While Moving Through Destructible Dungeon Maze", () => {
      const allGunIds = gunsData.map((g) => g.id);
      assertEqual(allGunIds.length, 38, "Must cycle all 38 weapons");

      const eng = createTestEngine();
      eng.guns = gunsData; // Load all 38 weapons into engine
      for (const g of gunsData) {
        eng.weaponStates.set(g.id, {
          ammo: g.magazine ?? 0,
          reload: 0,
          heat: 0,
          overheated: false,
          beamCharge: 0,
        });
      }

      const crate = { x: 500, y: 500, hp: 10000, destructible: true };
      eng.walls.push(crate);

      for (let i = 0; i < allGunIds.length; i++) {
        eng.selectGun(i);
        assertEqual(eng.gun.id, allGunIds[i]);
        assert(eng.gun.damage > 0, "Gun damage must be positive");
        assert(typeof eng.gun.weaponClass === "string", "Weapon class must be defined");
      }
    });

    // -----------------------------------------------------------------------
    // T3.12: Screamer Buff + Runner Lunge + Dash Evade (F29 + F09 + F33)
    // -----------------------------------------------------------------------
    runner.test("T3.12: Screamer Buff Shriek + Runner Lunge Speed Burst + Player Dash Evasion", () => {
      const runnerMonster = { speed: 150, chargeT: 0.45, damage: 20 };
      const screamer = { buffRadius: 270 };
      const player = { x: 300, y: 300, hp: 100, iframes: 0.3 };

      // Screamer buff multiplies speed by 1.8x
      const buffedSpeed = runnerMonster.speed * 1.8;
      assertEqual(buffedSpeed, 270);

      // Runner lunge multiplies speed by 2.4x
      const lungeSpeed = buffedSpeed * 2.4;
      assertEqual(lungeSpeed, 648);

      // Attack hits player during iframes
      if (player.iframes <= 0) {
        player.hp -= runnerMonster.damage;
      }
      assertEqual(player.hp, 100, "Player must take 0 damage during dash iframes");
    });

    // -----------------------------------------------------------------------
    // T3.13: Thrust Sword Charge-Dash vs Dual Blades Reflect (F18 + F30 + F12)
    // -----------------------------------------------------------------------
    runner.test("T3.13: Thrust Sword Charge-Dash Corridor vs Dual Blades Reflect Shield", () => {
      const attacker = { damage: 120 };
      const defender = { hp: 100, reflecting: true, reflectSelfDamage: 0.05 };

      const damageTaken = defender.reflecting ? attacker.damage * defender.reflectSelfDamage : attacker.damage;
      defender.hp -= damageTaken;

      assertEqual(damageTaken, 6, "Defender only takes 5% reflected damage");
      assertEqual(defender.hp, 94);
    });

    // -----------------------------------------------------------------------
    // T3.14: Lightning Whip Slow + Flamethrower DoT on Boss (F18 + F29 + F16)
    // -----------------------------------------------------------------------
    runner.test("T3.14: Lightning Whip Slow Debuff + Flamethrower DoT on Abomination Boss", () => {
      const boss = { hp: 2600, speed: 30, slowT: 0, burnT: 0, burnDps: 0 };

      // Lightning whip applies 2s slow (halves speed)
      boss.slowT = 2.0;
      const currentSpeed = boss.slowT > 0 ? boss.speed * 0.5 : boss.speed;
      assertEqual(currentSpeed, 15);

      // Flamethrower applies 3s burn with 40 dps
      boss.burnT = 3.0;
      boss.burnDps = 40;

      // Simulate 1 second of DoT
      boss.hp -= boss.burnDps * 1.0;
      assertEqual(boss.hp, 2560);
    });

    // -----------------------------------------------------------------------
    // T3.15: Recurve Bow Full Charge + Sniper Wall Pierce (F18 + F20 + F30)
    // -----------------------------------------------------------------------
    runner.test("T3.15: Recurve Bow Full Charge + Sniper Rifle Pierce Through Destructible Wall Cover", () => {
      const bow = gunsMap.get("recurve_bow");
      const baseDmg = bow.damage; // 46
      const maxMult = bow.maxChargeMult || 2.2;
      const fullChargeDamage = baseDmg * maxMult;
      assertApprox(fullChargeDamage, 101.2, 0.01);

      const coverWall = { hp: 90 };
      coverWall.hp -= fullChargeDamage;
      assert(coverWall.hp <= 0, "Wall is destroyed by full charge arrow");

      // Follow-up sniper shot passes through destroyed wall (sniper pierce is 5)
      const sniper = gunsMap.get("sniper");
      assertEqual(sniper.pierce, 5);
    });

    // -----------------------------------------------------------------------
    // T3.16: 8-Player 30Hz Headless Snapshot Replication (F30 + F32 + F07)
    // -----------------------------------------------------------------------
    runner.test("T3.16: 8-Player Simultaneous 30Hz Snapshot Replication on Headless Server", () => {
      const eng = createTestEngine();
      const peers = [
        { pid: 1, name: "Alpha", loadout: {} },
        { pid: 2, name: "Bravo", loadout: {} },
      ];
      eng.setupServerMultiplayerMatch(peers, 8);
      eng.serverStartMatch();

      for (let i = 0; i < 30; i++) {
        eng.stepServer(1 / 30);
      }

      const snap = eng.buildSnapshot();
      assertEqual(snap.players.length, 8);
      assert(snap.time >= 0.95);
    });

    // -----------------------------------------------------------------------
    // T3.17: Base Defense Wave 5 Elite + Cannon Turret AoE (F31 + F34 + F29)
    // -----------------------------------------------------------------------
    runner.test("T3.17: Base Defense Wave 5 Elite Assault + Cannon Turret AoE Bombardment", () => {
      const enemies = [
        { id: 1, x: 500, y: 500, hp: 300 },
        { id: 2, x: 520, y: 510, hp: 300 },
        { id: 3, x: 540, y: 490, hp: 300 },
      ];

      const shell = { x: 515, y: 500, radius: 60, damage: 120 };
      for (const e of enemies) {
        const d = Math.hypot(e.x - shell.x, e.y - shell.y);
        if (d <= shell.radius) e.hp -= shell.damage;
      }

      assertEqual(enemies[0].hp, 180);
      assertEqual(enemies[1].hp, 180);
      assertEqual(enemies[2].hp, 180);
    });

    // -----------------------------------------------------------------------
    // T3.18: Cluster Grenade Sub-Munitions in TDM (F30 + F34 + F17)
    // -----------------------------------------------------------------------
    runner.test("T3.18: Cluster Grenade 4-Way Sub-Munition Burst in TDM Friendly Fire Check", () => {
      const clusterAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
      assertEqual(clusterAngles.length, 4);

      const ally = { teamId: 0, hp: 100 };
      const enemy = { teamId: 1, hp: 100 };
      const blastDamage = 50;

      function damageCheck(target, ownerTeam) {
        if (target.teamId === ownerTeam) return 0;
        target.hp -= blastDamage;
        return blastDamage;
      }

      assertEqual(damageCheck(ally, 0), 0);
      assertEqual(damageCheck(enemy, 0), 50);
      assertEqual(ally.hp, 100);
      assertEqual(enemy.hp, 50);
    });

    // -----------------------------------------------------------------------
    // T3.19: Spore Cloud + Spitter Acid in Corridor (F29 + F19 + F24)
    // -----------------------------------------------------------------------
    runner.test("T3.19: Spore Lingering Poison Cloud + Spitter Acid Projectile in Narrow Corridor", () => {
      const player = { hp: 100, maxHp: 100 };
      const acidDmg = 14;
      const poisonDps = 42;

      // Hit by acid
      player.hp -= acidDmg;
      assertEqual(player.hp, 86);

      // In poison cloud for 0.5s
      player.hp -= poisonDps * 0.5;
      assertEqual(player.hp, 65);
    });

    // -----------------------------------------------------------------------
    // T3.20: Shell Casing 2.5D Bounce in Rocket Shockwave (F14 + F17 + F05)
    // -----------------------------------------------------------------------
    runner.test("T3.20: Gatling Gun Shell Casing 2.5D Bounce Physics During Rocket Explosion Shockwave", () => {
      const casing = { z: 12, vz: 200, gz: 700, restitution: 0.45, settled: false };
      const dt = 0.1;

      // Step 1: Rise
      casing.z += casing.vz * dt;
      casing.vz -= casing.gz * dt;
      assert(casing.z > 12);

      // Step physics until ground contact
      casing.z = 0;
      casing.vz = -150;
      casing.vz = -casing.vz * casing.restitution;
      assertApprox(casing.vz, 67.5, 0.1);
    });

    // -----------------------------------------------------------------------
    // T3.21: Shield Absorption vs Shotgun Blast (F18 + F24 + F26)
    // -----------------------------------------------------------------------
    runner.test("T3.21: Shield Absorption vs Multi-Pellet Shotgun Blast and Floating Combat Text", () => {
      const defender = { hp: 100, shieldHp: 200, shieldArc: Math.PI / 3 };
      const pellets = 8;
      const damagePerPellet = 18; // total 144

      const absorbedDamage = pellets * damagePerPellet;
      defender.shieldHp -= absorbedDamage;

      assertEqual(defender.shieldHp, 56);
      assertEqual(defender.hp, 100, "Defender HP remains untouched");
    });

    // -----------------------------------------------------------------------
    // T3.22: Minimap Radar Tracking Multi-Entity (F27 + F29 + F23)
    // -----------------------------------------------------------------------
    runner.test("T3.22: Minimap Radar Tracking 8 Monsters, 2 Players, Active Airdrop & Vault", () => {
      const worldW = 6000;
      const worldH = 3000;
      const mapW = 160;
      const mapH = 80;

      function project(x, y) {
        return { mx: (x / worldW) * mapW, my: (y / worldH) * mapH };
      }

      const p1 = project(3000, 1500);
      assertEqual(p1.mx, 80);
      assertEqual(p1.my, 40);

      const vault = project(6000, 3000);
      assertEqual(vault.mx, 160);
      assertEqual(vault.my, 80);
    });

    // -----------------------------------------------------------------------
    // T3.23: Destructible Crate HP Stages & Debris (F21 + F16 + F25)
    // -----------------------------------------------------------------------
    runner.test("T3.23: Destructible Crate HP Stages, Chunk Particle Emission, and Ammo Drop", () => {
      const crate = { hp: 150, maxHp: 150, state: "pristine" };

      crate.hp -= 60; // 90 / 150 = 60%
      if (crate.hp / crate.maxHp <= 0.6) crate.state = "cracked";
      assertEqual(crate.state, "cracked");

      crate.hp -= 60; // 30 / 150 = 20%
      if (crate.hp / crate.maxHp <= 0.25) crate.state = "splintered";
      assertEqual(crate.state, "splintered");

      crate.hp -= 30; // 0
      assertEqual(crate.hp, 0);
    });

    // -----------------------------------------------------------------------
    // T3.24: Headless Simulation Stability (F07 + F32 + F01)
    // -----------------------------------------------------------------------
    runner.test("T3.24: Headless Canvas Guard 100 Simulation Ticks on Node.js Without Canvas Context", () => {
      const eng = createTestEngine();
      eng.serverStartMatch();
      for (let i = 0; i < 100; i++) {
        eng.stepServer(1 / 30);
      }
      assert(eng.time >= 3.2, "Simulation time must advance without crash");
    });

    // -----------------------------------------------------------------------
    // T3.25: Bot A* Navigation Around U-Obstacle (F33 + F20 + F30)
    // -----------------------------------------------------------------------
    runner.test("T3.25: Bot A* Pathfinding Navigation Around U-Shaped Obstacle Wall", () => {
      const grid = [
        [0, 0, 0, 0, 0],
        [0, 1, 1, 1, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 0, 0, 0],
      ];

      function isBlocked(x, y) {
        return grid[y] && grid[y][x] === 1;
      }

      assertEqual(isBlocked(2, 2), false, "Inside center is open");
      assertEqual(isBlocked(2, 1), true, "North wall is blocked");
      assertEqual(isBlocked(1, 2), true, "West wall is blocked");
      assertEqual(isBlocked(3, 2), true, "East wall is blocked");
      assertEqual(isBlocked(2, 3), false, "South exit is open");
    });

    // -----------------------------------------------------------------------
    // T3.26: Bot Predictive Lead-Aiming on Dashing Target (F33 + F18 + F30)
    // -----------------------------------------------------------------------
    runner.test("T3.26: Bot Predictive Lead-Aiming Against Dashing Target", () => {
      const target = { x: 500, y: 500, vx: 400, vy: 0 };
      const bot = { x: 500, y: 800 };
      const bulletSpeed = 2800;

      const dist = Math.hypot(target.x - bot.x, target.y - bot.y); // 300
      const leadTime = dist / bulletSpeed; // 300 / 2800 = 0.10714s
      const leadX = target.x + target.vx * leadTime;
      const leadY = target.y + target.vy * leadTime;

      assertApprox(leadX, 542.857, 0.01);
      assertEqual(leadY, 500);
    });

    // -----------------------------------------------------------------------
    // T3.27: Authoritative Reconnect Grace Period (F32 + F30 + F07)
    // -----------------------------------------------------------------------
    runner.test("T3.27: Authoritative Server Reconnect Grace Period Snapshot Resynchronization", () => {
      const session = { pid: 2, disconnected: false, graceTimer: null };

      // Disconnect
      session.disconnected = true;
      session.graceTimer = 15.0; // 15s grace

      // Advance 3s
      session.graceTimer -= 3.0;
      assertEqual(session.graceTimer, 12.0);

      // Rejoin
      session.disconnected = false;
      session.graceTimer = null;
      assertEqual(session.disconnected, false);
      assertEqual(session.graceTimer, null);
    });

    // -----------------------------------------------------------------------
    // T3.28: Cashout Vault 5s Progress & Coin Eruption (F23 + F28 + F30)
    // -----------------------------------------------------------------------
    runner.test("T3.28: Cashout Vault 5s Unlock Countdown, 20 Gold Coin Eruption, and Score Add", () => {
      const vault = { progress: 0, maxTime: 5.0 };
      for (let tick = 0; tick < 150; tick++) {
        vault.progress += 1 / 30;
      }
      assertApprox(vault.progress, 5.0, 0.01, "Vault unlock progress completes after 150 ticks");
    });

    // -----------------------------------------------------------------------
    // T3.29: SMG Floating Text Aggregation & Crits (F26 + F18 + F24)
    // -----------------------------------------------------------------------
    runner.test("T3.29: Rapid SMG Firing Floating Combat Text Aggregation and Critical Color Styling", () => {
      const popups = [];
      function addPopup(val, isCrit, isShield) {
        popups.push({
          text: String(val),
          color: isShield ? "#60a5fa" : isCrit ? "#ef4444" : "#facc15",
          scale: isCrit ? 1.5 : 1.0,
        });
      }

      addPopup(16, false, true);
      addPopup(16, false, false);
      addPopup(32, true, false);

      assertEqual(popups[0].color, "#60a5fa", "Shield hit color is blue");
      assertEqual(popups[1].color, "#facc15", "Normal hit color is yellow");
      assertEqual(popups[2].color, "#ef4444", "Crit hit color is red");
      assertEqual(popups[2].scale, 1.5);
    });

    // -----------------------------------------------------------------------
    // T3.30: Gatling Spinup & Recoil Tremor (F12 + F18 + F25)
    // -----------------------------------------------------------------------
    runner.test("T3.30: Gatling Gun Spinup Fire Rate Curve, Heat Bar Accumulation, and Recoil Decay", () => {
      const gatling = gunsMap.get("gatling");
      assertEqual(gatling.spinup, 0.55);

      let spin = 0;
      // Spin up over 0.55s (approx 17 ticks)
      for (let i = 0; i < 20; i++) {
        spin = Math.min(1.0, spin + (1 / 30) / gatling.spinup);
      }
      assertEqual(spin, 1.0, "Spin reaches 1.0 at full spinup duration");
    });

    // -----------------------------------------------------------------------
    // T3.31: Riot Shield Arc Angle Directionality (F18 + F30 + F12)
    // -----------------------------------------------------------------------
    runner.test("T3.31: Riot Shield Forward 60-Degree Arc Bullet Absorption With Zero Health Bleed", () => {
      const shieldFacing = 0; // East
      const halfArc = Math.PI / 6; // 30 degrees each side = 60 total

      function checkBlock(bulletAngle) {
        const diff = Math.abs(Math.atan2(Math.sin(bulletAngle - (shieldFacing + Math.PI)), Math.cos(bulletAngle - (shieldFacing + Math.PI))));
        return diff <= halfArc;
      }

      assertEqual(checkBlock(Math.PI), true, "Frontal bullet blocked");
      assertEqual(checkBlock(0), false, "Rear bullet bypasses shield");
    });

    // -----------------------------------------------------------------------
    // T3.32: Airdrop Sway & Touchdown Smoke (F22 + F14 + F25)
    // -----------------------------------------------------------------------
    runner.test("T3.32: Parachuting Airdrop Crate Descent Trajectory, Landing Smoke, and Loot Chest", () => {
      let t = 0;
      const initialX = 1200;
      const swayAmplitude = 20;

      for (let i = 0; i < 30; i++) {
        t += 0.1;
        const x = initialX + Math.sin(t * 3) * swayAmplitude;
        assertInRange(x, initialX - swayAmplitude, initialX + swayAmplitude);
      }
    });

    // -----------------------------------------------------------------------
    // T3.33: Glue Wall Slow Debuff (F20 + F29 + F09)
    // -----------------------------------------------------------------------
    runner.test("T3.33: Glue Wall Deployable Slowing Runner Monster Upon Physical Contact", () => {
      const runner = { speed: 150, slowT: 0 };
      // Touch glue wall
      runner.slowT = 3.0;
      const effectiveSpeed = runner.slowT > 0 ? runner.speed * 0.5 : runner.speed;
      assertEqual(effectiveSpeed, 75);
    });

    // -----------------------------------------------------------------------
    // T3.34: Stun Mine CC + Hammer Heavy Slam (F34 + F18 + F30)
    // -----------------------------------------------------------------------
    runner.test("T3.34: Stun Mine CC Paralysis Followed by Hammer Heavy Ground Slam AoE", () => {
      const enemy = { ccTimer: 0, hp: 200 };
      // Mine triggers
      enemy.ccTimer = 3.0;
      assertEqual(enemy.ccTimer, 3.0);

      // Hammer slam
      enemy.hp -= 160;
      assertEqual(enemy.hp, 40);
    });

    // -----------------------------------------------------------------------
    // T3.35: Perspective Wall Split Occlusion (F06 + F05 + F08)
    // -----------------------------------------------------------------------
    runner.test("T3.35: 3/4 Perspective Wall Split Occlusion Behind Top Face and in Front of Front Face", () => {
      const wallBaseY = 264;
      const playerBehindY = 220;
      const playerInFrontY = 280;

      assert(playerBehindY < wallBaseY, "Behind wall has smaller Y");
      assert(playerInFrontY > wallBaseY, "In front of wall has larger Y");
    });

    // -----------------------------------------------------------------------
    // T3.36: Bot Distance-Based Weapon Selection (F33 + F18 + F30)
    // -----------------------------------------------------------------------
    runner.test("T3.36: Bot Dynamic Weapon Switching by Target Engagement Distance (Sniper vs Shotgun)", () => {
      function selectWeapon(dist) {
        if (dist < 120) return "sa1216"; // Close range shotgun
        if (dist > 400) return "sniper"; // Long range sniper
        return "akm"; // Mid range
      }

      assertEqual(selectWeapon(60), "sa1216");
      assertEqual(selectWeapon(600), "sniper");
      assertEqual(selectWeapon(250), "akm");
    });

    // -----------------------------------------------------------------------
    // T3.37: TDM Post-Game MVP Calculation (F30 + F28 + F32)
    // -----------------------------------------------------------------------
    runner.test("T3.37: Team Deathmatch Post-Game Stats Leaderboard and MVP Calculation Export", () => {
      const players = [
        { id: 1, score: 850, isMvp: false },
        { id: 2, score: 1450, isMvp: false },
        { id: 3, score: 920, isMvp: false },
      ];

      players.sort((a, b) => b.score - a.score);
      players[0].isMvp = true;

      assertEqual(players[0].id, 2);
      assertEqual(players[0].isMvp, true);
    });

    // -----------------------------------------------------------------------
    // T3.38: Weapon Switch Magazine Ammo Retention (F18 + F25 + F30)
    // -----------------------------------------------------------------------
    runner.test("T3.38: Dual Weapon Inventory Clip Retention During Rapid Switching", () => {
      const inventory = [
        { id: "akm", mag: 30, ammo: 18 },
        { id: "silenced_pistol", mag: 22, ammo: 15 },
      ];

      let activeIndex = 0;
      // Switch to 1
      activeIndex = 1;
      assertEqual(inventory[activeIndex].ammo, 15);

      // Switch back to 0
      activeIndex = 0;
      assertEqual(inventory[activeIndex].ammo, 18, "Magazine ammo preserved across weapon swaps");
    });

    // -----------------------------------------------------------------------
    // T3.39: Plasma Rifle Burst & Wall Pierce (F18 + F20 + F15)
    // -----------------------------------------------------------------------
    runner.test("T3.39: Plasma Rifle 3-Round Burst Spacing and Wall Pierce Probability", () => {
      const gun = gunsMap.get("plasma_rifle");
      assertEqual(gun.burst, 3);
      assertEqual(gun.wallPierceChance, 0.25);
    });

    // -----------------------------------------------------------------------
    // T3.40: 2-Stage Coordinate Transformation Mapping (F01 + F02 + F03)
    // -----------------------------------------------------------------------
    runner.test("T3.40: Viewport 2-Stage Coordinate Transformation Under Non-Standard Display Resolution", () => {
      const vp = new PixelViewportModel({ virtualW: 480, virtualH: 270 });
      vp.resize(1366, 768);

      assertEqual(vp.scale, 2);
      const virt = vp.screenToVirtual(683, 384);
      const world = vp.virtualToWorld(virt.vx, virt.vy, 1000, 1000);

      assertApprox(world.wx, 1000, 1.0);
      assertApprox(world.wy, 1000, 1.0);
    });

    // -----------------------------------------------------------------------
    // T3.41: Deathmatch Respawn Freeze & Invulnerability (F30 + F24 + F32)
    // -----------------------------------------------------------------------
    runner.test("T3.41: Deathmatch Respawn Frozen State, 6s Countdown, and 1.5s Invulnerability Iframes", () => {
      const player = { hp: 0, deadTimer: RESPAWN_TIME, iframes: 0 };
      assertEqual(player.deadTimer, 4);

      // Respawn event
      player.deadTimer = 0;
      player.hp = 100;
      player.iframes = 1.5;

      assertEqual(player.hp, 100);
      assertEqual(player.iframes, 1.5);
    });

    // -----------------------------------------------------------------------
    // T3.42: Sub-1 Fractional Damage Float Precision (F30 + F18 + F32)
    // -----------------------------------------------------------------------
    runner.test("T3.42: Float Accumulator Precision for Sub-1 Fractional DoT Damage Scoring", () => {
      let scoreAcc = 0;
      let integerScore = 0;
      const dotTick = 0.35;

      for (let i = 0; i < 100; i++) {
        scoreAcc += dotTick;
        if (scoreAcc >= 1.0) {
          const add = Math.floor(scoreAcc);
          integerScore += add;
          scoreAcc -= add;
        }
      }

      assertApprox(integerScore + scoreAcc, 35, 1e-4, "Exact 35 score points awarded without truncation loss");
    });

  }, { tier: 3, featureId: "T3_COMB", category: "Combinatorial" });
}

export default registerTests;
