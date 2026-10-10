// @ts-check
// Skills in orbit: skill pills circle three rings; hovering or focusing one
// pauses the orbit and shows its details.

import { getScrollVelocity, prefersReducedMotion } from '../motion.js';

/** @typedef {import('../data.js').Skill} Skill */

/** Ring radius as a fraction of the outer ring, innermost first. */
const RING_RATIOS = [0.46, 0.73, 1];
/** Degrees per second; positive is clockwise. The middle ring runs the other way. */
const RING_SPEEDS = [7, -5, 3.2];
const RING_LIGHT_SECONDS = [16, 22, 30];
const PILL_GAP_PX = 14;
const RING_SPACING_PX = 44;
const SCROLL_NUDGE = 0.06;

/**
 * @typedef {object} Orbit
 * @property {() => number} innerRingDiameter Diameter of the inner ring in pixels
 * @property {() => void} destroy
 */

/**
 * @param {object} options
 * @param {readonly Skill[]} options.skills
 * @param {(strength: number) => void} options.onPulse Called when a pill is hovered or focused
 * @returns {Orbit}
 */
export function initSkills({ skills, onPulse }) {
  const orbit = /** @type {HTMLElement} */ (document.getElementById('orbit'));
  const list = /** @type {HTMLElement} */ (document.getElementById('skills-list'));
  const detailLevel = /** @type {HTMLElement} */ (document.getElementById('detail-level'));
  const detailName = /** @type {HTMLElement} */ (document.getElementById('detail-name'));
  const detailText = /** @type {HTMLElement} */ (document.getElementById('detail-text'));
  const detail = /** @type {HTMLElement} */ (document.getElementById('skill-detail'));
  const reduced = prefersReducedMotion();

  /** @type {HTMLElement[]} */
  const rings = RING_RATIOS.map((_ratio, index) => {
    const ring = document.createElement('div');
    ring.className = `ring ring--${index}`;
    ring.style.setProperty('--ring-time', `${RING_LIGHT_SECONDS[index]}s`);
    orbit.append(ring);
    return ring;
  });

  /**
   * @typedef {object} PillState
   * @property {HTMLButtonElement} element
   * @property {number} ring
   * @property {number} angle Degrees
   * @property {number} width Measured width in pixels
   */

  /** @type {PillState[]} */
  const pills = skills.map((skill) => {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'pill';
    element.textContent = skill.name;
    element.setAttribute('aria-label', `${skill.name}, ${skill.level.toLowerCase()}`);
    element.dataset.skill = skill.name;
    orbit.append(element);
    return { element, ring: skill.ring, angle: 0, width: 0 };
  });

  for (const skill of skills) {
    const item = document.createElement('li');
    item.textContent = `${skill.name}, ${skill.level.toLowerCase()}: ${skill.detail}`;
    list.append(item);
  }

  let outerRadius = 0;
  let radii = [0, 0, 0];
  let hovered = false;
  let frame = 0;
  let lastTime = performance.now();
  let visible = true;

  /** Spread each ring's pills by their widths so that none overlap at the start. */
  const layout = () => {
    const size = orbit.clientWidth;
    let widest = 0;
    for (const pill of pills) {
      pill.width = pill.element.offsetWidth;
      widest = Math.max(widest, pill.width);
    }
    outerRadius = Math.max(40, size / 2 - widest / 2 - 6);
    radii = RING_RATIOS.map((ratio) => outerRadius * ratio);

    // Rings grow if their pills would not otherwise fit without overlapping.
    RING_RATIOS.forEach((_ratio, ringIndex) => {
      const needed = pills
        .filter((pill) => pill.ring === ringIndex)
        .reduce((sum, pill) => sum + pill.width + PILL_GAP_PX, 0);
      const previous = ringIndex === 0 ? 0 : radii[ringIndex - 1] + RING_SPACING_PX;
      radii[ringIndex] = Math.max(radii[ringIndex], needed / (2 * Math.PI), previous);
    });

    // On very narrow screens shrink the whole orbit, pills included, so nothing leaves the page.
    const extent = radii[radii.length - 1] + widest / 2 + 2;
    const fit = Math.min(1, size / 2 / extent);
    radii = radii.map((radius) => radius * fit);
    for (const pill of pills) {
      pill.width *= fit;
      pill.element.style.setProperty('--fit', String(fit));
    }

    rings.forEach((ring, index) => {
      const diameter = radii[index] * 2;
      ring.style.width = `${diameter}px`;
      ring.style.height = `${diameter}px`;
    });

    RING_RATIOS.forEach((_ratio, ringIndex) => {
      const members = pills.filter((pill) => pill.ring === ringIndex);
      const needed = members.reduce((sum, pill) => sum + pill.width + PILL_GAP_PX, 0);
      const circumference = 2 * Math.PI * radii[ringIndex];
      const spare = Math.max(0, circumference - needed) / Math.max(1, members.length);
      let cursor = ringIndex * 40;
      for (const pill of members) {
        const arc = pill.width + PILL_GAP_PX + spare;
        pill.angle = (cursor + arc / 2) / circumference * 360 - 90;
        cursor += arc;
      }
    });
  };

  const place = () => {
    for (const pill of pills) {
      const radius = radii[pill.ring];
      const radians = (pill.angle * Math.PI) / 180;
      const x = Math.cos(radians) * radius;
      const y = Math.sin(radians) * radius;
      pill.element.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  };

  /** @param {number} now */
  const loop = (now) => {
    const seconds = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    if (!hovered && visible) {
      const nudge = getScrollVelocity() * SCROLL_NUDGE;
      for (const pill of pills) {
        const direction = Math.sign(RING_SPEEDS[pill.ring]);
        pill.angle += RING_SPEEDS[pill.ring] * seconds + direction * nudge;
      }
      place();
    }
    frame = requestAnimationFrame(loop);
  };

  /**
   * @param {Skill} skill
   */
  const showDetail = (skill) => {
    detailLevel.textContent = skill.level;
    detailName.textContent = skill.name;
    detailText.textContent = skill.detail;
    // Restart the entrance animation of the three lines.
    for (const line of detail.children) {
      const element = /** @type {HTMLElement} */ (line);
      element.style.animation = 'none';
      void element.offsetWidth;
      element.style.animation = '';
    }
  };

  /** @param {Event} event */
  const handleEnter = (event) => {
    const pill = event.target instanceof Element ? event.target.closest('.pill') : null;
    if (!(pill instanceof HTMLElement)) return;
    const skill = skills.find((candidate) => candidate.name === pill.dataset.skill);
    if (!skill) return;
    hovered = true;
    showDetail(skill);
    onPulse(0.5);
  };

  const handleLeave = () => {
    hovered = false;
  };

  const observer = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
  });
  observer.observe(orbit);

  const resizeObserver = new ResizeObserver(() => {
    layout();
    place();
  });
  resizeObserver.observe(orbit);

  orbit.addEventListener('pointerover', handleEnter);
  orbit.addEventListener('focusin', handleEnter);
  orbit.addEventListener('pointerout', handleLeave);
  orbit.addEventListener('focusout', handleLeave);

  layout();
  place();
  // Pill widths change once the web font has loaded.
  document.fonts.ready.then(() => {
    layout();
    place();
  });
  if (!reduced) frame = requestAnimationFrame(loop);

  return {
    innerRingDiameter: () => radii[0] * 2,
    destroy() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      orbit.removeEventListener('pointerover', handleEnter);
      orbit.removeEventListener('focusin', handleEnter);
      orbit.removeEventListener('pointerout', handleLeave);
      orbit.removeEventListener('focusout', handleLeave);
    },
  };
}
