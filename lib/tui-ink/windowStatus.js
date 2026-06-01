/**
 * Framework-agnostic helpers for rendering the list of session windows shared
 * by the status bar and the active-tasks view. The glyph/color mapping is a
 * presentation concern left to the UI layer; this module owns only the logic.
 */

/**
 * Semantic state of a window for display purposes:
 *   - "attached" when it is the focused/active window
 *   - "running"  when its process is still running
 *   - "idle"     otherwise (e.g. the command exited)
 *
 * @param {{ active?: boolean, status?: string }} w
 * @returns {"attached" | "running" | "idle"}
 */
export function windowState(w) {
  if (w.active) return "attached";
  if (w.status === "running") return "running";
  return "idle";
}

/**
 * Structural equality over two window lists, comparing the fields the UI cares
 * about (name, status, active, paneCount). Used to skip no-op re-renders when
 * polling the session manager.
 */
export function sameWindows(a, b) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x.name !== y.name || x.status !== y.status || x.active !== y.active || x.paneCount !== y.paneCount) {
      return false;
    }
  }
  return true;
}
