# LearnSmart: Product Summary

*Working name. McGraw Hill already has a product called LearnSmart.*

## One-liner

An open-source study app. Give your own AI the course material, and it builds levelled lessons with interactive diagrams, exam-style practice with marking, and spaced review.

## The problem

- Hard course material is tiring to study, and the usual methods (rereading, highlighting, summarising) are the least effective ones.
- The methods that work (testing yourself, spacing study out, mixing topics) take effort to set up, so students skip them.
- Asking a general AI chat for help often becomes a crutch. You perform better while it's helping, then worse in the exam.

## Who it's for

1. **Now:** Galen and Alex, studying for the SWEN438 and AIML431 exams.
2. **Later:** any student, then anyone learning from material they already have: books, articles, presentation notes.

## How it works

The product has three parts. The AI isn't one of them; you bring your own.

| Part | What it is |
|---|---|
| **Course format** | A folder of plain files: a wiki-style knowledge base, Markdown lessons with components (diagrams, maths, charts, quizzes, widgets), YAML question banks with mark schemes, and a map of learning objectives. Shareable as a zip or git repo. |
| **Authoring kit** | A conventions doc or skill that any coding agent (Claude Code, Codex, …) follows, a design system and widget kit, plus a `learnsmart` CLI that validates structure, citations, coverage and design, renders screenshots, and manages the request inbox. |
| **Player** | A local app that shows courses, runs quizzes, marks answers, tracks mastery, schedules review, and sends highlighted text back to the agent. |

**Workflow:** put slides, notes and past papers in a folder → your agent extracts the learning objectives → it builds the knowledge base → it generates levels, lessons and questions from the knowledge base → `learnsmart validate` reports gaps until the course passes → you study in the player → whatever you highlight and ask about goes to the inbox, and the agent works through it.

## Knowledge base

A generated wiki that sits between the raw sources and everything else. It's the single source of truth for the course.

```
sources/ (slides, notes, past papers)
   ↑ cited by
wiki/ (one concept per page)
   ↑ cited by
lessons/ and questions/
```

- **One concept per page, kept short.** A definition, the key explanation, a diagram, worked example links, common misconceptions, and a "see also" section.
- **Every claim cites a source** (slide, page or timestamp). Lessons and questions cite wiki pages, so any quiz feedback can link to "read more" and from there to the original slide.
- **Links between pages are typed** (`prerequisite`, `related`, `contrasts-with`). Prerequisite links decide the level order and show which earlier concept to review when you get a question wrong.
- **Mastery is tracked per concept,** based on the questions that cite each page, so the wiki doubles as a map of what you know.
- **Reference, not the main study route.** Reading is low-value on its own, so the player sends you to the wiki *after* a recall attempt or a wrong answer, not before.
- **Consistent terms.** Lessons and questions use the wiki's terms and notation, so the course reads as one voice.

## Ask about anything

Highlight any text (in a lesson, a wiki page, a question, or feedback on your answer) and send it back to your agent with an intent:

| Intent | What the agent does |
|---|---|
| **Explain more** | Expands the explanation, or adds a wiki page if the concept is missing |
| **Example** | Adds a worked example or a widget |
| **This is wrong** | Checks against the cited source, then fixes the content or explains why it's correct |
| **Quiz me on this** | Generates questions that cite the highlighted content |
| **Note** | Free text, e.g. "the lecturer said this won't be examined" |

How it works without building AI into the player:

1. The player writes a request to `.learnsmart/inbox/`. The request records the file, a stable block ID, the exact quote plus the text either side (so it still finds its place if content moves), the intent, and your note.
2. The agent reads the inbox (`learnsmart inbox`), makes the changes, and marks each request done with a short reply.
3. The player shows the reply next to the original highlight, and the changed content is marked as updated.
4. You can also copy a highlight as a formatted reference and paste it straight into an agent chat.

Rules:
- "Explain more" is disabled on a question until you've attempted it, so the hints-before-answers rule still holds.
- The agent never edits sources. "This is wrong" fixes go in the wiki, lessons or questions, and the fix records the request it came from.
- Every content block has a stable ID, so references, mastery data and review history survive regeneration.

## Look and feel

**Minimal UI, clean modern design, dark mode only (for now), with a visual identity of glowing isometric line art in SVG.** The interface gets out of the way, and the content (diagrams, widgets, the level map) is the star.

Looking good matters: pleasant colours and graphics with character improved retention, comprehension and transfer (d ≈ 0.32–0.39), as well as intrinsic motivation ([Brom et al. 2018](https://artemis.ms.mff.cuni.cz/main/papers/emodesign_manuscript_1rev_180928_FINAL_norev.pdf)). But decoration *unrelated* to the content ("seductive details") hurts learning. A minimal interface avoids that trap by default. So the rule is:

> **Quiet chrome, vivid content.** The interface around the content is neutral and sparse. Colour, motion and craft go into the things that teach: diagrams, widgets, and showing your progress.

"Epic" here means *craft*, not ornament: sharp typography, generous whitespace, smooth and purposeful motion, and luminous line art.

| Where it's vivid | Where it's quiet |
|---|---|
| **Level map:** the course as a line-art constellation built from the wiki concept graph, lighting up as you master concepts | Lesson text and wiki pages |
| **Moments:** level complete, concept mastered, practice exam as a "boss level". Lines draw themselves in, with a brief glow or pulse. Understated, under 1.5 s, and skippable | A question while you're answering it |
| **Diagrams and widgets:** line art that draws in, responds and animates | Review sessions: fast, focused, no fanfare |

### Minimal UI

- **Content first:** one main column, with navigation and tools hidden until needed (command palette, keyboard shortcuts, a hover rail).
- **Very few controls on screen at once.** Progressive disclosure for everything else.
- **No interface clutter:** no sidebars full of badges, no dashboards on the reading screen, no unnecessary borders or boxes. Use whitespace and type hierarchy for structure.
- **Neutral interface colours.** The accent colour is saved for what's live: active state, signal flow and your progress.

### Visual identity: isometric line art

Diagrams are fine grey line art on near-black, with a single glowing accent colour for whatever is live. Everything is hand-built SVG.

| Element | What we do |
|---|---|
| **Palette** | Monochrome plus **one accent** (default Ember `#ff7a1a`), chosen by the user from a few presets. The accent means *live*: active, flowing, correct, your progress |
| **Line art** | 1 px structure strokes that stay 1 px at any zoom (`vector-effect: non-scaling-stroke`); faces filled one shade above the background. Strokes that *teach* (the thing to notice) use `ink`, `ink-hi` or the accent, so they meet 3:1 contrast |
| **Projection** | **Isometric for things and systems** (hardware, architectures, stacks, pipelines, networks), from a small helper: `frame()` fits the scene, `TOP`/`FRONT`/`SIDE` map flat drawings onto box faces, `box()` draws a solid. **Flat 2D in the same line style** for plots, graphs, trees and equations |
| **Glow** | SVG filters (`glow`, `soft`, `bloom` blurs) and a radial accent halo behind active parts |
| **Interaction** | Parts press down, flash, latch and light up; a pulse travels along wires (an animated dash), which is ideal for teaching data flow: CPU pipelines, packets, a forward pass. Keyboard shortcuts for everything, with a hint and a live readout on each figure |
| **Type** | DM Mono for labels, numbers and figures. DM Sans for the interface and reading text, because long passages in monospace are slower to read, especially for dyslexic readers |
| **Sound** | Synthesised with Web Audio, off by default |
| **Accessibility** | Full `aria` description per figure, keyboard control, and `prefers-reduced-motion` or calm mode turns off animation |

Rules for teaching:
- **Contrast:** structure lines are deliberately faint, but anything you're meant to learn from is bright. Reading text is 13:1, and even the smallest labels are at least 6:1.
- **Teaching labels face the screen.** Labels skewed onto isometric faces look great but are harder to read. Decorative labels can sit on faces; labels you need to learn from are screen-aligned.

**Starting tokens:**

```css
--bg:#0c0d0e; --panel:#141516; --edge:#222426;   /* surfaces and borders */
--body:#17181a; --deck:#1b1d1f; --recess:#0e0f10; /* isometric faces: side, top, inset */
--line:#3d4144; --detail:#2b2e30;                /* structure strokes (decorative) */
--ink-dim:#8f9499; --ink:#b4b8bb;               /* tertiary text (6:1), secondary text + teaching strokes (9:1) */
--ink-read:#d7dadc; --ink-hi:#e6e8e9;            /* reading text (13:1), headings (15:1) */
--accent:#ff7a1a; --accent-hi:#ffb070;           /* live: active, flow, correct, progress */
--accent-dim:color-mix(in srgb, var(--accent) 10%, transparent); /* halos */
--mono:"DM Mono", ui-monospace, monospace;
```

**Line language:**
- **Strokes:** `detail` for texture and guides, `line` for structure, `ink-hi` for what matters, accent for what's live. Line widths stay constant at any zoom.
- **Line styles carry meaning:** solid means it exists, dashed means hypothetical or flow, dotted means a guide. Glow means live or focused.
- **Standard parts:** arrowheads, node shapes, corner radius and label style, so a diagram the agent generates looks like part of the same set as the premade ones.
- **Draw-in animation** (stroke dash offset) for diagrams that build up in steps.

**WebGL is optional.** SVG alone gives the glow and depth we need, so it's the default for everything. WebGL is only for things SVG can't do well: dense fields, particle flows, or 3D surfaces like loss landscapes. When it's used: never behind reading text or questions; 60 fps on integrated graphics; pause when hidden; a static SVG fallback.

### Design system

All visual decisions live in **design tokens** (CSS variables), so everything, generated content included, looks like one product.

- **Tokens:** colour, type, spacing, radius, elevation and motion. Accessibility settings (spacing, line length, tint, reduced motion) override tokens, so they apply everywhere automatically.
- **Dark mode only for now.** Use off-black and off-white, not pure `#000` and `#fff`, to cut glare. All colours come from **semantic** tokens (`surface`, `ink`, `line`, `accent`) rather than literal colour names, so light mode can be added later by swapping one token set.
- **Type:** DM Mono for interface, labels, numbers and figures. A proportional sans (e.g. DM Sans, which pairs with it) for lesson and wiki text. Maths is styled to match.
- **Colour has meaning:** monochrome plus one accent that means *live*. Topics are told apart by number and position, not colour. Incorrect uses a reserved muted colour plus an icon, never colour alone. Every pairing that carries meaning passes contrast checks, including strokes that teach.
- **Motion has a purpose:** it shows what changed, where something came from, or that you made progress. Each screen gets a motion budget. `prefers-reduced-motion` and a "calm mode" setting turn it off.
- **Sound:** subtle synthesised effects for presses and moments. Off by default.
- **Art direction first:** before building, collect references (designers you like, a mood board, image-generation explorations) and turn them into tokens. That gives the AI a real identity to follow, rather than generic "AI app" styling.

### Premade components

The library covers most needs, and each component is themed and accessible out of the box:

- **Text and structure:** callout, definition, concept card (wiki link preview on hover), compare side by side, timeline, key takeaway
- **Explanations:** worked example (steps fade as you progress), diagram you step through, equation with hover explanations for each term, code block that can run
- **Visuals:** line-art diagram primitives (nodes, edges, arrows, groups, labels), labelled figures, and charts in line style. Mermaid and Vega-Lite are supported as quick fallbacks, themed as close to line art as they allow
- **Isometric parts:** boxes, panels, buttons, displays, wires with pulses, and chips and boards built on the isometric helper
- **Questions:** multiple choice, numeric, ordering, matching, short answer, label the diagram, drag to sort, flashcard
- **Progress:** mastery ring, level map node, streak and review counter

### Custom widgets: encouraged

Premade components are the floor, not the ceiling. **Whenever a concept has a "knob"** (something you can change and watch the result of), the agent should build a custom widget. Examples: learning rate vs convergence, regularisation strength vs decision boundary, a thread schedule vs race condition.

So custom widgets look native, they're built with the **widget kit**, not raw styling:

- Styled primitives: an SVG scene with line-art axes and grids, nodes and edges, the isometric helper (`frame`, `TOP`/`FRONT`/`SIDE`, `box`), sliders, toggles and buttons, live readouts and tooltips
- The interaction vocabulary: `press`, `flash`, `latch`, `hot` (glow), `pulse` (travel along a wire), `drawIn`, plus `loop` and timers that clean up automatically when the widget unmounts
- A widget is a small module: `{ id, name, hint, aria, css, mount(stage, api) }`. The hint and live readout show in the caption bar
- Tokens are injected into the sandboxed iframe automatically
- A small API for reporting interactions and results back to the player

Every custom widget should meet this checklist:

1. One concept, one or two knobs, and a visible consequence
2. **Predict first:** ask "what do you think happens if…?" before the user plays
3. A short prompt for what to try, and a recall question afterwards
4. Works with the keyboard, has a reduced-motion fallback, and passes a contrast check. Uses the line language; teaching labels face the screen; any WebGL stays within the frame-time budget with a static SVG fallback
5. Uses tokens only, with no hard-coded colours or fonts. The design checks in `learnsmart validate` enforce this.

**Feedback loop:** `learnsmart preview --screenshot` renders any lesson or widget headlessly, so the agent can *see* its work and refine it. Good custom widgets can be promoted into the premade library.

## The learning model

Every level runs three loops:

- **Learn:** 3–5 minute segments, each followed by a recall prompt. Worked examples drop steps as you progress. Interactive widgets are used only where the concept benefits (e.g. dragging a learning rate slider and watching gradient descent diverge).
- **Practise:** exam-style questions, calibrated to past papers, mixed across topics, optionally timed.
- **Review:** spaced repetition (FSRS) over every question you've seen, so earlier levels keep coming back.

The next level unlocks softly at about 70% mastery, and you can skip ahead if you want.

## Show, don't tell

**This is a core idea: if something can be shown as a diagram, show it.** Text is the fallback, not the default.

This matches the research on pictures and words: people learn more from words *and* pictures than from words alone. It also cuts the amount of reading, which helps dyslexic readers and makes skimming easier for everyone. The pictures have to *explain* something, though; decoration doesn't count. The words don't disappear either: they move *into* the diagram as labels, captions and steps.

### Choosing the visual

| If the content is… | Show it as… |
|---|---|
| A process or sequence | A flow diagram you step through |
| An algorithm | An animation you step through, with visible state (variables, stack, data structure) |
| A structure or hierarchy | A tree, layered diagram, or box-and-arrow architecture |
| Something with states | A state machine you can click through |
| A comparison | Side-by-side panels or a comparison table |
| A quantitative relationship | An interactive plot with a knob |
| Change over time | A timeline or a scrubbable animation |
| A formula | An annotated equation with a geometric or visual picture next to it |
| Cause and effect | A causal chain or loop diagram |

### Rules

- **Labels go on the diagram,** not in a separate legend or the paragraph below it.
- **Each diagram gets a one-line caption** saying what to notice.
- **Complex diagrams build up in steps** rather than appearing all at once.
- **Prose is for what can't be shown:** the "why", caveats and links to other ideas. Keep it short and next to the visual.
- **One standard diagram per concept,** stored on its wiki page and reused in lessons, questions and feedback, so you recognise it everywhere.
- **Questions switch between forms:** label this diagram, arrange the steps, predict the next state, explain this diagram in words. Exams need written answers, so going from a picture to words is practice in itself.
- **Diagrams cite their source** like any other claim. A confident wrong diagram does more damage than a wrong sentence.

### Enforced, not hoped for

`learnsmart validate` flags long blocks of text with no visual, and wiki concepts that don't have a standard diagram. The agent then has to add one or record a short reason why the content can't be shown.

## Marking

1. **Deterministic:** multiple choice, numbers with a tolerance, ordering and matching, code checked against tests.
2. **[Jev](https://www.llmreference.com/provider/typesafe-ai/jev) (TypeSafe AI):** written answers, checked one marking point at a time. Each point gets a calibrated probability, and the feedback for each point is written in advance.
3. **LLM fallback:** for answers where Jev isn't confident, and for open-ended explanations. You can always dispute a mark.

## Design principles

- **Show, don't tell.** If it can be a diagram, it's a diagram. Text is the fallback.
- **Recall over reading.** Quizzes are the core, not an add-on.
- **Hints before answers.** You must attempt a question before seeing the answer, and hints come in stages.
- **Every claim is cited.** Questions and lessons cite wiki pages, and wiki pages cite source slides or pages, so you can always trace a claim back to the source.
- **You stay in the loop.** Anything that's unclear or wrong can be highlighted and sent back to the agent in two clicks.
- **Reward mastery, not activity.** No points for time spent or pages read.
- **Quiet chrome, vivid content.** Minimal dark UI with isometric SVG line art and one accent colour. Glow and motion go into diagrams, widgets and progress, not decoration.
- **Calm and readable.** Short segments, instant feedback, and an easy "resume where I was".
- **Build widgets from the kit.** If a concept has a knob, give the user something to play with, built from the kit so it looks native.
- **Accessible to everyone.** Adjustable letter and line spacing, line length and background tint, plus text-to-speech and plain language. No special dyslexia fonts and no "learning style" modes, since neither is supported by evidence.
- **Safe custom widgets.** AI-written HTML runs in sandboxed iframes and reports back through a small message API.

## Not in v1

- Public course sharing (copyright risk with lecture material)
- An MCP server (the file inbox and CLI come first; MCP could wrap them later)
- Electron packaging
- Settings for non-uni material
- Learning from AI chat logs

## MVP milestones

> **Status (6 Oct 2026):** a working prototype covers most of milestone 1 and parts of 2–3: the player, the course format, the widget kit with two sample widgets, the highlight → inbox loop, and `learnsmart validate`. See [README.md](README.md).

1. Dark-mode tokens and the line language; the isometric helper and SVG diagram primitives; format spec (including wiki pages and stable block IDs); conventions doc; and a player with lessons, wiki pages, about 8 core components, deterministic quizzes and progress stored locally.
2. Widget kit and `learnsmart preview --screenshot`. One AIML431 topic generated end to end (sources → wiki → lessons, widgets and questions), then used for real.
3. `learnsmart validate` (including design checks), highlight-to-inbox with `learnsmart inbox`, and spaced review.
4. Jev marking with an LLM fallback, per-concept mastery, and the level map with its moments.
5. Both courses fully covered in time for the exams.

## How we'll know it works

- We'd pick it over "past papers + asking Claude" for revision.
- Practice-exam scores improve over time, and our own marking agrees with the app's.
- Every learning objective has a wiki page, at least one lesson and three questions.
- Inbox requests are resolved within one agent session, and "this is wrong" reports become rare over time.
- A daily review session takes 15 minutes or less.

## Key risks

| Risk | How we handle it |
|---|---|
| AI-generated content is wrong | Trace every claim from question to wiki to source, have `validate` reject anything uncited, and report errors with "This is wrong" |
| The wiki becomes a reading crutch | Link to it after a recall attempt or a wrong answer, not as the default starting point |
| Regenerating content breaks references and progress | Stable block IDs, plus matching on the quoted text and the text around it |
| The inbox piles up unprocessed | Show a pending count in the player; the agent processes the inbox at the start of each authoring session |
| Coverage gaps or poor calibration | Map every objective to content; calibrate questions against past papers |
| Jev is new and could change | Keep the marking provider swappable |
| Scope creep | Exams first; the "not in v1" list stays parked |
| Design polish eats exam-prep time | Tokens and core components come first; the level map and moments wait until milestone 4 |
| Generated visuals look generic or inconsistent | Art direction, tokens only, the widget kit, design checks, and screenshot review by the agent |
| WebGL hurts readability, battery or performance | SVG by default; WebGL only for field visuals, never behind text, with a frame-time budget and static fallbacks |
| Faint line art fails as teaching material | Faint strokes for structure only; strokes that teach use `ink-hi` or the accent at 3:1 contrast or better; teaching labels face the screen |
| "Epic" turns into distraction | Minimal interface around the content; colour and motion only in content and moments; calm mode; a motion budget for each screen |

## Open questions

- When are the exams?
- Do we have past papers for both courses?
- Which agent will each of us use to write content?

## Evidence behind the design

- Practice testing and spacing study out rate highest of 10 study techniques: [Dunlosky et al. 2013](https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html)
- No support for matching teaching to "learning styles": [Pashler et al. 2008](https://scholarcommons.usf.edu/psy_facpub/1765)
- Multimedia design principles meta-analysis (words and pictures beat words alone, labels belong on the diagram, complex content in steps): [summary](https://carlhendrick.substack.com/p/which-multimedia-strategies-actually)
- Emotional design (pleasant colours, graphics with character) improves learning: [Brom, Stárková & D'Mello 2018](https://artemis.ms.mff.cuni.cz/main/papers/emodesign_manuscript_1rev_180928_FINAL_norev.pdf)
- Gamification meta-analysis: [Sailer & Homner 2020](https://opus.bibliothek.uni-augsburg.de/opus4/frontdoor/index/index/docId/109056)
- Gamification and ADHD: [Frontiers in Education 2025](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2025.1668260/full)
- Retrieval practice and ADHD: [Frontiers in Psychology 2023](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1186566/full)
- Dyslexia fonts vs spacing: [Springer](https://link.springer.com/article/10.1007/s11881-016-0127-1), [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5629233)
- Unrestricted AI help harmed exam results: [Bastani et al.](https://knowledge.wharton.upenn.edu/article/without-guardrails-generative-ai-can-harm-education)
- LLM marking agreement with human markers: [arXiv 2505.04645](https://arxiv.org/abs/2505.04645v1), [arXiv 2601.08843](https://arxiv.org/html/2601.08843v1)
