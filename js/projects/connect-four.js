// @ts-check
// Connect Four: two players on one device, 7 columns by 6 rows.

import { initProjectPage } from '../project.js';
import { prefersReducedMotion } from '../motion.js';
import { initSoundToggle, playSound } from '../sfx.js';

/** @typedef {1 | 2} Player */
/** @typedef {Player | null} Slot */
/** @typedef {readonly [number, number]} Position row, column */

const COLUMNS = 7;
const ROWS = 6;
const WIN_LENGTH = 4;
const FULL_MESSAGE_MS = 2200;
const BASE_FALL_MS = 240;
const FALL_MS_PER_ROW = 85;
const CLEAR_MS = 520;
const SVG_UNITS = 100;

/** @type {readonly Position[]} */
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

/**
 * @returns {Slot[][]}
 */
function createGrid() {
  return Array.from({ length: ROWS }, () => /** @type {Slot[]} */ (Array(COLUMNS).fill(null)));
}

/**
 * Lowest free row in a column, or -1 when the column is full.
 * @param {readonly (readonly Slot[])[]} grid
 * @param {number} column
 * @returns {number}
 */
export function findLandingRow(grid, column) {
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (grid[row][column] === null) return row;
  }
  return -1;
}

/**
 * Find a line of four that includes the disc that was just placed.
 * @param {readonly (readonly Slot[])[]} grid
 * @param {number} row
 * @param {number} column
 * @returns {Position[] | null}
 */
export function findWinningLine(grid, row, column) {
  const player = grid[row][column];
  if (player === null) return null;

  for (const [rowStep, columnStep] of DIRECTIONS) {
    /** @type {Position[]} */
    const line = [[row, column]];
    for (const sign of [1, -1]) {
      let r = row + rowStep * sign;
      let c = column + columnStep * sign;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLUMNS && grid[r][c] === player) {
        line.push([r, c]);
        r += rowStep * sign;
        c += columnStep * sign;
      }
    }
    if (line.length >= WIN_LENGTH) return line;
  }
  return null;
}

/**
 * SVG path for the plate: a rounded slab with a round hole for every disc position.
 * @returns {string}
 */
function buildPlatePath() {
  const left = 6;
  const right = SVG_UNITS * COLUMNS - 6;
  const top = SVG_UNITS + 2;
  const bottom = SVG_UNITS * (ROWS + 1) - 4;
  const radius = 24;
  let path = `M${left + radius} ${top}H${right - radius}A${radius} ${radius} 0 0 1 ${right} ${top + radius}`
    + `V${bottom - radius}A${radius} ${radius} 0 0 1 ${right - radius} ${bottom}H${left + radius}`
    + `A${radius} ${radius} 0 0 1 ${left} ${bottom - radius}V${top + radius}A${radius} ${radius} 0 0 1 ${left + radius} ${top}Z`;

  const holeRadius = 38;
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const x = column * SVG_UNITS + SVG_UNITS / 2;
      const y = (row + 1) * SVG_UNITS + SVG_UNITS / 2;
      path += `M${x - holeRadius} ${y}a${holeRadius} ${holeRadius} 0 1 0 ${holeRadius * 2} 0`
        + `a${holeRadius} ${holeRadius} 0 1 0 ${-holeRadius * 2} 0Z`;
    }
  }
  return path;
}

/**
 * Start the game inside the current page.
 * @returns {() => void} destroy
 */
function initConnectFour() {
  const board = /** @type {HTMLElement} */ (document.getElementById('board'));
  const discsLayer = /** @type {HTMLElement} */ (document.getElementById('discs'));
  const ghost = /** @type {HTMLElement} */ (document.getElementById('ghost'));
  const columnsHost = /** @type {HTMLElement} */ (document.getElementById('columns'));
  const plate = /** @type {SVGPathElement} */ (document.getElementById('plate'));
  const statusElement = /** @type {HTMLElement} */ (document.getElementById('status'));
  const newGameButton = /** @type {HTMLButtonElement} */ (document.getElementById('new-game'));
  const scoreElements = {
    1: /** @type {HTMLElement} */ (document.getElementById('score-1')),
    draws: /** @type {HTMLElement} */ (document.getElementById('score-draws')),
    2: /** @type {HTMLElement} */ (document.getElementById('score-2')),
  };

  plate.setAttribute('d', buildPlatePath());

  let grid = createGrid();
  /** @type {Player} */
  let turn = 1;
  let busy = false;
  let finished = false;
  let focusedColumn = 3;
  /** @type {number | null} */
  let hoveredColumn = null;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let messageTimer;
  const scores = { 1: 0, 2: 0, draws: 0 };

  /** @type {HTMLButtonElement[]} */
  const columnButtons = [];
  for (let column = 0; column < COLUMNS; column += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'c4__column';
    button.dataset.column = String(column);
    button.setAttribute('aria-label', `Drop a disc in column ${column + 1}`);
    button.setAttribute('data-cursor', 'Play');
    columnButtons.push(button);
    columnsHost.append(button);
  }

  const turnMessage = () => `Player ${turn}'s turn`;

  /** @param {string} message */
  const setStatus = (message) => {
    statusElement.textContent = message;
  };

  const renderScores = () => {
    scoreElements[1].textContent = String(scores[1]);
    scoreElements.draws.textContent = String(scores.draws);
    scoreElements[2].textContent = String(scores[2]);
  };

  const renderGhost = () => {
    const column = hoveredColumn ?? focusedColumn;
    const visible = !busy && !finished && (hoveredColumn !== null || columnsHost.contains(document.activeElement));
    ghost.dataset.player = String(turn);
    ghost.style.setProperty('--col', String(column));
    ghost.classList.toggle('is-visible', visible);
  };

  const syncFocusTargets = () => {
    columnButtons.forEach((button, column) => {
      button.tabIndex = column === focusedColumn ? 0 : -1;
    });
  };

  const syncColumnState = () => {
    columnButtons.forEach((button, column) => {
      if (findLandingRow(grid, column) === -1) button.setAttribute('aria-disabled', 'true');
      else button.removeAttribute('aria-disabled');
    });
  };

  /**
   * @param {number} row
   * @param {number} column
   * @param {Player} player
   * @returns {HTMLDivElement}
   */
  const createDisc = (row, column, player) => {
    const disc = document.createElement('div');
    disc.className = 'disc';
    disc.dataset.player = String(player);
    disc.style.setProperty('--row', String(row));
    disc.style.setProperty('--col', String(column));
    return disc;
  };

  /**
   * @param {number} column
   */
  const drop = async (column) => {
    if (busy || finished) return;
    const row = findLandingRow(grid, column);
    if (row === -1) {
      clearTimeout(messageTimer);
      setStatus('That column is full. Pick another one.');
      messageTimer = setTimeout(() => !finished && setStatus(turnMessage()), FULL_MESSAGE_MS);
      return;
    }

    clearTimeout(messageTimer);
    const player = turn;
    busy = true;
    grid[row][column] = player;
    const disc = createDisc(row, column, player);
    discsLayer.append(disc);
    renderGhost();
    playSound('drop');

    const duration = prefersReducedMotion() ? 1 : BASE_FALL_MS + row * FALL_MS_PER_ROW;
    const distance = `${-(row + 1) * 100}%`;
    const fall = disc.animate(
      [
        { transform: `translateY(${distance})`, easing: 'cubic-bezier(.5, 0, .9, .55)' },
        { transform: 'translateY(0)', offset: 0.8, easing: 'cubic-bezier(.2, .6, .4, 1)' },
        { transform: 'translateY(-7%)', offset: 0.9, easing: 'cubic-bezier(.6, 0, .8, .4)' },
        { transform: 'translateY(0)' },
      ],
      { duration, fill: 'backwards' },
    );
    await fall.finished.catch(() => {});
    playSound('land');

    const line = findWinningLine(grid, row, column);
    if (line) {
      finished = true;
      scores[player] += 1;
      board.classList.add('is-won');
      const positions = new Set(line.map(([r, c]) => `${r}:${c}`));
      for (const element of discsLayer.children) {
        const item = /** @type {HTMLElement} */ (element);
        const key = `${item.style.getPropertyValue('--row')}:${item.style.getPropertyValue('--col')}`;
        if (positions.has(key)) item.classList.add('is-win');
      }
      setStatus(`Player ${player} wins!`);
      playSound('win');
    } else if (grid.every((rowSlots) => rowSlots.every((slot) => slot !== null))) {
      finished = true;
      scores.draws += 1;
      setStatus("It's a draw.");
      playSound('draw');
    } else {
      turn = player === 1 ? 2 : 1;
      setStatus(turnMessage());
    }

    busy = false;
    syncColumnState();
    renderScores();
    renderGhost();
    if (finished) newGameButton.focus();
  };

  const newGame = async () => {
    if (busy) return;
    busy = true;
    clearTimeout(messageTimer);
    const discs = [...discsLayer.children];
    if (discs.length > 0 && !prefersReducedMotion()) {
      // Discs fall out through the bottom, lowest row first.
      const animations = discs.map((element) => {
        const disc = /** @type {HTMLElement} */ (element);
        const row = Number(disc.style.getPropertyValue('--row'));
        return disc.animate(
          [{ transform: 'translateY(0)' }, { transform: `translateY(${(ROWS - row + 1) * 100}%)` }],
          { duration: CLEAR_MS, delay: (ROWS - 1 - row) * 45, easing: 'cubic-bezier(.5, 0, .9, .55)', fill: 'forwards' },
        );
      });
      await Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
    }
    discsLayer.replaceChildren();
    grid = createGrid();
    turn = 1;
    finished = false;
    busy = false;
    board.classList.remove('is-won');
    setStatus(turnMessage());
    syncColumnState();
    renderGhost();
  };

  /** @param {MouseEvent} event */
  const handleClick = (event) => {
    const button = event.target instanceof Element ? event.target.closest('.c4__column') : null;
    if (!(button instanceof HTMLButtonElement)) return;
    focusedColumn = Number(button.dataset.column);
    syncFocusTargets();
    drop(focusedColumn);
  };

  /** @param {PointerEvent} event */
  const handlePointerOver = (event) => {
    const button = event.target instanceof Element ? event.target.closest('.c4__column') : null;
    hoveredColumn = button instanceof HTMLElement ? Number(button.dataset.column) : null;
    renderGhost();
  };

  const handlePointerLeave = () => {
    hoveredColumn = null;
    renderGhost();
  };

  /** @param {KeyboardEvent} event */
  const handleColumnKeydown = (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const step = event.key === 'ArrowLeft' ? -1 : 1;
      focusedColumn = Math.min(COLUMNS - 1, Math.max(0, focusedColumn + step));
      syncFocusTargets();
      columnButtons[focusedColumn].focus();
      hoveredColumn = null;
      renderGhost();
      event.preventDefault();
    } else if (event.key === 'ArrowDown') {
      drop(focusedColumn);
      event.preventDefault();
    }
  };

  /** @param {KeyboardEvent} event */
  const handleDocumentKeydown = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^[1-7]$/.test(event.key)) {
      focusedColumn = Number(event.key) - 1;
      syncFocusTargets();
      drop(focusedColumn);
    }
  };

  const handleFocusChange = () => {
    const index = columnButtons.indexOf(/** @type {HTMLButtonElement} */ (document.activeElement));
    if (index !== -1) focusedColumn = index;
    syncFocusTargets();
    renderGhost();
  };

  syncFocusTargets();
  syncColumnState();
  renderScores();
  renderGhost();
  columnsHost.addEventListener('click', handleClick);
  columnsHost.addEventListener('pointerover', handlePointerOver);
  columnsHost.addEventListener('pointerleave', handlePointerLeave);
  columnsHost.addEventListener('keydown', handleColumnKeydown);
  columnsHost.addEventListener('focusin', handleFocusChange);
  columnsHost.addEventListener('focusout', handleFocusChange);
  document.addEventListener('keydown', handleDocumentKeydown);
  newGameButton.addEventListener('click', newGame);

  return () => {
    clearTimeout(messageTimer);
    columnsHost.removeEventListener('click', handleClick);
    columnsHost.removeEventListener('pointerover', handlePointerOver);
    columnsHost.removeEventListener('pointerleave', handlePointerLeave);
    columnsHost.removeEventListener('keydown', handleColumnKeydown);
    columnsHost.removeEventListener('focusin', handleFocusChange);
    columnsHost.removeEventListener('focusout', handleFocusChange);
    document.removeEventListener('keydown', handleDocumentKeydown);
    newGameButton.removeEventListener('click', newGame);
  };
}

initProjectPage();
initSoundToggle(/** @type {HTMLButtonElement | null} */ (document.getElementById('sound')));
initConnectFour();
