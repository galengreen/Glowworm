# Authoring a LearnSmart course

Conventions for any agent (Claude Code, Codex, …) that writes or edits a course. Read [PRODUCT.md](PRODUCT.md) for the why; this file is the how.

**Loop:** read the sources → write wiki pages → write lessons, widgets and questions → `pnpm learnsmart validate` until it passes → check the result in the player (`pnpm dev`) → work through `pnpm learnsmart inbox`.

## Folder layout

```
courses/<course>/
  course.yaml            title, levels, lesson order
  sources/*.md           the user's material (slides, notes, past papers), as Markdown. Never edit.
  wiki/<concept>.md      one page per concept: the single source of truth
  lessons/<lesson>.md    3–5 minute segments, each ending in a recall question
  questions/*.yaml       question banks with hints, explanations and mark schemes
  widgets/<id>.ts        interactive figures built with the widget kit
```

## Citation chain

Every claim traces back to a source: **question → wiki page → source heading.**

- Wiki pages list `sources:` as `<file>#<heading-slug>` (e.g. `notes#gradient-descent`, from `sources/notes.md`, heading "Gradient descent"). Cite inline with `:cite[notes §7]{src=notes#gradient-descent}`.
- Every question has a `concept:` that is a wiki page id.
- Lessons link concepts with `:concept[text]{id=<wiki-id>}` and cite sources with `:cite`.
- If the sources don't support a claim, don't write it. If something seems to be missing from the sources, say so in a `:::callout{type=note}`.

## Wiki pages

```yaml
---
id: gradient-descent
title: Gradient descent
summary: One sentence, used for hover cards and the index.
sources: [notes#gradient-descent]
prerequisites: [gradient]          # decides level order and what to review after a wrong answer
related: [learning-rate]
diagram:                           # the concept's standard diagram (show, don't tell)
  widget: gradient-descent
  params: { lr: 0.5 }
---
```

If a concept genuinely can't be shown (e.g. a checklist), write `diagram: { none: "why" }` instead. The validator accepts it, but the reason should hold up.

Keep pages short: definition, key explanation, worked example, common misconceptions. Use the same terms and notation as the sources.

## Lessons

- Split into segments with `## Title {#stable-id}`. **Segment ids are permanent**: inbox requests and progress refer to them, so never rename an id. Add new ones instead.
- Each segment: show first, then a little prose, then one `::recall{q=<question-id>}`. The next segment unlocks once the recall question has been attempted.
- **Show, don't tell.** If it can be a diagram, make it a figure. `validate` warns on segments over 160 words with no figure.
- Prose is for the *why* and caveats. Short sentences, plain language, left-aligned.

### Directives

| Directive | Use |
|---|---|
| `::figure{widget=<id> key=value predict="…"}` | Figure with an optional predict-first question; extra attributes go to the widget as `api.params` |
| `:::figure{…}` … `:::` | Same, with a Markdown caption inside ("what to notice / what to try") |
| `::recall{q=<id>}` | Inline recall question |
| `:concept[text]{id=<wiki-id>}` | Link to a wiki page, with a hover card |
| `:cite[label]{src=<file>#<slug>}` | Source citation |
| `:::callout{type=key\|why\|note\|exam}` … `:::` | Key idea, why it matters, note, exam tip |
| `:::steps` + ordered list + `:::` | Worked example revealed one step at a time |

Maths: `$inline$`, and display maths with `$$` on their own lines (a one-line `$$…$$` renders inline). KaTeX. Tables: GitHub-flavoured Markdown.

## Questions

```yaml
- id: gd-update               # permanent, unique within the course
  type: mcq | numeric | short
  concept: gradient-descent   # wiki page this question cites
  exam: true                  # include in Practice (default true)
  prompt: Markdown + maths
  hints: [smallest nudge first, …]
  explain: Shown after answering. Explain why, not just what.
  # mcq
  choices: [...]
  answer: 1                   # index; the player shuffles choices
  # numeric
  answer: 1.6
  tolerance: 0.001
  unit: m/s
  # short
  markScheme:
    - point: One checkable statement, like a real marking schedule
      marks: 1
      feedback: Why this point matters (shown if missed)
  model: A model answer
```

- **Quote free-text values** (`prompt: 'Why …?'`, and list items like hints and choices). A colon or a leading quote inside unquoted text breaks YAML. Use `|` blocks for multi-line prompts.
- At least **3 questions per concept**, mixing types. Calibrate exam-style questions against past papers when the sources include them.
- Wrong choices should be real misconceptions, not filler.
- Mark schemes are lists of separately checkable points, so they can be marked one point at a time (by you, or later by Jev).

## Widgets

A widget is a module in `widgets/` that default-exports `defineWidget({...})` from `@kit`. Look at `courses/neural-nets/widgets/` for examples.

```ts
import { defineWidget, frame, label } from '@kit';
export default defineWidget({
  id, name,
  hint: 'keyboard shortcuts shown under the figure',
  aria: 'full description for screen readers',
  css: `[data-widget="<id>"] …`,       // scoped, tokens only
  mount(stage, api) { … return { key(e) { … }, destroy() { … } }; },
});
```

**Rules**

1. **One concept, one or two knobs, a visible consequence.** Build a widget whenever a concept has something you can change and watch.
2. **Predict first:** add `predict="…"` to the figure directive.
3. **Tokens only.** No hex colours; `validate` rejects them. Use the figure vocabulary classes: `face`, `face top`, `detail`, `wire`, `wire teach`, `wire hot`, `pulse`, `press`, `latched`, `glass`, `halo`, `grid`, `axis`, `edge`, `curve`, `trail`, `marker`, `ghost`, `label`, `label-hi`, `label-live`.
4. **Line language:** `detail`/`line` strokes for structure; strokes that teach use `ink`/`ink-hi` or the accent. The accent means *live*: active, flowing, correct.
5. **Isometric for things and systems** (`frame`, `TOP`/`FRONT`/`SIDE`, `box`, `path`); **flat 2D for plots and graphs** (`scale`, `arrow`, `label`).
6. **Teaching labels face the screen:** use `label()` at a projected point, not text on an isometric face.
7. **Accessible:** a full `aria` description, every interaction available from the keyboard via `key()`, and respect `api.calm` (no animation).
8. Use `api.after/every/loop` for timing so everything is cleaned up on unmount. Put native controls (sliders, buttons) in `api.controls`.

## Inbox

The user highlights text in the player and sends a request. Work through them at the start of each session:

```sh
pnpm learnsmart inbox                     # open requests
pnpm learnsmart inbox show <id>           # full request: file, block id, quote with surrounding text
pnpm learnsmart inbox resolve <id> "what you changed"
```

| Intent | What to do |
|---|---|
| `explain` | Expand the explanation, or add a wiki page if the concept is missing |
| `example` | Add a worked example (`:::steps`) or a widget |
| `wrong` | Check against the cited source. Fix it, or reply explaining why it's right, quoting the source |
| `quiz` | Add questions that cite the concept |
| `note` | Follow the note (e.g. "not examinable": mark questions `exam: false`) |

Find the spot by `block` id first, then by the quote and the text either side of it. Never edit `sources/`.
