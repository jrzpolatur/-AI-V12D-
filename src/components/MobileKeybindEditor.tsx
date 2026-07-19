import { useRef } from "react";
import {
  useSettings,
  updateSettings,
  resetMobileLayout,
  type MobileActionId,
} from "../game/settings";

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** Drag-and-drop editor for the on-screen mobile control buttons. Shown from
 *  the settings overlay (touch devices only). Positions are stored as
 *  normalized 0..1 viewport coordinates so they survive rotation, and each
 *  action can be toggled on/off. Changes write straight to the shared settings
 *  store, so the live `MobileControls` picks them up immediately. */
export default function MobileKeybindEditor({
  onDone,
}: {
  onDone: () => void;
}) {
  const s = useSettings();
  const dragId = useRef<MobileActionId | null>(null);

  const moveBtn = (id: MobileActionId, nx: number, ny: number) =>
    updateSettings({
      mobile: s.mobile.map((b) => (b.id === id ? { ...b, nx, ny } : b)),
    });

  const toggleBtn = (id: MobileActionId) =>
    updateSettings({
      mobile: s.mobile.map((b) =>
        b.id === id ? { ...b, visible: !b.visible } : b
      ),
    });

  const onChipDown = (e: React.PointerEvent, id: MobileActionId) => {
    e.preventDefault();
    e.stopPropagation();
    dragId.current = id;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onChipMove = (e: React.PointerEvent) => {
    if (!dragId.current) return;
    const nx = clamp(e.clientX / window.innerWidth, 0.05, 0.95);
    const ny = clamp(e.clientY / window.innerHeight, 0.08, 0.95);
    moveBtn(dragId.current, nx, ny);
  };
  const onChipUp = (e: React.PointerEvent) => {
    if (!dragId.current) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    dragId.current = null;
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#0b0c22]/95 backdrop-blur-sm">
      {/* preview / drag surface */}
      <div className="relative flex-1 overflow-hidden">
        {/* left-half joystick hint (not editable) */}
        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-1/2 items-center justify-center">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-400">
            左半屏 = 虚拟摇杆移动
          </span>
        </div>

        {s.mobile.map((b) => (
          <button
            key={b.id}
            onPointerDown={(e) => onChipDown(e, b.id)}
            onPointerMove={onChipMove}
            onPointerUp={onChipUp}
            onPointerCancel={onChipUp}
            className={
              "absolute flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 select-none items-center justify-center rounded-2xl border-2 text-[11px] font-bold backdrop-blur active:scale-95 " +
              (b.visible
                ? "border-cyan-300/60 bg-cyan-500/25 text-cyan-100"
                : "border-white/15 bg-white/5 text-slate-500 opacity-60")
            }
            style={{ left: `${b.nx * 100}%`, top: `${b.ny * 100}%` }}
          >
            {b.label}
          </button>
        ))}

        <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-center text-[11px] text-slate-500">
          拖动按钮调整位置 · 右侧可开关显示
        </p>
      </div>

      {/* toggle list */}
      <div className="border-t border-white/10 bg-black/40 px-4 py-3">
        <div className="mb-2 text-xs font-semibold text-slate-300">显示开关</div>
        <div className="flex flex-wrap gap-2">
          {s.mobile.map((b) => (
            <button
              key={b.id}
              onClick={() => toggleBtn(b.id)}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition " +
                (b.visible
                  ? "border-cyan-300/50 bg-cyan-500/15 text-cyan-100"
                  : "border-white/10 bg-white/5 text-slate-500")
              }
            >
              {b.label} {b.visible ? "✓" : ""}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={resetMobileLayout}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10"
          >
            重置默认
          </button>
          <button
            onClick={onDone}
            className="flex-1 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 py-2 text-sm font-bold text-slate-900 transition hover:scale-[1.01]"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
