import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CHARACTERS,
  GUNS,
  OUTFITS,
  SKILLS,
  GADGETS,
  SCENES,
  getGun,
} from "../game/content";
import { sound } from "../game/sound";
import type { Loadout, CustomMapConfig } from "../game/engine";
import type { GunDef } from "../game/types";
import { drawCharacter, drawWeaponIcon, drawWeaponModel, drawGadgetIcon, rgba } from "../game/draw";
import { cn } from "../utils/cn";
import { Net, type NetStatus } from "../net/Net";
import { tabLock } from "../utils/tabLock";

export const ADVANCED_MAP_THEMES = [
  { id: "random", name: "🎲 随机场景", desc: "每次对局随机生成独特世界", color: "#6366f1", icon: "🎲" },
  { id: "neon", name: "🏙️ 霓虹都市", desc: "赛博高楼与霓虹天际线", color: "#818cf8", icon: "🏙️" },
  { id: "desert", name: "🏜️ 沙漠废墟", desc: "西部沙龙酒吧、仙人掌与木结构建筑", color: "#d97706", icon: "🏜️" },
  { id: "arctic", name: "❄️ 冰原基地", desc: "积雪冰原、极地特快列车与科研哨所", color: "#38bdf8", icon: "❄️" },
  { id: "ruin", name: "🏚️ 末日废墟", desc: "坍塌厂房、藤蔓石垣与散乱残骸", color: "#f87171", icon: "🏚️" },
  { id: "cyber", name: "🌌 赛博都市", desc: "蓝紫光幕天台与全息能量塔", color: "#00f0ff", icon: "🌌" },
  { id: "wild_west", name: "🤠 西部牛仔", desc: "经典木质沙龙、边境工坊与仙人掌", color: "#f59e0b", icon: "🤠" },
  { id: "jungle", name: "🌿 幽静丛林", desc: "茂密古树、藤蔓神庙与温馨木屋", color: "#4ade80", icon: "🌿" },
  { id: "arctic_zone", name: "🏔️ 极寒地带", desc: "终年冻土、极地列车与冰川堡垒", color: "#0284c7", icon: "🏔️" },
];

export const ADVANCED_MAP_LAYOUTS = [
  { id: "default", name: "⚖️ 经典平衡", desc: "场景特色对称建筑与掩体布局" },
  { id: "open", name: "🏟️ 开放竞技场", desc: "超大视野，适合中远距离极速刚枪" },
  { id: "maze", name: "🧱 迷宫巷战", desc: "纵横密集窄巷，适合近距离拐角拼枪" },
  { id: "fortress", name: "🏰 堡垒要塞", desc: "中央重装堡垒与四方外围防御哨" },
  { id: "scattered", name: "🎲 战术废墟", desc: "散落的散兵掩体、木箱石堆与残垣" },
];

export const ADVANCED_WEATHERS = [
  { id: "random", label: "随机", icon: "🎲", desc: "对局自动随机气象" },
  { id: "clear", label: "晴天", icon: "☀️", desc: "晴空万里，视野极佳" },
  { id: "fog", label: "大雾", icon: "🌫️", desc: "迷雾笼罩，近距作战" },
  { id: "overcast", label: "阴天", icon: "☁️", desc: "阴云密布，柔和光照" },
  { id: "rain", label: "雨天", icon: "🌧️", desc: "暴雨倾盆，雨滴水花" },
  { id: "snow", label: "雪天", icon: "❄️", desc: "漫天飞雪，晶莹雪花" },
  { id: "sandstorm", label: "沙尘", icon: "🌪️", desc: "狂暴沙尘，橙黄风暴" },
];

/** Weapon categories shown in the loadout picker (ordered). */
const GUN_GROUPS: { key: string; label: string }[] = [
  { key: "pistol", label: "手枪" },
  { key: "smg", label: "冲锋枪" },
  { key: "rifle", label: "步枪" },
  { key: "shotgun", label: "霰弹" },
  { key: "sniper", label: "狙击" },
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
      g.addColorStop(0, "rgba(99,102,241,0.18)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2, h / 2 + 26);
      ctx.scale(1, 0.42);
      ctx.strokeStyle = "rgba(148,163,184,0.35)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 70, 0, Math.PI * 2);
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
      className="relative flex items-center justify-center rounded-2xl bg-[#0f1129]/80 border border-white/10 p-4 shadow-xl backdrop-blur-md"
    >
      <canvas ref={canvasRef} style={{ width: 220, height: 260 }} />
    </div>
  );
}

/** Small canvas rendering actual detailed in-game weapon model. */
function WeaponIcon({
  iconShape,
  glow,
  gunId,
  size = 36,
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
    const gun = gunId ? getGun(gunId) : GUNS.find(g => g.iconShape === iconShape || g.glow === glow);
    if (gun) {
      drawWeaponModel(ctx, gun, size / 2, size / 2, size * 0.9);
    } else {
      drawWeaponIcon(ctx, iconShape, size / 2, size / 2, size * 0.78, glow);
    }
  }, [iconShape, glow, gunId, size]);
  return (
    <div
      className="flex items-center justify-center rounded-xl p-2.5 bg-white/[0.04] border border-white/[0.06] transition-transform duration-200"
      style={{
        boxShadow: `0 0 15px ${glow}10, inset 0 0 8px ${glow}05`,
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
  size = 28,
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
    <div className="flex items-center gap-2">
      <span className="w-14 text-[10px] text-slate-400">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-10 text-right text-[10px] font-mono text-slate-300">
        {value.toFixed(value < 10 ? 1 : 0)}
        {suffix}
      </span>
    </div>
  );
}

/** Detailed weapon info panel shown when a weapon is selected. */
function WeaponDetail({ gun }: { gun: GunDef }) {
  const classLabel =
    gun.weaponClass === "melee"
      ? "近战"
      : gun.weaponClass === "beam"
      ? "激光"
      : gun.weaponClass === "flamethrower"
      ? "喷射"
      : "远程";
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="mb-2 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-white/5">
          <WeaponIcon iconShape={gun.iconShape} glow={gun.glow} gunId={gun.id} size={32} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{gun.name}</span>
            <span
              className="rounded px-1.5 py-0.5 text-[9px] font-semibold"
              style={{
                backgroundColor: rgba(gun.glow, 0.2),
                color: gun.glow,
              }}
            >
              {classLabel}
            </span>
            {gun.rangeTier && (
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-slate-300">
                {gun.rangeTier}距离
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400">{gun.desc}</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {gun.weaponClass === "ranged" && (
          <>
            <ParamBar label="伤害" value={gun.damage} max={140} color="#f87171" />
            <ParamBar label="射速" value={gun.fireRate} max={12} color="#a78bfa" suffix="/s" />
            <ParamBar
              label="弹速"
              value={gun.bulletSpeed / 100}
              max={18}
              color="#22d3ee"
            />
            <ParamBar label="击退" value={gun.knockback} max={420} color="#fb923c" />
            {gun.magazine && (
              <ParamBar label="弹匣" value={gun.magazine} max={30} color="#4ade80" />
            )}
            {gun.pellets > 1 && (
              <ParamBar label="弹片" value={gun.pellets} max={9} color="#fbbf24" />
            )}
            {gun.pierce > 0 && (
              <ParamBar label="穿透" value={gun.pierce} max={5} color="#c084fc" />
            )}
          </>
        )}
        {gun.weaponClass === "beam" && (
          <>
            <ParamBar label="DPS" value={gun.damage} max={260} color="#f87171" />
            <ParamBar label="射程" value={(gun.beamRange ?? 700) / 10} max={80} color="#22d3ee" />
            <ParamBar
              label="冷却"
              value={(gun.coolRate ?? 0.5) * 100}
              max={60}
              color="#4ade80"
            />
          </>
        )}
        {gun.weaponClass === "flamethrower" && (
          <>
            <ParamBar label="DPS" value={gun.damage} max={120} color="#f87171" />
            <ParamBar label="射程" value={gun.flameRange ?? 150} max={200} color="#fb923c" />
            <ParamBar
              label="锥角"
              value={((gun.flameCone ?? 0.4) * 180) / Math.PI}
              max={30}
              color="#fbbf24"
              suffix="°"
            />
          </>
        )}
        {gun.weaponClass === "poison_mist" && (
          <>
            <ParamBar label="毒伤" value={gun.damage} max={120} color="#a3e635" />
            <ParamBar label="射程" value={gun.flameRange ?? 130} max={200} color="#84cc16" />
            <ParamBar
              label="锥角"
              value={((gun.flameCone ?? 0.34) * 180) / Math.PI}
              max={30}
              color="#fbbf24"
              suffix="°"
            />
          </>
        )}
        {gun.weaponClass === "melee" && (
          <>
            <ParamBar label="伤害" value={gun.damage} max={65} color="#f87171" />
            <ParamBar label="攻速" value={gun.fireRate} max={8} color="#a78bfa" suffix="/s" />
            <ParamBar label="范围" value={gun.meleeRange ?? 60} max={100} color="#22d3ee" />
            <ParamBar label="击退" value={gun.knockback} max={340} color="#fb923c" />
            {gun.slamDamage && (
              <ParamBar label="砸地" value={gun.slamDamage} max={150} color="#fbbf24" />
            )}
            {gun.comboLength && (
              <ParamBar label="连段" value={gun.comboLength} max={3} color="#c084fc" />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function PickCard({
  active,
  onClick,
  accent,
  children,
}: {
  active: boolean;
  onClick: () => void;
  accent?: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex min-w-[84px] flex-col items-center gap-1 rounded-xl border px-3 py-2 text-center transition-all",
        active
          ? "border-transparent bg-white/10 shadow-lg"
          : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
      )}
      style={active && accent ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}
    >
      {children}
    </button>
  );
}

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
    const p = parseInt(localStorage.getItem("dm_loadout.dmPlayerCount") || "4", 10);
    return (p === 4 || p === 6 || p === 8 || p === 10) ? (p as 4 | 6 | 8 | 10) : 4;
  });
  const [isNetworkPlay, setIsNetworkPlay] = useState(false);
  
  const [weatherOverride, setWeatherOverride] = useState<string>(() => {
    return localStorage.getItem("dm_loadout.weatherOverride") || "random";
  });

  // Custom Map & Advanced Settings State
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

  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [advancedTab, setAdvancedTab] = useState<"map" | "weather">("map");
  
  // Net stuff
  const netRef = useRef<Net | null>(null);
  const [netStatus, setNetStatus] = useState<NetStatus>("idle");
  const [netInfo, setNetInfo] = useState<string>("");
  const advanced = useRef(false);

  // 联机匹配时循环播放的外链背景音乐 —— 换成你自己的链接即可。
  const MATCH_MUSIC_URL =
    "https://cdn.pixabay.com/audio/2022/03/15/audio_8cb749cba8.mp3";

  // 进入匹配（connecting / waiting）时播放音乐，匹配成功或离开时停止。
  useEffect(() => {
    if (netStatus === "waiting" || netStatus === "connecting") {
      sound.playMusic(MATCH_MUSIC_URL);
    } else {
      sound.stopMusic();
    }
  }, [netStatus]);

  // 卸载本界面（取消匹配/返回菜单）时确保停止音乐。
  useEffect(() => {
    return () => sound.stopMusic();
  }, []);

  useEffect(() => {
    return () => {
      if (netRef.current) {
        netRef.current.disconnect();
        tabLock.release();
      }
    };
  }, []);

  // remember the last picked loadout so quitting & re-entering doesn't force a
  // full re-selection every time.
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
  const toggleGun = (id: string) => {
    setGunIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((g) => g !== id);
      }
      if (prev.length >= 2) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };
  const toggleGadget = (id: string) => {
    setGadgetIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((g) => g !== id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  /** Wipe the saved loadout and fall back to the factory defaults. */
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
      const url = typeof window !== "undefined" && window.location.protocol === "https:" 
        ? `wss://${window.location.host}` 
        : "ws://localhost:8080";
        
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
  const selectedGun = getGun(gunId);

  const stats = [
    {
      label: "生命",
      pct: Math.min(
        1,
        (character.maxHp + outfit.hpBonus) / 200
      ),
      color: "#f87171",
    },
    {
      label: "速度",
      pct: Math.min(1, character.speed * (1 + outfit.speedBonus) / 320),
      color: "#22d3ee",
    },
    { label: "伤害", pct: Math.min(1, character.damageMult / 1.4), color: "#fbbf24" },
    {
      label: "射速",
      pct: Math.min(
        1,
        character.fireRateMult * (1 + (outfit.fireRateBonus ?? 0)) / 1.25
      ),
      color: "#a78bfa",
    },
  ];

  return (
    <div className="no-scrollbar min-h-screen w-full overflow-y-auto bg-gradient-to-b from-[#0f1030] via-[#13143a] to-[#0b0c22] text-slate-100 pt-safe pb-safe pl-safe pr-safe">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <header className="mb-6 text-center">
          <h1 className="finals-title bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-4xl tracking-tight text-transparent sm:text-5xl">
            FIRING STICKERS
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            俯视角射击 · 搭配人物、武器、技能与道具
          </p>
          <p className="mt-1 text-[11px] text-emerald-400/80">
            配置会自动保存
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          {/* Preview */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#1b1c3a] to-[#10112a]">
              <CharPreview loadout={loadout} />
            </div>
            <div className="mt-3 space-y-2">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="w-10 text-xs text-slate-400">{s.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${s.pct * 100}%`,
                        backgroundColor: s.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-black/30 p-3 text-xs leading-relaxed text-slate-300">
              <span className="font-semibold text-white">
                {character.name}
              </span>{" "}
              · {character.perk}
              <br />
              {character.desc}
            </div>
            {/* Selected weapon detail */}
            <div className="mt-3">
              <WeaponDetail gun={selectedGun} />
            </div>
          </div>

          {/* Selectors */}
          <div className="space-y-5">
            <Section label="人物">
              {CHARACTERS.map((c) => (
                <PickCard
                  key={c.id}
                  active={c.id === characterId}
                  accent={c.bodyColor}
                  onClick={() => setCharacterId(c.id)}
                >
                  <span
                    className="h-8 w-8 rounded-full border-2"
                    style={{
                      backgroundColor: c.bodyColor,
                      borderColor: c.accent,
                    }}
                  />
                  <span className="text-xs font-semibold">{c.name}</span>
                  <span className="text-[10px] text-slate-400">{c.title}</span>
                </PickCard>
              ))}
            </Section>

            <Section label="服饰">
              {OUTFITS.map((o) => (
                <PickCard
                  key={o.id}
                  active={o.id === outfitId}
                  accent={o.accent}
                  onClick={() => setOutfitId(o.id)}
                >
                  <span
                    className="h-8 w-8 rounded-md border-2"
                    style={{
                      backgroundColor: o.suit,
                      borderColor: o.accent,
                    }}
                  />
                  <span className="text-xs font-semibold">{o.name}</span>
                  <span className="text-[10px] text-emerald-300/80">
                    {o.perk}
                  </span>
                </PickCard>
              ))}
            </Section>

            <Section label={`武器（已选 ${gunIds.length}/2）`}>
              {GUN_GROUPS.map((grp) => {
                const guns = GUNS.filter((g) => gunCategory(g) === grp.key);
                if (!guns.length) return null;
                return (
                  <div key={grp.key} className="w-full">
                    <div className="mb-1.5 flex items-baseline gap-1.5 border-b border-white/5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {grp.label}
                      <span className="font-normal text-slate-600">{guns.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {guns.map((g) => {
                        const idx = gunIds.indexOf(g.id);
                        const selected = idx >= 0;
                        return (
                          <PickCard
                            key={g.id}
                            active={selected}
                            accent={g.glow}
                            onClick={() => toggleGun(g.id)}
                          >
                            {selected && (
                              <span className="absolute -top-1.5 -left-1.5 grid h-5 w-5 place-items-center rounded-full bg-cyan-400 text-[10px] font-bold text-slate-900">
                                {idx + 1}
                              </span>
                            )}
                            <WeaponIcon iconShape={g.iconShape} glow={g.glow} gunId={g.id} size={32} />
                            <span className="text-xs font-semibold">{g.name}</span>
                            <span className="text-[10px] text-slate-400">
                              {g.weaponClass === "melee"
                                ? "近战"
                                : g.weaponClass === "beam"
                                ? `${g.damage} 激光/秒`
                                : g.weaponClass === "flamethrower"
                                ? `${g.damage} 火焰/秒`
                                : g.weaponClass === "bow"
                                ? "蓄力弓"
                                : g.weaponClass === "shield"
                                ? "盾牌"
                                : `DMG ${g.damage} · ${g.fireRate}/s`}
                            </span>
                          </PickCard>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </Section>

            <Section label="技能">
              {SKILLS.map((s) => (
                <PickCard
                  key={s.id}
                  active={s.id === skillId}
                  accent={s.color}
                  onClick={() => setSkillId(s.id)}
                >
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-xs font-semibold">{s.name}</span>
                  <span className="text-[10px] text-slate-400">
                    {s.id === "dash" ? "蓄力3段" : `CD ${s.cooldown}s`}
                  </span>
                </PickCard>
              ))}
            </Section>

            <Section label={`道具（已选 ${gadgetIds.length}/3）`}>
              {GADGETS.map((gd) => {
                const idx = gadgetIds.indexOf(gd.id);
                const selected = idx >= 0;
                return (
                  <PickCard
                    key={gd.id}
                    active={selected}
                    accent={gd.color}
                    onClick={() => toggleGadget(gd.id)}
                  >
                    {selected && (
                      <span className="absolute -top-1.5 -left-1.5 grid h-5 w-5 place-items-center rounded-full bg-cyan-400 text-[10px] font-bold text-slate-900">
                        {idx + 1}
                      </span>
                    )}
                    <GadgetIconCanvas iconShape={gd.iconShape} color={gd.color} size={32} />
                    <span className="text-xs font-semibold">{gd.name}</span>
                    <span className="text-[10px] text-slate-400">CD {gd.cooldown}s</span>
                    <span className="text-[9px] leading-tight text-slate-500">
                      {gd.desc}
                    </span>
                  </PickCard>
                );
              })}
            </Section>
          </div>
        </div>

            {!isMultiplayer && (
              <Section label="游戏模式">
                <PickCard
                  active={gameMode === "biohazard"}
                  accent="#a3e635"
                  onClick={() => setGameMode("biohazard")}
                >
                  <span className="text-xs font-semibold">生存模式</span>
                  <span className="text-[10px] text-slate-400">抵御尸潮</span>
                </PickCard>
                <PickCard
                active={gameMode === "deathmatch"}
                accent="#f472b6"
                onClick={() => {
                  setGameMode("deathmatch");
                  if (dmPlayerCount === 10) setDmPlayerCount(4);
                }}
              >
                <span className="text-xs font-semibold">死亡竞赛</span>
                <span className="text-[10px] text-slate-400">先达目标击杀</span>
              </PickCard>
              
              {gameMode === "deathmatch" && (
                <div className="flex w-full gap-2 mt-2 bg-black/30 p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 w-12 flex items-center shrink-0">死斗规模</span>
                  {[
                    { count: 4, label: "4人", kills: 15 },
                    { count: 6, label: "6人", kills: 18 },
                    { count: 8, label: "8人", kills: 24 }
                  ].map((opt) => (
                    <button
                      key={opt.count}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDmPlayerCount(opt.count as 4 | 6 | 8 | 10);
                      }}
                      className={`flex-1 rounded-lg py-1.5 flex flex-col items-center justify-center text-[10px] border transition-colors ${
                        dmPlayerCount === opt.count
                          ? "bg-fuchsia-500/20 border-fuchsia-400 text-white"
                          : "bg-black/40 border-white/10 text-slate-400 hover:border-white/30"
                      }`}
                    >
                      <span className="font-bold">{opt.label}</span>
                      <span className="text-[8px] opacity-70">{opt.kills}杀</span>
                    </button>
                  ))}
                </div>
              )}
              
              <PickCard
                active={gameMode === "team_deathmatch"}
                accent="#8b5cf6"
                onClick={() => setGameMode("team_deathmatch")}
              >
                <span className="text-xs font-semibold">团队死斗</span>
                <span className="text-[10px] text-slate-400">小队对抗</span>
              </PickCard>
              
              {gameMode === "team_deathmatch" && (
                <div className="flex flex-col w-full gap-2 mt-2 bg-black/30 p-2 rounded-xl border border-white/5">
                  <div className="flex w-full gap-2">
                    <span className="text-[10px] text-slate-400 w-12 flex items-center shrink-0">死斗规模</span>
                    {[
                      { count: 4, label: "2队4人", kills: 20 },
                      { count: 6, label: "3队6人", kills: 30 },
                      { count: 8, label: "4队8人", kills: 40 },
                      { count: 10, label: "5v5", kills: 30 }
                    ].map((opt) => (
                      <button
                        key={opt.count}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDmPlayerCount(opt.count as 4 | 6 | 8 | 10);
                        }}
                        className={`flex-1 rounded-lg py-1.5 flex flex-col items-center justify-center text-[10px] border transition-colors ${
                          dmPlayerCount === opt.count
                            ? "bg-violet-500/20 border-violet-400 text-white"
                            : "bg-black/40 border-white/10 text-slate-400 hover:border-white/30"
                        }`}
                      >
                        <span className="font-bold">{opt.label}</span>
                        <span className="text-[8px] opacity-70">{opt.kills}杀</span>
                      </button>
                    ))}
                  </div>
                  {dmPlayerCount === 10 ? (
                    <span className="mt-1 text-[10px] text-violet-300/80">
                      5v5 为本地人机对战 · 蓝队 vs 红队
                    </span>
                  ) : (
                    <label className="flex items-center gap-2 mt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isNetworkPlay}
                        onChange={(e) => setIsNetworkPlay(e.target.checked)}
                        className="accent-violet-500"
                      />
                      <span className="text-xs text-slate-300">网络联机匹配 (匹配一名真人队友)</span>
                    </label>
                  )}
                </div>
              )}

              </Section>
            )}

            {/* 高级设置卡片入口 */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <div
                onClick={() => setShowAdvancedModal(true)}
                className="group relative flex flex-col gap-2 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/60 p-4 transition-all duration-200 hover:border-indigo-400/60 hover:from-indigo-900/50 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-xl text-indigo-300 border border-indigo-400/20 shadow-inner">
                      ⚙️
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        高级设置
                        <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                          自定义地图 · 动态天气
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        自由定制对局场景风格、战术布局、掩体密度与动态天气
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAdvancedModal(true);
                    }}
                    className="flex items-center gap-1 rounded-xl bg-indigo-500/20 px-3.5 py-1.5 text-xs font-bold text-indigo-300 border border-indigo-500/30 transition-all group-hover:bg-indigo-500 group-hover:text-white"
                  >
                    配置 ⚙️
                  </button>
                </div>

                {/* 状态徽章条 */}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-black/40 px-2.5 py-1 text-[11px] text-slate-300 border border-white/5">
                    🗺️ 场景: <strong className="text-indigo-300">{ADVANCED_MAP_THEMES.find(t => t.id === customMapTheme)?.name.replace(/^[^\s]+\s*/, '') || "随机"}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-black/40 px-2.5 py-1 text-[11px] text-slate-300 border border-white/5">
                    🏗️ 布局: <strong className="text-indigo-300">{ADVANCED_MAP_LAYOUTS.find(l => l.id === customMapLayout)?.name.replace(/^[^\s]+\s*/, '') || "经典平衡"}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-black/40 px-2.5 py-1 text-[11px] text-slate-300 border border-white/5">
                    🌦️ 天气: <strong className="text-indigo-300">{ADVANCED_WEATHERS.find(w => w.id === weatherOverride)?.label || "随机"}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-black/40 px-2.5 py-1 text-[11px] text-slate-300 border border-white/5">
                    🧱 密度: <strong className="text-indigo-300">{customMapDensity === "sparse" ? "稀疏 50%" : customMapDensity === "dense" ? "密集 150%" : "标准 100%"}</strong>
                  </span>
                </div>
              </div>
            </div>

        {/* Controls + start */}
        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="hide-touch flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span><kbd className="kbd">WASD</kbd> 移动</span>
            <span><kbd className="kbd">鼠标左键</kbd> 攻击</span>
            <span><kbd className="kbd">Q</kbd> 技能</span>
            <span><kbd className="kbd">R</kbd> 换弹</span>
            <span><kbd className="kbd">E</kbd> 切换武器</span>
            <span><kbd className="kbd">1/2/3 · 滚轮</kbd> 选择道具 · <kbd className="kbd">左键</kbd> 部署</span>
            <span><kbd className="kbd">P</kbd> 暂停</span>
          </div>
          <div className="show-touch flex flex-col items-center gap-1 text-center text-xs text-slate-400">
            <span>屏幕左侧摇杆移动 · 拖动屏幕瞄准 · 开火键攻击</span>
            <span>技能键放技能 · 切枪键换武器 · 换弹键换弹 · 道具键部署道具 · 暂停键设置</span>
          </div>
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-base font-bold text-slate-200 hover:bg-white/10"
              >
                ← 返回
              </button>
            )}
            <button
              onClick={resetToDefaults}
              className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-slate-400 hover:border-white/25 hover:bg-white/[0.06]"
            >
              恢复默认
            </button>
            <button
              onClick={handleStart}
              className="relative rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-12 py-3 text-lg font-bold text-slate-900 shadow-lg shadow-violet-500/30 transition-transform hover:scale-105 active:scale-95"
            >
              {netStatus === "waiting" || netStatus === "connecting" ? "匹配中…" : "开始战斗"}
            </button>
          </div>
        </div>
      </div>

      {/* 高级设置模态弹窗 (Advanced Settings Modal) */}
      {showAdvancedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl border border-white/15 bg-gradient-to-b from-[#181938] via-[#101229] to-[#0a0b1c] p-6 shadow-2xl shadow-indigo-950/50 text-slate-100">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/20 text-2xl text-indigo-300 border border-indigo-400/30">
                  ⚙️
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    高级设置
                    <span className="text-xs font-normal text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-400/20">
                      自定义地图与天气
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    定制专属战局场景、战术建筑布局、障碍物密度与天气环境
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAdvancedModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 my-4 p-1 rounded-2xl bg-black/40 border border-white/5">
              <button
                onClick={() => setAdvancedTab("map")}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  advancedTab === "map"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                🗺️ 自定义地图与机制
              </button>
              <button
                onClick={() => setAdvancedTab("weather")}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  advancedTab === "weather"
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                🌦️ 动态天气系统
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-5 no-scrollbar max-h-[55vh]">
              {advancedTab === "map" ? (
                <>
                  {/* 场景主题 */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-2">
                      <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                      地图场景风格 (Map Theme)
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {ADVANCED_MAP_THEMES.map((theme) => {
                        const active = customMapTheme === theme.id;
                        return (
                          <button
                            key={theme.id}
                            onClick={() => setCustomMapTheme(theme.id)}
                            className={`flex flex-col text-left p-3 rounded-2xl border transition-all ${
                              active
                                ? "bg-indigo-500/20 border-indigo-400 text-white shadow-md shadow-indigo-500/10"
                                : "bg-black/30 border-white/5 text-slate-400 hover:border-white/20 hover:bg-black/40"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-slate-100">{theme.name}</span>
                              <span className="text-xs opacity-80" style={{ color: theme.color }}>●</span>
                            </div>
                            <span className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                              {theme.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 战术布局风格 */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-2">
                      <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                      地图战术结构 (Layout Pattern)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {ADVANCED_MAP_LAYOUTS.map((layout) => {
                        const active = customMapLayout === layout.id;
                        return (
                          <button
                            key={layout.id}
                            onClick={() => setCustomMapLayout(layout.id as any)}
                            className={`flex flex-col text-left p-3 rounded-2xl border transition-all ${
                              active
                                ? "bg-indigo-500/20 border-indigo-400 text-white shadow-md shadow-indigo-500/10"
                                : "bg-black/30 border-white/5 text-slate-400 hover:border-white/20 hover:bg-black/40"
                            }`}
                          >
                            <span className="text-xs font-bold text-slate-100 mb-1">{layout.name}</span>
                            <span className="text-[10px] text-slate-400 leading-snug">
                              {layout.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 密度 & 机关 & 植被 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10">
                    {/* 掩体密度 */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-300">🧱 掩体建筑密度</span>
                      <div className="flex rounded-xl bg-black/40 p-1 border border-white/5">
                        {[
                          { id: "sparse", label: "稀疏 50%" },
                          { id: "normal", label: "标准" },
                          { id: "dense", label: "密集 150%" },
                        ].map((d) => (
                          <button
                            key={d.id}
                            onClick={() => setCustomMapDensity(d.id as any)}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              customMapDensity === d.id
                                ? "bg-indigo-500 text-white"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 极地列车 */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-300">🚂 极地特快列车</span>
                      <div className="flex rounded-xl bg-black/40 p-1 border border-white/5">
                        {[
                          { id: "auto", label: "仅冰雪" },
                          { id: "always", label: "始终开启" },
                          { id: "never", label: "关闭" },
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setCustomMapTrain(t.id as any)}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              customMapTrain === t.id
                                ? "bg-indigo-500 text-white"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 生态装饰 */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-300">🌵 植被与生态动物</span>
                      <div className="flex rounded-xl bg-black/40 p-1 border border-white/5">
                        <button
                          onClick={() => setCustomMapDecorations(true)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            customMapDecorations
                              ? "bg-indigo-500 text-white"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          开启生态
                        </button>
                        <button
                          onClick={() => setCustomMapDecorations(false)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            !customMapDecorations
                              ? "bg-indigo-500 text-white"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          纯净关闭
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* 天气选项 */
                <div>
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                    动态气象系统 (Dynamic Weather)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {ADVANCED_WEATHERS.map((w) => {
                      const active = weatherOverride === w.id;
                      return (
                        <button
                          key={w.id}
                          onClick={() => setWeatherOverride(w.id)}
                          className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all ${
                            active
                              ? "bg-sky-500/20 border-sky-400 text-white shadow-md shadow-sky-500/10"
                              : "bg-black/30 border-white/5 text-slate-400 hover:border-white/20 hover:bg-black/40"
                          }`}
                        >
                          <span className="text-2xl mb-1">{w.icon}</span>
                          <span className="text-xs font-bold text-slate-100">{w.label}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">{w.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10">
              <button
                onClick={() => {
                  setCustomMapTheme("random");
                  setCustomMapLayout("default");
                  setCustomMapDensity("normal");
                  setCustomMapTrain("auto");
                  setCustomMapDecorations(true);
                  setWeatherOverride("random");
                }}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/10 hover:text-slate-200"
              >
                恢复默认参数
              </button>
              <button
                onClick={() => setShowAdvancedModal(false)}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-transform"
              >
                保存设置并返回
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
