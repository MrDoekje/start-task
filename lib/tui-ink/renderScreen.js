import { render } from "ink";

/**
 * Renders an Ink component until it calls `onResult(value)`, then unmounts
 * and returns the value. Pattern: each "screen" is a one-shot promise.
 *
 * Uses Ink's alternate screen buffer so each render gets a clean, isolated
 * canvas. Two reasons:
 *   1. Prior menus/steps don't bleed into the new screen (Ink leaves its last
 *      frame in the buffer on unmount).
 *   2. cmux preserves the alt-screen buffer per pane, so switching to another
 *      pane and back redraws exactly what Ink last rendered — partial diffs
 *      from a shrinking layout no longer leak through.
 *
 * @param {(onResult: (value: any) => void) => import("react").ReactElement} elementFactory
 * @returns {Promise<any>}
 */
export function renderScreen(elementFactory) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const settle = (value) => {
      if (resolved) return;
      resolved = true;
      try { app.unmount(); } catch { /* already unmounted */ }
      resolve(value);
    };
    let app;
    try {
      app = render(elementFactory(settle), { exitOnCtrlC: false, alternateScreen: true });
    } catch (e) {
      return reject(e);
    }
    // Fallback: if Ink exits for any reason without our settle being called,
    // resolve with undefined so the outer loop doesn't hang.
    app.waitUntilExit().then(() => settle(undefined), () => settle(undefined));
  });
}
