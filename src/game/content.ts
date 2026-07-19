import type { CharacterDef, OutfitDef, GunDef, SkillDef, GadgetDef, MonsterDef } from "./types";
import gunsData from "../../data/guns.json";

// ---------------------------------------------------------------------------
// CHARACTERS — different builds with their own stat profiles & color identity.
// ---------------------------------------------------------------------------
export const CHARACTERS: CharacterDef[] = [
  {
    id: "raider",
    name: "突袭者",
    title: "Raider",
    bodyColor: "#22d3ee",
    accent: "#0891b2",
    skin: "#fcd9b6",
    speed: 235,
    maxHp: 100,
    damageMult: 1.0,
    fireRateMult: 1.0,
    size: 16,
    perk: "全才型，属性均衡",
    desc: "攻防均衡的万金油角色，适合所有打法。",
  },
  {
    id: "juggernaut",
    name: "重装兵",
    title: "Juggernaut",
    bodyColor: "#34d399",
    accent: "#059669",
    skin: "#e8b890",
    speed: 178,
    maxHp: 165,
    damageMult: 0.92,
    fireRateMult: 0.95,
    size: 19,
    perk: "高血量，移动缓慢",
    desc: "皮糙肉厚的移动堡垒，容错率极高。",
  },
  {
    id: "phantom",
    name: "灵狐",
    title: "Phantom",
    bodyColor: "#f472b6",
    accent: "#db2777",
    skin: "#ffd9c2",
    speed: 296,
    maxHp: 72,
    damageMult: 1.12,
    fireRateMult: 1.18,
    size: 14,
    perk: "极速高伤，身板脆弱",
    desc: "来去如风的刺杀者，靠走位与射速碾压对手。",
  },
  {
    id: "sentinel",
    name: "哨兵",
    title: "Sentinel",
    bodyColor: "#fbbf24",
    accent: "#d97706",
    skin: "#f3c79b",
    speed: 214,
    maxHp: 96,
    damageMult: 1.28,
    fireRateMult: 0.86,
    size: 16,
    perk: "伤害强化，射速略低",
    desc: "精准的火力专家，单发威力惊人。",
  },
];

// ---------------------------------------------------------------------------
// OUTFITS — cosmetic color schemes + headgear, each with a minor stat bonus.
// ---------------------------------------------------------------------------
export const OUTFITS: OutfitDef[] = [
  {
    id: "tactical",
    name: "经典战术",
    suit: "#64748b",
    suitDark: "#334155",
    accent: "#e2e8f0",
    hat: "helmet",
    perk: "无额外加成",
    speedBonus: 0,
    hpBonus: 0,
  },
  {
    id: "night",
    name: "暗夜潜行",
    suit: "#3b3b6b",
    suitDark: "#22224a",
    accent: "#818cf8",
    hat: "hood",
    perk: "移速 +6%",
    speedBonus: 0.06,
    hpBonus: 0,
  },
  {
    id: "desert",
    name: "沙漠风暴",
    suit: "#d6b27a",
    suitDark: "#a07c44",
    accent: "#fff3d6",
    hat: "cap",
    perk: "无额外加成",
    speedBonus: 0,
    hpBonus: 0,
  },
  {
    id: "neon",
    name: "霓虹猎手",
    suit: "#1e293b",
    suitDark: "#0f172a",
    accent: "#22d3ee",
    hat: "visor",
    perk: "射速 +6%",
    speedBonus: 0,
    hpBonus: 0,
    fireRateBonus: 0.06,
  },
  {
    id: "crimson",
    name: "赤焰斗士",
    suit: "#b91c1c",
    suitDark: "#7f1d1d",
    accent: "#fca5a5",
    hat: "cap",
    perk: "移速 +4%",
    speedBonus: 0.04,
    hpBonus: 6,
  },
  {
    id: "emerald",
    name: "翡翠卫士",
    suit: "#15803d",
    suitDark: "#14532d",
    accent: "#86efac",
    hat: "helmet",
    perk: "无额外加成",
    speedBonus: 0,
    hpBonus: 0,
  },
  // ===================== SKINS (this update) =====================
  {
    id: "alien",
    name: "外星人 👽",
    suit: "#22d3ee",
    suitDark: "#0e7490",
    accent: "#a5f3fc",
    hat: "alien",
    perk: "移速 +6%",
    speedBonus: 0.06,
    hpBonus: 0,
    skin: "#7ef0b0",
  },
  {
    id: "monkey",
    name: "猴子 🐒",
    suit: "#a16207",
    suitDark: "#854d0e",
    accent: "#fbbf24",
    hat: "monkey",
    perk: "血量 +18",
    speedBonus: 0,
    hpBonus: 18,
    skin: "#caa072",
  },
  {
    id: "tycoon",
    name: "大亨 🎩",
    suit: "#4c1d95",
    suitDark: "#2e1065",
    accent: "#fbbf24",
    hat: "tycoon",
    perk: "射速 +5%",
    speedBonus: 0,
    hpBonus: 0,
    fireRateBonus: 0.05,
  },
];

// ---------------------------------------------------------------------------
// GUNS — distinct weapon archetypes with very different feel.
// 游戏中按 E 循环切换武器；半自动武器(semiAuto)需松开左键后才能再次开火。
// ---------------------------------------------------------------------------
// GUNS data lives in data/guns.json (edit via `npm run editor`) so every
// build target — client bundle AND server engine bundle — shares one source.
export const GUNS: GunDef[] = gunsData as unknown as GunDef[];

// ---------------------------------------------------------------------------
// SKILLS — activated with Q, each on a cooldown.
// ---------------------------------------------------------------------------
export const SKILLS: SkillDef[] = [
  {
    id: "dash",
    name: "冲刺闪避",
    desc: "瞬间高速突进并获得短暂无敌（可蓄力3段，每段5秒）",
    cooldown: 5,
    duration: 0.28,
    color: "#22d3ee",
    icon: "⚡",
  },
  {
    id: "shield",
    name: "能量护盾",
    desc: "展开护盾，期间免疫伤害",
    cooldown: 7,
    duration: 2.4,
    color: "#60a5fa",
    icon: "🛡️",
  },
  {
    id: "timewarp",
    name: "时间扭曲",
    desc: "减缓所有敌人的速度",
    cooldown: 8.5,
    duration: 3.5,
    color: "#c084fc",
    icon: "⏳",
  },
  {
    id: "grenade",
    name: "投掷手雷",
    desc: "向准星投掷爆炸手雷",
    cooldown: 4,
    duration: 0.5,
    color: "#f97316",
    icon: "💣",
  },
  {
    id: "overdrive",
    name: "火力过载",
    desc: "短时间内大幅提升射速",
    cooldown: 9,
    duration: 4,
    color: "#fbbf24",
    icon: "🔥",
  },
];

// ---------------------------------------------------------------------------
// GADGETS — deployable tactical items, each on its own cooldown.
// Activated in-game via the gadget bar (keys F1..F6 or click).
// ---------------------------------------------------------------------------
export const GADGETS: GadgetDef[] = [
  {
    id: "turret_mg",
    kind: "turret_mg",
    name: "哨戒机枪",
    desc: "部署后在一定范围内自动射击敌人（永久存在）",
    cooldown: 16,
    iconShape: "turret_mg",
    color: "#38bdf8",
    maxStack: 3,
    hp: 176,
  },
  {
    id: "turret_cannon",
    kind: "turret_cannon",
    name: "哨戒炮塔",
    desc: "较小范围内连发低伤害 AOE 炸弹（永久存在）",
    cooldown: 20,
    iconShape: "turret_cannon",
    color: "#a78bfa",
    maxStack: 2,
    hp: 220,
  },
  {
    id: "mine_explosive",
    kind: "mine_explosive",
    name: "爆炸地雷",
    desc: "敌人经过时引爆，范围爆炸",
    cooldown: 30,
    iconShape: "mine_explosive",
    color: "#f87171",
    maxStack: 4,
  },
  {
    id: "mine_poison",
    kind: "mine_poison",
    name: "毒气地雷",
    desc: "触发后释放持续毒云，减速并伤害敌人",
    cooldown: 20,
    iconShape: "mine_poison",
    color: "#84cc16",
    maxStack: 4,
  },
  {
    id: "mine_fire",
    kind: "mine_fire",
    name: "火焰地雷",
    desc: "触发后生成持续燃烧的火场",
    cooldown: 20,
    iconShape: "mine_fire",
    color: "#fb923c",
    maxStack: 4,
  },
  {
    id: "glue_grenade",
    kind: "glue_grenade",
    name: "粘胶手榴弹",
    desc: "投掷后生成一堵粘胶墙，阻挡并减速敌人",
    cooldown: 20,
    iconShape: "glue_grenade",
    color: "#22d3ee",
    maxStack: 3,
  },
  {
    id: "fire_grenade",
    kind: "fire_grenade",
    name: "火焰手雷",
    desc: "投掷后炸开一片持续燃烧的火场，灼烧范围内的敌人",
    cooldown: 22,
    iconShape: "fire_grenade",
    color: "#fb923c",
    maxStack: 3,
  },
  {
    id: "poison_grenade",
    kind: "poison_grenade",
    name: "毒气手雷",
    desc: "投掷后炸开一团滞留毒云，减速并持续毒伤范围内敌人",
    cooldown: 20,
    iconShape: "poison_grenade",
    color: "#84cc16",
    maxStack: 3,
  },
  {
    id: "healing_station",
    kind: "healing_station",
    name: "治疗站",
    desc: "部署后靠近自动缓慢回血（F7）",
    cooldown: 25,
    iconShape: "healing_station",
    color: "#4ade80",
    maxStack: 2,
    hp: 80,
  },
];

// ---------------------------------------------------------------------------
// MONSTERS — biohazard (生化危机) bestiary. The first five (walker / runner /
// brute / spitter / abomination) restore the classic "old" monster roster;
// the last four (crawler / bloater / screamer / spore) are brand-new additions.
// ---------------------------------------------------------------------------
export const MONSTERS: MonsterDef[] = [
  {
    id: "walker",
    name: "行尸",
    behavior: "walker",
    desc: "缓慢的近战丧尸，数量众多",
    hp: 75,
    speed: 64,
    damage: 12,
    size: 15,
    color: "#7c9c5a",
    glow: "#a3e635",
    score: 12,
    weight: 3,
  },
  {
    id: "runner",
    name: "奔尸",
    behavior: "runner",
    desc: "速度极快，会周期俯冲扑咬",
    hp: 55,
    speed: 150,
    damage: 10,
    size: 13,
    color: "#a3e635",
    glow: "#bef264",
    score: 16,
    weight: 2,
  },
  {
    id: "brute",
    name: "巨尸",
    behavior: "brute",
    desc: "皮糙肉厚、移动缓慢的肉盾，撞击沉重",
    hp: 460,
    speed: 40,
    damage: 30,
    size: 30,
    color: "#4d7c4d",
    glow: "#65a30d",
    score: 60,
    weight: 1,
  },
  {
    id: "spitter",
    name: "吐酸者",
    behavior: "spitter",
    desc: "远程喷吐剧毒酸液，保持距离输出",
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
    weight: 1.4,
  },
  {
    id: "abomination",
    name: "母体",
    behavior: "abomination",
    desc: "巨型 BOSS，重砸范围伤害，死亡时剧烈爆裂",
    hp: 2600,
    speed: 30,
    damage: 45,
    size: 46,
    color: "#7e22ce",
    glow: "#a855f7",
    score: 400,
    weight: 0.4,
    minWave: 6,
  },
  // ===================== NEW (added this update) =====================
  {
    id: "crawler",
    name: "爬虫",
    behavior: "crawler",
    desc: "体型极小、成群高速爬行，单个体脆弱但难缠",
    hp: 30,
    speed: 205,
    damage: 7,
    size: 10,
    color: "#d9f99d",
    glow: "#bef264",
    score: 8,
    weight: 1.6,
  },
  {
    id: "bloater",
    name: "毒爆体",
    behavior: "bloater",
    desc: "臃肿的毒囊，被击杀时炸开一大片剧毒云",
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
    minWave: 2,
  },
  {
    id: "screamer",
    name: "尖啸者",
    behavior: "screamer",
    desc: "发出尖啸，大幅加速周围怪物，并短暂震慑玩家",
    hp: 130,
    speed: 72,
    damage: 8,
    size: 18,
    color: "#f0abfc",
    glow: "#e879f9",
    score: 45,
    buffRadius: 270,
    weight: 0.8,
    minWave: 3,
  },
  {
    id: "spore",
    name: "孢子怪",
    behavior: "spore",
    desc: "持续释放滞留毒云，靠近会被持续中毒",
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
    minWave: 2,
  },
];

export const getMonster = (id: string) =>
  MONSTERS.find((m) => m.id === id) ?? MONSTERS[0];

export const getCharacter = (id: string) =>
  CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
export const getOutfit = (id: string) =>
  OUTFITS.find((o) => o.id === id) ?? OUTFITS[0];
export const getGun = (id: string) => GUNS.find((g) => g.id === id) ?? GUNS[0];
export const getSkill = (id: string) =>
  SKILLS.find((s) => s.id === id) ?? SKILLS[0];
export const getGadget = (id: string) =>
  GADGETS.find((g) => g.id === id) ?? GADGETS[0];

// ---------------------------------------------------------------------------
// SCENES — visual themes for different arena environments.
// ---------------------------------------------------------------------------
export interface SceneTheme {
  id: string;
  name: string;
  bgTop: string;
  bgBottom: string;
  wallColor: string;
  wallDark: string;
  accent: string;
  /** "grid" = flat neon grid floor (default); "city" = top-down cyber-city blocks */
  style?: "grid" | "city";
  /** override grid line color (used by cyber style) */
  gridColor?: string;
}

export const SCENES: SceneTheme[] = [
  {
    id: "neon",
    name: "霓虹都市",
    bgTop: "#1b1c3a",
    bgBottom: "#121331",
    wallColor: "#5b6478",
    wallDark: "#2a3140",
    accent: "#6366f1",
  },
  {
    id: "desert",
    name: "沙漠废墟",
    bgTop: "#3a2e1a",
    bgBottom: "#2a2110",
    wallColor: "#a9743a",
    wallDark: "#6e4a24",
    accent: "#f59e0b",
  },
  {
    id: "arctic",
    name: "冰原基地",
    bgTop: "#1a2a3a",
    bgBottom: "#0f1a28",
    wallColor: "#64748b",
    wallDark: "#334155",
    accent: "#38bdf8",
  },
  {
    id: "ruin",
    name: "末日废墟",
    bgTop: "#2a1a1a",
    bgBottom: "#1a1010",
    wallColor: "#52525b",
    wallDark: "#27272a",
    accent: "#ef4444",
  },
  {
    id: "cyber",
    name: "赛博都市",
    bgTop: "#0a0a1f",
    bgBottom: "#05030f",
    wallColor: "#1d4ed8",
    wallDark: "#0b2240",
    accent: "#22d3ee",
    style: "city",
    gridColor: "rgba(34,211,238,0.10)",
  },
];
