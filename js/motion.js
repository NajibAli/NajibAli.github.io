// @ts-check
// Motion helpers: reduced-motion check, smooth scrolling and scroll velocity.
// The animation libraries are imported lazily so pages that only need the
// helpers (the project pages) never download them.

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Expo-out easing used by nearly every transition (CSS: `--ease-out`). */
export const EASE_OUT = 'cubic-bezier(.16, 1, .3, 1)';

/** Symmetric ease used for wipes and curtains (CSS: `--ease-io`). */
export const EASE_IN_OUT = 'cubic-bezier(.76, 0, .24, 1)';

/**
 * Whether the visitor asked the system for reduced motion.
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return reducedMotionQuery.matches;
}

/**
 * Linear interpolation.
 * @param {number} from
 * @param {number} to
 * @param {number} amount 0 to 1
 * @returns {number}
 */
export function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

/**
 * Restrict a number to a range.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Frame-rate independent smoothing factor for exponential easing.
 * @param {number} rate Higher is snappier
 * @param {number} deltaSeconds
 * @returns {number}
 */
export function damp(rate, deltaSeconds) {
  return 1 - Math.exp(-rate * deltaSeconds);
}

let scrollVelocity = 0;

/**
 * Smoothed vertical scroll speed in pixels per frame (always positive).
 * @returns {number}
 */
export function getScrollVelocity() {
  return scrollVelocity;
}

/**
 * @typedef {object} SmoothScroll
 * @property {(target: number | string | Element, offset?: number) => void} scrollTo
 * @property {() => void} lock Stop scrolling (used while the loader runs)
 * @property {() => void} unlock
 * @property {() => void} destroy
 */

/**
 * Starts smooth wheel scrolling and keeps GSAP ScrollTrigger in sync with it.
 * With reduced motion the page keeps native scrolling.
 * @returns {Promise<SmoothScroll>}
 */
export async function initSmoothScroll() {
  const { gsap, ScrollTrigger, Lenis } = await import('./vendor.js');
  gsap.registerPlugin(ScrollTrigger);
  let lastScrollY = window.scrollY;

  const trackVelocity = () => {
    const delta = Math.abs(window.scrollY - lastScrollY);
    lastScrollY = window.scrollY;
    scrollVelocity += (delta - scrollVelocity) * 0.18;
  };
  gsap.ticker.add(trackVelocity);

  if (prefersReducedMotion()) {
    /** @param {number | string | Element} target @param {number} [offset] */
    const scrollTo = (target, offset = 0) => {
      if (typeof target === 'number') {
        window.scrollTo({ top: target + offset });
        return;
      }
      const element = typeof target === 'string' ? document.querySelector(target) : target;
      if (!element) return;
      window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY + offset });
    };
    return {
      scrollTo,
      lock() {},
      unlock() {},
      destroy() {
        gsap.ticker.remove(trackVelocity);
      },
    };
  }

  const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, anchors: true });
  const stopSync = lenis.on('scroll', () => ScrollTrigger.update());

  /** @param {number} time seconds */
  const raf = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  return {
    scrollTo: (target, offset = 0) => lenis.scrollTo(target, { offset }),
    lock: () => lenis.stop(),
    unlock: () => lenis.start(),
    destroy() {
      stopSync();
      gsap.ticker.remove(raf);
      gsap.ticker.remove(trackVelocity);
      lenis.destroy();
    },
  };
}
