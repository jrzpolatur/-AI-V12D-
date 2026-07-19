import { useEffect, useMemo, useRef, useState } from "react";
import { GameEngine, type HudState, type Loadout } from "../game/engine";
import type { NetMode } from "../net/protocol";
import type { Net } from "../net/Net";
import { getCharacter, getOutfit } from "../game/content";
import { sound } from "../game/sound";
import { drawWeaponIcon, drawGadgetIcon } from "../game/draw";
import { cn } from "../utils/cn";
import { isTouchDevice } from "../utils/device";
import MobileControls from "./MobileControls";

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
  mode: "defense",
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
  bowChargePct: 0,
  shieldHp: null,
  shieldMaxHp: null,
  shieldActive: false,
  shieldCdPct: 1,
  hitFlash: 0,
};

/** Small canvas that renders a weapon's vector silhouette icon. */
function WeaponIcon({
  iconShape,
  glow,
  size = 22,
}: {
  iconShape: string;
  glow: string;
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
    drawWeaponIcon(ctx, iconShape, size / 2, size / 2, size * 0.72, glow);
  }, [iconShape, glow, size]);
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
    const c = ref.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext("2d")!;
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
  const [hud, setHud] = useState<HudState>(initialHud);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const isTouch = useMemo(() => isTouchDevice(), []);

  // keep the fullscreen button in sync (e.g. Esc exits FS)
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  };

  // ---- screen shake on hit ----
  const [shake, setShake] = useState({ x: 0, y: 0 });
  const lastHitFlash = useRef(0);
  const shakeRaf = useRef(0);
  const shakeTime = useRef(0);
  useEffect(() => {
    // detect hit flash rising edge
    if (hud.hitFlash > 0.5 && lastHitFlash.current <= 0.5) {
      shakeTime.current = 0.25; // 250ms shake
    }
    lastHitFlash.current = hud.hitFlash;
  }, [hud.hitFlash]);

  useEffect(() => {
    const tick = () => {
      if (shakeTime.current > 0) {
        shakeTime.current -= 1 / 60;
        const intensity = Math.max(0, shakeTime.current / 0.25) * 8;
        setShake({
          x: (Math.random() - 0.5) * intensity,
          y: (Math.random() - 0.5) * intensity,
        });
      } else if (shake.x !== 0 || shake.y !== 0) {
        setShake({ x: 0, y: 0 });
      }
      shakeRaf.current = requestAnimationFrame(tick);
    };
    shakeRaf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(shakeRaf.current);
  }, []); // eslint-disable-line

  useEffect(() => {
    const canvas = canvasRef.current!;
    const engine = new GameEngine(canvas, loadout, setHud, { mode, net });
    engineRef.current = engine;
    // NOTE: enable touch mode HERE (not from MobileControls' own effect). Child
    // effects run before the parent effect that creates the engine, so at that
    // point engineRef.current is still null and setTouchMode would silently no-op.
    if (isTouch) engine.setTouchMode(true);
    engine.start();
    return () => {
      engine.stop();
      // NOTE: do NOT call net?.disconnect() here. The Net instance is shared
      // across lobby/loadout/game screens (and in dev StrictMode re-mounts),
      // so tearing it down here would silently kill the live relay socket and
      // cause a black screen on re-entry. Net lifetime is owned by App/Lobby.
    };
  }, [loadout, isTouch]);

  const character = getCharacter(loadout.characterId);
  const outfit = getOutfit(loadout.outfitId);

  const hpPct = hud.maxHp ? hud.hp / hud.maxHp : 0;
  const hpColor =
    hpPct > 0.5 ? "#4ade80" : hpPct > 0.25 ? "#fbbf24" : "#f87171";
  const basePct = hud.baseMaxHp ? hud.baseHp / hud.baseMaxHp : 0;
  const baseColor =
    basePct > 0.5 ? "#38bdf8" : basePct > 0.25 ? "#fbbf24" : "#f87171";

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    sound.setEnabled(!next);
  };

  return (
    <div
      className="relative h-screen w-screen select-none overflow-hidden bg-black"
      style={{ transform: `translate(${shake.x}px, ${shake.y}px)` }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full cursor-none touch-none"
      />

      {/* ============ TOP BAR ============ */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 flex items-start justify-between p-3 sm:p-4">
        {/* Base HP (left) + Enemy base HP — hidden in biohazard */}
        {hud.mode === "defense" ? (
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sky-200/90">
              <span>🏛️</span>
              <span>己方基地</span>
            </div>
            <div className="relative h-3 w-44 overflow-hidden rounded-full border border-sky-300/30 bg-black/55">
              <div
                className="h-full rounded-full transition-[width] duration-150"
                style={{
                  width: `${basePct * 100}%`,
                  background: `linear-gradient(90deg, ${baseColor}, ${baseColor}cc)`,
                  boxShadow: `0 0 12px ${baseColor}88`,
                }}
              />
            </div>
            <div className="text-[10px] text-slate-400">
              {hud.baseHp} / {hud.baseMaxHp}
            </div>
            {/* enemy base */}
            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-rose-200/90">
              <span>⚔️</span>
              <span>敌方基地</span>
            </div>
            <div className="relative h-2.5 w-36 overflow-hidden rounded-full border border-rose-300/30 bg-black/55">
              <div
                className="h-full rounded-full transition-[width] duration-150"
                style={{
                  width: `${(hud.enemyBaseHp / hud.enemyBaseMaxHp) * 100}%`,
                  background: "linear-gradient(90deg, #f87171, #ef4444)",
                  boxShadow: "0 0 8px #ef444488",
                }}
              />
            </div>
            <div className="text-[10px] text-slate-400">
              {hud.enemyBaseHp} / {hud.enemyBaseMaxHp}
            </div>
          </div>
        ) : hud.mode === "biohazard" ? (
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-lime-200/90">
              <span>☣</span>
              <span>生化危机 · 生存</span>
            </div>
            <div className="text-[10px] text-slate-400">消灭所有来犯尸潮</div>
            <div className="mt-1 text-[10px] text-slate-500">
              击杀{" "}
              <span className="font-bold text-lime-300">{hud.kills}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-pink-200/90">
              <span>🤖</span>
              <span>人机对战</span>
            </div>
            <div className="text-[10px] text-slate-400">
              你{" "}
              <span className="font-bold text-emerald-300">{hud.kills}</span> / {hud.dmTarget} 杀
            </div>
            <div className="text-[10px] text-slate-400">
              机器人{" "}
              <span className="font-bold text-rose-300">{hud.botKills}</span> / {hud.dmTarget} 杀
            </div>
          </div>
        )}

        {/* Center: wave + enemies (hidden in deathmatch) */}
        {hud.mode !== "deathmatch" && (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 rounded-lg bg-black/40 px-3 py-1 backdrop-blur">
              <span className="text-xs text-slate-400">波次</span>
              <span className="text-lg font-bold text-white">{hud.wave}</span>
              <span className="ml-2 text-xs text-slate-400">敌人</span>
              <span className="text-lg font-bold text-rose-300">{hud.enemiesLeft}</span>
            </div>
          </div>
        )}

        {/* Right: score + gold + controls */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-black/40 px-3 py-1 backdrop-blur">
              <span className="text-xs text-slate-400">分数 </span>
              <span className="text-lg font-bold text-amber-300">
                {hud.score.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-black/40 px-2.5 py-1 backdrop-blur">
              <span className="text-sm">🪙</span>
              <span className="text-sm font-bold text-yellow-400">{hud.gold}</span>
            </div>
            <button
              onClick={toggleMute}
              className="pointer-events-auto grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/40 text-sm backdrop-blur hover:bg-white/10"
              title={muted ? "开启声音" : "静音"}
            >
              {muted ? "🔇" : "🔊"}
            </button>
            <button
              onClick={toggleFullscreen}
              className="pointer-events-auto grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/40 text-sm backdrop-blur hover:bg-white/10"
              title={fullscreen ? "退出全屏" : "全屏"}
            >
              {fullscreen ? "🗗" : "⛶"}
            </button>
            <button
              onClick={onExit}
              className="pointer-events-auto grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-black/40 text-xs font-semibold text-slate-300 backdrop-blur hover:bg-white/10"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-2 text-xs text-slate-300">
            <span className="rounded-md bg-black/40 px-2 py-0.5 backdrop-blur">
              击杀 {hud.kills}
            </span>
          </div>
        </div>
      </div>

      {/* ============ BANNER ============ */}
      {hud.banner && !hud.gameOver && (
        <div className="pointer-events-none absolute inset-x-0 top-[18%] flex justify-center">
          <div
            key={hud.banner}
            className="banner-pop rounded-2xl border border-white/15 bg-black/45 px-8 py-3 text-center text-3xl font-black tracking-wider text-white backdrop-blur-sm sm:text-4xl"
            style={{
              textShadow:
                "0 0 18px rgba(129,140,248,0.7), 0 2px 6px rgba(0,0,0,0.6)",
            }}
          >
            {hud.banner}
          </div>
        </div>
      )}

      {/* ============ GADGET BAR (right side) ============ */}
      <div className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 sm:right-4">
        {hud.gadgets.map((gd, i) => (
          <button
            key={gd.id}
            onClick={() => engineRef.current?.deployGadget(i)}
            className={cn(
              "relative flex h-12 w-12 flex-col items-center justify-center overflow-hidden rounded-xl border-2 bg-black/55 backdrop-blur transition-transform active:scale-95",
              gd.ready
                ? "border-white/30 hover:border-white/50"
                : "border-white/10 opacity-60"
            )}
            style={{
              boxShadow: gd.ready ? `0 0 10px ${gd.color}55` : "none",
            }}
            title={`${gd.name} (F${i + 1}) · ${gd.deployed}/${gd.maxStack}`}
          >
            {!gd.ready && (
              <div
                className="absolute inset-0 origin-bottom"
                style={{
                  background: `linear-gradient(to top, ${gd.color}55, ${gd.color}55 ${gd.cooldownPct * 100}%, transparent ${gd.cooldownPct * 100}%)`,
                }}
              />
            )}
            <GadgetIcon iconShape={gd.iconShape} color={gd.color} size={24} />
            <span className="relative text-[8px] font-bold text-slate-300">
              {i + 1}
            </span>
            {gd.deployed > 0 && (
              <span className="absolute right-0.5 top-0.5 rounded-full bg-black/70 px-1 text-[8px] font-bold text-white">
                {gd.deployed}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ============ BOTTOM HUD (THE FINALS style) ============ */}
      {/* Left bottom: player HP + name + effects */}
      <div className="pointer-events-none absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/50 px-4 py-2.5 backdrop-blur">
          {/* avatar */}
          <div
            className="grid h-12 w-12 place-items-center rounded-xl border-2 text-xl font-bold"
            style={{
              backgroundColor: character.bodyColor,
              borderColor: outfit.accent,
              boxShadow: `0 0 12px ${character.bodyColor}55`,
            }}
          >
            {character.name[0]}
          </div>
          {/* name + hp */}
          <div className="w-44">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-bold text-white">{character.name}</span>
              <span className="text-xs text-slate-300">
                {hud.hp}<span className="text-slate-500">/{hud.maxHp}</span>
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full border border-white/15 bg-black/50">
              <div
                className="h-full rounded-full transition-[width] duration-150"
                style={{
                  width: `${hpPct * 100}%`,
                  background: `linear-gradient(90deg, ${hpColor}, ${hpColor}dd)`,
                  boxShadow: `0 0 8px ${hpColor}88`,
                }}
              />
            </div>
            {/* effects row */}
            <div className="mt-1.5 flex min-h-[16px] flex-wrap gap-1">
              {hud.effects.map((e) => (
                <span
                  key={e.id}
                  className="rounded bg-black/50 px-1 py-0.5 text-[9px]"
                  style={{ color: e.color }}
                  title={`${e.name} ${e.time.toFixed(1)}s`}
                >
                  {e.icon} {e.time.toFixed(1)}
                </span>
              ))}
            </div>
          </div>
        </div>
        {/* weapon status (ammo/heat/melee/bow/shield) */}
        <div className="mt-2">
          <WeaponStatus hud={hud} />
        </div>
      </div>

      {/* Right bottom: weapon slots + skill */}
      <div className="pointer-events-auto absolute bottom-3 right-3 flex items-end gap-3 sm:bottom-4 sm:right-4">
        {/* Skill button */}
        <button
          onClick={() => engineRef.current?.triggerSkill()}
          className="relative flex h-16 w-16 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 bg-black/55 backdrop-blur transition-transform active:scale-95"
          style={{
            borderColor: hud.skillReady ? "#a78bfa" : "rgba(255,255,255,0.15)",
            boxShadow: hud.skillReady
              ? "0 0 18px rgba(167,139,250,0.5)"
              : "none",
          }}
          title={hud.skillName}
        >
          {hud.skillId === "dash" ? (
            <div className="absolute left-1 right-1 top-1 flex justify-center gap-0.5">
              {Array.from({ length: hud.maxDashCharges }).map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 flex-1 rounded-full"
                  style={{
                    backgroundColor:
                      i < hud.dashCharges
                        ? "#22d3ee"
                        : i === hud.dashCharges
                        ? `rgba(34,211,238,${0.3 + hud.dashChargePct * 0.6})`
                        : "rgba(255,255,255,0.1)",
                  }}
                />
              ))}
            </div>
          ) : (
            <div
              className="absolute inset-0 origin-bottom"
              style={{
                background: `linear-gradient(to top, rgba(167,139,250,0.45), rgba(167,139,250,0.45) ${hud.skillCooldownPct * 100}%, transparent ${hud.skillCooldownPct * 100}%)`,
              }}
            />
          )}
          <span className="relative mt-2 text-2xl">{hud.skillIcon}</span>
          <span className="relative text-[10px] font-bold text-violet-200">Q</span>
        </button>

        {/* Weapon slots (3 slots) */}
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/40 p-2 backdrop-blur">
          {hud.guns.map((g, i) => {
            const gunDef = GUNS_BY_ID[g.id];
            return (
              <button
                key={g.id}
                onClick={() => engineRef.current?.selectGun(i)}
                className={cn(
                  "relative flex h-16 w-14 flex-col items-center justify-center rounded-xl border-2 transition-all",
                  i === hud.gunIndex
                    ? "scale-105 border-white/50 bg-white/15"
                    : "border-white/10 bg-white/[0.04] opacity-60 hover:bg-white/[0.08]"
                )}
                style={
                  i === hud.gunIndex
                    ? { boxShadow: `0 0 14px ${gunDef?.glow ?? "#fff"}44` }
                    : undefined
                }
                title={g.name}
              >
                <span className="absolute left-1 top-0.5 text-[9px] font-bold text-slate-400">
                  {i === hud.gunIndex ? "E" : ""}
                </span>
                <WeaponIcon
                  iconShape={g.iconShape}
                  glow={gunDef?.glow ?? "#e2e8f0"}
                  size={28}
                />
                <span className="mt-0.5 text-[8px] font-semibold text-slate-300">
                  {g.name.length > 4 ? g.name.slice(0, 3) + "…" : g.name}
                </span>
                {g.weaponClass === "melee" && (
                  <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
                {g.weaponClass === "beam" && (
                  <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                )}
                {g.weaponClass === "flamethrower" && (
                  <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-orange-400" />
                )}
                {g.weaponClass === "poison_mist" && (
                  <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-lime-400" />
                )}
                {g.weaponClass === "bow" && (
                  <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-lime-400" />
                )}
                {g.weaponClass === "shield" && (
                  <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-blue-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============ MOBILE CONTROLS (touch only) ============ */}
      {isTouch && <MobileControls engineRef={engineRef} />}

      {/* ============ CONNECTING (peer handshake) ============ */}
      {hud.connecting && !hud.gameOver && !hud.paused && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-300/30 border-t-cyan-300" />
            <p className="text-lg font-bold text-slate-100">
              正在连接对手…
            </p>
            <p className="text-sm text-slate-400">
              等待双方同步，请稍候
            </p>
          </div>
        </div>
      )}

      {/* ============ PAUSE OVERLAY ============ */}
      {hud.paused && !hud.gameOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-white/10 bg-[#15163a]/90 p-6 text-center">
            <h2 className="mb-1 text-2xl font-bold text-white">已暂停</h2>
            <p className="mb-4 text-sm text-slate-400">基地仍在等待守护</p>
            <div className="mb-4 space-y-1 text-left text-xs text-slate-300">
              <p><kbd className="kbd">WASD</kbd> 移动 · <kbd className="kbd">鼠标左键</kbd> 攻击</p>
              <p><kbd className="kbd">Q</kbd> 技能 · <kbd className="kbd">R</kbd> 换弹</p>
              <p><kbd className="kbd">1/2/3</kbd> 部署道具 · <kbd className="kbd">滚轮</kbd> 切换道具</p>
              <p><kbd className="kbd">E</kbd> 切换武器</p>
              <p><kbd className="kbd">弓</kbd> 长按蓄力 · <kbd className="kbd">盾</kbd> 右键举盾</p>
              <p><kbd className="kbd">P/Esc</kbd> 继续</p>
            </div>
            <button
              onClick={() => engineRef.current?.setPaused(false)}
              className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 py-2.5 font-bold text-slate-900 transition-transform hover:scale-105"
            >
              继续战斗
            </button>
          </div>
        </div>
      )}

      {/* ============ GAME OVER ============ */}
      {hud.gameOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-white/10 bg-[#15163a]/90 p-6 text-center">
            <h2 className="mb-1 bg-gradient-to-r from-rose-300 to-amber-300 bg-clip-text text-3xl font-black text-transparent">
              {hud.gameOverReason}
            </h2>
            <p className="mb-5 text-sm text-slate-400">
              {hud.gameOverReason.includes("基地") ? "防线失守…" : "你倒下了…"}
            </p>
            <div className="mb-5 grid grid-cols-4 gap-2">
              <Stat label="分数" value={hud.score.toLocaleString()} />
              <Stat label="波数" value={`${hud.wave}`} />
              <Stat label="击杀" value={`${hud.kills}`} />
              <Stat label="金币" value={`${hud.gold}`} />
            </div>
            <div className="space-y-2">
              <button
                onClick={() => engineRef.current?.restart()}
                className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 py-2.5 font-bold text-slate-900 transition-transform hover:scale-105"
              >
                ↻ 再来一局
              </button>
              <button
                onClick={onExit}
                className="w-full rounded-full border border-white/15 py-2.5 font-semibold text-slate-300 hover:bg-white/10"
              >
                返回装配
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// import GUNS to look up glow colors for icons
import { GUNS } from "../game/content";
const GUNS_BY_ID = Object.fromEntries(GUNS.map((g) => [g.id, g]));

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/40 py-2">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  );
}

function WeaponStatus({ hud }: { hud: HudState }) {
  // bow
  if (hud.weaponClass === "bow") {
    const pct = hud.bowChargePct;
    return (
      <div className="pointer-events-none flex w-56 max-w-[70vw] items-center gap-2 rounded-full border border-lime-300/20 bg-black/45 px-3 py-1.5 backdrop-blur">
        <span className="text-[11px] font-bold text-lime-300">
          {pct > 0.9 ? "满蓄!" : "蓄力"}
        </span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-[width] duration-50"
            style={{
              width: `${pct * 100}%`,
              background:
                pct > 0.9
                  ? "linear-gradient(90deg,#fde68a,#a3e635)"
                  : "linear-gradient(90deg,#84cc16,#a3e635)",
            }}
          />
        </div>
        <span className="text-[9px] text-slate-400">长按</span>
      </div>
    );
  }
  // shield
  if (hud.weaponClass === "shield") {
    const hp = hud.shieldHp ?? 0;
    const max = hud.shieldMaxHp ?? 1;
    const pct = hp / max;
    return (
      <div className="pointer-events-none flex w-56 max-w-[70vw] items-center gap-2 rounded-full border border-blue-300/20 bg-black/45 px-3 py-1.5 backdrop-blur">
        <span
          className={cn(
            "text-[11px] font-bold",
            hud.shieldActive ? "text-cyan-300" : "text-blue-300"
          )}
        >
          {hud.shieldActive ? "举盾!" : "盾"}
        </span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-[width] duration-100"
            style={{
              width: `${pct * 100}%`,
              background: hud.shieldActive
                ? "linear-gradient(90deg,#60a5fa,#3b82f6)"
                : "linear-gradient(90deg,#1e3a8a,#3b82f6)",
            }}
          />
        </div>
        <span className="text-[9px] text-slate-400">
          {hp}/{max}
        </span>
      </div>
    );
  }
  // melee
  if (hud.weaponClass === "melee") {
    const isHammer = hud.gunId === "hammer";
    const isSpear = hud.gunId === "spear";
    return (
      <div className="pointer-events-none flex items-center gap-2 rounded-full border border-amber-300/20 bg-black/45 px-4 py-1.5 text-xs backdrop-blur">
        <span className="font-semibold text-amber-200">近战 ∞</span>
        {isHammer && (
          <span className="text-[10px] text-slate-400">
            左键挥砍 · 右键砸地
          </span>
        )}
        {isSpear && (
          <span className="text-[10px] text-slate-400">
            左键连戳 · 连招位移
          </span>
        )}
      </div>
    );
  }
  // beam / overheat
  if (hud.weaponClass === "beam") {
    const pct = Math.min(1, hud.heat);
    return (
      <div className="pointer-events-none flex w-64 max-w-[70vw] items-center gap-2 rounded-full border border-cyan-300/20 bg-black/45 px-3 py-1.5 backdrop-blur">
        <span
          className={cn(
            "text-[11px] font-bold",
            hud.overheated ? "text-rose-400 animate-pulse" : "text-cyan-300"
          )}
        >
          {hud.overheated ? "过热!" : "热量"}
        </span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-[width] duration-75"
            style={{
              width: `${pct * 100}%`,
              background: hud.overheated
                ? "linear-gradient(90deg,#fb7185,#ef4444)"
                : "linear-gradient(90deg,#22d3ee,#a78bfa)",
            }}
          />
        </div>
      </div>
    );
  }
  // flamethrower
  if (hud.weaponClass === "flamethrower") {
    const pct = Math.min(1, hud.heat);
    return (
      <div className="pointer-events-none flex w-64 max-w-[70vw] items-center gap-2 rounded-full border border-orange-300/20 bg-black/45 px-3 py-1.5 backdrop-blur">
        <span
          className={cn(
            "text-[11px] font-bold",
            hud.overheated ? "text-rose-400 animate-pulse" : "text-orange-300"
          )}
        >
          {hud.overheated ? "过热!" : "温度"}
        </span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-[width] duration-75"
            style={{
              width: `${pct * 100}%`,
              background: hud.overheated
                ? "linear-gradient(90deg,#fb7185,#ef4444)"
                : "linear-gradient(90deg,#fbbf24,#f97316,#ef4444)",
            }}
          />
        </div>
      </div>
    );
  }
  // poison mist (heat-based, shares overheat logic with flamethrower)
  if (hud.weaponClass === "poison_mist") {
    const pct = Math.min(1, hud.heat);
    return (
      <div className="pointer-events-none flex w-64 max-w-[70vw] items-center gap-2 rounded-full border border-lime-300/20 bg-black/45 px-3 py-1.5 backdrop-blur">
        <span
          className={cn(
            "text-[11px] font-bold",
            hud.overheated ? "text-rose-400 animate-pulse" : "text-lime-300"
          )}
        >
          {hud.overheated ? "过热!" : "毒气"}
        </span>
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-[width] duration-75"
            style={{
              width: `${pct * 100}%`,
              background: hud.overheated
                ? "linear-gradient(90deg,#fb7185,#ef4444)"
                : "linear-gradient(90deg,#84cc16,#a3e635,#bef264)",
            }}
          />
        </div>
      </div>
    );
  }
  // ranged magazine
  const ammo = hud.ammo ?? 0;
  const mag = hud.magazine ?? 1;
  const warm = hud.warmup ?? 0;
  return (
    <>
      <div className="pointer-events-none flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-4 py-1.5 text-xs backdrop-blur">
        {hud.reloading ? (
          <span className="font-semibold text-amber-300 animate-pulse">
            换弹中…
          </span>
        ) : (
          <span className="font-bold text-white">
            {ammo}
            <span className="text-slate-400"> / {mag}</span>
          </span>
        )}
        <div className="h-2.5 w-28 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full"
            style={{
              width: hud.reloading
                ? `${hud.reloadPct * 100}%`
                : `${(ammo / mag) * 100}%`,
              background: hud.reloading
                ? "linear-gradient(90deg,#fbbf24,#f97316)"
                : "linear-gradient(90deg,#4ade80,#22d3ee)",
            }}
          />
        </div>
        <kbd className="kbd">R</kbd>
      </div>
      {warm < 0.999 && (
        <div className="pointer-events-none mt-1 flex w-56 max-w-[70vw] items-center gap-2 rounded-full border border-amber-300/20 bg-black/45 px-3 py-1.5 backdrop-blur">
          <span className="text-[11px] font-bold text-amber-300">预热</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-75"
              style={{
                width: `${warm * 100}%`,
                background: "linear-gradient(90deg,#fbbf24,#f97316)",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
