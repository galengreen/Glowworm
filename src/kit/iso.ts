// Isometric projection helper. World axes: x runs down-right, y runs down-left, z is up.
// Faces: TOP (z = const), FRONT (y = const, faces the viewer on the left), SIDE (x = const, faces right).
export type Vec3 = [number, number, number];

const C = Math.cos(Math.PI / 6);
const S = Math.sin(Math.PI / 6);

export const project = ([x, y, z]: Vec3): [number, number] => [(x - y) * C, (x + y) * S - z];

const n = (v: number) => +v.toFixed(2);
const pts = (list: Vec3[]) => list.map((p) => project(p).map(n).join(',')).join(' ');

export interface IsoKernel {
  viewBox: string;
  P: (p: Vec3) => [number, number];
  /** SVG transform mapping flat (u, v) drawing coordinates onto a face. */
  TOP: (x: number, y: number, z: number) => string;
  FRONT: (x: number, y: number, zTop: number) => string;
  SIDE: (x: number, y: number, zTop: number) => string;
  /** Solid box with side, front and top faces. Extra classes go on the group. */
  box: (x: number, y: number, z: number, w: number, d: number, h: number, cls?: string) => string;
  /** Polyline through 3D points (e.g. a wire). */
  path: (points: Vec3[], cls?: string, attrs?: string) => string;
}

/** Fit a scene: pass its extreme 3D corners. Returns the kernel plus a padded viewBox (16:10 by default). */
export function frame(points: Vec3[], margin = 0.06, aspect = 16 / 10): IsoKernel {
  const d = points.map(project);
  const xs = d.map((p) => p[0]);
  const ys = d.map((p) => p[1]);
  let x0 = Math.min(...xs);
  let y0 = Math.min(...ys);
  let w = Math.max(...xs) - x0;
  let h = Math.max(...ys) - y0;
  const m = margin * Math.max(w, h);
  x0 -= m;
  y0 -= m;
  w += 2 * m;
  h += 2 * m;
  if (w / h < aspect) {
    const nw = h * aspect;
    x0 -= (nw - w) / 2;
    w = nw;
  } else {
    const nh = w / aspect;
    y0 -= (nh - h) / 2;
    h = nh;
  }

  const matrix = (a: number, b: number, c: number, dd: number, e: number, f: number) =>
    `matrix(${[a, b, c, dd, e, f].map(n).join(' ')})`;

  return {
    viewBox: [x0, y0, w, h].map(n).join(' '),
    P: project,
    TOP: (x, y, z) => matrix(C, S, -C, S, C * (x - y), S * (x + y) - z),
    FRONT: (x, y, zTop) => matrix(C, S, 0, 1, C * (x - y), S * (x + y) - zTop),
    SIDE: (x, y, zTop) => matrix(-C, S, 0, 1, C * (x - y), S * (x + y) - zTop),
    box: (x, y, z, w2, d2, h2, cls = '') => {
      const t = z + h2;
      const side = pts([[x + w2, y, z], [x + w2, y + d2, z], [x + w2, y + d2, t], [x + w2, y, t]]);
      const front = pts([[x, y + d2, z], [x + w2, y + d2, z], [x + w2, y + d2, t], [x, y + d2, t]]);
      const top = pts([[x, y, t], [x + w2, y, t], [x + w2, y + d2, t], [x, y + d2, t]]);
      return `<g class="${cls}"><polygon class="face" points="${side}"/><polygon class="face" points="${front}"/><polygon class="face top" points="${top}"/></g>`;
    },
    path: (points, cls = 'wire', attrs = '') => `<polyline class="${cls}" ${attrs} points="${pts(points)}"/>`,
  };
}
