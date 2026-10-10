// @ts-check
// The WebGL scene: one fragment shader draws the void and the liquid-glass shape.
// The shape is raymarched (four smooth-blended spheres), refracts the void behind
// it with chromatic dispersion and is lit by studio softboxes plus a highlight
// that follows the cursor. No libraries: raw WebGL.

import { clamp, damp, getScrollVelocity, lerp, prefersReducedMotion } from './motion.js';

/**
 * Where the shape should be.
 * @typedef {object} SceneTarget
 * @property {number} x Centre, as a fraction of the viewport width (0 = left)
 * @property {number} y Centre, as a fraction of the viewport height (0 = top)
 * @property {number} size Diameter, as a fraction of the shorter viewport side
 * @property {number} hue Spectrum shift for the section (0 to 1, wraps)
 * @property {number} [visible] 0 hides the shape, 1 shows it (default 1)
 */

/**
 * @typedef {object} SceneController
 * @property {boolean} active False when WebGL is unavailable and the CSS fallback is shown
 * @property {(target: SceneTarget, options?: { instant?: boolean }) => void} setTarget
 * @property {(strength?: number) => void} pulse Send a ripple through the shape
 * @property {(light: number) => void} setLight Ease towards the light theme (1) or dark theme (0)
 * @property {(durationMs?: number) => void} reveal Grow the shape from nothing
 * @property {() => void} destroy
 */

const STATIC_TIME = 14;
const GLIDE_RATE = 2.4;
const LIGHT_SECONDS = 0.8;
const MAX_PIXEL_RATIO = 1.5;
const SLOW_FRAME_MS = 22;
const SLOW_FRAMES_BEFORE_DROP = 40;
const FAST_SCROLL_PX = 32;
const PULSE_DECAY = 1.7;
const PULSE_SPEED = 13;

const VERTEX_SOURCE = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT_SOURCE = `
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPos;
uniform float uScale;
uniform float uVisible;
uniform vec2 uPointer;
uniform vec2 uLean;
uniform float uLight;
uniform float uPulse;
uniform float uPulsePhase;
uniform float uWobble;
uniform float uHue;
uniform int uSteps;

const vec3 VIOLET = vec3(0.545, 0.361, 1.0);
const vec3 AQUA = vec3(0.239, 0.910, 0.878);
const vec3 PEACH = vec3(1.0, 0.702, 0.541);
const vec3 VOID = vec3(0.035, 0.039, 0.078);
const vec3 PEARL = vec3(0.933, 0.918, 0.965);
const vec3 HAZE_LIGHT = vec3(0.953, 0.945, 0.973);

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Violet to aqua to peach and back, so any hue shift stays on the spectrum.
vec3 palette(float x) {
  float a = fract(x) * 3.0;
  vec3 c = mix(VIOLET, AQUA, smoothstep(0.0, 1.0, a));
  c = mix(c, PEACH, smoothstep(0.0, 1.0, a - 1.0));
  return mix(c, VIOLET, smoothstep(0.0, 1.0, a - 2.0));
}

// The space behind everything: faint aurora, sparse stars, pale haze in light mode.
vec3 voidColor(vec2 uv, float t, float starGain) {
  float a1 = sin(uv.x * 1.7 + t * 0.05 + sin(uv.y * 2.1 - t * 0.04) * 1.4);
  float a2 = sin(uv.y * 2.3 - t * 0.045 + sin(uv.x * 1.3 + t * 0.03) * 1.6);
  float a3 = sin((uv.x + uv.y) * 1.1 + t * 0.035);
  float fieldA = smoothstep(-0.2, 1.0, a1 * 0.5 + a3 * 0.5);
  float fieldB = smoothstep(-0.2, 1.0, a2 * 0.5 + a3 * 0.5);
  vec3 aurora = VIOLET * fieldA * 0.05 + AQUA * fieldB * 0.04;

  vec2 grid = uv * 34.0;
  vec2 cell = floor(grid);
  vec2 local = fract(grid) - 0.5;
  float h = hash21(cell);
  vec2 jitter = (vec2(hash21(cell + 7.1), hash21(cell + 13.3)) - 0.5) * 0.6;
  float star = step(0.965, h) * smoothstep(0.1, 0.0, length(local - jitter));
  star *= 0.5 + 0.5 * sin(t * (0.8 + h * 2.5) + h * 60.0);

  vec3 night = VOID + aurora + vec3(0.8, 0.85, 1.0) * star * 0.55 * starGain;
  vec3 day = HAZE_LIGHT * (1.0 - 0.05 * (fieldA + fieldB)) + aurora * 0.9;
  return mix(night, day, uLight);
}

float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

float map(vec3 p) {
  float t = uTime * 0.28;
  vec3 a = vec3(sin(t * 1.3) * 0.38, cos(t * 1.1) * 0.30, sin(t * 0.8) * 0.25);
  vec3 b = vec3(cos(t * 0.9 + 2.0) * 0.42, sin(t * 1.2 + 1.0) * 0.36, cos(t * 0.7) * 0.20);
  vec3 c = vec3(sin(t * 0.7 + 4.0) * 0.35, cos(t * 1.4 + 3.0) * 0.40, sin(t * 1.0 + 2.0) * 0.28);
  vec3 d = vec3(uLean * 0.5, -0.12);

  float shape = length(p - a) - 0.56;
  shape = smin(shape, length(p - b) - 0.50, 0.55);
  shape = smin(shape, length(p - c) - 0.50, 0.55);
  shape = smin(shape, length(p - d) - 0.40, 0.50);

  float wave = sin(p.x * 3.1 + t * 2.3) * sin(p.y * 2.7 - t * 1.9) * sin(p.z * 3.3 + t * 1.7);
  shape += wave * (0.045 + uWobble * 0.05);

  float radius = length(p);
  shape += sin(radius * 13.0 - uPulsePhase) * uPulse * 0.035 * exp(-radius * 1.1);
  return shape;
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(1.0, -1.0) * 0.0015;
  return normalize(
    e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) +
    e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}

float softbox(vec2 p, vec2 centre, vec2 size, float edge) {
  vec2 q = abs(p - centre) - size;
  return 1.0 - smoothstep(-edge, edge, max(q.x, q.y));
}

// Studio lighting seen along a direction: a key light, a fill strip and a top bar.
float studio(vec3 dir) {
  float facing = smoothstep(0.1, -0.35, dir.z);
  float key = softbox(dir.xy, vec2(-0.55, 0.5), vec2(0.13, 0.36), 0.08);
  float fill = softbox(dir.xy, vec2(0.7, 0.1), vec2(0.06, 0.5), 0.07);
  float top = softbox(dir.xy, vec2(0.0, 0.88), vec2(0.5, 0.05), 0.06);
  return (key * 1.0 + fill * 0.7 + top * 0.55) * facing;
}

vec3 shade(vec3 p, vec3 rd, vec3 n, vec2 uv) {
  float t = uTime;
  float ndv = clamp(dot(n, -rd), 0.0, 1.0);
  float edge = 1.0 - ndv;
  float fresnel = pow(edge, 3.0);

  // Thin-film iridescence: colour driven by the viewing angle.
  float film = edge * 1.25 + n.y * 0.22 + n.x * 0.15 + uHue + t * 0.012;
  vec3 irid = palette(film);
  vec3 irid2 = palette(film + 0.4);

  // Refraction with chromatic dispersion: the void behind the glass, bent,
  // with red, green and blue bending by slightly different amounts.
  float thickness = 0.35 + 0.65 * edge;
  vec3 rr = refract(rd, n, 1.0 / 1.10);
  vec3 rg = refract(rd, n, 1.0 / 1.16);
  vec3 rb = refract(rd, n, 1.0 / 1.23);
  vec3 behind = vec3(
    voidColor(uv + (rr.xy - rd.xy) * 0.9 * thickness, t, 0.25).r,
    voidColor(uv + (rg.xy - rd.xy) * 0.9 * thickness, t, 0.25).g,
    voidColor(uv + (rb.xy - rd.xy) * 0.9 * thickness, t, 0.25).b);
  vec3 seen = vec3(studio(rr), studio(rg), studio(rb));

  // Deep core, tinted by the light that passes through it.
  vec3 col = vec3(0.012, 0.014, 0.05);
  col += behind * 1.5;
  vec3 coreTint = mix(VIOLET, AQUA, 0.5 + 0.5 * sin(film * 6.0 + t * 0.15));
  col += coreTint * 0.24 * (0.4 + edge);
  col += seen * (0.35 + 0.65 * irid2) * 0.7;

  // Slow bands of spectrum drifting across the body, a coloured caustic on the
  // underside, and a brighter iridescent band towards the edge.
  col += palette(film * 1.5 + p.y * 0.9 + t * 0.02) * pow(edge, 1.3) * 0.5;
  col += irid2 * pow(max(dot(n, normalize(vec3(0.35, -0.8, -0.25))), 0.0), 3.0) * 0.55;
  col += irid * pow(edge, 1.7) * 0.85;

  // Softbox reflections on the surface.
  vec3 refl = reflect(rd, n);
  float boxes = studio(refl);
  col += boxes * mix(vec3(1.0), irid, 0.25) * (0.25 + 1.0 * fresnel);

  // Thin pearl rim: red, green and blue fall off at different rates.
  col += PEARL * vec3(pow(edge, 4.0), pow(edge, 4.6), pow(edge, 5.2)) * 0.6;

  // Specular highlight whose light source follows the cursor.
  vec3 lightDir = normalize(vec3(uPointer * 2.4, -1.25));
  vec3 halfway = normalize(lightDir - rd);
  float angle = max(dot(n, halfway), 0.0);
  float spec = pow(angle, 420.0);
  col += (spec * 1.3 + pow(angle, 40.0) * 0.14) * vec3(1.0, 0.98, 1.0);

  // Light theme: the same object as milky glass with brighter iridescence.
  vec3 milky = vec3(0.90, 0.89, 0.97);
  milky = mix(milky, irid2, 0.28 + 0.35 * edge);
  milky = mix(milky, irid, pow(edge, 1.6) * 0.8);
  milky *= 0.8 + 0.2 * (n.y * 0.5 + 0.5);
  milky += boxes * 0.45 + spec * 0.9;
  return mix(col, milky, uLight);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime;
  vec3 col = voidColor(uv, t, 1.0);

  // Vignette
  float vignette = smoothstep(0.55, 1.35, length(uv * vec2(0.85, 1.0)));
  col *= 1.0 - vignette * mix(0.35, 0.07, uLight);

  if (uVisible > 0.001) {
    vec2 s = (uv - uPos) / uScale;
    float diameter = 0.8 * uScale;

    // A soft coloured glow on the floor beneath the shape.
    vec2 floorPos = uv - (uPos + vec2(0.0, -0.46 * diameter));
    float glow = exp(-(floorPos.x * floorPos.x * 2.6 + floorPos.y * floorPos.y * 22.0) / max(diameter * diameter, 0.0001));
    vec3 glowColor = palette(uHue + t * 0.02);
    vec3 glowDark = col + glowColor * glow * 0.2 * uVisible;
    vec3 glowLight = col * mix(vec3(1.0), glowColor, glow * 0.4 * uVisible);
    col = mix(glowDark, glowLight, uLight);

    if (length(s) < 0.75) {
      vec3 ro = vec3(0.0, 0.0, -3.2);
      vec3 rd = normalize(vec3(s, 1.6));
      float travelled = 1.4;
      float closest = 1e3;
      vec3 closestPoint = ro;
      bool hit = false;
      for (int i = 0; i < 64; i++) {
        if (i >= uSteps) break;
        vec3 p = ro + rd * travelled;
        float d = map(p);
        if (d < closest) {
          closest = d;
          closestPoint = p;
        }
        if (d < 0.0012) {
          hit = true;
          closestPoint = p;
          break;
        }
        travelled += d * 0.9;
        if (travelled > 6.0) break;
      }

      // Anti-aliasing: blend a thin rim of near misses into the background.
      float pixel = 2.0 / (uRes.y * uScale);
      float coverage = hit ? 1.0 : 1.0 - smoothstep(0.0, pixel * 1.5, closest);
      if (coverage > 0.001) {
        vec3 n = calcNormal(closestPoint);
        vec3 shape = shade(closestPoint, rd, n, uv);
        col = mix(col, shape, coverage * uVisible);
      }
    }
  }

  col += (hash21(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

/**
 * @param {WebGLRenderingContext} gl
 * @param {number} type
 * @param {string} source
 * @returns {WebGLShader | null}
 */
function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * @param {WebGLRenderingContext} gl
 * @returns {WebGLProgram | null}
 */
function createProgram(gl) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE);
  if (!vertex || !fragment) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

/**
 * Cubic ease-out with a little overshoot, used when the shape is born.
 * @param {number} x 0 to 1
 * @returns {number}
 */
function easeOutBack(x) {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/**
 * Start the scene on a canvas. Falls back to the CSS glow without WebGL.
 * @param {HTMLCanvasElement} canvas
 * @returns {SceneController}
 */
export function initScene(canvas) {
  const root = document.documentElement;
  /** @type {SceneController} */
  const inactive = {
    active: false,
    setTarget() {},
    pulse() {},
    setLight() {},
    reveal() {},
    destroy() {},
  };

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  const program = gl ? createProgram(gl) : null;
  if (!gl || !program) {
    root.classList.add('no-webgl');
    return inactive;
  }

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    res: gl.getUniformLocation(program, 'uRes'),
    time: gl.getUniformLocation(program, 'uTime'),
    pos: gl.getUniformLocation(program, 'uPos'),
    scale: gl.getUniformLocation(program, 'uScale'),
    visible: gl.getUniformLocation(program, 'uVisible'),
    pointer: gl.getUniformLocation(program, 'uPointer'),
    lean: gl.getUniformLocation(program, 'uLean'),
    light: gl.getUniformLocation(program, 'uLight'),
    pulse: gl.getUniformLocation(program, 'uPulse'),
    pulsePhase: gl.getUniformLocation(program, 'uPulsePhase'),
    wobble: gl.getUniformLocation(program, 'uWobble'),
    hue: gl.getUniformLocation(program, 'uHue'),
    steps: gl.getUniformLocation(program, 'uSteps'),
  };

  const isStatic = prefersReducedMotion();
  const compact = window.matchMedia('(max-width: 700px), (pointer: coarse)').matches;
  const stepCount = compact ? 30 : 56;
  const baseQuality = { value: compact ? 0.75 : 0.85 };

  const state = {
    x: 0.7,
    y: 0.45,
    size: 0.7,
    hue: 0,
    visible: 1,
    target: /** @type {SceneTarget} */ ({ x: 0.7, y: 0.45, size: 0.7, hue: 0, visible: 1 }),
    light: 0,
    lightTarget: 0,
    pointerX: 0,
    pointerY: 0,
    smoothPointerX: 0,
    smoothPointerY: 0,
    pulse: 0,
    pulsePhase: 0,
    wobble: 0,
    birth: isStatic ? 1 : 0,
    /** Negative until eveal() is called, so the shape stays unborn behind the loader. */
    birthStart: -1,
    birthDuration: 1,
  };

  let width = 1;
  let height = 1;
  let quality = baseQuality.value;
  let frame = 0;
  let lastNow = performance.now();
  let slowFrames = 0;
  let frameAverage = 16;
  let destroyed = false;
  const startTime = performance.now();

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO) * quality;
    width = Math.max(2, Math.round(window.innerWidth * ratio));
    height = Math.max(2, Math.round(window.innerHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  };

  /**
   * @param {number} now
   * @param {number} deltaSeconds
   */
  const draw = (now, deltaSeconds) => {
    const aspect = window.innerWidth / window.innerHeight;
    const glide = damp(GLIDE_RATE, deltaSeconds);
    state.x = lerp(state.x, state.target.x, glide);
    state.y = lerp(state.y, state.target.y, glide);
    state.size = lerp(state.size, state.target.size, glide);
    state.visible = lerp(state.visible, state.target.visible ?? 1, glide);
    state.hue = lerp(state.hue, state.target.hue, damp(1.4, deltaSeconds));

    const lightStep = deltaSeconds / LIGHT_SECONDS;
    state.light += clamp(state.lightTarget - state.light, -lightStep, lightStep);

    state.smoothPointerX = lerp(state.smoothPointerX, state.pointerX, damp(9, deltaSeconds));
    state.smoothPointerY = lerp(state.smoothPointerY, state.pointerY, damp(9, deltaSeconds));

    state.pulse *= Math.exp(-PULSE_DECAY * deltaSeconds);
    state.pulsePhase += PULSE_SPEED * deltaSeconds;
    const scrollWobble = clamp(getScrollVelocity() / 45, 0, 1);
    state.wobble = lerp(state.wobble, scrollWobble, damp(5, deltaSeconds));

    let birthScale = 1;
    if (state.birth < 1) {
      if (state.birthStart >= 0) state.birth = clamp((now - state.birthStart) / state.birthDuration, 0, 1);
      birthScale = state.birthStart >= 0 ? Math.max(0.0001, easeOutBack(state.birth)) : 0.0001;
    }

    const centerX = (state.x - 0.5) * aspect;
    const centerY = 0.5 - state.y;
    const diameter = state.size * Math.min(aspect, 1) * birthScale;
    const pointerRelX = clamp((state.smoothPointerX - centerX) / 0.8, -1, 1);
    const pointerRelY = clamp((state.smoothPointerY - centerY) / 0.8, -1, 1);
    const time = isStatic ? STATIC_TIME : (now - startTime) / 1000 + STATIC_TIME;

    gl.uniform2f(uniforms.res, width, height);
    gl.uniform1f(uniforms.time, time);
    gl.uniform2f(uniforms.pos, centerX, centerY);
    gl.uniform1f(uniforms.scale, diameter / 0.8);
    gl.uniform1f(uniforms.visible, clamp(state.visible, 0, 1));
    gl.uniform2f(uniforms.pointer, pointerRelX, pointerRelY);
    gl.uniform2f(uniforms.lean, pointerRelX * 0.9, pointerRelY * 0.9);
    gl.uniform1f(uniforms.light, state.light);
    gl.uniform1f(uniforms.pulse, state.pulse);
    gl.uniform1f(uniforms.pulsePhase, state.pulsePhase);
    gl.uniform1f(uniforms.wobble, state.wobble);
    gl.uniform1f(uniforms.hue, state.hue);
    gl.uniform1i(uniforms.steps, stepCount);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  /**
   * Adaptive resolution: back off while scrolling fast or when frames run long.
   * @param {number} deltaMs
   */
  const adaptQuality = (deltaMs) => {
    frameAverage = frameAverage * 0.9 + deltaMs * 0.1;
    slowFrames = frameAverage > SLOW_FRAME_MS ? slowFrames + 1 : 0;
    if (slowFrames > SLOW_FRAMES_BEFORE_DROP && baseQuality.value > 0.45) {
      baseQuality.value = Math.max(0.45, baseQuality.value * 0.85);
      slowFrames = 0;
    }
    const target = getScrollVelocity() > FAST_SCROLL_PX ? Math.min(0.55, baseQuality.value) : baseQuality.value;
    if (Math.abs(target - quality) > 0.04) {
      quality = target;
      resize();
    }
  };

  /** @param {number} now */
  const loop = (now) => {
    if (destroyed) return;
    const deltaMs = Math.min(now - lastNow, 100);
    lastNow = now;
    adaptQuality(deltaMs);
    draw(now, deltaMs / 1000);
    frame = requestAnimationFrame(loop);
  };

  const renderOnce = () => {
    if (!isStatic || destroyed) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame((now) => draw(now, 10));
  };

  /** @param {PointerEvent} event */
  const handlePointer = (event) => {
    const aspect = window.innerWidth / window.innerHeight;
    state.pointerX = (event.clientX / window.innerWidth - 0.5) * aspect;
    state.pointerY = 0.5 - event.clientY / window.innerHeight;
  };

  const handlePointerDown = () => controller.pulse(1);

  const handleResize = () => {
    resize();
    renderOnce();
  };

  const handleVisibility = () => {
    cancelAnimationFrame(frame);
    if (!document.hidden && !isStatic) {
      lastNow = performance.now();
      frame = requestAnimationFrame(loop);
    }
  };

  /** @param {Event} event */
  const handleContextLost = (event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    root.classList.add('no-webgl');
  };

  /** @type {SceneController} */
  const controller = {
    active: true,
    setTarget(target, options = {}) {
      state.target = { ...target };
      if (options.instant || isStatic) {
        state.x = target.x;
        state.y = target.y;
        state.size = target.size;
        state.hue = target.hue;
        state.visible = target.visible ?? 1;
      }
      renderOnce();
    },
    pulse(strength = 1) {
      if (isStatic) return;
      state.pulse = Math.min(2, state.pulse + strength);
    },
    setLight(light) {
      state.lightTarget = clamp(light, 0, 1);
      if (isStatic) {
        state.light = state.lightTarget;
        renderOnce();
      }
    },
    reveal(durationMs = 1600) {
      if (isStatic) {
        state.birth = 1;
        renderOnce();
        return;
      }
      state.birth = 0;
      state.birthStart = performance.now();
      state.birthDuration = durationMs;
      state.pulse = Math.min(2, state.pulse + 1.2);
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', handlePointer);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
    },
  };

  resize();
  window.addEventListener('pointermove', handlePointer, { passive: true });
  window.addEventListener('pointerdown', handlePointerDown, { passive: true });
  window.addEventListener('resize', handleResize);
  document.addEventListener('visibilitychange', handleVisibility);
  canvas.addEventListener('webglcontextlost', handleContextLost);

  if (isStatic) renderOnce();
  else frame = requestAnimationFrame(loop);

  return controller;
}
