// @ts-check
// Theme toggle: persists the choice, updates <meta name="theme-color"> and
// reveals the new theme as a circle growing from the button (View Transitions).

import { EASE_IN_OUT, prefersReducedMotion } from './motion.js';

/** @typedef {'dark' | 'light'} Theme */

const STORAGE_KEY = 'theme';
const THEME_COLORS = { dark: '#090A14', light: '#F3F1F8' };
const REVEAL_DURATION_MS = 900;
const THEME_EVENT = 'themechange';

/**
 * Current theme, as applied to the root element by the inline head script.
 * @returns {Theme}
 */
export function getTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/**
 * Listen for theme changes.
 * @param {(theme: Theme) => void} listener
 * @returns {() => void} Unsubscribe function
 */
export function onThemeChange(listener) {
  /** @param {Event} event */
  const handle = (event) => listener(/** @type {CustomEvent<Theme>} */ (event).detail);
  document.addEventListener(THEME_EVENT, handle);
  return () => document.removeEventListener(THEME_EVENT, handle);
}

/**
 * Apply a theme to the document and notify listeners.
 * @param {Theme} theme
 */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private windows); the choice just won't persist.
  }
  document.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

/**
 * Keep the button's label and pressed state in sync with the theme.
 * @param {HTMLButtonElement} button
 * @param {Theme} theme
 */
function updateButton(button, theme) {
  const next = theme === 'dark' ? 'light' : 'dark';
  button.setAttribute('aria-label', `Switch to ${next} theme`);
  button.setAttribute('aria-pressed', String(theme === 'light'));
}

/**
 * Wire up a theme toggle button.
 * @param {HTMLButtonElement | null} button
 * @returns {() => void} destroy
 */
export function initThemeToggle(button) {
  if (!button) return () => {};
  const toggle = button;
  updateButton(toggle, getTheme());
  const stopListening = onThemeChange((theme) => updateButton(toggle, theme));

  /** @param {MouseEvent} event */
  const handleClick = (event) => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    const canTransition = typeof document.startViewTransition === 'function' && !prefersReducedMotion();
    if (!canTransition) {
      applyTheme(next);
      return;
    }

    const rect = toggle.getBoundingClientRect();
    // Keyboard activation reports no pointer position, so grow from the button's centre.
    const x = event.clientX || rect.left + rect.width / 2;
    const y = event.clientY || rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    document.documentElement.classList.add('theme-switching');
    const transition = document.startViewTransition(() => applyTheme(next));
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: REVEAL_DURATION_MS, easing: EASE_IN_OUT, pseudoElement: '::view-transition-new(root)' },
      );
    });
    transition.finished.finally(() => document.documentElement.classList.remove('theme-switching'));
  };

  toggle.addEventListener('click', handleClick);
  return () => {
    toggle.removeEventListener('click', handleClick);
    stopListening();
  };
}
