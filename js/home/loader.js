// @ts-check
// Loader: a counter that tracks real loading progress, then wipes upward.

import { EASE_IN_OUT, damp } from '../motion.js';

const MIN_DURATION_MS = 1600;
const MAX_DURATION_MS = 5000;
const WIPE_MS = 1300;

/**
 * @typedef {object} LoaderTask
 * @property {Promise<unknown>} promise Settles (resolved or rejected) when this part has loaded
 * @property {number} weight Share of the total progress
 */

/**
 * @typedef {object} Loader
 * @property {Promise<void>} counted Resolves once the counter has reached 100
 * @property {() => Promise<void>} wipe Reveal the page; resolves when the loader is gone
 * @property {() => void} destroy
 */

/**
 * Start the loader.
 * @param {HTMLElement} element The `.loader` element
 * @param {readonly LoaderTask[]} tasks
 * @returns {Loader}
 */
export function initLoader(element, tasks) {
  const fill = /** @type {HTMLElement} */ (element.querySelector('#loader-fill'));
  const count = /** @type {HTMLElement} */ (element.querySelector('#loader-count'));
  const totalWeight = tasks.reduce((sum, task) => sum + task.weight, 0);

  let loadedWeight = 0;
  for (const task of tasks) {
    task.promise.catch(() => {}).finally(() => {
      loadedWeight += task.weight;
    });
  }

  const startedAt = performance.now();
  let shown = 0;
  let frame = 0;
  let last = startedAt;
  /** @type {() => void} */
  let markCounted = () => {};
  const counted = new Promise((resolve) => {
    markCounted = () => resolve(undefined);
  }).then(() => {});

  /** @param {number} now */
  const tick = (now) => {
    const elapsed = now - startedAt;
    const real = (loadedWeight / totalWeight) * 100;
    // Never run ahead of the minimum duration, and never wait past the maximum.
    const paced = Math.min(100, (elapsed / MIN_DURATION_MS) * 100);
    const target = elapsed > MAX_DURATION_MS ? 100 : Math.min(real, paced);
    shown += (target - shown) * damp(7, Math.min((now - last) / 1000, 0.1));
    last = now;
    if (target >= 100 && shown > 99.5) shown = 100;

    count.textContent = String(Math.round(shown)).padStart(3, '0');
    fill.style.transform = `scaleX(${shown / 100})`;

    if (shown >= 100) {
      markCounted();
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return {
    counted,
    async wipe() {
      const animation = element.animate(
        { clipPath: ['inset(0 0 0 0)', 'inset(0 0 100% 0)'] },
        { duration: WIPE_MS, easing: EASE_IN_OUT, fill: 'forwards' },
      );
      await animation.finished;
      element.remove();
    },
    destroy() {
      cancelAnimationFrame(frame);
      element.remove();
    },
  };
}
