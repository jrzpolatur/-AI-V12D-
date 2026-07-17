// src/game/content.ts
var CHARACTERS = [
  {
    id: "raider",
    name: "\u7A81\u88AD\u8005",
    title: "Raider",
    bodyColor: "#22d3ee",
    accent: "#0891b2",
    skin: "#fcd9b6",
    speed: 235,
    maxHp: 100,
    damageMult: 1,
    fireRateMult: 1,
    size: 16,
    perk: "\u5168\u624D\u578B\uFF0C\u5C5E\u6027\u5747\u8861",
    desc: "\u653B\u9632\u5747\u8861\u7684\u4E07\u91D1\u6CB9\u89D2\u8272\uFF0C\u9002\u5408\u6240\u6709\u6253\u6CD5\u3002"
  },
  {
    id: "juggernaut",
    name: "\u91CD\u88C5\u5175",
    title: "Juggernaut",
    bodyColor: "#34d399",
    accent: "#059669",
    skin: "#e8b890",
    speed: 178,
    maxHp: 165,
    damageMult: 0.92,
    fireRateMult: 0.95,
    size: 19,
    perk: "\u9AD8\u8840\u91CF\uFF0C\u79FB\u52A8\u7F13\u6162",
    desc: "\u76AE\u7CD9\u8089\u539A\u7684\u79FB\u52A8\u5821\u5792\uFF0C\u5BB9\u9519\u7387\u6781\u9AD8\u3002"
  },
  {
    id: "phantom",
    name: "\u7075\u72D0",
    title: "Phantom",
    bodyColor: "#f472b6",
    accent: "#db2777",
    skin: "#ffd9c2",
    speed: 296,
    maxHp: 72,
    damageMult: 1.12,
    fireRateMult: 1.18,
    size: 14,
    perk: "\u6781\u901F\u9AD8\u4F24\uFF0C\u8EAB\u677F\u8106\u5F31",
    desc: "\u6765\u53BB\u5982\u98CE\u7684\u523A\u6740\u8005\uFF0C\u9760\u8D70\u4F4D\u4E0E\u5C04\u901F\u78BE\u538B\u5BF9\u624B\u3002"
  },
  {
    id: "sentinel",
    name: "\u54E8\u5175",
    title: "Sentinel",
    bodyColor: "#fbbf24",
    accent: "#d97706",
    skin: "#f3c79b",
    speed: 214,
    maxHp: 96,
    damageMult: 1.28,
    fireRateMult: 0.86,
    size: 16,
    perk: "\u4F24\u5BB3\u5F3A\u5316\uFF0C\u5C04\u901F\u7565\u4F4E",
    desc: "\u7CBE\u51C6\u7684\u706B\u529B\u4E13\u5BB6\uFF0C\u5355\u53D1\u5A01\u529B\u60CA\u4EBA\u3002"
  }
];
var OUTFITS = [
  {
    id: "tactical",
    name: "\u7ECF\u5178\u6218\u672F",
    suit: "#64748b",
    suitDark: "#334155",
    accent: "#e2e8f0",
    hat: "helmet",
    perk: "\u65E0\u989D\u5916\u52A0\u6210",
    speedBonus: 0,
    hpBonus: 0
  },
  {
    id: "night",
    name: "\u6697\u591C\u6F5C\u884C",
    suit: "#3b3b6b",
    suitDark: "#22224a",
    accent: "#818cf8",
    hat: "hood",
    perk: "\u79FB\u901F +6%",
    speedBonus: 0.06,
    hpBonus: 0
  },
  {
    id: "desert",
    name: "\u6C99\u6F20\u98CE\u66B4",
    suit: "#d6b27a",
    suitDark: "#a07c44",
    accent: "#fff3d6",
    hat: "cap",
    perk: "\u65E0\u989D\u5916\u52A0\u6210",
    speedBonus: 0,
    hpBonus: 0
  },
  {
    id: "neon",
    name: "\u9713\u8679\u730E\u624B",
    suit: "#1e293b",
    suitDark: "#0f172a",
    accent: "#22d3ee",
    hat: "visor",
    perk: "\u5C04\u901F +6%",
    speedBonus: 0,
    hpBonus: 0,
    fireRateBonus: 0.06
  },
  {
    id: "crimson",
    name: "\u8D64\u7130\u6597\u58EB",
    suit: "#b91c1c",
    suitDark: "#7f1d1d",
    accent: "#fca5a5",
    hat: "cap",
    perk: "\u79FB\u901F +4%",
    speedBonus: 0.04,
    hpBonus: 6
  },
  {
    id: "emerald",
    name: "\u7FE1\u7FE0\u536B\u58EB",
    suit: "#15803d",
    suitDark: "#14532d",
    accent: "#86efac",
    hat: "helmet",
    perk: "\u65E0\u989D\u5916\u52A0\u6210",
    speedBonus: 0,
    hpBonus: 0
  },
  // ===================== SKINS (this update) =====================
  {
    id: "alien",
    name: "\u5916\u661F\u4EBA \u{1F47D}",
    suit: "#22d3ee",
    suitDark: "#0e7490",
    accent: "#a5f3fc",
    hat: "alien",
    perk: "\u79FB\u901F +6%",
    speedBonus: 0.06,
    hpBonus: 0,
    skin: "#7ef0b0"
  },
  {
    id: "monkey",
    name: "\u7334\u5B50 \u{1F412}",
    suit: "#a16207",
    suitDark: "#854d0e",
    accent: "#fbbf24",
    hat: "monkey",
    perk: "\u8840\u91CF +18",
    speedBonus: 0,
    hpBonus: 18,
    skin: "#caa072"
  },
  {
    id: "tycoon",
    name: "\u5927\u4EA8 \u{1F3A9}",
    suit: "#4c1d95",
    suitDark: "#2e1065",
    accent: "#fbbf24",
    hat: "tycoon",
    perk: "\u5C04\u901F +5%",
    speedBonus: 0,
    hpBonus: 0,
    fireRateBonus: 0.05
  }
];
var GUNS = [
  {
    id: "silenced_pistol",
    name: "\u6D88\u97F3\u624B\u67AA",
    desc: "\u534A\u81EA\u52A8\u6D88\u97F3\u624B\u67AA\uFF0C\u9690\u853D\u7CBE\u51C6",
    weaponClass: "ranged",
    shape: "pistol",
    iconShape: "pistol",
    damage: 44,
    fireRate: 7,
    // 420 RPM
    bulletSpeed: 760,
    bulletSize: 5,
    spread: 0.03,
    pellets: 1,
    pierce: 0,
    life: 1.1,
    knockback: 110,
    color: "#e2e8f0",
    glow: "#94a3b8",
    kind: "bullet",
    semiAuto: true,
    barrel: 16,
    magazine: 22,
    reloadTime: 1.4,
    rangeTier: "\u4E2D"
  },
  {
    id: "smg",
    name: "\u51B2\u950B\u67AA",
    desc: "\u9AD8\u5C04\u901F\u6CFC\u6C34\uFF0C\u5355\u53D1\u8F83\u5F31",
    weaponClass: "ranged",
    shape: "smg",
    iconShape: "smg",
    damage: 18,
    fireRate: 12,
    bulletSpeed: 840,
    bulletSize: 4,
    spread: 0.13,
    pellets: 1,
    pierce: 0,
    life: 0.85,
    knockback: 60,
    color: "#a5f3fc",
    glow: "#22d3ee",
    kind: "bullet",
    barrel: 18,
    magazine: 30,
    reloadTime: 1.6,
    rangeTier: "\u8FD1"
  },
  {
    id: "sniper",
    name: "\u72D9\u51FB\u67AA",
    desc: "\u8D85\u9AD8\u4F24\u5BB3\uFF0C\u53EF\u7A7F\u900F\u591A\u4EBA",
    weaponClass: "ranged",
    shape: "sniper",
    iconShape: "sniper",
    damage: 270,
    fireRate: 0.9,
    bulletSpeed: 1750,
    bulletSize: 6,
    spread: 0,
    pellets: 1,
    pierce: 5,
    life: 2,
    knockback: 420,
    color: "#fca5a5",
    glow: "#f87171",
    kind: "tracer",
    barrel: 30,
    magazine: 5,
    reloadTime: 2.8,
    rangeTier: "\u8FDC"
  },
  {
    id: "rocket",
    name: "\u706B\u7BAD\u7B52",
    desc: "\u8303\u56F4\u7206\u70B8\uFF0C\u5A01\u529B\u5DE8\u5927",
    weaponClass: "ranged",
    shape: "rocket",
    iconShape: "rocket",
    damage: 150,
    fireRate: 0.72,
    bulletSpeed: 480,
    bulletSize: 9,
    spread: 0.02,
    pellets: 1,
    pierce: 0,
    life: 1.7,
    knockback: 320,
    color: "#fda4af",
    glow: "#fb7185",
    explosive: true,
    explosionRadius: 96,
    kind: "rocket",
    barrel: 26,
    magazine: 1,
    reloadTime: 2,
    rangeTier: "\u8FDC"
  },
  {
    id: "akm",
    name: "AKM",
    desc: "\u5747\u8861\u7684\u7A81\u51FB\u6B65\u67AA\uFF0C\u4E2D\u8FDC\u7A0B\u5168\u80FD",
    weaponClass: "ranged",
    shape: "akm",
    iconShape: "akm",
    damage: 44,
    fireRate: 10,
    bulletSpeed: 940,
    bulletSize: 5,
    spread: 0.05,
    pellets: 1,
    pierce: 0,
    life: 1.2,
    knockback: 150,
    color: "#fde68a",
    glow: "#f59e0b",
    kind: "tracer",
    barrel: 26,
    magazine: 30,
    reloadTime: 2.2,
    rangeTier: "\u4E2D"
  },
  {
    id: "fcar",
    name: "FCAR",
    desc: "\u91CD\u578B\u7A81\u51FB\u6B65\u67AA\uFF1A\u9AD8\u4F24\u5BB3\u3001\u5C04\u901F\u6162\u3001\u5F39\u5323\u8F83\u5C0F",
    weaponClass: "ranged",
    shape: "fcar",
    iconShape: "fcar",
    damage: 58,
    fireRate: 9,
    bulletSpeed: 1e3,
    bulletSize: 6,
    spread: 0.045,
    pellets: 1,
    pierce: 1,
    life: 1.3,
    knockback: 240,
    color: "#99f6e4",
    glow: "#14b8a6",
    kind: "tracer",
    barrel: 28,
    magazine: 20,
    reloadTime: 2.8,
    rangeTier: "\u4E2D"
  },
  {
    id: "pulse",
    name: "\u8109\u51B2",
    desc: "\u8FDE\u7EED\u6FC0\u5149\u51B2\u950B\u67AA\uFF0C\u8FC7\u70ED\u540E\u9700\u51B7\u5374",
    weaponClass: "beam",
    shape: "pulse",
    iconShape: "pulse",
    damage: 460,
    fireRate: 1,
    bulletSpeed: 0,
    bulletSize: 0,
    spread: 0,
    pellets: 0,
    pierce: 0,
    life: 0,
    knockback: 50,
    color: "#a5f3fc",
    glow: "#22d3ee",
    kind: "tracer",
    barrel: 22,
    beamRange: 780,
    heatPerShot: 0.62,
    coolRate: 0.5,
    rangeTier: "\u4E2D"
  },
  {
    id: "lightsaber",
    name: "\u5149\u5251",
    desc: "\u8FD1\u8DDD\u79BB\u6A2A\u626B\uFF0C\u70AB\u9177\u5149\u6548\uFF0C\u8FDE\u7EED\u6325\u780D",
    weaponClass: "melee",
    shape: "lightsaber",
    iconShape: "lightsaber",
    damage: 52,
    fireRate: 7,
    bulletSpeed: 0,
    bulletSize: 0,
    spread: 0,
    pellets: 0,
    pierce: 0,
    life: 0,
    knockback: 240,
    color: "#bae6fd",
    glow: "#38bdf8",
    kind: "bullet",
    barrel: 0,
    meleeRange: 82,
    meleeArc: 2.5,
    rangeTier: "\u8FD1"
  },
  {
    id: "hammer",
    name: "\u5927\u9524",
    desc: "\u5DE6\u952E\u6325\u780D \xB7 \u53F3\u952E\u7838\u5730\uFF08\u62C6\u5899\uFF09",
    weaponClass: "melee",
    shape: "hammer",
    iconShape: "hammer",
    damage: 120,
    fireRate: 1.5,
    bulletSpeed: 0,
    bulletSize: 0,
    spread: 0,
    pellets: 0,
    pierce: 0,
    life: 0,
    knockback: 320,
    color: "#cbd5e1",
    glow: "#f59e0b",
    kind: "bullet",
    barrel: 0,
    meleeRange: 74,
    meleeArc: 1.8,
    slamDamage: 280,
    explosionRadius: 100,
    rangeTier: "\u8FD1"
  },
  // ==================== NEW WEAPONS ====================
  {
    id: "flamethrower",
    name: "\u706B\u7130\u55B7\u5C04\u5668",
    desc: "\u9525\u5F62\u6301\u7EED\u707C\u70E7\uFF0C\u8D34\u8138\u6BC1\u706D\u6027\u8F93\u51FA",
    weaponClass: "flamethrower",
    shape: "flamethrower",
    iconShape: "flamethrower",
    damage: 190,
    fireRate: 1,
    bulletSpeed: 0,
    bulletSize: 0,
    spread: 0,
    pellets: 0,
    pierce: 0,
    life: 0,
    knockback: 30,
    color: "#fed7aa",
    glow: "#f97316",
    kind: "flame",
    barrel: 24,
    flameCone: 0.42,
    flameRange: 150,
    heatPerShot: 0.35,
    coolRate: 0.55,
    rangeTier: "\u8FD1"
  },
  {
    id: "sa1216",
    name: "SA1216",
    desc: "\u4F5C\u6218\u8DDD\u79BB\u8F83\u8FD1\u7684\u8FDE\u55B7\uFF0C\u7206\u53D1\u4F24\u5BB3\u9AD8",
    weaponClass: "ranged",
    shape: "sa1216",
    iconShape: "sa1216",
    damage: 22,
    fireRate: 5.5,
    bulletSpeed: 820,
    bulletSize: 4.5,
    spread: 0.26,
    pellets: 8,
    pierce: 0,
    life: 0.45,
    knockback: 200,
    color: "#fde68a",
    glow: "#f59e0b",
    kind: "pellet",
    barrel: 22,
    magazine: 16,
    reloadTime: 2.6,
    rangeTier: "\u8FD1"
  },
  {
    id: "mgl32",
    name: "MGL32",
    desc: "\u69B4\u5F39\u53D1\u5C04\u5668\uFF0C\u53CD\u5F39\u4E00\u6B21\u540E\u7206\u70B8",
    weaponClass: "ranged",
    shape: "mgl32",
    iconShape: "mgl32",
    damage: 120,
    fireRate: 1.8,
    bulletSpeed: 560,
    bulletSize: 8,
    spread: 0.04,
    pellets: 1,
    pierce: 0,
    life: 2.2,
    knockback: 260,
    color: "#fda4af",
    glow: "#fb7185",
    explosive: true,
    explosionRadius: 78,
    kind: "grenade",
    bounces: 1,
    barrel: 22,
    magazine: 6,
    reloadTime: 2.4,
    rangeTier: "\u4E2D"
  },
  {
    id: "spear",
    name: "\u957F\u77DB",
    desc: "\u9177\u70AB\u8FDE\u62DB\u7CFB\u7EDF\uFF0C\u4F4D\u79FB\u540C\u65F6\u9020\u6210\u4F24\u5BB3",
    weaponClass: "melee",
    shape: "spear",
    iconShape: "spear",
    damage: 68,
    fireRate: 3.2,
    bulletSpeed: 0,
    bulletSize: 0,
    spread: 0,
    pellets: 0,
    pierce: 0,
    life: 0,
    knockback: 200,
    color: "#ddd6fe",
    glow: "#a78bfa",
    kind: "bullet",
    barrel: 0,
    meleeRange: 96,
    meleeArc: 1.1,
    comboLength: 3,
    rangeTier: "\u8FD1"
  },
  {
    id: "drone",
    name: "\u6D6E\u6E38\u70AE",
    desc: "\u53D1\u5C04\u79BB\u5B50\u56E2\uFF0C\u78B0\u654C\u4F24\u5BB3\u3001\u4E0D\u4F24\u5EFA\u7B51\u3001\u53CD\u5F393\u6B21",
    weaponClass: "ranged",
    shape: "drone",
    iconShape: "drone",
    damage: 56,
    fireRate: 1.6,
    bulletSpeed: 380,
    bulletSize: 9,
    spread: 0.1,
    pellets: 1,
    pierce: 99,
    life: 4.5,
    knockback: 40,
    color: "#c7d2fe",
    glow: "#818cf8",
    kind: "ion",
    bounces: 3,
    ignoreWalls: true,
    barrel: 14,
    magazine: 4,
    reloadTime: 1.8,
    rangeTier: "\u4E2D"
  },
  {
    id: "recurve_bow",
    name: "\u53CD\u66F2\u5F13",
    desc: "\u84C4\u529B\u8D8A\u4E45\u7BAD\u77E2\u8D8A\u5FEB\u8D8A\u72E0\uFF0C\u6EE1\u84C4\u53EF\u7A7F\u900F",
    weaponClass: "bow",
    shape: "recurve_bow",
    iconShape: "recurve_bow",
    damage: 44,
    fireRate: 1.5,
    bulletSpeed: 600,
    bulletSize: 5,
    spread: 0.01,
    pellets: 1,
    pierce: 0,
    life: 1.4,
    knockback: 80,
    color: "#fde68a",
    glow: "#a3e635",
    kind: "tracer",
    barrel: 18,
    maxChargeTime: 1.2,
    minChargeMult: 0.6,
    maxChargeMult: 2.2,
    maxChargeSpeedMult: 2.3,
    drawSlowMult: 0.7,
    rangeTier: "\u8FDC"
  },
  {
    id: "riot_shield",
    name: "\u9632\u7206\u76FE",
    desc: "\u5DE6\u952E\u6325\u51FB \xB7 \u53F3\u952E\u4E3E\u76FE\u62B5\u6321\u5B50\u5F39",
    weaponClass: "shield",
    shape: "riot_shield",
    iconShape: "riot_shield",
    damage: 56,
    fireRate: 1.8,
    bulletSpeed: 0,
    bulletSize: 0,
    spread: 0,
    pellets: 0,
    pierce: 0,
    life: 0,
    knockback: 200,
    color: "#bfdbfe",
    glow: "#3b82f6",
    kind: "bullet",
    barrel: 0,
    meleeRange: 58,
    meleeArc: 1.6,
    shieldHp: 200,
    shieldMaxHp: 200,
    shieldArc: 0.7,
    shieldDuration: 3,
    shieldRechargeTime: 8,
    rangeTier: "\u8FD1"
  },
  {
    id: "shak50",
    name: "SHAK-50",
    desc: "\u53CC\u7BA1\u5927\u53E3\u5F84\u6B65\u67AA\xB7\u4E00\u6B21\u5E76\u6392\u4E24\u53D1\xB7\u968F\u8DDD\u79BB\u9010\u6E10\u6269\u6563\xB7\u8FD1\u6218\u7206\u53D1\u5F3A",
    weaponClass: "ranged",
    shape: "shak50",
    iconShape: "shak50",
    damage: 52,
    fireRate: 3.4,
    bulletSpeed: 900,
    bulletSize: 6,
    spread: 0,
    pellets: 2,
    parallel: 2,
    parallelGap: 7,
    drift: 70,
    pierce: 1,
    life: 0.7,
    knockback: 260,
    color: "#fde68a",
    glow: "#fbbf24",
    kind: "tracer",
    barrel: 22,
    magazine: 12,
    reloadTime: 2.2,
    rangeTier: "\u8FD1"
  },
  // ==================== NEW WEAPONS (this update) ====================
  {
    id: "r357",
    name: "R.357 \u5DE6\u8F6E",
    desc: "6 \u53D1\u5DE6\u8F6E\u624B\u67AA\xB7\u5355\u53D1\u9AD8\u4F24\u5BB3\xB7\u534A\u81EA\u52A8\u7CBE\u51C6",
    weaponClass: "ranged",
    shape: "pistol",
    iconShape: "pistol",
    damage: 78,
    fireRate: 3.2,
    bulletSpeed: 1e3,
    bulletSize: 5.5,
    spread: 0.012,
    pellets: 1,
    pierce: 0,
    life: 1.3,
    knockback: 180,
    color: "#e2e8f0",
    glow: "#cbd5e1",
    kind: "tracer",
    semiAuto: true,
    barrel: 14,
    magazine: 6,
    reloadTime: 1.9,
    rangeTier: "\u4E2D"
  },
  {
    id: "gold_barrett",
    name: "\u9EC4\u91D1\u5DF4\u96F7\u7279",
    desc: "\u9AD8\u4F24\u5BB3\u53CD\u5668\u6750\u72D9\u51FB\xB7\u7A7F\u900F\u6781\u5F3A\xB7\u91D1\u8272\u4F20\u8BF4",
    weaponClass: "ranged",
    shape: "sniper",
    iconShape: "sniper",
    damage: 320,
    fireRate: 0.85,
    bulletSpeed: 1900,
    bulletSize: 7,
    spread: 0,
    pellets: 1,
    pierce: 8,
    life: 2.2,
    knockback: 480,
    color: "#fde047",
    glow: "#facc15",
    kind: "tracer",
    barrel: 32,
    magazine: 6,
    reloadTime: 3,
    rangeTier: "\u8FDC"
  },
  // ==================== BIOHAZARD / NEW WEAPONS ====================
  {
    id: "gatling",
    name: "\u52A0\u7279\u6797",
    desc: "\u6781\u9AD8\u5C04\u901F\uFF0C300\u53D1\u5F39\u5BB9\u91CF\uFF0C\u4F46\u5F00\u706B\u524D\u9700\u8981\u9884\u70ED\uFF08\u8F6C\u901F\u63D0\u5347\u540E\u5C04\u901F\u4E0E\u4F24\u5BB3\u624D\u62C9\u6EE1\uFF09",
    weaponClass: "ranged",
    shape: "gatling",
    iconShape: "gatling",
    damage: 24,
    fireRate: 19,
    // very high once spun up
    bulletSpeed: 1050,
    bulletSize: 4.5,
    spread: 0.11,
    pellets: 1,
    pierce: 0,
    life: 1,
    knockback: 55,
    color: "#fde68a",
    glow: "#fbbf24",
    kind: "tracer",
    barrel: 26,
    magazine: 300,
    reloadTime: 3.4,
    spinup: 0.55,
    // seconds to reach full spin
    spinDown: 0.9,
    // seconds to spin back down
    spinMinMult: 0.18,
    // damage/firerate floor at zero spin
    rangeTier: "\u4E2D"
  },
  {
    id: "poison_mist",
    name: "\u6BD2\u96FE\u55B7\u5C04\u673A",
    desc: "\u5411\u524D\u55B7\u51FA\u5C0F\u8303\u56F4\u6BD2\u96FE\uFF0C\u654C\u4EBA\u505C\u7559\u8D8A\u4E45\u4E2D\u6BD2\u8D8A\u6DF1\u3001\u53D7\u5230\u4F24\u5BB3\u8D8A\u9AD8\uFF08\u4E0E\u6BD2\u6C14\u5730\u96F7\u540C\u6B3E\u5267\u6BD2\uFF09",
    weaponClass: "poison_mist",
    shape: "poison_mist",
    iconShape: "poison_mist",
    damage: 80,
    // base poison ramp rate reference
    fireRate: 1,
    bulletSpeed: 0,
    bulletSize: 0,
    spread: 0,
    pellets: 0,
    pierce: 0,
    life: 0,
    knockback: 20,
    color: "#a3e635",
    glow: "#84cc16",
    kind: "flame",
    barrel: 22,
    flameCone: 0.34,
    flameRange: 130,
    heatPerShot: 0.4,
    coolRate: 0.6,
    rangeTier: "\u8FD1"
  },
  // ===================== BIOHAZARD / NEW WEAPONS (this update) =====================
  {
    id: "lightning_whip",
    name: "\u95EA\u7535\u97AD",
    desc: "\u5FEB\u901F\u5DE6\u53F3\u6325\u52A8\u7529\u51FB\uFF0C\u547D\u4E2D\u654C\u4EBA\u9020\u6210\u51CF\u901F\uFF08\u5BF9\u751F\u5316\u3001\u4EBA\u673A\u4E0E\u5BF9\u624B\u5747\u751F\u6548\uFF09",
    weaponClass: "melee",
    shape: "lightning_whip",
    iconShape: "lightning_whip",
    damage: 34,
    fireRate: 9,
    bulletSpeed: 0,
    bulletSize: 0,
    spread: 0,
    pellets: 0,
    pierce: 0,
    life: 0,
    knockback: 90,
    color: "#bae6fd",
    glow: "#38bdf8",
    kind: "bullet",
    barrel: 0,
    meleeRange: 96,
    meleeArc: 3.4,
    whip: true,
    slowOnHit: 2,
    rangeTier: "\u8FD1"
  }
];
var SKILLS = [
  {
    id: "dash",
    name: "\u51B2\u523A\u95EA\u907F",
    desc: "\u77AC\u95F4\u9AD8\u901F\u7A81\u8FDB\u5E76\u83B7\u5F97\u77ED\u6682\u65E0\u654C\uFF08\u53EF\u84C4\u529B3\u6BB5\uFF0C\u6BCF\u6BB55\u79D2\uFF09",
    cooldown: 5,
    duration: 0.28,
    color: "#22d3ee",
    icon: "\u26A1"
  },
  {
    id: "shield",
    name: "\u80FD\u91CF\u62A4\u76FE",
    desc: "\u5C55\u5F00\u62A4\u76FE\uFF0C\u671F\u95F4\u514D\u75AB\u4F24\u5BB3",
    cooldown: 7,
    duration: 2.4,
    color: "#60a5fa",
    icon: "\u{1F6E1}\uFE0F"
  },
  {
    id: "timewarp",
    name: "\u65F6\u95F4\u626D\u66F2",
    desc: "\u51CF\u7F13\u6240\u6709\u654C\u4EBA\u7684\u901F\u5EA6",
    cooldown: 8.5,
    duration: 3.5,
    color: "#c084fc",
    icon: "\u23F3"
  },
  {
    id: "grenade",
    name: "\u6295\u63B7\u624B\u96F7",
    desc: "\u5411\u51C6\u661F\u6295\u63B7\u7206\u70B8\u624B\u96F7",
    cooldown: 4,
    duration: 0.5,
    color: "#f97316",
    icon: "\u{1F4A3}"
  },
  {
    id: "overdrive",
    name: "\u706B\u529B\u8FC7\u8F7D",
    desc: "\u77ED\u65F6\u95F4\u5185\u5927\u5E45\u63D0\u5347\u5C04\u901F",
    cooldown: 9,
    duration: 4,
    color: "#fbbf24",
    icon: "\u{1F525}"
  }
];
var GADGETS = [
  {
    id: "turret_mg",
    kind: "turret_mg",
    name: "\u54E8\u6212\u673A\u67AA",
    desc: "\u90E8\u7F72\u540E\u5728\u4E00\u5B9A\u8303\u56F4\u5185\u81EA\u52A8\u5C04\u51FB\u654C\u4EBA\uFF08\u6C38\u4E45\u5B58\u5728\uFF09",
    cooldown: 16,
    iconShape: "turret_mg",
    color: "#38bdf8",
    maxStack: 3,
    hp: 160
  },
  {
    id: "turret_cannon",
    kind: "turret_cannon",
    name: "\u54E8\u6212\u70AE\u5854",
    desc: "\u8F83\u5C0F\u8303\u56F4\u5185\u8FDE\u53D1\u4F4E\u4F24\u5BB3 AOE \u70B8\u5F39\uFF08\u6C38\u4E45\u5B58\u5728\uFF09",
    cooldown: 20,
    iconShape: "turret_cannon",
    color: "#a78bfa",
    maxStack: 2,
    hp: 200
  },
  {
    id: "mine_explosive",
    kind: "mine_explosive",
    name: "\u7206\u70B8\u5730\u96F7",
    desc: "\u654C\u4EBA\u7ECF\u8FC7\u65F6\u5F15\u7206\uFF0C\u8303\u56F4\u7206\u70B8",
    cooldown: 30,
    iconShape: "mine_explosive",
    color: "#f87171",
    maxStack: 4
  },
  {
    id: "mine_poison",
    kind: "mine_poison",
    name: "\u6BD2\u6C14\u5730\u96F7",
    desc: "\u89E6\u53D1\u540E\u91CA\u653E\u6301\u7EED\u6BD2\u4E91\uFF0C\u51CF\u901F\u5E76\u4F24\u5BB3\u654C\u4EBA",
    cooldown: 20,
    iconShape: "mine_poison",
    color: "#84cc16",
    maxStack: 4
  },
  {
    id: "mine_fire",
    kind: "mine_fire",
    name: "\u706B\u7130\u5730\u96F7",
    desc: "\u89E6\u53D1\u540E\u751F\u6210\u6301\u7EED\u71C3\u70E7\u7684\u706B\u573A",
    cooldown: 20,
    iconShape: "mine_fire",
    color: "#fb923c",
    maxStack: 4
  },
  {
    id: "glue_grenade",
    kind: "glue_grenade",
    name: "\u7C98\u80F6\u624B\u69B4\u5F39",
    desc: "\u6295\u63B7\u540E\u751F\u6210\u4E00\u5835\u7C98\u80F6\u5899\uFF0C\u963B\u6321\u5E76\u51CF\u901F\u654C\u4EBA",
    cooldown: 20,
    iconShape: "glue_grenade",
    color: "#22d3ee",
    maxStack: 3
  },
  {
    id: "fire_grenade",
    kind: "fire_grenade",
    name: "\u706B\u7130\u624B\u96F7",
    desc: "\u6295\u63B7\u540E\u70B8\u5F00\u4E00\u7247\u6301\u7EED\u71C3\u70E7\u7684\u706B\u573A\uFF0C\u707C\u70E7\u8303\u56F4\u5185\u7684\u654C\u4EBA",
    cooldown: 22,
    iconShape: "fire_grenade",
    color: "#fb923c",
    maxStack: 3
  },
  {
    id: "healing_station",
    kind: "healing_station",
    name: "\u6CBB\u7597\u7AD9",
    desc: "\u90E8\u7F72\u540E\u9760\u8FD1\u81EA\u52A8\u7F13\u6162\u56DE\u8840\uFF08F7\uFF09",
    cooldown: 25,
    iconShape: "healing_station",
    color: "#4ade80",
    maxStack: 2,
    hp: 80
  }
];
var MONSTERS = [
  {
    id: "walker",
    name: "\u884C\u5C38",
    behavior: "walker",
    desc: "\u7F13\u6162\u7684\u8FD1\u6218\u4E27\u5C38\uFF0C\u6570\u91CF\u4F17\u591A",
    hp: 75,
    speed: 64,
    damage: 12,
    size: 15,
    color: "#7c9c5a",
    glow: "#a3e635",
    score: 12,
    weight: 3
  },
  {
    id: "runner",
    name: "\u5954\u5C38",
    behavior: "runner",
    desc: "\u901F\u5EA6\u6781\u5FEB\uFF0C\u4F1A\u5468\u671F\u4FEF\u51B2\u6251\u54AC",
    hp: 55,
    speed: 150,
    damage: 10,
    size: 13,
    color: "#a3e635",
    glow: "#bef264",
    score: 16,
    weight: 2
  },
  {
    id: "brute",
    name: "\u5DE8\u5C38",
    behavior: "brute",
    desc: "\u76AE\u7CD9\u8089\u539A\u3001\u79FB\u52A8\u7F13\u6162\u7684\u8089\u76FE\uFF0C\u649E\u51FB\u6C89\u91CD",
    hp: 460,
    speed: 40,
    damage: 30,
    size: 30,
    color: "#4d7c4d",
    glow: "#65a30d",
    score: 60,
    weight: 1
  },
  {
    id: "spitter",
    name: "\u5410\u9178\u8005",
    behavior: "spitter",
    desc: "\u8FDC\u7A0B\u55B7\u5410\u5267\u6BD2\u9178\u6DB2\uFF0C\u4FDD\u6301\u8DDD\u79BB\u8F93\u51FA",
    hp: 110,
    speed: 56,
    damage: 10,
    size: 17,
    color: "#a78bfa",
    glow: "#c084fc",
    score: 35,
    ranged: true,
    rangedRange: 360,
    rangedDamage: 14,
    weight: 1.4
  },
  {
    id: "abomination",
    name: "\u6BCD\u4F53",
    behavior: "abomination",
    desc: "\u5DE8\u578B BOSS\uFF0C\u91CD\u7838\u8303\u56F4\u4F24\u5BB3\uFF0C\u6B7B\u4EA1\u65F6\u5267\u70C8\u7206\u88C2",
    hp: 2600,
    speed: 30,
    damage: 45,
    size: 46,
    color: "#7e22ce",
    glow: "#a855f7",
    score: 400,
    weight: 0.4,
    minWave: 6
  },
  // ===================== NEW (added this update) =====================
  {
    id: "crawler",
    name: "\u722C\u866B",
    behavior: "crawler",
    desc: "\u4F53\u578B\u6781\u5C0F\u3001\u6210\u7FA4\u9AD8\u901F\u722C\u884C\uFF0C\u5355\u4E2A\u4F53\u8106\u5F31\u4F46\u96BE\u7F20",
    hp: 30,
    speed: 205,
    damage: 7,
    size: 10,
    color: "#d9f99d",
    glow: "#bef264",
    score: 8,
    weight: 1.6
  },
  {
    id: "bloater",
    name: "\u6BD2\u7206\u4F53",
    behavior: "bloater",
    desc: "\u81C3\u80BF\u7684\u6BD2\u56CA\uFF0C\u88AB\u51FB\u6740\u65F6\u70B8\u5F00\u4E00\u5927\u7247\u5267\u6BD2\u4E91",
    hp: 190,
    speed: 46,
    damage: 14,
    size: 26,
    color: "#65a30d",
    glow: "#a3e635",
    score: 40,
    explodeRadius: 130,
    explodeDamage: 60,
    weight: 0.9,
    minWave: 2
  },
  {
    id: "screamer",
    name: "\u5C16\u5578\u8005",
    behavior: "screamer",
    desc: "\u53D1\u51FA\u5C16\u5578\uFF0C\u5927\u5E45\u52A0\u901F\u5468\u56F4\u602A\u7269\uFF0C\u5E76\u77ED\u6682\u9707\u6151\u73A9\u5BB6",
    hp: 130,
    speed: 72,
    damage: 8,
    size: 18,
    color: "#f0abfc",
    glow: "#e879f9",
    score: 45,
    buffRadius: 270,
    weight: 0.8,
    minWave: 3
  },
  {
    id: "spore",
    name: "\u5B62\u5B50\u602A",
    behavior: "spore",
    desc: "\u6301\u7EED\u91CA\u653E\u6EDE\u7559\u6BD2\u4E91\uFF0C\u9760\u8FD1\u4F1A\u88AB\u6301\u7EED\u4E2D\u6BD2",
    hp: 165,
    speed: 50,
    damage: 10,
    size: 20,
    color: "#a3e635",
    glow: "#84cc16",
    score: 38,
    cloudRadius: 95,
    cloudDamage: 42,
    weight: 0.9,
    minWave: 2
  }
];
var getCharacter = (id) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
var getOutfit = (id) => OUTFITS.find((o) => o.id === id) ?? OUTFITS[0];
var getSkill = (id) => SKILLS.find((s) => s.id === id) ?? SKILLS[0];
var SCENES = [
  {
    id: "neon",
    name: "\u9713\u8679\u90FD\u5E02",
    bgTop: "#1b1c3a",
    bgBottom: "#121331",
    wallColor: "#5b6478",
    wallDark: "#2a3140",
    accent: "#6366f1"
  },
  {
    id: "desert",
    name: "\u6C99\u6F20\u5E9F\u589F",
    bgTop: "#3a2e1a",
    bgBottom: "#2a2110",
    wallColor: "#a9743a",
    wallDark: "#6e4a24",
    accent: "#f59e0b"
  },
  {
    id: "arctic",
    name: "\u51B0\u539F\u57FA\u5730",
    bgTop: "#1a2a3a",
    bgBottom: "#0f1a28",
    wallColor: "#64748b",
    wallDark: "#334155",
    accent: "#38bdf8"
  },
  {
    id: "ruin",
    name: "\u672B\u65E5\u5E9F\u589F",
    bgTop: "#2a1a1a",
    bgBottom: "#1a1010",
    wallColor: "#52525b",
    wallDark: "#27272a",
    accent: "#ef4444"
  },
  {
    id: "cyber",
    name: "\u8D5B\u535A\u90FD\u5E02",
    bgTop: "#0a0a1f",
    bgBottom: "#05030f",
    wallColor: "#1d4ed8",
    wallDark: "#0b2240",
    accent: "#22d3ee",
    style: "city",
    gridColor: "rgba(34,211,238,0.10)"
  }
];

// src/game/draw.ts
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h,
    16
  );
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
var DARK = "rgba(8,10,25,0.85)";
var STEEL = "#3a4254";
var STEEL_D = "#232938";
var STEEL_L = "#5a6478";
var STEEL_X = "#727d93";
var WOOD = "#a9743a";
var WOOD_D = "#6e4a24";
function drawWeapon(ctx, gun, accent, t = 0, swing = 0) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const body = (x, y, w, h, c1, c2, r = 2) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.strokeStyle = DARK;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  };
  const block = (x, y, w, h, c, r = 2) => {
    ctx.fillStyle = c;
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.strokeStyle = DARK;
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  if (gun.weaponClass === "melee") {
    const swingArc = (gun.meleeArc ?? 2) * 0.8;
    ctx.rotate(-swingArc / 2 + swing * swingArc);
  }
  switch (gun.shape) {
    // ---------------- PISTOL ----------------
    case "pistol": {
      body(-4, -4, 16, 8, STEEL_X, STEEL, 2.5);
      body(10, -2, 6, 4, STEEL_L, STEEL_D, 1.5);
      block(-7, -1.6, 3.5, 3.4, STEEL_D, 1);
      block(4, -5, 2, 1.6, STEEL_D, 0.5);
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 15.5, -1.4, 2.6, 2.8, 1);
      ctx.fill();
      break;
    }
    // ---------------- SMG ----------------
    case "smg": {
      body(-6, -4, 18, 8, STEEL_X, STEEL, 2.5);
      body(10, -1.8, 7, 3.6, STEEL_L, STEEL_D, 1.5);
      block(-11, -2.4, 6, 4.8, STEEL_D, 1.5);
      ctx.save();
      ctx.translate(2, 3);
      ctx.rotate(0.5);
      block(-1.6, 0, 4, 11, STEEL_D, 1.5);
      ctx.restore();
      block(5, -5, 3, 1.6, STEEL_D, 0.5);
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 16, -1.2, 2.4, 2.4, 1);
      ctx.fill();
      break;
    }
    // ---------------- SHOTGUN ----------------
    case "shotgun": {
      body(-4, -4, 11, 8, STEEL_X, STEEL, 2);
      block(-11, -2.6, 7, 5.2, WOOD, 1.5);
      body(2, -3.2, 15, 2.4, STEEL_L, STEEL_D, 1);
      body(2, 0.8, 15, 2.4, STEEL_L, STEEL_D, 1);
      block(6, -4.2, 6, 8.4, WOOD_D, 1.5);
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 16.5, -2.6, 2.4, 5.2, 1);
      ctx.fill();
      break;
    }
    // ---------------- RIFLE ----------------
    case "rifle": {
      body(-6, -4, 22, 8, STEEL_X, STEEL, 2.5);
      body(14, -1.8, 11, 3.6, STEEL_L, STEEL_D, 1.5);
      block(6, -3.4, 9, 6.8, STEEL_D, 1.5);
      block(2, -5.6, 8, 1.6, STEEL_D, 0.6);
      block(-12, -2.4, 7, 4.8, STEEL_D, 1.5);
      ctx.save();
      ctx.translate(0, 3);
      ctx.rotate(0.42);
      block(-2, 0, 5, 10, STEEL_D, 2);
      ctx.restore();
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 24, -1.2, 2.6, 2.4, 1);
      ctx.fill();
      break;
    }
    // ---------------- SNIPER ----------------
    case "sniper": {
      body(-6, -4, 15, 8, STEEL_X, STEEL, 2.5);
      body(7, -2, 22, 4, STEEL_L, STEEL_D, 1.5);
      block(-13, -2.6, 7, 5.2, WOOD, 1.5);
      ctx.fillStyle = STEEL_D;
      roundRect(ctx, -4, -7.6, 9, 2.2, 1);
      ctx.fill();
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0.5, -6.4, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = rgba(gun.glow, 0.9);
      ctx.beginPath();
      ctx.arc(0.5, -6.4, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(22, 2);
      ctx.lineTo(25, 7);
      ctx.moveTo(22, 2);
      ctx.lineTo(25, -3);
      ctx.stroke();
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 28, -1.2, 2.6, 2.4, 1);
      ctx.fill();
      break;
    }
    // ---------------- ROCKET LAUNCHER ----------------
    case "rocket": {
      body(-7, -5.5, 22, 11, STEEL_X, STEEL, 3);
      ctx.fillStyle = STEEL_L;
      ctx.beginPath();
      ctx.moveTo(15, -4);
      ctx.lineTo(24, 0);
      ctx.lineTo(15, 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = STEEL_D;
      ctx.beginPath();
      ctx.moveTo(-7, -5.5);
      ctx.lineTo(-12, -8);
      ctx.lineTo(-7, -2.5);
      ctx.closePath();
      ctx.moveTo(-7, 5.5);
      ctx.lineTo(-12, 8);
      ctx.lineTo(-7, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba(gun.glow, 0.9);
      ctx.beginPath();
      ctx.arc(19, 0, 2.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    // ---------------- AKM ----------------
    case "akm": {
      body(-4, -4, 17, 8, STEEL_X, STEEL, 2);
      block(8, -3.4, 9, 6.8, WOOD, 1.5);
      body(14, -1.4, 8, 2.8, STEEL_L, STEEL_D, 1);
      block(8, -4.6, 11, 1.8, STEEL_D, 0.6);
      block(-11, -2.6, 7, 5.2, WOOD, 1.5);
      ctx.save();
      ctx.translate(1.5, 3);
      ctx.rotate(0.4);
      block(-2, 0, 4.6, 11, WOOD_D, 1.5);
      ctx.restore();
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 21, -1, 2.4, 2, 0.8);
      ctx.fill();
      break;
    }
    // ---------------- FCAR (heavy) ----------------
    case "fcar": {
      body(-5, -5, 19, 10, STEEL, STEEL_D, 2.5);
      body(13, -2.4, 10, 4.8, STEEL_L, STEEL_D, 1.5);
      block(-12, -3, 7, 6, STEEL_D, 1.5);
      block(-1, 3, 6, 9, STEEL_D, 1.5);
      block(2, -6.4, 9, 1.8, STEEL_D, 0.6);
      ctx.fillStyle = rgba(gun.glow, 0.55);
      roundRect(ctx, -3, -1, 15, 1.4, 0.6);
      ctx.fill();
      ctx.fillStyle = STEEL_D;
      for (let i = 0; i < 3; i++) {
        roundRect(ctx, 18 + i * 2, -2.2, 1.1, 4.4, 0.4);
        ctx.fill();
      }
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 25, -1.4, 2.4, 2.8, 1);
      ctx.fill();
      break;
    }
    // ---------------- PULSE (beam emitter) ----------------
    case "pulse": {
      body(-5, -4.5, 16, 9, "#2c3350", "#1a1f33", 3);
      block(-9, -2.6, 4.5, 5.2, "#15192a", 1);
      ctx.fillStyle = rgba(gun.glow, 0.8);
      roundRect(ctx, 0, -5.8, 3, 2, 0.6);
      roundRect(ctx, 5, -5.8, 3, 2, 0.6);
      ctx.fill();
      const cg = ctx.createRadialGradient(1, 0, 0, 1, 0, 5.5);
      cg.addColorStop(0, "#ffffff");
      cg.addColorStop(0.4, rgba(gun.glow, 0.9));
      cg.addColorStop(1, rgba(gun.glow, 0));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(1, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba(gun.glow, 0.85);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(13, 0, 3 + Math.sin(t * 12) * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = rgba(gun.glow, 0.9);
      ctx.beginPath();
      ctx.arc(15.5, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    // ---------------- LIGHTSABER ----------------
    case "lightsaber": {
      const bladeLen = (gun.meleeRange ?? 60) * 0.62;
      body(-7, -3, 14, 6, STEEL_X, STEEL_D, 2);
      block(-5, -2.4, 2, 4.8, STEEL_D, 0.5);
      block(-1, -2.4, 2, 4.8, STEEL_D, 0.5);
      block(3, -2.4, 2, 4.8, STEEL_D, 0.5);
      block(7, -2.6, 3, 5.2, STEEL_L, 1);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const flick = 1 + Math.sin(t * 30) * 0.05;
      ctx.strokeStyle = rgba(gun.glow, 0.22);
      ctx.lineWidth = 9 * flick;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(10 + bladeLen, 0);
      ctx.stroke();
      ctx.strokeStyle = rgba(gun.glow, 0.5);
      ctx.lineWidth = 5 * flick;
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.4 * flick;
      ctx.stroke();
      ctx.restore();
      break;
    }
    // ---------------- HAMMER ----------------
    case "hammer": {
      body(-1, -2, 21, 4, WOOD_D, "#4a3318", 1.5);
      block(-1, -2.4, 3, 4.8, STEEL_D, 0.6);
      block(3, -2.4, 2, 4.8, STEEL_D, 0.4);
      body(19, -8, 13, 16, STEEL_X, STEEL, 3);
      block(20, -7, 3, 14, STEEL_L, 1);
      block(28, -6, 3, 12, STEEL_D, 1);
      ctx.fillStyle = rgba(gun.glow, 0.8);
      roundRect(ctx, 22, -1.4, 7, 2.8, 1);
      ctx.fill();
      break;
    }
    // ---------------- FLAMETHROWER ----------------
    case "flamethrower": {
      body(-6, -5, 18, 10, STEEL_X, STEEL_D, 2.5);
      block(-10, -2.4, 5, 4.8, STEEL_D, 1.2);
      block(0, -8, 12, 4, "#7f1d1d", 1.5);
      block(2, -7.4, 8, 1, "#fca5a5", 0.5);
      body(12, -3, 9, 6, STEEL_L, STEEL_D, 1.5);
      block(20, -4.5, 3, 9, STEEL_D, 1);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const fg = ctx.createRadialGradient(22, 0, 0, 22, 0, 5);
      fg.addColorStop(0, "#ffffff");
      fg.addColorStop(0.4, rgba(gun.glow, 0.9));
      fg.addColorStop(1, rgba(gun.glow, 0));
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(22, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    // ---------------- SA1216 (auto shotgun) ----------------
    case "sa1216": {
      body(-5, -4.5, 16, 9, STEEL_X, STEEL, 2.5);
      body(10, -2, 10, 4, STEEL_L, STEEL_D, 1.5);
      block(-11, -2.8, 6, 5.6, WOOD, 1.5);
      ctx.save();
      ctx.translate(2, 3.5);
      ctx.rotate(0.3);
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * Math.PI * 2;
        ctx.fillStyle = i === 0 ? STEEL_L : STEEL_D;
        roundRect(ctx, -1.5 + Math.cos(a) * 3, Math.sin(a) * 3 - 4, 3, 10, 1);
        ctx.fill();
        ctx.strokeStyle = DARK;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 19, -1.6, 2.4, 3.2, 1);
      ctx.fill();
      break;
    }
    // ---------------- MGL32 (grenade revolver) ----------------
    case "mgl32": {
      body(-6, -4, 14, 8, STEEL_X, STEEL, 2);
      block(-11, -2.6, 6, 5.2, STEEL_D, 1.5);
      body(8, -2.5, 10, 5, STEEL_L, STEEL_D, 1.5);
      ctx.save();
      ctx.translate(4, 0);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        ctx.fillStyle = i % 2 === 0 ? STEEL_L : STEEL_D;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 5, Math.sin(a) * 5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = DARK;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.fillStyle = rgba(gun.glow, 0.7);
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      block(17, -4.5, 2, 2, STEEL_D, 0.5);
      break;
    }
    // ---------------- SPEAR ----------------
    case "spear": {
      const len = (gun.meleeRange ?? 90) * 0.85;
      ctx.strokeStyle = WOOD_D;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.lineTo(len - 14, 0);
      ctx.stroke();
      ctx.strokeStyle = "#4a3318";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = STEEL_D;
      for (let i = 0; i < 3; i++) {
        roundRect(ctx, -2 + i * 3, -2.4, 2, 4.8, 0.4);
        ctx.fill();
      }
      ctx.fillStyle = STEEL_X;
      ctx.beginPath();
      ctx.moveTo(len - 14, -5);
      ctx.lineTo(len, 0);
      ctx.lineTo(len - 14, 5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = rgba(gun.glow, 0.7);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(len - 12, -3.5);
      ctx.lineTo(len - 1, 0);
      ctx.lineTo(len - 12, 3.5);
      ctx.stroke();
      ctx.restore();
      break;
    }
    // ---------------- DRONE (浮游炮) ----------------
    case "drone": {
      body(-6, -4, 12, 8, "#2c3350", "#1a1f33", 3);
      ctx.fillStyle = rgba(gun.glow, 0.8);
      ctx.beginPath();
      ctx.arc(-6, -5, 2, 0, Math.PI * 2);
      ctx.arc(6, -5, 2, 0, Math.PI * 2);
      ctx.arc(-6, 5, 2, 0, Math.PI * 2);
      ctx.arc(6, 5, 2, 0, Math.PI * 2);
      ctx.fill();
      const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 5);
      cg.addColorStop(0, "#ffffff");
      cg.addColorStop(0.4, rgba(gun.glow, 0.9));
      cg.addColorStop(1, rgba(gun.glow, 0));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rgba(gun.glow, 0.85);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(8, 0, 2.5 + Math.sin(t * 10) * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    // ---------------- LIGHTNING WHIP (闪电鞭) ----------------
    case "lightning_whip": {
      body(-8, -2.4, 12, 4.8, STEEL_X, STEEL_D, 1.5);
      block(-8, -2.4, 4, 4.8, STEEL_D, 1);
      block(2, -2.6, 2, 5.2, STEEL_L, 0.8);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const len = (gun.meleeRange ?? 90) * 0.9;
      const flick = 1 + Math.sin(t * 22) * 0.12;
      const tail = (w, col) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(4, 0);
        let x = 4;
        let y = 0;
        const segs = 5;
        for (let i = 1; i <= segs; i++) {
          const f = i / segs;
          const nx = 4 + len * f;
          const ny = Math.sin(f * Math.PI * 2.5 + t * 6) * (10 * (1 - f)) * flick;
          ctx.lineTo(nx, ny);
          x = nx;
          y = ny;
        }
        ctx.stroke();
        return { x, y };
      };
      tail(8 * flick, rgba(gun.glow, 0.28));
      tail(3 * flick, rgba("#ffffff", 0.9));
      ctx.restore();
      break;
    }
    // ---------------- RECURVE BOW ----------------
    case "recurve_bow": {
      block(-2, -2, 4, 4, WOOD_D, 1);
      ctx.strokeStyle = WOOD;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.quadraticCurveTo(14, -18, 2, -26);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.quadraticCurveTo(14, 18, 2, 26);
      ctx.stroke();
      ctx.strokeStyle = WOOD_D;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(2, -26);
      ctx.lineTo(-3, -29);
      ctx.moveTo(2, 26);
      ctx.lineTo(-3, 29);
      ctx.stroke();
      ctx.strokeStyle = "rgba(240,240,255,0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(2, -26);
      ctx.lineTo(2, 26);
      ctx.stroke();
      ctx.fillStyle = rgba(gun.glow, 0.8);
      roundRect(ctx, 6, -1, 4, 2, 0.5);
      ctx.fill();
      break;
    }
    // ---------------- RIOT SHIELD ----------------
    case "riot_shield": {
      const sg = ctx.createLinearGradient(-2, -14, -2, 14);
      sg.addColorStop(0, "#60a5fa");
      sg.addColorStop(0.5, "#3b82f6");
      sg.addColorStop(1, "#1d4ed8");
      ctx.fillStyle = sg;
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-4, -13);
      ctx.lineTo(8, -16);
      ctx.lineTo(11, 0);
      ctx.lineTo(8, 16);
      ctx.lineTo(-4, 13);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = rgba("#dbeafe", 0.6);
      roundRect(ctx, -1, -4, 9, 8, 2);
      ctx.fill();
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = rgba(gun.glow, 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, -16);
      ctx.lineTo(11, 0);
      ctx.lineTo(8, 16);
      ctx.stroke();
      break;
    }
    // ---------------- SHAK-50 ----------------
    case "shak50": {
      body(-5, -3.5, 15, 7, STEEL_X, STEEL, 2.5);
      body(9, -1.5, 8, 3, STEEL_L, STEEL_D, 1);
      block(-10, -2, 5, 4.5, WOOD, 1.5);
      block(-1, -4.5, 8, 1.5, STEEL_D, 0.5);
      ctx.save();
      ctx.translate(0, 2.5);
      ctx.rotate(0.38);
      block(-2, 0, 4.5, 9, STEEL_D, 1.5);
      ctx.restore();
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 16, -1, 2.2, 2, 0.8);
      ctx.fill();
      break;
    }
    // ---------------- GATLING ----------------
    case "gatling": {
      body(-7, -5, 13, 10, STEEL_X, STEEL, 2.5);
      block(-12, -3, 6, 6, STEEL_D, 1.5);
      ctx.save();
      ctx.translate(8, 0);
      block(-4, -5, 13, 10, STEEL, 2);
      ctx.rotate(t * 9);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        const bx = Math.cos(a) * 3.2;
        const by = Math.sin(a) * 3.2;
        ctx.fillStyle = i % 2 ? STEEL_X : STEEL_L;
        roundRect(ctx, 2 + bx - 1.3, by - 1.6, 11, 3.2, 1);
        ctx.fill();
        ctx.strokeStyle = DARK;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = gun.glow;
      roundRect(ctx, 23, -2, 2.4, 4, 1);
      ctx.fill();
      break;
    }
    // ---------------- POISON MIST ----------------
    case "poison_mist": {
      body(-7, -5, 16, 10, STEEL_X, STEEL_D, 2.5);
      block(-11, -2.6, 5, 5.2, STEEL_D, 1.2);
      block(0, -8, 11, 4, "#4d7c0f", 1.5);
      block(2, -7.4, 7, 1, "#bef264", 0.5);
      body(9, -3, 8, 6, STEEL_L, STEEL_D, 1.5);
      block(16, -4.5, 3, 9, STEEL_D, 1);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 5; i++) {
        const ph = (t * 1.4 + i * 0.4) % 1;
        const rr = 3 + ph * 8;
        const px = 19 + ph * 11;
        ctx.fillStyle = rgba("#a3e635", 0.32 * (1 - ph));
        ctx.beginPath();
        ctx.arc(px, Math.sin(i * 2 + t * 2) * 4, rr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    default: {
      body(-4, -4.5, gun.barrel + 6, 9, STEEL, STEEL_D, 3);
    }
  }
  void accent;
}
function drawHat(ctx, hat, accent, r) {
  ctx.save();
  if (hat === "helmet") {
    ctx.fillStyle = accent;
    ctx.strokeStyle = "rgba(8,10,25,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.08, Math.PI * 0.85, Math.PI * 2.15);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(190,230,255,0.85)";
    ctx.fillRect(r * 0.2, -r * 0.55, r * 0.7, r * 0.3);
  } else if (hat === "cap") {
    ctx.fillStyle = accent;
    ctx.strokeStyle = "rgba(8,10,25,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.05);
    ctx.lineTo(r * 1.5, r * 0.1);
    ctx.lineTo(r * 1.5, r * 0.4);
    ctx.lineTo(0, r * 0.45);
    ctx.closePath();
    ctx.fill();
  } else if (hat === "hood") {
    ctx.fillStyle = shade(accent, -0.12);
    ctx.strokeStyle = "rgba(8,10,25,0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.18, Math.PI * 0.78, Math.PI * 2.22);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.stroke();
  } else if (hat === "visor") {
    ctx.fillStyle = "rgba(8,12,30,0.92)";
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1, Math.PI * 0.85, Math.PI * 2.15);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -r * 0.42);
    ctx.lineTo(r * 0.85, -r * 0.3);
    ctx.stroke();
  } else if (hat === "alien") {
    ctx.fillStyle = "#0b1020";
    ctx.beginPath();
    ctx.ellipse(r * 0.22, -r * 0.28, r * 0.34, r * 0.2, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.22, r * 0.28, r * 0.34, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(accent, 0.9);
    ctx.beginPath();
    ctx.arc(r * 0.22, -r * 0.28, r * 0.08, 0, Math.PI * 2);
    ctx.arc(r * 0.22, r * 0.28, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.6;
    for (const sy of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(r * 0.1, sy * r * 0.4);
      ctx.quadraticCurveTo(r * -0.2, sy * r * 0.9, r * -0.35, sy * r * 1.1);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(r * -0.35, sy * r * 1.1, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (hat === "monkey") {
    ctx.fillStyle = shade(accent, -0.1);
    ctx.strokeStyle = "rgba(40,25,15,0.5)";
    ctx.lineWidth = 1.2;
    for (const sy of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(-r * 0.1, sy * r * 0.62, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#caa072";
      ctx.beginPath();
      ctx.arc(-r * 0.1, sy * r * 0.62, r * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(accent, -0.1);
    }
    ctx.fillStyle = "#e8c79a";
    ctx.beginPath();
    ctx.ellipse(r * 0.32, 0, r * 0.34, r * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(40,25,15,0.6)";
    ctx.beginPath();
    ctx.arc(r * 0.5, -r * 0.08, r * 0.05, 0, Math.PI * 2);
    ctx.arc(r * 0.5, r * 0.08, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
  } else if (hat === "tycoon") {
    ctx.fillStyle = "#0b0c22";
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 1;
    roundRect(ctx, -r * 1.1, -r * 0.18, r * 2.2, r * 0.34, r * 0.12);
    ctx.fill();
    ctx.stroke();
    roundRect(ctx, -r * 0.62, -r * 1.3, r * 1.24, r * 1.2, r * 0.1);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = accent;
    roundRect(ctx, -r * 0.62, -r * 0.34, r * 1.24, r * 0.2, 0);
    ctx.fill();
  }
  ctx.restore();
}
function drawCharacter(ctx, opts) {
  const { x, y, angle, character, outfit, size, flash = 0 } = opts;
  const t = opts.t ?? 0;
  const breath = 1 + Math.sin(t * 3) * 0.03;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.78, size * 0.95, size * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(x + Math.cos(angle) * (opts.lunge ?? 0), y + Math.sin(angle) * (opts.lunge ?? 0));
  ctx.rotate(angle);
  if (opts.glow) {
    const g = ctx.createRadialGradient(0, 0, size * 0.4, 0, 0, size * 2.2);
    g.addColorStop(0, rgba(opts.glow, 0.35));
    g.addColorStop(1, rgba(opts.glow, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, size * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const r = size * breath;
  const suit = outfit.suit;
  const suitDark = outfit.suitDark;
  ctx.fillStyle = shade(suit, -0.2);
  ctx.strokeStyle = suitDark;
  ctx.lineWidth = 1.4;
  for (const sy of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(-r * 0.72, sy * r * 0.42, r * 0.42, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = shade(suit, -0.12);
  ctx.strokeStyle = suitDark;
  ctx.lineWidth = 1.4;
  roundRect(ctx, -r * 1.02, -r * 0.5, r * 0.5, r * 1, r * 0.18);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = rgba(outfit.accent, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, -r * 0.4);
  ctx.lineTo(-r * 0.85, r * 0.4);
  ctx.stroke();
  ctx.fillStyle = suit;
  ctx.strokeStyle = suitDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1, r * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = rgba(character.bodyColor, 0.92);
  ctx.beginPath();
  ctx.arc(r * 0.22, 0, r * 0.6, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.fill();
  ctx.strokeStyle = rgba(character.accent, 0.9);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(r * 0.12, 0, r * 0.32, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = shade(suit, -0.25);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, Math.PI * 0.25, Math.PI * 0.75);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, Math.PI * 1.25, Math.PI * 1.75);
  ctx.stroke();
  const swing = opts.meleeSwing ?? 0;
  const lean = swing > 0 ? Math.sin(swing * Math.PI) * r * 0.18 : 0;
  ctx.fillStyle = shade(suit, -0.06);
  ctx.strokeStyle = suitDark;
  ctx.lineWidth = 1.5;
  for (const sy of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(r * (0.28 + lean), sy * r * 0.66, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.strokeStyle = shade(suit, -0.06);
  ctx.lineWidth = r * 0.28;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(r * 0.1, -r * 0.5);
  ctx.lineTo(-r * 0.1, -r * 0.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.2, r * 0.5);
  ctx.lineTo(r * 0.55, r * 0.62);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.fillStyle = shade(suit, 0.1);
  ctx.beginPath();
  ctx.arc(-r * 0.12, -r * 0.85, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.55, r * 0.62, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  const headX = r * 0.18;
  ctx.fillStyle = flash > 0 ? "#ffffff" : outfit.skin ?? character.skin;
  ctx.strokeStyle = "rgba(40,25,15,0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(headX, 0, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = character.accent;
  ctx.beginPath();
  ctx.arc(headX + r * 0.32, -r * 0.18, r * 0.1, 0, Math.PI * 2);
  ctx.arc(headX + r * 0.32, r * 0.18, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(40,25,15,0.18)";
  ctx.beginPath();
  ctx.arc(headX - r * 0.1, 0, r * 0.5, Math.PI * 0.35, Math.PI * 0.65);
  ctx.fill();
  ctx.save();
  ctx.translate(headX, 0);
  drawHat(ctx, outfit.hat, outfit.suit, r * 0.62);
  ctx.restore();
  if (opts.gun) {
    ctx.save();
    ctx.translate(r * 0.55, r * 0.62);
    drawWeapon(ctx, opts.gun, outfit.accent, t, swing);
    ctx.restore();
  }
  ctx.strokeStyle = rgba(outfit.accent, 0.35);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.02, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,80,80,${flash * 0.6})`;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawMonster(ctx, opts) {
  const { behavior, size, color, glow, angle, t } = opts;
  const flash = opts.flash ?? 0;
  const poison = opts.poison ?? false;
  const buffed = opts.buffed ?? false;
  const charging = opts.charging ?? false;
  const s = size;
  const bodyCol = flash > 0.05 ? "#ffffff" : color;
  const dark = shade(color, -0.34);
  ctx.save();
  ctx.rotate(angle);
  if (buffed) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const a = 0.22 + Math.sin(t * 8) * 0.12;
    ctx.strokeStyle = rgba("#e879f9", a);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, s * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  const fillPath = (p, c = bodyCol) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    p();
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    ctx.stroke();
  };
  const eye = (x, y, r = s * 0.13) => {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  const limbLine = (x1, y1, x2, y2, w) => {
    ctx.strokeStyle = dark;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  switch (behavior) {
    // 行尸 — hunched shambler, arms reaching forward
    case "walker": {
      fillPath(() => ctx.ellipse(-s * 0.5, s * 0.32, s * 0.28, s * 0.16, 0, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(-s * 0.5, -s * 0.32, s * 0.28, s * 0.16, 0, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(-s * 0.05, 0, s * 0.6, s * 0.54, 0, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(s * 0.5, s * 0.3, s * 0.46, s * 0.15, -0.2, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(s * 0.5, -s * 0.3, s * 0.46, s * 0.15, 0.2, 0, Math.PI * 2));
      fillPath(() => ctx.arc(s * 0.58, 0, s * 0.32, 0, Math.PI * 2));
      eye(s * 0.7, -s * 0.12);
      eye(s * 0.7, s * 0.12);
      break;
    }
    // 奔尸 — lean, lunging (stretches forward when charging)
    case "runner": {
      if (charging) ctx.scale(1.12, 0.92);
      fillPath(() => ctx.ellipse(-s * 0.5, s * 0.3, s * 0.24, s * 0.13, 0, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(-s * 0.5, -s * 0.3, s * 0.24, s * 0.13, 0, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(0, 0, s * 0.78, s * 0.4, 0, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(-s * 0.4, s * 0.28, s * 0.4, s * 0.12, 0.4, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(-s * 0.4, -s * 0.28, s * 0.4, s * 0.12, -0.4, 0, Math.PI * 2));
      fillPath(() => ctx.arc(s * 0.78, 0, s * 0.3, 0, Math.PI * 2));
      eye(s * 0.92, -s * 0.1);
      eye(s * 0.92, s * 0.1);
      break;
    }
    // 巨尸 — huge hulking brute
    case "brute": {
      fillPath(() => ctx.ellipse(-s * 0.1, 0, s * 0.82, s * 0.78, 0, 0, Math.PI * 2));
      fillPath(() => ctx.arc(-s * 0.1, -s * 0.7, s * 0.4, 0, Math.PI * 2));
      fillPath(() => ctx.arc(-s * 0.1, s * 0.7, s * 0.4, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(s * 0.1, -s * 0.62, s * 0.5, s * 0.22, 0, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(s * 0.1, s * 0.62, s * 0.5, s * 0.22, 0, 0, Math.PI * 2));
      fillPath(() => ctx.arc(s * 0.7, 0, s * 0.26, 0, Math.PI * 2));
      eye(s * 0.82, -s * 0.1);
      eye(s * 0.82, s * 0.1);
      break;
    }
    // 吐酸者 — bulbous body, snout/muzzle forward
    case "spitter": {
      fillPath(() => ctx.ellipse(0, 0, s * 0.66, s * 0.6, 0, 0, Math.PI * 2));
      fillPath(() => {
        ctx.moveTo(s * 0.5, -s * 0.3);
        ctx.lineTo(s * 1.05, 0);
        ctx.lineTo(s * 0.5, s * 0.3);
        ctx.closePath();
      }, glow);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rgba(glow, 0.85);
      ctx.beginPath();
      ctx.arc(s * 0.7, 0, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      eye(s * 0.2, -s * 0.22);
      eye(s * 0.2, s * 0.22);
      break;
    }
    // 母体 — boss with glowing core + tentacle limbs + jaw
    case "abomination": {
      fillPath(() => ctx.ellipse(0, 0, s * 0.85, s * 0.8, 0, 0, Math.PI * 2));
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.5);
      cg.addColorStop(0, "#ffffff");
      cg.addColorStop(0.4, rgba(glow, 0.9));
      cg.addColorStop(1, rgba(glow, 0));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + t * 0.4;
        limbLine(0, 0, Math.cos(a) * s * 0.95, Math.sin(a) * s * 0.95, s * 0.18);
      }
      fillPath(() => {
        ctx.moveTo(s * 0.55, -s * 0.35);
        ctx.lineTo(s * 1, 0);
        ctx.lineTo(s * 0.55, s * 0.35);
        ctx.closePath();
      }, shade(color, 0.1));
      break;
    }
    // 爬虫 — tiny, low, scuttling legs
    case "crawler": {
      fillPath(() => ctx.ellipse(0, 0, s * 0.8, s * 0.42, 0, 0, Math.PI * 2));
      const lp = Math.sin(t * 12) * s * 0.12;
      for (let i = 0; i < 3; i++) {
        const bx = -s * 0.3 + i * s * 0.35;
        limbLine(bx, -s * 0.3, bx - s * 0.2, -s * 0.7 + lp, s * 0.1);
        limbLine(bx, s * 0.3, bx - s * 0.2, s * 0.7 - lp, s * 0.1);
      }
      fillPath(() => ctx.arc(s * 0.75, 0, s * 0.3, 0, Math.PI * 2));
      eye(s * 0.9, -s * 0.1);
      eye(s * 0.9, s * 0.1);
      break;
    }
    // 毒爆体 — swollen pulsing sac with veins
    case "bloater": {
      const pulse = 1 + Math.sin(t * 3) * 0.04;
      fillPath(() => ctx.ellipse(0, 0, s * 0.8 * pulse, s * 0.72 * pulse, 0, 0, Math.PI * 2));
      ctx.strokeStyle = rgba("#bef264", 0.6);
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * s * 0.7, Math.sin(a) * s * 0.64);
        ctx.stroke();
      }
      fillPath(() => ctx.ellipse(-s * 0.3, s * 0.6, s * 0.22, s * 0.14, 0, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(-s * 0.3, -s * 0.6, s * 0.22, s * 0.14, 0, 0, Math.PI * 2));
      eye(s * 0.4, -s * 0.22);
      eye(s * 0.4, s * 0.22);
      break;
    }
    // 尖啸者 — tall thin, open maw, sonic rings
    case "screamer": {
      fillPath(() => ctx.ellipse(0, 0, s * 0.5, s * 0.82, 0, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(-s * 0.2, -s * 0.6, s * 0.4, s * 0.14, 0.5, 0, Math.PI * 2));
      fillPath(() => ctx.ellipse(-s * 0.2, s * 0.6, s * 0.4, s * 0.14, -0.5, 0, Math.PI * 2));
      ctx.fillStyle = "#1a0a1a";
      ctx.beginPath();
      ctx.ellipse(s * 0.5, 0, s * 0.32, s * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = rgba(glow, 0.5 + Math.sin(t * 10) * 0.25);
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const rr = s * (0.9 + i * 0.4 + t % 1 * 0.4);
        ctx.beginPath();
        ctx.arc(s * 0.4, 0, rr, -0.7, 0.7);
        ctx.stroke();
      }
      ctx.restore();
      eye(s * 0.18, -s * 0.3);
      eye(s * 0.18, s * 0.3);
      break;
    }
    // 孢子怪 — body with mushroom caps + drifting spores
    case "spore": {
      fillPath(() => ctx.ellipse(0, 0, s * 0.62, s * 0.56, 0, 0, Math.PI * 2));
      ctx.fillStyle = shade(color, 0.15);
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.5;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * s * 0.34, -s * 0.45, s * 0.3, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
      }
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + t * 0.6;
        const rr = s * 0.7 + Math.sin(t * 2 + i) * s * 0.2;
        ctx.fillStyle = rgba(glow, 0.55);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.7, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      eye(s * 0.35, -s * 0.18);
      eye(s * 0.35, s * 0.18);
      break;
    }
    default: {
      fillPath(() => ctx.arc(0, 0, s, 0, Math.PI * 2));
    }
  }
  if (poison) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + t * 1.5;
      const px = Math.cos(a) * s * 0.5;
      const py = Math.sin(a) * s * 0.5;
      ctx.fillStyle = rgba("#a3e635", 0.5);
      ctx.beginPath();
      ctx.arc(px, py, s * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// src/game/sound.ts
var SoundManager = class {
  ctx = null;
  master = null;
  noise = null;
  enabled = true;
  /** Create / resume the audio context. Call from a user gesture. */
  ensure() {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.3;
        this.master.connect(this.ctx.destination);
        const len = Math.floor(this.ctx.sampleRate * 0.5);
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }
  setEnabled(v) {
    this.enabled = v;
  }
  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }
  tone(freq, dur, type, vol, slideTo) {
    if (!this.enabled || !this.ctx || !this.master) return;
    const t = this.now();
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo !== void 0) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, slideTo),
        t + dur
      );
    }
    g.gain.setValueAtTime(1e-4, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 5e-3);
    g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  noiseBurst(dur, vol, freq, q = 1) {
    if (!this.enabled || !this.ctx || !this.master || !this.noise) return;
    const t = this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq, t);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(60, freq * 0.4),
      t + dur
    );
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
  shoot(gunId) {
    switch (gunId) {
      case "pistol":
        this.tone(420, 0.08, "square", 0.18, 180);
        break;
      case "smg":
        this.tone(520, 0.05, "square", 0.1, 260);
        break;
      case "shotgun":
        this.noiseBurst(0.18, 0.35, 900, 0.6);
        this.tone(160, 0.12, "sawtooth", 0.18, 70);
        break;
      case "rifle":
        this.tone(680, 0.06, "sawtooth", 0.16, 300);
        break;
      case "sniper":
        this.tone(300, 0.25, "sawtooth", 0.22, 90);
        this.noiseBurst(0.12, 0.18, 1500, 0.8);
        break;
      case "rocket":
        this.tone(220, 0.3, "sawtooth", 0.2, 60);
        this.noiseBurst(0.3, 0.2, 500, 0.5);
        break;
      case "akm":
        this.tone(360, 0.07, "square", 0.16, 160);
        this.noiseBurst(0.05, 0.06, 1800, 1);
        break;
      case "fcar":
        this.tone(240, 0.12, "sawtooth", 0.22, 90);
        this.noiseBurst(0.08, 0.12, 700, 0.8);
        break;
      case "pulse":
        this.tone(900, 0.04, "sawtooth", 0.05, 680);
        break;
    }
  }
  hit() {
    this.noiseBurst(0.05, 0.12, 2200, 1.2);
  }
  swing() {
    this.noiseBurst(0.1, 0.12, 3200, 1.4);
    this.tone(640, 0.07, "sine", 0.07, 1200);
  }
  slam() {
    this.noiseBurst(0.42, 0.45, 480, 0.4);
    this.tone(70, 0.42, "sine", 0.35, 34);
  }
  explosion() {
    this.noiseBurst(0.4, 0.4, 700, 0.4);
    this.tone(90, 0.4, "sine", 0.3, 40);
  }
  hurt() {
    this.tone(200, 0.18, "sawtooth", 0.22, 80);
  }
  skill() {
    this.tone(300, 0.18, "triangle", 0.22, 720);
    this.tone(600, 0.18, "sine", 0.12, 1100);
  }
  pickup() {
    this.tone(520, 0.08, "triangle", 0.16, 780);
    this.tone(780, 0.1, "triangle", 0.12, 1040);
  }
  wave() {
    this.tone(330, 0.14, "triangle", 0.16, 440);
    setTimeout(() => this.tone(440, 0.18, "triangle", 0.16, 550), 120);
  }
};
var sound = new SoundManager();

// src/game/runtimeConfig.ts
var RUNTIME_DEFAULTS = {
  worldW: 1600,
  worldH: 1e3,
  baseHp: 2e3,
  enemyBaseHp: 2e3,
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
  enemyBaseDamage: 20,
  // ×2.5 (8 → 20) to match unified 250 player HP
  enemyEliteHpMult: 2,
  enemyEliteDmgMult: 1.8,
  playerDamageMult: 1,
  // PvP (foe) damage now baked into weapon numbers (×2.0 total); no extra multiplier so PvE isn't double-scaled
  playerSpeedMult: 1,
  playerBaseHp: 250,
  // unified max HP for every player (character/outfit HP bonuses disabled)
  enemyHp: 250
  // unified enemy base HP ×2.5 to match 250 player HP (per-wave hpScale & elite mult still apply)
};
var RUNTIME = { ...RUNTIME_DEFAULTS };

// src/game/engine.ts
var KEYS_MOVE = /* @__PURE__ */ new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight"
]);
var MAX_DASH_CHARGES = 3;
var DASH_RECHARGE = 5;
var GADGET_DEPLOY_DIST = 240;
var GADGET_THROW_DIST = 280;
var EMPTY_FRAME = {
  keys: [],
  mx: 0,
  my: 0,
  vmx: 0,
  vmy: 0,
  firing: false,
  gadget: -1,
  weaponSwitch: false,
  skill: false,
  reload: false
};
var RESPAWN_TIME = 4;
var GameEngine = class {
  canvas;
  ctx;
  loadout;
  onHud;
  W = 800;
  H = 600;
  /** world dimensions (larger than viewport) */
  worldW = RUNTIME.worldW;
  worldH = RUNTIME.worldH;
  camX = 0;
  camY = 0;
  raf = 0;
  sceneTheme = SCENES[0];
  /** index into SCENES[] chosen by the host (authoritative); synced to the guest */
  sceneIndex = 0;
  last = 0;
  running = false;
  /** guest-side interpolation state for smooth rendering between 30Hz snapshots */
  gx = 0;
  gy = 0;
  gxInit = false;
  netRender = /* @__PURE__ */ new Map();
  /**
   * Peer handshake flag. Host sets it when the guest's `hello` arrives; the
   * guest sets it once it receives the first world snapshot. Until both sides
   * are confirmed present, the match must not advance (no enemy spawns), so a
   * late-joining player never lands in a half-played, desynced world.
   */
  peerReady = false;
  /** opponent transiently disconnected; HUD shows a "reconnecting" overlay */
  reconnecting = false;
  /** Gameplay (waves / enemy spawns) may advance. Gated on `peerReady` for net. */
  matchLive = false;
  character = getCharacter("raider");
  outfit = getOutfit("tactical");
  skill = getSkill("dash");
  player;
  bullets = [];
  enemyBullets = [];
  enemies = [];
  particles = [];
  effects = [];
  pickups = [];
  grenades = [];
  walls = [];
  deployables = [];
  base;
  enemyBase;
  weaponStates = /* @__PURE__ */ new Map();
  guns = GUNS;
  gunIndex = 0;
  /** gadgets the player is carrying this run (max 3) */
  gadgets = [];
  /** currently selected (highlighted) gadget; -1 = none. Selecting does NOT deploy. */
  selectedGadget = -1;
  /** index of last gadget used via scroll, for wheel cycling */
  lastGadget = 0;
  /** semi-auto latch: blocks re-fire until the trigger is released */
  semiAutoLatch = false;
  // ---- multiplayer ----
  mode = "local";
  net = null;
  /** single-player sub-mode */
  gameMode = "defense";
  selfPid = 0;
  peerPid = 0;
  peerName = "";
  /** caller-requested pids (authoritative-client thin mode); overrides role default */
  reqSelfPid;
  reqPeerPid;
  peerLoadout = null;
  remoteInput = null;
  lastSnap = null;
  snapAccum = 0;
  inpAccum = 0;
  /** the opponent avatar (simulated on host, mirrored on guest) */
  foe = null;
  foeChar = null;
  foeOutfit = null;
  /** the opponent's own weapon list (from their loadout, mirrored via "hello") */
  foeGuns = [];
  /** the opponent's own gadget list (from their loadout, mirrored via "hello") */
  foeGadgets = [];
  /** the opponent's per-gadget cooldown timers (separate from the host's own) */
  foeGadgetCd = /* @__PURE__ */ new Map();
  /** the host's own avatar; never swapped while simulating the foe */
  localPlayer = null;
  // one-shot action intents captured on the guest, sent with the next input
  pendGadget = -1;
  pendSkill = false;
  pendReload = false;
  pendWeapon = false;
  /** authoritative-server mode: latest InputFrame received from each peer (pid -> frame) */
  peerInput = /* @__PURE__ */ new Map();
  /** enemies still queued to spawn this wave (local/host HUD; mirrored value on guest) */
  spawnQueue = 0;
  /** total remaining enemies shown in the HUD (live for host, mirrored for guest) */
  enemiesLeft = 0;
  /** last snapshot's enemy positions — used by the guest-side mobile aim assist */
  snapEnemies = [];
  enemyId = 1;
  score = 0;
  kills = 0;
  gold = 0;
  wave = 0;
  waveTimer = 0;
  spawnTimer = 0;
  maxConcurrent = 10;
  intermission = 0;
  banner = null;
  skillCd = 0;
  timewarp = 0;
  hitSndCd = 0;
  beamSndCd = 0;
  flameSndCd = 0;
  shake = 0;
  whipToggle = false;
  time = 0;
  gameOver = false;
  gameOverReason = "";
  paused = false;
  // dash charge system
  dashCharges = MAX_DASH_CHARGES;
  dashRecharge = 0;
  // progress toward next charge (0..DASH_RECHARGE)
  // gadget cooldowns
  gadgetCd = /* @__PURE__ */ new Map();
  // beam state
  beamActive = false;
  beamHit = null;
  // flamethrower state
  flameActive = false;
  keys = /* @__PURE__ */ new Set();
  mouse = { x: 400, y: 300 };
  firing = false;
  /** virtual movement vector from the on-screen joystick (-1..1 each axis) */
  virtualMove = { x: 0, y: 0 };
  /** touch device: enables the mobile on-screen controls + mobile-only aim assist */
  touchMode = false;
  hudAccum = 0;
  boundKeyDown;
  boundKeyUp;
  boundMouseMove;
  boundMouseDown;
  boundMouseUp;
  boundWheel;
  boundBlur;
  boundResize;
  boundContext;
  constructor(canvas, loadout, onHud, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext("2d") : null;
    this.loadout = loadout;
    this.onHud = onHud;
    this.mode = opts.mode ?? "local";
    this.net = opts.net ?? null;
    this.reqSelfPid = opts.selfPid;
    this.reqPeerPid = opts.peerPid;
    this.character = getCharacter(loadout.characterId);
    this.outfit = getOutfit(loadout.outfitId);
    this.skill = getSkill(loadout.skillId);
    this.gameMode = loadout.gameMode ?? "defense";
    this.guns = loadout.gunIds && loadout.gunIds.length > 0 ? loadout.gunIds.map((id) => GUNS.find((g) => g.id === id) ?? GUNS[0]).slice(0, 2) : [GUNS.find((g) => g.id === loadout.gunId) ?? GUNS[0]];
    const chosen = (loadout.gadgetIds ?? []).map((id) => GADGETS.find((g) => g.id === id)).filter((g) => !!g).slice(0, 3);
    this.gadgets = chosen.length > 0 ? chosen : GADGETS.slice(0, 3);
    this.gunIndex = Math.max(
      0,
      this.guns.findIndex((g) => g.id === loadout.gunId)
    );
    this.boundKeyDown = (e) => this.onKeyDown(e);
    this.boundKeyUp = (e) => this.keys.delete(e.code);
    this.boundMouseMove = (e) => this.onMouseMove(e);
    this.boundMouseDown = (e) => this.onMouseDown(e);
    this.boundMouseUp = (e) => this.onMouseUp(e);
    this.boundWheel = (e) => this.onWheel(e);
    this.boundBlur = () => {
      this.keys.clear();
      this.firing = false;
      this.semiAutoLatch = false;
    };
    this.boundResize = () => this.onResize();
    this.boundContext = (e) => e.preventDefault();
  }
  // ---------------------------------------------------------------- lifecycle
  start() {
    this.resize();
    this.resetState();
    this.attach();
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    window.__game = this;
    this.emit(true);
  }
  /**
   * Headless boot used by the authoritative server (Node). Skips all DOM /
   * canvas / rAF setup and only prepares the simulation state. The server
   * drives the simulation via `stepServer(dt)` on its own loop.
   */
  startHeadless() {
    this.resetState();
    this.emit(true);
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.detach();
  }
  setPaused(p) {
    this.paused = p;
    if (!p) this.last = performance.now();
    this.emit(true);
  }
  // --------------------------------------------------- touch / mobile controls
  /** Called by the React layer when a touch device is detected. Enables the
   *  on-screen joystick/fire button and the mobile-only aim assist. */
  setTouchMode(on) {
    this.touchMode = on;
  }
  /** Virtual movement vector from the on-screen joystick (-1..1 each axis). */
  setVirtualMove(x, y) {
    this.virtualMove.x = x;
    this.virtualMove.y = y;
  }
  /** Virtual fire button (on-screen). Drives the same `firing` flag as the mouse. */
  setVirtualFiring(on) {
    this.firing = on;
    if (on) this.semiAutoLatch = false;
  }
  selectGun(i) {
    if (i >= 0 && i < this.guns.length) {
      this.gunIndex = i;
      this.beamActive = false;
      this.flameActive = false;
      this.player.bowCharge = 0;
      this.player.bowDrawing = false;
      this.player.shieldBlockTime = 0;
      if (this.gun.shieldMaxHp && this.player.shieldHp <= 0 && this.player.shieldCd <= 0) {
        this.player.shieldHp = this.gun.shieldMaxHp;
      }
      this.emit(true);
    }
  }
  triggerSkill() {
    this.activateSkill();
  }
  /**
   * Select (highlight) a carried gadget without deploying it. Pressing the
   * already-selected slot again toggles the selection off. This is what the
   * number keys / wheel now do — deployment happens on left-click.
   */
  selectGadget(index) {
    if (this.gameOver || this.paused) return;
    if (index < 0 || index >= this.gadgets.length) return;
    this.selectedGadget = this.selectedGadget === index ? -1 : index;
  }
  /** Cancel the current gadget selection (e.g. when switching weapons). */
  clearGadgetSelection() {
    this.selectedGadget = -1;
  }
  /** Deploy a carried gadget by index (0-based). tx/ty = aimed world position. */
  deployGadget(index, tx, ty) {
    if (this.gameOver || this.paused) return;
    if (index < 0 || index >= this.gadgets.length) return;
    const def = this.gadgets[index];
    const cd = this.gadgetCd.get(def.id) ?? 0;
    if (cd > 0) return;
    const deployed = this.deployables.filter((d) => d.kind === def.kind).length;
    if (def.maxStack && deployed >= def.maxStack) {
      const idx = this.deployables.findIndex((d) => d.kind === def.kind);
      if (idx >= 0) this.deployables.splice(idx, 1);
    }
    this.gadgetCd.set(def.id, def.cooldown);
    this.doDeploy(def, tx, ty);
    sound.skill();
    this.emit(true);
  }
  reloadCurrent() {
    const g = this.gun;
    const ws = this.weaponStates.get(g.id);
    if (g.magazine && ws && ws.reload <= 0 && ws.ammo < g.magazine) {
      ws.reload = g.reloadTime ?? 1.5;
    }
  }
  restart() {
    this.resetState();
    this.gameOver = false;
    this.paused = false;
    this.last = performance.now();
    this.emit(true);
  }
  resetState() {
    this.resize();
    this.sceneIndex = Math.floor(Math.random() * SCENES.length);
    this.sceneTheme = SCENES[this.sceneIndex];
    if (this.gameMode === "biohazard") {
      this.worldW = this.W;
      this.worldH = this.H;
    }
    this.gx = 0;
    this.gy = 0;
    this.gxInit = false;
    this.netRender.clear();
    this.peerReady = this.mode === "local";
    this.matchLive = this.mode === "local";
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.particles = [];
    this.effects = [];
    this.pickups = [];
    this.grenades = [];
    this.deployables = [];
    this.walls = this.buildWalls();
    this.base = {
      x: this.worldW / 2,
      y: this.worldH - 120,
      radius: 48,
      hp: RUNTIME.baseHp,
      maxHp: RUNTIME.baseHp,
      flash: 0,
      t: 0
    };
    this.enemyBase = {
      x: this.worldW / 2,
      y: 120,
      radius: 48,
      hp: RUNTIME.enemyBaseHp,
      maxHp: RUNTIME.enemyBaseHp,
      flash: 0,
      t: 0
    };
    if (this.gameMode === "biohazard") {
      this.base.hp = Infinity;
      this.base.maxHp = Infinity;
      this.enemyBase.hp = Infinity;
      this.enemyBase.maxHp = Infinity;
    }
    this.weaponStates = /* @__PURE__ */ new Map();
    for (const g of this.guns) {
      this.weaponStates.set(g.id, {
        ammo: g.magazine ?? 0,
        reload: 0,
        heat: 0,
        overheated: false
      });
    }
    this.score = 0;
    this.kills = 0;
    this.gold = 0;
    this.wave = 0;
    this.waveTimer = 0;
    this.spawnTimer = 1;
    this.maxConcurrent = this.gameMode === "biohazard" ? 14 : 8;
    this.intermission = 3;
    this.skillCd = 0;
    this.timewarp = 0;
    this.shake = 0;
    this.time = 0;
    this.beamActive = false;
    this.beamHit = null;
    this.flameActive = false;
    this.banner = {
      text: this.gameMode === "biohazard" ? "\u751F\u5316\u5371\u673A \xB7 \u6D3B\u4E0B\u53BB\uFF01" : "\u5B88\u62A4\u57FA\u5730\uFF01",
      t: 2.2
    };
    this.enemyId = 1;
    this.gunIndex = 0;
    this.lastGadget = 0;
    this.selectedGadget = -1;
    this.dashCharges = MAX_DASH_CHARGES;
    this.dashRecharge = 0;
    this.gadgetCd = /* @__PURE__ */ new Map();
    const c = this.character;
    const o = this.outfit;
    const maxHp = RUNTIME.playerBaseHp > 0 ? RUNTIME.playerBaseHp : Math.round(c.maxHp + o.hpBonus);
    const speed = c.speed * (1 + o.speedBonus);
    this.player = {
      x: this.worldW / 2,
      y: this.worldH - 200,
      vx: 0,
      vy: 0,
      angle: 0,
      hp: maxHp,
      maxHp,
      size: c.size,
      speed,
      fireTimer: 0,
      iframes: 0,
      flash: 0,
      dashVx: 0,
      dashVy: 0,
      dashTime: 0,
      shieldTime: 0,
      overdriveTime: 0,
      slamCd: 0,
      t: 0,
      swingTimer: 0,
      swingDur: 0.22,
      comboStep: 0,
      comboTimer: 0,
      lunge: 0,
      bowCharge: 0,
      bowDrawing: false,
      shieldBlockTime: 0,
      shieldHp: 0,
      shieldCd: 0,
      lastHitTime: 0
    };
    this.localPlayer = this.player;
    if (this.gameMode === "biohazard") {
      this.player.x = this.worldW / 2;
      this.player.y = this.worldH / 2;
    }
    this.player.shieldHp = this.gun.shieldMaxHp ?? 0;
    this.applyRuntime();
    if (this.mode !== "local" && this.net) {
      this.selfPid = this.reqSelfPid ?? (this.mode === "host" ? 1 : 2);
      this.peerPid = this.reqPeerPid ?? (this.mode === "host" ? 2 : 1);
      this.foeGuns = this.guns.slice();
      this.gunIndex = Math.max(0, this.guns.findIndex((g) => g.id === this.loadout.gunId));
      this.player.gunIndex = this.gunIndex;
      this.player.skillCd = 0;
      this.player.dashCharges = MAX_DASH_CHARGES;
      this.player.dashRecharge = 0;
      this.player.lastGadget = 0;
      this.foe = this.makeFoe();
      this.net.sendGame({ t: "hello", name: this.character.name, loadout: this.loadout });
    }
  }
  makeFoe() {
    const c = getCharacter("raider");
    const o = getOutfit("tactical");
    const maxHp = RUNTIME.playerBaseHp > 0 ? RUNTIME.playerBaseHp : Math.round(c.maxHp + o.hpBonus);
    this.foeChar = c;
    this.foeOutfit = o;
    return {
      x: this.worldW / 2,
      y: 200,
      vx: 0,
      vy: 0,
      angle: Math.PI,
      hp: maxHp,
      maxHp,
      size: c.size,
      speed: c.speed * (1 + o.speedBonus),
      fireTimer: 0,
      iframes: 0,
      flash: 0,
      dashVx: 0,
      dashVy: 0,
      dashTime: 0,
      shieldTime: 0,
      overdriveTime: 0,
      slamCd: 0,
      t: 0,
      swingTimer: 0,
      swingDur: 0.22,
      comboStep: 0,
      comboTimer: 0,
      lunge: 0,
      bowCharge: 0,
      bowDrawing: false,
      shieldBlockTime: 0,
      shieldHp: 0,
      shieldCd: 0,
      lastHitTime: 0,
      gunIndex: 0,
      skillCd: 0,
      dashCharges: MAX_DASH_CHARGES,
      dashRecharge: 0,
      lastGadget: 0
    };
  }
  /** Make sure every gun in the list has a WeaponState entry (host simulates foe guns too). */
  ensureWeaponStates(guns) {
    for (const g of guns) {
      if (!this.weaponStates.has(g.id)) {
        this.weaponStates.set(g.id, {
          ammo: g.magazine ?? 0,
          reload: 0,
          heat: 0,
          overheated: false
        });
      }
    }
  }
  applyPeerLoadout() {
    const pl = this.peerLoadout;
    if (!pl) return;
    this.foeChar = getCharacter(pl.characterId);
    this.foeOutfit = getOutfit(pl.outfitId);
    this.foeGuns = pl.gunIds && pl.gunIds.length > 0 ? pl.gunIds.map((id) => GUNS.find((g) => g.id === id) ?? GUNS[0]).slice(0, 2) : [GUNS.find((g) => g.id === pl.gunId) ?? GUNS[0]];
    this.ensureWeaponStates(this.foeGuns);
    const chosen = (pl.gadgetIds ?? []).map((id) => GADGETS.find((g) => g.id === id)).filter((g) => !!g);
    this.foeGadgets = chosen.length > 0 ? chosen : GADGETS.slice(0, 3);
    if (this.foe) {
      const c = this.foeChar;
      const o = this.foeOutfit;
      this.foe.maxHp = RUNTIME.playerBaseHp > 0 ? RUNTIME.playerBaseHp : Math.round(c.maxHp + o.hpBonus);
      if (this.foe.hp > this.foe.maxHp) this.foe.hp = this.foe.maxHp;
      this.foe.speed = c.speed * (1 + o.speedBonus);
      this.foe.size = c.size;
    }
  }
  /** Sync world / base tunables from RUNTIME into the live engine. */
  applyRuntime() {
    this.worldW = RUNTIME.worldW;
    this.worldH = RUNTIME.worldH;
    if (this.base) {
      this.base.x = this.worldW / 2;
      this.base.y = this.worldH - 120;
      this.base.maxHp = RUNTIME.baseHp;
      if (this.base.hp > this.base.maxHp) this.base.hp = this.base.maxHp;
    }
    if (this.enemyBase) {
      this.enemyBase.x = this.worldW / 2;
      this.enemyBase.y = 120;
      this.enemyBase.maxHp = RUNTIME.enemyBaseHp;
      if (this.enemyBase.hp > this.enemyBase.maxHp)
        this.enemyBase.hp = this.enemyBase.maxHp;
    }
  }
  /** Recompute the player's maxHp / speed / size from the current character+outfit. */
  refreshPlayerStats() {
    if (!this.player) return;
    const c = this.character;
    const o = this.outfit;
    const maxHp = RUNTIME.playerBaseHp > 0 ? RUNTIME.playerBaseHp : Math.round(c.maxHp + o.hpBonus);
    const ratio = this.player.maxHp ? this.player.hp / this.player.maxHp : 1;
    this.player.maxHp = maxHp;
    this.player.hp = Math.max(1, Math.min(maxHp, Math.round(maxHp * ratio)));
    this.player.speed = c.speed * (1 + o.speedBonus);
    this.player.size = c.size;
    this.emit(true);
  }
  /** Directly set the live player's max HP and full HP (console health editor). */
  setPlayerHp(v) {
    if (!this.player) return;
    this.player.maxHp = v;
    this.player.hp = v;
    this.emit(true);
  }
  /** Directly set every live enemy's max HP and full HP (console health editor). */
  setAllEnemyHp(v) {
    for (const e of this.enemies) {
      e.maxHp = v;
      e.hp = v;
    }
    this.emit(true);
  }
  buildWalls() {
    const cx = this.worldW / 2;
    const cy = this.worldH / 2;
    const walls = [];
    const pillar = (x, y) => walls.push({
      x: x - 20,
      y: y - 20,
      w: 40,
      h: 40,
      hp: Infinity,
      maxHp: Infinity,
      destructible: false
    });
    const cover = (x, y, w, h) => walls.push({
      x: x - w / 2,
      y: y - h / 2,
      w,
      h,
      hp: 150,
      maxHp: 150,
      destructible: true
    });
    pillar(cx - 200, cy - 150);
    pillar(cx + 200, cy - 150);
    pillar(cx - 200, cy + 150);
    pillar(cx + 200, cy + 150);
    pillar(cx, cy);
    cover(cx, cy - 200, 160, 30);
    cover(cx, cy + 200, 160, 30);
    cover(cx - 250, cy, 30, 160);
    cover(cx + 250, cy, 30, 160);
    cover(cx - 150, cy - 100, 100, 28);
    cover(cx + 150, cy + 100, 100, 28);
    cover(cx - 350, cy - 200, 90, 26);
    cover(cx + 350, cy + 200, 90, 26);
    cover(cx - 400, cy + 150, 90, 26);
    cover(cx + 400, cy - 150, 90, 26);
    const TH = 80;
    const air = (x, y, w, h) => walls.push({
      x,
      y,
      w,
      h,
      hp: Infinity,
      maxHp: Infinity,
      destructible: false,
      invisible: true
    });
    air(-TH, -TH, TH, this.worldH + TH * 2);
    air(this.worldW, -TH, TH, this.worldH + TH * 2);
    air(-TH, -TH, this.worldW + TH * 2, TH);
    air(-TH, this.worldH, this.worldW + TH * 2, TH);
    return walls;
  }
  attach() {
    if (!this.canvas) return;
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    window.addEventListener("mousemove", this.boundMouseMove);
    this.canvas.addEventListener("mousedown", this.boundMouseDown);
    window.addEventListener("mouseup", this.boundMouseUp);
    this.canvas.addEventListener("wheel", this.boundWheel, {
      passive: false
    });
    this.canvas.addEventListener("contextmenu", this.boundContext);
    window.addEventListener("blur", this.boundBlur);
    window.addEventListener("resize", this.boundResize);
  }
  detach() {
    if (!this.canvas) return;
    window.removeEventListener("keydown", this.boundKeyDown);
    window.removeEventListener("keyup", this.boundKeyUp);
    window.removeEventListener("mousemove", this.boundMouseMove);
    this.canvas.removeEventListener("mousedown", this.boundMouseDown);
    window.removeEventListener("mouseup", this.boundMouseUp);
    this.canvas.removeEventListener("wheel", this.boundWheel);
    this.canvas.removeEventListener("contextmenu", this.boundContext);
    window.removeEventListener("blur", this.boundBlur);
    window.removeEventListener("resize", this.boundResize);
  }
  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.W = Math.max(320, rect.width);
    this.H = Math.max(240, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(this.W * dpr);
    this.canvas.height = Math.floor(this.H * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  /** Window resize handler: refresh the canvas size, then in the single-screen
   *  biohazard arena re-sync the world bounds to the new viewport so the whole
   *  playfield stays visible and the air walls stay at the screen edges. */
  onResize() {
    this.resize();
    if (this.gameMode === "biohazard") {
      this.worldW = this.W;
      this.worldH = this.H;
      this.walls = this.buildWalls();
      this.camX = 0;
      this.camY = 0;
      this.base.y = this.worldH - 120;
      this.enemyBase.y = 120;
    }
  }
  // ----------------------------------------------------------------- input
  onKeyDown(e) {
    sound.ensure();
    const ae = document.activeElement;
    if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.tagName === "SELECT" || ae.isContentEditable))
      return;
    if (e.code === "KeyP" || e.code === "Escape") {
      if (this.mode === "local" && !this.gameOver) this.setPaused(!this.paused);
      e.preventDefault();
      return;
    }
    if (this.gameOver || this.paused) return;
    if (KEYS_MOVE.has(e.code)) this.keys.add(e.code);
    if (this.mode === "guest") {
      if (e.code === "KeyQ" || e.code === "Space") {
        this.pendSkill = true;
        e.preventDefault();
      } else if (e.code === "KeyR") {
        this.pendReload = true;
      } else if (e.code.startsWith("Digit")) {
        const n = parseInt(e.code.slice(5), 10);
        if (n >= 1 && n <= this.gadgets.length) {
          this.selectGadget(n - 1);
          e.preventDefault();
        }
      } else if (e.code === "KeyE") {
        this.pendWeapon = true;
        e.preventDefault();
      }
      return;
    }
    if (e.code === "KeyQ" || e.code === "Space") {
      this.activateSkill();
      e.preventDefault();
    }
    if (e.code === "KeyR") this.reloadCurrent();
    if (e.code.startsWith("Digit")) {
      const n = parseInt(e.code.slice(5), 10);
      if (n >= 1 && n <= this.gadgets.length) {
        this.selectGadget(n - 1);
        e.preventDefault();
      }
    }
    if (e.code === "KeyE") {
      this.clearGadgetSelection();
      this.selectGun((this.gunIndex + 1) % this.guns.length);
      e.preventDefault();
    }
  }
  onMouseMove(e) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left + this.camX;
    this.mouse.y = e.clientY - rect.top + this.camY;
  }
  onMouseDown(e) {
    sound.ensure();
    if (e.button === 0) {
      if (this.selectedGadget >= 0 && !this.gameOver && !this.paused) {
        const idx = this.selectedGadget;
        const g = this.gadgets[idx];
        if (g) {
          if (this.mode === "guest") {
            this.pendGadget = idx;
          } else if ((this.gadgetCd.get(g.id) ?? 0) <= 0) {
            this.deployGadget(idx, this.mouse.x, this.mouse.y);
          }
          this.selectedGadget = -1;
          e.preventDefault();
          return;
        }
      }
      this.firing = true;
      this.semiAutoLatch = false;
    }
    if (e.button === 2) {
      if (this.mode === "guest") {
        this.pendSkill = true;
        e.preventDefault();
        return;
      }
      if (this.gun.id === "hammer" && this.player.slamCd <= 0 && !this.paused && !this.gameOver) {
        this.meleeSlam();
      } else if (this.gun.weaponClass === "shield" && !this.paused && !this.gameOver) {
        this.raiseShield();
      } else {
        this.activateSkill();
      }
    }
  }
  onMouseUp(e) {
    if (e.button === 0) {
      this.firing = false;
      this.semiAutoLatch = false;
    }
  }
  onWheel(e) {
    e.preventDefault();
    const dir = e.deltaY > 0 ? 1 : -1;
    const n = this.gadgets.length;
    if (n === 0) return;
    const cur = this.selectedGadget < 0 ? this.lastGadget : this.selectedGadget;
    const next = ((cur + dir) % n + n) % n;
    this.lastGadget = next;
    this.selectGadget(next);
  }
  // ------------------------------------------------------------------ loop
  loop = (now) => {
    if (!this.running) return;
    let dt = (now - this.last) / 1e3;
    this.last = now;
    if (dt > 0.05) dt = 0.05;
    if (!this.gameOver) this.update(dt);
    this.render();
    this.hudAccum += dt;
    if (this.hudAccum > 0.06) {
      this.hudAccum = 0;
      this.emit(false);
    }
    this.raf = requestAnimationFrame(this.loop);
  };
  // ---------------------------------------------------------------- update
  update(dt) {
    if (this.mode !== "local" && this.net) this.pumpNet();
    if (this.paused) {
      if (this.mode === "host" && this.net) {
        this.snapAccum += dt;
        if (this.snapAccum >= 1 / 30) {
          this.snapAccum = 0;
          this.sendSnapshot();
        }
      } else if (this.mode === "guest") {
        this.applySnapshot();
      }
      return;
    }
    if (this.mode === "guest") {
      this.applySnapshot();
      if (!this.gxInit) {
        this.gx = this.player.x;
        this.gy = this.player.y;
        this.gxInit = true;
      }
      this.gx += (this.player.x - this.gx) * 0.4;
      this.gy += (this.player.y - this.gy) * 0.4;
      this.player.x = this.gx;
      this.player.y = this.gy;
      if (this.touchMode) {
        const tgt = this.findAimTarget(this.player);
        if (tgt) {
          this.mouse.x = tgt.x;
          this.mouse.y = tgt.y;
        }
      }
      if (this.player.hp <= 0) {
        if (!this.player.deadTimer || this.player.deadTimer <= 0) this.player.deadTimer = RESPAWN_TIME;
        this.player.deadTimer = Math.max(0, this.player.deadTimer - dt);
        this.banner = { text: `\u4F60\u88AB\u51FB\u8D25\uFF01${Math.ceil(this.player.deadTimer)} \u79D2\u540E\u590D\u6D3B`, t: 0.4 };
      } else {
        this.player.deadTimer = 0;
      }
      this.inpAccum += dt;
      if (this.inpAccum >= 1 / 30) {
        this.inpAccum = 0;
        this.sendInput();
      }
      this.camX = Math.max(0, Math.min(this.worldW - this.W, this.player.x - this.W / 2));
      this.camY = Math.max(0, Math.min(this.worldH - this.H, this.player.y - this.H / 2));
      this.emit(true);
      return;
    }
    this.updatePlayer(dt);
    this.simulateWorld(dt);
    if (this.mode === "host") {
      this.tickRespawns(dt);
      if (this.player.deadTimer && this.player.deadTimer > 0) {
        this.banner = { text: `\u4F60\u88AB\u51FB\u8D25\uFF01${Math.ceil(this.player.deadTimer)} \u79D2\u540E\u590D\u6D3B`, t: 0.4 };
      }
      this.simulateRemote(dt);
      this.snapAccum += dt;
      if (this.snapAccum >= 1 / 30) {
        this.snapAccum = 0;
        this.sendSnapshot();
      }
      if (this.gameMode !== "biohazard" && this.base.hp <= 0 && !this.gameOver)
        this.endGame("\u57FA\u5730\u5931\u5B88\uFF0C\u4F60\u8F93\u4E86\uFF01");
    }
    if (this.dashCharges < MAX_DASH_CHARGES) {
      this.dashRecharge += dt;
      if (this.dashRecharge >= DASH_RECHARGE) {
        this.dashRecharge = 0;
        this.dashCharges = Math.min(MAX_DASH_CHARGES, this.dashCharges + 1);
      }
    } else {
      this.dashRecharge = 0;
    }
    for (const [k, v] of this.gadgetCd) {
      if (v > 0) this.gadgetCd.set(k, Math.max(0, v - dt));
    }
    if (this.skillCd > 0) this.skillCd -= dt;
    if (this.timewarp > 0) this.timewarp -= dt;
    if (this.hitSndCd > 0) this.hitSndCd -= dt;
    if (this.beamSndCd > 0) this.beamSndCd -= dt;
    if (this.flameSndCd > 0) this.flameSndCd -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 60);
    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
    const targetCamX = this.player.x - this.W / 2;
    const targetCamY = this.player.y - this.H / 2;
    this.camX += (targetCamX - this.camX) * Math.min(1, dt * 8);
    this.camY += (targetCamY - this.camY) * Math.min(1, dt * 8);
    this.camX = Math.max(0, Math.min(this.worldW - this.W, this.camX));
    this.camY = Math.max(0, Math.min(this.worldH - this.H, this.camY));
  }
  get gun() {
    return this.guns[this.gunIndex];
  }
  updateWeaponStates(dt) {
    for (const [id, s] of this.weaponStates) {
      const g = GUNS.find((x) => x.id === id);
      if (!g) continue;
      if (g.magazine && s.reload > 0) {
        s.reload -= dt;
        if (s.reload <= 0) {
          s.reload = 0;
          s.ammo = g.magazine;
        }
      }
      if ((g.weaponClass === "beam" || g.weaponClass === "flamethrower" || g.weaponClass === "poison_mist") && s.heat > 0) {
        const cool = s.overheated ? (g.coolRate ?? 0.5) * 0.85 : g.coolRate ?? 0.5;
        s.heat = Math.max(0, s.heat - cool * dt);
        if (s.overheated && s.heat < 0.3) s.overheated = false;
      }
    }
  }
  updatePlayer(dt) {
    const p = this.player;
    const g = this.gun;
    p.t += dt;
    if (p.deadTimer && p.deadTimer > 0) {
      p.vx = 0;
      p.vy = 0;
      return;
    }
    if (p.iframes > 0) p.iframes -= dt;
    if (p.flash > 0) p.flash -= dt * 3;
    if (p.shieldTime > 0) p.shieldTime -= dt;
    if (p.overdriveTime > 0) p.overdriveTime -= dt;
    if (p.slamCd > 0) p.slamCd -= dt;
    if (p.swingTimer > 0) p.swingTimer -= dt;
    if (p.slowT && p.slowT > 0) p.slowT -= dt;
    if (p.comboTimer > 0) {
      p.comboTimer -= dt;
      if (p.comboTimer <= 0) p.comboStep = 0;
    }
    if (p.lunge > 0) p.lunge = Math.max(0, p.lunge - dt * 120);
    if (p.electrifiedTime && p.electrifiedTime > 0) p.electrifiedTime -= dt;
    let dx = 0;
    let dy = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) dy -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) dy += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) dx -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) dx += 1;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    dx += this.virtualMove.x;
    dy += this.virtualMove.y;
    const vlen = Math.hypot(dx, dy) || 1;
    dx /= vlen;
    dy /= vlen;
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.x += p.dashVx * dt;
      p.y += p.dashVy * dt;
      this.spawnParticles(p.x, p.y, this.character.bodyColor, 2, 60);
    } else {
      const slow = (p.bowDrawing ? this.gun.drawSlowMult ?? 1 : 1) * (p.slowT && p.slowT > 0 ? 0.5 : 1);
      p.x += dx * p.speed * slow * RUNTIME.playerSpeedMult * dt;
      p.y += dy * p.speed * slow * RUNTIME.playerSpeedMult * dt;
    }
    const m = p.size;
    p.x = Math.max(m, Math.min(this.worldW - m, p.x));
    p.y = Math.max(m, Math.min(this.worldH - m, p.y));
    this.collideWalls(p, p.size);
    this.collideBase(p, p.size);
    this.collideBase(p, p.size, this.enemyBase);
    p.angle = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);
    if (this.touchMode) {
      const tgt = this.findAimTarget(p);
      if (tgt) p.angle = Math.atan2(tgt.y - p.y, tgt.x - p.x);
    }
    p.fireTimer -= dt;
    const ws = this.weaponStates.get(g.id);
    const fr = g.fireRate * this.character.fireRateMult * (1 + (this.outfit.fireRateBonus ?? 0)) * (p.overdriveTime > 0 ? 1.7 : 1);
    let spun = true;
    if (g.spinup) {
      if (this.firing)
        ws.spin = Math.min(1, (ws.spin ?? 0) + dt / g.spinup);
      else ws.spin = Math.max(0, (ws.spin ?? 0) - dt / (g.spinDown ?? 0.8));
      spun = (ws.spin ?? 0) > 0.12;
    }
    if (g.weaponClass === "beam") {
      this.updateBeam(dt, this.firing && !this.paused, ws);
    } else if (g.weaponClass === "flamethrower") {
      this.updateFlamethrower(dt, this.firing && !this.paused, ws);
    } else if (g.weaponClass === "poison_mist") {
      this.updatePoisonMist(dt, this.firing && !this.paused, ws);
    } else {
      const blocked = g.magazine !== void 0 && (ws.reload > 0 || ws.ammo <= 0) || false;
      if (g.weaponClass === "bow") {
        this.updateBow(dt, this.firing, ws);
      } else if (g.weaponClass === "shield") {
        this.updateShield(dt);
        if (this.firing && p.fireTimer <= 0 && p.shieldBlockTime <= 0) {
          this.meleeLight();
          p.fireTimer = 1 / fr;
        }
      } else if (this.firing && p.fireTimer <= 0 && !blocked && (!g.semiAuto || !this.semiAutoLatch) && spun) {
        if (g.weaponClass === "ranged") this.fireGun(ws);
        else this.meleeLight();
        const effFr = g.spinup ? fr * (ws.spin ?? 0) : fr;
        p.fireTimer = 1 / Math.max(1e-4, effFr);
        if (g.semiAuto) this.semiAutoLatch = true;
      }
      if (g.magazine !== void 0 && ws.ammo <= 0 && ws.reload <= 0) {
        ws.reload = g.reloadTime ?? 1.5;
      }
    }
    if (p.hp > 0 && p.hp < p.maxHp && this.time - p.lastHitTime > RUNTIME.breathingDelay) {
      p.hp = Math.min(p.maxHp, p.hp + RUNTIME.breathingRate * dt);
    }
  }
  fireGun(ws) {
    const p = this.player;
    const g = this.gun;
    const spinMult = g.spinup ? (g.spinMinMult ?? 0.2) + (1 - (g.spinMinMult ?? 0.2)) * (ws.spin ?? 0) : 1;
    const dmg = g.damage * this.character.damageMult * spinMult;
    const base = p.angle;
    const perp = base + Math.PI / 2;
    const useParallel = (g.parallel ?? 1) > 1;
    const gap = g.parallelGap ?? 8;
    const drift = g.drift ?? 0;
    for (let i = 0; i < g.pellets; i++) {
      let a;
      let bx;
      let by;
      let driftX = 0;
      let driftY = 0;
      if (useParallel) {
        const off = i - (g.pellets - 1) / 2;
        const lateral = off * gap;
        bx = p.x + Math.cos(base) * (p.size + g.barrel) + Math.cos(perp) * lateral;
        by = p.y + Math.sin(base) * (p.size + g.barrel) + Math.sin(perp) * lateral;
        a = base;
        const sign = off === 0 ? i % 2 ? 1 : -1 : Math.sign(off);
        driftX = Math.cos(perp) * drift * sign;
        driftY = Math.sin(perp) * drift * sign;
      } else if (g.pellets > 1) {
        const off = (i / (g.pellets - 1) - 0.5) * 2 * g.spread;
        a = base + off + (Math.random() - 0.5) * g.spread * 0.35;
        bx = p.x + Math.cos(a) * (p.size + g.barrel);
        by = p.y + Math.sin(a) * (p.size + g.barrel);
      } else {
        a = base + (Math.random() - 0.5) * g.spread;
        bx = p.x + Math.cos(a) * (p.size + g.barrel);
        by = p.y + Math.sin(a) * (p.size + g.barrel);
      }
      const sp = g.bulletSpeed * (0.92 + Math.random() * 0.12);
      this.bullets.push({
        x: bx,
        y: by,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        driftX,
        driftY,
        life: g.life,
        damage: dmg,
        size: g.bulletSize,
        color: g.color,
        glow: g.glow,
        pierce: g.pierce,
        knockback: g.knockback,
        explosive: !!g.explosive,
        explosionRadius: g.explosionRadius ?? 0,
        kind: g.kind,
        hit: /* @__PURE__ */ new Set(),
        owner: this.player === this.foe ? "foe" : "self",
        trail: g.kind === "tracer",
        bounces: g.bounces,
        ignoreWalls: g.ignoreWalls
      });
    }
    if (g.magazine !== void 0) ws.ammo -= 1;
    sound.shoot(g.id);
    this.spawnParticles(
      p.x + Math.cos(base) * (p.size + g.barrel),
      p.y + Math.sin(base) * (p.size + g.barrel),
      g.glow,
      g.pellets > 1 ? 6 : 3,
      140,
      0.25
    );
    if (g.id === "rocket" || g.id === "sniper" || g.id === "fcar" || g.id === "sa1216" || g.id === "mgl32") {
      p.x -= Math.cos(base) * 3;
      p.y -= Math.sin(base) * 3;
      this.shake = Math.min(14, this.shake + (g.id === "rocket" || g.id === "mgl32" ? 7 : 4));
    }
  }
  // ------------------------------------------------------------- melee
  /** The human opponent of whoever is currently `this.player` (the melee attacker). */
  meleeOpponent() {
    if (!this.foe || !this.localPlayer) return null;
    if (this.player === this.foe) return this.localPlayer;
    return this.foe;
  }
  meleeLight() {
    const g = this.gun;
    const p = this.player;
    const range = g.meleeRange ?? 60;
    const arc = g.meleeArc ?? 2;
    const dmg = g.damage * this.character.damageMult;
    const isSpear = g.id === "spear";
    const isSaber = g.id === "lightsaber";
    const isWhip = !!g.whip;
    const slowOnHit = g.slowOnHit ?? 0;
    sound.swing();
    p.swingTimer = p.swingDur;
    let swingAngle = p.angle;
    if (isWhip) {
      this.whipToggle = !this.whipToggle;
      swingAngle = p.angle + (this.whipToggle ? 0.55 : -0.55);
    }
    if (isSpear) {
      p.comboStep = (p.comboStep + 1) % (g.comboLength ?? 3);
      p.comboTimer = 1.2;
      const lungeDist = 46 + p.comboStep * 18;
      p.x += Math.cos(p.angle) * lungeDist;
      p.y += Math.sin(p.angle) * lungeDist;
      p.x = Math.max(p.size, Math.min(this.W - p.size, p.x));
      p.y = Math.max(p.size, Math.min(this.H - p.size, p.y));
      p.lunge = 14;
      p.iframes = Math.max(p.iframes, 0.12);
    }
    const dmgMult = isSpear ? 1 + p.comboStep * 0.35 : 1;
    this.effects.push({
      type: isWhip ? "whip" : isSaber ? "saberswing" : "slash",
      x: p.x,
      y: p.y,
      angle: swingAngle,
      arc: isWhip ? this.whipToggle ? 0.6 : -0.6 : arc,
      range,
      t: 0,
      duration: isWhip ? 0.18 : isSaber ? 0.32 : 0.22,
      radius: range,
      color: g.glow
    });
    for (const e of this.enemies) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d <= range + e.size) {
        const ang = Math.atan2(dy, dx);
        if (Math.abs(this.angleDiff(ang, swingAngle)) <= arc / 2) {
          this.damageEnemy(e, dmg * dmgMult, Math.cos(ang) * g.knockback, Math.sin(ang) * g.knockback);
          if (isSaber) {
            e.electrifiedTime = 0.7;
            e.electrifiedGlow = g.glow;
          }
          if (isWhip && slowOnHit > 0) {
            e.slowT = Math.max(e.slowT, slowOnHit);
          }
        }
      }
    }
    const opp = this.meleeOpponent();
    if (opp && !(opp.deadTimer && opp.deadTimer > 0)) {
      const dx = opp.x - p.x;
      const dy = opp.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d <= range + opp.size) {
        const ang = Math.atan2(dy, dx);
        if (Math.abs(this.angleDiff(ang, swingAngle)) <= arc / 2) {
          const kx = Math.cos(ang) * g.knockback;
          const ky = Math.sin(ang) * g.knockback;
          this.damagePlayerEntity(opp, dmg * dmgMult, void 0, kx, ky);
          if (isSaber) {
            opp.electrifiedTime = 0.7;
            opp.electrifiedGlow = g.glow;
          }
          if (isWhip && slowOnHit > 0) {
            opp.slowT = Math.max(opp.slowT ?? 0, slowOnHit);
          }
        }
      }
    }
    for (const w of this.walls) {
      if (!w.destructible) continue;
      const cx = Math.max(w.x, Math.min(p.x, w.x + w.w));
      const cy = Math.max(w.y, Math.min(p.y, w.y + w.h));
      const d = Math.hypot(cx - p.x, cy - p.y);
      if (d <= range) {
        const ang = Math.atan2(cy - p.y, cx - p.x);
        if (Math.abs(this.angleDiff(ang, p.angle)) <= arc / 2) {
          this.damageWall(w, g.id === "hammer" ? 40 : 16);
        }
      }
    }
  }
  meleeSlam() {
    const g = this.gun;
    const p = this.player;
    const radius = g.explosionRadius ?? 90;
    const dmg = (g.slamDamage ?? 110) * this.character.damageMult;
    p.slamCd = 1.4;
    this.effects.push({
      type: "slam",
      x: p.x,
      y: p.y,
      t: 0,
      duration: 0.45,
      radius,
      color: g.glow
    });
    this.shake = 17;
    sound.slam();
    this.spawnParticles(p.x, p.y, g.glow, 28, 280, 0.5);
    this.spawnParticles(p.x, p.y, "#fde68a", 16, 200, 0.4);
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d <= radius + e.size) {
        const fall = 1 - d / (radius + e.size);
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        this.damageEnemy(e, dmg * (0.55 + fall * 0.5), Math.cos(a) * 420, Math.sin(a) * 420);
      }
    }
    const opp = this.meleeOpponent();
    if (opp && !(opp.deadTimer && opp.deadTimer > 0)) {
      const d = Math.hypot(opp.x - p.x, opp.y - p.y);
      if (d <= radius + opp.size) {
        const fall = 1 - d / (radius + opp.size);
        const a = Math.atan2(opp.y - p.y, opp.x - p.x);
        this.damagePlayerEntity(opp, dmg * (0.55 + fall * 0.5), void 0, Math.cos(a) * 420, Math.sin(a) * 420);
      }
    }
    for (let i = this.walls.length - 1; i >= 0; i--) {
      const w = this.walls[i];
      if (w.destructible && this.rectCircleOverlap(w, p.x, p.y, radius)) {
        this.breakWall(w, i);
      }
    }
  }
  // ------------------------------------------------------------- beam
  updateBeam(dt, firing, ws) {
    const g = this.gun;
    if (firing && !ws.overheated) {
      ws.heat = Math.min(1.4, ws.heat + (g.heatPerShot ?? 0.6) * dt);
      if (ws.heat >= 1) ws.overheated = true;
      this.beamActive = true;
      const hit = this.castBeam();
      this.beamHit = hit;
      if (hit.enemy) {
        this.damageEnemy(
          hit.enemy,
          g.damage * this.character.damageMult * dt,
          0,
          0
        );
        if (Math.random() < 0.7)
          this.spawnParticles(hit.point.x, hit.point.y, g.glow, 2, 120, 0.22);
      } else if (hit.wall && hit.wall.destructible) {
        this.damageWall(hit.wall, g.damage * 0.5 * dt);
        if (Math.random() < 0.5)
          this.spawnParticles(hit.point.x, hit.point.y, g.glow, 1, 90, 0.2);
      }
      if (this.beamSndCd <= 0) {
        sound.shoot("pulse");
        this.beamSndCd = 0.07;
      }
    } else {
      this.beamActive = false;
      this.beamHit = null;
    }
  }
  castBeam() {
    const p = this.player;
    const g = this.gun;
    const ox = p.x + Math.cos(p.angle) * (p.size + 6);
    const oy = p.y + Math.sin(p.angle) * (p.size + 6);
    const dx = Math.cos(p.angle);
    const dy = Math.sin(p.angle);
    const range = g.beamRange ?? 700;
    let best = range;
    let hitEnemy = null;
    let hitWall = null;
    for (const e of this.enemies) {
      const t = this.rayCircle(ox, oy, dx, dy, e.x, e.y, e.size);
      if (t >= 0 && t < best) {
        best = t;
        hitEnemy = e;
        hitWall = null;
      }
    }
    for (const w of this.walls) {
      const t = this.rayAabb(ox, oy, dx, dy, w);
      if (t >= 0 && t < best) {
        best = t;
        hitEnemy = null;
        hitWall = w;
      }
    }
    return {
      point: { x: ox + dx * best, y: oy + dy * best },
      enemy: hitEnemy,
      wall: hitWall
    };
  }
  // ------------------------------------------------------- flamethrower
  updateFlamethrower(dt, firing, ws) {
    const g = this.gun;
    if (firing && !ws.overheated) {
      ws.heat = Math.min(1.4, ws.heat + (g.heatPerShot ?? 0.35) * dt);
      if (ws.heat >= 1) ws.overheated = true;
      this.flameActive = true;
      const cone = g.flameCone ?? 0.4;
      const range = g.flameRange ?? 150;
      const dps = g.damage * this.character.damageMult;
      for (const e of this.enemies) {
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        const d = Math.hypot(dx, dy);
        if (d <= range + e.size) {
          const ang = Math.atan2(dy, dx);
          if (Math.abs(this.angleDiff(ang, this.player.angle)) <= cone) {
            const fall = 1 - d / (range + e.size);
            this.damageEnemy(e, dps * dt * (0.4 + fall * 0.6), 0, 0);
            e.burnT = Math.max(e.burnT, 1.2);
            e.burnDps = Math.max(e.burnDps, dps * 0.25);
          }
        }
      }
      const ox = this.player.x + Math.cos(this.player.angle) * (this.player.size + g.barrel);
      const oy = this.player.y + Math.sin(this.player.angle) * (this.player.size + g.barrel);
      for (let i = 0; i < 4; i++) {
        const a = this.player.angle + (Math.random() - 0.5) * cone * 2;
        const sp = range * (1.5 + Math.random() * 1.5);
        const cols = ["#fde68a", "#fb923c", "#f97316", "#ef4444"];
        this.particles.push({
          x: ox,
          y: oy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.3 + Math.random() * 0.2,
          maxLife: 0.5,
          color: cols[Math.floor(Math.random() * cols.length)],
          size: 4 + Math.random() * 5,
          shrink: true
        });
      }
      if (this.flameSndCd <= 0) {
        sound.shoot("rocket");
        this.flameSndCd = 0.12;
      }
      this.effects.push({
        type: "flamecone",
        x: this.player.x,
        y: this.player.y,
        angle: this.player.angle,
        arc: cone,
        range,
        t: 0,
        duration: 0.08,
        radius: range,
        color: g.glow
      });
    } else {
      this.flameActive = false;
    }
  }
  // --------------------------------------------------- poison mist sprayer
  updatePoisonMist(dt, firing, ws) {
    const g = this.gun;
    if (firing && !ws.overheated) {
      ws.heat = Math.min(1.4, ws.heat + (g.heatPerShot ?? 0.4) * dt);
      if (ws.heat >= 1) ws.overheated = true;
      const cone = g.flameCone ?? 0.34;
      const range = g.flameRange ?? 130;
      const dps = g.damage;
      const cx = this.player.x + Math.cos(this.player.angle) * range * 0.55;
      const cy = this.player.y + Math.sin(this.player.angle) * range * 0.55;
      this.effects.push({
        type: "poisoncloud",
        x: cx,
        y: cy,
        t: 0,
        duration: 0.5,
        radius: range * 0.7,
        color: g.glow,
        dps,
        slow: 0.5
      });
      for (const e of this.enemies) {
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        const d = Math.hypot(dx, dy);
        if (d <= range + e.size) {
          const ang = Math.atan2(dy, dx);
          if (Math.abs(this.angleDiff(ang, this.player.angle)) <= cone) {
            this.applyPoison(e, dps * dt * 0.5);
          }
        }
      }
      const ox = this.player.x + Math.cos(this.player.angle) * (this.player.size + g.barrel);
      const oy = this.player.y + Math.sin(this.player.angle) * (this.player.size + g.barrel);
      for (let i = 0; i < 4; i++) {
        const a = this.player.angle + (Math.random() - 0.5) * cone * 2;
        const sp = range * (0.8 + Math.random() * 1.2);
        this.particles.push({
          x: ox,
          y: oy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.35 + Math.random() * 0.25,
          maxLife: 0.6,
          color: ["#a3e635", "#bef264", "#84cc16", "#a3e635"][Math.floor(Math.random() * 4)],
          size: 4 + Math.random() * 5,
          shrink: true
        });
      }
      if (this.flameSndCd <= 0) {
        sound.shoot("rocket");
        this.flameSndCd = 0.14;
      }
    }
  }
  // ------------------------------------------------------------- bow (recurve)
  updateBow(dt, firing, _ws) {
    const p = this.player;
    const g = this.gun;
    const maxT = g.maxChargeTime ?? 1.2;
    if (firing) {
      p.bowDrawing = true;
      p.bowCharge = Math.min(maxT, p.bowCharge + dt);
    } else if (p.bowDrawing) {
      this.fireArrow();
      p.bowCharge = 0;
      p.bowDrawing = false;
    }
    void _ws;
  }
  fireArrow() {
    const p = this.player;
    const g = this.gun;
    const maxT = g.maxChargeTime ?? 1.2;
    const chargePct = Math.min(1, p.bowCharge / maxT);
    const minMult = g.minChargeMult ?? 0.6;
    const maxMult = g.maxChargeMult ?? 2;
    const dmgMult = minMult + (maxMult - minMult) * chargePct;
    const speedMult = 1 + chargePct * ((g.maxChargeSpeedMult ?? 2) - 1);
    const dmg = g.damage * dmgMult * this.character.damageMult;
    const sp = g.bulletSpeed * speedMult;
    const a = p.angle + (Math.random() - 0.5) * g.spread;
    const bx = p.x + Math.cos(a) * (p.size + g.barrel);
    const by = p.y + Math.sin(a) * (p.size + g.barrel);
    this.bullets.push({
      x: bx,
      y: by,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: g.life,
      damage: dmg,
      size: g.bulletSize * (1 + chargePct * 0.6),
      color: g.color,
      glow: g.glow,
      pierce: chargePct >= 0.9 ? 2 : 0,
      knockback: g.knockback * dmgMult,
      explosive: false,
      explosionRadius: 0,
      kind: g.kind,
      hit: /* @__PURE__ */ new Set(),
      trail: true
    });
    sound.shoot("sniper");
    this.spawnParticles(bx, by, g.glow, 4, 120, 0.25);
    if (chargePct >= 0.85) {
      this.shake = Math.min(10, this.shake + 4);
    }
  }
  // ------------------------------------------------------------- riot shield
  updateShield(dt) {
    const p = this.player;
    const g = this.gun;
    if (p.shieldBlockTime > 0) {
      p.shieldBlockTime -= dt;
    }
    if (p.shieldCd > 0) {
      p.shieldCd -= dt;
      if (p.shieldCd <= 0) {
        p.shieldHp = g.shieldMaxHp ?? 0;
      }
    }
    if (p.shieldBlockTime > 0 && p.shieldHp > 0) {
      const arc = g.shieldArc ?? 0.7;
      const blockR = p.size + 30;
      const next = [];
      for (const b of this.enemyBullets) {
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d <= blockR + b.size) {
          const ang = Math.atan2(dy, dx);
          if (Math.abs(this.angleDiff(ang, p.angle)) <= arc) {
            p.shieldHp -= b.damage;
            this.spawnParticles(b.x, b.y, "#60a5fa", 4, 100, 0.25);
            if (p.shieldHp <= 0) {
              p.shieldHp = 0;
              p.shieldBlockTime = 0;
              p.shieldCd = g.shieldRechargeTime ?? 8;
              this.shake = 10;
              sound.explosion();
            }
            continue;
          }
        }
        next.push(b);
      }
      this.enemyBullets = next;
    }
  }
  raiseShield() {
    const p = this.player;
    const g = this.gun;
    if (p.shieldHp <= 0 || p.shieldCd > 0) return;
    if (p.shieldBlockTime > 0) return;
    p.shieldBlockTime = g.shieldDuration ?? 3;
    sound.skill();
    this.spawnParticles(p.x, p.y, "#60a5fa", 8, 120, 0.3);
  }
  angleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }
  collideWalls(ent, size) {
    for (const w of this.walls) {
      if (w.glue) continue;
      const cx = Math.max(w.x, Math.min(ent.x, w.x + w.w));
      const cy = Math.max(w.y, Math.min(ent.y, w.y + w.h));
      let dx = ent.x - cx;
      let dy = ent.y - cy;
      let d = Math.hypot(dx, dy);
      if (d < size) {
        if (d < 1e-4) {
          const left = ent.x - w.x;
          const right = w.x + w.w - ent.x;
          const top = ent.y - w.y;
          const bottom = w.y + w.h - ent.y;
          const mn = Math.min(left, right, top, bottom);
          if (mn === left) ent.x = w.x - size;
          else if (mn === right) ent.x = w.x + w.w + size;
          else if (mn === top) ent.y = w.y - size;
          else ent.y = w.y + w.h + size;
        } else {
          const push = size - d;
          ent.x += dx / d * push;
          ent.y += dy / d * push;
        }
      }
    }
  }
  collideBase(ent, size, b = this.base) {
    const dx = ent.x - b.x;
    const dy = ent.y - b.y;
    const d = Math.hypot(dx, dy);
    const min = b.radius + size;
    if (d < min && d > 1e-4) {
      const push = min - d;
      ent.x += dx / d * push;
      ent.y += dy / d * push;
    }
  }
  pointInWall(x, y, size) {
    for (const w of this.walls) {
      if (w.glue || w.invisible) continue;
      if (x > w.x - size && x < w.x + w.w + size && y > w.y - size && y < w.y + w.h + size)
        return w;
    }
    return null;
  }
  rectCircleOverlap(w, cx, cy, cr) {
    const nx = Math.max(w.x, Math.min(cx, w.x + w.w));
    const ny = Math.max(w.y, Math.min(cy, w.y + w.h));
    return (cx - nx) ** 2 + (cy - ny) ** 2 <= cr * cr;
  }
  rayCircle(ox, oy, dx, dy, cx, cy, r) {
    const ex = ox - cx;
    const ey = oy - cy;
    const b = ex * dx + ey * dy;
    const c = ex * ex + ey * ey - r * r;
    const disc = b * b - c;
    if (disc < 0) return -1;
    const sq = Math.sqrt(disc);
    const t1 = -b - sq;
    if (t1 >= 0) return t1;
    const t2 = -b + sq;
    return t2 >= 0 ? t2 : -1;
  }
  rayAabb(ox, oy, dx, dy, w) {
    let tmin = 0;
    let tmax = Infinity;
    if (Math.abs(dx) < 1e-9) {
      if (ox < w.x || ox > w.x + w.w) return -1;
    } else {
      const t1 = (w.x - ox) / dx;
      const t2 = (w.x + w.w - ox) / dx;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
    }
    if (Math.abs(dy) < 1e-9) {
      if (oy < w.y || oy > w.y + w.h) return -1;
    } else {
      const t1 = (w.y - oy) / dy;
      const t2 = (w.y + w.h - oy) / dy;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
    }
    if (tmax >= tmin && tmax >= 0) return tmin >= 0 ? tmin : tmax;
    return -1;
  }
  // ------------------------------------------------------- bullets
  updateBullets(dt) {
    const next = [];
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.x += (b.driftX ?? 0) * dt;
      b.y += (b.driftY ?? 0) * dt;
      b.life -= dt;
      if (b.trail && Math.random() < 0.7) {
        this.particles.push({
          x: b.x,
          y: b.y,
          vx: 0,
          vy: 0,
          life: 0.18,
          maxLife: 0.18,
          color: b.glow,
          size: b.size * 0.9,
          shrink: true
        });
      }
      let dead = b.life <= 0;
      if (b.x < -40 || b.x > this.worldW + 40 || b.y < -40 || b.y > this.worldH + 40)
        dead = true;
      if (!dead && !b.ignoreWalls) {
        const w = this.pointInWall(b.x, b.y, b.size);
        if (w) {
          if (b.bounces !== void 0 && b.bounces > 0) {
            const nx = b.x - (w.x + w.w / 2);
            const ny = b.y - (w.y + w.h / 2);
            const nlen = Math.hypot(nx, ny) || 1;
            const nnx = nx / nlen;
            const nny = ny / nlen;
            const dot = b.vx * nnx + b.vy * nny;
            b.vx -= 2 * dot * nnx;
            b.vy -= 2 * dot * nny;
            b.bounces -= 1;
            b.bounced = true;
            this.spawnParticles(b.x, b.y, b.glow, 4, 100, 0.2);
          } else if (b.explosive && b.bounced) {
            this.explode(b.x, b.y, b.explosionRadius, b.damage, b.glow);
            dead = true;
          } else {
            if (b.explosive) this.explode(b.x, b.y, b.explosionRadius, b.damage, b.glow);
            else this.spawnParticles(b.x, b.y, b.glow, 4, 120, 0.22);
            dead = true;
          }
        }
      }
      if (!dead && b.ignoreWalls && b.bounces !== void 0) {
        let bounced = false;
        if (b.x < b.size) {
          b.vx = Math.abs(b.vx);
          bounced = true;
        } else if (b.x > this.worldW - b.size) {
          b.vx = -Math.abs(b.vx);
          bounced = true;
        }
        if (b.y < b.size) {
          b.vy = Math.abs(b.vy);
          bounced = true;
        } else if (b.y > this.worldH - b.size) {
          b.vy = -Math.abs(b.vy);
          bounced = true;
        }
        if (bounced) {
          b.bounces -= 1;
          if (b.bounces < 0) {
            this.spawnParticles(b.x, b.y, b.glow, 10, 160, 0.3);
            dead = true;
          } else {
            this.spawnParticles(b.x, b.y, b.glow, 4, 90, 0.2);
          }
        }
      }
      if (!dead && b.owner !== "foe") {
        for (const e of this.enemies) {
          if (b.hit.has(e.id)) continue;
          const rr = e.size + b.size + 2;
          const ddx = e.x - b.x;
          const ddy = e.y - b.y;
          if (ddx * ddx + ddy * ddy <= rr * rr) {
            b.hit.add(e.id);
            if (b.explosive) {
              this.explode(b.x, b.y, b.explosionRadius, b.damage, b.glow);
              dead = true;
              break;
            }
            this.damageEnemy(
              e,
              b.damage,
              Math.cos(Math.atan2(b.vy, b.vx)) * b.knockback,
              Math.sin(Math.atan2(b.vy, b.vx)) * b.knockback
            );
            if (b.pierce <= 0) {
              dead = true;
              break;
            }
            b.pierce -= 1;
          }
        }
      }
      if (!dead) {
        if (b.owner === "foe") {
          if (!(this.player.deadTimer && this.player.deadTimer > 0) && this.hitsPlayer(b, this.player)) {
            this.damagePlayerEntity(this.player, b.damage, b);
            if (b.explosive) this.explode(b.x, b.y, b.explosionRadius, b.damage * 0.5, b.glow);
            dead = true;
          } else {
            const bb = this.base;
            const rr = bb.radius + b.size;
            if ((bb.x - b.x) ** 2 + (bb.y - b.y) ** 2 <= rr * rr) {
              this.damageBase(b.damage);
              if (b.explosive) this.explode(b.x, b.y, b.explosionRadius, b.damage * 0.5, b.glow);
              dead = true;
            }
          }
        } else {
          const eb = this.enemyBase;
          const rr = eb.radius + b.size;
          if ((eb.x - b.x) ** 2 + (eb.y - b.y) ** 2 <= rr * rr) {
            this.damageEnemyBase(b.damage);
            if (b.explosive) this.explode(b.x, b.y, b.explosionRadius, b.damage * 0.5, b.glow);
            dead = true;
          } else if (this.foe && !(this.foe.deadTimer && this.foe.deadTimer > 0) && this.hitsPlayer(b, this.foe)) {
            this.damagePlayerEntity(this.foe, b.damage, b);
            if (b.explosive) this.explode(b.x, b.y, b.explosionRadius, b.damage * 0.5, b.glow);
            dead = true;
          }
        }
      }
      if (dead && b.explosive && b.life <= 0 && b.hit.size === 0 && !b.bounced) {
        this.explode(b.x, b.y, b.explosionRadius, b.damage, b.glow);
      }
      if (!dead) next.push(b);
    }
    this.bullets = next;
  }
  updateGrenades(dt) {
    const next = [];
    for (const gr of this.grenades) {
      gr.life -= dt;
      gr.x += gr.vx * dt;
      gr.y += gr.vy * dt;
      gr.vx *= 0.96;
      gr.vy *= 0.96;
      if (Math.random() < 0.5)
        this.spawnParticles(gr.x, gr.y, "#fbbf24", 1, 30, 0.3);
      if (gr.life <= 0) {
        if (gr.kind === "glue") {
          this.spawnGlueWall(gr.x, gr.y);
        } else if (gr.kind === "fire") {
          this.effects.push({
            type: "firefield",
            x: gr.x,
            y: gr.y,
            t: 0,
            duration: 5,
            radius: 92,
            color: "#fb923c",
            dps: 90,
            tickT: 0
          });
          this.spawnParticles(gr.x, gr.y, "#fb923c", 20, 200, 0.5);
        } else {
          this.explode(gr.x, gr.y, 120, 180, "#fb923c");
        }
      } else next.push(gr);
    }
    this.grenades = next;
  }
  // ------------------------------------------------------- deployables
  /** Max distance from the player a gadget may be placed / thrown. */
  gadgetRange(def) {
    if (def.range) return def.range;
    const k = def.kind;
    if (k === "glue_grenade" || k === "fire_grenade") return GADGET_THROW_DIST;
    return GADGET_DEPLOY_DIST;
  }
  /**
   * Compute a lobbed-grenade velocity so it lands roughly on (tx,ty) under the
   * same per-frame drag the live grenades use (see updateGrenades). Returns the
   * initial velocity, fuse and the predicted landing point.
   */
  simulateThrow(px, py, tx, ty) {
    const dx = tx - px;
    const dy = ty - py;
    const dist = Math.hypot(dx, dy);
    const dirx = dist > 0 ? dx / dist : 1;
    const diry = dist > 0 ? dy / dist : 0;
    const D = Math.min(dist, GADGET_THROW_DIST);
    const fuse = Math.max(0.35, Math.min(0.9, D / 520));
    const r = 0.96;
    const n = Math.max(1, Math.round(fuse * 60));
    const dt = 1 / 60;
    const S = D * (1 - r) / (dt * (1 - Math.pow(r, n)));
    return {
      vx: dirx * S,
      vy: diry * S,
      fuse,
      landX: px + dirx * D,
      landY: py + diry * D
    };
  }
  doDeploy(def, tx, ty) {
    const p = this.player;
    const maxD = this.gadgetRange(def);
    let px, py;
    if (tx !== void 0 && ty !== void 0) {
      let dx = tx - p.x;
      let dy = ty - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > maxD) {
        tx = p.x + dx / d * maxD;
        ty = p.y + dy / d * maxD;
      }
      px = Math.max(40, Math.min(this.worldW - 40, tx));
      py = Math.max(40, Math.min(this.worldH - 40, ty));
    } else {
      const ang = p.angle;
      px = Math.max(40, Math.min(this.worldW - 40, p.x + Math.cos(ang) * 50));
      py = Math.max(40, Math.min(this.worldH - 40, p.y + Math.sin(ang) * 50));
    }
    const base = {
      kind: def.kind,
      x: px,
      y: py,
      angle: 0,
      hp: 100,
      maxHp: 100,
      timer: 0,
      life: 30,
      armed: 0.6,
      radius: 0,
      color: def.color,
      size: 16,
      targets: []
    };
    switch (def.kind) {
      case "turret_mg":
        this.deployables.push({
          ...base,
          hp: def.hp ?? 160,
          maxHp: def.hp ?? 160,
          life: Infinity,
          radius: 260,
          timer: 0.15
        });
        break;
      case "turret_cannon":
        this.deployables.push({
          ...base,
          hp: def.hp ?? 200,
          maxHp: def.hp ?? 200,
          life: Infinity,
          radius: 200,
          timer: 1.2,
          size: 18
        });
        break;
      case "mine_explosive":
        this.deployables.push({ ...base, life: 60, radius: 56, armed: 0.8 });
        break;
      case "mine_poison":
        this.deployables.push({ ...base, life: 60, radius: 70, armed: 0.8 });
        break;
      case "mine_fire":
        this.deployables.push({ ...base, life: 60, radius: 70, armed: 0.8 });
        break;
      case "glue_grenade": {
        const sim = this.simulateThrow(p.x, p.y, px, py);
        this.grenades.push({
          x: p.x,
          y: p.y,
          vx: sim.vx,
          vy: sim.vy,
          life: sim.fuse,
          fuse: sim.fuse,
          kind: "glue"
        });
        break;
      }
      case "fire_grenade": {
        const sim = this.simulateThrow(p.x, p.y, px, py);
        this.grenades.push({
          x: p.x,
          y: p.y,
          vx: sim.vx,
          vy: sim.vy,
          life: sim.fuse,
          fuse: sim.fuse,
          kind: "fire"
        });
        break;
      }
      case "healing_station":
        this.deployables.push({ ...base, hp: def.hp ?? 80, maxHp: def.hp ?? 80, life: 20, radius: 90, size: 14 });
        break;
    }
    this.spawnParticles(px, py, def.color, 12, 120, 0.4);
    this.effects.push({
      type: "spawn",
      x: px,
      y: py,
      t: 0,
      duration: 0.4,
      radius: 32,
      color: def.color
    });
  }
  spawnGlueWall(x, y) {
    const w = 80;
    const h = 22;
    this.walls.push({
      x: x - w / 2,
      y: y - h / 2,
      w,
      h,
      hp: 200,
      maxHp: 200,
      destructible: true,
      glue: true,
      slow: 0.45
    });
    this.effects.push({
      type: "glue",
      x,
      y,
      t: 0,
      duration: 0.5,
      radius: 40,
      color: "#22d3ee"
    });
    this.spawnParticles(x, y, "#22d3ee", 16, 140, 0.5);
  }
  updateDeployables(dt) {
    const next = [];
    for (const d of this.deployables) {
      d.life -= dt;
      d.armed -= dt;
      if (d.kind === "turret_mg" || d.kind === "turret_cannon") {
        d.timer -= dt;
        let target = null;
        let bestD = d.radius;
        for (const e of this.enemies) {
          const dist = Math.hypot(e.x - d.x, e.y - d.y);
          if (dist < bestD) {
            bestD = dist;
            target = e;
          }
        }
        if (target) {
          d.angle = Math.atan2(target.y - d.y, target.x - d.x);
          if (d.timer <= 0) {
            if (d.kind === "turret_mg") {
              d.timer = 0.12;
              const sp = 900;
              this.bullets.push({
                x: d.x + Math.cos(d.angle) * 14,
                y: d.y + Math.sin(d.angle) * 14,
                vx: Math.cos(d.angle) * sp,
                vy: Math.sin(d.angle) * sp,
                life: 0.6,
                damage: 28,
                size: 4,
                color: "#bae6fd",
                glow: d.color,
                pierce: 0,
                knockback: 40,
                explosive: false,
                explosionRadius: 0,
                kind: "bullet",
                hit: /* @__PURE__ */ new Set()
              });
              this.spawnParticles(d.x + Math.cos(d.angle) * 14, d.y + Math.sin(d.angle) * 14, d.color, 2, 80, 0.15);
            } else {
              d.timer = 1.1;
              const sp = 360;
              this.bullets.push({
                x: d.x,
                y: d.y,
                vx: Math.cos(d.angle) * sp,
                vy: Math.sin(d.angle) * sp,
                life: 1.2,
                damage: 44,
                size: 7,
                color: "#ddd6fe",
                glow: d.color,
                pierce: 0,
                knockback: 120,
                explosive: true,
                explosionRadius: 56,
                kind: "grenade",
                hit: /* @__PURE__ */ new Set()
              });
            }
          }
        }
        for (const e of this.enemies) {
          if (Math.hypot(e.x - d.x, e.y - d.y) < e.size + d.size) {
            d.hp -= 75 * dt;
          }
        }
        if (d.hp > 0 && d.life > 0) next.push(d);
        else {
          this.explode(d.x, d.y, 40, 0, d.color);
        }
        continue;
      }
      if (d.kind === "mine_explosive" || d.kind === "mine_poison" || d.kind === "mine_fire") {
        if (d.armed <= 0) {
          for (const e of this.enemies) {
            if (Math.hypot(e.x - d.x, e.y - d.y) < e.size + 24) {
              if (d.kind === "mine_explosive") {
                this.explode(d.x, d.y, d.radius, 160, d.color);
              } else if (d.kind === "mine_poison") {
                this.effects.push({
                  type: "poisoncloud",
                  x: d.x,
                  y: d.y,
                  t: 0,
                  duration: 5,
                  radius: d.radius,
                  color: d.color,
                  dps: 60,
                  slow: 0.5,
                  tickT: 0
                });
              } else {
                this.effects.push({
                  type: "firefield",
                  x: d.x,
                  y: d.y,
                  t: 0,
                  duration: 5,
                  radius: d.radius,
                  color: d.color,
                  dps: 90,
                  tickT: 0
                });
              }
              d.life = 0;
              break;
            }
          }
        }
        if (d.life > 0) next.push(d);
        continue;
      }
      if (d.kind === "healing_station") {
        const dist = Math.hypot(this.player.x - d.x, this.player.y - d.y);
        if (dist < d.radius + this.player.size && this.player.hp < this.player.maxHp) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 45 * dt);
          if (Math.random() < 0.3)
            this.spawnParticles(this.player.x, this.player.y, "#4ade80", 1, 50, 0.3);
        }
        if (d.life > 0 && d.hp > 0) next.push(d);
        continue;
      }
      if (d.life > 0 && d.hp > 0) next.push(d);
    }
    this.deployables = next;
  }
  updateEnemyBullets(dt) {
    const p = this.player;
    const next = [];
    for (const b of this.enemyBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) continue;
      if (b.x < -20 || b.x > this.worldW + 20 || b.y < -20 || b.y > this.worldH + 20)
        continue;
      if (this.pointInWall(b.x, b.y, b.size)) {
        this.spawnParticles(b.x, b.y, b.color, 3, 90, 0.2);
        continue;
      }
      const rr = p.size + b.size;
      if ((p.x - b.x) ** 2 + (p.y - b.y) ** 2 <= rr * rr) {
        if (b.poison) this.spawnParticles(b.x, b.y, "#a3e635", 6, 120, 0.4);
        this.damagePlayer(b.damage);
        continue;
      }
      if (this.foe) {
        const fr = this.foe.size + b.size;
        if ((this.foe.x - b.x) ** 2 + (this.foe.y - b.y) ** 2 <= fr * fr) {
          this.damagePlayerEntity(this.foe, b.damage);
          continue;
        }
      }
      const brr = this.base.radius + b.size;
      if ((this.base.x - b.x) ** 2 + (this.base.y - b.y) ** 2 <= brr * brr) {
        this.damageBase(b.damage);
        continue;
      }
      if (this.foe) {
        const fbr = this.enemyBase.radius + b.size;
        if ((this.enemyBase.x - b.x) ** 2 + (this.enemyBase.y - b.y) ** 2 <= fbr * fbr) {
          this.damageEnemyBase(b.damage);
          continue;
        }
      }
      next.push(b);
    }
    this.enemyBullets = next;
  }
  updateEnemies(dt) {
    const ts = this.timewarp > 0 ? 0.32 : 1;
    const p = this.player;
    const next = [];
    for (const e of this.enemies) {
      e.spawnT = Math.min(1, e.spawnT + dt * 4);
      if (e.hitFlash > 0) e.hitFlash -= dt * 4;
      if (e.slowT > 0) e.slowT -= dt;
      if (e.electrifiedTime && e.electrifiedTime > 0) e.electrifiedTime -= dt;
      if (e.burnT > 0) {
        e.burnT -= dt;
        this.damageEnemy(e, e.burnDps * dt, 0, 0, true);
        if (Math.random() < 0.3)
          this.spawnParticles(e.x, e.y, "#fb923c", 1, 50, 0.2);
      }
      if (e.poisonT && e.poisonT > 0) {
        e.poisonT -= dt;
        this.damageEnemy(e, (e.poisonDps ?? 0) * dt, 0, 0, true);
        e.poisonDps = Math.max(0, (e.poisonDps ?? 0) - 22 * dt);
        if (Math.random() < 0.25)
          this.spawnParticles(e.x, e.y, "#a3e635", 1, 50, 0.2);
      }
      const slowMult = e.slowT > 0 ? 0.5 : 1;
      const buffMult = e.buffT && e.buffT > 0 ? 1.8 : 1;
      if (e.buffT && e.buffT > 0) e.buffT -= dt;
      const bio = this.gameMode === "biohazard";
      let tbx;
      let tby;
      let tbaseR;
      if (bio) {
        tbx = p.x;
        tby = p.y;
        tbaseR = p.size;
      } else {
        const b = this.mode !== "local" ? this.nearestBase(e.x, e.y) : this.base;
        tbx = b.x;
        tby = b.y;
        tbaseR = b.radius;
      }
      const dbx = tbx - e.x;
      const dby = tby - e.y;
      const dbase = Math.hypot(dbx, dby) || 1;
      const dpx = p.x - e.x;
      const dpy = p.y - e.y;
      const dpl = Math.hypot(dpx, dpy) || 1;
      const beh = e.behavior ?? "soldier";
      if (e.ranged) {
        const tx = tbx;
        const ty = tby;
        e.angle = Math.atan2(ty - e.y, tx - e.x);
        const preferred = 250;
        let mvx = 0;
        let mvy = 0;
        if (dbase > preferred + 30) {
          mvx = dbx / dbase;
          mvy = dby / dbase;
        } else if (dbase < preferred - 40) {
          mvx = -dbx / dbase;
          mvy = -dby / dbase;
        } else {
          mvx = -dby / dbase;
          mvy = dbx / dbase;
        }
        e.x += mvx * e.speed * buffMult * dt * ts * slowMult;
        e.y += mvy * e.speed * buffMult * dt * ts * slowMult;
        e.shootTimer -= dt * ts;
        if (e.shootTimer <= 0 && dpl < (e.rangedRange ?? 380) && e.spawnT >= 1) {
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          e.shootTimer = 1.6 + Math.random() * 0.6;
          const dmg = e.rangedDamage ?? 14;
          this.enemyBullets.push({
            x: e.x + Math.cos(a) * e.size,
            y: e.y + Math.sin(a) * e.size,
            vx: Math.cos(a) * 300,
            vy: Math.sin(a) * 300,
            life: 2.4,
            damage: Math.round(dmg),
            size: 6,
            color: e.glow,
            poison: true
          });
        }
      } else {
        e.angle = Math.atan2(dby, dbx);
        let sp = e.speed * buffMult * ts * slowMult;
        if (beh === "runner" && (e.chargeT ?? 0) <= 0 && dpl < 320 && e.spawnT >= 1) {
          e.chargeT = 0.45;
        }
        if (beh === "runner" && (e.chargeT ?? 0) > 0) {
          e.chargeT = (e.chargeT ?? 0) - dt;
          sp *= 2.4;
        }
        e.x += dbx / dbase * sp * dt;
        e.y += dby / dbase * sp * dt;
      }
      if (beh === "screamer") {
        e.screamT = (e.screamT ?? 3) - dt;
        if (e.screamT <= 0 && e.spawnT >= 1) {
          e.screamT = 5 + Math.random() * 2;
          const br = e.buffRadius ?? 260;
          this.effects.push({ type: "shock", x: e.x, y: e.y, t: 0, duration: 0.5, radius: br, color: "#f0abfc" });
          for (const o of this.enemies) {
            if (Math.hypot(o.x - e.x, o.y - e.y) < br) o.buffT = 3;
          }
          if (dpl < br) {
            this.player.flash = Math.max(this.player.flash, 0.5);
            this.shake = Math.min(10, this.shake + 4);
          }
        }
      }
      if (beh === "spore") {
        e.cloudT = (e.cloudT ?? 1.5) - dt;
        if (e.cloudT <= 0 && e.spawnT >= 1) {
          e.cloudT = 2.2 + Math.random();
          const cr = e.cloudRadius ?? 95;
          this.effects.push({
            type: "poisoncloud",
            x: e.x,
            y: e.y,
            t: 0,
            duration: 2.4,
            radius: cr,
            color: e.glow,
            dps: e.cloudDamage ?? 42,
            slow: 0.5
          });
        }
      }
      for (const w of this.walls) {
        if (w.glue && this.rectCircleOverlap(w, e.x, e.y, e.size)) {
          e.slowT = Math.max(e.slowT, 0.3);
        }
      }
      for (const o of this.enemies) {
        if (o.id === e.id) continue;
        const ox = e.x - o.x;
        const oy = e.y - o.y;
        const od = Math.hypot(ox, oy);
        const min = e.size + o.size;
        if (od > 0 && od < min) {
          const push = (min - od) * 0.5;
          e.x += ox / od * push;
          e.y += oy / od * push;
        }
      }
      this.collideWalls(e, e.size);
      if (!bio) {
        this.collideBase(e, e.size);
        this.collideBase(e, e.size, this.enemyBase);
      }
      if (e.spawnT >= 1 && e.hp > 0) {
        e.attackTimer -= dt;
        if (bio) {
          if (dpl <= e.size + p.size && e.attackTimer <= 0) {
            this.damagePlayer(e.damage);
            e.attackTimer = beh === "crawler" ? 0.45 : 0.6;
          }
        } else {
          if (dbase <= tbaseR + e.size && e.attackTimer <= 0) {
            this.damageBase(e.damage);
            e.attackTimer = 0.7;
          }
          if (dpl <= e.size + p.size && e.attackTimer <= 0) {
            this.damagePlayer(e.damage);
            e.attackTimer = 0.65;
          }
          if (this.foe && e.attackTimer <= 0 && Math.hypot(e.x - this.foe.x, e.y - this.foe.y) <= e.size + this.foe.size) {
            this.damagePlayerEntity(this.foe, e.damage);
            e.attackTimer = 0.65;
          }
        }
      }
      if (bio) {
        const m = e.size;
        e.x = Math.max(m, Math.min(this.worldW - m, e.x));
        e.y = Math.max(m, Math.min(this.worldH - m, e.y));
      }
      if (e.hp > 0) next.push(e);
    }
    this.enemies = next;
    for (const fx of this.effects) {
      if (fx.type !== "poisoncloud" && fx.type !== "firefield") continue;
      if (fx.tickT === void 0) fx.tickT = 0;
      fx.tickT -= dt;
      if (fx.tickT <= 0) {
        fx.tickT = 0.25;
        for (const e of this.enemies) {
          if (Math.hypot(e.x - fx.x, e.y - fx.y) < fx.radius + e.size) {
            if (fx.type === "poisoncloud") {
              this.applyPoison(e, (fx.dps ?? 20) * 0.25 * 0.8);
              e.slowT = Math.max(e.slowT, 0.3);
            } else {
              this.damageEnemy(e, (fx.dps ?? 20) * 0.25, 0, 0, true);
              e.burnT = Math.max(e.burnT, 1);
              e.burnDps = Math.max(e.burnDps, 20);
            }
          }
        }
      }
    }
  }
  damageEnemy(e, dmg, kbx, kby, silent = false) {
    if (e.hp <= 0) return;
    dmg *= RUNTIME.playerDamageMult;
    e.hp -= dmg;
    if (!silent) e.hitFlash = 1;
    if (!silent && this.hitSndCd <= 0) {
      sound.hit();
      this.hitSndCd = 0.04;
    }
    const kbScale = 0.045 / (e.type === "boss" ? 6 : 1);
    e.x += kbx * kbScale;
    e.y += kby * kbScale;
    this.spawnParticles(
      e.x,
      e.y,
      e.glow,
      4,
      120,
      0.3,
      e.x - kbx * 0.1,
      e.y - kby * 0.1
    );
    if (e.hp <= 0) this.killEnemy(e);
  }
  /** Apply (and ramp) poison on an enemy. The longer it stays in gas, the
   *  higher its poison dps climbs — so lingering hurts more and more. */
  applyPoison(e, ramp) {
    if (e.hp <= 0) return;
    e.poisonT = Math.max(e.poisonT ?? 0, 0.9);
    e.poisonDps = Math.min(260, (e.poisonDps ?? 0) + ramp);
  }
  killEnemy(e) {
    this.score += e.score;
    this.kills += 1;
    const big = e.type === "boss" || e.behavior === "abomination";
    const med = e.type === "tank" || e.behavior === "brute" || e.behavior === "bloater";
    const goldAmount = big ? 80 : med ? 18 : e.type === "shooter" || e.behavior === "spitter" ? 10 : 6;
    this.gold += goldAmount;
    this.effects.push({
      type: "coinburst",
      x: e.x,
      y: e.y,
      t: 0,
      duration: 0.5,
      radius: e.size * 3,
      color: "#fbbf24"
    });
    this.effects.push({
      type: "shock",
      x: e.x,
      y: e.y,
      t: 0,
      duration: 0.35,
      radius: e.size * 2.4,
      color: "#fde68a"
    });
    this.shake = Math.min(22, this.shake + (big ? 20 : med ? 10 : 5));
    const coinCount = big ? 40 : med ? 18 : 10;
    for (let i = 0; i < coinCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 280;
      this.particles.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 120,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.3,
        color: Math.random() < 0.5 ? "#fbbf24" : "#fde68a",
        size: 2.5 + Math.random() * 2.5,
        shrink: false,
        gravity: 520,
        coin: true,
        spin: Math.random() * Math.PI * 2
      });
    }
    this.spawnParticles(e.x, e.y, e.glow, big ? 30 : 12, 220, 0.5);
    this.spawnParticles(e.x, e.y, e.color, big ? 20 : 6, 160, 0.4);
    if (big) {
      this.explode(e.x, e.y, e.size * 2.2, 0, e.glow);
    }
    if (e.explosiveDeath) {
      const r = e.explodeRadius ?? 120;
      const dmg = e.explodeDamage ?? 60;
      this.effects.push({ type: "poisoncloud", x: e.x, y: e.y, t: 0, duration: 2.6, radius: r, color: e.glow, dps: dmg, slow: 0.5 });
      this.spawnParticles(e.x, e.y, "#a3e635", 30, 320, 0.6);
      const pd = Math.hypot(this.player.x - e.x, this.player.y - e.y);
      if (pd < r + this.player.size)
        this.damagePlayer(Math.round(dmg * (1 - pd / (r + this.player.size))));
      this.shake = Math.min(16, this.shake + 8);
    }
    const dropChance = big ? 1 : med ? 0.32 : 0.12;
    if (Math.random() < dropChance) {
      this.pickups.push({
        x: e.x,
        y: e.y,
        type: "health",
        life: 12,
        bob: Math.random() * Math.PI * 2
      });
    }
  }
  damagePlayer(dmg) {
    const p = this.player;
    if (p.iframes > 0 || p.shieldTime > 0) {
      if (p.shieldTime > 0) {
        this.spawnParticles(p.x, p.y, "#60a5fa", 4, 90, 0.3);
      }
      return;
    }
    if (p.shieldBlockTime > 0 && p.shieldHp > 0) {
      p.shieldHp -= dmg;
      this.spawnParticles(p.x, p.y, "#60a5fa", 5, 100, 0.3);
      if (p.shieldHp <= 0) {
        p.shieldHp = 0;
        p.shieldBlockTime = 0;
        p.shieldCd = this.gun.shieldRechargeTime ?? 8;
        this.shake = 12;
        sound.explosion();
      }
      return;
    }
    p.hp -= dmg;
    p.flash = 1;
    p.iframes = 0.45;
    p.lastHitTime = this.time;
    sound.hurt();
    this.shake = Math.min(16, this.shake + dmg * 0.4);
    this.spawnParticles(p.x, p.y, "#f87171", 6, 120, 0.4);
    if (p.hp <= 0) {
      p.hp = 0;
      if (this.mode === "local") {
        this.endGame("\u4F60\u5012\u4E0B\u4E86");
      } else {
        p.deadTimer = RESPAWN_TIME;
        p.bowDrawing = false;
        this.firing = false;
        this.beamActive = false;
        this.flameActive = false;
        this.banner = { text: `\u4F60\u88AB\u51FB\u8D25\uFF01${RESPAWN_TIME} \u79D2\u540E\u590D\u6D3B`, t: 1.6 };
      }
    }
  }
  damageBase(dmg) {
    if (this.base.hp <= 0) return;
    if (this.gameMode === "biohazard") return;
    this.base.hp -= dmg;
    this.base.flash = 1;
    this.shake = Math.min(12, this.shake + dmg * 0.25);
    const a = Math.random() * Math.PI * 2;
    this.spawnParticles(
      this.base.x + Math.cos(a) * this.base.radius,
      this.base.y + Math.sin(a) * this.base.radius,
      "#f87171",
      5,
      120,
      0.4
    );
    if (this.base.hp <= 0) {
      this.base.hp = 0;
      this.explode(this.base.x, this.base.y, this.base.radius * 2, 0, "#fb7185");
      this.endGame("\u57FA\u5730\u5931\u5B88\uFF0C\u4F60\u8F93\u4E86\uFF01");
    }
  }
  damageEnemyBase(dmg) {
    if (this.enemyBase.hp <= 0) return;
    dmg *= RUNTIME.playerDamageMult;
    this.enemyBase.hp -= dmg;
    this.enemyBase.flash = 1;
    this.shake = Math.min(8, this.shake + dmg * 0.08);
    const a = Math.random() * Math.PI * 2;
    this.spawnParticles(
      this.enemyBase.x + Math.cos(a) * this.enemyBase.radius,
      this.enemyBase.y + Math.sin(a) * this.enemyBase.radius,
      "#f87171",
      4,
      100,
      0.3
    );
    if (this.enemyBase.hp <= 0) {
      this.enemyBase.hp = 0;
      this.explode(this.enemyBase.x, this.enemyBase.y, this.enemyBase.radius * 2, 0, "#fbbf24");
      this.endGame("\u6467\u6BC1\u654C\u65B9\u57FA\u5730\uFF01\u80DC\u5229\uFF01");
    }
  }
  endGame(reason) {
    if (this.gameOver) return;
    this.gameOver = true;
    this.gameOverReason = reason;
    this.spawnParticles(this.player.x, this.player.y, this.character.bodyColor, 40, 220, 0.8);
    this.emit(true);
  }
  // ==================================================== MULTIPLAYER HELPERS
  nearestBase(x, y) {
    const d1 = (this.base.x - x) ** 2 + (this.base.y - y) ** 2;
    const d2 = (this.enemyBase.x - x) ** 2 + (this.enemyBase.y - y) ** 2;
    return d1 <= d2 ? this.base : this.enemyBase;
  }
  hitsPlayer(b, p) {
    const rr = p.size + b.size;
    return (p.x - b.x) ** 2 + (p.y - b.y) ** 2 <= rr * rr;
  }
  /** Damage an arbitrary player (local or foe); death starts a 4s respawn timer. */
  damagePlayerEntity(p, dmg, _b, knockX = 0, knockY = 0) {
    if (p.deadTimer && p.deadTimer > 0) return;
    if (p.iframes > 0 || p.shieldTime > 0) {
      if (p.shieldTime > 0) this.spawnParticles(p.x, p.y, "#60a5fa", 4, 90, 0.3);
      return;
    }
    if (p.shieldBlockTime > 0 && p.shieldHp > 0) {
      p.shieldHp -= dmg;
      this.spawnParticles(p.x, p.y, "#60a5fa", 5, 100, 0.3);
      if (p.shieldHp <= 0) {
        p.shieldHp = 0;
        p.shieldBlockTime = 0;
        p.shieldCd = this.gun.shieldRechargeTime ?? 8;
        this.shake = 12;
        sound.explosion();
      }
      return;
    }
    p.hp -= dmg;
    p.flash = 1;
    p.iframes = 0.45;
    p.lastHitTime = this.time;
    sound.hurt();
    this.shake = Math.min(16, this.shake + dmg * 0.4);
    this.spawnParticles(p.x, p.y, "#f87171", 6, 120, 0.4);
    if (knockX || knockY) {
      p.x = Math.max(p.size, Math.min(this.worldW - p.size, p.x + knockX));
      p.y = Math.max(p.size, Math.min(this.worldH - p.size, p.y + knockY));
    }
    if (p.hp <= 0) {
      p.hp = 0;
      p.deadTimer = RESPAWN_TIME;
      p.bowDrawing = false;
      this.spawnParticles(p.x, p.y, "#f472b6", 30, 200, 0.6);
      if (p === this.player) {
        this.firing = false;
        this.beamActive = false;
        this.flameActive = false;
      }
      if (p === this.foe) {
        this.kills += 1;
        this.score += 250;
        this.banner = { text: `\u51FB\u6740 ${this.peerName || "\u5BF9\u624B"}\uFF01`, t: 1.6 };
      } else {
        this.banner = { text: `\u4F60\u88AB\u51FB\u8D25\uFF01${RESPAWN_TIME} \u79D2\u540E\u590D\u6D3B`, t: 1.6 };
      }
    }
  }
  /** Count down downed avatars and revive them at their base after RESPAWN_TIME. */
  tickRespawns(dt) {
    this.reviveIfReady(this.player, this.worldH - 200, dt);
    if (this.foe) this.reviveIfReady(this.foe, 220, dt);
  }
  reviveIfReady(p, spawnY, dt) {
    if (!p.deadTimer || p.deadTimer <= 0) return;
    p.deadTimer -= dt;
    if (p.deadTimer <= 0) {
      p.deadTimer = 0;
      p.hp = p.maxHp;
      p.x = this.worldW / 2;
      p.y = spawnY;
      p.vx = 0;
      p.vy = 0;
      p.iframes = 2;
      p.dashVx = 0;
      p.dashVy = 0;
      p.dashTime = 0;
      this.spawnParticles(p.x, p.y, "#4ade80", 24, 200, 0.6);
    }
  }
  // ---- host: pull peer messages, simulate remote, stream snapshots ----
  pumpNet() {
    if (!this.net) return;
    for (const m of this.net.drainGameMsgs()) {
      if (m.t === "inp") this.remoteInput = m.input;
      else if (m.t === "snap") this.lastSnap = m.snap;
      else if (m.t === "hello") {
        this.peerName = m.name;
        this.peerLoadout = m.loadout;
        this.applyPeerLoadout();
        if (this.mode === "host") {
          this.peerReady = true;
          this.matchLive = true;
        }
      }
    }
  }
  simulateRemote(dt) {
    const foe = this.foe;
    const inp = this.remoteInput;
    if (!foe || !inp) return;
    if (foe.deadTimer && foe.deadTimer > 0) return;
    const sp = this.player, sg = this.gunIndex, sk = this.keys, sm = this.mouse, sf = this.firing, sGuns = this.guns, sGadgets = this.gadgets, sGadgetCd = this.gadgetCd;
    const sSkill = this.skillCd, sDash = this.dashCharges, sDashR = this.dashRecharge, sLastG = this.lastGadget, sSemi = this.semiAutoLatch;
    const svmx = this.virtualMove.x;
    const svmy = this.virtualMove.y;
    this.player = foe;
    this.guns = this.foeGuns.length ? this.foeGuns : this.guns;
    this.gunIndex = Math.min(foe.gunIndex ?? 0, this.guns.length - 1);
    this.keys = new Set(inp.keys);
    this.mouse = { x: inp.mx, y: inp.my };
    this.virtualMove.x = inp.vmx;
    this.virtualMove.y = inp.vmy;
    this.firing = inp.firing;
    this.skillCd = foe.skillCd ?? 0;
    this.dashCharges = foe.dashCharges ?? MAX_DASH_CHARGES;
    this.dashRecharge = foe.dashRecharge ?? 0;
    this.lastGadget = foe.lastGadget ?? 0;
    this.gadgets = this.foeGadgets.length ? this.foeGadgets : this.gadgets;
    this.gadgetCd = this.foeGadgetCd;
    for (const [k, v] of this.gadgetCd) {
      if (v > 0) this.gadgetCd.set(k, Math.max(0, v - dt));
    }
    this.semiAutoLatch = false;
    this.updatePlayer(dt);
    if (inp.weaponSwitch) this.gunIndex = (this.gunIndex + 1) % this.guns.length;
    if (inp.skill) this.activateSkill();
    if (inp.reload) this.reloadCurrent();
    if (inp.gadget >= 0) this.deployGadget(inp.gadget, this.mouse.x, this.mouse.y);
    foe.gunIndex = this.gunIndex;
    foe.skillCd = this.skillCd;
    foe.dashCharges = this.dashCharges;
    foe.dashRecharge = this.dashRecharge;
    foe.lastGadget = this.lastGadget;
    this.foeGadgetCd = this.gadgetCd;
    this.player = sp;
    this.guns = sGuns;
    this.gunIndex = sg;
    this.keys = sk;
    this.mouse = sm;
    this.firing = sf;
    this.gadgets = sGadgets;
    this.gadgetCd = sGadgetCd;
    this.skillCd = sSkill;
    this.dashCharges = sDash;
    this.dashRecharge = sDashR;
    this.lastGadget = sLastG;
    this.semiAutoLatch = sSemi;
    this.virtualMove.x = svmx;
    this.virtualMove.y = svmy;
  }
  toSnapPlayer(p, c, o, gadgets = this.gadgets, gadgetCd = this.gadgetCd) {
    return {
      id: p === this.player ? this.selfPid : this.peerPid,
      x: p.x,
      y: p.y,
      angle: p.angle,
      hp: Math.max(0, Math.round(p.hp)),
      maxHp: p.maxHp,
      gunIndex: p.gunIndex ?? this.gunIndex,
      character: c.id,
      outfit: o.id,
      skillId: this.skill.id,
      dashCharges: p.dashCharges ?? this.dashCharges,
      maxDashCharges: MAX_DASH_CHARGES,
      shieldHp: p.shieldHp ?? null,
      shieldMaxHp: this.gun.shieldMaxHp ?? null,
      // each player's OWN gadget list + cooldown (not the host's)
      gadgets: gadgets.map((g) => ({
        id: g.id,
        ready: (gadgetCd.get(g.id) ?? 0) <= 0,
        cdPct: Math.min(1, (gadgetCd.get(g.id) ?? 0) / g.cooldown),
        deployed: 0
      })),
      electrified: p.electrifiedTime ?? 0,
      electrifiedGlow: p.electrifiedGlow ?? "#38bdf8"
    };
  }
  /** Build the full world snapshot (used by the host relay AND the authoritative server). */
  buildSnapshot() {
    return {
      time: this.time,
      scene: this.sceneIndex,
      paused: this.paused,
      players: [
        this.toSnapPlayer(this.player, this.character, this.outfit, this.gadgets, this.gadgetCd),
        this.toSnapPlayer(this.foe, this.foeChar, this.foeOutfit, this.foeGadgets, this.foeGadgetCd)
      ],
      enemies: this.enemies.map((e) => ({
        id: e.id,
        x: e.x,
        y: e.y,
        angle: e.angle,
        hp: e.hp,
        maxHp: e.maxHp,
        character: e.character?.id ?? "raider",
        outfit: e.outfit?.id ?? "tactical",
        elite: e.type === "elite",
        size: e.size
      })),
      bullets: this.bullets.map((b) => ({
        x: b.x,
        y: b.y,
        vx: b.vx,
        vy: b.vy,
        size: b.size,
        color: b.color,
        glow: b.glow,
        kind: b.kind,
        owner: b.owner ?? "self"
      })),
      hostBaseHp: Math.max(0, Math.round(this.base.hp)),
      hostBaseMaxHp: this.base.maxHp,
      guestBaseHp: Math.max(0, Math.round(this.enemyBase.hp)),
      guestBaseMaxHp: this.enemyBase.maxHp,
      wave: this.wave,
      enemiesLeft: this.enemies.length,
      score: this.score,
      kills: this.kills,
      gold: this.gold,
      gameOver: this.gameOver,
      gameOverReason: this.gameOverReason
    };
  }
  /** Host relay path: send the snapshot to the guest over the existing Net. */
  sendSnapshot() {
    if (!this.net || !this.foe) return;
    this.net.sendGame({ t: "snap", snap: this.buildSnapshot() });
  }
  // ---------------------------------------------------- authoritative server
  /** Feed a peer's latest input frame (called by the Node server for each socket). */
  setPeerInput(pid, frame) {
    this.peerInput.set(pid, frame);
  }
  /**
   * Simulate a single peer (host OR foe) from an InputFrame by temporarily
   * swapping the engine's single simulation context onto that player. This is
   * the shared body used by both the browser host (foe only) and the
   * authoritative server (both peers).
   */
  simulatePeer(player, inp, guns, gadgets, gadgetCd, dt) {
    if (!player || !inp) return;
    if (player.deadTimer && player.deadTimer > 0) return;
    const sp = this.player, sg = this.gunIndex, sk = this.keys, sm = this.mouse, sf = this.firing, sGuns = this.guns, sGadgets = this.gadgets, sGadgetCd = this.gadgetCd;
    const sSkill = this.skillCd, sDash = this.dashCharges, sDashR = this.dashRecharge, sLastG = this.lastGadget, sSemi = this.semiAutoLatch;
    const svmx = this.virtualMove.x;
    const svmy = this.virtualMove.y;
    this.player = player;
    this.guns = guns.length ? guns : this.guns;
    this.gunIndex = Math.min(player.gunIndex ?? 0, this.guns.length - 1);
    this.keys = new Set(inp.keys);
    this.mouse = { x: inp.mx, y: inp.my };
    this.virtualMove.x = inp.vmx;
    this.virtualMove.y = inp.vmy;
    this.firing = inp.firing;
    this.skillCd = player.skillCd ?? 0;
    this.dashCharges = player.dashCharges ?? MAX_DASH_CHARGES;
    this.dashRecharge = player.dashRecharge ?? 0;
    this.lastGadget = player.lastGadget ?? 0;
    this.gadgets = gadgets.length ? gadgets : this.gadgets;
    this.gadgetCd = gadgetCd;
    for (const [k, v] of this.gadgetCd) {
      if (v > 0) this.gadgetCd.set(k, Math.max(0, v - dt));
    }
    this.semiAutoLatch = false;
    this.updatePlayer(dt);
    if (inp.weaponSwitch) this.gunIndex = (this.gunIndex + 1) % this.guns.length;
    if (inp.skill) this.activateSkill();
    if (inp.reload) this.reloadCurrent();
    if (inp.gadget >= 0) this.deployGadget(inp.gadget, this.mouse.x, this.mouse.y);
    player.gunIndex = this.gunIndex;
    player.skillCd = this.skillCd;
    player.dashCharges = this.dashCharges;
    player.dashRecharge = this.dashRecharge;
    player.lastGadget = this.lastGadget;
    this.player = sp;
    this.guns = sGuns;
    this.gunIndex = sg;
    this.keys = sk;
    this.mouse = sm;
    this.firing = sf;
    this.gadgets = sGadgets;
    this.gadgetCd = sGadgetCd;
    this.skillCd = sSkill;
    this.dashCharges = sDash;
    this.dashRecharge = sDashR;
    this.lastGadget = sLastG;
    this.semiAutoLatch = sSemi;
    this.virtualMove.x = svmx;
    this.virtualMove.y = svmy;
  }
  /** Advance the shared world state (entities, bullets, waves, respawns). */
  simulateWorld(dt) {
    this.time += dt;
    this.base.t += dt;
    if (this.base.flash > 0) this.base.flash -= dt * 3;
    this.enemyBase.t += dt;
    if (this.enemyBase.flash > 0) this.enemyBase.flash -= dt * 3;
    this.updateWeaponStates(dt);
    this.updateBullets(dt);
    this.updateGrenades(dt);
    this.updateDeployables(dt);
    this.updateEnemyBullets(dt);
    this.updateEnemies(dt);
    this.updateParticles(dt);
    this.updateEffects(dt);
    this.updatePickups(dt);
    this.tickRespawns(dt);
    if (this.matchLive) this.updateWaves(dt);
  }
  /**
   * Authoritative fixed-step update driven by the Node server. Both peers are
   * simulated from their network input frames; the world is then advanced and a
   * snapshot is produced (the caller broadcasts it to both clients).
   */
  stepServer(dt) {
    if (this.paused || !this.matchLive) {
      this.snapAccum += dt;
      if (this.snapAccum >= 1 / 30) {
        this.snapAccum = 0;
      }
      return;
    }
    const fA = this.peerInput.get(this.selfPid) ?? EMPTY_FRAME;
    const fB = this.peerInput.get(this.peerPid) ?? EMPTY_FRAME;
    if (this.player)
      this.simulatePeer(this.player, fA, this.guns, this.gadgets, this.gadgetCd, dt);
    if (this.foe)
      this.simulatePeer(this.foe, fB, this.foeGuns, this.foeGadgets, this.foeGadgetCd, dt);
    this.simulateWorld(dt);
    if (this.gameMode !== "biohazard" && this.base.hp <= 0 && !this.gameOver)
      this.endGame("\u57FA\u5730\u5931\u5B88\uFF0C\u4F60\u8F93\u4E86\uFF01");
  }
  /** Server: begin the match once both peers are present. */
  serverStartMatch() {
    this.peerReady = true;
    this.matchLive = true;
  }
  /** Net: toggle the "opponent reconnecting" overlay (driven by peerGone/peerBack). */
  setReconnecting(v) {
    if (this.reconnecting === v) return;
    this.reconnecting = v;
    this.syncHud();
  }
  /**
   * Server: register peer B (the second socket) from their loadout and assign
   * the two role pids. Peer A is the engine's own player (constructed with its
   * loadout). Call this once both sockets are connected, before stepServer().
   */
  setupServerMatch(loadoutB, pidA, pidB) {
    this.selfPid = pidA;
    this.peerPid = pidB;
    this.peerInput.clear();
    this.foe = this.makeFoe();
    this.peerLoadout = loadoutB;
    this.applyPeerLoadout();
    this.foe.gunIndex = 0;
    this.foe.skillCd = 0;
    this.foe.dashCharges = MAX_DASH_CHARGES;
    this.foe.dashRecharge = 0;
    this.foe.lastGadget = 0;
  }
  // ---- guest: send input, mirror snapshot ----
  sendInput() {
    if (!this.net) return;
    const inp = {
      keys: [...this.keys],
      mx: this.mouse.x,
      my: this.mouse.y,
      vmx: this.virtualMove.x,
      vmy: this.virtualMove.y,
      firing: this.firing,
      gadget: this.pendGadget,
      skill: this.pendSkill,
      reload: this.pendReload,
      weaponSwitch: this.pendWeapon
    };
    this.pendGadget = -1;
    this.pendSkill = false;
    this.pendReload = false;
    this.pendWeapon = false;
    this.net.sendGame({ t: "inp", input: inp });
  }
  applySnapshot() {
    const s = this.lastSnap;
    if (!s) return;
    this.sceneTheme = SCENES[s.scene] ?? SCENES[0];
    if (this.mode === "local") this.paused = s.paused;
    const me = s.players.find((p) => p.id === this.selfPid) ?? s.players[0];
    const foe = s.players.find((p) => p.id !== this.selfPid) ?? s.players[1];
    if (me) {
      this.player.x = me.x;
      this.player.y = me.y;
      this.player.angle = me.angle;
      this.player.hp = me.hp;
      this.player.maxHp = me.maxHp;
      this.player.gunIndex = me.gunIndex;
      if (me.gunIndex != null && me.gunIndex >= 0 && me.gunIndex < this.guns.length) {
        this.gunIndex = me.gunIndex;
      }
      this.player.electrifiedTime = me.electrified;
      this.player.electrifiedGlow = me.electrifiedGlow;
    }
    if (foe) {
      if (!this.foe) this.foe = this.makeFoe();
      const fp = this.foe;
      fp.x = foe.x;
      fp.y = foe.y;
      fp.angle = foe.angle;
      fp.hp = foe.hp;
      fp.maxHp = foe.maxHp;
      fp.gunIndex = foe.gunIndex;
      fp.electrifiedTime = foe.electrified;
      fp.electrifiedGlow = foe.electrifiedGlow;
      this.foeChar = getCharacter(foe.character);
      this.foeOutfit = getOutfit(foe.outfit);
    }
    this.wave = s.wave;
    this.enemiesLeft = s.enemiesLeft;
    this.snapEnemies = s.enemies.map((e) => ({ x: e.x, y: e.y }));
    this.score = s.score;
    this.kills = s.kills;
    this.gold = s.gold;
    this.peerReady = true;
    this.base.hp = s.hostBaseHp;
    this.base.maxHp = s.hostBaseMaxHp;
    this.enemyBase.hp = s.guestBaseHp;
    this.enemyBase.maxHp = s.guestBaseMaxHp;
    if (s.gameOver && !this.gameOver) {
      let reason;
      if (s.guestBaseHp <= 0) reason = "\u5931\u8D25\uFF0C\u57FA\u5730\u5931\u5B88";
      else if (s.hostBaseHp <= 0) reason = "\u80DC\u5229\uFF01\u654C\u65B9\u57FA\u5730\u5DF2\u6467\u6BC1";
      else reason = "\u80DC\u5229\uFF01\u5BF9\u624B\u5DF2\u88AB\u51FB\u8D25";
      this.endGame(reason);
    }
  }
  /** Draw a player avatar as a colored circle + barrel (used for the foe / net). */
  drawNetPlayer(ctx, x, y, angle, color, name, hpPct) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.rotate(angle);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(8, -2.5, 16, 5);
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x - 16, y - 24, 32, 4);
    ctx.fillStyle = hpPct > 0.5 ? "#4ade80" : hpPct > 0.25 ? "#fbbf24" : "#f87171";
    ctx.fillRect(x - 16, y - 24, 32 * Math.max(0, hpPct), 4);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(name, x, y - 28);
  }
  /** Guest-side renderer: draws the world straight from the host snapshot. */
  renderNet(ctx) {
    const s = this.lastSnap;
    if (!s) return;
    ctx.save();
    if (this.shake > 0.2) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    ctx.translate(-this.camX, -this.camY);
    const ease = (id, x, y) => {
      const prev = this.netRender.get(id);
      if (!prev) {
        const cur = { x, y };
        this.netRender.set(id, cur);
        return cur;
      }
      prev.x += (x - prev.x) * 0.4;
      prev.y += (y - prev.y) * 0.4;
      return prev;
    };
    if (this.gameMode !== "biohazard") {
      this.drawBase(ctx, this.enemyBase, true);
      this.drawBase(ctx, this.base, false);
    }
    for (const e of s.enemies) {
      const r = ease(e.id, e.x, e.y);
      const c = getCharacter(e.character);
      ctx.fillStyle = c?.bodyColor ?? "#f87171";
      ctx.beginPath();
      ctx.arc(r.x, r.y, e.size, 0, Math.PI * 2);
      ctx.fill();
      if (e.hp < e.maxHp) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(r.x - e.size, r.y - e.size - 6, e.size * 2, 3);
        ctx.fillStyle = "#f87171";
        ctx.fillRect(r.x - e.size, r.y - e.size - 6, e.size * 2 * (e.hp / e.maxHp), 3);
      }
    }
    for (const p of s.players) {
      if (p.hp <= 0) continue;
      const isMe = p.id === this.selfPid;
      const r = isMe ? { x: this.player.x, y: this.player.y } : ease(p.id, p.x, p.y);
      const col = isMe ? this.character.bodyColor : this.foeChar?.bodyColor ?? "#f472b6";
      this.drawNetPlayer(
        ctx,
        r.x,
        r.y,
        p.angle,
        col,
        isMe ? this.character.name : this.peerName || "\u5BF9\u624B",
        p.hp / p.maxHp
      );
      if (p.electrified > 0) {
        this.drawElectricArcs(ctx, r.x, r.y, 14, p.electrifiedGlow, this.time);
      }
    }
    this.drawAimPreview(ctx);
    for (const b of s.bullets) {
      ctx.strokeStyle = b.glow;
      ctx.lineWidth = Math.max(1, b.size * 0.7);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.stroke();
    }
    ctx.restore();
  }
  damageWall(w, dmg) {
    if (!w.destructible) return;
    w.hp -= dmg;
    this.spawnParticles(
      w.x + w.w / 2,
      w.y + w.h / 2,
      w.glue ? "#22d3ee" : "#d6b27a",
      3,
      100,
      0.3
    );
    if (w.hp <= 0) {
      const i = this.walls.indexOf(w);
      if (i >= 0) this.breakWall(w, i);
    }
  }
  breakWall(w, i) {
    this.walls.splice(i, 1);
    const cx = w.x + w.w / 2;
    const cy = w.y + w.h / 2;
    this.spawnParticles(cx, cy, w.glue ? "#22d3ee" : "#d6b27a", 18, 220, 0.6);
    this.spawnParticles(cx, cy, "#9a7b4a", 12, 160, 0.5);
    this.effects.push({
      type: "debris",
      x: cx,
      y: cy,
      t: 0,
      duration: 0.4,
      radius: Math.max(w.w, w.h),
      color: w.glue ? "#22d3ee" : "#d6b27a"
    });
    this.shake = Math.min(14, this.shake + 5);
  }
  explode(x, y, radius, damage, color) {
    this.effects.push({
      type: "explosion",
      x,
      y,
      t: 0,
      duration: 0.45,
      radius,
      color
    });
    this.effects.push({
      type: "shock",
      x,
      y,
      t: 0,
      duration: 0.4,
      radius,
      color
    });
    this.shake = Math.min(20, this.shake + 8);
    sound.explosion();
    this.spawnParticles(x, y, color, 26, 260, 0.55);
    this.spawnParticles(x, y, "#fde68a", 14, 200, 0.4);
    if (damage > 0) {
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - x, e.y - y);
        if (d < radius + e.size) {
          const fall = 1 - d / (radius + e.size);
          const a = Math.atan2(e.y - y, e.x - x);
          this.damageEnemy(
            e,
            damage * (0.5 + fall * 0.5),
            Math.cos(a) * 260 * fall,
            Math.sin(a) * 260 * fall
          );
        }
      }
    }
    for (let i = this.walls.length - 1; i >= 0; i--) {
      const w = this.walls[i];
      if (w.destructible && this.rectCircleOverlap(w, x, y, radius)) {
        w.hp -= damage > 0 ? 120 : 200;
        if (w.hp <= 0) this.breakWall(w, i);
      }
    }
  }
  spawnParticles(x, y, color, count, speed, life = 0.5, ox, oy) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({
        x: ox ?? x,
        y: oy ?? y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: life * (0.6 + Math.random() * 0.8),
        maxLife: life,
        color,
        size: 2 + Math.random() * 3,
        shrink: true
      });
    }
    if (this.particles.length > 900) {
      this.particles.splice(0, this.particles.length - 900);
    }
  }
  updateParticles(dt) {
    const next = [];
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += p.gravity * dt;
      else {
        p.vx *= 0.92;
        p.vy *= 0.92;
      }
      if (p.spin !== void 0) p.spin += dt * 12;
      p.life -= dt;
      if (p.life > 0) next.push(p);
    }
    this.particles = next;
  }
  updateEffects(dt) {
    for (const e of this.effects) e.t += dt;
    this.effects = this.effects.filter((e) => e.t < e.duration);
  }
  updatePickups(dt) {
    const p = this.player;
    const next = [];
    for (const pk of this.pickups) {
      pk.life -= dt;
      pk.bob += dt * 4;
      const d = Math.hypot(pk.x - p.x, pk.y - p.y);
      if (d < p.size + 16) {
        if (pk.type === "health") {
          p.hp = Math.min(p.maxHp, p.hp + 24);
        }
        sound.pickup();
        this.spawnParticles(pk.x, pk.y, "#4ade80", 12, 120, 0.5);
        continue;
      }
      if (pk.life > 0) next.push(pk);
    }
    this.pickups = next;
  }
  // ----------------------------------------------------------------- waves
  updateWaves(dt) {
    if (this.mode !== "local") return;
    if (this.intermission > 0) {
      this.intermission -= dt;
      return;
    }
    if (this.enemies.length < this.maxConcurrent) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = Math.max(
          RUNTIME.spawnIntervalMin,
          RUNTIME.spawnIntervalMax - this.wave * RUNTIME.spawnIntervalPerWave
        );
        this.spawnEnemy();
      }
    }
    this.waveTimer += dt;
    if (this.waveTimer > RUNTIME.waveDuration) {
      this.waveTimer = 0;
      this.wave += 1;
      this.maxConcurrent = Math.min(
        RUNTIME.maxConcurrentCap,
        RUNTIME.maxConcurrentBase + this.wave * RUNTIME.maxConcurrentPerWave
      );
      this.banner = { text: `\u7B2C ${this.wave} \u9636\u6BB5 \xB7 \u654C\u4EBA\u589E\u5F3A`, t: 2 };
    }
  }
  spawnEnemy() {
    if (this.gameMode === "biohazard") {
      this.spawnMonster();
      return;
    }
    const char = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    const outfit = OUTFITS[Math.floor(Math.random() * OUTFITS.length)];
    const gun = GUNS[Math.floor(Math.random() * GUNS.length)];
    const isRanged = gun.weaponClass === "ranged" || gun.weaponClass === "beam" || gun.weaponClass === "bow";
    const isElite = Math.random() < RUNTIME.enemyEliteChance;
    const n = this.wave || 1;
    const hpScale = 1 + (n - 1) * RUNTIME.enemyHpScalePerWave;
    const dmgScale = 1 + (n - 1) * RUNTIME.enemyDmgScalePerWave;
    const baseHp = RUNTIME.enemyHp > 0 ? RUNTIME.enemyHp : char.maxHp + outfit.hpBonus;
    const maxHp = Math.round(
      baseHp * hpScale * (isElite ? RUNTIME.enemyEliteHpMult : 1)
    );
    const speed = char.speed * (1 + outfit.speedBonus) * RUNTIME.enemySpeedMult;
    const dmg = Math.round(
      RUNTIME.enemyBaseDamage * dmgScale * (isElite ? RUNTIME.enemyEliteDmgMult : 1)
    );
    const pos = this.enemySpawnPos();
    this.enemies.push({
      id: this.enemyId++,
      type: isElite ? "elite" : "grunt",
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      hp: maxHp,
      maxHp,
      size: char.size,
      speed,
      damage: dmg,
      color: "#f87171",
      glow: isElite ? "#fb7185" : "#ef4444",
      score: isElite ? 50 : 15,
      ranged: isRanged,
      shootTimer: 1.2 + Math.random(),
      attackTimer: 0,
      angle: Math.PI / 2,
      hitFlash: 0,
      spawnT: 0,
      slowT: 0,
      burnT: 0,
      burnDps: 0,
      character: char,
      outfit,
      gun,
      bowCharge: 0
    });
    this.effects.push({
      type: "spawn",
      x: pos.x,
      y: pos.y,
      t: 0,
      duration: 0.4,
      radius: char.size * 2,
      color: isElite ? "#fb7185" : "#ef4444"
    });
  }
  enemySpawnPos() {
    const eb = this.enemyBase;
    const a = Math.random() * Math.PI * 2;
    const r = 60 + Math.random() * 80;
    return {
      x: Math.max(20, Math.min(this.worldW - 20, eb.x + Math.cos(a) * r)),
      y: Math.max(20, Math.min(this.worldH - 20, eb.y + Math.sin(a) * r + 40))
    };
  }
  /** Spawn a biohazard monster at a random edge of the (single-screen) arena. */
  spawnMonster() {
    const n = this.wave || 1;
    const pool = MONSTERS.filter((m2) => (m2.minWave ?? 1) <= n);
    let total = 0;
    for (const m2 of pool) total += m2.weight ?? 1;
    let pick = Math.random() * total;
    let def = pool[0];
    for (const m2 of pool) {
      pick -= m2.weight ?? 1;
      if (pick <= 0) {
        def = m2;
        break;
      }
    }
    const hpScale = 1 + (n - 1) * 0.12;
    const dmgScale = 1 + (n - 1) * 0.05;
    const maxHp = Math.round(def.hp * hpScale);
    const speed = def.speed * RUNTIME.enemySpeedMult;
    const dmg = Math.round(def.damage * dmgScale);
    const m = def.size + 6;
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) {
      x = m;
      y = Math.random() * this.worldH;
    } else if (edge === 1) {
      x = this.worldW - m;
      y = Math.random() * this.worldH;
    } else if (edge === 2) {
      x = Math.random() * this.worldW;
      y = m;
    } else {
      x = Math.random() * this.worldW;
      y = this.worldH - m;
    }
    const e = {
      id: this.enemyId++,
      type: "monster",
      behavior: def.behavior,
      x,
      y,
      vx: 0,
      vy: 0,
      hp: maxHp,
      maxHp,
      size: def.size,
      speed,
      damage: dmg,
      color: def.color,
      glow: def.glow,
      score: def.score,
      ranged: !!def.ranged,
      shootTimer: 1 + Math.random(),
      attackTimer: 0,
      angle: Math.PI / 2,
      hitFlash: 0,
      spawnT: 0,
      slowT: 0,
      burnT: 0,
      burnDps: 0,
      poisonT: 0,
      poisonDps: 0,
      // monster-specific params
      screamT: 3 + Math.random() * 2,
      cloudT: 1.5 + Math.random(),
      chargeT: 0,
      buffT: 0,
      explosiveDeath: def.behavior === "bloater",
      explodeRadius: def.explodeRadius,
      explodeDamage: def.explodeDamage,
      rangedRange: def.rangedRange,
      rangedDamage: def.rangedDamage,
      buffRadius: def.buffRadius,
      cloudRadius: def.cloudRadius,
      cloudDamage: def.cloudDamage
    };
    this.enemies.push(e);
    this.effects.push({
      type: "spawn",
      x,
      y,
      t: 0,
      duration: 0.4,
      radius: def.size * 2,
      color: def.glow
    });
  }
  // ---------------------------------------------------------------- skills
  activateSkill() {
    if (this.gameOver || this.paused) return;
    const p = this.player;
    const s = this.skill;
    if (s.id === "dash") {
      if (this.dashCharges <= 0) return;
      this.dashCharges -= 1;
      let dx = 0;
      let dy = 0;
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) dy -= 1;
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) dy += 1;
      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) dx -= 1;
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) dx += 1;
      if (dx === 0 && dy === 0) {
        dx = Math.cos(p.angle);
        dy = Math.sin(p.angle);
      } else {
        const l = Math.hypot(dx, dy);
        dx /= l;
        dy /= l;
      }
      const sp = 760;
      p.dashVx = dx * sp;
      p.dashVy = dy * sp;
      p.dashTime = s.duration;
      p.iframes = Math.max(p.iframes, s.duration + 0.12);
      this.spawnParticles(p.x, p.y, s.color, 18, 200, 0.4);
      sound.skill();
      this.emit(true);
      return;
    }
    if (this.skillCd > 0) return;
    this.skillCd = s.cooldown;
    sound.skill();
    switch (s.id) {
      case "shield": {
        p.shieldTime = s.duration;
        break;
      }
      case "timewarp": {
        this.timewarp = s.duration;
        break;
      }
      case "grenade": {
        const a = p.angle;
        this.grenades.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * 420,
          vy: Math.sin(a) * 420,
          life: 0.55,
          fuse: 0.55,
          kind: "frag"
        });
        break;
      }
      case "overdrive": {
        p.overdriveTime = s.duration;
        this.spawnParticles(p.x, p.y, s.color, 20, 180, 0.5);
        break;
      }
    }
    this.emit(true);
  }
  // ----------------------------------------------------------------- HUD
  getEffects() {
    const p = this.player;
    const out = [];
    if (p.shieldTime > 0)
      out.push({
        id: "shield",
        name: "\u62A4\u76FE",
        icon: "\u{1F6E1}\uFE0F",
        color: "#60a5fa",
        time: p.shieldTime,
        duration: this.getSkill("shield").duration
      });
    if (p.overdriveTime > 0)
      out.push({
        id: "overdrive",
        name: "\u8FC7\u8F7D",
        icon: "\u{1F525}",
        color: "#fbbf24",
        time: p.overdriveTime,
        duration: this.getSkill("overdrive").duration
      });
    if (this.timewarp > 0)
      out.push({
        id: "timewarp",
        name: "\u65F6\u95F4\u626D\u66F2",
        icon: "\u23F3",
        color: "#c084fc",
        time: this.timewarp,
        duration: this.getSkill("timewarp").duration
      });
    if (p.iframes > 0 && p.dashTime <= 0)
      out.push({
        id: "iframe",
        name: "\u65E0\u654C",
        icon: "\u2728",
        color: "#22d3ee",
        time: p.iframes,
        duration: 0.45
      });
    return out;
  }
  getSkill(id) {
    return getSkill(id);
  }
  emit(immediate = false) {
    void immediate;
    const p = this.player;
    const s = this.skill;
    const g = this.gun;
    const ws = this.weaponStates.get(g.id);
    const cdPct = this.skillCd <= 0 ? 1 : 1 - this.skillCd / s.cooldown;
    const dashChargePct = this.dashCharges >= MAX_DASH_CHARGES ? 1 : this.dashRecharge / DASH_RECHARGE;
    const gadgets = this.gadgets.map((gd, i) => {
      const cd = this.gadgetCd.get(gd.id) ?? 0;
      const deployed = this.deployables.filter((d) => d.kind === gd.kind).length;
      return {
        id: gd.id,
        kind: gd.kind,
        name: gd.name,
        iconShape: gd.iconShape,
        color: gd.color,
        cooldownPct: cd <= 0 ? 1 : 1 - cd / gd.cooldown,
        ready: cd <= 0,
        deployed,
        maxStack: gd.maxStack ?? 1,
        selected: this.selectedGadget === i
      };
    });
    const hud = {
      hp: Math.max(0, Math.round(p.hp)),
      maxHp: p.maxHp,
      score: this.score,
      wave: this.wave,
      enemiesLeft: this.mode === "guest" ? this.enemiesLeft : this.enemies.length + this.spawnQueue,
      gunId: g.id,
      guns: this.guns.map((gn) => ({
        id: gn.id,
        name: gn.name,
        iconShape: gn.iconShape,
        weaponClass: gn.weaponClass
      })),
      gunIndex: this.gunIndex,
      weaponClass: g.weaponClass,
      ammo: g.magazine !== void 0 ? ws.ammo : null,
      magazine: g.magazine ?? null,
      reloading: g.magazine !== void 0 && ws.reload > 0,
      reloadPct: g.reloadTime && ws.reload > 0 ? 1 - ws.reload / g.reloadTime : 0,
      heat: ws.heat,
      overheated: ws.overheated,
      warmup: g.spinup ? ws.spin ?? 0 : 0,
      mode: this.gameMode,
      skillId: s.id,
      skillName: s.name,
      skillIcon: s.icon,
      skillCooldownPct: Math.max(0, Math.min(1, cdPct)),
      skillReady: this.skillCd <= 0,
      dashCharges: this.dashCharges,
      maxDashCharges: MAX_DASH_CHARGES,
      dashChargePct,
      effects: this.getEffects(),
      gadgets,
      // Each side shows ITS OWN base as "己方基地". On the guest, its own base
      // is the top one (this.enemyBase), so the mapping is swapped vs the host.
      baseHp: Math.max(0, Math.round(this.mode === "guest" ? this.enemyBase.hp : this.base.hp)),
      baseMaxHp: this.mode === "guest" ? this.enemyBase.maxHp : this.base.maxHp,
      enemyBaseHp: Math.max(0, Math.round(this.mode === "guest" ? this.base.hp : this.enemyBase.hp)),
      enemyBaseMaxHp: this.mode === "guest" ? this.base.maxHp : this.enemyBase.maxHp,
      gameOver: this.gameOver,
      gameOverReason: this.gameOverReason,
      paused: this.paused,
      connecting: this.mode !== "local" && !this.peerReady,
      reconnecting: this.reconnecting,
      banner: this.banner ? this.banner.text : null,
      kills: this.kills,
      gold: this.gold,
      bowChargePct: p.bowDrawing ? Math.min(1, p.bowCharge / (this.gun.maxChargeTime ?? 1)) : 0,
      shieldHp: this.gun.shieldMaxHp ? Math.max(0, Math.round(p.shieldHp)) : null,
      shieldMaxHp: this.gun.shieldMaxHp ?? null,
      shieldActive: p.shieldBlockTime > 0,
      shieldCdPct: p.shieldCd > 0 ? 1 - p.shieldCd / (this.gun.shieldRechargeTime ?? 8) : 1,
      hitFlash: p.flash
    };
    this.onHud(hud);
  }
  // ---------------------------------------------------------------- render
  render() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.W, this.H);
    this.drawBackground(ctx);
    if (this.mode === "guest") {
      this.renderNet(ctx);
      this.drawCrosshair(ctx);
      this.drawOverlays(ctx);
      return;
    }
    ctx.save();
    if (this.shake > 0.2) {
      ctx.translate(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake
      );
    }
    ctx.translate(-this.camX, -this.camY);
    this.drawWalls(ctx);
    this.drawDeployables(ctx);
    if (this.gameMode !== "biohazard") {
      this.drawBase(ctx, this.enemyBase, false);
      this.drawBase(ctx, this.base, true);
    }
    this.drawArenaBorder(ctx);
    this.drawFieldEffects(ctx);
    this.drawPickups(ctx);
    this.drawParticles(ctx);
    this.drawGrenades(ctx);
    this.drawEnemies(ctx);
    this.drawEnemyBullets(ctx);
    this.drawBeam(ctx);
    this.drawFlameCone(ctx);
    if (!(this.player.deadTimer && this.player.deadTimer > 0)) this.drawPlayer(ctx);
    if (this.foe && !(this.foe.deadTimer && this.foe.deadTimer > 0)) {
      this.drawNetPlayer(
        ctx,
        this.foe.x,
        this.foe.y,
        this.foe.angle,
        this.foeChar?.bodyColor ?? "#f472b6",
        this.peerName || "\u5BF9\u624B",
        this.foe.hp / this.foe.maxHp
      );
      if (this.foe.electrifiedTime && this.foe.electrifiedTime > 0) {
        this.drawElectricArcs(ctx, this.foe.x, this.foe.y, this.foe.size, this.foe.electrifiedGlow ?? "#38bdf8", this.time);
      }
    }
    this.drawAimPreview(ctx);
    this.drawBullets(ctx);
    this.drawEffects(ctx);
    ctx.restore();
    this.drawCrosshair(ctx);
    this.drawOverlays(ctx);
  }
  drawBackground(ctx) {
    const theme = this.sceneTheme;
    const g = ctx.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, theme.bgTop);
    g.addColorStop(1, theme.bgBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.W, this.H);
    const myBase = this.mode === "guest" ? this.enemyBase : this.base;
    const foeBase = this.mode === "guest" ? this.base : this.enemyBase;
    const blobs = [
      [foeBase.x - this.camX, foeBase.y - this.camY, "#dc2626"],
      [myBase.x - this.camX, myBase.y - this.camY, "#1d4ed8"]
    ];
    for (const [bx, by, col] of blobs) {
      const rg = ctx.createRadialGradient(bx, by, 0, bx, by, this.W * 0.4);
      rg.addColorStop(0, rgba(col, 0.18));
      rg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, this.W, this.H);
    }
    if (theme.style === "city") {
      this.drawCityBackdrop(ctx, theme);
    } else {
      ctx.strokeStyle = theme.gridColor ?? "rgba(130,150,220,0.07)";
      ctx.lineWidth = 1;
      const step = 48;
      const offX = -this.camX % step;
      const offY = -this.camY % step;
      ctx.beginPath();
      for (let x = offX; x <= this.W; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.H);
      }
      for (let y = offY; y <= this.H; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(this.W, y);
      }
      ctx.stroke();
    }
    const vg = ctx.createRadialGradient(
      this.W / 2,
      this.H / 2,
      this.H * 0.35,
      this.W / 2,
      this.H / 2,
      this.H * 0.85
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, this.W, this.H);
  }
  /**
   * Top-down cyber-city floor: neon "road" grid + glowing building rooftops
   * with lit windows. Building positions are hashed from world-cell coords so
   * the skyline scrolls consistently with the camera.
   */
  drawCityBackdrop(ctx, theme) {
    ctx.strokeStyle = theme.gridColor ?? "rgba(34,211,238,0.10)";
    ctx.lineWidth = 1.5;
    const gstep = 64;
    const offX = -this.camX % gstep;
    const offY = -this.camY % gstep;
    ctx.beginPath();
    for (let x = offX; x <= this.W; x += gstep) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.H);
    }
    for (let y = offY; y <= this.H; y += gstep) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.W, y);
    }
    ctx.stroke();
    const block = 150;
    const x0 = Math.floor(this.camX / block) * block;
    const y0 = Math.floor(this.camY / block) * block;
    for (let wx = x0; wx <= this.camX + this.W; wx += block) {
      for (let wy = y0; wy <= this.camY + this.H; wy += block) {
        const h = Math.abs(Math.sin(wx * 12.9898 + wy * 78.233) * 43758.5453);
        const f = h - Math.floor(h);
        const f2 = h * 1.7 % 1;
        const pad = 24 + Math.floor(f * 22);
        const bw = block - pad * 2 - Math.floor(f2 * 20);
        const bh = block - pad * 2 - Math.floor((1 - f2) * 16);
        const bx = wx + pad - this.camX;
        const by = wy + pad - this.camY;
        ctx.fillStyle = rgba(theme.wallDark, 0.26);
        roundRect(ctx, bx, by, bw, bh, 7);
        ctx.fill();
        ctx.strokeStyle = rgba(theme.accent, 0.28);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = rgba(theme.accent, 0.08);
        ctx.lineWidth = 1;
        roundRect(ctx, bx + 4, by + 4, bw - 8, bh - 8, 5);
        ctx.stroke();
        const cols = Math.max(2, Math.floor(bw / 26));
        const rows = Math.max(2, Math.floor(bh / 26));
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const lit = (i * 7 + j * 13 + Math.floor(f * 31)) % 5 === 0;
            if (!lit) continue;
            ctx.fillStyle = rgba(theme.accent, 0.32);
            ctx.fillRect(bx + 8 + i * 22, by + 8 + j * 22, 5, 5);
          }
        }
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const sweep = this.time * 0.05 % 1;
    const sg = ctx.createLinearGradient(0, 0, this.W, 0);
    const p = sweep * this.W;
    sg.addColorStop(0, "rgba(217,70,239,0)");
    sg.addColorStop(Math.min(1, p / this.W), "rgba(217,70,239,0.05)");
    sg.addColorStop(1, "rgba(217,70,239,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, this.W, this.H);
    ctx.restore();
  }
  drawArenaBorder(ctx) {
    ctx.strokeStyle = rgba(this.sceneTheme.accent, 0.35);
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, this.worldW - 4, this.worldH - 4);
  }
  drawWalls(ctx) {
    for (const w of this.walls) {
      if (w.invisible) continue;
      ctx.save();
      if (w.glue) {
        const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
        g.addColorStop(0, rgba("#22d3ee", 0.5));
        g.addColorStop(1, rgba("#0891b2", 0.4));
        ctx.fillStyle = g;
        roundRect(ctx, w.x, w.y, w.w, w.h, 8);
        ctx.fill();
        ctx.strokeStyle = rgba("#67e8f9", 0.7);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = rgba("#cffafe", 0.4);
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(
            w.x + 10 + i * (w.w / 4),
            w.y + w.h / 2 + Math.sin(this.time * 2 + i) * 4,
            2.5,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        const frac = Math.max(0, w.hp / w.maxHp);
        if (frac < 1) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(w.x + 4, w.y + w.h + 3, w.w - 8, 3);
          ctx.fillStyle = rgba("#22d3ee", 0.9);
          ctx.fillRect(w.x + 4, w.y + w.h + 3, (w.w - 8) * frac, 3);
        }
      } else if (w.destructible) {
        const frac = Math.max(0, w.hp / w.maxHp);
        const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
        g.addColorStop(0, "#c9a36a");
        g.addColorStop(1, "#8a6a3c");
        ctx.fillStyle = g;
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = "rgba(20,14,6,0.6)";
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = "rgba(60,40,20,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const horiz = w.w >= w.h;
        if (horiz) {
          for (let i = 1; i < Math.floor(w.w / 16); i++) {
            ctx.moveTo(w.x + i * 16, w.y);
            ctx.lineTo(w.x + i * 16, w.y + w.h);
          }
        } else {
          for (let i = 1; i < Math.floor(w.h / 16); i++) {
            ctx.moveTo(w.x, w.y + i * 16);
            ctx.lineTo(w.x + w.w, w.y + i * 16);
          }
        }
        ctx.stroke();
        if (frac < 0.6) {
          ctx.strokeStyle = rgba("#1a120a", 0.7);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(w.x + w.w * 0.3, w.y + w.h * 0.5);
          ctx.lineTo(w.x + w.w * 0.5, w.y + w.h * 0.2);
          ctx.lineTo(w.x + w.w * 0.7, w.y + w.h * 0.6);
          ctx.stroke();
        }
        if (frac < 1) {
          const pw = w.w - 8;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(w.x + 4, w.y + w.h + 3, pw, 3);
          ctx.fillStyle = rgba("#fbbf24", 0.9);
          ctx.fillRect(w.x + 4, w.y + w.h + 3, pw * frac, 3);
        }
      } else {
        const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
        g.addColorStop(0, "#5b6478");
        g.addColorStop(1, "#2a3140");
        ctx.fillStyle = g;
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = "rgba(10,12,28,0.8)";
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
        ctx.fillStyle = "rgba(180,190,210,0.5)";
        const r = 1.6;
        for (const [rx, ry] of [
          [w.x + 5, w.y + 5],
          [w.x + w.w - 5, w.y + 5],
          [w.x + 5, w.y + w.h - 5],
          [w.x + w.w - 5, w.y + w.h - 5]
        ]) {
          ctx.beginPath();
          ctx.arc(rx, ry, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(w.x, w.y, w.w, 3);
      }
      ctx.restore();
    }
  }
  drawDeployables(ctx) {
    for (const d of this.deployables) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(0, d.size * 0.7, d.size * 0.8, d.size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      if (d.kind === "turret_mg" || d.kind === "turret_cannon") {
        ctx.strokeStyle = rgba(d.color, 0.12);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (d.kind === "turret_mg") {
        ctx.fillStyle = "#334155";
        ctx.strokeStyle = DARK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, d.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.rotate(d.angle);
        ctx.fillStyle = d.color;
        roundRect(ctx, 0, -3, d.size + 6, 6, 2);
        ctx.fill();
        ctx.strokeStyle = DARK;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = rgba(d.color, 0.8);
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.kind === "turret_cannon") {
        ctx.fillStyle = "#3b3366";
        ctx.strokeStyle = DARK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, d.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.rotate(d.angle);
        ctx.fillStyle = d.color;
        roundRect(ctx, 0, -5, d.size + 8, 10, 3);
        ctx.fill();
        ctx.strokeStyle = DARK;
        ctx.stroke();
        ctx.fillStyle = rgba(d.color, 0.8);
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.kind === "mine_explosive" || d.kind === "mine_poison" || d.kind === "mine_fire") {
        const blink = d.armed <= 0 ? Math.floor(this.time * 4) % 2 === 0 ? 1 : 0.4 : 0.5;
        ctx.fillStyle = rgba(d.color, blink);
        ctx.strokeStyle = shade(d.color, -0.3);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = shade(d.color, -0.2);
        ctx.beginPath();
        ctx.moveTo(-4, -6);
        ctx.lineTo(0, -12);
        ctx.lineTo(4, -6);
        ctx.closePath();
        ctx.fill();
        if (d.armed <= 0) {
          ctx.strokeStyle = rgba(d.color, 0.3);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 8 + this.time * 20 % 16, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (d.kind === "healing_station") {
        ctx.strokeStyle = rgba(d.color, 0.15);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        const pulse = 0.5 + Math.sin(this.time * 3) * 0.2;
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, d.size * 2);
        rg.addColorStop(0, rgba(d.color, pulse * 0.5));
        rg.addColorStop(1, rgba(d.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(0, 0, d.size * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#15803d";
        ctx.strokeStyle = DARK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, d.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#bbf7d0";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-d.size * 0.5, 0);
        ctx.lineTo(d.size * 0.5, 0);
        ctx.moveTo(0, -d.size * 0.5);
        ctx.lineTo(0, d.size * 0.5);
        ctx.stroke();
      }
      ctx.restore();
      if ((d.kind === "turret_mg" || d.kind === "turret_cannon" || d.kind === "healing_station") && d.hp < d.maxHp) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(d.x - 14, d.y - d.size - 10, 28, 4);
        ctx.fillStyle = rgba(d.color, 0.9);
        ctx.fillRect(d.x - 14, d.y - d.size - 10, 28 * (d.hp / d.maxHp), 4);
      }
    }
  }
  drawFieldEffects(ctx) {
    for (const e of this.effects) {
      if (e.type === "poisoncloud") {
        const k = 1 - e.t / e.duration;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
        rg.addColorStop(0, rgba(e.color, 0.35 * k));
        rg.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2 + this.time;
          ctx.fillStyle = rgba(e.color, 0.4 * k);
          ctx.beginPath();
          ctx.arc(
            e.x + Math.cos(a) * e.radius * 0.6,
            e.y + Math.sin(a) * e.radius * 0.6 - this.time * 20 % e.radius,
            4,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.restore();
      } else if (e.type === "firefield") {
        const k = 1 - e.t / e.duration;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
        rg.addColorStop(0, rgba("#fde68a", 0.4 * k));
        rg.addColorStop(0.5, rgba(e.color, 0.35 * k));
        rg.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  drawBase(ctx, b, mine) {
    const isEnemy = !mine;
    ctx.save();
    ctx.translate(b.x, b.y);
    const frac = b.hp / b.maxHp;
    const col = isEnemy ? frac > 0.5 ? "#f87171" : frac > 0.25 ? "#fb923c" : "#ef4444" : frac > 0.5 ? "#4ade80" : frac > 0.25 ? "#fbbf24" : "#f87171";
    ctx.save();
    ctx.rotate(b.t * 0.6);
    ctx.strokeStyle = rgba("#60a5fa", 0.25);
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, b.radius + 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, b.radius + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, b.radius + 12, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
    const halo = ctx.createRadialGradient(0, 0, b.radius * 0.3, 0, 0, b.radius * 2);
    halo.addColorStop(0, rgba(col, 0.35));
    halo.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, b.radius * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(b.t * 0.4);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      const px = Math.cos(a) * b.radius;
      const py = Math.sin(a) * b.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const cg = ctx.createRadialGradient(0, 0, 2, 0, 0, b.radius);
    cg.addColorStop(0, b.flash > 0 ? "#ffffff" : "#dbeafe");
    cg.addColorStop(0.6, col);
    cg.addColorStop(1, shade(col, -0.3));
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.strokeStyle = "rgba(8,10,25,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.rotate(-b.t * 1.5);
    ctx.strokeStyle = rgba("#ffffff", 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2;
      const px = Math.cos(a) * b.radius * 0.45;
      const py = Math.sin(a) * b.radius * 0.45;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = mine ? "rgba(186,230,253,0.95)" : "rgba(254,202,202,0.95)";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(mine ? "\u5DF1\u65B9\u57FA\u5730" : "\u654C\u65B9\u57FA\u5730", 0, b.radius + 40);
    ctx.restore();
  }
  drawPickups(ctx) {
    for (const pk of this.pickups) {
      const y = pk.y + Math.sin(pk.bob) * 3;
      const blink = pk.life < 3 && Math.floor(pk.life * 6) % 2 === 0;
      if (blink) continue;
      ctx.save();
      ctx.translate(pk.x, y);
      const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
      rg.addColorStop(0, rgba("#4ade80", 0.5));
      rg.addColorStop(1, rgba("#4ade80", 0));
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#bbf7d0";
      ctx.strokeStyle = "#16a34a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-7, -7, 14, 14, 4);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#065f46";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(4, 0);
      ctx.moveTo(0, -4);
      ctx.lineTo(0, 4);
      ctx.stroke();
      ctx.restore();
    }
  }
  drawParticles(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      if (p.coin) {
        const w = Math.abs(Math.cos(p.spin ?? 0)) * p.size + 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = rgba(p.color, Math.min(1, a * 1.5));
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, w, p.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba("#92400e", a);
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.globalCompositeOperation = "lighter";
      } else {
        const sz = p.shrink ? p.size * a : p.size;
        ctx.fillStyle = rgba(p.color, a * 0.9);
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  drawGrenades(ctx) {
    for (const gr of this.grenades) {
      ctx.save();
      ctx.translate(gr.x, gr.y);
      const fire = gr.kind === "fire";
      const glue = gr.kind === "glue";
      ctx.fillStyle = fire ? "#7f1d1d" : glue ? "#0e7490" : "#1f2937";
      ctx.strokeStyle = fire ? "#fb923c" : glue ? "#22d3ee" : "#fbbf24";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = fire ? "#fb923c" : glue ? "#22d3ee" : "#f97316";
      ctx.fillRect(-2, -9, 4, 4);
      if (fire) {
        ctx.fillStyle = "#fde68a";
        ctx.beginPath();
        ctx.moveTo(-1.5, -9);
        ctx.quadraticCurveTo(0, -13, 1.5, -9);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  drawEnemies(ctx) {
    for (const e of this.enemies) {
      const scale = e.spawnT;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + e.size * 0.7, e.size * 0.9, e.size * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (e.type === "elite") {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 2.5);
        rg.addColorStop(0, rgba("#fb7185", 0.25));
        rg.addColorStop(1, rgba("#fb7185", 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (e.behavior) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(scale, scale);
        drawMonster(ctx, {
          behavior: e.behavior,
          size: e.size,
          color: e.color,
          glow: e.glow,
          angle: e.angle,
          t: this.time,
          flash: e.hitFlash > 0.05 ? Math.min(1, e.hitFlash) : 0,
          poison: (e.poisonT ?? 0) > 0,
          buffed: (e.buffT ?? 0) > 0,
          charging: (e.chargeT ?? 0) > 0
        });
        ctx.restore();
      } else if (e.character && e.outfit) {
        const enemyChar = {
          ...e.character,
          bodyColor: e.type === "elite" ? "#fb7185" : "#f87171",
          accent: "#dc2626"
        };
        const enemyOutfit = {
          ...e.outfit,
          suit: e.type === "elite" ? "#9f1239" : "#991b1b",
          suitDark: e.type === "elite" ? "#881337" : "#7f1d1d",
          accent: "#fca5a5"
        };
        ctx.save();
        ctx.scale(scale, scale);
        drawCharacter(ctx, {
          x: e.x / scale,
          y: e.y / scale,
          angle: e.angle,
          character: enemyChar,
          outfit: enemyOutfit,
          size: e.size,
          t: this.time,
          flash: e.hitFlash > 0.05 ? Math.min(1, e.hitFlash) : 0,
          gun: e.gun
        });
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(scale, scale);
        const body = e.hitFlash > 0.05 ? "#ffffff" : e.color;
        ctx.fillStyle = body;
        ctx.strokeStyle = shade(e.glow, -0.25);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, e.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = e.glow;
        ctx.beginPath();
        ctx.arc(e.size * 0.45, -e.size * 0.22, e.size * 0.16, 0, Math.PI * 2);
        ctx.arc(e.size * 0.45, e.size * 0.22, e.size * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (e.slowT > 0) {
        ctx.save();
        ctx.fillStyle = rgba("#84cc16", 0.2);
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if ((e.poisonT ?? 0) > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = rgba("#a3e635", 0.22);
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (e.hp < e.maxHp) {
        const w = Math.max(24, e.size * 2);
        const hpx = e.x - w / 2;
        const hpy = e.y - e.size - 12;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(hpx - 1, hpy - 1, w + 2, 6);
        ctx.fillStyle = rgba(e.glow, 0.9);
        ctx.fillRect(hpx, hpy, w * (e.hp / e.maxHp), 4);
      }
      if (e.electrifiedTime && e.electrifiedTime > 0) {
        this.drawElectricArcs(ctx, e.x, e.y, e.size, e.electrifiedGlow ?? "#38bdf8", this.time);
      }
    }
  }
  drawEnemyBullets(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const b of this.enemyBullets) {
      const rg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size * 3);
      rg.addColorStop(0, rgba(b.color, 0.9));
      rg.addColorStop(1, rgba(b.color, 0));
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  drawBeam(ctx) {
    if (!this.beamActive || !this.beamHit) return;
    const p = this.player;
    const g = this.gun;
    const ox = p.x + Math.cos(p.angle) * (p.size + 6);
    const oy = p.y + Math.sin(p.angle) * (p.size + 6);
    const ex = this.beamHit.point.x;
    const ey = this.beamHit.point.y;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const flick = 0.8 + Math.random() * 0.2;
    ctx.strokeStyle = rgba(g.glow, 0.22 * flick);
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = rgba(g.glow, 0.5 * flick);
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = rgba("#ffffff", 0.9 * flick);
    ctx.lineWidth = 2.4;
    ctx.stroke();
    const rg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 14);
    rg.addColorStop(0, rgba("#ffffff", 0.8));
    rg.addColorStop(0.5, rgba(g.glow, 0.7));
    rg.addColorStop(1, rgba(g.glow, 0));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(ex, ey, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  drawFlameCone(ctx) {
    if (!this.flameActive) return;
    const p = this.player;
    const g = this.gun;
    const cone = g.flameCone ?? 0.4;
    const range = g.flameRange ?? 150;
    const ox = p.x + Math.cos(p.angle) * (p.size + g.barrel);
    const oy = p.y + Math.sin(p.angle) * (p.size + g.barrel);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const rg = ctx.createRadialGradient(ox, oy, 0, ox, oy, range);
    rg.addColorStop(0, rgba("#fde68a", 0.5));
    rg.addColorStop(0.4, rgba(g.glow, 0.35));
    rg.addColorStop(1, rgba(g.glow, 0));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.arc(ox, oy, range, p.angle - cone, p.angle + cone);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  drawPlayer(ctx) {
    const p = this.player;
    if (p.shieldTime > 0) {
      ctx.save();
      ctx.translate(p.x, p.y);
      const pulse = 1 + Math.sin(this.time * 8) * 0.04;
      const rr = p.size * 2.1 * pulse;
      const alpha = Math.min(1, p.shieldTime / 0.6) * 0.7;
      ctx.strokeStyle = rgba("#60a5fa", alpha);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = rgba("#dbeafe", alpha * 0.6);
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const a = this.time * 2 + i * Math.PI / 3;
        ctx.beginPath();
        ctx.arc(0, 0, rr, a, a + 0.5);
        ctx.stroke();
      }
      const rg = ctx.createRadialGradient(0, 0, rr * 0.6, 0, 0, rr);
      rg.addColorStop(0, rgba("#60a5fa", 0));
      rg.addColorStop(1, rgba("#60a5fa", alpha * 0.25));
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (p.shieldBlockTime > 0 && this.gun.weaponClass === "shield") {
      const arc = this.gun.shieldArc ?? 0.7;
      const sr = p.size + 22;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.globalCompositeOperation = "lighter";
      const sg = ctx.createRadialGradient(0, 0, sr * 0.3, 0, 0, sr);
      sg.addColorStop(0, rgba("#3b82f6", 0.15));
      sg.addColorStop(1, rgba("#3b82f6", 0));
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, sr, -arc, arc);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba("#60a5fa", 0.7);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, sr, -arc, arc);
      ctx.stroke();
      ctx.restore();
    }
    if (p.bowDrawing && this.gun.weaponClass === "bow") {
      const maxT = this.gun.maxChargeTime ?? 1.2;
      const pct = Math.min(1, p.bowCharge / maxT);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.strokeStyle = rgba(this.gun.glow, 0.5 * pct);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.size + 4, -8);
      ctx.lineTo(p.size + 4 - pct * 10, 0);
      ctx.lineTo(p.size + 4, 8);
      ctx.stroke();
      if (pct > 0.1) {
        const cg = ctx.createRadialGradient(p.size + 4, 0, 0, p.size + 4, 0, 8 + pct * 6);
        cg.addColorStop(0, rgba(this.gun.glow, pct * 0.8));
        cg.addColorStop(1, rgba(this.gun.glow, 0));
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(p.size + 4, 0, 8 + pct * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    const glow = p.overdriveTime > 0 ? "#fbbf24" : p.dashTime > 0 ? "#22d3ee" : void 0;
    const swing = p.swingTimer > 0 ? 1 - p.swingTimer / p.swingDur : 0;
    drawCharacter(ctx, {
      x: p.x,
      y: p.y,
      angle: p.angle,
      character: this.character,
      outfit: this.outfit,
      size: p.size,
      t: p.t,
      flash: p.flash > 0 ? Math.min(1, p.flash) : 0,
      glow,
      gun: this.gun,
      meleeSwing: swing,
      lunge: p.lunge
    });
    if (p.electrifiedTime && p.electrifiedTime > 0) {
      this.drawElectricArcs(ctx, p.x, p.y, p.size, p.electrifiedGlow ?? "#38bdf8", this.time);
    }
    if (p.iframes > 0 && p.dashTime <= 0) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(this.time * 20) * 0.15;
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
  drawBullets(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const b of this.bullets) {
      const rg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size * 3.4);
      rg.addColorStop(0, rgba(b.glow, 0.85));
      rg.addColorStop(1, rgba(b.glow, 0));
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size * 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  /** Crackling electric arcs that cling to an electrified avatar/enemy. */
  drawElectricArcs(ctx, x, y, r, color, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = "lighter";
    const bolts = 6;
    for (let i = 0; i < bolts; i++) {
      const a0 = i / bolts * Math.PI * 2 + time * 4;
      const a1 = a0 + 1.1 + Math.sin(time * 9 + i * 1.7) * 0.5;
      ctx.beginPath();
      let ang = a0;
      let rad = r * 0.55;
      ctx.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
      const segs = 4;
      for (let s = 1; s <= segs; s++) {
        ang = a0 + (a1 - a0) * (s / segs) + (Math.random() - 0.5) * 0.6;
        rad = r * 0.55 + r * 1.15 * (s / segs);
        ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
      }
      ctx.strokeStyle = rgba(color, 0.85);
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.strokeStyle = rgba("#ffffff", 0.7);
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(color, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  drawEffects(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const e of this.effects) {
      const k = e.t / e.duration;
      if (e.type === "explosion") {
        const r = e.radius * (0.3 + k * 0.9);
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
        rg.addColorStop(0, rgba("#fde68a", (1 - k) * 0.9));
        rg.addColorStop(0.4, rgba(e.color, (1 - k) * 0.7));
        rg.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === "shock") {
        const r = e.radius * (0.5 + k * 0.8);
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.8);
        ctx.lineWidth = 3 * (1 - k) + 0.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === "spawn") {
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.8);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * k, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === "debris") {
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.6);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * (0.4 + k * 0.6), 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === "coinburst") {
        const r = e.radius * (0.3 + k * 1.2);
        ctx.strokeStyle = rgba("#fde68a", (1 - k) * 0.95);
        ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = rgba("#fbbf24", (1 - k) * 0.6);
        ctx.lineWidth = 3 * (1 - k) + 0.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
        rg.addColorStop(0, rgba("#ffffff", (1 - k) * 0.5));
        rg.addColorStop(0.5, rgba("#fde68a", (1 - k) * 0.3));
        rg.addColorStop(1, rgba("#fbbf24", 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === "slash") {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle ?? 0);
        const arc = e.arc ?? 2;
        const range = e.range ?? 60;
        ctx.fillStyle = rgba(e.color, (1 - k) * 0.35);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, range * (0.5 + k * 0.6), -arc / 2, arc / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rgba("#ffffff", (1 - k) * 0.9);
        ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(0, 0, range * (0.6 + k * 0.5), -arc / 2, arc / 2);
        ctx.stroke();
        ctx.restore();
      } else if (e.type === "saberswing") {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle ?? 0);
        ctx.globalCompositeOperation = "lighter";
        const arc = e.arc ?? 2.5;
        const range = e.range ?? 80;
        const rg = ctx.createRadialGradient(0, 0, range * 0.15, 0, 0, range * 1.05);
        rg.addColorStop(0, rgba(e.color, (1 - k) * 0.45));
        rg.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, range * (0.85 + k * 0.2), -arc / 2, arc / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rgba("#ffffff", (1 - k) * 0.9);
        ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(0, 0, range * 0.92, -arc / 2, arc / 2);
        ctx.stroke();
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.95);
        ctx.lineWidth = 9 * (1 - k) + 2;
        ctx.beginPath();
        ctx.arc(0, 0, range * 0.92, -arc / 2, arc / 2);
        ctx.stroke();
        const tipA = -arc / 2 + arc * k;
        ctx.fillStyle = rgba("#ffffff", (1 - k) * 0.9);
        ctx.beginPath();
        ctx.arc(Math.cos(tipA) * range * 0.92, Math.sin(tipA) * range * 0.92, 3 * (1 - k) + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (e.type === "whip") {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle ?? 0);
        ctx.globalCompositeOperation = "lighter";
        const range = e.range ?? 90;
        const phase = e.arc ?? 0;
        const segs = 6;
        const bolt = (w, col) => {
          ctx.strokeStyle = col;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          for (let i = 1; i <= segs; i++) {
            const f = i / segs;
            const x = range * f;
            const y = Math.sin(f * Math.PI * 3 + phase) * 16 * (1 - f);
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        };
        bolt(9 * (1 - k) + 2, rgba(e.color, (1 - k) * 0.7));
        bolt(3 * (1 - k) + 1, rgba("#ffffff", (1 - k) * 0.95));
        ctx.restore();
      } else if (e.type === "slam") {
        const r = e.radius * (0.3 + k);
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
        rg.addColorStop(0, rgba("#fde68a", (1 - k) * 0.8));
        rg.addColorStop(0.5, rgba(e.color, (1 - k) * 0.6));
        rg.addColorStop(1, rgba(e.color, 0));
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.9);
        ctx.lineWidth = 4 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * (0.4 + k * 0.7), 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === "flamecone") {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle ?? 0);
        ctx.fillStyle = rgba(e.color, (1 - k) * 0.25);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, e.range ?? 150, -(e.arc ?? 0.4), e.arc ?? 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (e.type === "glue") {
        ctx.strokeStyle = rgba(e.color, (1 - k) * 0.6);
        ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * (0.4 + k * 0.8), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  /** Nearest living enemy (or foe, in versus mode) within range — used by the
   *  mobile-only aim assist to auto-point the player at the closest threat.
   *  On the guest (who has no local enemy simulation) the targets come from the
   *  last host snapshot; otherwise they come from the local enemy list. */
  findAimTarget(p) {
    const RANGE = 640;
    let best = null;
    let bestD = RANGE * RANGE;
    const list = this.mode === "guest" ? this.snapEnemies : this.enemies;
    for (const e of list) {
      if (e.hp !== void 0 && e.hp <= 0) continue;
      const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    if (this.foe && !(this.foe.deadTimer && this.foe.deadTimer > 0)) {
      const d = (this.foe.x - p.x) ** 2 + (this.foe.y - p.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = this.foe;
      }
    }
    return best;
  }
  // --------------------------------------------------- gadget aim preview
  /** Renders the aiming hint for the currently selected (highlighted) gadget. */
  drawAimPreview(ctx) {
    if (this.selectedGadget < 0) return;
    if (this.gameOver || this.paused) return;
    const def = this.gadgets[this.selectedGadget];
    if (!def) return;
    const p = this.player;
    const maxD = this.gadgetRange(def);
    const cd = this.gadgetCd.get(def.id) ?? 0;
    const blocked = cd > 0;
    let dx = this.mouse.x - p.x;
    let dy = this.mouse.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > maxD) {
      dx = dx / d * maxD;
      dy = dy / d * maxD;
    }
    let tx = Math.max(20, Math.min(this.worldW - 20, p.x + dx));
    let ty = Math.max(20, Math.min(this.worldH - 20, p.y + dy));
    if (def.kind === "glue_grenade" || def.kind === "fire_grenade") {
      const sim = this.simulateThrow(p.x, p.y, tx, ty);
      this.drawThrowArc(ctx, p.x, p.y, sim, def.color, blocked);
    } else {
      this.drawPlaceMarker(ctx, p.x, p.y, tx, ty, def, blocked);
    }
  }
  /** Dotted lob trajectory + landing marker for thrown gadgets. */
  drawThrowArc(ctx, px, py, sim, color, blocked) {
    const r = 0.96;
    const dt = 1 / 60;
    let x = px;
    let y = py;
    let vx = sim.vx;
    let vy = sim.vy;
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = blocked ? "rgba(255,255,255,0.35)" : rgba(color, 0.85);
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = Math.round(sim.fuse * 60);
    for (let i = 0; i < steps; i++) {
      x += vx * dt;
      y += vy * dt;
      vx *= r;
      vy *= r;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = blocked ? "rgba(255,255,255,0.35)" : rgba(color, 0.9);
    ctx.beginPath();
    ctx.arc(sim.landX, sim.landY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
  /** Placement marker, max-range ring and coverage preview for deployables. */
  drawPlaceMarker(ctx, px, py, tx, ty, def, blocked) {
    const coverage = def.kind === "turret_mg" ? 260 : def.kind === "turret_cannon" ? 200 : def.kind === "mine_explosive" ? 56 : def.kind === "mine_poison" ? 70 : def.kind === "mine_fire" ? 70 : def.kind === "healing_station" ? 90 : 60;
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = blocked ? "rgba(255,255,255,0.25)" : rgba(def.color, 0.5);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = rgba(def.color, 0.18);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, this.gadgetRange(def), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = blocked ? 0.35 : 0.6;
    ctx.fillStyle = rgba(def.color, 0.22);
    ctx.beginPath();
    ctx.arc(tx, ty, coverage, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = blocked ? "rgba(255,255,255,0.45)" : rgba(def.color, 0.95);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  drawCrosshair(ctx) {
    if (this.touchMode) return;
    const { x, y } = this.mouse;
    const sx = x - this.camX;
    const sy = y - this.camY;
    ctx.save();
    ctx.strokeStyle = rgba("#e2e8f0", 0.7);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, 9, 0, Math.PI * 2);
    ctx.moveTo(sx - 14, sy);
    ctx.lineTo(sx - 5, sy);
    ctx.moveTo(sx + 5, sy);
    ctx.lineTo(sx + 14, sy);
    ctx.moveTo(sx, sy - 14);
    ctx.lineTo(sx, sy - 5);
    ctx.moveTo(sx, sy + 5);
    ctx.lineTo(sx, sy + 14);
    ctx.stroke();
    ctx.fillStyle = rgba(this.gun.glow, 0.9);
    ctx.beginPath();
    ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  drawOverlays(ctx) {
    if (this.timewarp > 0) {
      ctx.fillStyle = rgba("#a855f7", 0.1);
      ctx.fillRect(0, 0, this.W, this.H);
    }
    const p = this.player;
    const hpFrac = p.hp / p.maxHp;
    if (hpFrac < 0.35 && !this.gameOver) {
      const pulse = 0.25 + Math.sin(this.time * 6) * 0.12;
      const rg = ctx.createRadialGradient(
        this.W / 2,
        this.H / 2,
        this.H * 0.3,
        this.W / 2,
        this.H / 2,
        this.H * 0.8
      );
      rg.addColorStop(0, "rgba(0,0,0,0)");
      rg.addColorStop(1, rgba("#ef4444", pulse * (1 - hpFrac)));
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, this.W, this.H);
    }
    const bf = this.base.hp / this.base.maxHp;
    if (bf < 0.3 && !this.gameOver) {
      const pulse = 0.2 + Math.sin(this.time * 5) * 0.1;
      ctx.fillStyle = rgba("#ef4444", pulse * (0.3 - bf));
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }
};
export {
  GameEngine
};
