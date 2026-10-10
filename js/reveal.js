// @ts-check
// Reveal helpers: split-letter headings, staggered fade-ups and the
// skeleton → image hand-off. Built on the Web Animations API, so project pages
// can use them without loading the animation libraries.

import { EASE_OUT, prefersReducedMotion } from './motion.js';

/** @typedef {'hero' | 'heading'} LetterPreset */

/** @type {Record<LetterPreset, { duration: number, stagger: number, from: Keyframe }>} */
const LETTER_PRESETS = {
  hero: {
    duration: 1400,
    stagger: 60,
    from: { opacity: 0, filter: 'blur(22px)', transform: 'translateY(35%) rotate(6deg) scale(1.08)' },
  },
  heading: {
    duration: 900,
    stagger: 25,
    from: { opacity: 0, filter: 'blur(10px)', transform: 'translateY(60%)' },
  },
};

/**
 * Replace the text of an element with word and letter spans. The element keeps
 * its readable text through `aria-label`; the spans are hidden from assistive tech.
 * Inline elements inside the text (such as an italic phrase) are preserved.
 * @param {HTMLElement} element
 * @returns {HTMLElement[]} The letter elements, in reading order
 */
export function splitLetters(element) {
  const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  if (!element.hasAttribute('aria-label')) element.setAttribute('aria-label', text);

  /** @type {HTMLElement[]} */
  const letters = [];

  /** @param {Node} node */
  const split = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        split(child);
        continue;
      }
      if (child.nodeType !== Node.TEXT_NODE) continue;

      const fragment = document.createDocumentFragment();
      for (const part of (child.textContent ?? '').split(/(\s+)/)) {
        if (part === '') continue;
        if (/^\s+$/.test(part)) {
          fragment.append(' ');
          continue;
        }
        const word = document.createElement('span');
        word.className = 'word';
        word.setAttribute('aria-hidden', 'true');
        for (const character of part) {
          const letter = document.createElement('span');
          letter.className = 'letter';
          letter.textContent = character;
          word.append(letter);
          letters.push(letter);
        }
        fragment.append(word);
      }
      child.replaceWith(fragment);
    }
  };

  split(element);
  return letters;
}

/**
 * Wrap every word of an element in a `.focus-word` span. Inline elements
 * inside the text (such as an italic phrase) are preserved, and the text
 * stays readable for assistive technology.
 * @param {HTMLElement} element
 * @returns {HTMLElement[]} The word elements, in reading order
 */
export function splitWords(element) {
  /** @type {HTMLElement[]} */
  const words = [];

  /** @param {Node} node */
  const split = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        split(child);
        continue;
      }
      if (child.nodeType !== Node.TEXT_NODE) continue;

      const fragment = document.createDocumentFragment();
      for (const part of (child.textContent ?? '').split(/(\s+)/)) {
        if (part === '') continue;
        if (/^\s+$/.test(part)) {
          fragment.append(' ');
          continue;
        }
        const word = document.createElement('span');
        word.className = 'focus-word';
        word.textContent = part;
        words.push(word);
        fragment.append(word);
      }
      child.replaceWith(fragment);
    }
  };

  split(element);
  return words;
}

/**
 * Give every letter of a gradient phrase its slice of one continuous gradient.
 * (`background-clip: text` does not work on a parent whose children are transformed.)
 * @param {HTMLElement} phrase Element wrapping letters made by {@link splitLetters}
 */
export function fitIris(phrase) {
  const bounds = phrase.getBoundingClientRect();
  for (const letter of phrase.querySelectorAll('.letter, .focus-word')) {
    const rect = letter.getBoundingClientRect();
    const element = /** @type {HTMLElement} */ (letter);
    element.style.setProperty('--iris-x', `${Math.round(bounds.left - rect.left)}px`);
    element.style.setProperty('--iris-w', `${Math.round(bounds.width)}px`);
  }
}

/**
 * Animate letters in. Resolves when the last letter has landed.
 * @param {HTMLElement[]} letters
 * @param {LetterPreset} preset
 * @param {number} [delayMs]
 * @returns {Promise<void>}
 */
export async function playLetters(letters, preset, delayMs = 0) {
  const { duration, stagger, from } = LETTER_PRESETS[preset];
  const animations = letters.map((letter, index) =>
    letter.animate([from, { opacity: 1, filter: 'blur(0px)', transform: 'none' }], {
      duration,
      delay: delayMs + index * stagger,
      easing: EASE_OUT,
      fill: 'both',
    }),
  );
  await Promise.all(animations.map((animation) => animation.finished));
  letters.forEach((letter, index) => {
    letter.style.opacity = '';
    animations[index].cancel();
  });
}

/**
 * Hide letters until their animation starts.
 * @param {HTMLElement[]} letters
 */
export function hideLetters(letters) {
  for (const letter of letters) letter.style.opacity = '0';
}

/**
 * Split and reveal every `[data-reveal="letters"]` heading when it scrolls into view.
 * @param {ParentNode} [root]
 * @returns {() => void} destroy
 */
export function initLetterReveals(root = document) {
  const headings = /** @type {HTMLElement[]} */ ([...root.querySelectorAll('[data-reveal="letters"]')]);
  if (prefersReducedMotion() || headings.length === 0) {
    headings.forEach((heading) => heading.setAttribute('data-reveal-state', 'done'));
    return () => {};
  }

  /** @type {Map<Element, HTMLElement[]>} */
  const pending = new Map();
  for (const heading of headings) {
    const letters = splitLetters(heading);
    hideLetters(letters);
    heading.querySelectorAll('[data-iris]').forEach((phrase) => fitIris(/** @type {HTMLElement} */ (phrase)));
    heading.setAttribute('data-reveal-state', 'ready');
    pending.set(heading, letters);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const letters = pending.get(entry.target);
        if (!letters) continue;
        observer.unobserve(entry.target);
        pending.delete(entry.target);
        playLetters(letters, 'heading');
      }
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  headings.forEach((heading) => observer.observe(heading));

  return () => observer.disconnect();
}

/**
 * Fade up every `[data-reveal="up"]` element as it enters the viewport.
 * Siblings that enter together are staggered by 90ms; `data-delay` adds a manual offset (ms).
 * @param {ParentNode} [root]
 * @returns {() => void} destroy
 */
export function initFadeUps(root = document) {
  const items = /** @type {HTMLElement[]} */ ([...root.querySelectorAll('[data-reveal="up"]')]);
  if (prefersReducedMotion() || items.length === 0) {
    items.forEach((item) => item.setAttribute('data-reveal-state', 'done'));
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      let order = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const item = /** @type {HTMLElement} */ (entry.target);
        observer.unobserve(item);
        const delay = Number(item.dataset.delay ?? 0) + order * 90;
        order += 1;
        const animation = item.animate(
          [
            { opacity: 0, transform: 'translateY(28px)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 1000, delay, easing: EASE_OUT, fill: 'backwards' },
        );
        item.setAttribute('data-reveal-state', 'done');
        animation.finished.catch(() => {});
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  items.forEach((item) => observer.observe(item));

  return () => observer.disconnect();
}

/**
 * Skeleton → image hand-off: a frame keeps its shimmering skeleton until its
 * image has decoded and the frame is on screen, then the image fades in from blur.
 * Frames are `[data-skeleton]` elements that contain one `<img>`.
 * @param {ParentNode} [root]
 * @returns {() => void} destroy
 */
export function initImageHandoff(root = document) {
  const frames = /** @type {HTMLElement[]} */ ([...root.querySelectorAll('[data-skeleton]')]);

  /** @param {HTMLElement} frame */
  const finish = (frame) => frame.setAttribute('data-skeleton', 'done');

  if (prefersReducedMotion()) {
    frames.forEach(finish);
    return () => {};
  }

  /** @type {Map<Element, Promise<void>>} */
  const decoded = new Map();
  for (const frame of frames) {
    const image = frame.querySelector('img');
    if (!image) {
      finish(frame);
      continue;
    }
    decoded.set(frame, image.decode().catch(() => {}));
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const frame = /** @type {HTMLElement} */ (entry.target);
        observer.unobserve(frame);
        decoded.get(frame)?.then(() => finish(frame));
      }
    },
    { rootMargin: '0px 200px 0px 200px' },
  );
  decoded.forEach((_promise, frame) => observer.observe(frame));

  return () => observer.disconnect();
}
