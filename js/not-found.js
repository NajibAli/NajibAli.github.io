// @ts-check
// 404 page: the glass shape, a huge 404 and a way back.

import { initScene } from './scene.js';
import { initThemeToggle, getTheme, onThemeChange } from './theme.js';
import { initCursor } from './cursor.js';
import { initLetterReveals } from './reveal.js';
import { initMagnetic } from './magnetic.js';

const scene = initScene(/** @type {HTMLCanvasElement} */ (document.getElementById('scene')));
scene.setLight(getTheme() === 'light' ? 1 : 0);
scene.setTarget({ x: 0.5, y: 0.5, size: 0.62, hue: 0.04 }, { instant: true });
scene.reveal(1500);

onThemeChange((theme) => scene.setLight(theme === 'light' ? 1 : 0));
initThemeToggle(document.querySelector('.theme-toggle'));
initCursor();
initLetterReveals();
initMagnetic(document.querySelectorAll('.not-found .btn, .theme-toggle'), { strength: 0.3 });
