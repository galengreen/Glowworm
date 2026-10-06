// LearnSmart widget kit. Widgets import everything from '@kit' and style only with tokens (var(--…)).
export { frame, project } from './iso';
export type { IsoKernel, Vec3 } from './iso';

export interface WidgetHandle {
  /** Return true if the key was handled. Only called while the figure has focus. */
  key?: (e: KeyboardEvent) => boolean;
  destroy?: () => void;
}

export interface WidgetApi {
  /** Set the live readout shown in the caption bar. */
  readout: (text: string) => void;
  /** Record an interaction for the player (e.g. 'diverged', { lr: 1.1 }). */
  report: (event: string, data?: Record<string, unknown>) => void;
  /** Brief press + glow on an element (adds `.down` and `.lit`). */
  flash: (el: Element | null, ms?: number) => void;
  /** Restart a one-shot CSS animation class (e.g. a `.pulse` travelling along a wire). */
  replay: (el: Element | null, cls?: string) => void;
  /** Timers and frame loops that are cleaned up automatically on unmount. */
  after: (ms: number, fn: () => void) => void;
  every: (ms: number, fn: () => void) => void;
  loop: (fn: (t: number) => void) => () => void;
  /** True when the user prefers reduced motion or has calm mode on. */
  calm: boolean;
  /** Attributes from the figure directive, e.g. `::figure{widget=gradient-descent lr=1.5}`. */
  params: Record<string, string>;
  /** HTML row under the stage for native controls (sliders, buttons). Use `.btn` and `input[type=range]`. */
  controls: HTMLElement;
}

export interface Widget {
  id: string;
  name: string;
  /** Keyboard / interaction hint shown in the caption bar. */
  hint: string;
  /** Full description for screen readers. */
  aria: string;
  /** Scoped CSS: prefix selectors with [data-widget="<id>"]. Tokens only. */
  css?: string;
  mount: (stage: SVGSVGElement, api: WidgetApi) => WidgetHandle | void;
}

export const defineWidget = (w: Widget) => w;

// ---------- flat 2D line-art helpers ----------

const r2 = (v: number) => +v.toFixed(2);

/** Screen-aligned label. Teaching labels always face the screen. */
export const label = (x: number, y: number, text: string, cls = 'label', anchor: 'start' | 'middle' | 'end' = 'middle') =>
  `<text class="${cls}" x="${r2(x)}" y="${r2(y)}" text-anchor="${anchor}" dominant-baseline="middle">${text}</text>`;

/** Straight arrow between two points, shortened by `pad` at each end. */
export const arrow = (x1: number, y1: number, x2: number, y2: number, cls = 'edge', pad = 0) => {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  return `<line class="${cls}" marker-end="url(#ls-arrow)" x1="${r2(x1 + ux * pad)}" y1="${r2(y1 + uy * pad)}" x2="${r2(x2 - ux * pad)}" y2="${r2(y2 - uy * pad)}"/>`;
};

/** Map a value range onto a pixel range. */
export const scale = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);

/** Shared SVG defs (arrowhead + glow filters). The player renders these once per page. */
export const DEFS = `<defs>
  <marker id="ls-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M1 1 L9 5 L1 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
  <filter id="ls-glow" filterUnits="userSpaceOnUse" x="-2000" y="-2000" width="6000" height="6000"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="ls-soft" filterUnits="userSpaceOnUse" x="-2000" y="-2000" width="6000" height="6000"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="ls-bloom" filterUnits="userSpaceOnUse" x="-2000" y="-2000" width="6000" height="6000"><feGaussianBlur stdDeviation="9"/></filter>
</defs>`;
