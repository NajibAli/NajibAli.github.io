// @ts-check
// Higher or Lower: guess whether the next dice roll is higher or lower.

import { initProjectPage } from '../project.js';
import { prefersReducedMotion } from '../motion.js';
import { initSoundToggle, playSound } from '../sfx.js';

/** @typedef {'higher' | 'lower'} Guess */
/** @typedef {{ name: string, score: number }} LeaderboardEntry */

const STARTING_CREDITS = 10;
const POINTS_PER_CORRECT = 5;
const STREAK_FOR_SPIN = 5;
const SPIN_MULTIPLIER = 10;
const SPIN_VALUES = [5, 10, 15, 20, 25];
const REEL_ITEM_PX = 56;
const REEL_CYCLES = 8;
const ROLL_MS = 1000;
const SPIN_MS = 2400;
const LEADERBOARD_KEY = 'higherLowerLeaderboard';
const LEADERBOARD_SIZE = 10;
const PIP_CELLS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** Cube rotation (degrees about X and Y) that brings each face to the front. */
const FACE_ORIENTATION = {
  1: [0, 0],
  2: [0, -90],
  3: [-90, 0],
  4: [90, 0],
  5: [0, 90],
  6: [0, 180],
};

/**
 * Whether a guess is right. A tie counts as correct.
 * @param {Guess} guess
 * @param {number} previous
 * @param {number} total
 * @returns {boolean}
 */
export function isGuessCorrect(guess, previous, total) {
  return guess === 'higher' ? total >= previous : total <= previous;
}

/**
 * @param {number} milliseconds
 * @returns {Promise<void>}
 */
function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, prefersReducedMotion() ? 0 : milliseconds));
}

/**
 * @returns {number} A whole number from 1 to 6
 */
function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * @returns {LeaderboardEntry[]}
 */
function readLeaderboard() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry.name === 'string' && Number.isFinite(entry.score))
      .map((entry) => ({ name: entry.name.slice(0, 20), score: Number(entry.score) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, LEADERBOARD_SIZE);
  } catch {
    return [];
  }
}

/**
 * @param {LeaderboardEntry[]} entries
 */
function writeLeaderboard(entries) {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  } catch {
    // The leaderboard just won't survive a reload.
  }
}

/**
 * Build the six faces of a die with their pips.
 * @param {HTMLElement} cube
 */
function buildFaces(cube) {
  for (const value of /** @type {const} */ ([1, 2, 3, 4, 5, 6])) {
    const face = document.createElement('div');
    face.className = 'die__face';
    face.dataset.value = String(value);
    for (const cell of PIP_CELLS[value]) {
      const pip = document.createElement('span');
      pip.className = 'die__pip';
      pip.style.gridArea = `${Math.floor(cell / 3) + 1} / ${(cell % 3) + 1}`;
      face.append(pip);
    }
    cube.append(face);
  }
}

/**
 * Start the game inside the current page.
 * @returns {() => void} destroy
 */
function initHigherOrLower() {
  /** @param {string} id */
  const byId = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
  const diceHost = byId('dice');
  const totalElement = byId('total');
  const previousElement = byId('previous');
  const badge = byId('badge');
  const rollButton = /** @type {HTMLButtonElement} */ (byId('roll'));
  const higherButton = /** @type {HTMLButtonElement} */ (byId('higher'));
  const lowerButton = /** @type {HTMLButtonElement} */ (byId('lower'));
  const spinButton = /** @type {HTMLButtonElement} */ (byId('spin'));
  const newGameButton = /** @type {HTMLButtonElement} */ (byId('new-game'));
  const creditDots = byId('credit-dots');
  const streakSegments = byId('streak-segments');
  const reel = byId('reel');
  const statusElement = byId('status');
  const scoreElement = byId('score');
  const creditsElement = byId('credits');
  const streakElement = byId('streak');
  const leaderboardList = byId('leaderboard');
  const leaderboardEmpty = byId('leaderboard-empty');
  const dialog = /** @type {HTMLDialogElement} */ (byId('game-over-dialog'));
  const form = /** @type {HTMLFormElement} */ (byId('score-form'));
  const nameInput = /** @type {HTMLInputElement} */ (byId('player-name'));
  const finalScore = byId('final-score');
  const skipButton = /** @type {HTMLButtonElement} */ (byId('skip-score'));

  const cubes = /** @type {HTMLElement[]} */ ([...diceHost.querySelectorAll('.die__cube')]);
  cubes.forEach(buildFaces);
  /** Running cube angles, so every roll keeps turning forward. */
  const angles = cubes.map(() => ({ x: 0, y: 0 }));

  let credits = STARTING_CREDITS;
  let score = 0;
  let streak = 0;
  let spinReady = false;
  /** @type {number | null} */
  let previousTotal = null;
  let busy = false;
  let over = false;
  let reelIndex = 0;

  for (let index = 0; index < STARTING_CREDITS; index += 1) {
    const dot = document.createElement('span');
    dot.className = 'hol__dot';
    creditDots.append(dot);
  }
  for (let index = 0; index < STREAK_FOR_SPIN; index += 1) {
    const segment = document.createElement('span');
    segment.className = 'hol__segment';
    streakSegments.append(segment);
  }
  for (let cycle = 0; cycle < REEL_CYCLES; cycle += 1) {
    for (const value of SPIN_VALUES) {
      const item = document.createElement('span');
      item.className = 'hol__reel-item';
      item.textContent = String(value);
      reel.append(item);
    }
  }

  /** @param {string} message */
  const setStatus = (message) => {
    statusElement.textContent = message;
  };

  const renderMeters = () => {
    scoreElement.textContent = String(score);
    creditsElement.textContent = String(credits);
    streakElement.textContent = `${streak}/${STREAK_FOR_SPIN}`;
    [...creditDots.children].forEach((dot, index) => dot.classList.toggle('is-spent', index >= credits));
    [...streakSegments.children].forEach((segment, index) => segment.classList.toggle('is-filled', index < streak));
  };

  const renderControls = () => {
    const started = previousTotal !== null;
    rollButton.hidden = started;
    higherButton.hidden = !started;
    lowerButton.hidden = !started;
    const locked = busy || over;
    rollButton.disabled = locked;
    higherButton.disabled = locked;
    lowerButton.disabled = locked;
    spinButton.disabled = locked || !spinReady;
    spinButton.classList.toggle('is-ready', spinReady && !locked);
  };

  const renderLeaderboard = () => {
    const entries = readLeaderboard();
    leaderboardList.replaceChildren(
      ...entries.map((entry) => {
        const item = document.createElement('li');
        const name = document.createElement('span');
        name.className = 'leaderboard__name';
        name.textContent = entry.name;
        const points = document.createElement('span');
        points.className = 'leaderboard__points';
        points.textContent = String(entry.score);
        item.append(name, points);
        return item;
      }),
    );
    leaderboardEmpty.hidden = entries.length > 0;
  };

  /**
   * Turn one die so that `value` faces the player.
   * @param {number} dieIndex
   * @param {number} value
   */
  const turnDie = (dieIndex, value) => {
    const [baseX, baseY] = FACE_ORIENTATION[/** @type {1 | 2 | 3 | 4 | 5 | 6} */ (value)];
    const current = angles[dieIndex];
    const spinsX = Math.ceil((current.x - baseX) / 360) + 2;
    const spinsY = Math.ceil((current.y - baseY) / 360) + 2 + dieIndex;
    current.x = baseX + spinsX * 360;
    current.y = baseY + spinsY * 360;
    cubes[dieIndex].style.setProperty('--rx', `${current.x}deg`);
    cubes[dieIndex].style.setProperty('--ry', `${current.y}deg`);
  };

  /**
   * Roll both dice and wait for them to land.
   * @returns {Promise<{ first: number, second: number, total: number }>}
   */
  const rollDice = async () => {
    const first = rollDie();
    const second = rollDie();
    badge.classList.remove('is-visible');
    playSound('roll');
    turnDie(0, first);
    turnDie(1, second);
    await wait(ROLL_MS);
    const total = first + second;
    diceHost.setAttribute('aria-label', `The dice show ${first} and ${second}, a total of ${total}`);
    totalElement.textContent = String(total);
    return { first, second, total };
  };

  /**
   * @param {'correct' | 'wrong'} result
   * @param {string} text
   */
  const showBadge = (result, text) => {
    badge.dataset.result = result;
    badge.textContent = text;
    badge.classList.add('is-visible');
  };

  const finishGame = () => {
    over = true;
    setStatus('You ran out of credits.');
    finalScore.textContent = `Final score: ${score}`;
    renderControls();
    nameInput.value = '';
    if (!dialog.open) dialog.showModal();
  };

  const newGame = () => {
    if (dialog.open) dialog.close();
    credits = STARTING_CREDITS;
    score = 0;
    streak = 0;
    spinReady = false;
    previousTotal = null;
    busy = false;
    over = false;
    totalElement.textContent = '–';
    previousElement.textContent = '\u00a0';
    badge.classList.remove('is-visible');
    diceHost.setAttribute('aria-label', 'The dice have not been rolled yet');
    setStatus('Roll the dice to get your starting number.');
    renderMeters();
    renderControls();
    rollButton.focus();
  };

  const handleRoll = async () => {
    if (busy || over || previousTotal !== null) return;
    busy = true;
    renderControls();
    const { total } = await rollDice();
    previousTotal = total;
    busy = false;
    setStatus(`Will the next roll be higher or lower than ${total}?`);
    renderControls();
    higherButton.focus();
  };

  /** @param {Guess} guess */
  const handleGuess = async (guess) => {
    if (busy || over || previousTotal === null) return;
    const previous = previousTotal;
    busy = true;
    renderControls();
    const { first, second, total } = await rollDice();
    previousElement.textContent = `Previous roll: ${previous}`;

    if (isGuessCorrect(guess, previous, total)) {
      score += POINTS_PER_CORRECT;
      streak = Math.min(STREAK_FOR_SPIN, streak + 1);
      showBadge('correct', `+${POINTS_PER_CORRECT}`);
      playSound('correct');
      const base = total === previous
        ? "Correct! It's a tie, and ties count."
        : `Correct! ${total} is ${total > previous ? 'higher' : 'lower'} than ${previous}.`;
      if (streak === STREAK_FOR_SPIN && !spinReady) {
        spinReady = true;
        setStatus(`${base} Bonus spin unlocked!`);
      } else {
        setStatus(base);
      }
    } else {
      credits -= 1;
      streak = 0;
      showBadge('wrong', '−1 credit');
      playSound('wrong');
      setStatus(`Wrong. The roll was ${first} + ${second} = ${total}.`);
    }

    previousTotal = total;
    busy = false;
    renderMeters();
    if (credits <= 0) {
      await wait(900);
      finishGame();
    } else {
      renderControls();
    }
  };

  const handleSpin = async () => {
    if (busy || over || !spinReady) return;
    busy = true;
    renderControls();
    const valueIndex = Math.floor(Math.random() * SPIN_VALUES.length);
    const value = SPIN_VALUES[valueIndex];

    // Land in a late cycle so the reel always has some distance to travel.
    const landing = (REEL_CYCLES - 2) * SPIN_VALUES.length + valueIndex;
    playSound('spin');
    reel.style.transform = `translateY(${-landing * REEL_ITEM_PX}px)`;
    await wait(SPIN_MS);

    // Jump back to the same value in the first cycle, without animating.
    reel.style.transition = 'none';
    reelIndex = valueIndex;
    reel.style.transform = `translateY(${-reelIndex * REEL_ITEM_PX}px)`;
    void reel.offsetHeight;
    reel.style.transition = '';

    const points = value * SPIN_MULTIPLIER;
    score += points;
    streak = 0;
    spinReady = false;
    busy = false;
    setStatus(`Bonus: ${value} × ${SPIN_MULTIPLIER} = ${points} points!`);
    renderMeters();
    renderControls();
  };

  /** @param {SubmitEvent} event */
  const handleSubmit = (event) => {
    event.preventDefault();
    const name = nameInput.value.trim().slice(0, 20);
    if (name === '') return;
    const entries = readLeaderboard();
    entries.push({ name, score });
    entries.sort((a, b) => b.score - a.score);
    writeLeaderboard(entries.slice(0, LEADERBOARD_SIZE));
    renderLeaderboard();
    newGame();
  };

  const handleRollClick = () => handleRoll();
  const handleHigher = () => handleGuess('higher');
  const handleLower = () => handleGuess('lower');
  const handleSpinClick = () => handleSpin();

  reel.style.transform = `translateY(${-reelIndex * REEL_ITEM_PX}px)`;
  renderMeters();
  renderControls();
  renderLeaderboard();
  rollButton.addEventListener('click', handleRollClick);
  higherButton.addEventListener('click', handleHigher);
  lowerButton.addEventListener('click', handleLower);
  spinButton.addEventListener('click', handleSpinClick);
  newGameButton.addEventListener('click', newGame);
  skipButton.addEventListener('click', newGame);
  form.addEventListener('submit', handleSubmit);

  return () => {
    rollButton.removeEventListener('click', handleRollClick);
    higherButton.removeEventListener('click', handleHigher);
    lowerButton.removeEventListener('click', handleLower);
    spinButton.removeEventListener('click', handleSpinClick);
    newGameButton.removeEventListener('click', newGame);
    skipButton.removeEventListener('click', newGame);
    form.removeEventListener('submit', handleSubmit);
  };
}

initProjectPage();
initSoundToggle(/** @type {HTMLButtonElement | null} */ (document.getElementById('sound')));
initHigherOrLower();
