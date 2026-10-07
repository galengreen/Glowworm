// Starter for a new widget: copy to <course>/widgets/<id>.ts, then change the id everywhere (including the css).
// Flat 2D template: a plot with one knob (k) and a visible consequence.
import { defineWidget, label, scale } from '@kit';

export default defineWidget({
  id: 'tpl-flat',
  name: 'Template: flat plot',
  sources: ['<source>#<section-slug>'], // the source sections this figure is drawn from
  hint: '← → change k · 0 reset',
  aria: 'Line chart of y = k·x² for x from −2 to 2. The arrow keys change k, which makes the curve steeper or flatter. 0 resets k to 1.',
  css: `[data-widget="tpl-flat"] input[type=range] { width: 160px; accent-color: var(--accent); }`,
  mount(stage, api) {
    const VW = 640;
    const VH = 400;
    stage.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
    const X = scale(-2, 2, 60, 600);
    const Y = scale(0, 8, 350, 30);
    let k = Number(api.params.k ?? 1);

    // static layer: drawn once
    let svg = '';
    for (let g = -2; g <= 2; g++) svg += `<line class="grid" x1="${X(g)}" y1="${Y(0)}" x2="${X(g)}" y2="${Y(8)}"/>` + label(X(g), Y(0) + 16, String(g));
    svg += `<line class="axis" x1="${X(-2)}" y1="${Y(0)}" x2="${X(2)}" y2="${Y(0)}"/>`;
    svg += label(X(0), VH - 12, 'x');
    svg += `<g data-dyn></g>`; // dynamic layer: redrawn on every change
    stage.innerHTML = svg;
    const dyn = stage.querySelector('[data-dyn]')!;

    api.controls.innerHTML = `<label>k <input type="range" min="0.25" max="2" step="0.25" aria-label="k"/></label>`;
    const slider = api.controls.querySelector('input')!;

    function draw() {
      let d = '';
      for (let i = 0; i <= 80; i++) {
        const x = -2 + (4 * i) / 80;
        d += `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(Math.min(8, k * x * x)).toFixed(1)}`;
      }
      dyn.innerHTML = `<path class="curve" d="${d}"/>` + label(X(0), Y(7.4), `k = ${k}`, 'label-live');
      slider.value = String(k);
      api.readout(`k ${k.toFixed(2)} · y(2) = ${(4 * k).toFixed(1)}`);
    }
    const set = (v: number) => {
      k = Math.max(0.25, Math.min(2, v));
      draw();
    };
    slider.addEventListener('input', () => set(Number(slider.value)));
    draw();

    return {
      key(e) {
        if (e.key === 'ArrowRight') set(k + 0.25);
        else if (e.key === 'ArrowLeft') set(k - 0.25);
        else if (e.key === '0') set(1);
        else return false;
        return true;
      },
    };
  },
});
