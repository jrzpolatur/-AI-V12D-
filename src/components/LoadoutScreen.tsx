import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CHARACTERS,
  GUNS,
  OUTFITS,
  SKILLS,
  GADGETS,
  getGun,
} from "../game/content";
import { sound } from "../game/sound";
import type { Loadout } from "../game/engine";
import type { GunDef } from "../game/types";
import { drawCharacter, drawWeaponIcon, drawWeaponModel, drawGadgetIcon, rgba } from "../game/draw";
import { cn } from "../utils/cn";
import { Net, type NetStatus } from "../net/Net";
import { tabLock } from "../utils/tabLock";
import { getServerWsUrl } from "../utils/serverConfig";

export const ADVANCED_MAP_THEMES = [
  { id: "random", name: "🎲 随机场景", desc: "每次对局随机生成独特世界", color: "#6366f1", icon: "🎲" },
  { id: "neon", name: "🏙️ 霓虹都市", desc: "赛博高楼与霓虹天际线", color: "#818cf8", icon: "🏙️" },
  { id: "desert", name: "🏜️ 沙漠废墟", desc: "西部沙龙酒吧与戈壁荒漠", color: "#d97706", icon: "🏜️" },
  { id: "arctic", name: "❄️ 冰原基地", desc: "积雪冻土与极地科研哨所", color: "#38bdf8", icon: "❄️" },
  { id: "ruin", name: "🏚️ 末日废墟", desc: "坍塌厂房与散乱残骸掩体", color: "#f87171", icon: "🏚️" },
  { id: "cyber", name: "🌌 赛博都市", desc: "全息能量塔与蓝紫天台", color: "#00f0ff", icon: "🌌" },
  { id: "wild_west", name: "🤠 西部牛仔", desc: "边境工坊与仙人掌荒野", color: "#f59e0b", icon: "🤠" },
  { id: "jungle", name: "🌿 幽静丛林", desc: "茂密古树与藤蔓遗迹", color: "#4ade80", icon: "🌿" },
  { id: "arctic_zone", name: "🏔️ 极寒地带", desc: "终年极地列车与冰川堡垒", color: "#0284c7", icon: "🏔️" },
];

export const ADVANCED_MAP_LAYOUTS = [
  { id: "default", name: "⚖️ 经典平衡", desc: "对称战术建筑与掩体" },
  { id: "open", name: "🏟️ 开放竞技", desc: "宽阔视野，适合远距刚枪" },
  { id: "maze", name: "🧱 迷宫巷战", desc: "密集窄巷，适合近角拼抢" },
  { id: "fortress", name: "🏰 堡垒要塞", desc: "中央重装堡垒与四方哨站" },
  { id: "scattered", name: "🎲 战术废墟", desc: "散落掩体与残垣乱石" },
];

export const ADVANCED_WEATHERS = [
  { id: "random", label: "随机", icon: "🎲", desc: "自动随机气象" },
  { id: "clear", label: "晴天", icon: "☀️", desc: "晴空万里，视野极佳" },
  { id: "fog", label: "大雾", icon: "🌫️", desc: "迷雾笼罩，近距拼枪" },
  { id: "overcast", label: "阴天", icon: "☁️", desc: "柔和漫反射光照" },
  { id: "rain", label: "雨天", icon: "🌧️", desc: "暴雨倾盆，水花飞溅" },
  { id: "snow", label: "雪天", icon: "❄️", desc: "漫天飘雪，晶莹视效" },
  { id: "sandstorm", label: "沙尘", icon: "🌪️", desc: "狂暴沙尘，风暴侵袭" },
];

/** Weapon categories shown in the loadout picker (ordered). */
const GUN_GROUPS: { key: string; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "rifle", label: "步枪" },
  { key: "smg", label: "冲锋" },
  { key: "sniper", label: "狙击" },
  { key: "shotgun", label: "霰弹" },
  { key: "pistol", label: "手枪" },
  { key: "explosive", label: "爆炸" },
  { key: "energy", label: "能量" },
  { key: "spray", label: "喷射" },
  { key: "melee", label: "近战" },
  { key: "special", label: "投掷" },
];

/** Map a gun to one of the categories above by its class + key stats. */
function gunCategory(g: GunDef): string {
  if (g.weaponClass === "melee" || g.weaponClass === "shield") return "melee";
  if (g.weaponClass === "beam" || g.kind === "ion") return "energy";
  if (g.weaponClass === "flamethrower" || g.weaponClass === "poison_mist" || g.kind === "flame") return "spray";
  if (g.weaponClass === "bow") return "special";
  if (g.weaponClass === "shotgun" || g.kind === "pellet") return "shotgun";
  if (g.kind === "boomerang" || g.kind === "knife" || g.shape === "knife") return "special";
  if (g.explosive || g.kind === "rocket" || g.kind === "grenade") return "explosive";
  if (g.shape === "sniper") return "sniper";
  if (g.shape === "pistol") return "pistol";
  if (g.shape === "mac11" || g.shape === "mp5") return "smg";
  return "rifle";
}

function CharPreview({
  loadout,
}: {
  loadout: Loadout;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aim = useRef({ x: 0, y: -1 });
  const mouse = useRef({ inside: false });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let start = performance.now();
    const char = CHARACTERS.find((c) => c.id === loadout.characterId)!;
    const outfit = OUTFITS.find((o) => o.id === loadout.outfitId)!;
    const gun = getGun(loadout.gunId);

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left - rect.width / 2;
      const my = e.clientY - rect.top - rect.height / 2;
      if (Math.hypot(mx, my) > 6) {
        aim.current = { x: mx, y: my };
        mouse.current.inside = true;
      }
    };
    const onLeave = () => (mouse.current.inside = false);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    const render = () => {
      const t = (performance.now() - start) / 1000;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(99,102,241,0.22)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2, h / 2 + 24);
      ctx.scale(1, 0.4);
      ctx.strokeStyle = "rgba(148,163,184,0.35)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 64, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      let angle = -Math.PI / 2;
      if (!mouse.current.inside) {
        angle = Math.sin(t * 0.7) * 0.8 - Math.PI / 2;
      } else {
        angle = Math.atan2(aim.current.y, aim.current.x);
      }

      drawCharacter(ctx, {
        x: w / 2,
        y: h / 2,
        angle,
        character: char,
        outfit,
        size: 34,
        t,
        gun,
      });
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [loadout]);

  return (
    <div
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        aim.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        mouse.current.inside = true;
      }}
      onMouseLeave={() => {
        mouse.current.inside = false;
      }}
      className="relative flex h-[190px] w-full items-center justify-center rounded-xl bg-gradient-to-b from-[#181a3d] to-[#0c0d21] border border-white/10 shadow-inner"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}

/** Small canvas rendering actual detailed in-game weapon model. */
function WeaponIcon({
  iconShape,
  glow,
  gunId,
  size = 32,
}: {
  iconShape: string;
  glow: string;
  gunId?: string;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const gun = gunId ? getGun(gunId) : GUNS.find((g) => g.iconShape === iconShape || g.glow === glow);
    if (gun) {
      drawWeaponModel(ctx, gun, size / 2, size / 2, size * 0.9);
    } else {
      drawWeaponIcon(ctx, iconShape, size / 2, size / 2, size * 0.78, glow);
    }
  }, [iconShape, glow, gunId, size]);

  return (
    <div
      className="flex items-center justify-center rounded-lg p-1.5 bg-white/[0.04] border border-white/[0.06] shrink-0"
      style={{
        boxShadow: `0 0 12px ${glow}15, inset 0 0 6px ${glow}08`,
      }}
    >
      <canvas ref={ref} style={{ width: size, height: size, filter: `drop-shadow(0 0 3px ${glow}88)` }} />
    </div>
  );
}

/** Small canvas rendering a gadget's vector silhouette. */
function GadgetIconCanvas({
  iconShape,
  color,
  size = 24,
}: {
  iconShape: string;
  color: string;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    drawGadgetIcon(ctx, { iconShape, color } as never, size / 2, size / 2, size * 0.78);
  }, [iconShape, color, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} />;
}

/** Stat bar showing a weapon parameter. */
function ParamBar({
  label,
  value,
  max,
  color,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix?: string;
}) {
  const pct = Math.min(1, value / max);
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-10 text-[10px] text-slate-400 font-medium">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-9 text-right text-[10px] font-mono font-bold text-slate-300">
        {value.toFixed(value < 10 ? 1 : 0)}
        {suffix}
      </span>
    </div>
  );
}

/** Detailed weapon info panel shown in left column. */
function WeaponDetail({ gun }: { gun: GunDef }) {
  const classLabel =
    gun.weaponClass === "melee"
      ? "近战"
      : gun.weaponClass === "beam"
      ? "激光"
      : gun.weaponClass === "flamethrower"
      ? "喷射"
      : gun.weaponClass === "shotgun"
      ? "霰弹"
      : "远程";

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-2.5 backdrop-blur-md">
      <div className="mb-2 flex items-center gap-2.5">
        <WeaponIcon iconShape={gun.iconShape} glow={gun.glow} gunId={gun.id} size={28} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-white truncate">{gun.name}</span>
            <span
              className="rounded px-1.5 py-0.2 text-[9px] font-semibold"
              style={{
                backgroundColor: rgba(gun.glow, 0.2),
                color: gun.glow,
              }}
            >
              {classLabel}
            </span>
            {gun.rangeTier && (
              <span className="rounded bg-white/10 px-1 py-0.2 text-[9px] text-slate-300">
                {gun.rangeTier}距
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 truncate">{gun.desc}</p>
        </div>
      </div>
      <div className="space-y-1">
        {gun.weaponClass === "ranged" && (
          <>
            <ParamBar label="伤害" value={gun.damage} max={175} color="#f87171" />
            <ParamBar label="射速" value={gun.fireRate} max={18} color="#a78bfa" suffix="/s" />
            <ParamBar label="弹速" value={gun.bulletSpeed / 100} max={29} color="#22d3ee" />
            {gun.magazine && <ParamBar label="弹匣" value={gun.magazine} max={50} color="#4ade80" />}
          </>
        )}
        {gun.weaponClass === "beam" && (
          <>
            <ParamBar label="DPS" value={gun.damage} max={260} color="#f87171" />
            <ParamBar label="射程" value={(gun.beamRange ?? 700) / 10} max={80} color="#22d3ee" />
            <ParamBar label="冷却" value={(gun.coolRate ?? 0.5) * 100} max={60} color="#4ade80" />
          </>
        )}
        {gun.weaponClass === "flamethrower" && (
          <>
            <ParamBar label="DPS" value={gun.damage} max={200} color="#f87171" />
            <ParamBar label="射程" value={gun.flameRange ?? 200} max={300} color="#fb923c" />
          </>
        )}
        {gun.weaponClass === "poison_mist" && (
          <>
            <ParamBar label="毒伤" value={gun.damage} max={120} color="#a3e635" />
            <ParamBar label="射程" value={gun.flameRange ?? 130} max={200} color="#84cc16" />
          </>
        )}
        {gun.weaponClass === "melee" && (
          <>
            <ParamBar label="伤害" value={gun.damage} max={140} color="#f87171" />
            <ParamBar label="攻速" value={gun.fireRate} max={8} color="#a78bfa" suffix="/s" />
            <ParamBar label="范围" value={gun.meleeRange ?? 80} max={120} color="#22d3ee" />
          </>
        )}
      </div>
    </div>
  );
}

type MainTab = "agent" | "weapons" | "skills" | "gadgets" | "mode";

export default function LoadoutScreen({
  onConfirm,
  onBack,
  isMultiplayer = false,
}: {
  onConfirm: (loadout: Loadout, mode: "local" | "host" | "guest", net: Net | null) => void;
  onBack?: () => void;
  isMultiplayer?: boolean;
}) {
  const [characterId, setCharacterId] = useState(
    () => localStorage.getItem("dm_loadout.characterId") || "raider"
  );
  const [outfitId, setOutfitId] = useState(
    () => localStorage.getItem("dm_loadout.outfitId") || "tactical"
  );
  const [gunIds, setGunIds] = useState<string[]>(() => {
    const raw = localStorage.getItem("dm_loadout.gunIds");
    if (raw) {
      try {
        const v = JSON.parse(raw);
        if (Array.isArray(v) && v.length) return v as string[];
      } catch {
        /* ignore corrupt value */
      }
    }
    return ["mac11", "sniper"];
  });
  const [skillId, setSkillId] = useState(
    () => localStorage.getItem("dm_loadout.skillId") || "dash"
  );
  const [gadgetIds, setGadgetIds] = useState<string[]>(() => {
    const raw = localStorage.getItem("dm_loadout.gadgetIds");
    if (raw) {
      try {
        const v = JSON.parse(raw);
        if (Array.isArray(v) && v.length) return v as string[];
      } catch {
        /* ignore corrupt value */
      }
    }
    return ["turret_mg", "turret_cannon", "mine_explosive"];
  });
  const [gameMode, setGameMode] = useState<"biohazard" | "deathmatch" | "team_deathmatch">(() => {
    const m = localStorage.getItem("dm_loadout.gameMode");
    return m === "biohazard" || m === "deathmatch" || m === "team_deathmatch" ? (m as never) : "biohazard";
  });
  const [dmPlayerCount, setDmPlayerCount] = useState<4 | 6 | 8 | 10>(() => {
    const p = parseInt(localStorage.getItem("dm_loadout.dmPlayerCount") || "8", 10);
    return p === 4 || p === 6 || p === 8 || p === 10 ? (p as 4 | 6 | 8 | 10) : 8;
  });
  const [isNetworkPlay, setIsNetworkPlay] = useState(false);

  const [weatherOverride, setWeatherOverride] = useState<string>(() => {
    return localStorage.getItem("dm_loadout.weatherOverride") || "random";
  });
  const [customMapTheme, setCustomMapTheme] = useState<string>(() => {
    return localStorage.getItem("dm_loadout.customMapTheme") || "random";
  });
  const [customMapLayout, setCustomMapLayout] = useState<"default" | "open" | "maze" | "fortress" | "scattered">(() => {
    return (localStorage.getItem("dm_loadout.customMapLayout") as any) || "default";
  });
  const [customMapDensity, setCustomMapDensity] = useState<"sparse" | "normal" | "dense">(() => {
    return (localStorage.getItem("dm_loadout.customMapDensity") as any) || "normal";
  });
  const [customMapTrain, setCustomMapTrain] = useState<"auto" | "always" | "never">(() => {
    return (localStorage.getItem("dm_loadout.customMapTrain") as any) || "auto";
  });
  const [customMapDecorations, setCustomMapDecorations] = useState<boolean>(() => {
    const v = localStorage.getItem("dm_loadout.customMapDecorations");
    return v !== null ? v === "true" : true;
  });

  // UI Navigation Tabs
  const [activeTab, setActiveTab] = useState<MainTab>("mode");
  const [weaponCategoryFilter, setWeaponCategoryFilter] = useState<string>("all");
  const [activeGunSlot, setActiveGunSlot] = useState<0 | 1>(0);

  // Net stuff
  const netRef = useRef<Net | null>(null);
  const [netStatus, setNetStatus] = useState<NetStatus>("idle");
  const [, setNetInfo] = useState<string>("");
  const advanced = useRef(false);

  const MATCH_MUSIC_URL =
    "https://cdn.pixabay.com/audio/2022/03/15/audio_8cb749cba8.mp3";

  useEffect(() => {
    if (netStatus === "waiting" || netStatus === "connecting") {
      sound.playMusic(MATCH_MUSIC_URL);
    } else {
      sound.stopMusic();
    }
  }, [netStatus]);

  useEffect(() => {
    return () => {
      sound.stopMusic();
      if (netRef.current) {
        netRef.current.disconnect();
        tabLock.release();
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("dm_loadout.characterId", characterId);
    localStorage.setItem("dm_loadout.outfitId", outfitId);
    localStorage.setItem("dm_loadout.gunIds", JSON.stringify(gunIds));
    localStorage.setItem("dm_loadout.skillId", skillId);
    localStorage.setItem("dm_loadout.gadgetIds", JSON.stringify(gadgetIds));
    localStorage.setItem("dm_loadout.gameMode", gameMode);
    localStorage.setItem("dm_loadout.dmPlayerCount", String(dmPlayerCount));
    localStorage.setItem("dm_loadout.weatherOverride", weatherOverride);
    localStorage.setItem("dm_loadout.customMapTheme", customMapTheme);
    localStorage.setItem("dm_loadout.customMapLayout", customMapLayout);
    localStorage.setItem("dm_loadout.customMapDensity", customMapDensity);
    localStorage.setItem("dm_loadout.customMapTrain", customMapTrain);
    localStorage.setItem("dm_loadout.customMapDecorations", String(customMapDecorations));
  }, [
    characterId,
    outfitId,
    gunIds,
    skillId,
    gadgetIds,
    gameMode,
    dmPlayerCount,
    weatherOverride,
    customMapTheme,
    customMapLayout,
    customMapDensity,
    customMapTrain,
    customMapDecorations,
  ]);

  const gunId = gunIds[0] ?? "mac11";

  const handleSelectWeapon = (id: string) => {
    setGunIds((prev) => {
      const clone = [...prev];
      if (clone.includes(id)) {
        if (clone[activeGunSlot] === id) return clone;
        const otherIdx = clone.indexOf(id);
        const cur = clone[activeGunSlot];
        clone[activeGunSlot] = id;
        if (cur) clone[otherIdx] = cur;
        return clone;
      }
      clone[activeGunSlot] = id;
      if (clone.length > 2) clone.length = 2;
      return clone;
    });
  };

  const toggleGadget = (id: string) => {
    setGadgetIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((g) => g !== id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const resetToDefaults = () => {
    setCharacterId("raider");
    setOutfitId("tactical");
    setGunIds(["mac11", "sniper"]);
    setSkillId("dash");
    setGadgetIds(["turret_mg", "turret_cannon", "mine_explosive"]);
    setGameMode("biohazard");
    setWeatherOverride("random");
    setCustomMapTheme("random");
    setCustomMapLayout("default");
    setCustomMapDensity("normal");
    setCustomMapTrain("auto");
    setCustomMapDecorations(true);
  };

  const loadout: Loadout = {
    characterId,
    outfitId,
    gunId,
    gunIds,
    skillId,
    gadgetIds,
    gameMode: isMultiplayer ? "deathmatch" : gameMode,
    dmPlayerCount,
    weatherOverride,
    customMap: {
      themeId: customMapTheme,
      layoutStyle: customMapLayout,
      density: customMapDensity,
      trainMode: customMapTrain,
      decorations: customMapDecorations,
    },
  };

  const handleStart = () => {
    sound.ensure();
    if (gameMode === "team_deathmatch" && isNetworkPlay && dmPlayerCount !== 10) {
      const handleConflict = () => {
        setNetStatus("error");
        setNetInfo("已在其他标签页开始匹配，请先关闭该标签页。");
        netRef.current?.disconnect();
      };

      const onReady = (mode: "host" | "guest", net: Net) => {
        onConfirm(loadout, mode, net);
      };

      if (!netRef.current) {
        netRef.current = new Net({
          onStatus: (s, i) => {
            setNetStatus(s);
            if (i) setNetInfo(i);
          },
          onPeer: () => {},
          onStart: () => {
            setNetStatus("ready");
            if (!advanced.current && netRef.current) {
              advanced.current = true;
              onReady(netRef.current.playerMode, netRef.current);
            }
          },
          onPeerGone: () => setNetInfo("对手掉线，正在等待重连…"),
          onPeerBack: () => {
            setNetInfo("");
            setNetStatus("ready");
          },
          onPeerLeft: () => {
            advanced.current = false;
            setNetStatus("waiting");
            setNetInfo("对手已离开，正在重新匹配…");
          },
        });
      }

      const net = netRef.current;
      const url = getServerWsUrl();

      net.connect(url, true);

      setTimeout(() => {
        tabLock.acquire(handleConflict);
        net.find("玩家", `team_deathmatch_${dmPlayerCount}`);
      }, 500);
    } else {
      onConfirm(loadout, "local", null);
    }
  };

  const character = CHARACTERS.find((c) => c.id === characterId)!;
  const outfit = OUTFITS.find((o) => o.id === outfitId)!;
  const curSkill = SKILLS.find((s) => s.id === skillId)!;
  const focusedGun = getGun(gunIds[activeGunSlot] || gunId);

  const stats = [
    {
      label: "生命",
      pct: Math.min(1, (character.maxHp + outfit.hpBonus) / 200),
      value: `${character.maxHp + outfit.hpBonus}`,
      color: "#f87171",
    },
    {
      label: "移速",
      pct: Math.min(1, (character.speed * (1 + outfit.speedBonus)) / 320),
      value: `${Math.round(character.speed * (1 + outfit.speedBonus))}`,
      color: "#22d3ee",
    },
    {
      label: "伤害",
      pct: Math.min(1, character.damageMult / 1.4),
      value: `x${character.damageMult.toFixed(2)}`,
      color: "#fbbf24",
    },
    {
      label: "射速",
      pct: Math.min(
        1,
        (character.fireRateMult * (1 + (outfit.fireRateBonus ?? 0))) / 1.25
      ),
      value: `x${(character.fireRateMult * (1 + (outfit.fireRateBonus ?? 0))).toFixed(2)}`,
      color: "#a78bfa",
    },
  ];

  const filteredGuns = GUNS.filter((g) => {
    if (weaponCategoryFilter === "all") return true;
    return gunCategory(g) === weaponCategoryFilter;
  });

  return (
    <div className="no-scrollbar min-h-screen w-full overflow-y-auto bg-gradient-to-b from-[#070818] via-[#0d0f2b] to-[#060714] text-slate-100 pt-safe pb-safe pl-safe pr-safe">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
        {/* 顶部标题栏 */}
        <header className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-300 transition hover:bg-white/15 hover:text-white"
                title="返回主菜单"
              >
                ←
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300 border border-indigo-400/30">
                  LOADOUT DECK
                </span>
                <h1 className="text-xl sm:text-2xl font-black italic tracking-wide bg-gradient-to-r from-cyan-200 via-indigo-200 to-fuchsia-200 bg-clip-text text-transparent">
                  战术军械装配台
                </h1>
              </div>
              <p className="text-[11px] text-slate-400">
                自由搭配特工角色、双持武器、战术技能与随身道具
              </p>
            </div>
          </div>

          {/* 顶部快捷操作 */}
          <div className="flex items-center gap-2">
            <button
              onClick={resetToDefaults}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              恢复默认
            </button>
            <button
              onClick={handleStart}
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-1.5 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:scale-105 active:scale-95"
            >
              {netStatus === "waiting" || netStatus === "connecting" ? "匹配中…" : "进入战场 ➔"}
            </button>
          </div>
        </header>

        {/* 核心双栏架构 */}
        <div className="grid gap-4 lg:grid-cols-[330px_1fr]">
          {/* ============ 左侧：特工装配概览与实时监控 ============ */}
          <div className="flex flex-col gap-3">
            {/* 特工实时 3D 视口 */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3 shadow-xl backdrop-blur-md">
              <CharPreview loadout={loadout} />

              {/* 角色与服饰简要 */}
              <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{character.name}</span>
                    <span className="text-[10px] font-normal text-slate-400">· {outfit.name}</span>
                  </div>
                  <div className="text-[10px] text-cyan-300">{character.perk}</div>
                </div>
                <button
                  onClick={() => setActiveTab("agent")}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-white/15"
                >
                  更换 👤
                </button>
              </div>
            </div>

            {/* 当前装备槽位速览卡片 (点击可直接切换至对应分类) */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 shadow-xl backdrop-blur-md">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>当前装配 (LOADOUT SLOTS)</span>
                <span className="text-[10px] text-indigo-300">点击卡槽配置</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* 主武器槽 */}
                <button
                  onClick={() => {
                    setActiveTab("weapons");
                    setActiveGunSlot(0);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-2 text-left transition-all",
                    activeTab === "weapons" && activeGunSlot === 0
                      ? "border-cyan-400/80 bg-cyan-950/40 shadow-md shadow-cyan-950/40"
                      : "border-white/10 bg-black/30 hover:border-white/20"
                  )}
                >
                  <WeaponIcon
                    iconShape={getGun(gunIds[0] || "mac11").iconShape}
                    glow={getGun(gunIds[0] || "mac11").glow}
                    gunId={gunIds[0] || "mac11"}
                    size={24}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-bold uppercase text-cyan-300">Slot 1 · 主武器</div>
                    <div className="truncate text-xs font-bold text-white">
                      {getGun(gunIds[0] || "mac11").name}
                    </div>
                  </div>
                </button>

                {/* 副武器槽 */}
                <button
                  onClick={() => {
                    setActiveTab("weapons");
                    setActiveGunSlot(1);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-2 text-left transition-all",
                    activeTab === "weapons" && activeGunSlot === 1
                      ? "border-indigo-400/80 bg-indigo-950/40 shadow-md shadow-indigo-950/40"
                      : "border-white/10 bg-black/30 hover:border-white/20"
                  )}
                >
                  <WeaponIcon
                    iconShape={getGun(gunIds[1] || "sniper").iconShape}
                    glow={getGun(gunIds[1] || "sniper").glow}
                    gunId={gunIds[1] || "sniper"}
                    size={24}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-bold uppercase text-indigo-300">Slot 2 · 副武器</div>
                    <div className="truncate text-xs font-bold text-white">
                      {getGun(gunIds[1] || "sniper").name}
                    </div>
                  </div>
                </button>

                {/* 特工技能槽 */}
                <button
                  onClick={() => setActiveTab("skills")}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-2 text-left transition-all",
                    activeTab === "skills"
                      ? "border-purple-400/80 bg-purple-950/40 shadow-md shadow-purple-950/40"
                      : "border-white/10 bg-black/30 hover:border-white/20"
                  )}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-500/20 text-base">
                    {curSkill.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-bold uppercase text-purple-300">战术技能 (Q)</div>
                    <div className="truncate text-xs font-bold text-white">{curSkill.name}</div>
                  </div>
                </button>

                {/* 战术道具槽 */}
                <button
                  onClick={() => setActiveTab("gadgets")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border p-2 text-left transition-all",
                    activeTab === "gadgets"
                      ? "border-emerald-400/80 bg-emerald-950/40 shadow-md shadow-emerald-950/40"
                      : "border-white/10 bg-black/30 hover:border-white/20"
                  )}
                >
                  <div className="flex -space-x-1">
                    {gadgetIds.slice(0, 3).map((gid) => {
                      const g = GADGETS.find((item) => item.id === gid);
                      return (
                        <div
                          key={gid}
                          className="grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-black/70 shadow"
                        >
                          {g && <GadgetIconCanvas iconShape={g.iconShape} color={g.color} size={18} />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="min-w-0 flex-1 pl-1">
                    <div className="text-[9px] font-bold uppercase text-emerald-300">战术道具</div>
                    <div className="truncate text-xs font-bold text-white">已选 {gadgetIds.length}/3</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 属性仪表与选中武器数据 */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 shadow-xl backdrop-blur-md space-y-3">
              {/* 核心属性 */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  特工属性综合指标
                </div>
                {stats.map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="w-8 text-[10px] text-slate-400 font-medium">{s.label}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${s.pct * 100}%`,
                          backgroundColor: s.color,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right text-[10px] font-mono font-bold text-slate-300">
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* 选中武器详细参数 */}
              <WeaponDetail gun={focusedGun} />
            </div>
          </div>

          {/* ============ 右侧：分类标签页与选择控制台 ============ */}
          <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-xl backdrop-blur-md">
            {/* 顶部主选项卡切换：对战模式 vs 装备军械库 */}
            <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("mode")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all",
                    activeTab === "mode"
                      ? "border-cyan-400 bg-gradient-to-r from-cyan-500/25 to-indigo-500/25 text-white shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/40"
                      : "border-white/10 bg-black/30 text-slate-400 hover:border-white/20 hover:text-slate-200"
                  )}
                >
                  <span>🎮 对战模式 & 地图</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.2 text-[9px] font-semibold",
                      activeTab === "mode" ? "bg-cyan-400/30 text-cyan-200" : "bg-white/10 text-slate-400"
                    )}
                  >
                    {gameMode === "biohazard" ? "生化挑战" : "死斗竞技"}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab(activeTab === "mode" ? "weapons" : activeTab)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all",
                    activeTab !== "mode"
                      ? "border-cyan-400 bg-gradient-to-r from-cyan-500/25 to-indigo-500/25 text-white shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/40"
                      : "border-white/10 bg-black/30 text-slate-400 hover:border-white/20 hover:text-slate-200"
                  )}
                >
                  <span>🔫 武器与特工装备</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.2 text-[9px] font-semibold",
                      activeTab !== "mode" ? "bg-cyan-400/30 text-cyan-200" : "bg-white/10 text-slate-400"
                    )}
                  >
                    已装配 2 枪 3 道具
                  </span>
                </button>
              </div>

              {/* 处于装备库时显示的子分类标签与返回模式按钮 */}
              {activeTab !== "mode" && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: "weapons", label: "🔫 武器库" },
                    { id: "agent", label: "👤 特工" },
                    { id: "skills", label: "⚡ 技能" },
                    { id: "gadgets", label: "🧰 道具" },
                  ].map((sub) => {
                    const subActive = activeTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setActiveTab(sub.id as MainTab)}
                        className={cn(
                          "rounded-lg border px-2 py-1 text-[11px] font-bold transition-all",
                          subActive
                            ? "border-indigo-400 bg-indigo-500/30 text-indigo-100 shadow"
                            : "border-white/10 bg-black/40 text-slate-400 hover:text-white"
                        )}
                      >
                        {sub.label}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setActiveTab("mode")}
                    className="ml-1 rounded-lg border border-cyan-400/30 bg-cyan-950/40 px-2 py-1 text-[11px] font-bold text-cyan-200 hover:bg-cyan-500/20"
                  >
                    完成选择 ➔
                  </button>
                </div>
              )}
            </div>

            {/* TAB 1: 军械武器库 */}
            {activeTab === "weapons" && (
              <div className="flex flex-col gap-3">
                {/* 槽位切换条与分类过滤芯片 */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-black/40 p-2.5">
                  {/* 装配槽位指示 */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">装配到:</span>
                    <button
                      onClick={() => setActiveGunSlot(0)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-bold transition-all",
                        activeGunSlot === 0
                          ? "border-cyan-400 bg-cyan-500/25 text-cyan-200 shadow"
                          : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                      )}
                    >
                      <span>Slot 1 主武器</span>
                      <span className="text-[10px] text-cyan-300">({getGun(gunIds[0] || "mac11").name})</span>
                    </button>
                    <button
                      onClick={() => setActiveGunSlot(1)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-bold transition-all",
                        activeGunSlot === 1
                          ? "border-indigo-400 bg-indigo-500/25 text-indigo-200 shadow"
                          : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                      )}
                    >
                      <span>Slot 2 副武器</span>
                      <span className="text-[10px] text-indigo-300">({getGun(gunIds[1] || "sniper").name})</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400 hidden md:inline">
                    按 1/2 或 滚轮在局内自由切换
                  </span>
                </div>

                {/* 武器类型筛选芯片 */}
                <div className="flex flex-wrap gap-1.5">
                  {GUN_GROUPS.map((grp) => {
                    const active = weaponCategoryFilter === grp.key;
                    const count =
                      grp.key === "all" ? GUNS.length : GUNS.filter((g) => gunCategory(g) === grp.key).length;
                    return (
                      <button
                        key={grp.key}
                        onClick={() => setWeaponCategoryFilter(grp.key)}
                        className={cn(
                          "flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all",
                          active
                            ? "border-indigo-400 bg-indigo-500/20 text-white font-bold"
                            : "border-white/5 bg-black/20 text-slate-400 hover:border-white/15 hover:text-slate-300"
                        )}
                      >
                        <span>{grp.label}</span>
                        <span className="text-[10px] opacity-70">({count})</span>
                      </button>
                    );
                  })}
                </div>

                {/* 武器卡片网格 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">
                  {filteredGuns.map((g) => {
                    const slot0 = gunIds[0] === g.id;
                    const slot1 = gunIds[1] === g.id;
                    const isSelected = slot0 || slot1;

                    return (
                      <button
                        key={g.id}
                        onClick={() => handleSelectWeapon(g.id)}
                        className={cn(
                          "group relative flex flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left transition-all",
                          isSelected
                            ? "border-cyan-400/80 bg-cyan-950/30 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-400/40"
                            : "border-white/10 bg-black/30 hover:border-white/25 hover:bg-black/50"
                        )}
                      >
                        {/* 槽位角标 */}
                        {slot0 && (
                          <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-black text-slate-950 shadow">
                            1
                          </span>
                        )}
                        {slot1 && (
                          <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-400 text-[10px] font-black text-white shadow">
                            2
                          </span>
                        )}

                        <div className="flex w-full items-center justify-between">
                          <WeaponIcon iconShape={g.iconShape} glow={g.glow} gunId={g.id} size={28} />
                          <span
                            className="rounded px-1.5 py-0.2 text-[9px] font-bold"
                            style={{
                              backgroundColor: rgba(g.glow, 0.2),
                              color: g.glow,
                            }}
                          >
                            {g.weaponClass === "melee"
                              ? "近战"
                              : g.weaponClass === "beam"
                              ? "激光"
                              : g.weaponClass === "shotgun"
                              ? "霰弹"
                              : "枪械"}
                          </span>
                        </div>

                        <div className="w-full">
                          <div className="truncate text-xs font-bold text-white group-hover:text-cyan-200">
                            {g.name}
                          </div>
                          <div className="mt-0.5 truncate text-[10px] text-slate-400">{g.desc}</div>
                        </div>

                        <div className="flex w-full items-center justify-between border-t border-white/5 pt-1 text-[10px] font-mono text-slate-300">
                          <span>伤 {g.damage}</span>
                          {g.fireRate > 0 && <span>速 {g.fireRate}/s</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: 特工角色与作战服饰 */}
            {activeTab === "agent" && (
              <div className="flex flex-col gap-4">
                {/* 角色选择 */}
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <span>特工职业 (CHARACTERS)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {CHARACTERS.map((c) => {
                      const active = c.id === characterId;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setCharacterId(c.id)}
                          className={cn(
                            "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all",
                            active
                              ? "border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400"
                              : "border-white/10 bg-black/30 hover:border-white/20 hover:bg-black/50"
                          )}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span
                              className="h-7 w-7 rounded-full border-2 shadow"
                              style={{
                                backgroundColor: c.bodyColor,
                                borderColor: c.accent,
                              }}
                            />
                            <span className="text-[10px] font-mono text-slate-400">{c.title}</span>
                          </div>
                          <span className="text-sm font-bold text-white">{c.name}</span>
                          <span className="text-[10px] text-cyan-300 leading-snug">{c.perk}</span>
                          <span className="text-[9px] text-slate-400 leading-tight">{c.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 服饰皮肤选择 */}
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <span>作战服饰 & 外观皮肤 (OUTFITS)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[36vh] overflow-y-auto pr-1 no-scrollbar">
                    {OUTFITS.map((o) => {
                      const active = o.id === outfitId;
                      return (
                        <button
                          key={o.id}
                          onClick={() => setOutfitId(o.id)}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border p-2 text-left transition-all",
                            active
                              ? "border-indigo-400 bg-indigo-950/40 shadow-md shadow-indigo-950/30 ring-1 ring-indigo-400"
                              : "border-white/10 bg-black/30 hover:border-white/20 hover:bg-black/50"
                          )}
                        >
                          <span
                            className="h-8 w-8 rounded-lg border shrink-0"
                            style={{
                              backgroundColor: o.suit,
                              borderColor: o.accent,
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-bold text-white">{o.name}</div>
                            <div className="truncate text-[10px] text-emerald-300/90">{o.perk}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: 战术技能 */}
            {activeTab === "skills" && (
              <div className="flex flex-col gap-3">
                <div className="text-xs text-slate-400">
                  按 <kbd className="rounded bg-white/10 px-1 py-0.5 font-bold text-white">Q</kbd> 或空格释放特工技能，关键时刻逆转战局
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {SKILLS.map((s) => {
                    const active = s.id === skillId;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSkillId(s.id)}
                        className={cn(
                          "flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition-all",
                          active
                            ? "border-purple-400 bg-purple-950/30 shadow-xl shadow-purple-950/40 ring-1 ring-purple-400"
                            : "border-white/10 bg-black/30 hover:border-white/25 hover:bg-black/50"
                        )}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/20 text-2xl border border-purple-400/20">
                            {s.icon}
                          </span>
                          <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold font-mono text-purple-200">
                            {s.id === "dash" ? "3段蓄力" : `CD ${s.cooldown}s`}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{s.name}</div>
                          <div className="mt-1 text-[11px] text-slate-400 leading-relaxed">{s.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: 战术道具 */}
            {activeTab === "gadgets" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    可自选 3 种随身战术道具，按 <kbd className="rounded bg-white/10 px-1 py-0.5 font-bold text-white">1/2/3</kbd> 选择并左键部署
                  </div>
                  <span className="text-xs font-bold text-emerald-300">
                    已装备 {gadgetIds.length} / 3
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">
                  {GADGETS.map((gd) => {
                    const idx = gadgetIds.indexOf(gd.id);
                    const selected = idx >= 0;

                    return (
                      <button
                        key={gd.id}
                        onClick={() => toggleGadget(gd.id)}
                        className={cn(
                          "group relative flex flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left transition-all",
                          selected
                            ? "border-emerald-400 bg-emerald-950/30 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-400"
                            : "border-white/10 bg-black/30 hover:border-white/20 hover:bg-black/50"
                        )}
                      >
                        {selected && (
                          <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-black text-slate-950 shadow">
                            {idx + 1}
                          </span>
                        )}

                        <div className="flex w-full items-center justify-between">
                          <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/5">
                            <GadgetIconCanvas iconShape={gd.iconShape} color={gd.color} size={22} />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">CD {gd.cooldown}s</span>
                        </div>

                        <div className="w-full">
                          <div className="text-xs font-bold text-white group-hover:text-emerald-200">
                            {gd.name}
                          </div>
                          <div className="mt-0.5 text-[10px] text-slate-400 leading-snug line-clamp-2">
                            {gd.desc}
                          </div>
                        </div>

                        {gd.maxStack && (
                          <div className="text-[9px] text-emerald-400/80 font-mono">
                            上限 {gd.maxStack} 组
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 5: 对战模式 & 地图天气设置 */}
            {activeTab === "mode" && (
              <div className="flex flex-col gap-4 max-h-[55vh] overflow-y-auto pr-1 no-scrollbar">
                {/* 核心游戏模式 */}
                {!isMultiplayer && (
                  <div>
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                      游戏主模式 (GAME MODE)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        onClick={() => setGameMode("biohazard")}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                          gameMode === "biohazard"
                            ? "border-lime-400 bg-lime-950/30 shadow ring-1 ring-lime-400"
                            : "border-white/10 bg-black/30 hover:border-white/20"
                        )}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="text-sm font-bold text-white">🧟 生存挑战</span>
                          <span className="text-xs text-lime-300 font-bold">PVE</span>
                        </div>
                        <span className="text-[10px] text-slate-400">无限波次生化尸潮生存</span>
                      </button>

                      <button
                        onClick={() => {
                          setGameMode("deathmatch");
                          if (dmPlayerCount === 10) setDmPlayerCount(8);
                        }}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                          gameMode === "deathmatch"
                            ? "border-fuchsia-400 bg-fuchsia-950/30 shadow ring-1 ring-fuchsia-400"
                            : "border-white/10 bg-black/30 hover:border-white/20"
                        )}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="text-sm font-bold text-white">⚔️ 个人死斗</span>
                          <span className="text-xs text-fuchsia-300 font-bold">FREE FOR ALL</span>
                        </div>
                        <span className="text-[10px] text-slate-400">单人混战，先达击杀获胜</span>
                      </button>

                      <button
                        onClick={() => setGameMode("team_deathmatch")}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
                          gameMode === "team_deathmatch"
                            ? "border-violet-400 bg-violet-950/30 shadow ring-1 ring-violet-400"
                            : "border-white/10 bg-black/30 hover:border-white/20"
                        )}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="text-sm font-bold text-white">🛡️ 团队死斗</span>
                          <span className="text-xs text-violet-300 font-bold">TEAM PVP</span>
                        </div>
                        <span className="text-[10px] text-slate-400">小队对抗，团队积分竞技</span>
                      </button>
                    </div>

                    {/* 规模选择 */}
                    {(gameMode === "deathmatch" || gameMode === "team_deathmatch") && (
                      <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-2.5">
                        <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-300">
                          <span>对局规模与击杀上限</span>
                          <span className="text-[10px] text-indigo-300">当前选择: {dmPlayerCount}人</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { count: 4, label: "4人", kills: 15 },
                            { count: 6, label: "6人", kills: 18 },
                            { count: 8, label: "8人", kills: 24 },
                            { count: 10, label: "5v5", kills: 30 },
                          ].map((opt) => (
                            <button
                              key={opt.count}
                              onClick={() => setDmPlayerCount(opt.count as 4 | 6 | 8 | 10)}
                              className={cn(
                                "flex flex-col items-center justify-center rounded-lg border py-1.5 text-xs font-bold transition-all",
                                dmPlayerCount === opt.count
                                  ? "border-indigo-400 bg-indigo-500/25 text-white shadow"
                                  : "border-white/10 bg-black/40 text-slate-400 hover:border-white/20"
                              )}
                            >
                              <span>{opt.label}</span>
                              <span className="text-[9px] opacity-70">{opt.kills} 杀目标</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 地图风格自选 */}
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                    🗺️ 场景风格 (SCENE THEME)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {ADVANCED_MAP_THEMES.map((theme) => {
                      const active = customMapTheme === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => setCustomMapTheme(theme.id)}
                          className={cn(
                            "flex flex-col items-start rounded-xl border p-2 text-left transition-all",
                            active
                              ? "border-indigo-400 bg-indigo-500/20 text-white shadow"
                              : "border-white/5 bg-black/30 text-slate-400 hover:border-white/20"
                          )}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="text-xs font-bold text-slate-100">{theme.name}</span>
                            <span className="text-[10px]" style={{ color: theme.color }}>
                              ●
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-400 line-clamp-1">{theme.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 战术天气与结构 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="mb-1.5 text-xs font-bold text-slate-300">🏗️ 战术结构</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ADVANCED_MAP_LAYOUTS.slice(0, 4).map((l) => (
                        <button
                          key={l.id}
                          onClick={() => setCustomMapLayout(l.id as any)}
                          className={cn(
                            "rounded-lg border px-2 py-1 text-left text-xs font-bold transition-all",
                            customMapLayout === l.id
                              ? "border-indigo-400 bg-indigo-500/25 text-white"
                              : "border-white/5 bg-black/30 text-slate-400 hover:border-white/15"
                          )}
                        >
                          {l.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 text-xs font-bold text-slate-300">🌦️ 气象系统</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {ADVANCED_WEATHERS.slice(0, 4).map((w) => (
                        <button
                          key={w.id}
                          onClick={() => setWeatherOverride(w.id)}
                          className={cn(
                            "rounded-lg border px-2 py-1 text-center text-xs font-bold transition-all",
                            weatherOverride === w.id
                              ? "border-cyan-400 bg-cyan-500/25 text-cyan-200"
                              : "border-white/5 bg-black/30 text-slate-400 hover:border-white/15"
                          )}
                        >
                          {w.icon} {w.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部按键指引 */}
        <footer className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400 border-t border-white/5 pt-3">
          <span><kbd className="rounded bg-white/10 px-1 py-0.5 text-slate-200">WASD</kbd> 移动</span>
          <span><kbd className="rounded bg-white/10 px-1 py-0.5 text-slate-200">鼠标左键</kbd> 射击</span>
          <span><kbd className="rounded bg-white/10 px-1 py-0.5 text-slate-200">鼠标右键</kbd> 近战/格挡</span>
          <span><kbd className="rounded bg-white/10 px-1 py-0.5 text-slate-200">Q</kbd> 战术技能</span>
          <span><kbd className="rounded bg-white/10 px-1 py-0.5 text-slate-200">E / 滚轮</kbd> 切枪</span>
          <span><kbd className="rounded bg-white/10 px-1 py-0.5 text-slate-200">1/2/3</kbd> 道具</span>
          <span><kbd className="rounded bg-white/10 px-1 py-0.5 text-slate-200">Esc</kbd> 设置</span>
        </footer>
      </div>
    </div>
  );
}
