// @ts-check
// Home page entry point: wires the scene, loader and every section together.

import { PROJECTS, SKILLS } from './data.js';
import { initScene } from './scene.js';
import { initCursor } from './cursor.js';
import { initThemeToggle, getTheme, onThemeChange } from './theme.js';
import { initPageTransitions } from './transitions.js';
import { initLetterReveals, initFadeUps } from './reveal.js';
import { EASE_OUT, initSmoothScroll, prefersReducedMotion } from './motion.js';
import { initMagnetic } from './magnetic.js';
import { initLoader } from './home/loader.js';
import { initHero } from './home/hero.js';
import { initHeader } from './home/header.js';
import { initWorkCards } from './home/work-cards.js';
import { initSkills } from './home/skills.js';
import { initContact } from './home/contact.js';
import { initFooter } from './home/footer.js';

const INTRO_KEY = 'introPlayed';

/**
 * Decode an image so the loader can wait for it. Never rejects.
 * @param {string} source
 * @returns {Promise<void>}
 */
async function preloadImage(source) {
  const image = new Image();
  image.src = source;
  try {
    await image.decode();
  } catch {
    // A missing screenshot must not block the page.
  }
}

/**
 * @returns {boolean}
 */
function introAlreadyPlayed() {
  return document.documentElement.classList.contains('intro-seen');
}

async function start() {
  const root = document.documentElement;
  const playIntro = !introAlreadyPlayed();
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('scene'));

  const scene = initScene(canvas);
  scene.setLight(getTheme() === 'light' ? 1 : 0);
  const stopTheme = onThemeChange((theme) => scene.setLight(theme === 'light' ? 1 : 0));

  // Loader: tracks fonts, the compiled scene and the first screenshots.
  const loaderElement = document.getElementById('loader');
  const firstShots = PROJECTS.filter((project) => project.cover.startsWith('assets/')).slice(0, 2);
  const loader = playIntro && loaderElement
    ? initLoader(loaderElement, [
        { promise: document.fonts.ready, weight: 3 },
        { promise: Promise.resolve(), weight: 1 },
        ...firstShots.map((project) => ({ promise: preloadImage(project.cover), weight: 2 })),
      ])
    : null;
  if (!loader) loaderElement?.remove();

  if (loader) root.classList.add('is-loading');
  const smooth = await initSmoothScroll().catch(() => null);
  if (loader) smooth?.lock();

  /** @type {(() => void)[]} */
  const cleanups = [
    stopTheme,
    initThemeToggle(document.querySelector('.theme-toggle')),
    initCursor(),
    initPageTransitions(),
    initHeader(),
    initWorkCards(/** @type {HTMLElement} */ (document.getElementById('work-track')), PROJECTS),
    initFooter(),
  ];
  if (smooth) cleanups.push(smooth.destroy);

  const skills = initSkills({ skills: SKILLS, onPulse: (strength) => scene.pulse(strength) });
  cleanups.push(skills.destroy);
  cleanups.push(initContact({ onCopied: () => scene.pulse(1.4) }));
  cleanups.push(initMagnetic(document.querySelectorAll('.theme-toggle, .badge__button, .menu-button'), { strength: 0.3 }));

  const hero = initHero(/** @type {HTMLElement} */ (document.querySelector('.hero')), { playIntroOnLoad: playIntro });
  cleanups.push(hero.destroy);

  // Scroll choreography needs GSAP; without it (offline CDN) the page stays static but complete.
  try {
    const [{ initSections }, { initAbout }, { initWorkGallery }] = await Promise.all([
      import('./home/sections.js'),
      import('./home/about.js'),
      import('./home/work-gallery.js'),
    ]);
    cleanups.push(initAbout(), initWorkGallery());
    cleanups.push(
      initSections({
        scene,
        orbit: document.getElementById('orbit'),
        innerRingDiameter: skills.innerRingDiameter,
      }),
    );
  } catch {
    root.classList.remove('motion');
  }

  cleanups.push(initLetterReveals(), initFadeUps());

  if (loader) {
    await loader.counted;
    scene.reveal(1800);
    const wiped = loader.wipe();
    window.setTimeout(() => hero.playIntro(), 500);
    await wiped;
    root.classList.remove('is-loading');
    root.classList.add('intro-seen');
    smooth?.unlock();
    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      // The loader will simply play again on the next visit.
    }
  } else {
    if (!prefersReducedMotion()) document.body.animate({ opacity: [0, 1] }, { duration: 700, easing: EASE_OUT });
    scene.reveal(prefersReducedMotion() ? 0 : 1200);
  }

  window.addEventListener('pagehide', () => cleanups.forEach((cleanup) => cleanup()), { once: true });
}

start();
