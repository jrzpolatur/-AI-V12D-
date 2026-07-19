import { useEffect, useRef, useState } from "react";
import type { GameEngine } from "../game/engine";
import { useSettings, type MobileActionId } from "../game/settings";

/** Shared style that kills every browser default gesture on a touch target.
 *  touch-action:none stops the OS from treating a multi-finger touch as
 *  scroll/zoom (which would otherwise fire pointercancel and kill the other
 *  finger's input). user-select / touch-callout stop long-press text selection. */
const NO_GESTURE: React.CSSProperties = {
  touchAction: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
  WebkitTouchCallout: "none",
};

/** Per-action button styling (kept distinct so the player can tell them apart). */
const ACTION_STYLE: Record<MobileActionId, string> = {
  fire: "border-rose-400/60 bg-rose-500/30 text-white",
  reload: "border-amber-300/40 bg-amber-500/20 text-amber-100",
  skill: "border-violet-400/50 bg-violet-500/25 text-violet-100",
  weapon: "border-sky-400/50 bg-sky-500/25 text-sky-100",
  gadget1: "border-emerald-400/50 bg-emerald-500/25 text-emerald-100",
  gadget2: "border-emerald-400/50 bg-emerald-500/25 text-emerald-100",
  gadget3: "border-emerald-400/50 bg-emerald-500/25 text-emerald-100",
};

/** On-screen controls for touch devices. Movement uses a *floating* joystick
 *  (press anywhere on the left half — the stick appears under your thumb) and
 *  the action buttons (fire / reload / skill / weapon-switch / gadgets) are laid
 *  out from the shared settings store, so the player can reposition or hide them
 *  via the in-game "自定义键位" editor. Aiming is handled entirely by the
 *  engine's mobile-only aim assist.
 *
 *  Multi-touch robustness: every interactive element has touch-action:none and
 *  each finger is tracked independently via its own pointerId + setPointerCapture,
 *  so holding fire while steering the joystick never interrupts either gesture. */
export default function MobileControls({
  engineRef,
}: {
  engineRef: React.MutableRefObject<GameEngine | null>;
}) {
  const s = useSettings();

  // ---- movement joystick (floating, left half) ----
  const joyPointer = useRef<number | null>(null);
  const joyOrigin = useRef({ x: 0, y: 0 });
  const [joy, setJoy] = useState({
    active: false,
    x: 0, // visual center (relative to left zone)
    y: 0,
    kx: 0, // knob offset
    ky: 0,
  });
  const R = 52; // joystick radius in px

  const onJoyDown = (e: React.PointerEvent) => {
    if (joyPointer.current !== null) return; // already steering with one finger
    const rect = e.currentTarget.getBoundingClientRect();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    joyPointer.current = e.pointerId;
    joyOrigin.current = { x: e.clientX, y: e.clientY };
    setJoy({
      active: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      kx: 0,
      ky: 0,
    });
    engineRef.current?.setVirtualMove(0, 0);
  };
  const onJoyMove = (e: React.PointerEvent) => {
    if (joyPointer.current !== e.pointerId) return;
    let dx = e.clientX - joyOrigin.current.x;
    let dy = e.clientY - joyOrigin.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > R) {
      dx = (dx / dist) * R;
      dy = (dy / dist) * R;
    }
    setJoy((st) => ({ ...st, kx: dx, ky: dy }));
    engineRef.current?.setVirtualMove(dx / R, dy / R);
  };
  const onJoyUp = (e: React.PointerEvent) => {
    if (joyPointer.current !== e.pointerId) return;
    joyPointer.current = null;
    setJoy((st) => ({ ...st, active: false, kx: 0, ky: 0 }));
    engineRef.current?.setVirtualMove(0, 0);
  };

  // ---- fire (hold) ----
  const firePointer = useRef<number | null>(null);
  const firingRef = useRef(false);
  const onFireDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (firePointer.current !== null) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    firePointer.current = e.pointerId;
    firingRef.current = true;
    engineRef.current?.setVirtualFiring(true);
  };
  const onFireUp = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (firePointer.current !== e.pointerId) return;
    firePointer.current = null;
    firingRef.current = false;
    engineRef.current?.setVirtualFiring(false);
  };

  // ---- tap actions (reload / skill / weapon / gadgets) ----
  const tapAction = (id: MobileActionId) => {
    const e = engineRef.current;
    if (!e) return;
    switch (id) {
      case "reload":
        e.reloadCurrent();
        break;
      case "skill":
        e.triggerSkill();
        break;
      case "weapon":
        e.cycleWeapon();
        break;
      case "gadget1":
        e.deployGadget(0);
        break;
      case "gadget2":
        e.deployGadget(1);
        break;
      case "gadget3":
        e.deployGadget(2);
        break;
      default:
        break;
    }
  };

  // safety net: if a finger is released/cancelled anywhere (e.g. OS steals it),
  // make sure both inputs are reset so the player doesn't get stuck moving/firing.
  useEffect(() => {
    const release = () => {
      if (firingRef.current) {
        firingRef.current = false;
        engineRef.current?.setVirtualFiring(false);
      }
      if (joyPointer.current !== null) {
        joyPointer.current = null;
        setJoy((st) => ({ ...st, active: false, kx: 0, ky: 0 }));
        engineRef.current?.setVirtualMove(0, 0);
      }
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, []);

  // tell the engine we're in touch mode, and lock the page so the browser
  // never starts a scroll/zoom gesture from any touch (the #1 cause of
  // multi-touch input getting dropped). Restored on unmount.
  useEffect(() => {
    engineRef.current?.setTouchMode(true);

    const prevTouchAction = document.documentElement.style.touchAction;
    const prevOverflow = document.body.style.overflow;
    document.documentElement.style.touchAction = "none";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.touchAction = prevTouchAction;
      document.body.style.overflow = prevOverflow;
      engineRef.current?.setVirtualMove(0, 0);
      engineRef.current?.setVirtualFiring(false);
    };
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 select-none"
      style={NO_GESTURE}
    >
      {/* movement: floating joystick — press anywhere on the left half */}
      <div
        onPointerDown={onJoyDown}
        onPointerMove={onJoyMove}
        onPointerUp={onJoyUp}
        onPointerCancel={onJoyUp}
        className="pointer-events-auto absolute inset-y-0 left-0 w-1/2"
        style={NO_GESTURE}
      >
        {joy.active && (
          <div
            className="absolute grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/5 backdrop-blur"
            style={{ left: joy.x, top: joy.y, touchAction: "none" }}
          >
            <div
              className="h-14 w-14 rounded-full bg-white/30 shadow-lg ring-2 ring-white/40"
              style={{ transform: `translate(${joy.kx}px, ${joy.ky}px)` }}
            />
          </div>
        )}
      </div>

      {/* action buttons (positioned from the settings layout) */}
      {s.mobile
        .filter((b) => b.visible)
        .map((b) => {
          const pos: React.CSSProperties = {
            left: `${b.nx * 100}%`,
            top: `${b.ny * 100}%`,
            transform: "translate(-50%, -50%)",
          };
          if (b.id === "fire") {
            return (
              <button
                key={b.id}
                onPointerDown={onFireDown}
                onPointerUp={onFireUp}
                onPointerCancel={onFireUp}
                style={{ ...pos, ...NO_GESTURE }}
                className={`pointer-events-auto absolute flex h-20 w-20 items-center justify-center rounded-full border-2 text-base font-black shadow-lg backdrop-blur active:scale-95 ${ACTION_STYLE.fire}`}
              >
                开火
              </button>
            );
          }
          return (
            <button
              key={b.id}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                tapAction(b.id);
              }}
              style={{ ...pos, ...NO_GESTURE }}
              className={`pointer-events-auto absolute flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-[12px] font-bold backdrop-blur active:scale-95 ${ACTION_STYLE[b.id]}`}
            >
              {b.label}
            </button>
          );
        })}
    </div>
  );
}
