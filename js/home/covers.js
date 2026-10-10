// @ts-check
// Covers drawn in code for the two school projects whose code is private.

const SVG_NS = 'http://www.w3.org/2000/svg';
const SEGMENT_COUNT = 17;
const SPECTRUM = ['#8B5CFF', '#3DE8E0', '#FFB38A'];

/**
 * @param {string} name
 * @param {Record<string, string | number>} attributes
 * @returns {SVGElement}
 */
function shape(name, attributes) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

/**
 * A balance figure above a stacked bar, drawn with abstract bars (no real numbers).
 * @returns {SVGSVGElement}
 */
function drawBudgetBuddy() {
  const svg = /** @type {SVGSVGElement} */ (shape('svg', { viewBox: '0 0 400 250', 'aria-hidden': 'true' }));
  svg.append(
    shape('rect', { x: 20, y: 18, width: 70, height: 8, rx: 4, fill: '#9A98B0', opacity: 0.6 }),
    shape('rect', { x: 20, y: 40, width: 190, height: 34, rx: 10, fill: '#EEEAF6' }),
    shape('rect', { x: 20, y: 112, width: 360, height: 26, rx: 13, fill: '#1A1C33' }),
    shape('rect', { x: 20, y: 112, width: 150, height: 26, rx: 13, fill: SPECTRUM[0] }),
    shape('rect', { x: 150, y: 112, width: 120, height: 26, fill: SPECTRUM[1] }),
    shape('rect', { x: 250, y: 112, width: 70, height: 26, fill: SPECTRUM[2] }),
  );
  SPECTRUM.forEach((color, index) => {
    const y = 170 + index * 26;
    svg.append(
      shape('circle', { cx: 26, cy: y + 5, r: 6, fill: color }),
      shape('rect', { x: 44, y, width: 90 + index * 36, height: 10, rx: 5, fill: '#9A98B0', opacity: 0.45 }),
      shape('rect', { x: 320, y, width: 60, height: 10, rx: 5, fill: '#EEEAF6', opacity: 0.7 }),
    );
  });
  return svg;
}

/**
 * A ring of seventeen segments, one for each of the UN Sustainable Development Goals.
 * @returns {SVGSVGElement}
 */
function drawSdgDashboard() {
  const svg = /** @type {SVGSVGElement} */ (shape('svg', { viewBox: '0 0 400 250', 'aria-hidden': 'true' }));
  const cx = 200;
  const cy = 125;
  const outer = 108;
  const inner = 74;
  const gap = 0.045;
  const step = (Math.PI * 2) / SEGMENT_COUNT;

  for (let index = 0; index < SEGMENT_COUNT; index += 1) {
    const start = index * step - Math.PI / 2 + gap;
    const end = (index + 1) * step - Math.PI / 2 - gap;
    const point = (/** @type {number} */ radius, /** @type {number} */ angle) =>
      `${(cx + Math.cos(angle) * radius).toFixed(2)} ${(cy + Math.sin(angle) * radius).toFixed(2)}`;
    const path = `M${point(outer, start)}A${outer} ${outer} 0 0 1 ${point(outer, end)}L${point(inner, end)}A${inner} ${inner} 0 0 0 ${point(inner, start)}Z`;
    const mix = index / (SEGMENT_COUNT - 1);
    const color = mix < 0.5 ? SPECTRUM[0] : SPECTRUM[1];
    svg.append(shape('path', { d: path, fill: color, opacity: 0.35 + 0.65 * ((index * 7) % SEGMENT_COUNT) / SEGMENT_COUNT }));
  }
  svg.append(
    shape('circle', { cx, cy, r: 42, fill: '#1A1C33' }),
    shape('rect', { x: cx - 24, y: cy - 8, width: 48, height: 8, rx: 4, fill: '#EEEAF6' }),
    shape('rect', { x: cx - 16, y: cy + 8, width: 32, height: 6, rx: 3, fill: '#9A98B0', opacity: 0.7 }),
  );
  return svg;
}

/**
 * Create a cover drawn in code.
 * @param {'budget-buddy' | 'sdg-dashboard'} name
 * @returns {HTMLDivElement}
 */
export function createCover(name) {
  const cover = document.createElement('div');
  cover.className = 'cover';
  cover.append(name === 'budget-buddy' ? drawBudgetBuddy() : drawSdgDashboard());
  return cover;
}
