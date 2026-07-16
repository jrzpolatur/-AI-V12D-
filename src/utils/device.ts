/** Detect a touch-first device (phone / tablet) so the game can swap the
 *  keyboard+mouse scheme for an on-screen joystick + fire button. */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent;
  const mobileUA =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
      ua
    );
  const hasTouch = (navigator.maxTouchPoints ?? 0) > 0;
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  return mobileUA || (hasTouch && coarse);
}
