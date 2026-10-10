// @ts-check
// Contact: the email capsule copies the address; the glass orbs link out.

import { initMagnetic } from '../magnetic.js';

const COPIED_MS = 2000;

/**
 * @param {object} options
 * @param {() => void} options.onCopied Called after the address has been copied
 * @returns {() => void} destroy
 */
export function initContact({ onCopied }) {
  const capsule = /** @type {HTMLButtonElement | null} */ (document.getElementById('capsule'));
  const address = document.getElementById('capsule-address');
  const status = document.getElementById('capsule-status');
  if (!capsule || !address || !status) return () => {};

  const email = capsule.dataset.email ?? '';

  // Every character is its own span so the address can ripple on hover.
  address.replaceChildren(
    ...[...email].map((character, index) => {
      const letter = document.createElement('span');
      letter.className = 'letter';
      letter.style.setProperty('--i', String(index));
      letter.textContent = character;
      return letter;
    }),
  );

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let resetTimer;

  /** @param {MouseEvent} event */
  const handleClick = async (event) => {
    if (!navigator.clipboard) {
      window.location.href = `mailto:${email}`;
      return;
    }
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      window.location.href = `mailto:${email}`;
      return;
    }

    const rect = capsule.getBoundingClientRect();
    // Keyboard clicks have no position, so flood from the centre.
    const originX = event.clientX ? event.clientX - rect.left : rect.width / 2;
    const originY = event.clientY ? event.clientY - rect.top : rect.height / 2;
    capsule.style.setProperty('--flood-x', `${originX}px`);
    capsule.style.setProperty('--flood-y', `${originY}px`);
    capsule.classList.add('is-copied');
    status.textContent = 'Copied to your clipboard';
    onCopied();

    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      capsule.classList.remove('is-copied');
      status.textContent = '';
    }, COPIED_MS);
  };

  capsule.addEventListener('click', handleClick);
  const stopMagnetic = initMagnetic(
    [capsule, ...document.querySelectorAll('.orb')],
    { strength: 0.18, reach: 0.4 },
  );

  return () => {
    clearTimeout(resetTimer);
    capsule.removeEventListener('click', handleClick);
    stopMagnetic();
  };
}
