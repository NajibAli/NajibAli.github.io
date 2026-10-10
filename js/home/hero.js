// @ts-check
// Hero: the name comes into focus letter by letter, then leans toward the
// cursor and drifts away while scrolling.

import { EASE_OUT, clamp, lerp, prefersReducedMotion } from '../motion.js';
import { hideLetters, playLetters, splitLetters } from '../reveal.js';

const MAX_TILT_DEG = 6;
const HEADER_STAGGER_MS = 60;
const NAME_START_MS = 450;
const NAME_STAGGER_MS = 60;

/**
 * @typedef {object} Hero
 * @property {() => Promise<void>} playIntro Run the choreographed entrance
 * @property {() => void} destroy
 */

/**
 * @param {Element[]} elements
 * @param {number} delayMs
 * @param {number} staggerMs
 */
function fadeIn(elements, delayMs, staggerMs = 0) {
  elements.forEach((element, index) => {
    const target = /** @type {HTMLElement} */ (element);
    target.animate(
      [
        { opacity: 0, transform: 'translateY(18px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 1000, delay: delayMs + index * staggerMs, easing: EASE_OUT, fill: 'both' },
    ).finished.then(() => {
      target.style.opacity = '';
    });
  });
}

/**
 * @param {HTMLElement} section The `.hero` element
 * @param {{ playIntroOnLoad: boolean }} options
 * @returns {Hero}
 */
export function initHero(section, options) {
  const name = /** @type {HTMLElement} */ (section.querySelector('.hero__name'));
  const tilt = /** @type {HTMLElement} */ (section.querySelector('.hero__tilt'));
  const headerItems = [...document.querySelectorAll('.site-header .brand, .site-header .nav a, .site-header .menu-button, .site-header .theme-toggle')];
  const heroItems = [...section.querySelectorAll('[data-hero-item]')];
  const rail = document.getElementById('rail');
  const reduced = prefersReducedMotion();

  name.setAttribute('aria-label', 'Najib Ali');
  const letters = splitLetters(name);
  const animateIntro = options.playIntroOnLoad && !reduced;

  if (animateIntro) {
    hideLetters(letters);
    headerItems.forEach((item) => /** @type {HTMLElement} */ (item).style.setProperty('opacity', '0'));
  } else {
    rail?.classList.add('is-ready');
  }

  let pointerX = 0;
  let pointerY = 0;
  let currentX = 0;
  let currentY = 0;
  let frame = 0;
  let running = false;

  const render = () => {
    frame = 0;
    currentX = lerp(currentX, pointerX, 0.08);
    currentY = lerp(currentY, pointerY, 0.08);

    const scroll = window.scrollY;
    const viewport = window.innerHeight;
    const drift = scroll * 0.35;
    const fade = clamp(1 - scroll / (viewport * 0.65), 0, 1);

    tilt.style.transform = `translate3d(0, ${drift}px, 0) rotateX(${(-currentY * MAX_TILT_DEG).toFixed(2)}deg) rotateY(${(currentX * MAX_TILT_DEG).toFixed(2)}deg)`;
    name.style.opacity = String(fade);

    const settled = Math.abs(currentX - pointerX) < 0.002 && Math.abs(currentY - pointerY) < 0.002;
    if (running && !settled) frame = requestAnimationFrame(render);
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  /** @param {PointerEvent} event */
  const handlePointer = (event) => {
    pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
    pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
    schedule();
  };

  if (!reduced) {
    running = true;
    window.addEventListener('pointermove', handlePointer, { passive: true });
    window.addEventListener('scroll', schedule, { passive: true });
  }

  return {
    async playIntro() {
      if (!animateIntro) return;
      fadeIn(headerItems, 0, HEADER_STAGGER_MS);
      fadeIn(heroItems, 300, 90);
      const lettersDone = playLetters(letters, 'hero', NAME_START_MS);
      window.setTimeout(() => rail?.classList.add('is-ready'), NAME_START_MS + letters.length * NAME_STAGGER_MS);
      await lettersDone;
    },
    destroy() {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', handlePointer);
      window.removeEventListener('scroll', schedule);
    },
  };
}
