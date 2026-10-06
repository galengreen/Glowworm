// Gradient descent on L(w) = ½(w − 3)². The learning rate decides: creep, converge, oscillate or diverge.
import { arrow, defineWidget, label, scale } from '@kit';

const W0 = -4;
const W1 = 10;
const TARGET = 3;
const loss = (w: number) => 0.5 * (w - TARGET) ** 2;
const grad = (w: number) => w - TARGET;

export default defineWidget({
  id: 'gradient-descent',
  name: 'Gradient descent',
  hint: '← → learning rate · space step · r run · 0 reset',
  aria:
    'Line chart of a loss curve shaped like a bowl, with its minimum at w = 3. A glowing point marks the current weight, with a tangent line showing the slope. ' +
    'Each step moves the weight against the slope by the learning rate times the gradient. A dashed trail shows every step taken. ' +
    'Use the slider or the arrow keys to change the learning rate, space to step, r to run and 0 to reset.',
  css: `
    [data-widget="gradient-descent"] .controls label { display: flex; align-items: center; gap: 10px; letter-spacing: .1em; text-transform: uppercase; font-size: 11px; margin-right: auto; }
    [data-widget="gradient-descent"] input[type=range] { width: 180px; accent-color: var(--accent); }
    [data-widget="gradient-descent"] .lr { color: var(--accent-hi); min-width: 3.5em; }
  `,
  mount(stage, api) {
    const VW = 640;
    const VH = 440;
    stage.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
    const X = scale(W0, W1, 64, 610);
    const Y = scale(0, 26, 376, 30);
    const start = Number(api.params.w0 ?? -2);
    let lr = Number(api.params.lr ?? 0.3);
    let w = start;
    let steps = 0;
    let trail: number[] = [w];
    let stopRun: (() => void) | null = null;

    // static layer: grid, axes, curve, minimum guide
    let svg = '';
    for (let g = W0; g <= W1; g += 2) svg += `<line class="grid" x1="${X(g)}" y1="${Y(0)}" x2="${X(g)}" y2="${Y(26)}"/>`;
    for (let g = 0; g <= 25; g += 5) svg += `<line class="grid" x1="${X(W0)}" y1="${Y(g)}" x2="${X(W1)}" y2="${Y(g)}"/>`;
    svg += `<line class="axis" x1="${X(W0)}" y1="${Y(0)}" x2="${X(W1)}" y2="${Y(0)}"/><line class="axis" x1="${X(W0)}" y1="${Y(0)}" x2="${X(W0)}" y2="${Y(26)}"/>`;
    for (let g = W0; g <= W1; g += 2) svg += label(X(g), Y(0) + 16, String(g).replace('-', '−'), 'label');
    for (let g = 5; g <= 25; g += 5) svg += label(X(W0) - 14, Y(g), String(g), 'label', 'end');
    svg += label((X(W0) + X(W1)) / 2, VH - 12, 'weight  w', 'label');
    svg += label(X(W0) + 8, Y(26) - 14, 'loss  L(w)', 'label', 'start');
    let d = '';
    for (let i = 0; i <= 200; i++) {
      const wv = W0 + ((W1 - W0) * i) / 200;
      d += `${i ? 'L' : 'M'}${X(wv).toFixed(1)} ${Y(loss(wv)).toFixed(1)}`;
    }
    svg += `<path class="curve" d="${d}"/>`;
    svg += `<line class="trail" style="opacity:.5" x1="${X(TARGET)}" y1="${Y(0) + 22}" x2="${X(TARGET)}" y2="${Y(2.5)}"/>`;
    svg += label(X(TARGET), Y(0) + 32, 'minimum', 'label-live');
    svg += `<g data-dyn></g>`;
    stage.innerHTML = svg;
    const dyn = stage.querySelector('[data-dyn]')!;

    // native controls
    api.controls.innerHTML = `
      <label>η learning rate <input type="range" min="0.05" max="2.2" step="0.05" aria-label="Learning rate"/> <span class="lr"></span></label>
      <button class="btn" data-a="step">Step</button>
      <button class="btn" data-a="run">Run</button>
      <button class="btn" data-a="reset">Reset</button>`;
    const slider = api.controls.querySelector('input')!;
    const lrText = api.controls.querySelector('.lr')!;
    const runBtn = api.controls.querySelector<HTMLButtonElement>('[data-a="run"]')!;
    slider.value = String(lr);

    const diverged = () => Math.abs(w - TARGET) > 9;
    const converged = () => Math.abs(w - TARGET) < 0.005;

    function draw() {
      const clampW = (v: number) => Math.max(W0, Math.min(W1, v));
      const pts = trail.map((t) => [X(clampW(t)), Y(Math.min(26, loss(t)))]);
      let s = '';
      if (pts.length > 1) s += `<polyline class="trail" points="${pts.map((p) => p.join(',')).join(' ')}"/>`;
      pts.slice(0, -1).forEach(([x, y]) => (s += `<circle class="ghost" cx="${x}" cy="${y}" r="4"/>`));
      if (!diverged()) {
        // tangent: the slope the update follows
        const g = grad(w);
        const dw = 1.4;
        s += `<line class="edge" style="opacity:.75" x1="${X(w - dw)}" y1="${Y(loss(w) - g * dw)}" x2="${X(w + dw)}" y2="${Y(loss(w) + g * dw)}"/>`;
        // next step preview: where the update will land
        const next = w - lr * g;
        if (!converged() && Math.abs(X(clampW(next)) - X(w)) > 16) s += arrow(X(w), Y(loss(w)) + 22, X(clampW(next)), Y(loss(w)) + 22, 'edge', 2);
        s += `<circle class="marker" cx="${X(w)}" cy="${Y(loss(w))}" r="6"/>`;
        s += label(X(w), Y(loss(w)) - 20, `slope ${g.toFixed(2).replace('-', '−')}`, 'label-hi');
      } else {
        s += label(X(clampW(w)) + (w > TARGET ? -10 : 10), Y(25), 'diverging: steps overshoot further each time', 'label-live', w > TARGET ? 'end' : 'start');
      }
      dyn.innerHTML = s;
      lrText.textContent = lr.toFixed(2);
      const status = diverged() ? 'diverged' : converged() ? 'converged' : `w ${w.toFixed(2)} · loss ${loss(w).toFixed(2)}`;
      api.readout(`step ${steps} · ${status} · η ${lr.toFixed(2)}`);
      runBtn.textContent = stopRun ? 'Pause' : 'Run';
    }

    function step() {
      if (diverged() || converged()) return false;
      w = w - lr * grad(w);
      steps += 1;
      trail.push(w);
      if (diverged()) api.report('diverged', { lr, steps });
      if (converged()) api.report('converged', { lr, steps });
      draw();
      return !diverged() && !converged() && steps < 60;
    }

    function stop() {
      stopRun?.();
      stopRun = null;
      draw();
    }

    function run() {
      if (stopRun) return stop();
      let last = 0;
      stopRun = api.loop((t) => {
        if (t - last < (api.calm ? 0 : 380)) return;
        last = t;
        if (!step()) stop();
      });
      draw();
    }

    function reset() {
      stop();
      w = start;
      steps = 0;
      trail = [w];
      draw();
    }

    slider.addEventListener('input', () => {
      lr = Number(slider.value);
      reset();
    });
    api.controls.addEventListener('click', (e) => {
      const a = (e.target as Element).closest('[data-a]')?.getAttribute('data-a');
      if (a === 'step') step();
      if (a === 'run') run();
      if (a === 'reset') reset();
    });

    draw();

    return {
      key(e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          lr = Math.round(Math.max(0.05, Math.min(2.2, lr + (e.key === 'ArrowRight' ? 0.05 : -0.05))) * 100) / 100;
          slider.value = String(lr);
          reset();
        } else if (e.key === ' ') step();
        else if (e.key.toLowerCase() === 'r') run();
        else if (e.key === '0') reset();
        else return false;
        return true;
      },
      destroy: () => stopRun?.(),
    };
  },
});
