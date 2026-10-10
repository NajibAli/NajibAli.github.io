// @ts-check
// Whack-a-Mole: 60 seconds, one character at a time. Moles score, bombs end the game.

import { initProjectPage } from '../project.js';
import { initSoundToggle, playSound } from '../sfx.js';

/** @typedef {'idle' | 'running' | 'paused' | 'over'} Phase */
/** @typedef {'mole' | 'bomb'} Critter */
/** @typedef {'bomb' | 'time'} Ending */
/** @typedef {{ index: number, kind: Critter, hideAt: number }} ActiveCritter */

const HOLE_COUNT = 9;
const GAME_MS = 60_000;
const FAST_PHASE_MS = 20_000;
const SPAWN_MS = 1000;
const FAST_SPAWN_MS = 500;
const FIRST_SPAWN_MS = 400;
const VISIBLE_MS = 800;
const MOLE_CHANCE = 0.7;
const MOLE_POINTS = 10;
const TICK_MS = 50;
const BOMB_DIALOG_DELAY_MS = 450;
const HIGH_SCORE_KEY = 'whackHighScore';
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * @returns {number}
 */
function readHighScore() {
  try {
    const stored = Number(localStorage.getItem(HIGH_SCORE_KEY));
    return Number.isFinite(stored) && stored > 0 ? Math.floor(stored) : 0;
  } catch {
    return 0;
  }
}

/**
 * @param {number} value
 */
function writeHighScore(value) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(value));
  } catch {
    // The score just won't survive a reload.
  }
}

/**
 * Create the SVG that references one of the shared character drawings.
 * @param {Critter} kind
 * @returns {SVGSVGElement}
 */
function createCritterArt(kind) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#${kind}-art`);
  svg.append(use);
  return svg;
}

/**
 * @typedef {object} Hole
 * @property {HTMLButtonElement} button
 * @property {HTMLElement} critter
 */

/**
 * Start the game inside the current page.
 * @returns {() => void} destroy
 */
function initWhackAMole() {
  const board = /** @type {HTMLElement} */ (document.getElementById('board'));
  const startButton = /** @type {HTMLButtonElement} */ (document.getElementById('start'));
  const pauseButton = /** @type {HTMLButtonElement} */ (document.getElementById('pause'));
  const soundButton = /** @type {HTMLButtonElement} */ (document.getElementById('sound'));
  const statusElement = /** @type {HTMLElement} */ (document.getElementById('status'));
  const timeElement = /** @type {HTMLElement} */ (document.getElementById('time'));
  const timeBar = /** @type {HTMLElement} */ (document.getElementById('time-bar'));
  const scoreElement = /** @type {HTMLElement} */ (document.getElementById('score'));
  const speedElement = /** @type {HTMLElement} */ (document.getElementById('speed'));
  const bestElement = /** @type {HTMLElement} */ (document.getElementById('best'));
  const dialog = /** @type {HTMLDialogElement} */ (document.getElementById('result-dialog'));
  const dialogTitle = /** @type {HTMLElement} */ (document.getElementById('result-title'));
  const dialogText = /** @type {HTMLElement} */ (document.getElementById('result-text'));
  const dialogScore = /** @type {HTMLElement} */ (document.getElementById('result-score'));
  const dialogRecord = /** @type {HTMLElement} */ (document.getElementById('result-record'));
  const playAgainButton = /** @type {HTMLButtonElement} */ (document.getElementById('play-again'));

  /** @type {Phase} */
  let phase = 'idle';
  let score = 0;
  let best = readHighScore();
  let elapsed = 0;
  let nextSpawnAt = FIRST_SPAWN_MS;
  let lastTick = performance.now();
  /** @type {ActiveCritter | null} */
  let active = null;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let dialogTimer;

  /** @type {Hole[]} */
  const holes = [];
  for (let index = 0; index < HOLE_COUNT; index += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hole';
    button.dataset.index = String(index);
    button.setAttribute('aria-label', `Hole ${index + 1}`);

    const key = document.createElement('span');
    key.className = 'hole__key';
    key.setAttribute('aria-hidden', 'true');
    key.textContent = String(index + 1);

    const pit = document.createElement('span');
    pit.className = 'hole__pit';

    const stage = document.createElement('span');
    stage.className = 'hole__stage';
    const critter = document.createElement('span');
    critter.className = 'hole__critter';
    stage.append(critter);

    button.append(key, pit, stage);
    board.append(button);
    holes.push({ button, critter });
  }

  /** @param {string} message */
  const setStatus = (message) => {
    statusElement.textContent = message;
  };

  const renderStats = () => {
    const remaining = Math.max(0, GAME_MS - elapsed);
    timeElement.textContent = String(Math.ceil(remaining / 1000));
    timeBar.style.transform = `scaleX(${remaining / GAME_MS})`;
    scoreElement.textContent = String(score);
    bestElement.textContent = String(best);
    speedElement.textContent = remaining <= FAST_PHASE_MS && phase !== 'idle' ? '2×' : '1×';
  };

  const hideActive = () => {
    if (!active) return;
    const hole = holes[active.index];
    hole.button.classList.remove('is-up');
    hole.critter.replaceChildren();
    hole.button.setAttribute('aria-label', `Hole ${active.index + 1}`);
    active = null;
  };

  const spawn = () => {
    const previous = active?.index;
    hideActive();
    let index = Math.floor(Math.random() * HOLE_COUNT);
    if (index === previous) index = (index + 1 + Math.floor(Math.random() * (HOLE_COUNT - 1))) % HOLE_COUNT;
    /** @type {Critter} */
    const kind = Math.random() < MOLE_CHANCE ? 'mole' : 'bomb';
    const hole = holes[index];
    hole.critter.replaceChildren(createCritterArt(kind));
    hole.button.classList.add('is-up');
    hole.button.setAttribute('aria-label', `Hole ${index + 1}: ${kind}`);
    active = { index, kind, hideAt: elapsed + VISIBLE_MS };
    playSound('pop');
  };

  /** @param {Ending} ending */
  const showResult = (ending) => {
    const isRecord = score > 0 && score > readHighScore();
    if (isRecord) {
      best = score;
      writeHighScore(score);
    }
    dialogTitle.textContent = ending === 'bomb' ? 'Game over' : "Time's up!";
    dialogText.textContent = ending === 'bomb' ? 'You hit a bomb.' : 'Well played! You lasted the full 60 seconds.';
    dialogScore.textContent = `${ending === 'bomb' ? 'Your score' : 'Final score'}: ${score}`;
    dialogRecord.hidden = !isRecord;
    renderStats();
    if (!dialog.open) dialog.showModal();
  };

  /** @param {Ending} ending */
  const finish = (ending) => {
    phase = 'over';
    startButton.disabled = false;
    pauseButton.disabled = true;
    pauseButton.textContent = 'Pause';
    setStatus('Press Start to play.');
    if (ending === 'bomb') {
      hideActive();
      board.classList.remove('is-flash');
      void board.offsetWidth;
      board.classList.add('is-flash');
      playSound('bomb');
      dialogTimer = setTimeout(() => showResult('bomb'), BOMB_DIALOG_DELAY_MS);
    } else {
      hideActive();
      playSound('win');
      showResult('time');
    }
  };

  const start = () => {
    clearTimeout(dialogTimer);
    if (dialog.open) dialog.close();
    hideActive();
    score = 0;
    elapsed = 0;
    nextSpawnAt = FIRST_SPAWN_MS;
    lastTick = performance.now();
    phase = 'running';
    startButton.disabled = true;
    pauseButton.disabled = false;
    pauseButton.textContent = 'Pause';
    setStatus('Hit the moles. Avoid the bombs!');
    playSound('start');
    renderStats();
  };

  const togglePause = () => {
    if (phase === 'running') {
      phase = 'paused';
      pauseButton.textContent = 'Resume';
      setStatus('Paused.');
    } else if (phase === 'paused') {
      phase = 'running';
      lastTick = performance.now();
      pauseButton.textContent = 'Pause';
      setStatus('Hit the moles. Avoid the bombs!');
    }
  };

  /** @param {number} index */
  const hit = (index) => {
    if (phase !== 'running' || !active || active.index !== index) return;
    const hole = holes[index];
    if (active.kind === 'bomb') {
      finish('bomb');
      return;
    }
    score += MOLE_POINTS;
    playSound('hit');
    hole.button.classList.remove('is-hit');
    void hole.button.offsetWidth;
    hole.button.classList.add('is-hit');
    const points = document.createElement('span');
    points.className = 'hole__points';
    points.textContent = `+${MOLE_POINTS}`;
    points.setAttribute('aria-hidden', 'true');
    hole.button.append(points);
    points.addEventListener('animationend', () => points.remove(), { once: true });
    hideActive();
    renderStats();
  };

  const tick = () => {
    const now = performance.now();
    const delta = Math.min(now - lastTick, 250);
    lastTick = now;
    if (phase !== 'running') return;

    elapsed += delta;
    if (elapsed >= GAME_MS) {
      elapsed = GAME_MS;
      renderStats();
      finish('time');
      return;
    }
    if (active && elapsed >= active.hideAt) hideActive();
    if (elapsed >= nextSpawnAt) {
      spawn();
      nextSpawnAt = elapsed + (GAME_MS - elapsed <= FAST_PHASE_MS ? FAST_SPAWN_MS : SPAWN_MS);
    }
    renderStats();
  };

  /** @param {PointerEvent} event */
  const handlePointerDown = (event) => {
    const button = event.target instanceof Element ? event.target.closest('.hole') : null;
    if (button instanceof HTMLElement) hit(Number(button.dataset.index));
  };

  /** @param {MouseEvent} event */
  const handleClick = (event) => {
    // Pointer hits are handled on pointerdown; this covers keyboard activation (detail 0).
    if (event.detail !== 0) return;
    const button = event.target instanceof Element ? event.target.closest('.hole') : null;
    if (button instanceof HTMLElement) hit(Number(button.dataset.index));
  };

  /** @param {KeyboardEvent} event */
  const handleKeydown = (event) => {
    if (dialog.open || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();

    if (key === 's' && (phase === 'idle' || phase === 'over')) {
      start();
    } else if (event.key === ' ' && (phase === 'running' || phase === 'paused')) {
      event.preventDefault();
      togglePause();
    } else if (key === 'm') {
      soundButton.click();
    } else if (/^[1-9]$/.test(event.key)) {
      hit(Number(event.key) - 1);
    }
  };

  // Space pauses mid-game, so it must not also activate the focused button on release.
  /** @param {KeyboardEvent} event */
  const handleKeyup = (event) => {
    if (event.key === ' ' && (phase === 'running' || phase === 'paused') && !dialog.open) event.preventDefault();
  };

  const handleVisibility = () => {
    if (document.hidden && phase === 'running') togglePause();
  };

  const handleDialogClose = () => {
    if (phase === 'over') startButton.focus();
  };

  const timer = setInterval(tick, TICK_MS);
  board.addEventListener('pointerdown', handlePointerDown);
  board.addEventListener('click', handleClick);
  startButton.addEventListener('click', start);
  pauseButton.addEventListener('click', togglePause);
  playAgainButton.addEventListener('click', start);
  dialog.addEventListener('close', handleDialogClose);
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('keyup', handleKeyup);
  document.addEventListener('visibilitychange', handleVisibility);
  renderStats();

  return () => {
    clearInterval(timer);
    clearTimeout(dialogTimer);
    board.removeEventListener('pointerdown', handlePointerDown);
    board.removeEventListener('click', handleClick);
    startButton.removeEventListener('click', start);
    pauseButton.removeEventListener('click', togglePause);
    playAgainButton.removeEventListener('click', start);
    dialog.removeEventListener('close', handleDialogClose);
    document.removeEventListener('keydown', handleKeydown);
    document.removeEventListener('keyup', handleKeyup);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}

initProjectPage();
initSoundToggle(/** @type {HTMLButtonElement | null} */ (document.getElementById('sound')));
initWhackAMole();
