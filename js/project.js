// @ts-check
// Shared behaviour for every project page: theme, cursor, reveals, transitions.

import { initThemeToggle } from './theme.js';
import { initCursor } from './cursor.js';
import { initPageTransitions } from './transitions.js';
import { initLetterReveals, initFadeUps } from './reveal.js';
import { initMagnetic } from './magnetic.js';

/**
 * Start the shell of a project page.
 * @returns {() => void} destroy
 */
export function initProjectPage() {
  const cleanups = [
    initThemeToggle(document.querySelector('.theme-toggle')),
    initCursor(),
    initPageTransitions(),
    initLetterReveals(),
    initFadeUps(),
    initMagnetic(document.querySelectorAll('.project-main .btn, .theme-toggle'), { strength: 0.25 }),
  ];
  return () => cleanups.forEach((cleanup) => cleanup());
}
