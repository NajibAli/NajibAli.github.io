// @ts-check
// Section tracking: moves the glass shape to a new spot for every section and
// keeps the section rail in sync.

import { gsap, ScrollTrigger } from '../vendor.js';

/** @typedef {import('../scene.js').SceneController} SceneController */
/** @typedef {import('../scene.js').SceneTarget} SceneTarget */

const COMPACT_QUERY = '(max-width: 799px)';

/**
 * @param {string} id Section id
 * @param {HTMLElement | null} orbit The skill orbit element
 * @param {() => number} innerRingDiameter Diameter of the inner skill ring in pixels
 * @returns {SceneTarget}
 */
function targetFor(id, orbit, innerRingDiameter) {
  const compact = window.matchMedia(COMPACT_QUERY).matches;

  switch (id) {
    case 'about':
      return compact
        ? { x: 0.5, y: 0.8, size: 0.62, hue: 0.1 }
        : { x: 0.77, y: 0.5, size: 0.52, hue: 0.1 };
    case 'work':
      return { x: 0.5, y: 1.55, size: 0.7, hue: 0.24, visible: 0 };
    case 'skills': {
      if (!orbit) return { x: 0.5, y: 0.5, size: 0.3, hue: 0.88 };
      const rect = orbit.getBoundingClientRect();
      const shorter = Math.min(window.innerWidth, window.innerHeight);
      return {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
        // The shape renders about 1.3 times its nominal size; keep it inside the pills.
        size: Math.max(0.06, (innerRingDiameter() - 84) / 1.3 / shorter),
        hue: 0.88,
      };
    }
    case 'contact':
      return { x: 0.5, y: 0.5, size: compact ? 0.8 : 0.82, hue: 0.04 };
    default:
      return compact
        ? { x: 0.5, y: 0.3, size: 0.66, hue: 0 }
        : { x: 0.72, y: 0.46, size: 0.58, hue: 0 };
  }
}

/**
 * @param {object} options
 * @param {SceneController} options.scene
 * @param {HTMLElement | null} options.orbit
 * @param {() => number} options.innerRingDiameter
 * @returns {() => void} destroy
 */
export function initSections({ scene, orbit, innerRingDiameter }) {
  gsap.registerPlugin(ScrollTrigger);
  const sections = /** @type {HTMLElement[]} */ ([...document.querySelectorAll('[data-section]')]);
  const railLinks = /** @type {HTMLAnchorElement[]} */ ([...document.querySelectorAll('#rail a')]);
  let currentId = 'top';

  /** @param {string} id */
  const activate = (id, instant = false) => {
    currentId = id;
    scene.setTarget(targetFor(id, orbit, innerRingDiameter), { instant });
    for (const link of railLinks) {
      const isCurrent = link.getAttribute('href') === `#${id}`;
      if (isCurrent) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  };

  const triggers = sections.map((section) =>
    ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 55%',
      onEnter: () => activate(section.dataset.section ?? 'top'),
      onEnterBack: () => activate(section.dataset.section ?? 'top'),
    }),
  );

  const handleResize = () => activate(currentId, true);
  window.addEventListener('resize', handleResize);
  activate(currentId, true);

  return () => {
    window.removeEventListener('resize', handleResize);
    triggers.forEach((trigger) => trigger.kill());
  };
}
