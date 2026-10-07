# Building a widget

Everything a widget builder needs, on one page. You don't need to read the kit source, the stylesheet or other widgets first. [AUTHORING.md](AUTHORING.md) covers where widgets fit in a course.

## Workflow

1. Copy a template to `<course>/widgets/<id>.ts` and change the id everywhere, including the `css`:
   - `src/kit/templates/flat.ts`: plots, graphs, trees and equations (flat 2D)
   - `src/kit/templates/iso.ts`: things and systems (isometric)
2. Build it, then check it from the repo:

   ```sh
   pnpm glowworm shot <course> <id> [param=value …] --keys "ArrowRight Space" --keys "r"
   ```

   This renders the widget on its own, takes a screenshot, presses each set of keys and screenshots again (the states build on each other). For every state it prints the readout and a **layout check**: labels that overlap, sit on a curve, edge or wire, run outside the figure, render under 9 px, or fall below 4.5:1 contrast. Fix everything it reports. Use the readout to check behaviour without opening the image, and look at the screenshots to judge the drawing itself.
3. Before you finish, run it once with `--calm` (no animation) and once with `--theme light`. Then run `pnpm glowworm validate <course>` and `pnpm typecheck`.

To look at a widget in the player, open `#/c/<course>/widget/<id>?param=value`. Don't add scratch lessons to the course to see a widget.

## The module

```ts
import { defineWidget, label, scale } from '@kit';

export default defineWidget({
  id: 'precision-recall',            // file name, and what ::figure{widget=…} and wiki `diagram:` use
  name: 'Precision and recall',      // shown above the figure
  sources: ['intro#slide-17'],       // source sections it's drawn from (counts towards coverage)
  hint: '← → threshold · r reset',   // keyboard shortcuts, shown under the figure
  aria: 'Full description for screen readers: what is drawn, what each control does, what changes.',
  css: `[data-widget="precision-recall"] .bar { fill: var(--accent); }`, // scoped, tokens only
  mount(stage, api) {
    stage.setAttribute('viewBox', '0 0 640 400');
    // draw into stage (an <svg>), wire up controls, then:
    return { key(e) { /* return true if handled */ return false; }, destroy() {} };
  },
});
```

`mount` runs again whenever params or calm mode change. Anything set up with `api.after`, `api.every` or `api.loop` is cleaned up for you.

### `api`

| Member | Use |
|---|---|
| `readout(text)` | Live readout in the caption bar. Keep it current: `glowworm shot` prints it, so it doubles as your test output |
| `params` | Attributes from the figure directive (`::figure{widget=x lr=1.5}` → `{ lr: '1.5' }`), all strings |
| `controls` | An HTML element under the stage for native controls: `<button class="btn">`, `<input type="range">` |
| `calm` | True in calm mode or with reduced motion: skip animations and set the end state directly |
| `flash(el)` | Brief press and glow (adds `.down` and `.lit`) |
| `replay(el, cls = 'go')` | Restart a one-shot CSS animation, e.g. a `.pulse` travelling along a wire |
| `after(ms, fn)`, `every(ms, fn)`, `loop(fn)` | Timers and frame loops, cleaned up on unmount. `loop` returns a stop function |
| `report(event, data)` | Record an interaction for the player |

### Helpers from `@kit`

| Helper | Use |
|---|---|
| `label(x, y, text, cls = 'label', anchor = 'middle')` | Screen-aligned `<text>`. Use it for every teaching label |
| `arrow(x1, y1, x2, y2, cls = 'edge', pad = 0)` | Line with an arrowhead, shortened by `pad` at each end |
| `scale(d0, d1, r0, r1)` | Maps a data range onto pixels (flip `r0`/`r1` for a y axis) |
| `frame(corners, margin, aspect)` | Fits an isometric scene. Returns `{ viewBox, P, TOP, FRONT, SIDE, box, path }` |
| `P([x, y, z])` | Projects a 3D point to screen. Put labels at `P(point)` so they face the screen |
| `box(x, y, z, w, d, h, cls)` | A solid with side, front and top faces |
| `path(points, cls = 'wire', attrs)` | Polyline through 3D points: wires, and pulses on wires |
| `TOP(x, y, z)`, `FRONT(…)`, `SIDE(…)` | A `transform` that maps a flat drawing onto a face (for decoration and displays, not teaching labels) |

Isometric axes: x runs down-right, y runs down-left, z is up. Filters for glow: `filter="url(#ls-glow)"`, `url(#ls-soft)`, `url(#ls-bloom)` (a wide blur for halos). Arrowheads: `marker-end="url(#ls-arrow)"`.

## Classes (the line language)

Style with these classes. They follow the theme, so don't set colours yourself.

| Class | Looks like | Use for |
|---|---|---|
| `face`, `face top`, `face recess` | Filled faces one shade above the background | Isometric solids (`box` adds them) |
| `detail` | Faint stroke | Texture, guides, decoration |
| `grid`, `axis` | Faint and plain strokes | Chart grids and axes |
| `edge` | Mid-grey 1.5 px | Connections and arrows that teach |
| `curve` | Bright 1.6 px | The main line of a plot |
| `wire`, `wire teach`, `wire hot` | Plain, brighter, accent | Isometric connections: structure, teaching, live |
| `pulse` + `.go` | Accent dash that travels | Flow along a wire: `path(points, 'pulse')`, then `api.replay(el)` |
| `trail`, `ghost`, `marker` | Dashed accent, faint accent outline, glowing accent dot | History, earlier positions, the live point |
| `press`, `.down`, `.lit`, `.latched` | Clickable group that presses, glows, stays on | Buttons and switches drawn in the scene |
| `glass`, `glass hot`, `halo`, `halo hot` | Display panel, and an accent glow behind it | Readouts on a device, lit parts |
| `label`, `label-hi`, `label-live` | 12 px, 13 px bright, 13 px accent | Ordinary labels, what matters, what's live |

Line styles carry meaning: solid means it exists, dashed means hypothetical or flow, dotted means a guide. **The accent means live:** active, flowing, correct, or the user's progress. Wrong uses `var(--miss)`, always alongside a shape or icon, never colour alone.

In scoped `css`, use only these tokens: `--bg`, `--panel`, `--edge`, `--body`, `--deck`, `--recess`, `--glass`, `--glass-on`, `--detail`, `--line`, `--ink-dim`, `--ink`, `--ink-read`, `--ink-hi`, `--accent`, `--accent-hi`, `--accent-dim`, `--miss`, `--mono`, `--sans`. Hex colours fail `validate`.

## Rules

1. **One concept, one or two knobs, a visible consequence.**
2. **Predict first:** the lesson's figure directive asks for a prediction (`predict="…"`) before the user plays.
3. **Tokens and classes only.** No hex colours, no fonts of your own.
4. **Faint strokes for structure; strokes that teach** use `edge`, `curve`, `wire teach` or the accent.
5. **Isometric for things and systems, flat 2D for plots and graphs.**
6. **Teaching labels face the screen:** `label()` at `P(point)`, never text skewed onto a face. Keep them off curves, edges and wires (`shot` checks).
7. **Accessible:** a full `aria`, every interaction on the keyboard through `key()` and listed in `hint`, and `api.calm` respected.
8. **Faithful to the source:** draw what the cited sections say, and list them in `sources`.
