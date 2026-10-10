// @ts-check
// Work cards: renders the project list from data, plus the dialog for the
// school projects whose code is private.

import { createCover } from './covers.js';
import { initImageHandoff } from '../reveal.js';

const EMAIL = 'najiib123098@hotmail.com';
const DESKTOP_GALLERY_QUERY =
  '(min-width: 800px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

/** @typedef {import('../data.js').Project} Project */

/**
 * @param {Project} project
 * @returns {HTMLElement}
 */
function createMedia(project) {
  const media = document.createElement('div');
  media.className = 'work-card__media frame';
  media.dataset.skeleton = 'pending';
  media.setAttribute('data-vt-shot', '');

  const parallax = document.createElement('div');
  parallax.className = 'work-card__parallax';

  if (project.cover.startsWith('assets/')) {
    const image = document.createElement('img');
    image.src = project.cover;
    image.alt = project.coverAlt;
    image.width = 1600;
    image.height = 1000;
    image.loading = 'lazy';
    image.decoding = 'async';
    parallax.append(image);
  } else {
    const cover = createCover(/** @type {'budget-buddy' | 'sdg-dashboard'} */ (project.cover));
    cover.setAttribute('role', 'img');
    cover.setAttribute('aria-label', project.coverAlt);
    parallax.append(cover);
  }

  const skeleton = document.createElement('div');
  skeleton.className = 'work-card__skeleton';
  skeleton.setAttribute('aria-hidden', 'true');
  media.append(parallax, skeleton);
  return media;
}

/**
 * @param {Project} project
 * @param {boolean} reveal Whether the card fades up when it enters (stacked layout)
 * @returns {HTMLLIElement}
 */
function createCard(project, reveal) {
  const item = document.createElement('li');
  item.className = 'work-card';
  if (reveal) item.setAttribute('data-reveal', 'up');

  /** @type {HTMLElement} */
  let link;
  if (project.href) {
    const anchor = document.createElement('a');
    anchor.href = project.href;
    anchor.setAttribute('data-project-link', '');
    anchor.dataset.transitionTitle = project.title;
    link = anchor;
  } else {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.project = project.slug;
    button.setAttribute('aria-haspopup', 'dialog');
    link = button;
  }
  link.className = 'work-card__link';
  link.setAttribute('data-cursor', project.cursorLabel);

  const caption = document.createElement('div');
  caption.className = 'work-card__caption';

  const row = document.createElement('div');
  row.className = 'work-card__row';
  const title = document.createElement('h3');
  title.className = 'work-card__title h-project';
  title.setAttribute('data-vt-title', '');
  title.textContent = project.title;
  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = project.tag;
  row.append(title, tag);

  const stack = document.createElement('p');
  stack.className = 'work-card__stack';
  stack.textContent = project.stack;
  const text = document.createElement('p');
  text.className = 'work-card__text';
  text.textContent = project.description;
  caption.append(row, stack, text);

  link.append(createMedia(project), caption);
  item.append(link);
  return item;
}

/**
 * @param {HTMLElement} track The `<ul>` that receives the cards
 * @param {readonly Project[]} projects
 * @returns {() => void} destroy
 */
export function initWorkCards(track, projects) {
  const stacked = !window.matchMedia(DESKTOP_GALLERY_QUERY).matches;
  track.replaceChildren(...projects.map((project) => createCard(project, stacked)));

  const dialog = /** @type {HTMLDialogElement} */ (document.getElementById('project-dialog'));
  const dialogTitle = /** @type {HTMLElement} */ (document.getElementById('project-dialog-title'));
  const dialogStack = /** @type {HTMLElement} */ (document.getElementById('project-dialog-stack'));
  const dialogText = /** @type {HTMLElement} */ (document.getElementById('project-dialog-text'));
  const dialogMail = /** @type {HTMLAnchorElement} */ (document.getElementById('project-dialog-mail'));
  const dialogClose = /** @type {HTMLElement} */ (document.getElementById('project-dialog-close'));

  /** @param {MouseEvent} event */
  const handleClick = (event) => {
    const button = event.target instanceof Element ? event.target.closest('button[data-project]') : null;
    if (!(button instanceof HTMLElement)) return;
    const project = projects.find((candidate) => candidate.slug === button.dataset.project);
    if (!project) return;

    dialogTitle.textContent = project.title;
    dialogStack.textContent = `${project.tag}. ${project.stack}`;
    dialogText.textContent = project.description;
    dialogMail.href = `mailto:${EMAIL}?subject=${encodeURIComponent(project.title)}`;
    dialog.showModal();
  };

  const close = () => dialog.close();

  /** @param {MouseEvent} event */
  const handleBackdrop = (event) => {
    if (event.target === dialog) dialog.close();
  };

  track.addEventListener('click', handleClick);
  dialogClose.addEventListener('click', close);
  dialog.addEventListener('click', handleBackdrop);
  const stopHandoff = initImageHandoff(track);

  return () => {
    track.removeEventListener('click', handleClick);
    dialogClose.removeEventListener('click', close);
    dialog.removeEventListener('click', handleBackdrop);
    stopHandoff();
  };
}
