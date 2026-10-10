// @ts-check
// Custom cursor: a tight dot, a soft ring that turns into a labelled disc over
// interactive things, and a large light that trails the pointer.

import { prefersReducedMotion, lerp } from './motion.js';

const DOT_FOLLOW = 0.55;
const RING_FOLLOW = 0.17;
const GLOW_FOLLOW = 0.07;
const SETTLE_DISTANCE = 0.3;

/**
 * @param {string} className
 * @returns {HTMLDivElement}
 */
function createLayer(className) {
  const layer = document.createElement('div');
  layer.className = className;
  layer.setAttribute('aria-hidden', 'true');
  return layer;
}

/**
 * Start the custom cursor. Does nothing on touch devices or with reduced motion.
 * @returns {() => void} destroy
 */
export function initCursor() {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!finePointer || prefersReducedMotion()) return () => {};

  const root = document.documentElement;
  const glow = createLayer('cursor-glow');
  const ring = createLayer('cursor-ring');
  const dot = createLayer('cursor-dot');
  const label = document.createElement('span');
  ring.append(label);
  document.body.append(glow, ring, dot);
  root.classList.add('has-cursor');

  const pointer = { x: -100, y: -100 };
  const dotPos = { x: -100, y: -100 };
  const ringPos = { x: -100, y: -100 };
  const glowPos = { x: -100, y: -100 };
  let frame = 0;
  let seen = false;

  const render = () => {
    dotPos.x = lerp(dotPos.x, pointer.x, DOT_FOLLOW);
    dotPos.y = lerp(dotPos.y, pointer.y, DOT_FOLLOW);
    ringPos.x = lerp(ringPos.x, pointer.x, RING_FOLLOW);
    ringPos.y = lerp(ringPos.y, pointer.y, RING_FOLLOW);
    glowPos.x = lerp(glowPos.x, pointer.x, GLOW_FOLLOW);
    glowPos.y = lerp(glowPos.y, pointer.y, GLOW_FOLLOW);
    dot.style.transform = `translate3d(${dotPos.x}px, ${dotPos.y}px, 0)`;
    ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
    glow.style.transform = `translate3d(${glowPos.x}px, ${glowPos.y}px, 0)`;

    const settled = Math.hypot(glowPos.x - pointer.x, glowPos.y - pointer.y) < SETTLE_DISTANCE;
    frame = settled ? 0 : requestAnimationFrame(render);
  };

  const wake = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  /** @param {PointerEvent} event */
  const handleMove = (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (!seen) {
      seen = true;
      dotPos.x = ringPos.x = glowPos.x = pointer.x;
      dotPos.y = ringPos.y = glowPos.y = pointer.y;
      root.classList.add('cursor-active');
    }
    wake();
  };

  /** @param {PointerEvent} event */
  const handleOver = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    root.classList.toggle('cursor-native', Boolean(target?.closest('input, textarea, select, [contenteditable="true"]')));

    const labelled = target?.closest('[data-cursor]');
    const text = labelled?.getAttribute('data-cursor') ?? '';
    label.textContent = text;
    ring.classList.toggle('is-label', text !== '');
    ring.classList.toggle('is-interactive', text === '' && Boolean(target?.closest('a, button, summary, [role="button"]')));
  };

  const handleLeave = () => root.classList.remove('cursor-active');
  const handleEnter = () => {
    if (seen) root.classList.add('cursor-active');
  };
  const handleDown = () => ring.classList.add('is-pressed');
  const handleUp = () => ring.classList.remove('is-pressed');

  document.addEventListener('pointermove', handleMove, { passive: true });
  document.addEventListener('pointerover', handleOver, { passive: true });
  document.addEventListener('pointerdown', handleDown, { passive: true });
  document.addEventListener('pointerup', handleUp, { passive: true });
  document.documentElement.addEventListener('pointerleave', handleLeave);
  document.documentElement.addEventListener('pointerenter', handleEnter);

  return () => {
    cancelAnimationFrame(frame);
    document.removeEventListener('pointermove', handleMove);
    document.removeEventListener('pointerover', handleOver);
    document.removeEventListener('pointerdown', handleDown);
    document.removeEventListener('pointerup', handleUp);
    document.documentElement.removeEventListener('pointerleave', handleLeave);
    document.documentElement.removeEventListener('pointerenter', handleEnter);
    root.classList.remove('has-cursor', 'cursor-active', 'cursor-native');
    glow.remove();
    ring.remove();
    dot.remove();
  };
}
