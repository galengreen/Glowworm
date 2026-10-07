// Starter for a new widget: copy to <course>/widgets/<id>.ts, then change the id everywhere (including the css).
// Isometric template: a box with a pressable switch and a lamp, joined by a wire that pulses.
import { defineWidget, frame, label, type Vec3 } from '@kit';

export default defineWidget({
  id: 'tpl-iso',
  name: 'Template: isometric',
  sources: ['<source>#<section-slug>'], // the source sections this figure is drawn from
  hint: 'space toggle the switch',
  aria: 'Isometric diagram of a switch block wired to a lamp on a base plate. Space toggles the switch; when it is on, a pulse travels along the wire and the lamp lights.',
  css: `
    [data-widget="tpl-iso"] .led { fill: var(--detail); transition: fill .2s; }
    [data-widget="tpl-iso"] .led.hot { fill: var(--accent); }
  `,
  mount(stage, api) {
    // Fit the scene: pass its extreme 3D corners.
    const K = frame([[0, 0, 0], [300, 0, 0], [0, 160, 0], [300, 160, 0], [40, 50, 40], [220, 50, 40]], 0.06);
    const { P, TOP, box, path } = K;
    stage.setAttribute('viewBox', K.viewBox);
    let on = false;

    const wire: Vec3[] = [[100, 80, 6.5], [220, 80, 6.5]];
    let svg = box(0, 0, 0, 300, 160, 6); // base plate
    svg += path(wire, 'wire teach', 'data-wire') + path(wire, 'pulse', 'data-pulse');
    svg += `<g class="press" data-switch>${box(40, 50, 6, 60, 60, 20)}</g>`;
    svg += box(220, 62, 6, 36, 36, 18);
    svg += `<g transform="${TOP(220, 62, 24)}"><circle class="halo" data-halo cx="18" cy="18" r="15" filter="url(#ls-bloom)"/><circle class="led" data-led cx="18" cy="18" r="8"/></g>`;
    // Teaching labels face the screen: label() at a projected point.
    const at = (v: Vec3, text: string, cls = 'label') => {
      const [x, y] = P(v);
      return label(x, y, text, cls);
    };
    svg += at([70, 80, 60], 'switch') + at([238, 80, 52], 'lamp');
    stage.innerHTML = svg;

    const sw = stage.querySelector('[data-switch]');
    const led = stage.querySelector('[data-led]');
    const halo = stage.querySelector('[data-halo]');
    const wireEl = stage.querySelector('[data-wire]');
    function toggle() {
      on = !on;
      api.flash(sw);
      sw?.classList.toggle('latched', on);
      wireEl?.classList.toggle('hot', on);
      const light = () => {
        led?.classList.toggle('hot', on);
        halo?.classList.toggle('hot', on);
      };
      if (on && !api.calm) {
        api.replay(stage.querySelector('[data-pulse]'));
        api.after(500, light); // light the lamp when the pulse arrives
      } else light();
      api.readout(on ? 'on: current flows to the lamp' : 'off');
    }
    sw?.addEventListener('click', toggle);
    api.readout('off');

    return {
      key(e) {
        if (e.key !== ' ') return false;
        toggle();
        return true;
      },
    };
  },
});
