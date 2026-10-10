// @ts-check
// Footer: sizes the wordmark to the full width and fills it with the
// spectrum when it scrolls into view.

/**
 * @returns {() => void} destroy
 */
export function initFooter() {
  const wordmark = document.getElementById('wordmark');
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
  if (!wordmark) return () => {};

  const outline = /** @type {HTMLElement} */ (wordmark.querySelector('.wordmark__outline'));
  const REFERENCE_SIZE = 100;

  /** Scale the font so that the word spans the container exactly. */
  const fit = () => {
    const available = (wordmark.parentElement?.clientWidth ?? window.innerWidth)
      - parseFloat(getComputedStyle(wordmark.parentElement ?? document.body).paddingInline) * 2;
    wordmark.style.setProperty('--wordmark-size', `${REFERENCE_SIZE}px`);
    const natural = outline.getBoundingClientRect().width;
    if (natural > 0) wordmark.style.setProperty('--wordmark-size', `${(available / natural) * REFERENCE_SIZE}px`);
  };

  fit();
  document.fonts.ready.then(fit);
  const resizeObserver = new ResizeObserver(fit);
  resizeObserver.observe(document.body);

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        wordmark.classList.add('is-filled');
        observer.disconnect();
      }
    },
    { threshold: 0.35 },
  );
  observer.observe(wordmark);

  return () => {
    observer.disconnect();
    resizeObserver.disconnect();
  };
}
