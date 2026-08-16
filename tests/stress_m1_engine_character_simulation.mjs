/**
 * Engine Integration Stress Test for Milestone 1 Character & Animation System
 * Runs simulated live matches with diverse character/outfit loadouts, rapid status changes,
 * damage flash triggers, cloaking toggles, shield activation, and respawn protection rings.
 */

import assert from "node:assert/strict";

async function runEngineSimulationStress() {
  console.log("==========================================================================");
  console.log(" 🎮 RUNNING GAME ENGINE CHARACTER ANIMATION LIVE INTEGRATION STRESS 🎮");
  console.log("==========================================================================\n");

  const { GameEngine } = await import("../server/engine.bundle.mjs");

  const charList = [
    "raider",
    "juggernaut",
    "phantom",
    "sentinel",
    "medic",
    "demolitionist",
    "infiltrator",
    "sniper",
  ];

  const outfitList = [
    "tactical",
    "night",
    "desert",
    "neon",
    "crimson",
    "emerald",
    "assassin",
    "tycoon",
  ];

  // Track draw calls from mock canvas context
  const mockCalls = [];
  const mockCtx = {
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    fillRect(x, y, w, h) {
      mockCalls.push({ type: "fillRect", x, y, w, h });
    },
    strokeRect(x, y, w, h) {
      mockCalls.push({ type: "strokeRect", x, y, w, h });
    },
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    fill() {},
    stroke() {},
    setLineDash() {},
    getLineDash() {
      return [];
    },
    set fillStyle(v) {},
    get fillStyle() {
      return "#ffffff";
    },
    set strokeStyle(v) {},
    get strokeStyle() {
      return "#ffffff";
    },
    set lineWidth(v) {},
    get lineWidth() {
      return 1;
    },
    set globalAlpha(v) {},
    get globalAlpha() {
      return 1;
    },
  };

  console.log(`Testing with ${charList.length} Characters and ${outfitList.length} Outfits across game engine loops...`);

  for (const charId of charList) {
    for (const outfitId of outfitList) {
      const engine = new GameEngine(
        null,
        {
          characterId: charId,
          outfitId: outfitId,
          skillId: "dash",
          gunId: "smg",
          gunIds: ["smg", "shotgun", "rocket", "thrust_sword", "riot_shield", "bow"],
          gadgetIds: ["grenade_frag", "turret_mg", "healing_station"],
          gameMode: "biohazard",
        },
        () => {},
        { mode: "server" }
      );
      engine.startHeadless();
      engine.serverStartMatch();

      // Simulate 120 frames (~4 seconds of active match play per combination)
      for (let f = 0; f < 120; f++) {
        // Exercise states
        if (f === 10) engine.player.shieldTime = 2.0; // Shield halo active
        if (f === 30) engine.player.iframes = 1.5;   // Respawn ring active
        if (f === 50) engine.player.flash = 0.8;     // Damage hurt flash
        if (f === 70) engine.player.isCloaked = true;// Stealth cloaked
        if (f === 90) {
          engine.player.isCloaked = false;
          engine.player.vx = 450;
          engine.player.vy = 450;                    // High speed run
        }
        if (f === 110) {
          engine.player.thrustCharging = true;
          engine.player.thrustCharge = 0.6;          // Thrust sword charging
        }

        // Fixed timestep engine tick
        engine.stepServer(1 / 30);

        // Trigger draw calls through drawPlayer
        mockCalls.length = 0;
        assert.doesNotThrow(() => {
          engine.drawPlayer(mockCtx);
        }, `drawPlayer failed for char:${charId}, outfit:${outfitId} at frame ${f}`);

        assert(mockCalls.length > 0, `drawPlayer produced zero draw calls for char:${charId}, outfit:${outfitId}`);
      }
    }
  }

  console.log("✔ Successfully executed 120 frames across ALL character × outfit matrix combinations with zero errors!");
  console.log("==========================================================================\n");
}

runEngineSimulationStress().catch((err) => {
  console.error("Engine simulation stress failed:", err);
  process.exit(1);
});
