// @ts-check
// Typed project and skill data for the home page.

/** @typedef {'Game for two' | 'Reflex game' | 'Dice game' | 'School project'} ProjectTag */

/**
 * @typedef {object} Project
 * @property {string} slug Used for ids and file names
 * @property {string} title
 * @property {ProjectTag} tag
 * @property {string} stack Technologies, shown under the title
 * @property {string} description
 * @property {string | null} href Project page, or null when the code is private
 * @property {string} cover Screenshot path, or the name of a cover drawn in code
 * @property {string} coverAlt Alternative text for the cover
 * @property {'Play' | 'View'} cursorLabel Label shown on the custom cursor
 */

/** @type {readonly Project[]} */
export const PROJECTS = [
  {
    slug: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    tag: 'Game for two',
    stack: 'HTML, CSS, JavaScript',
    description: 'Two players take turns to get three in a row.',
    href: 'projects/tic-tac-toe.html',
    cover: 'assets/shots/tic-tac-toe.webp',
    coverAlt: 'A Tic Tac Toe board mid-game with violet crosses and aqua circles, and a peach line through a winning row.',
    cursorLabel: 'Play',
  },
  {
    slug: 'whack-a-mole',
    title: 'Whack-a-Mole',
    tag: 'Reflex game',
    stack: 'HTML, CSS, JavaScript',
    description: 'Hit the moles as they pop up, but avoid the bombs.',
    href: 'projects/whack-a-mole.html',
    cover: 'assets/shots/whack-a-mole.webp',
    coverAlt: 'A three by three grid of holes with a violet mole and a bomb popping up, next to the timer and score.',
    cursorLabel: 'Play',
  },
  {
    slug: 'connect-four',
    title: 'Connect Four',
    tag: 'Game for two',
    stack: 'HTML, CSS, JavaScript',
    description: 'Drop discs into the grid and be the first to connect four in a row.',
    href: 'projects/connect-four.html',
    cover: 'assets/shots/connect-four.webp',
    coverAlt: 'A Connect Four board with peach and aqua discs stacked in the grid, four of them outlined as the winning line.',
    cursorLabel: 'Play',
  },
  {
    slug: 'higher-or-lower',
    title: 'Higher or Lower',
    tag: 'Dice game',
    stack: 'HTML, CSS, JavaScript',
    description: 'Guess whether the next roll of the dice will be higher or lower.',
    href: 'projects/higher-or-lower.html',
    cover: 'assets/shots/higher-or-lower.webp',
    coverAlt: 'Two pearl dice showing a total of seven, with Higher and Lower buttons and a row of credit dots.',
    cursorLabel: 'Play',
  },
  {
    slug: 'budget-buddy',
    title: 'Budget Buddy',
    tag: 'School project',
    stack: 'Symfony, PHP, phpMyAdmin, Bootstrap',
    description: 'A personal finance app that helps people keep track of their spending and savings.',
    href: null,
    cover: 'budget-buddy',
    coverAlt: 'An abstract drawing of a balance figure above a stacked bar chart, standing in for the Budget Buddy app.',
    cursorLabel: 'View',
  },
  {
    slug: 'sdg-dashboard',
    title: 'SDG Dashboard',
    tag: 'School project',
    stack: 'Next.js, phpMyAdmin, Tailwind CSS',
    description: 'A dashboard app for tracking and visualizing data on the UN Sustainable Development Goals.',
    href: null,
    cover: 'sdg-dashboard',
    coverAlt: 'An abstract drawing of a ring with seventeen segments, standing in for the SDG Dashboard app.',
    cursorLabel: 'View',
  },
];

/** @typedef {'Advanced' | 'Intermediate' | 'Learning'} SkillLevel */

/**
 * @typedef {object} Skill
 * @property {string} name
 * @property {SkillLevel} level
 * @property {0 | 1 | 2} ring 0 is the innermost ring
 * @property {string} detail
 */

/** @type {readonly Skill[]} */
export const SKILLS = [
  { name: 'HTML', level: 'Advanced', ring: 0, detail: 'Semantic HTML, accessibility' },
  { name: 'CSS', level: 'Advanced', ring: 0, detail: 'Flexbox, Grid, animations, responsive design' },
  { name: 'GitHub', level: 'Advanced', ring: 0, detail: 'Version control, collaboration, projects' },
  { name: 'Bootstrap', level: 'Advanced', ring: 0, detail: 'Responsive grid, components, utilities' },
  { name: 'Tailwind CSS', level: 'Advanced', ring: 0, detail: 'Utility-first, custom components, responsive' },
  { name: 'PHP', level: 'Intermediate', ring: 1, detail: 'PHP basics, forms, sessions' },
  { name: 'MySQL', level: 'Intermediate', ring: 1, detail: 'Queries, database design, relationships' },
  { name: 'Linux', level: 'Intermediate', ring: 1, detail: 'Terminal, basic commands, file management' },
  { name: 'Next.js', level: 'Intermediate', ring: 1, detail: 'Server Components, App Router, API routes, SSR' },
  { name: 'JavaScript', level: 'Learning', ring: 2, detail: 'DOM manipulation, game logic' },
];
