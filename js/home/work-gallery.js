// @ts-check
// Work gallery: the section pins and vertical scrolling moves the strip of
// project frames sideways. Frames lean with scroll speed and their images drift.

import { gsap, ScrollTrigger } from '../vendor.js';
import { clamp, damp } from '../motion.js';

const GALLERY_QUERY =
  '(min-width: 800px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
const MAX_LEAN_DEG = 9;
const PARALLAX_PX = 46;

/**
 * @returns {() => void} destroy
 */
export function initWorkGallery() {
  gsap.registerPlugin(ScrollTrigger);
  const pin = /** @type {HTMLElement} */ (document.getElementById('work-pin'));
  const track = /** @type {HTMLElement} */ (document.getElementById('work-track'));
  const counter = /** @type {HTMLElement} */ (document.getElementById('work-current'));
  const total = /** @type {HTMLElement} */ (document.getElementById('work-total'));
  const progressBar = /** @type {HTMLElement} */ (document.getElementById('work-progress'));

  const cards = /** @type {HTMLElement[]} */ ([...track.querySelectorAll('.work-card')]);
  total.textContent = String(cards.length).padStart(2, '0');

  const matcher = gsap.matchMedia();
  matcher.add(GALLERY_QUERY, () => {
    const media = cards.map((card) => /** @type {HTMLElement} */ (card.querySelector('.work-card__media')));
    const parallax = cards.map((card) => /** @type {HTMLElement} */ (card.querySelector('.work-card__parallax')));
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

    let lean = 0;
    let lastScroll = window.scrollY;
    let shownIndex = -1;

    /** @param {number} progress */
    const render = (progress) => {
      const shift = progress * distance();
      progressBar.style.transform = `scaleX(${progress})`;

      const index = Math.round(progress * (cards.length - 1));
      if (index !== shownIndex) {
        shownIndex = index;
        counter.textContent = String(index + 1).padStart(2, '0');
      }

      const half = window.innerWidth / 2;
      cards.forEach((card, cardIndex) => {
        const center = card.offsetLeft + card.offsetWidth / 2 - shift;
        const offset = clamp(((center - half) / window.innerWidth) * -PARALLAX_PX * 1.6, -PARALLAX_PX, PARALLAX_PX);
        parallax[cardIndex].style.transform = `translate3d(${offset.toFixed(1)}px, 0, 0)`;
      });
    };

    /** Lean the frames with scroll speed; they spring back when scrolling stops. */
    const spring = () => {
      const delta = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      const target = clamp(delta * 0.35, -MAX_LEAN_DEG, MAX_LEAN_DEG);
      lean += (target - lean) * damp(9, 1 / 60);
      media.forEach((element) => {
        element.style.setProperty('--lean', `${lean.toFixed(2)}deg`);
        element.style.setProperty('--skew', `${(-lean * 0.35).toFixed(2)}deg`);
      });
    };
    gsap.ticker.add(spring);

    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => `+=${distance()}`,
        scrub: 0.4,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        /** @param {{ progress: number }} self */
        onUpdate: (self) => render(self.progress),
      },
    });
    render(0);

    return () => {
      gsap.ticker.remove(spring);
      tween.kill();
      track.style.transform = '';
      media.forEach((element) => {
        element.style.removeProperty('--lean');
        element.style.removeProperty('--skew');
      });
      parallax.forEach((element) => {
        element.style.transform = '';
      });
    };
  });

  return () => matcher.revert();
}
