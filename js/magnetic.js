// @ts-check
// Magnetic hover: elements drift a little toward the pointer when it is near.

import { prefersReducedMotion } from './motion.js';

/**
 * @typedef {object} MagneticOptions
 * @property {number} [strength] Fraction of the pointer offset to follow (0 to 1)
 * @property {number} [reach] How far past the element's edge the pull starts, in element sizes
 */

/**
 * @param {Iterable<Element>} elements
 * @param {MagneticOptions} [options]
 * @returns {() => void} destroy
 */
export function initMagnetic(elements, options = {}) {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!finePointer || prefersReducedMotion()) return () => {};

  const { strength = 0.3, reach = 0.6 } = options;
  /** @type {HTMLElement[]} */
  const items = [];
  for (const element of elements) {
    if (element instanceof HTMLElement) items.push(element);
  }

  /** @param {PointerEvent} event */
  const handleMove = (event) => {
    for (const element of items) {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const offsetX = event.clientX - centerX;
      const offsetY = event.clientY - centerY;
      const reachX = rect.width / 2 + rect.width * reach;
      const reachY = rect.height / 2 + rect.height * reach;
      const inside = Math.abs(offsetX) < reachX && Math.abs(offsetY) < reachY;
      element.style.translate = inside ? `${offsetX * strength}px ${offsetY * strength}px` : '';
    }
  };

  const reset = () => {
    for (const element of items) element.style.translate = '';
  };

  document.addEventListener('pointermove', handleMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', reset);

  return () => {
    document.removeEventListener('pointermove', handleMove);
    document.documentElement.removeEventListener('pointerleave', reset);
    reset();
  };
}
