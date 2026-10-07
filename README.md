# Glowworm

Bring your own AI, give it your course material, and get levelled lessons with interactive diagrams, and exam-style practice. See [PRODUCT.md](PRODUCT.md) for the idea and [AUTHORING.md](AUTHORING.md) for the course format.

**Status:** prototype. It ships with one sample course (`courses/neural-nets`), written for the prototype rather than from real course material.

## Run it

```sh
pnpm install
pnpm dev                          # player at http://localhost:5173
pnpm glowworm validate          # check every course
pnpm glowworm coverage <course> # each topic's source sections and who cites them
pnpm glowworm shot <course> <widget> --keys "…"  # screenshot a widget and check its layout
pnpm glowworm where             # where each course lives
pnpm typecheck
```

Your courses live in `~/.glowworm/courses/`, outside the repo, so every checkout and worktree shares them and copyrighted material never ends up in git. Set `GLOWWORM_HOME` to use a different folder. To move a course that's still in the repo's `courses/`, run `pnpm glowworm import courses/<name>`; it copies, and leaves the original for you to delete.

## What's in the prototype

- **Player:** a minimal layout with a slim top bar and no permanent sidebar. Home has "continue where you left off" and a course map. Lessons are a focused reading column with a section rail and recall gates. Concept and citation links open a side drawer, so you keep your place. Practice is a focused session with keyboard shortcuts, and ⌘K jumps anywhere. Also: accent colours, wide text spacing and calm mode.
- **Course format:** Markdown with directives, YAML question banks, wiki pages and source files, all plain files in `courses/<id>/`.
- **Widget kit** (`src/kit`): an isometric projection helper, flat 2D helpers, shared glow filters, and an interaction API (`flash`, `replay`, `loop`, `controls`, `params`). Two sample widgets: an isometric neuron with signal pulses, and gradient descent with a learning-rate slider. [WIDGETS.md](WIDGETS.md) is the one-page guide for building one, with templates in `src/kit/templates/`.
- **Widget preview and `glowworm shot`:** any widget on its own at `#/c/<course>/widget/<id>`, and a CLI that screenshots it in each state, prints its readout, and checks for overlapping, unreadable or out-of-bounds labels.
- **Predict first:** figures with a `predict` attribute stay hidden until you lock in a prediction.
- **Marking:** multiple choice and numeric questions are marked automatically; written answers are self-marked against the mark scheme for now (`src/marking.ts` is where Jev and an LLM fallback plug in).
- **Add material:** create a course from the course menu, drop slides, notes and past papers into it, then open Claude Code or Codex in Terminal with a ready-made prompt (or copy it). The agent converts the files into `sources/` and builds the course from them. Needs `pnpm dev`.
- **Validator:** checks that every source section is in `outline.yaml` (assigned to a topic and cited, or skipped with a reason), the citation chain, missing references, question coverage, long text with no figure, and hard-coded colours in widgets.

## Not yet

Spaced review and the highlight → agent inbox (prototyped, then removed until they're useful), Jev and LLM marking, screenshots of whole lessons, the level map and moments, Electron packaging, sandboxed iframes for untrusted widgets (sample widgets run in-page), and converting material without an agent.
