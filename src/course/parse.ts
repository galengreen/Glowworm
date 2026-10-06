// Pure parsing and validation of course folders. Shared by the player (Vite glob) and the CLI (fs).
import { parse as parseYaml } from 'yaml';
import GithubSlugger from 'github-slugger';
import type { Course, CourseMeta, DiagramRef, Issue, Lesson, Question, Segment, SourceDoc, WikiPage } from './types';

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

export function headingSlugs(markdown: string): string[] {
  const slugger = new GithubSlugger();
  const out: string[] = [];
  let inFence = false;
  for (const line of markdown.split('\n')) {
    if (/^```/.test(line)) inFence = !inFence;
    const h = !inFence && /^#{1,6}\s+(.*?)\s*#*$/.exec(line);
    if (h) out.push(slugger.slug(h[1]));
  }
  return out;
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

export function parseCourses(files: FileMap, widgetIds: Record<string, string[]>): { courses: Course[]; issues: Issue[] } {
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
    const course: Course = { meta, root, lessons: {}, wiki: {}, sources: {}, questions: {}, widgetIds: widgetIds[dir] ?? [] };

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
          const doc: SourceDoc = { id, file, title, body: raw, anchors: headingSlugs(raw) };
          course.sources[id] = doc;
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

  for (const [file, src] of Object.entries(widgetSources)) {
    const hex = src.match(/#[0-9a-fA-F]{3,8}\b/g);
    if (hex) err(file, `Hard-coded colours ${[...new Set(hex)].join(', ')}: use tokens (var(--…))`);
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
