import { useEffect, useRef, useState } from "react";
import type { GameEngine } from "../game/engine";

/** On-screen controls for touch devices: a movement joystick (bottom-left) and
 *  a fire button + reload button cluster (right). Aiming is handled entirely by
 *  the engine's mobile-only aim assist, so the player only moves and fires. */
export default function MobileControls({
  engineRef,
}: {
  engineRef: React.MutableRefObject<GameEngine | null>;
}) {
  // ---- joystick ----
  const joyRef = useRef<HTMLDivElement>(null);
  const joyId = useRef<number | null>(null);
  const joyCenter = useRef({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const R = 52; // joystick radius in px

  const moveJoy = (e: React.PointerEvent) => {
    if (joyId.current !== e.pointerId) return;
    let dx = e.clientX - joyCenter.current.x;
    let dy = e.clientY - joyCenter.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > R) {
      dx = (dx / dist) * R;
      dy = (dy / dist) * R;
    }
    setKnob({ x: dx, y: dy });
    engineRef.current?.setVirtualMove(dx / R, dy / R);
  };
  const startJoy = (e: React.PointerEvent) => {
    const rect = joyRef.current!.getBoundingClientRect();
    joyCenter.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    joyId.current = e.pointerId;
    joyRef.current!.setPointerCapture(e.pointerId);
    moveJoy(e);
  };
  const endJoy = (e: React.PointerEvent) => {
    if (joyId.current !== e.pointerId) return;
    joyId.current = null;
    setKnob({ x: 0, y: 0 });
    engineRef.current?.setVirtualMove(0, 0);
  };

  // ---- fire ----
  const firingRef = useRef(false);
  const onFireDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    firingRef.current = true;
    engineRef.current?.setVirtualFiring(true);
  };
  const onFireUp = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    firingRef.current = false;
    engineRef.current?.setVirtualFiring(false);
  };

  // safety: release fire if the pointer is released anywhere (e.g. finger slides off)
  useEffect(() => {
    const release = () => {
      if (firingRef.current) {
        firingRef.current = false;
        engineRef.current?.setVirtualFiring(false);
      }
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, []);

  // tell the engine we're in touch mode + reset movement on unmount
  useEffect(() => {
    engineRef.current?.setTouchMode(true);
    return () => {
      engineRef.current?.setVirtualMove(0, 0);
      engineRef.current?.setVirtualFiring(false);
    };
  }, []);

  return (
    <>
      {/* movement joystick */}
      <div
        ref={joyRef}
        onPointerDown={startJoy}
        onPointerMove={moveJoy}
        onPointerUp={endJoy}
        onPointerCancel={endJoy}
        className="pointer-events-auto absolute bottom-6 left-6 z-30 grid h-32 w-32 place-items-center rounded-full border border-white/20 bg-white/5 backdrop-blur"
        style={{ touchAction: "none" }}
      >
        <div
          className="h-14 w-14 rounded-full bg-white/30 shadow-lg ring-2 ring-white/40"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      {/* fire + reload cluster */}
      <div
        className="pointer-events-auto absolute bottom-32 right-4 z-30 flex items-end gap-3"
        style={{ touchAction: "none" }}
      >
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            engineRef.current?.reloadCurrent();
          }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-amber-300/40 bg-black/55 text-xs font-bold text-amber-200 backdrop-blur active:scale-95"
        >
          换弹
        </button>
        <button
          onPointerDown={onFireDown}
          onPointerUp={onFireUp}
          onPointerCancel={onFireUp}
          className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-rose-400/60 bg-rose-500/30 text-base font-black text-white shadow-lg backdrop-blur active:scale-95"
        >
          开火
        </button>
      </div>
    </>
  );
}
