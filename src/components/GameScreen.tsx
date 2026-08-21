import { useEffect, useMemo, useRef, useState } from "react";
import { GameEngine, type HudState, type Loadout } from "../game/engine";
import type { NetMode } from "../net/protocol";
import type { Net } from "../net/Net";
import { getCharacter, getOutfit, getGun, findGun, GUNS, type CharacterDef, type OutfitDef } from "../game/content";
import { sound } from "../game/sound";
import { drawWeaponIcon, drawWeaponModel, drawGadgetIcon } from "../game/draw";
import { cn } from "../utils/cn";
import { isTouchDevice } from "../utils/device";
import MobileControls from "./MobileControls";
import SettingsOverlay from "./SettingsOverlay";
import { GameSummaryScreen } from "./GameSummaryScreen";

import {
  useSettings,
  subscribe,
  getSettings,
  updateSettings,
} from "../game/settings";

const initialHud: HudState = {
  hp: 100,
  maxHp: 100,
  score: 0,
  wave: 0,
  enemiesLeft: 0,
  gunId: "smg",
  guns: [],
  gunIndex: 0,
  weaponClass: "ranged",
  ammo: null,
  magazine: null,
  reloading: false,
  reloadPct: 0,
  heat: 0,
  overheated: false,
  skillId: "dash",
  skillName: "",
  skillIcon: "",
  skillCooldownPct: 1,
  skillReady: true,
  warmup: 0,
  mode: "biohazard",
  dashCharges: 3,
  maxDashCharges: 3,
  dashChargePct: 1,
  effects: [],
  gadgets: [],
  baseHp: 2000,
  baseMaxHp: 2000,
  enemyBaseHp: 2000,
  enemyBaseMaxHp: 2000,
  gameOver: false,
  gameOverReason: "",
  paused: false,
  connecting: false,
  banner: null,
  kills: 0,
  gold: 0,
  activeScoreFeed: null,
  killFeed: [],
  bowChargePct: 0,
  shieldHp: null,
  shieldMaxHp: null,
  shieldActive: false,
  shieldCdPct: 1,
  hitFlash: 0,
  reconnecting: false,
  isNet: false,
  matchTimeLeft: null,
};

/** Keyboard / mouse controls shown in the in-game HUD hints panel. */
const HUD_HINTS: { keys: string; label: string }[] = [
  { keys: "WASD / 方向键", label: "移动" },
  { keys: "鼠标", label: "瞄准" },
  { keys: "左键", label: "射击 / 部署选中道具" },
  { keys: "右键", label: "技能 / 武器特殊动作" },
  { keys: "Q / 空格", label: "释放技能" },
  { keys: "E", label: "切换武器" },
  { keys: "R", label: "换弹" },
  { keys: "1 / 2 / 3", label: "选择道具" },
  { keys: "滚轮", label: "循环道具" },
  { keys: "F", label: "互动 / 拾取" },
  { keys: "P / Esc", label: "暂停 / 设置" },
];

/** Touch controls shown on mobile (replaces keyboard keys). */
const HUD_HINTS_TOUCH: { keys: string; label: string }[] = [
  { keys: "左摇杆", label: "移动" },
  { keys: "屏幕拖动", label: "瞄准" },
  { keys: "开火键", label: "射击 / 部署选中道具" },
  { keys: "技能键", label: "释放技能" },
  { keys: "切枪键", label: "切换武器" },
  { keys: "换弹键", label: "换弹" },
  { keys: "道具 1 / 2 / 3", label: "选择道具" },
  { keys: "暂停键", label: "暂停 / 设置" },
];

const GUNS_BY_ID = Object.fromEntries(GUNS.map((g) => [g.id, g]));

/** Small canvas that renders a weapon's vector silhouette or detailed model icon. */
function WeaponIcon({
  iconShape,
  glow,
  gunId,
  size = 22,
}: {
  iconShape: string;
  glow: string;
  gunId?: string;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const q = getSettings().quality;
    const maxDpr = q === "low" ? 1 : q === "medium" ? 1.5 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const gun = gunId ? getGun(gunId) : undefined;
    if (gun) {
      drawWeaponModel(ctx, gun, size / 2, size / 2, size * 0.85);
    } else {
      drawWeaponIcon(ctx, iconShape, size / 2, size / 2, size * 0.72, glow);
    }
  }, [iconShape, glow, gunId, size]);
  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size }}
      className="pointer-events-none"
    />
  );
}

/** Small canvas that renders a gadget's vector silhouette icon. */
function GadgetIcon({
  iconShape,
  color,
  size = 22,
}: {
  iconShape: string;
  color: string;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const q = getSettings().quality;
    const maxDpr = q === "low" ? 1 : q === "medium" ? 1.5 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    drawGadgetIcon(ctx, { iconShape, color } as never, size / 2, size / 2, size * 0.72);
  }, [iconShape, color, size]);
  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size }}
      className="pointer-events-none"
    />
  );
}

/** Left-bottom Overwatch & The Finals hybrid segmented health unit */
function OverwatchHealthUnit({
  hud,
  character,
  outfit,
}: {
  hud: HudState;
  character: CharacterDef;
  outfit: OutfitDef;
}) {
  const hp = Math.max(0, hud.hp);
  const maxHp = Math.max(1, hud.maxHp);
  const hpPct = hp / maxHp;

  // Damage ghost trail (trailing lag bar)
  const [ghostHp, setGhostHp] = useState(hp);
  const ghostTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (hp < ghostHp) {
      if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current);
      ghostTimerRef.current = window.setTimeout(() => {
        setGhostHp(hp);
      }, 350);
    } else {
      setGhostHp(hp);
    }
  }, [hp]);

  // Number of blocks (12-14 tall slender blocks: 瘦长竖条风格)
  const segmentCount = Math.min(14, Math.max(10, Math.ceil(maxHp / 24)));
  const filledSegments = (hp / maxHp) * segmentCount;
  const ghostSegments = (ghostHp / maxHp) * segmentCount;

  const isLow = hpPct <= 0.3;

  return (
    <div className="pointer-events-none flex flex-col items-start gap-1">
      {/* Outer Slanted Container */}
      <div
        className={cn(
          "hud-skew flex flex-col rounded-xl border bg-black/80 px-3.5 py-2.5 backdrop-blur-md transition-all duration-200",
          isLow ? "animate-low-health border-rose-500/80 bg-black/85" : "border-white/15 shadow-2xl"
        )}
        style={{
          boxShadow: isLow
            ? "0 0 24px rgba(239,68,68,0.5)"
            : "0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        {/* Top Numbers Row - Italic font */}
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "hud-numbers text-3xl sm:text-4xl font-black italic tracking-wider",
                isLow ? "text-rose-400" : "text-white"
              )}
              style={{
                textShadow: isLow
                  ? "0 0 16px rgba(244,63,94,0.9)"
                  : "0 0 10px rgba(255,255,255,0.4)",
              }}
            >
              {Math.round(hp)}
            </span>
            <span className="hud-numbers text-xs font-bold italic text-slate-400">
              / {maxHp}
            </span>
          </div>

          {/* Shield / Armor Bonus Indicator if active */}
          {hud.shieldHp !== null && hud.shieldHp !== undefined && (
            <div className="flex items-center gap-1 text-[11px] font-bold italic text-cyan-300">
              <span className="text-xs not-italic">🛡️</span>
              <span className="hud-numbers text-sm font-black italic">{hud.shieldHp}</span>
            </div>
          )}
        </div>

        {/* Middle Segmented Health Bar (Tall & Slender 瘦长竖条 style) */}
        <div className="my-1.5 flex h-6 sm:h-7 w-32 sm:w-36 items-stretch gap-[2px] rounded-[3px] bg-black/90 p-[2px] border border-white/10">
          {Array.from({ length: segmentCount }).map((_, idx) => {
            const segStart = idx;
            const segEnd = idx + 1;
            const isFull = filledSegments >= segEnd;
            const isPartial = filledSegments > segStart && filledSegments < segEnd;
            const partialPct = isPartial ? filledSegments - segStart : 0;
            const inGhost = ghostSegments > segStart && !isFull;
            const ghostPartialPct = inGhost && ghostSegments < segEnd ? ghostSegments - segStart : 1;

            return (
              <div
                key={idx}
                className="relative flex-1 overflow-hidden rounded-[1.5px] bg-white/[0.08]"
              >
                {/* Ghost damage lag trail (rose / red) */}
                {inGhost && (
                  <div
                    className="absolute inset-0 bg-rose-500/70 transition-all duration-300"
                    style={{
                      width: `${ghostPartialPct * 100}%`,
                    }}
                  />
                )}
                {/* Active current HP block (bright white / cyan) */}
                {(isFull || isPartial) && (
                  <div
                    className={cn(
                      "absolute inset-0 transition-all duration-75",
                      isLow ? "bg-rose-400" : "bg-white"
                    )}
                    style={{
                      width: isFull ? "100%" : `${partialPct * 100}%`,
                      boxShadow: isLow
                        ? "0 0 6px rgba(244,63,94,0.8)"
                        : "0 0 4px rgba(255,255,255,0.6)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Tag & Name Row - Italic font */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="rounded border border-white/25 bg-white/10 px-1.5 py-0.5 text-[9px] font-black italic uppercase tracking-wider text-slate-200">
              {outfit?.name ? `[${outfit.name.slice(0, 5).toUpperCase()}]` : "[TF0RD]"}
            </span>
            <span className="font-bold italic text-slate-100 tracking-wide">
              {character.name}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 not-italic">🔊</span>
        </div>
      </div>

      {/* Active Buff/Debuff Status Effects Pills */}
      {hud.effects.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {hud.effects.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-1 rounded-full border border-white/15 bg-black/60 px-2 py-0.5 text-[10px] font-bold backdrop-blur"
              style={{ color: e.color, borderColor: `${e.color}44` }}
            >
              <span>{e.icon}</span>
              <span>{e.name}</span>
              <span className="hud-numbers opacity-80">{e.time.toFixed(1)}s</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Right-bottom The Finals & OW weapon and ammo unit */
function TheFinalsWeaponUnit({
  hud,
  engineRef,
  isTouch,
}: {
  hud: HudState;
  engineRef: React.RefObject<GameEngine | null>;
  isTouch: boolean;
}) {
  const ammo = hud.ammo ?? 0;
  const mag = hud.magazine ?? 1;
  const ammoPct = mag > 0 ? ammo / mag : 1;
  const isAmmoLow = hud.weaponClass === "ranged" && !hud.reloading && ammoPct <= 0.25;

  return (
    <div className="pointer-events-none flex flex-col items-end gap-2">
      {/* Outer Slanted Combat Unit */}
      <div className="hud-skew flex items-end gap-3 rounded-xl border border-white/15 bg-black/75 p-3 shadow-2xl backdrop-blur-md">
        {/* Weapon Slots Selector (Primary / Secondary) */}
        {!isTouch && (
          <div className="pointer-events-auto flex items-center gap-2">
            {hud.guns.map((g, i) => {
              const gunDef = GUNS_BY_ID[g.id];
              const isCurrent = i === hud.gunIndex;
              return (
                <button
                  key={g.id}
                  onClick={() => engineRef.current?.selectGun(i)}
                  className={cn(
                    "relative flex h-14 w-16 flex-col items-center justify-center rounded-lg border transition-all duration-150 active:scale-95",
                    isCurrent
                      ? "border-cyan-400/80 bg-cyan-500/20 shadow-[0_0_16px_rgba(34,211,238,0.35)]"
                      : "border-white/10 bg-white/[0.04] opacity-60 hover:bg-white/10 hover:opacity-90"
                  )}
                  title={g.name}
                >
                  <span className="absolute left-1 top-0.5 text-[8px] font-black text-slate-300">
                    {isCurrent ? "[E]" : `[${i + 1}]`}
                  </span>
                  <WeaponIcon
                    iconShape={g.iconShape}
                    glow={gunDef?.glow ?? "#e2e8f0"}
                    gunId={g.id}
                    size={28}
                  />
                  <span className="mt-0.5 text-[8px] font-bold text-slate-200 truncate max-w-[54px]">
                    {g.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Ammo & Status Display */}
        <div className="flex min-w-[130px] flex-col items-end justify-center pl-2">
          {hud.weaponClass === "ranged" ? (
            <>
              {hud.reloading ? (
                <div className="flex flex-col items-end">
                  <span className="hud-numbers text-2xl font-black italic text-amber-300 animate-pulse">
                    RELOADING
                  </span>
                  <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                      style={{ width: `${hud.reloadPct * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-end">
                  <div className="flex items-baseline gap-1">
                    <span
                      className={cn(
                        "hud-numbers text-4xl font-black italic tracking-tight",
                        isAmmoLow ? "text-rose-400 animate-pulse" : "text-white"
                      )}
                      style={{
                        textShadow: isAmmoLow
                          ? "0 0 16px rgba(244,63,94,0.9)"
                          : "0 0 12px rgba(255,255,255,0.4)",
                      }}
                    >
                      {ammo}
                    </span>
                    <span className="hud-numbers text-base font-semibold italic text-slate-400">
                      / {mag}
                    </span>
                  </div>
                  {/* Ammo Pips Progress Bar */}
                  <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-75",
                        isAmmoLow
                          ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                          : "bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                      )}
                      style={{ width: `${ammoPct * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : hud.weaponClass === "melee" ? (
            <div className="flex flex-col items-end">
              <span className="hud-numbers text-3xl font-black italic text-amber-300">
                MELEE ∞
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                无限连段
              </span>
            </div>
          ) : hud.weaponClass === "beam" || hud.weaponClass === "flamethrower" || hud.weaponClass === "poison_mist" ? (
            <div className="flex flex-col items-end w-36">
              <div className="flex items-baseline justify-between w-full">
                <span
                  className={cn(
                    "text-[10px] font-black uppercase tracking-wider",
                    hud.overheated ? "text-rose-400 animate-pulse" : "text-cyan-300"
                  )}
                >
                  {hud.overheated ? "OVERHEAT" : "HEAT LEVEL"}
                </span>
                <span className="hud-numbers text-sm font-bold text-white">
                  {Math.round(Math.min(1, hud.heat) * 100)}%
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-75",
                    hud.overheated
                      ? "bg-gradient-to-r from-rose-500 to-red-600 animate-pulse"
                      : "bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-500"
                  )}
                  style={{ width: `${Math.min(1, hud.heat) * 100}%` }}
                />
              </div>
            </div>
          ) : hud.weaponClass === "bow" ? (
            <div className="flex flex-col items-end w-32">
              <span className="hud-numbers text-xs font-bold text-lime-300">
                {hud.bowChargePct > 0.9 ? "CHARGED 满蓄" : "CHARGING 蓄力"}
              </span>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-lime-400 to-yellow-300"
                  style={{ width: `${hud.bowChargePct * 100}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Center-bottom hero skill & tactical gadgets dock */
function AbilityAndGadgetsDock({
  hud,
  engineRef,
  isTouch,
}: {
  hud: HudState;
  engineRef: React.RefObject<GameEngine | null>;
  isTouch: boolean;
}) {
  if (isTouch) return null;

  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 flex items-end gap-3 sm:bottom-4">
      {/* Hero Skill Button (Q / Space) */}
      <button
        onClick={() => engineRef.current?.triggerSkill()}
        className={cn(
          "pointer-events-auto hud-skew relative flex h-16 w-16 flex-col items-center justify-center overflow-hidden rounded-xl border-2 bg-black/75 shadow-2xl backdrop-blur-md transition-all active:scale-95",
          hud.skillReady
            ? "border-violet-400/90 shadow-[0_0_20px_rgba(167,139,250,0.6)] animate-skill-ready"
            : "border-white/15 opacity-70"
        )}
        title={`${hud.skillName} (Q)`}
      >
        {/* Dash Charges Pips */}
        {hud.skillId === "dash" ? (
          <div className="absolute top-1.5 flex justify-center gap-1">
            {Array.from({ length: hud.maxDashCharges }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 w-2 rotate-45 rounded-[1px] transition-all",
                  i < hud.dashCharges
                    ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]"
                    : i === hud.dashCharges
                    ? "bg-cyan-400/40"
                    : "bg-white/10"
                )}
              />
            ))}
          </div>
        ) : (
          !hud.skillReady && (
            <div
              className="absolute inset-0 bg-violet-600/40"
              style={{
                clipPath: `polygon(50% 50%, 50% 0%, ${
                  hud.skillCooldownPct > 0.125 ? "100% 0%," : ""
                }${hud.skillCooldownPct > 0.375 ? "100% 100%," : ""}${
                  hud.skillCooldownPct > 0.625 ? "0% 100%," : ""
                }${hud.skillCooldownPct > 0.875 ? "0% 0%," : ""} ${
                  50 + 50 * Math.sin(hud.skillCooldownPct * Math.PI * 2)
                }% ${50 - 50 * Math.cos(hud.skillCooldownPct * Math.PI * 2)}%)`,
              }}
            />
          )
        )}

        <span className="hud-skew-reverse relative text-2xl drop-shadow-md">
          {hud.skillIcon}
        </span>
        <span className="hud-skew-reverse absolute bottom-1 text-[10px] font-black text-violet-200">
          [Q]
        </span>
      </button>

      {/* Gadgets Hotbar (1, 2, 3) */}
      <div className="pointer-events-auto hud-skew flex items-center gap-2 rounded-xl border border-white/15 bg-black/75 p-2 shadow-2xl backdrop-blur-md">
        {hud.gadgets.map((gd, i) => (
          <button
            key={gd.id}
            onClick={() => engineRef.current?.deployGadget(i)}
            className={cn(
              "relative flex h-14 w-12 flex-col items-center justify-center overflow-hidden rounded-lg border transition-all active:scale-95",
              gd.ready
                ? "border-white/25 bg-white/[0.06] hover:border-white/50 hover:bg-white/10"
                : "border-white/10 bg-black/50 opacity-60"
            )}
            style={{
              boxShadow: gd.ready ? `0 0 10px ${gd.color}44` : "none",
            }}
            title={`${gd.name} (${i + 1}) · ${gd.deployed}/${gd.maxStack}`}
          >
            {!gd.ready && (
              <div
                className="absolute inset-0 bg-white/20 origin-bottom transition-all"
                style={{
                  height: `${gd.cooldownPct * 100}%`,
                }}
              />
            )}
            <GadgetIcon iconShape={gd.iconShape} color={gd.color} size={22} />
            <span className="hud-skew-reverse mt-0.5 text-[9px] font-black text-slate-300">
              [{i + 1}]
            </span>
            {gd.deployed > 0 && (
              <span className="absolute right-0.5 top-0.5 rounded bg-black/80 px-1 text-[7px] font-bold text-cyan-300">
                {gd.deployed}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function GameScreen({
  loadout,
  onExit,
  mode = "local",
  net = null,
}: {
  loadout: Loadout;
  onExit: () => void;
  mode?: NetMode;
  net?: Net | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hud, setHud] = useState<HudState>(() => ({
    ...initialHud,
    mode: mode !== "local" ? "deathmatch" : (loadout.gameMode ?? "biohazard"),
  }));
  const settings = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const isTouch = useMemo(() => isTouchDevice(), []);

  // ---- HUD hints (controls help) ----
  const [hintsOpen, setHintsOpen] = useState(false);
  const [showStartHints, setShowStartHints] = useState(true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const ae = document.activeElement as HTMLElement | null;
      if (
        ae &&
        (ae.tagName === "INPUT" ||
          ae.tagName === "TEXTAREA" ||
          ae.tagName === "SELECT" ||
          ae.isContentEditable)
      )
        return;
      if (e.code === "KeyH") {
        setHintsOpen((o) => !o);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => setShowStartHints(false), 8000);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, []);

  // ---- screen shake on hit ----
  const shakeContainerRef = useRef<HTMLDivElement>(null);
  const lastHitFlash = useRef(0);
  const shakeRaf = useRef(0);
  const shakeTime = useRef(0);
  useEffect(() => {
    if (hud.hitFlash > 0.5 && lastHitFlash.current <= 0.5) {
      shakeTime.current = 0.25;
    }
    lastHitFlash.current = hud.hitFlash;
  }, [hud.hitFlash]);

  useEffect(() => {
    const tick = () => {
      const el = shakeContainerRef.current;
      if (shakeTime.current > 0) {
        shakeTime.current -= 1 / 60;
        const intensity = Math.max(0, shakeTime.current / 0.25) * 8;
        if (el) el.style.transform = `translate(${(Math.random() - 0.5) * intensity}px,${(Math.random() - 0.5) * intensity}px)`;
      } else if (el && el.style.transform !== "") {
        el.style.transform = "";
      }
      shakeRaf.current = requestAnimationFrame(tick);
    };
    shakeRaf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(shakeRaf.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GameEngine(canvas, loadout, setHud, { mode, net });
    engineRef.current = engine;
    engine.onPauseRequest = () => setSettingsOpen((o) => !o);
    engine.onPointerLock = setPointerLocked;
    if (isTouch) engine.setTouchMode(true);
    engine.start();
    return () => {
      engine.stop();
    };
  }, [loadout, isTouch]);

  // ---- apply saved settings ----
  useEffect(() => {
    const apply = (st: ReturnType<typeof getSettings>) => {
      sound.setVolume(st.volume);
      sound.setEnabled(!st.muted);
      if (isTouch) {
        engineRef.current?.setTargetFps(Math.min(st.fps, 45));
        engineRef.current?.setBotAiHz(Math.min(st.botAiHz, 20));
      } else {
        engineRef.current?.setTargetFps(st.fps);
        engineRef.current?.setBotAiHz(st.botAiHz);
      }
    };
    apply(getSettings());
    return subscribe(apply);
  }, [isTouch]);

  useEffect(() => {
    engineRef.current?.setPaused(settingsOpen);
  }, [settingsOpen]);

  useEffect(() => {
    const onCh = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onCh);
    return () => document.removeEventListener("fullscreenchange", onCh);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  const character = getCharacter(loadout.characterId);
  const outfit = getOutfit(loadout.outfitId);

  // Real-time smooth FPS calculation when enabled
  const [currentFps, setCurrentFps] = useState(60);
  useEffect(() => {
    if (!settings.showFps) return;
    let frames = 0;
    let lastTime = performance.now();
    let rafId = 0;
    const loop = (now: number) => {
      frames++;
      if (now - lastTime >= 350) {
        const calculatedFps = Math.round((frames * 1000) / (now - lastTime));
        setCurrentFps(calculatedFps);
        frames = 0;
        lastTime = now;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [settings.showFps]);

  const toggleMute = () => {
    updateSettings({ muted: !settings.muted });
  };

  return (
    <div
      className="relative h-screen w-screen select-none overflow-hidden bg-black pt-safe pb-safe pl-safe pr-safe"
      ref={shakeContainerRef}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full cursor-none touch-none"
      />
      {/* 16-bit Retro CRT Scanline Filter Overlay (toggleable in settings) */}
      {settings.crt && <div className="crt-overlay pointer-events-none" />}

      {/* ============ TOP BAR ============ */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 flex items-start justify-between p-3 sm:p-4 z-20">
        {/* Left Top: Mode Status / Leaderboard (Normal upright font without skew) */}
        {hud.mode === "deathmatch" ? (
          settings.scorePanelStyle === "compact" ? (
            <div className="flex items-center gap-2 rounded-xl border border-fuchsia-400/30 bg-black/80 px-3 py-1.5 shadow-lg backdrop-blur-md">
              <span className="rounded bg-fuchsia-500/20 px-1.5 py-0.5 text-[10px] font-black uppercase text-fuchsia-300 border border-fuchsia-400/30">
                DM
              </span>
              <div className="text-xs text-slate-300 font-medium not-italic flex items-center gap-2">
                <span>击杀 <b className="text-sm font-bold text-white tnum">{hud.kills}</b><span className="text-slate-500">/{hud.dmTarget}</span></span>
                {(() => {
                  const sorted = [...(hud.dm ?? [])].sort((a, b) => b.kills - a.kills);
                  const myRank = sorted.findIndex((p) => p.you) + 1;
                  const leader = sorted[0];
                  return (
                    <span className="text-[11px] text-fuchsia-200 border-l border-white/15 pl-2">
                      {myRank > 0 ? `第 ${myRank} 名` : ""} {leader && !leader.you ? `(头名 ${leader.kills} 杀)` : "👑 领先"}
                    </span>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-1 rounded-xl border border-white/15 bg-black/85 p-2.5 shadow-xl backdrop-blur-md">
              <div className="text-[11px] uppercase tracking-wider text-fuchsia-300 font-bold not-italic">
                死亡竞赛 DEATHMATCH
              </div>
              {(hud.dm ?? []).map((e) => (
                <div
                  key={e.id}
                  className={cn(
                    "flex items-center gap-2 text-[11px] not-italic",
                    e.you ? "font-bold text-white" : "font-medium text-slate-300"
                  )}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: e.color }}
                  />
                  <span className="w-16 truncate">{e.you ? "你" : e.name}</span>
                  <span className="font-bold text-white tnum">{e.kills}</span>
                  {e.dead && <span className="text-[9px] text-rose-400 font-bold">倒下</span>}
                </div>
              ))}
              <div className="text-[10px] text-slate-400 font-medium not-italic">
                目标 {hud.dmTarget} 淘汰
              </div>
            </div>
          )
        ) : hud.mode === "team_deathmatch" ? (
          settings.scorePanelStyle === "compact" ? (
            <div className="flex items-center gap-2 rounded-xl border border-orange-400/30 bg-black/80 px-3 py-1.5 shadow-lg backdrop-blur-md">
              <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] font-black uppercase text-orange-300 border border-orange-400/30">
                TDM
              </span>
              <div className="flex items-center gap-2.5 text-xs">
                {(hud.teamScores ?? []).map((t) => (
                  <div key={t.teamId} className={cn("flex items-center gap-1 text-[11px]", t.isMine ? "font-bold text-white" : "text-slate-400")}>
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: t.color }} />
                    <span>{t.isMine ? "我方" : t.name}</span>
                    <span className="tnum font-bold text-white">{t.kills}</span>
                  </div>
                ))}
                <span className="text-[10px] text-slate-500">/ {hud.dmTarget}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-1 rounded-xl border border-white/15 bg-black/85 p-3 shadow-xl backdrop-blur-md min-w-[190px] pointer-events-auto">
              <div className="text-[11px] uppercase tracking-wider text-orange-300 font-bold not-italic">
                团队死斗 TEAM DM
              </div>
              {(hud.teamScores ?? []).map((t) => (
                <div key={t.teamId} className="flex w-full flex-col gap-0.5">
                  <div
                    className={cn(
                      "flex w-full items-center justify-between gap-2 text-[11px] not-italic",
                      t.isMine ? "font-bold text-white" : "font-medium text-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: t.color }}
                      />
                      <span className="w-16 truncate">{t.isMine ? "你的队伍" : t.name}</span>
                    </div>
                    <span className="font-bold text-white tnum">
                      {t.kills}
                      <span className="text-slate-500 font-normal">/{hud.dmTarget ?? 0}</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, ((t.kills ?? 0) / (hud.dmTarget || 1)) * 100)}%`,
                        background: t.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : hud.mode === "biohazard" ? (
          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/85 px-3 py-1.5 shadow-xl backdrop-blur-md">
            <span className="rounded bg-lime-500/20 px-1.5 py-0.5 text-[10px] font-black uppercase text-lime-300 border border-lime-400/30">
              BIOHAZARD
            </span>
            <div className="text-xs text-slate-300 font-medium not-italic">
              击杀 <span className="text-sm font-bold text-lime-300 tnum">{hud.kills}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/85 px-3 py-1.5 shadow-xl backdrop-blur-md">
            <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-black uppercase text-indigo-300 border border-indigo-400/30">
              VERSUS
            </span>
            <div className="text-xs text-slate-300 font-medium not-italic">
              击杀 <span className="text-sm font-bold text-indigo-300 tnum">{hud.kills}</span>
            </div>
          </div>
        )}

        {/* Center: Match timer & Wave info (Normal upright font without skew) */}
        {hud.mode === "biohazard" && (
          <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-black/85 px-4 py-1.5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider not-italic">WAVE</span>
              <span className="text-lg font-black text-amber-300 tnum not-italic">{hud.wave}</span>
            </div>
            <span className="h-4 w-[1px] bg-white/20" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider not-italic">ENEMIES</span>
              <span className="text-lg font-black text-rose-400 tnum not-italic">{hud.enemiesLeft}</span>
            </div>
          </div>
        )}
        {(hud.mode === "deathmatch" || hud.mode === "team_deathmatch") && hud.dmTimeLeft !== undefined && hud.dmTimeLeft !== null && (
          <div className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-black/85 px-4 py-1.5 shadow-2xl backdrop-blur-md">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider not-italic">TIME</span>
            <span className="text-xl font-black text-white tracking-wide tnum not-italic">
              {(() => {
                const m = Math.floor(hud.dmTimeLeft / 60);
                const s = Math.floor(hud.dmTimeLeft % 60);
                return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
              })()}
            </span>
          </div>
        )}

        {/* Right: score + gold + utility buttons */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            {(settings.perfMonitor || settings.showFps) && (
              <div className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-black/85 px-3 py-1 backdrop-blur-md shadow-lg shadow-cyan-950/30 font-mono text-[11px] font-bold">
                <span className="flex items-center gap-1 text-cyan-300">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[10px] text-slate-400">FPS</span>
                  <span className={`tnum ${currentFps >= 55 ? "text-emerald-300" : currentFps >= 30 ? "text-yellow-300" : "text-rose-400"}`}>
                    {currentFps}
                  </span>
                </span>
                {hud.perfStats && (
                  <>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-300 flex items-center gap-0.5">
                      <span className="text-[10px] text-slate-400">CPU</span>
                      <span className={`tnum ${hud.perfStats.cpuMs <= 6 ? "text-emerald-300" : hud.perfStats.cpuMs <= 14 ? "text-yellow-300" : "text-rose-400"}`}>
                        {hud.perfStats.cpuMs}ms
                      </span>
                    </span>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-300 flex items-center gap-0.5">
                      <span className="text-[10px] text-slate-400">GPU</span>
                      <span className={`tnum ${hud.perfStats.gpuMs <= 6 ? "text-emerald-300" : hud.perfStats.gpuMs <= 14 ? "text-yellow-300" : "text-rose-400"}`}>
                        {hud.perfStats.gpuMs}ms
                      </span>
                    </span>
                    {hud.perfStats.memoryMb !== undefined && (
                      <>
                        <span className="text-slate-600">|</span>
                        <span className="text-slate-300 flex items-center gap-0.5">
                          <span className="text-[10px] text-slate-400">MEM</span>
                          <span className="text-purple-300 tnum">{hud.perfStats.memoryMb}M</span>
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="rounded-lg border border-white/15 bg-black/80 px-3 py-1 backdrop-blur shadow-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase not-italic">SCORE </span>
              <span className="text-base font-black text-amber-300 tnum not-italic">
                {hud.score.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/80 px-2.5 py-1 backdrop-blur shadow-md">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
              <span className="text-sm font-bold text-yellow-400 tnum not-italic">{hud.gold}</span>
            </div>
            <button
              onClick={toggleFullscreen}
              className="pointer-events-auto grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-black/70 text-sm backdrop-blur transition hover:bg-white/15 active:scale-95"
              title={isFull ? "退出全屏" : "进入全屏"}
            >
              {isFull ? "⤡" : "⤢"}
            </button>
            <button
              onClick={toggleMute}
              className="pointer-events-auto grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-black/70 text-sm backdrop-blur transition hover:bg-white/15 active:scale-95"
              title={settings.muted ? "开启声音" : "静音"}
            >
              {settings.muted ? "🔇" : "🔊"}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="pointer-events-auto grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-black/70 text-sm backdrop-blur transition hover:bg-white/15 active:scale-95"
              title="设置"
            >
              ⚙
            </button>
            <button
              onClick={() => setHintsOpen((o) => !o)}
              className={cn(
                "pointer-events-auto grid h-8 w-8 place-items-center rounded-lg border text-sm font-bold backdrop-blur transition hover:bg-white/15 active:scale-95",
                hintsOpen
                  ? "border-indigo-400/80 bg-indigo-500/30 text-indigo-200"
                  : "border-white/15 bg-black/70 text-slate-300"
              )}
              title="操作说明 (H)"
            >
              ?
            </button>
            <button
              onClick={onExit}
              className="pointer-events-auto grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-black/70 text-xs font-bold text-slate-300 backdrop-blur transition hover:bg-rose-600/40 hover:border-rose-400/50 active:scale-95"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* ============ START HINT (auto-fade onboarding) ============ */}
      {showStartHints && !hud.gameOver && !hintsOpen && (
        <div className="pointer-events-none absolute inset-x-0 top-[11%] flex flex-col items-center gap-2 z-30">
          <div className="hud-skew rounded-xl border border-white/20 bg-black/75 px-5 py-2.5 text-center text-sm font-semibold text-slate-200 backdrop-blur-md shadow-2xl">
            {isTouch ? (
              <>
                左摇杆移动 · 开火键射击 · 技能键放技能 · 切枪键换武器 · 拖动屏幕瞄准
              </>
            ) : (
              <>
                移动 <span className="font-mono text-cyan-300 font-bold">WASD</span> · 射击{" "}
                <span className="font-mono text-cyan-300 font-bold">左键</span> · 技能{" "}
                <span className="font-mono text-cyan-300 font-bold">Q</span> · 换弹{" "}
                <span className="font-mono text-cyan-300 font-bold">R</span> · 切换武器{" "}
                <span className="font-mono text-cyan-300 font-bold">E</span>
              </>
            )}
          </div>
          <button
            onClick={() => {
              setHintsOpen(true);
              setShowStartHints(false);
            }}
            className="pointer-events-auto rounded-full border border-indigo-400/40 bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-200 hover:bg-indigo-500/30"
          >
            查看完整操作说明 (?)
          </button>
        </div>
      )}

      {/* ============ POINTER-LOCK HINT (desktop) ============ */}
      {!isTouch && !pointerLocked && !settingsOpen && !hud.gameOver && !hud.connecting && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 flex justify-center z-30">
          <button
            onClick={() => engineRef.current?.requestMouseLock()}
            className="pointer-events-auto hud-skew rounded-xl border border-cyan-400/50 bg-black/80 px-4 py-2 text-center text-sm font-bold text-cyan-100 backdrop-blur-md shadow-2xl hover:bg-cyan-500/20"
          >
            点击画面锁定鼠标 · 按 <b>U</b> 或 <b>Esc</b> 显示光标
          </button>
        </div>
      )}

      {/* ============ RESPAWNING OVERLAY (clean status feedback) ============ */}
      {hud.deadTimer && hud.deadTimer > 0 && !hud.gameOver && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] z-30 animate-card-pop">
          <div className="flex flex-col items-center rounded-2xl border border-rose-400/40 bg-black/85 px-7 py-4 shadow-2xl backdrop-blur-md">
            <span className="text-xs font-bold uppercase tracking-widest text-rose-300">
              战术躯体正在重组 RESPAWNING
            </span>
            <span className="hud-numbers text-4xl font-black italic text-white mt-1">
              {hud.deadTimer.toFixed(1)}s
            </span>
          </div>
        </div>
      )}

      {/* ============ BOTTOM LEFT HUD (Overwatch & The Finals style) ============ */}
      <div className="pointer-events-none absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20">
        <OverwatchHealthUnit hud={hud} character={character} outfit={outfit} />
      </div>

      {/* ============ BOTTOM CENTER HUD (Hero Skill & Gadgets) ============ */}
      <AbilityAndGadgetsDock hud={hud} engineRef={engineRef} isTouch={isTouch} />

      {/* ============ BOTTOM RIGHT HUD (The Finals Weapon & Ammo) ============ */}
      <div className="pointer-events-none absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20">
        <TheFinalsWeaponUnit hud={hud} engineRef={engineRef} isTouch={isTouch} />
      </div>

      {/* ============ HUD HINTS (controls help overlay) ============ */}
      {hintsOpen && (
        <div
          className="pointer-events-auto absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setHintsOpen(false)}
        >
          <div
            className="relative max-h-[82vh] w-[min(92vw,560px)] overflow-auto rounded-2xl border border-white/20 bg-slate-900/95 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black italic text-white tracking-wide">操作说明 CONTROLS</h2>
              <button
                onClick={() => setHintsOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 bg-white/5 text-slate-300 hover:bg-white/15"
                title="关闭"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {(isTouch ? HUD_HINTS_TOUCH : HUD_HINTS).map((h) => (
                <div
                  key={h.label}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2"
                >
                  <span className="min-w-[90px] shrink-0 text-center font-mono text-xs font-bold text-cyan-300">
                    {h.keys}
                  </span>
                  <span className="text-sm font-bold text-slate-200">{h.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-slate-400">
              {isTouch
                ? "点击空白处关闭"
                : '按 H 或点击空白处关闭'}
            </p>
          </div>
        </div>
      )}

      {/* ============ MOBILE CONTROLS (touch only) ============ */}
      {isTouch && <MobileControls engineRef={engineRef} />}

      {/* ============ CONNECTING (peer handshake) ============ */}
      {hud.connecting && !hud.gameOver && !hud.paused && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/30 border-t-cyan-400" />
            <p className="finals-title text-xl uppercase tracking-wider text-slate-100">
              连接中 CONNECTING…
            </p>
            <p className="text-sm text-slate-400 font-semibold">
              等待对手就绪
            </p>
          </div>
        </div>
      )}

      {/* ============ SETTINGS OVERLAY (ESC / P) ============ */}
      {settingsOpen && !hud.gameOver && (
        <SettingsOverlay
          isTouch={isTouch}
          isFull={isFull}
          onToggleFullscreen={toggleFullscreen}
          onExit={onExit}
          onResume={() => setSettingsOpen(false)}
        />
      )}

      {/* ============ GAME OVER SUMMARY ============ */}
      {hud.gameOver && (
        <GameSummaryScreen
          reason={hud.gameOverReason}
          stats={hud.postGameStats}
          onRestart={() => engineRef.current?.restart()}
          onExit={onExit}
        />
      )}

      {/* ============ RESPAWN & DAMAGE LOG OVERLAY ============ */}
      {(hud.deadTimer ?? 0) > 0 && !hud.gameOver && (
        <>
          {/* Right-side Damage Statistics Panel */}
          <div className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-end gap-1.5 max-w-sm select-none">
            <div className="hud-skew w-80 rounded-t-lg bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 px-4 py-2 text-sm font-black text-white italic tracking-wider flex items-center justify-between shadow-xl border-b border-white/20">
              <div className="flex items-center gap-1.5">
                <span>被 {hud.eliminatedBy || "对手"} 淘汰</span>
              </div>
              <span className="text-[10px] font-mono opacity-70 uppercase tracking-widest">DAMAGE</span>
            </div>

            <div className="flex flex-col gap-1 w-80">
              {(() => {
                const activeLogs = (hud.damageLogs ?? []);
                const logs = [...activeLogs].reverse();
                const N = logs.length;
                const totalSeqDuration = 2.0;
                const stepTime = N > 1 ? totalSeqDuration / N : 0;
                const animDuration = Math.min(0.45, Math.max(0.15, totalSeqDuration / (N || 1)));

                return logs.map((log, idx) => {
                  const delay = (idx * stepTime).toFixed(3) + "s";
                  const dur = animDuration.toFixed(3) + "s";
                  const gun = findGun(log.weapon);
                  const genericLabel = !gun ? (
                    log.weapon === "enemy_attack" ? "怪物" :
                    log.weapon === "combatant_attack" ? "攻击" :
                    log.weapon === "charge_slam" ? "冲撞" :
                    "攻击"
                  ) : null;

                  return (
                    <div
                      key={log.id || idx}
                      style={{
                        animationDelay: delay,
                        animationDuration: dur,
                      }}
                      className={cn(
                        "hud-skew flex items-center justify-between rounded-md px-3.5 py-2 text-xs font-bold shadow-lg border backdrop-blur-md animate-slide-in-right",
                        log.isDealtByMe
                          ? "border-cyan-500/30 bg-[#09353e]/90 text-cyan-200"
                          : "border-rose-500/30 bg-[#3d0b1a]/90 text-rose-200"
                      )}
                    >
                      <div className="flex items-center gap-2 font-mono">
                        {idx === 0 && !log.isDealtByMe && (
                          <span className="text-rose-400 font-bold text-xs" title="致死伤害">†</span>
                        )}
                        <span className={cn(
                          "hud-numbers font-black text-base italic tracking-tight",
                          log.isDealtByMe ? "text-cyan-300" : "text-rose-300"
                        )}>
                          {log.amount}
                        </span>

                        <div className="flex items-center gap-1">
                          {gun ? (
                            <WeaponIcon iconShape={gun.iconShape} glow={gun.glow} gunId={gun.id} size={22} />
                          ) : (
                            <span className="text-amber-400 font-bold px-1 text-xs">{genericLabel}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <span className="opacity-60">{log.isDealtByMe ? "对" : "由"}</span>
                        <span className="font-bold underline decoration-white/20 tracking-wide">
                          {log.isDealtByMe ? log.targetName : log.sourceName}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}

              {(hud.damageLogs ?? []).length === 0 && (
                <div className="rounded-md bg-slate-900/80 border border-white/10 p-3 text-center text-xs text-slate-400 backdrop-blur-sm">
                  无近期伤害数据
                </div>
              )}
            </div>
          </div>

          {/* Bottom Respawn Timer Bar */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-center justify-center bg-gradient-to-t from-black/90 via-black/40 to-transparent pb-8 pt-12">
            <div className="hud-skew finals-panel flex items-center gap-3 bg-slate-900/95 px-8 py-2.5 border border-rose-500/50 shadow-2xl backdrop-blur-md">
              <div className="h-4 w-4 rounded-full border-2 border-rose-400 border-t-transparent animate-spin" />
              <span className="text-sm font-bold uppercase tracking-wider text-slate-200">重生 RESPAWN</span>
              <span className="hud-numbers text-2xl font-black text-amber-400 tracking-wider">
                {Math.ceil(hud.deadTimer ?? 0)}
              </span>
              <span className="text-xs text-slate-400 font-mono">S</span>
            </div>
          </div>
        </>
      )}

      {/* ============ BATTLEFIELD STYLE SCORE FEED ============ */}
      {hud.activeScoreFeed && (
        settings.scorePanelStyle === "compact" ? (
          <div
            key={`sf-${hud.activeScoreFeed.totalScore}-${hud.activeScoreFeed.events[0]?.id ?? 0}-${hud.activeScoreFeed.totalKills}`}
            className="pointer-events-none absolute inset-x-0 bottom-[26%] flex flex-col items-center justify-center gap-1 z-50 animate-score-pop-compact"
            style={{ filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.85))" }}
          >
            {/* 简洁版胶囊反馈：紧凑、不遮挡准星与走位 */}
            <div className="flex items-center gap-2 rounded-full border border-amber-400/50 bg-black/80 px-3.5 py-1 backdrop-blur-md shadow-lg">
              <span className="text-amber-400 font-black text-lg tnum tracking-tight">+{hud.activeScoreFeed.totalScore}</span>
              {hud.activeScoreFeed.events[0] && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <span className="text-amber-200">{hud.activeScoreFeed.events[0].text}</span>
                  {hud.activeScoreFeed.events[0].victimName && (
                    <span className="text-rose-400 font-extrabold">{hud.activeScoreFeed.events[0].victimName}</span>
                  )}
                </div>
              )}
              {hud.activeScoreFeed.totalKills > 0 && (
                <span className="rounded bg-rose-500/30 border border-rose-400/40 px-1.5 py-0.5 text-[10px] font-black text-rose-200">
                  {hud.activeScoreFeed.totalKills} 淘汰
                </span>
              )}
            </div>
          </div>
        ) : (
          <div
            key={`sf-${hud.activeScoreFeed.totalScore}-${hud.activeScoreFeed.events[0]?.id ?? 0}-${hud.activeScoreFeed.totalKills}`}
            className="pointer-events-none absolute inset-x-0 bottom-[32%] flex flex-col items-center justify-center gap-1 z-50 animate-score-pop"
            style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.9))" }}
          >
            <div className="flex items-center gap-2 text-3xl font-black mb-1">
              <span className="hud-numbers text-yellow-400 text-4xl italic">+{hud.activeScoreFeed.totalScore}</span>
            </div>

            {hud.activeScoreFeed.events.map((sf) => (
              <div key={sf.id} className="flex flex-col items-center">
                {sf.victimName ? (
                  <div className="hud-skew flex items-center gap-3 text-sm font-bold text-slate-200 bg-black/70 px-3 py-0.5 rounded border border-white/10">
                    <span className="text-slate-100">{sf.text}</span>
                    <span className="text-rose-400 uppercase font-black">{sf.victimName}</span>
                    <span className="hud-numbers text-amber-400">+{sf.subScore}</span>
                  </div>
                ) : (
                  <div className="hud-skew flex items-center gap-2 bg-black/70 px-2.5 py-0.5 rounded border border-white/10">
                    <span className="text-xs font-bold tracking-wider text-slate-100 uppercase">{sf.text}</span>
                    <span className="hud-numbers text-sm font-black text-amber-400">+{sf.subScore}</span>
                  </div>
                )}
              </div>
            ))}

            {hud.activeScoreFeed.totalKills > 0 && (
              <div className="flex items-center gap-2 text-sm font-bold text-slate-300 mt-1">
                <span>淘汰数 {hud.activeScoreFeed.totalKills}</span>
              </div>
            )}
          </div>
        )
      )}

      {/* ============ TOP RIGHT KILL FEED ============ */}
      {hud.killFeed && hud.killFeed.length > 0 && (
        <div className="pointer-events-none absolute right-3 top-20 z-50 flex flex-col items-end gap-1.5 sm:right-4">
          {hud.killFeed.map((kf) => (
            <div
              key={kf.id}
              className="hud-skew flex items-center gap-2 rounded-lg bg-black/75 px-3 py-1 text-xs font-bold text-white shadow-xl border border-white/10 backdrop-blur-md animate-kf-slide"
            >
              {kf.type === "event" ? (
                <span style={{ color: kf.teamColor || "#facc15" }}>{kf.text}</span>
              ) : (
                <>
                  <span className="text-sky-300">{kf.killerName}</span>
                  <span
                    className="flex items-center justify-center rounded bg-slate-950/90 px-1.5 py-0.5 border border-white/15"
                    style={{ boxShadow: `0 0 6px ${kf.weaponGlow}55` }}
                  >
                    <WeaponIcon iconShape={kf.weaponIconShape!} glow={kf.weaponGlow!} gunId={kf.weaponId} size={20} />
                  </span>
                  <span className="text-rose-300">{kf.victimName}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes bf-score-pop {
          0% { transform: translateY(15px) scale(0.85); opacity: 0; }
          5% { transform: translateY(0) scale(1.05); opacity: 1; }
          10% { transform: translateY(0) scale(1); opacity: 1; }
          88% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-10px) scale(1); opacity: 0; }
        }
        @keyframes compact-score-pop {
          0% { transform: translateY(8px) scale(0.92); opacity: 0; }
          6% { transform: translateY(0) scale(1); opacity: 1; }
          85% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-8px) scale(0.95); opacity: 0; }
        }
        @keyframes kf-slide-in {
          0% { transform: translateX(40px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .animate-score-pop {
          animation: bf-score-pop 5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-score-pop-compact {
          animation: compact-score-pop 4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-kf-slide {
          animation: kf-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
