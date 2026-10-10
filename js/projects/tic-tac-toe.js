// @ts-check
// Tic Tac Toe: two players on one device. X always starts.

import { initProjectPage } from '../project.js';
import { initSoundToggle, playSound } from '../sfx.js';

/** @typedef {'X' | 'O'} Mark */
/** @typedef {Mark | null} Cell */

const SIZE = 3;
const SVG_NS = 'http://www.w3.org/2000/svg';
/** Side length of one cell in the win-line overlay's coordinate system. */
const OVERLAY_CELL = 100;

/** @type {Readonly<Record<string, readonly [number, number] | undefined>>} */
const ARROW_STEPS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** @type {readonly (readonly [number, number, number])[]} */
const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

/**
 * Find a line of three equal marks.
 * @param {readonly Cell[]} cells
 * @returns {readonly [number, number, number] | null}
 */
export function findWinningLine(cells) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return line;
  }
  return null;
}

/**
 * @param {number} index
 * @returns {string}
 */
function describeCell(index) {
  return `Row ${Math.floor(index / SIZE) + 1}, column ${(index % SIZE) + 1}`;
}

/**
 * Build the SVG for a mark: X is two strokes, O is one circle stroke.
 * @param {Mark} mark
 * @returns {SVGSVGElement}
 */
function createMark(mark) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'ttt__mark');
  svg.setAttribute('aria-hidden', 'true');

  if (mark === 'X') {
    for (const data of ['M26 26L74 74', 'M74 26L26 74']) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', data);
      path.setAttribute('pathLength', '1');
      svg.append(path);
    }
  } else {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '24');
    circle.setAttribute('pathLength', '1');
    svg.append(circle);
  }
  return svg;
}

/**
 * Start the game inside the current page.
 * @returns {() => void} destroy
 */
function initTicTacToe() {
  const board = /** @type {HTMLElement} */ (document.getElementById('board'));
  const cellsHost = /** @type {HTMLElement} */ (board.querySelector('.ttt__cells'));
  const winLine = /** @type {SVGLineElement} */ (board.querySelector('.ttt__win line'));
  const statusElement = /** @type {HTMLElement} */ (document.getElementById('status'));
  const newGameButton = /** @type {HTMLButtonElement} */ (document.getElementById('new-game'));
  const scoreElements = {
    X: /** @type {HTMLElement} */ (document.getElementById('score-x')),
    draws: /** @type {HTMLElement} */ (document.getElementById('score-draws')),
    O: /** @type {HTMLElement} */ (document.getElementById('score-o')),
  };

  /** @type {Cell[]} */
  let cells = Array(SIZE * SIZE).fill(null);
  /** @type {Mark} */
  let turn = 'X';
  let finished = false;
  let focusIndex = 0;
  const scores = { X: 0, draws: 0, O: 0 };

  /** @type {HTMLButtonElement[]} */
  const buttons = [];
  for (let index = 0; index < SIZE * SIZE; index += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ttt__cell';
    button.dataset.index = String(index);
    button.setAttribute('data-cursor', 'Play');
    buttons.push(button);
    cellsHost.append(button);
  }

  /** @param {number} index */
  const refreshLabel = (index) => {
    const mark = cells[index];
    buttons[index].setAttribute('aria-label', `${describeCell(index)}, ${mark ?? 'empty'}`);
  };

  const syncFocusTargets = () => {
    buttons.forEach((button, index) => {
      button.tabIndex = index === focusIndex ? 0 : -1;
    });
  };

  /** @param {string} message */
  const setStatus = (message) => {
    statusElement.textContent = message;
  };

  const renderScores = () => {
    scoreElements.X.textContent = String(scores.X);
    scoreElements.draws.textContent = String(scores.draws);
    scoreElements.O.textContent = String(scores.O);
  };

  /** @param {readonly [number, number, number]} line */
  const showWinLine = (line) => {
    const center = (/** @type {number} */ index) => ({
      x: (index % SIZE) * OVERLAY_CELL + OVERLAY_CELL / 2,
      y: Math.floor(index / SIZE) * OVERLAY_CELL + OVERLAY_CELL / 2,
    });
    const start = center(line[0]);
    const end = center(line[2]);
    // Extend the line a little past the centres of the outer cells.
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    const extendX = ((end.x - start.x) / length) * 26;
    const extendY = ((end.y - start.y) / length) * 26;
    winLine.setAttribute('x1', String(start.x - extendX));
    winLine.setAttribute('y1', String(start.y - extendY));
    winLine.setAttribute('x2', String(end.x + extendX));
    winLine.setAttribute('y2', String(end.y + extendY));
  };

  /** @param {number} index */
  const place = (index) => {
    if (finished || cells[index]) return;
    const mark = turn;
    cells[index] = mark;
    const button = buttons[index];
    button.dataset.mark = mark;
    button.setAttribute('aria-disabled', 'true');
    button.append(createMark(mark));
    refreshLabel(index);
    playSound('place');

    const line = findWinningLine(cells);
    if (line) {
      finished = true;
      scores[mark] += 1;
      showWinLine(line);
      line.forEach((cellIndex) => buttons[cellIndex].classList.add('is-win'));
      board.classList.add('is-won');
      setStatus(`${mark} wins!`);
      playSound('win');
    } else if (cells.every(Boolean)) {
      finished = true;
      scores.draws += 1;
      board.classList.add('is-draw');
      setStatus("It's a draw.");
      playSound('draw');
    } else {
      turn = mark === 'X' ? 'O' : 'X';
      setStatus(`${turn}'s turn`);
    }

    renderScores();
    if (finished) newGameButton.focus();
  };

  const reset = () => {
    cells = Array(SIZE * SIZE).fill(null);
    turn = 'X';
    finished = false;
    board.classList.remove('is-won', 'is-draw');
    buttons.forEach((button, index) => {
      button.replaceChildren();
      button.removeAttribute('data-mark');
      button.removeAttribute('aria-disabled');
      button.classList.remove('is-win');
      refreshLabel(index);
    });
    focusIndex = 0;
    syncFocusTargets();
    setStatus("X's turn");
    buttons[0].focus();
  };

  /** @param {MouseEvent} event */
  const handleClick = (event) => {
    const button = event.target instanceof Element ? event.target.closest('.ttt__cell') : null;
    if (button instanceof HTMLButtonElement) {
      focusIndex = Number(button.dataset.index);
      syncFocusTargets();
      place(focusIndex);
    }
  };

  /** @param {KeyboardEvent} event */
  const handleKeydown = (event) => {
    const step = ARROW_STEPS[event.key];
    if (!step) return;
    const column = Math.min(SIZE - 1, Math.max(0, (focusIndex % SIZE) + step[0]));
    const row = Math.min(SIZE - 1, Math.max(0, Math.floor(focusIndex / SIZE) + step[1]));
    focusIndex = row * SIZE + column;
    syncFocusTargets();
    buttons[focusIndex].focus();
    event.preventDefault();
  };

  buttons.forEach((_button, index) => refreshLabel(index));
  syncFocusTargets();
  renderScores();
  cellsHost.addEventListener('click', handleClick);
  cellsHost.addEventListener('keydown', handleKeydown);
  newGameButton.addEventListener('click', reset);

  return () => {
    cellsHost.removeEventListener('click', handleClick);
    cellsHost.removeEventListener('keydown', handleKeydown);
    newGameButton.removeEventListener('click', reset);
  };
}

initProjectPage();
initSoundToggle(/** @type {HTMLButtonElement | null} */ (document.getElementById('sound')));
initTicTacToe();
