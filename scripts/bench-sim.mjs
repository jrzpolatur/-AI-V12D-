// Isolates the authoritative simulation cost (no network) to find the hot path.
import { GameEngine } from "../server/engine.bundle.mjs";

const loadout = (over = {}) => ({
  characterId: "raider", outfitId: "tactical", skillId: "dash", gunId: "mac11",
  gunIds: ["mac11", "akm"], gadgetIds: ["turret_mg", "mine_explosive", "glue_grenade"],
  gameMode: "defense", ...over,
});

const eng = new GameEngine(null, loadout(), () => {}, { mode: "server" });
eng.startHeadless();
eng.setupServerMatch(loadout({ characterId: "juggernaut", gunId: "akm", gunIds: ["akm", "mac11"] }), 1, 2);
eng.serverStartMatch();

const fA = { keys: ["KeyD"], mx: 400, my: 300, vmx: 0, vmy: 0, firing: true, gadget: -1, weaponSwitch: false, skill: false, reload: false };
const fB = { keys: ["KeyA"], mx: 400, my: 300, vmx: 0, vmy: 0, firing: false, gadget: -1, weaponSwitch: false, skill: false, reload: false };
eng.setPeerInput(1, fA);
eng.setPeerInput(2, fB);

// warm up
for (let i = 0; i < 30; i++) eng.stepServer(1 / 30);

const N = 300;
const t0 = performance.now();
for (let i = 0; i < N; i++) {
  eng.stepServer(1 / 30);
  eng.buildSnapshot();
}
const t1 = performance.now();
const per = (t1 - t0) / N;
console.log(`stepServer+buildSnapshot avg = ${per.toFixed(2)} ms  -> ${(1000 / per).toFixed(1)} Hz capable`);
const s = eng.buildSnapshot();
console.log("enemies:", s.enemies.length, "bullets:", s.bullets.length, "time:", s.time.toFixed(2));
process.exit(0);
