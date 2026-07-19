import { useEffect, useRef, useState } from "react";
import type { GameEngine } from "../game/engine";

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

/** On-screen controls for touch devices. Movement uses a *floating* joystick
 *  (press anywhere on the left half — the stick appears under your thumb) and
 *  the right side holds a fire + reload cluster. Aiming is handled entirely by
 *  the engine's mobile-only aim assist, so the player only moves and fires.
 *
 *  Multi-touch robustness: every interactive element has touch-action:none and
 *  each finger is tracked independently via its own pointerId + setPointerCapture,
 *  so holding fire while steering the joystick never interrupts either gesture. */
export default function MobileControls({
  engineRef,
}: {
  engineRef: React.MutableRefObject<GameEngine | null>;
}) {
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
    setJoy((s) => ({ ...s, kx: dx, ky: dy }));
    engineRef.current?.setVirtualMove(dx / R, dy / R);
  };
  const onJoyUp = (e: React.PointerEvent) => {
    if (joyPointer.current !== e.pointerId) return;
    joyPointer.current = null;
    setJoy((s) => ({ ...s, active: false, kx: 0, ky: 0 }));
    engineRef.current?.setVirtualMove(0, 0);
  };

  // ---- fire (right) ----
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
        setJoy((s) => ({ ...s, active: false, kx: 0, ky: 0 }));
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

      {/* fire + reload cluster (right) */}
      <div
        className="pointer-events-auto absolute bottom-10 right-4 flex items-end gap-3"
        style={NO_GESTURE}
      >
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            engineRef.current?.reloadCurrent();
          }}
          style={NO_GESTURE}
          className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-amber-300/40 bg-black/55 text-xs font-bold text-amber-200 backdrop-blur active:scale-95"
        >
          换弹
        </button>
        <button
          onPointerDown={onFireDown}
          onPointerUp={onFireUp}
          onPointerCancel={onFireUp}
          style={NO_GESTURE}
          className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-rose-400/60 bg-rose-500/30 text-base font-black text-white shadow-lg backdrop-blur active:scale-95"
        >
          开火
        </button>
      </div>
    </div>
  );
}
