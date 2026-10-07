// Pure parsing and validation of course folders. Shared by the player (Vite glob) and the CLI (fs).
import { parse as parseYaml } from 'yaml';
import GithubSlugger from 'github-slugger';
import type { Course, CourseMeta, DiagramRef, Issue, Lesson, Outline, PlannedWidget, Question, Segment, SourceDoc, SourceSection, WidgetMeta, WikiPage } from './types';

/** Map of absolute-ish path (`/courses/<id>/...`) to raw file contents. */
export type FileMap = Record<string, string>;

export function splitFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!m) return { data: {}, body: raw };
  return { data: (parseYaml(m[1]) ?? {}) as Record<string, unknown>, body: raw.slice(m[0].length) };
}

/** `diagram: neuron` or `diagram: { widget: gradient-descent, params: { lr: 1.5 } }` */
function parseDiagram(v: unknown): DiagramRef | undefined {
  if (!v || (typeof v === 'object' && 'none' in v)) return undefined;
  if (typeof v === 'string') return { widget: v, params: {} };
  const o = v as { widget?: unknown; params?: Record<string, unknown> };
  return { widget: String(o.widget ?? ''), params: Object.fromEntries(Object.entries(o.params ?? {}).map(([k, x]) => [k, String(x)])) };
}

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v == null ? [] : [String(v)]);

function headings(markdown: string) {
  const slugger = new GithubSlugger();
  const out: { depth: number; title: string; slug: string }[] = [];
  let inFence = false;
  for (const line of markdown.split('\n')) {
    if (/^```/.test(line)) inFence = !inFence;
    const h = !inFence && /^(#{1,6})\s+(.*?)\s*#*$/.exec(line);
    if (h) out.push({ depth: h[1].length, title: h[2], slug: slugger.slug(h[2]) });
  }
  return out;
}

export const headingSlugs = (markdown: string) => headings(markdown).map((h) => h.slug);

/** Split a source at its `##` headings; deeper headings belong to the section above them. */
function sourceSections(markdown: string): SourceSection[] {
  const all = headings(markdown);
  if (!all.some((h) => h.depth === 2)) return [{ slug: '', title: all[0]?.title ?? '', anchors: all.map((h) => h.slug) }];
  const sections: SourceSection[] = [];
  for (const h of all) {
    if (h.depth === 2) sections.push({ slug: h.slug, title: h.title, anchors: [h.slug] });
    else if (h.depth > 2) sections.at(-1)?.anchors.push(h.slug);
  }
  return sections;
}

/** Lessons are split into segments at `## Title {#id}` headings. */
function splitSegments(body: string, lessonId: string): Segment[] {
  const segments: Segment[] = [];
  let current: Segment | null = null;
  const intro: string[] = [];
  for (const line of body.split('\n')) {
    const h = /^##\s+(.*?)(?:\s*\{#([\w-]+)\})?\s*$/.exec(line);
    if (h) {
      if (current) segments.push(current);
      current = { id: h[2] ?? `${lessonId}-${segments.length + 1}`, title: h[1], body: '' };
    } else if (current) {
      current.body += line + '\n';
    } else {
      intro.push(line);
    }
  }
  if (current) segments.push(current);
  const introText = intro.join('\n').trim();
  if (introText) segments.unshift({ id: `${lessonId}-intro`, title: '', body: introText });
  return segments;
}

/** courseDir -> widgets in that course */
export type WidgetMap = Record<string, WidgetMeta[]>;

/** `sources: ['a#b', "c"]` inside a widget module's defineWidget({...}), read without running it (for the CLI). */
export function widgetMetaFromSource(src: string): WidgetMeta | undefined {
  const id = /defineWidget\(\s*\{\s*id:\s*['"]([\w-]+)['"]/.exec(src)?.[1];
  if (!id) return undefined;
  const list = /\bsources:\s*\[([^\]]*)\]/.exec(src)?.[1] ?? '';
  return { id, sources: [...list.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) };
}

export function parseCourses(files: FileMap, widgetMap: WidgetMap): { courses: Course[]; issues: Issue[] } {
  const issues: Issue[] = [];
  const byCourse = new Map<string, FileMap>();
  for (const [path, raw] of Object.entries(files)) {
    const m = /^\/courses\/([^/]+)\/(.+)$/.exec(path);
    if (!m) continue;
    if (!byCourse.has(m[1])) byCourse.set(m[1], {});
    byCourse.get(m[1])![m[2]] = raw;
  }

  const courses: Course[] = [];
  for (const [dir, map] of byCourse) {
    const root = `/courses/${dir}`;
    if (!map['course.yaml']) {
      issues.push({ level: 'error', file: `${root}/course.yaml`, message: 'Missing course.yaml' });
      continue;
    }
    const meta = parseYaml(map['course.yaml']) as CourseMeta;
    const widgets = widgetMap[dir] ?? [];
    const course: Course = { meta, root, lessons: {}, wiki: {}, sources: {}, questions: {}, widgets, widgetIds: widgets.map((w) => w.id) };

    for (const [file, raw] of Object.entries(map)) {
      try {
        if (file.startsWith('lessons/') && file.endsWith('.md')) {
          const { data, body } = splitFrontmatter(raw);
          const id = String(data.id ?? file.replace(/^lessons\/|\.md$/g, ''));
          const lesson: Lesson = {
            id,
            file,
            title: String(data.title ?? id),
            level: String(data.level ?? ''),
            concepts: arr(data.concepts),
            segments: splitSegments(body, id),
          };
          course.lessons[id] = lesson;
        } else if (file.startsWith('wiki/') && file.endsWith('.md')) {
          const { data, body } = splitFrontmatter(raw);
          const id = String(data.id ?? file.replace(/^wiki\/|\.md$/g, ''));
          const page: WikiPage = {
            id,
            file,
            title: String(data.title ?? id),
            summary: String(data.summary ?? ''),
            sources: arr(data.sources),
            prerequisites: arr(data.prerequisites),
            related: arr(data.related),
            diagram: parseDiagram(data.diagram),
            noDiagram: typeof data.diagram === 'object' && data.diagram && 'none' in data.diagram ? String((data.diagram as { none: unknown }).none) : undefined,
            body,
          };
          course.wiki[id] = page;
        } else if (file.startsWith('sources/') && file.endsWith('.md')) {
          const id = file.replace(/^sources\/|\.md$/g, '');
          const title = /^#\s+(.*)$/m.exec(raw)?.[1] ?? id;
          const doc: SourceDoc = { id, file, title, body: raw, anchors: headingSlugs(raw), sections: sourceSections(raw) };
          course.sources[id] = doc;
        } else if (file === 'outline.yaml') {
          const data = (parseYaml(raw) ?? {}) as Partial<Outline>;
          course.outline = {
            topics: (data.topics ?? []).map((t) => ({
              ...t,
              id: String(t.id),
              title: String(t.title ?? t.id),
              sources: arr(t.sources),
              concepts: arr(t.concepts),
              widgets: (Array.isArray(t.widgets) ? t.widgets : []).map((w: PlannedWidget | string) =>
                typeof w === 'string' ? { id: w, shows: '' } : { id: String(w.id), shows: String(w.shows ?? '') },
              ),
            })),
            skip: (data.skip ?? []).map((s) => ({ src: String(s.src ?? ''), why: String(s.why ?? '') })),
          };
        } else if (file.startsWith('questions/') && /\.ya?ml$/.test(file)) {
          const list = parseYaml(raw) as Record<string, unknown>[];
          for (const q of list ?? []) {
            const question = { hints: [], ...q, file } as unknown as Question;
            if (course.questions[question.id]) {
              issues.push({ level: 'error', file: `${root}/${file}`, message: `Duplicate question id "${question.id}"` });
            }
            course.questions[question.id] = question;
          }
        }
      } catch (e) {
        issues.push({ level: 'error', file: `${root}/${file}`, message: `Could not parse: ${(e as Error).message}` });
      }
    }
    courses.push(course);
  }
  return { courses, issues };
}

// ---------- directive scanning (used by validation) ----------

const attr = (attrs: string, name: string) => new RegExp(`${name}=["']?([\\w#.-]+)`).exec(attrs)?.[1];

export function scanDirectives(markdown: string) {
  const recalls: string[] = [];
  const concepts: string[] = [];
  const figures: string[] = [];
  const cites: string[] = [];
  for (const m of markdown.matchAll(/:{2,3}recall\{([^}]*)\}/g)) recalls.push(attr(m[1], 'q') ?? '');
  for (const m of markdown.matchAll(/(?<!:):concept\[[^\]]*\]\{([^}]*)\}/g)) concepts.push(attr(m[1], 'id') ?? '');
  for (const m of markdown.matchAll(/:{2,3}figure\{([^}]*)\}/g)) figures.push(attr(m[1], 'widget') ?? '');
  for (const m of markdown.matchAll(/(?<!:):cite\[[^\]]*\]\{([^}]*)\}/g)) cites.push(attr(m[1], 'src') ?? '');
  return { recalls, concepts, figures, cites };
}

const words = (md: string) => md.replace(/:{1,3}\w+(\[[^\]]*\])?(\{[^}]*\})?/g, ' ').split(/\s+/).filter(Boolean).length;

export const PROSE_LIMIT = 160; // words of prose in a segment before "show, don't tell" kicks in

export function resolveSource(course: Course, ref: string): boolean {
  const [doc, anchor] = ref.split('#');
  const source = course.sources[doc];
  return !!source && (!anchor || source.anchors.includes(anchor));
}

const sectionKey = (doc: string, slug: string) => (slug ? `${doc}#${slug}` : doc);

/**
 * The source sections a reference covers, as `doc#slug` keys, or undefined if it doesn't resolve.
 * `notes` is every section, `notes#a` the section holding heading a, `notes#a..d` sections a to d.
 */
export function expandSourceRef(course: Course, ref: string): string[] | undefined {
  const [doc, anchor = ''] = ref.split('#');
  const source = course.sources[doc];
  if (!source) return undefined;
  const all = source.sections.map((s) => sectionKey(doc, s.slug));
  if (!anchor) return all;
  const index = (a: string) => source.sections.findIndex((s) => s.anchors.includes(a));
  const [from, to = from] = anchor.split('..').map(index);
  if (anchor === headingSlugs(source.body)[0] && from < 0) return all; // the `#` title
  if (from < 0 || to < 0 || to < from) return undefined;
  return all.slice(from, to + 1);
}

export interface TopicCoverage {
  topic: string;
  sections: { key: string; title: string; citedBy: string[] }[];
  missingConcepts: string[];
  missingWidgets: string[];
}

/** How each topic's source sections are covered, and which sections no topic or skip accounts for. */
export function coverage(course: Course) {
  const outline = course.outline ?? { topics: [], skip: [] };
  const titles = new Map<string, string>();
  for (const [doc, source] of Object.entries(course.sources)) for (const s of source.sections) titles.set(sectionKey(doc, s.slug), s.title || source.title);

  // Who cites each section: wiki `sources:` and inline :cite in wiki pages and lessons.
  const citedBy = new Map<string, Set<string>>();
  const cite = (ref: string, by: string) => {
    for (const key of ref.includes('..') ? [] : expandSourceRef(course, ref) ?? []) {
      if (!ref.includes('#') && (course.sources[ref]?.sections.length ?? 0) > 1) continue; // a whole-file cite doesn't cover each slide
      (citedBy.get(key) ?? citedBy.set(key, new Set()).get(key)!).add(by);
    }
  };
  for (const page of Object.values(course.wiki)) {
    for (const s of page.sources) cite(s, page.file);
    for (const s of scanDirectives(page.body).cites) cite(s, page.file);
  }
  for (const lesson of Object.values(course.lessons)) for (const seg of lesson.segments) for (const s of scanDirectives(seg.body).cites) cite(s, lesson.file);
  for (const w of course.widgets) for (const s of w.sources) cite(s, `widgets/${w.id}`);

  const assigned = new Set<string>();
  const topics: TopicCoverage[] = outline.topics.map((t) => {
    const keys = [...new Set(t.sources.flatMap((r) => expandSourceRef(course, r) ?? []))];
    keys.forEach((k) => assigned.add(k));
    return {
      topic: t.id,
      sections: keys.map((key) => ({ key, title: titles.get(key) ?? key, citedBy: [...(citedBy.get(key) ?? [])] })),
      missingConcepts: t.concepts.filter((c) => !course.wiki[c]),
      missingWidgets: t.widgets.map((w) => w.id).filter((id) => !course.widgetIds.includes(id)),
    };
  });
  const skipped = new Set(outline.skip.flatMap((s) => expandSourceRef(course, s.src) ?? []));
  const unassigned = [...titles.keys()].filter((k) => !assigned.has(k) && !skipped.has(k)).map((key) => ({ key, title: titles.get(key)! }));
  return { topics, unassigned, skipped: outline.skip };
}

export function validateCourse(course: Course, widgetSources: Record<string, string> = {}): Issue[] {
  const issues: Issue[] = [];
  const at = (file: string) => `${course.root}/${file}`;
  const err = (file: string, message: string) => issues.push({ level: 'error', file: at(file), message });
  const warn = (file: string, message: string) => issues.push({ level: 'warn', file: at(file), message });
  const widgets = new Set(course.widgetIds);

  for (const level of course.meta.levels ?? []) {
    for (const l of level.lessons) if (!course.lessons[l]) err('course.yaml', `Level "${level.id}" lists missing lesson "${l}"`);
  }

  for (const page of Object.values(course.wiki)) {
    if (!page.sources.length) err(page.file, 'Wiki page cites no sources');
    for (const s of page.sources) if (!resolveSource(course, s)) err(page.file, `Source "${s}" not found`);
    for (const p of [...page.prerequisites, ...page.related]) if (!course.wiki[p]) err(page.file, `Links to missing wiki page "${p}"`);
    if (!page.diagram && !page.noDiagram) warn(page.file, 'No standard diagram (show, don\'t tell): add `diagram:` or `diagram: { none: "reason" }`');
    else if (page.diagram && !widgets.has(page.diagram.widget)) err(page.file, `Diagram widget "${page.diagram.widget}" not found`);
    const qs = Object.values(course.questions).filter((q) => q.concept === page.id);
    if (qs.length < 3) warn(page.file, `Only ${qs.length} question(s) cite this concept (want 3+)`);
    checkBody(page.file, page.body);
  }

  for (const lesson of Object.values(course.lessons)) {
    for (const c of lesson.concepts) if (!course.wiki[c]) err(lesson.file, `Concept "${c}" has no wiki page`);
    for (const seg of lesson.segments) {
      const d = checkBody(lesson.file, seg.body);
      if (seg.title && !d.recalls.length) warn(lesson.file, `Segment "${seg.id}" has no recall prompt`);
      if (words(seg.body) > PROSE_LIMIT && !d.figures.length) {
        warn(lesson.file, `Segment "${seg.id}" is ${words(seg.body)} words with no figure (show, don't tell)`);
      }
    }
  }

  for (const q of Object.values(course.questions)) {
    const text: [string, unknown][] = [
      ['prompt', q.prompt],
      ['explain', q.explain],
      ...q.hints.map((h, i): [string, unknown] => [`hints[${i}]`, h]),
      ...(q.type === 'mcq' ? q.choices.map((c, i): [string, unknown] => [`choices[${i}]`, c]) : []),
      ...(q.type === 'short' ? q.markScheme.flatMap((m, i): [string, unknown][] => [[`markScheme[${i}].point`, m.point], [`markScheme[${i}].feedback`, m.feedback]]) : []),
      ...(q.type === 'short' ? [['model', q.model] as [string, unknown]] : []),
    ];
    for (const [field, v] of text) {
      if (v !== undefined && typeof v !== 'string') err(q.file, `Question "${q.id}" ${field} isn't text (a "word: …" item parses as a mapping); quote it`);
    }
    if (!course.wiki[q.concept]) err(q.file, `Question "${q.id}" cites missing concept "${q.concept}"`);
    if (q.type === 'mcq' && (q.answer < 0 || q.answer >= q.choices.length)) err(q.file, `Question "${q.id}" answer out of range`);
    if (q.type === 'short' && !q.markScheme?.length) err(q.file, `Question "${q.id}" has no mark scheme`);
    if (q.type === 'numeric' && typeof q.tolerance !== 'number') err(q.file, `Question "${q.id}" needs a tolerance`);
  }

  checkOutline();

  for (const w of course.widgets) for (const s of w.sources) if (!resolveSource(course, s)) err(`widgets/${w.id}.ts`, `Source "${s}" not found`);

  for (const [file, src] of Object.entries(widgetSources)) {
    const hex = src.match(/#[0-9a-fA-F]{3,8}\b/g);
    if (hex) err(file, `Hard-coded colours ${[...new Set(hex)].join(', ')}: use tokens (var(--…))`);
  }

  /** Nothing in the sources is left out: every section belongs to a topic that cites it, or is skipped with a reason. */
  function checkOutline() {
    const outline = course.outline;
    if (!outline) {
      if (Object.keys(course.sources).length) warn('course.yaml', 'No outline.yaml, so coverage of the sources isn\'t checked');
      return;
    }
    const owner = new Map<string, string>();
    for (const t of outline.topics) {
      for (const r of t.sources) if (!expandSourceRef(course, r)) err('outline.yaml', `Topic "${t.id}": source "${r}" not found`);
      for (const c of t.concepts) {
        if (owner.has(c)) err('outline.yaml', `Concept "${c}" is owned by both "${owner.get(c)}" and "${t.id}"`);
        owner.set(c, t.id);
      }
    }
    for (const s of outline.skip) {
      if (!expandSourceRef(course, s.src)) err('outline.yaml', `Skipped source "${s.src}" not found`);
      if (!s.why.trim()) err('outline.yaml', `Skipped source "${s.src}" needs a reason (why:)`);
    }
    const report = coverage(course);
    for (const t of report.topics) {
      for (const c of t.missingConcepts) err('outline.yaml', `Topic "${t.topic}" plans concept "${c}", which has no wiki page`);
      for (const w of t.missingWidgets) err('outline.yaml', `Topic "${t.topic}" plans widget "${w}", which hasn't been built`);
      for (const s of t.sections) if (!s.citedBy.length) err('outline.yaml', `Topic "${t.topic}" covers ${s.key} ("${s.title}"), but no wiki page or lesson cites it`);
    }
    for (const s of report.unassigned) err('outline.yaml', `${s.key} ("${s.title}") is left out: add it to a topic, or skip it with a reason`);
    for (const page of Object.values(course.wiki)) if (!owner.has(page.id)) warn(page.file, 'No topic in outline.yaml owns this concept');
  }

  function checkBody(file: string, body: string) {
    const d = scanDirectives(body);
    for (const q of d.recalls) if (!course.questions[q]) err(file, `Recall references missing question "${q}"`);
    for (const c of d.concepts) if (!course.wiki[c]) err(file, `Concept link to missing wiki page "${c}"`);
    for (const f of d.figures) if (!widgets.has(f)) err(file, `Figure uses missing widget "${f}"`);
    for (const s of d.cites) if (!resolveSource(course, s)) err(file, `Citation "${s}" not found`);
    if (/^\s*\$\$[^\n]+\$\$\s*$/m.test(body)) warn(file, 'Display maths must put $$ on their own lines, or it renders inline');
    return d;
  }

  return issues;
}
