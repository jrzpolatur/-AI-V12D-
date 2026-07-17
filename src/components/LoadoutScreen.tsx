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
import { drawCharacter, drawWeaponIcon, drawGadgetIcon, rgba } from "../game/draw";
import { cn } from "../utils/cn";

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
    render();
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [loadout]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full cursor-crosshair"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

/** Small canvas rendering a weapon's vector silhouette. */
function WeaponIcon({
  iconShape,
  glow,
  size = 28,
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
    drawWeaponIcon(ctx, iconShape, size / 2, size / 2, size * 0.78, glow);
  }, [iconShape, glow, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} />;
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
          <WeaponIcon iconShape={gun.iconShape} glow={gun.glow} size={32} />
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
}: {
  onConfirm: (loadout: Loadout) => void;
  onBack?: () => void;
}) {
  const [characterId, setCharacterId] = useState("raider");
  const [outfitId, setOutfitId] = useState("tactical");
  const [gunIds, setGunIds] = useState<string[]>(["smg", "sniper"]);
  const [skillId, setSkillId] = useState("dash");
  const [gadgetIds, setGadgetIds] = useState<string[]>([
    "turret_mg",
    "turret_cannon",
    "mine_explosive",
  ]);
  const [gameMode, setGameMode] = useState<"defense" | "biohazard">("defense");

  const gunId = gunIds[0] ?? "smg";
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

  const loadout: Loadout = {
    characterId,
    outfitId,
    gunId,
    gunIds,
    skillId,
    gadgetIds,
    gameMode,
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
    <div className="min-h-screen w-full overflow-y-auto bg-gradient-to-b from-[#0f1030] via-[#13143a] to-[#0b0c22] text-slate-100">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <header className="mb-6 text-center">
          <h1 className="bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">
            NEON STRIKE
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            2D 俯视角射击 · 守护基地 · 自由搭配人物、服饰、枪械、技能与道具
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
            <Section label="选择人物">
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

            <Section label="搭配服饰">
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

            <Section label={`选择 2 把武器（已选 ${gunIds.length}/2，游戏中按 E 切换）`}>
              {GUNS.map((g) => {
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
                    <WeaponIcon iconShape={g.iconShape} glow={g.glow} size={32} />
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
            </Section>

            <Section label="技能（按 Q 释放）">
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

            <Section label={`战术道具（最多携带 3 个，已选 ${gadgetIds.length}/3，游戏中 1/2/3 或滚轮选择，左键投掷/部署）`}>
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

            <Section label="游戏模式（单机）">
              <PickCard
                active={gameMode === "defense"}
                accent="#38bdf8"
                onClick={() => setGameMode("defense")}
              >
                <span className="text-xl">🏛️</span>
                <span className="text-xs font-semibold">守护基地</span>
                <span className="text-[10px] text-slate-400">经典 PvE 守点</span>
              </PickCard>
              <PickCard
                active={gameMode === "biohazard"}
                accent="#a3e635"
                onClick={() => setGameMode("biohazard")}
              >
                <span className="text-xl">☣</span>
                <span className="text-xs font-semibold">生化危机</span>
                <span className="text-[10px] text-slate-400">尸潮生存 · 新武器</span>
              </PickCard>
            </Section>

        {/* Controls + start */}
        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span><kbd className="kbd">WASD</kbd> 移动</span>
            <span><kbd className="kbd">鼠标左键</kbd> 攻击</span>
            <span><kbd className="kbd">Q</kbd> 技能</span>
            <span><kbd className="kbd">R</kbd> 换弹</span>
            <span><kbd className="kbd">1-9/0 · [ ] · 滚轮</kbd> 切换武器</span>
            <span><kbd className="kbd">1/2/3 · 滚轮</kbd> 选择道具 · <kbd className="kbd">左键</kbd> 部署</span>
            <span><kbd className="kbd">大锤右键</kbd> 砸地拆墙</span>
            <span><kbd className="kbd">P</kbd> 暂停</span>
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
              onClick={() => {
                sound.ensure();
                onConfirm(loadout);
              }}
              className="rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-12 py-3 text-lg font-bold text-slate-900 shadow-lg shadow-violet-500/30 transition-transform hover:scale-105 active:scale-95"
            >
              开始战斗 ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
