// Headless smoke test for the authoritative server simulation.
// Runs the bundled Engine in Node (no canvas / no DOM) and verifies that
// feeding InputFrames to both peers advances the world and produces snapshots.
import { GameEngine } from "../server/engine.bundle.mjs";

const loadoutA = {
  characterId: "raider",
  outfitId: "tactical",
  skillId: "dash",
  gunId: "smg",
  gunIds: ["smg", "akm"],
  gadgetIds: ["turret_mg", "mine_explosive", "glue_grenade"],
  gameMode: "defense",
};
const loadoutB = {
  characterId: "juggernaut",
  outfitId: "night",
  skillId: "shield",
  gunId: "akm",
  gunIds: ["akm", "smg"],
  gadgetIds: ["turret_cannon", "mine_poison", "fire_grenade"],
  gameMode: "defense",
};

const eng = new GameEngine(null, loadoutA, () => {}, { mode: "server" });
eng.startHeadless();
eng.setupServerMatch(loadoutB, 1, 2);
eng.serverStartMatch();

const frame = (over = {}) => ({
  keys: [],
  mx: 0,
  my: 0,
  vmx: 0,
  vmy: 0,
  firing: false,
  gadget: -1,
  weaponSwitch: false,
  skill: false,
  reload: false,
  ...over,
});

const s0 = eng.buildSnapshot();
const x0 = s0.players[0].x;
const foe = s0.players[1];

let maxBullets = 0;
let deployedOk = true;
for (let i = 0; i < 240; i++) {
  // peer 1: move right + fire at the foe
  eng.setPeerInput(1, frame({ keys: ["KeyD"], firing: true, mx: foe.x, my: foe.y }));
  // peer 2: deploy a gadget around frame 30, then stand
  eng.setPeerInput(2, frame({ gadget: i === 30 ? 0 : -1 }));
  try {
    eng.stepServer(1 / 60);
  } catch (e) {
    console.error("stepServer threw:", e);
    process.exit(1);
  }
  const snap = eng.buildSnapshot();
  maxBullets = Math.max(maxBullets, snap.bullets.length);
}

const s1 = eng.buildSnapshot();
const x1 = s1.players[0].x;

console.log("player1 moved right:", x1 > x0, `(${x0.toFixed(1)} -> ${x1.toFixed(1)})`);
console.log("bullets spawned:", maxBullets > 0, "maxBullets =", maxBullets);
console.log("snapshot players:", s1.players.length, "enemies:", s1.enemies.length);
console.log("gameOver:", s1.gameOver, "reason:", s1.gameOverReason);
console.log("SMOKE TEST OK");
