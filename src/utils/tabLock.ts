// Lightweight same-origin tab lock using BroadcastChannel to prevent
// matching/playing in multiple tabs of the same browser concurrently.

const CHANNEL_NAME = "antigravity-2d-shooter-tab-lock";
let channel: BroadcastChannel | null = null;
let isMatchingOrPlaying = false;
let onConflictCallback: (() => void) | null = null;

if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event) => {
    if (event.data === "ping" && isMatchingOrPlaying) {
      channel?.postMessage("pong");
    } else if (event.data === "pong" && isMatchingOrPlaying) {
      // Conflict detected! Another tab is already active.
      onConflictCallback?.();
    }
  };
}

export const tabLock = {
  /**
   * Try to acquire the lock. Returns true if acquired successfully,
   * or false if another tab is currently active.
   */
  acquire(onConflict: () => void): boolean {
    if (!channel) return true; // Fallback if BroadcastChannel is unsupported
    
    // Set active state
    isMatchingOrPlaying = true;
    onConflictCallback = onConflict;

    // Ping other tabs to see if anyone replies
    channel.postMessage("ping");

    return true;
  },

  /**
   * Release the lock when returning to the main menu or closing the tab.
   */
  release() {
    isMatchingOrPlaying = false;
    onConflictCallback = null;
  }
};
