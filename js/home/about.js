// @ts-check
// About: the statement's words come into focus one by one as you read.

import { gsap, ScrollTrigger } from '../vendor.js';
import { prefersReducedMotion } from '../motion.js';
import { fitIris, splitWords } from '../reveal.js';

/**
 * @returns {() => void} destroy
 */
export function initAbout() {
  const statement = document.getElementById('statement');
  if (!statement || prefersReducedMotion()) return () => {};

  gsap.registerPlugin(ScrollTrigger);
  const words = splitWords(statement);
  statement.querySelectorAll('[data-iris]').forEach((phrase) => fitIris(/** @type {HTMLElement} */ (phrase)));

  const tween = gsap.fromTo(
    words,
    { opacity: 0.12, filter: 'blur(4px)' },
    {
      opacity: 1,
      filter: 'blur(0px)',
      ease: 'none',
      stagger: 0.12,
      scrollTrigger: { trigger: statement, start: 'top 78%', end: 'bottom 48%', scrub: true },
    },
  );

  return () => {
    tween.kill();
  };
}
