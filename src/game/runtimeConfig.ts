// Mutable runtime configuration for the in-game developer console.
// These values are read live by the engine every frame (or applied via
// GameEngine.applyRuntime() for world / base changes), so editing them in the
// console takes effect immediately without restarting.

export interface RuntimeConfig {
  // world
  worldW: number;
  worldH: number;
  // bases
  baseHp: number;
  enemyBaseHp: number;
  // breathing heal
  breathingDelay: number;
  breathingRate: number;
  // spawning
  spawnIntervalMin: number;
  spawnIntervalMax: number;
  spawnIntervalPerWave: number;
  maxConcurrentBase: number;
  maxConcurrentPerWave: number;
  maxConcurrentCap: number;
  waveDuration: number;
  // enemies
  enemySpeedMult: number;
  enemyEliteChance: number;
  enemyHpScalePerWave: number;
  enemyDmgScalePerWave: number;
  /** enemy base per-hit damage; scaled ×2.5 (8 → 20) to match unified 250 player HP */
  enemyBaseDamage: number;
  enemyEliteHpMult: number;
  enemyEliteDmgMult: number;
  // player
  playerDamageMult: number;
  playerSpeedMult: number;
  // health overrides (0 = use character/outfit defaults)
  /** player base max HP override; 0 means use character.maxHp + outfit.hpBonus.
   *  Unified to 250 for ALL players (any character/outfit) — see content/juggernaut. */
  playerBaseHp: number;
  /** enemy base max HP override; 0 = use per-character scaling.
   *  Set 250 so enemies match the unified 250 player HP (×2.5 balance scaling). */
  enemyHp: number;
}

export const RUNTIME_DEFAULTS: RuntimeConfig = {
  worldW: 1600,
  worldH: 1000,
  baseHp: 2000,
  enemyBaseHp: 2000,
  breathingDelay: 5,
  breathingRate: 8,
  spawnIntervalMin: 0.6,
  spawnIntervalMax: 2.2,
  spawnIntervalPerWave: 0.05,
  maxConcurrentBase: 8,
  maxConcurrentPerWave: 2,
  maxConcurrentCap: 24,
  waveDuration: 20,
  enemySpeedMult: 0.85,
  enemyEliteChance: 0.15,
  enemyHpScalePerWave: 0.1,
  enemyDmgScalePerWave: 0.04,
  enemyBaseDamage: 20, // ×2.5 (8 → 20) to match unified 250 player HP
  enemyEliteHpMult: 2,
  enemyEliteDmgMult: 1.8,
  playerDamageMult: 0.8, // all player damage to enemies ×0.8 (−20%) on top of the ×2.5 balance scaling
  playerSpeedMult: 1,
  playerBaseHp: 250, // unified max HP for every player (character/outfit HP bonuses disabled)
  enemyHp: 250, // unified enemy base HP ×2.5 to match 250 player HP (per-wave hpScale & elite mult still apply)
};

export const RUNTIME: RuntimeConfig = { ...RUNTIME_DEFAULTS };

export function resetRuntime() {
  Object.assign(RUNTIME, RUNTIME_DEFAULTS);
}
