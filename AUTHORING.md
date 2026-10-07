# Authoring a Glowworm course

Conventions for any agent (Claude Code, Codex, …) that writes or edits a course. Read [PRODUCT.md](PRODUCT.md) for the why; this file is the how.

**Loop:** convert the material into sources → plan topics and widgets in `outline.yaml` → widget builders and one writer per topic work in parallel → the lead reviews each topic and asks for revisions → a consistency pass across topics → `pnpm glowworm validate` passes. See [Building from material](#building-from-material). Building a widget: [WIDGETS.md](WIDGETS.md).

## Folder layout

Real courses live in a central folder, `~/.glowworm/courses/<course>/` (or `$GLOWWORM_HOME/courses/`), so every checkout of the app sees the same ones. The repo's `courses/` only holds the bundled sample. Run the CLI from the repo either way; `pnpm glowworm where` lists every course and its path.

```
<course>/
  course.yaml            title, levels, lesson order
  outline.yaml           every source section assigned to a topic, or skipped with a reason
  materials/*            the user's original files (PDF, slides, notes, past papers), added in the player. Never edit.
  sources/*.md           the material as Markdown: materials/<name>.<ext> becomes sources/<name>.md. Never edit once written.
  wiki/<concept>.md      one page per concept: the single source of truth
  lessons/<lesson>.md    3–5 minute segments, each ending in a recall question
  questions/*.yaml       question banks with hints, explanations and mark schemes
  widgets/<id>.ts        interactive figures built with the widget kit
```

## Converting material

The player's **Add material** page puts the user's files in `materials/` and gives the agent a prompt. A file counts as converted once `sources/<same name>.md` exists, so keep the name.

- Transcribe, don't summarise: keep the wording, maths, tables and code.
- Start with a `# Title`, then one heading per slide, page or section, with its number (`## Slide 12: Backpropagation`), so citations can point at it.
- Describe diagrams in words **under that slide's own heading**, after its text: what's drawn, the labels, and what it shows. Never put them in a separate file, because duplicate headings split one slide's content in two. The wiki redraws them as figures.
- Check every slide or page made it across. A missing slide is content the course silently loses.

## Building from material

Two roles:

- **The lead** (the agent the student started) plans, briefs writers, reviews their work and keeps the course consistent. The lead owns `course.yaml`, `outline.yaml` and `sources/`.
- **Writers**, one per topic, each build one topic's wiki pages, lesson and questions.
- **Widget builders**, one per widget (or a few small ones each), build the figures planned in the outline.

In Claude Code, start writers and widget builders as subagents with the Agent tool, all in parallel. A subagent doesn't see your conversation, so its brief must hold everything it needs. Widgets take longest, so start their builders first.

If your agent can't start subagents, play both roles yourself: write one topic at a time, then review it as if someone else wrote it.

### 1. Lead: plan

1. Convert any new material (above).
2. Read every source in full, then write `outline.yaml`:

   ```yaml
   topics:
     - id: dataflow                       # also names the writer's files
       title: Dataflow analysis
       sources: [week-3#slide-4..slide-11, week-4#slide-2]   # whole file, one section, or a range
       concepts: [cfg, reaching-definitions, liveness]       # wiki pages this topic owns
       widgets:                                              # figures to build, planned now so builders start straight away
         - id: liveness-table
           shows: Step through a CFG backwards and watch the live-variable sets grow until they stop changing
       brief: Past paper Q3 asks for a worked liveness table  # optional notes for the writer
   skip:
     - src: week-1#slide-2-assessment
       why: Course admin (assessment dates), not course content
   ```

   - **Nothing is left out by accident.** Every `##` section of every source belongs to a topic or is in `skip:` with a reason. `validate` fails otherwise.
   - **Skip only what isn't course content:** admin, logistics, or topics the course says won't be examined. When in doubt, keep it.
   - **Similar-sized topics**, roughly one lesson each (3–6 concepts), in prerequisite order.
   - **Each concept has one owner.** Other topics can link to it but don't edit it.
   - **Plan the widgets:** every concept with a knob (something to change and watch) gets one, plus the source diagrams worth making interactive. Give each an id and say what it shows. Writers use these ids in `diagram:` and `::figure` before the widgets exist.
3. Set the bar before anyone writes. Decide the shared terms and notation (from the sources), the levels in `course.yaml`, and how hard questions should be (from past papers, if there are any).

`validate` now lists every planned section as uncited. That's the to-do list.

### 2. Widget builders and writers, in parallel

Start the widget builders first. Each brief holds:

- the course folder path, and that it should follow [WIDGETS.md](WIDGETS.md) (it doesn't need to read anything else first)
- the widget id, what it shows (from the outline), and the source sections to draw from
- the concept it illustrates, and the shared terms and notation
- that it may only write `widgets/<id>.ts`

A builder is done when `pnpm glowworm shot` reports no layout problems in every state it tested (including `--calm` and `--theme light`) and `pnpm typecheck` passes. It reports back the `shot` commands that show each state, so the lead can rerun them.

Then give every writer the same brief, filled in for its topic:

- the course folder path, and that it should follow this file
- the topic's id, title and source sections, and the concepts it owns
- the concepts other topics own (link to them with `:concept`, don't write them)
- the shared terms, notation and question difficulty
- the quality bar from step 3 below, word for word
- the widget ids planned for its concepts, and what each shows (use them in `diagram:` and `::figure`; another agent builds them)
- which files it may write: wiki pages for its own concepts, `lessons/<topic>.md` and `questions/<topic>.yaml`. Nothing else, so parallel writers never clash.
- to run `pnpm glowworm validate <course>` **after every file it writes**, not just at the end, and fix its errors straight away

A writer is done when `validate` shows no errors in its files, apart from widgets that are still being built. It reports back where each source section is taught (wiki page and lesson segment), anything in the source that looked unclear or wrong, and anything it couldn't fit.

### 3. Lead: review each topic

Review each topic against its **source sections**, not just against its own text. `pnpm glowworm coverage <course>` lists each section and the pages that cite it, plus each topic's concept, diagram and question counts. A citation only shows a page points at a section. Open both and check the content is really there.

The quality bar:

- **Complete.** Every definition, formula, algorithm, worked example, diagram and caveat in the topic's sections is in the wiki or the lesson.
- **At or above the source's level.** The same precision and rigour: no formula replaced by a vague sentence, no steps dropped from a derivation or algorithm. Then add what the source lacks: the why, a worked example, a diagram, common misconceptions.
- **Correct.** Every claim matches the section it cites.
- **Questions at least as hard as the course asks.** Match past papers where there are any. Mix recall with application, and write mark schemes as separately checkable points.
- **Follows this file:** show, don't tell; one recall per segment; New Zealand English.
- **Widgets teach the concept** and match their source sections. Rerun the builder's `shot` commands: the layout check should be clean, and the screenshots should show the knob and its consequence.

Send findings back to the **same writer or builder** (in Claude Code, continue it with SendMessage so it keeps its context). Make each finding specific: the section, what's missing or wrong, and what good looks like. Repeat until the topic meets the bar. After three rounds, fix what's left yourself.

### 4. Lead: consistency pass

Once every topic passes, compare them side by side:

- depth and length of wiki pages, and questions per concept (see the coverage report)
- difficulty and mix of question types
- terms, notation and voice
- prerequisite and related links across topics, and the level order in `course.yaml`

Bring weaker topics up to the strongest one, never the other way. Finish when `validate` shows no errors (and `pnpm typecheck` passes if there are new widgets). Then report to the student: what's covered, what was skipped and why, and anything the sources didn't explain well enough to teach.

### Adding material later

Assign the new sections in `outline.yaml`, either to existing topics or to new ones. Only the affected topics go through steps 2 and 3. The consistency pass then compares them with the rest.

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

- Split into segments with `## Title {#stable-id}`. **Segment ids are permanent**: progress refers to them, so never rename an id. Add new ones instead.
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

A widget is an interactive figure in `widgets/<id>.ts`. **[WIDGETS.md](WIDGETS.md) has everything needed to build one:** the workflow, the module shape, the kit API, the line-language classes, templates, and the rules. Check every widget with `pnpm glowworm shot <course> <id>`, which screenshots it and checks its layout.

Use widgets in lessons with `::figure{widget=<id> predict="…"}`, and as a concept's standard diagram with `diagram:` in its wiki page.
