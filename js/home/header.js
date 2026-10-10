// @ts-check
// Header: the full-screen menu dialog used below 800px.

/**
 * @returns {() => void} destroy
 */
export function initHeader() {
  const dialog = /** @type {HTMLDialogElement | null} */ (document.getElementById('menu'));
  const openButton = document.getElementById('menu-open');
  const closeButton = document.getElementById('menu-close');
  if (!dialog || !openButton || !closeButton) return () => {};

  const open = () => dialog.showModal();
  const close = () => dialog.close();

  /** @param {MouseEvent} event */
  const handleLinkClick = (event) => {
    if (event.target instanceof Element && event.target.closest('a')) close();
  };

  // The menu only makes sense on small screens; close it if the window grows.
  const wideQuery = window.matchMedia('(min-width: 800px)');
  const handleWide = () => {
    if (wideQuery.matches && dialog.open) close();
  };

  openButton.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  dialog.addEventListener('click', handleLinkClick);
  wideQuery.addEventListener('change', handleWide);

  return () => {
    openButton.removeEventListener('click', open);
    closeButton.removeEventListener('click', close);
    dialog.removeEventListener('click', handleLinkClick);
    wideQuery.removeEventListener('change', handleWide);
  };
}
