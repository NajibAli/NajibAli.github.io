// Type declarations for the third-party ES modules loaded from jsDelivr.
// Only the parts of the APIs that this site uses are described.

declare module 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/+esm' {
  type Target = string | Element | Element[] | NodeListOf<Element> | object | null;
  type Vars = { [key: string]: unknown };

  interface Tween {
    kill(): Tween;
    progress(value?: number): number;
    pause(): Tween;
    play(): Tween;
    eventCallback(type: string, callback: (() => void) | null): Tween;
  }

  interface Timeline extends Tween {
    to(target: Target, vars: Vars, position?: number | string): Timeline;
    from(target: Target, vars: Vars, position?: number | string): Timeline;
    fromTo(target: Target, from: Vars, to: Vars, position?: number | string): Timeline;
    set(target: Target, vars: Vars, position?: number | string): Timeline;
    call(callback: () => void, params?: unknown[] | null, position?: number | string): Timeline;
  }

  interface MatchMedia {
    add(query: string, setup: () => void | (() => void)): unknown;
    revert(): void;
  }

  interface Gsap {
    registerPlugin(...plugins: object[]): void;
    to(target: Target, vars: Vars): Tween;
    from(target: Target, vars: Vars): Tween;
    fromTo(target: Target, from: Vars, to: Vars): Tween;
    set(target: Target, vars: Vars): Tween;
    timeline(vars?: Vars): Timeline;
    quickTo(target: Target, property: string, vars?: Vars): (value: number) => void;
    matchMedia(): MatchMedia;
    ticker: {
      add(callback: (time: number, deltaTime: number) => void): void;
      remove(callback: (time: number, deltaTime: number) => void): void;
      lagSmoothing(threshold: number, adjustedLag?: number): void;
    };
  }

  export const gsap: Gsap;
}

declare module 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/ScrollTrigger/+esm' {
  interface ScrollTriggerInstance {
    progress: number;
    isActive: boolean;
    kill(): void;
  }

  interface ScrollTriggerVars {
    trigger?: Element | string | null;
    start?: string | number | (() => string | number);
    end?: string | number | (() => string | number);
    scrub?: boolean | number;
    pin?: boolean | Element | string;
    pinSpacing?: boolean;
    anticipatePin?: number;
    invalidateOnRefresh?: boolean;
    toggleActions?: string;
    once?: boolean;
    onUpdate?: (self: ScrollTriggerInstance) => void;
    onEnter?: () => void;
    onEnterBack?: () => void;
    onLeave?: () => void;
    onLeaveBack?: () => void;
    animation?: object;
  }

  export const ScrollTrigger: {
    create(vars: ScrollTriggerVars): ScrollTriggerInstance;
    update(): void;
    refresh(): void;
  };
}

declare module 'https://cdn.jsdelivr.net/npm/lenis@1.3.4/+esm' {
  interface LenisOptions {
    lerp?: number;
    smoothWheel?: boolean;
    anchors?: boolean;
    autoRaf?: boolean;
  }

  interface ScrollToOptions {
    offset?: number;
    duration?: number;
    immediate?: boolean;
  }

  export default class Lenis {
    constructor(options?: LenisOptions);
    velocity: number;
    on(event: 'scroll', callback: () => void): () => void;
    raf(time: number): void;
    scrollTo(target: number | string | Element, options?: ScrollToOptions): void;
    stop(): void;
    start(): void;
    destroy(): void;
  }
}
