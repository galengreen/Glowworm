// Isometric perceptron: two inputs, two weights, a bias, a step activation and an output lamp.
import { defineWidget, frame, label, type Vec3 } from '@kit';

const fmt = (v: number) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(1);

export default defineWidget({
  id: 'neuron',
  name: 'Single neuron',
  sources: ['notes#artificial-neurons', 'notes#weighted-sum-and-bias', 'notes#activation-functions', 'notes#logic-gates-with-a-perceptron'],
  hint: '1 · 2 toggle inputs · q/a w₁ · w/s w₂ · click the blocks',
  aria:
    'Isometric diagram of a single artificial neuron. Two input blocks, x1 and x2, connect by wires to a neuron box. Each wire has a weight. ' +
    'The neuron shows the weighted sum plus bias, and lights the output lamp when the sum is above zero. Toggle inputs with keys 1 and 2, ' +
    'change weight 1 with q and a, weight 2 with w and s, or click the blocks and plus/minus buttons.',
  css: `
    [data-widget="neuron"] .led { fill: var(--detail); transition: fill .2s; }
    [data-widget="neuron"] .led.hot { fill: var(--accent); }
    [data-widget="neuron"] .btn-glyph { fill: var(--ink); font-size: 14px; }
  `,
  mount(stage, api) {
    const p = api.params;
    const state = {
      x: [Number(p.x1 ?? 1), Number(p.x2 ?? 0)],
      w: [Number(p.w1 ?? 0.6), Number(p.w2 ?? 0.6)],
      b: Number(p.b ?? -0.5),
    };

    const K = frame([[0, 250, 0], [340, 0, 6], [340, 250, 0], [0, 0, 6], [176, 70, 70], [260, 70, 70], [24, 36, 40]], 0.05);
    const { P, TOP, SIDE, box, path } = K;
    stage.setAttribute('viewBox', K.viewBox);

    const wires: Vec3[][] = [
      [[80, 64, 6.5], [130, 64, 6.5], [130, 98, 6.5], [176, 98, 6.5]],
      [[80, 186, 6.5], [130, 186, 6.5], [130, 152, 6.5], [176, 152, 6.5]],
    ];
    const outWire: Vec3[] = [[260, 125, 6.5], [290, 125, 6.5]];
    const inputs: Vec3[] = [[24, 36, 6], [24, 158, 6]];
    const btns = [
      { id: 'w0-', x: 96, y: 8, glyph: '−' }, { id: 'w0+', x: 124, y: 8, glyph: '+' },
      { id: 'w1-', x: 96, y: 216, glyph: '−' }, { id: 'w1+', x: 124, y: 216, glyph: '+' },
    ];
    const button = (b: (typeof btns)[number]) =>
      `<g class="press" data-btn="${b.id}">${box(b.x, b.y, 6, 22, 22, 8)}<g transform="${TOP(b.x, b.y, 14)}"><text class="btn-glyph" x="11" y="15" text-anchor="middle">${b.glyph}</text></g></g>`;
    const input = (i: number) => {
      const [x, y, z] = inputs[i];
      return `<g class="press" data-input="${i}">${box(x, y, z, 56, 56, 20)}<g transform="${TOP(x, y, z + 20)}"><rect class="detail" x="10" y="10" width="36" height="36" rx="6"/></g></g>`;
    };

    let svg = box(0, 0, 0, 340, 250, 6);
    svg += `<g transform="${TOP(0, 0, 6)}"><rect class="detail" x="8" y="8" width="324" height="234" rx="10"/></g>`;
    wires.forEach((w, i) => (svg += path(w, 'wire teach', `data-wire="${i}"`) + path(w, 'pulse', `data-pulse="${i}"`)));
    svg += path(outWire, 'wire teach', 'data-wire="out"') + path(outWire, 'pulse', 'data-pulse="out"');
    svg += input(0) + button(btns[0]) + button(btns[1]) + input(1) + button(btns[2]) + button(btns[3]);

    // neuron body with a glass display on its right face
    svg += box(176, 70, 6, 84, 110, 64);
    svg += `<g transform="${TOP(176, 70, 70)}"><rect class="detail" x="10" y="10" width="64" height="90" rx="8"/></g>`;
    svg += `<g transform="${SIDE(260, 70, 70)}">
      <rect class="halo" data-halo x="8" y="10" width="94" height="38" rx="8" filter="url(#ls-bloom)"/>
      <rect class="glass" data-glass x="8" y="10" width="94" height="38" rx="8"/>
      <line class="detail" x1="8" y1="56" x2="102" y2="56"/>
    </g>`;

    // output lamp
    svg += box(290, 108, 6, 34, 34, 22);
    svg += `<g transform="${TOP(290, 108, 28)}"><circle class="halo" data-lamp-halo cx="17" cy="17" r="14" filter="url(#ls-bloom)"/><circle class="led" data-led cx="17" cy="17" r="8"/></g>`;

    // screen-aligned teaching labels
    const at = (v: Vec3, dx = 0, dy = 0) => {
      const [x, y] = P(v);
      return [x + dx, y + dy] as const;
    };
    const L = (v: Vec3, dx: number, dy: number, cls: string, id: string, anchor: 'start' | 'middle' | 'end' = 'middle') => {
      const [x, y] = at(v, dx, dy);
      return label(x, y, '', cls, anchor).replace('<text ', `<text data-label="${id}" `);
    };
    svg += L([24, 92, 16], -12, 0, 'label-hi', 'x0', 'end');
    svg += L([24, 214, 16], -12, 0, 'label-hi', 'x1', 'end');
    svg += L([150, 8, 14], 8, -6, 'label', 'w0', 'start');
    svg += L([150, 238, 14], 8, 6, 'label', 'w1', 'start');
    svg += L([218, 125, 70], 0, -14, 'label', 'bias');
    svg += L([260, 125, 41], 0, 0, 'label-live', 'sum');
    svg += L([307, 125, 28], 16, -18, 'label-hi', 'out', 'start');
    stage.innerHTML = svg;

    const $ = <T extends Element>(sel: string) => stage.querySelector<T>(sel)!;
    const text = (id: string, v: string) => ($(`[data-label="${id}"]`).textContent = v);
    let firing = 0;

    function render(animate: boolean) {
      const sum = state.x[0] * state.w[0] + state.x[1] * state.w[1] + state.b;
      const out = sum > 0 ? 1 : 0;
      state.x.forEach((v, i) => {
        $(`[data-input="${i}"]`).classList.toggle('latched', v === 1);
        $(`[data-wire="${i}"]`).classList.toggle('hot', v === 1);
        text(`x${i}`, `x${i === 0 ? '₁' : '₂'} = ${v}`);
        text(`w${i}`, `w${i === 0 ? '₁' : '₂'} = ${fmt(state.w[i])}`);
      });
      text('bias', `b = ${fmt(state.b)}`);
      api.readout(`x = (${state.x.join(', ')}) · Σ = ${sum.toFixed(2)} · out = ${out}`);

      const showResult = () => {
        text('sum', `Σ ${sum.toFixed(2)}`);
        text('out', `out ${out}`);
        $('[data-glass]').classList.toggle('hot', out === 1);
        $('[data-halo]').classList.toggle('hot', out === 1);
        $('[data-led]').classList.toggle('hot', out === 1);
        $('[data-lamp-halo]').classList.toggle('hot', out === 1);
        $('[data-wire="out"]').classList.toggle('hot', out === 1);
        if (out === 1 && animate) api.replay($('[data-pulse="out"]'));
      };

      if (!animate || api.calm) return showResult();
      const token = ++firing;
      state.x.forEach((v, i) => v && api.replay($(`[data-pulse="${i}"]`)));
      api.after(state.x.some(Boolean) ? 420 : 0, () => token === firing && showResult());
    }

    const toggle = (i: number) => {
      state.x[i] = state.x[i] ? 0 : 1;
      api.report('input', { i, value: state.x[i] });
      render(true);
    };
    const nudge = (i: number, d: number) => {
      state.w[i] = Math.round(Math.max(-1, Math.min(1, state.w[i] + d)) * 10) / 10;
      api.flash($(`[data-btn="w${i}${d > 0 ? '+' : '-'}"]`));
      render(true);
    };

    stage.addEventListener('click', (e) => {
      const t = e.target as Element;
      const inp = t.closest('[data-input]');
      if (inp) return toggle(Number(inp.getAttribute('data-input')));
      const b = t.closest('[data-btn]')?.getAttribute('data-btn');
      if (b) nudge(Number(b[1]), b[2] === '+' ? 0.1 : -0.1);
    });

    render(false);

    return {
      key(e) {
        const k = e.key.toLowerCase();
        if (k === '1' || k === '2') toggle(Number(k) - 1);
        else if (k === 'q') nudge(0, 0.1);
        else if (k === 'a') nudge(0, -0.1);
        else if (k === 'w') nudge(1, 0.1);
        else if (k === 's') nudge(1, -0.1);
        else return false;
        return true;
      },
    };
  },
});
