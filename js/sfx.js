// @ts-check
// Synthesized sound effects for the projects, plus the shared mute setting.
// Everything is generated with the Web Audio API, so there are no sound files.

const STORAGE_KEY = 'soundMuted';

/** @typedef {'place' | 'drop' | 'land' | 'win' | 'draw' | 'hit' | 'bomb' | 'pop' | 'roll' | 'correct' | 'wrong' | 'spin' | 'tick' | 'start'} SoundName */

/** @type {AudioContext | null} */
let context = null;

/**
 * @returns {boolean}
 */
export function isMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * @param {boolean} muted
 */
export function setMuted(muted) {
  try {
    localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
  } catch {
    // Without storage the setting simply lasts for this page view.
  }
}

/**
 * Lazily create the audio context (browsers require a user gesture first).
 * @returns {AudioContext | null}
 */
function getContext() {
  if (!context) {
    const Constructor = window.AudioContext ?? /** @type {typeof AudioContext | undefined} */ (
      /** @type {{ webkitAudioContext?: typeof AudioContext }} */ (window).webkitAudioContext
    );
    if (!Constructor) return null;
    context = new Constructor();
  }
  if (context.state === 'suspended') context.resume().catch(() => {});
  return context;
}

/**
 * @typedef {object} ToneOptions
 * @property {number} frequency Hz
 * @property {number} [endFrequency] Glide to this frequency over the duration
 * @property {OscillatorType} [type]
 * @property {number} [duration] Seconds
 * @property {number} [delay] Seconds from now
 * @property {number} [volume] 0 to 1
 */

/**
 * Play one enveloped oscillator note.
 * @param {AudioContext} audio
 * @param {ToneOptions} options
 */
function tone(audio, { frequency, endFrequency, type = 'sine', duration = 0.15, delay = 0, volume = 0.18 }) {
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

/**
 * A short burst of filtered noise (used for the bomb).
 * @param {AudioContext} audio
 * @param {number} duration Seconds
 */
function noise(audio, duration) {
  const length = Math.floor(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1800, audio.currentTime);
  filter.frequency.exponentialRampToValueAtTime(120, audio.currentTime + duration);
  gain.gain.value = 0.35;
  source.buffer = buffer;
  source.connect(filter).connect(gain).connect(audio.destination);
  source.start();
}

/** @type {Record<SoundName, (audio: AudioContext) => void>} */
const SOUNDS = {
  place: (audio) => tone(audio, { frequency: 520, endFrequency: 380, duration: 0.12, type: 'triangle' }),
  drop: (audio) => tone(audio, { frequency: 300, endFrequency: 180, duration: 0.22, type: 'sine' }),
  land: (audio) => tone(audio, { frequency: 150, endFrequency: 90, duration: 0.12, type: 'triangle', volume: 0.25 }),
  win: (audio) => [523, 659, 784, 1047].forEach((frequency, index) =>
    tone(audio, { frequency, duration: 0.28, delay: index * 0.09, type: 'triangle' })),
  draw: (audio) => [440, 392].forEach((frequency, index) =>
    tone(audio, { frequency, duration: 0.25, delay: index * 0.12, type: 'sine' })),
  hit: (audio) => tone(audio, { frequency: 420, endFrequency: 880, duration: 0.11, type: 'square', volume: 0.08 }),
  bomb: (audio) => {
    noise(audio, 0.6);
    tone(audio, { frequency: 140, endFrequency: 40, duration: 0.5, type: 'sawtooth', volume: 0.22 });
  },
  pop: (audio) => tone(audio, { frequency: 700, endFrequency: 300, duration: 0.07, type: 'sine', volume: 0.08 }),
  roll: (audio) => [0, 1, 2, 3].forEach((index) =>
    tone(audio, { frequency: 200 + index * 40, duration: 0.05, delay: index * 0.06, type: 'square', volume: 0.05 })),
  correct: (audio) => [659, 880].forEach((frequency, index) =>
    tone(audio, { frequency, duration: 0.18, delay: index * 0.09, type: 'triangle' })),
  wrong: (audio) => tone(audio, { frequency: 220, endFrequency: 110, duration: 0.3, type: 'sawtooth', volume: 0.12 }),
  spin: (audio) => [523, 659, 784, 1047, 1319].forEach((frequency, index) =>
    tone(audio, { frequency, duration: 0.2, delay: index * 0.07, type: 'triangle' })),
  tick: (audio) => tone(audio, { frequency: 900, duration: 0.03, type: 'square', volume: 0.04 }),
  start: (audio) => [392, 523].forEach((frequency, index) =>
    tone(audio, { frequency, duration: 0.14, delay: index * 0.08, type: 'triangle' })),
};

/**
 * Play a sound unless the shared mute setting is on.
 * @param {SoundName} name
 */
export function playSound(name) {
  if (isMuted()) return;
  const audio = getContext();
  if (audio) SOUNDS[name](audio);
}

/**
 * Bind a sound toggle button to the shared mute setting.
 * The button needs `aria-pressed` semantics: pressed means sound is on.
 * @param {HTMLButtonElement | null} button
 * @returns {() => void} destroy
 */
export function initSoundToggle(button) {
  if (!button) return () => {};
  const toggle = button;

  const render = () => {
    const on = !isMuted();
    toggle.setAttribute('aria-pressed', String(on));
    toggle.setAttribute('aria-label', on ? 'Sound on. Switch sound off' : 'Sound off. Switch sound on');
    toggle.classList.toggle('is-off', !on);
  };

  const handleClick = () => {
    setMuted(!isMuted());
    render();
    playSound('tick');
  };

  render();
  toggle.addEventListener('click', handleClick);
  return () => toggle.removeEventListener('click', handleClick);
}
