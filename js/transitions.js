// @ts-check
// Page transitions. Browsers with cross-document view transitions get a morph
// between a project's card and its page; the others get a gradient curtain.

import { EASE_IN_OUT, prefersReducedMotion } from './motion.js';

const COVERED_KEY = 'curtain';
const CURTAIN_MS = 700;
const MORPH_CLASS = 'project-morph';

/**
 * @typedef {object} PageRevealEvent
 * @property {{ finished: Promise<void> } | null} viewTransition
 */

/**
 * @typedef {object} NavigationApi
 * @property {{ from: { url: string } | null } | null} activation
 */

/**
 * Whether the browser can animate between documents natively.
 * @returns {boolean}
 */
function supportsDocumentTransitions() {
  return 'onpagereveal' in window;
}

/**
 * Give a project card's title and image view-transition names so they morph
 * into the matching elements on the project page.
 * @param {Element} card
 * @returns {() => void} Function that removes the names again
 */
function nameCardElements(card) {
  const pairs = /** @type {[string, string][]} */ ([
    ['[data-vt-title]', 'project-title'],
    ['[data-vt-shot]', 'project-shot'],
  ]);
  /** @type {HTMLElement[]} */
  const named = [];
  for (const [selector, name] of pairs) {
    const element = /** @type {HTMLElement | null} */ (card.querySelector(selector));
    if (!element) continue;
    element.style.setProperty('view-transition-name', name);
    element.style.setProperty('view-transition-class', MORPH_CLASS);
    named.push(element);
  }
  return () => {
    for (const element of named) {
      element.style.removeProperty('view-transition-name');
      element.style.removeProperty('view-transition-class');
    }
  };
}

/**
 * Morph naming: mark the clicked card before leaving, and the card we came
 * from after returning.
 * @returns {() => void} destroy
 */
function initMorph() {
  /** @param {MouseEvent} event */
  const handleClick = (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[data-project-link]') : null;
    if (link) nameCardElements(link);
  };

  /** @param {Event} event */
  const handleReveal = (event) => {
    const { viewTransition } = /** @type {PageRevealEvent} */ (/** @type {unknown} */ (event));
    const navigation = /** @type {NavigationApi | undefined} */ (/** @type {unknown} */ (window).navigation);
    const fromUrl = navigation?.activation?.from?.url;
    if (!viewTransition || !fromUrl) return;

    const fromPath = new URL(fromUrl).pathname;
    const card = [...document.querySelectorAll('a[data-project-link]')].find(
      (link) => new URL(/** @type {HTMLAnchorElement} */ (link).href).pathname === fromPath,
    );
    if (!card) return;
    const clear = nameCardElements(card);
    viewTransition.finished.finally(clear);
  };

  document.addEventListener('click', handleClick, true);
  window.addEventListener('pagereveal', handleReveal);
  return () => {
    document.removeEventListener('click', handleClick, true);
    window.removeEventListener('pagereveal', handleReveal);
  };
}

/**
 * Create a full-screen curtain that carries a title.
 * @param {string} title
 * @returns {HTMLDivElement}
 */
function createCurtain(title) {
  const curtain = document.createElement('div');
  curtain.className = 'curtain';
  curtain.setAttribute('aria-hidden', 'true');
  const heading = document.createElement('span');
  heading.className = 'curtain__title display';
  heading.textContent = title;
  curtain.append(heading);
  document.body.append(curtain);
  return curtain;
}

/**
 * Whether a click should navigate with the curtain.
 * @param {MouseEvent} event
 * @param {HTMLAnchorElement} link
 * @returns {boolean}
 */
function shouldIntercept(event, link) {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (link.target === '_blank' || link.hasAttribute('download')) return false;
  if (link.origin !== location.origin) return false;
  if (link.pathname === location.pathname && link.hash !== '') return false;
  return link.pathname !== location.pathname || link.search !== location.search;
}

/**
 * Curtain transitions for browsers without cross-document view transitions.
 * @returns {() => void} destroy
 */
function initCurtain() {
  const root = document.documentElement;

  /** @type {HTMLDivElement[]} */
  const curtains = [];

  // This page was opened through a curtain: wipe it off upward.
  let wasCovered = false;
  try {
    wasCovered = sessionStorage.getItem(COVERED_KEY) === '1';
    sessionStorage.removeItem(COVERED_KEY);
  } catch {
    // Without storage the curtain simply isn't carried over.
  }
  if (wasCovered) {
    const curtain = createCurtain(document.querySelector('h1')?.textContent?.trim() ?? '');
    curtain.style.clipPath = 'inset(0)';
    curtains.push(curtain);
    root.classList.remove('is-covered');
    curtain
      .animate(
        { clipPath: ['inset(0 0 0 0)', 'inset(0 0 100% 0)'] },
        { duration: CURTAIN_MS, easing: EASE_IN_OUT, fill: 'forwards', delay: 80 },
      )
      .finished.then(() => curtain.remove())
      .catch(() => {});
  }

  /** @param {MouseEvent} event */
  const handleClick = (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!(link instanceof HTMLAnchorElement) || !shouldIntercept(event, link)) return;

    event.preventDefault();
    const title = link.dataset.transitionTitle ?? link.textContent?.trim() ?? '';
    const curtain = createCurtain(title);
    curtains.push(curtain);
    curtain
      .animate(
        { clipPath: ['inset(100% 0 0 0)', 'inset(0 0 0 0)'] },
        { duration: CURTAIN_MS, easing: EASE_IN_OUT, fill: 'forwards' },
      )
      .finished.then(() => {
        try {
          sessionStorage.setItem(COVERED_KEY, '1');
        } catch {
          // Navigation still works without the carried-over curtain.
        }
        location.href = link.href;
      })
      .catch(() => {});
  };

  // Back/forward cache: drop a curtain left over from the previous visit.
  /** @param {PageTransitionEvent} event */
  const handlePageShow = (event) => {
    if (!event.persisted) return;
    curtains.splice(0).forEach((curtain) => curtain.remove());
    root.classList.remove('is-covered');
  };

  document.addEventListener('click', handleClick);
  window.addEventListener('pageshow', handlePageShow);
  return () => {
    document.removeEventListener('click', handleClick);
    window.removeEventListener('pageshow', handlePageShow);
    curtains.splice(0).forEach((curtain) => curtain.remove());
  };
}

/**
 * Set up page transitions for the current page.
 * @returns {() => void} destroy
 */
export function initPageTransitions() {
  if (prefersReducedMotion()) {
    document.documentElement.classList.remove('is-covered');
    return () => {};
  }
  return supportsDocumentTransitions() ? initMorph() : initCurtain();
}
