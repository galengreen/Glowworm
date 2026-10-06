# LearnSmart

Bring your own AI, give it your course material, and get levelled lessons with interactive diagrams, exam-style practice and spaced review. See [PRODUCT.md](PRODUCT.md) for the idea and [AUTHORING.md](AUTHORING.md) for the course format.

**Status:** prototype. It ships with one sample course (`courses/neural-nets`), written for the prototype rather than from real course material.

## Run it

```sh
pnpm install
pnpm dev                          # player at http://localhost:5173
pnpm learnsmart validate          # check every course
pnpm learnsmart inbox             # requests sent from the player
pnpm typecheck
```

## What's in the prototype

- **Player:** a minimal layout with a slim top bar and no permanent sidebar. Home has "continue where you left off" and a course map. Lessons are a focused reading column with a section rail and recall gates. Concept and citation links open a side drawer, so you keep your place. Practice and review are focused sessions with keyboard shortcuts, and ⌘K jumps anywhere. Also: FSRS spaced review, accent colours, wide text spacing and calm mode.
- **Course format:** Markdown with directives, YAML question banks, wiki pages and source files, all plain files in `courses/<id>/`.
- **Widget kit** (`src/kit`): an isometric projection helper, flat 2D helpers, shared glow filters, and an interaction API (`flash`, `replay`, `loop`, `controls`, `params`). Two sample widgets: an isometric neuron with signal pulses, and gradient descent with a learning-rate slider.
- **Predict first:** figures with a `predict` attribute stay hidden until you lock in a prediction.
- **Marking:** multiple choice and numeric questions are marked automatically; written answers are self-marked against the mark scheme for now (`src/marking.ts` is where Jev and an LLM fallback plug in).
- **Highlight → inbox:** select any text and send it with an intent. Requests are saved to `.learnsmart/inbox/`, and agents resolve them with the CLI.
- **Validator:** checks the citation chain, missing references, question coverage, long text with no figure, and hard-coded colours in widgets.

## Not yet

Jev and LLM marking, `learnsmart preview --screenshot`, the level map and moments, Electron packaging, sandboxed iframes for untrusted widgets (sample widgets run in-page), and importing PDFs or slides into `sources/`.
