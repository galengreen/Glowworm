import { scanDirectives } from '../../course/parse';
import type { Course, WikiPage } from '../../course/types';
import { useCourse } from '../../render/context';
import { Figure } from '../../render/Figure';
import { Md } from '../../render/Md';
import { conceptMastery, useProgress } from '../../state/progress';
import { go } from '../../state/router';
import { closeDrawer, openDrawer, sourceItem, sourceLabel } from '../../state/ui';
import { Ring } from '../bits';

/** Learning order: the order concepts are taught in the lessons, with prerequisites first. */
export function orderedConcepts(course: Course): WikiPage[] {
  const out: WikiPage[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id) || !course.wiki[id]) return;
    seen.add(id);
    course.wiki[id].prerequisites.forEach(visit);
    out.push(course.wiki[id]);
  };
  const taught = course.meta.levels.flatMap((l) => l.lessons).flatMap((id) => course.lessons[id]?.concepts ?? []);
  [...taught, ...Object.keys(course.wiki).sort()].forEach(visit);
  return out;
}

export function WikiIndex() {
  const { course, dir } = useCourse();
  const p = useProgress(dir);
  return (
    <div className="page narrow">
      <div className="page-head">
        <span className="label-sm">Knowledge base</span>
        <h1>Concepts</h1>
        <p className="lede">One page per concept, in learning order. Every claim cites the source material, and every question cites one of these pages.</p>
      </div>
      <div className="concept-list">
        {orderedConcepts(course).map((c) => (
          <button key={c.id} className="concept-item" onClick={() => go(dir, 'wiki', c.id)}>
            <Ring value={conceptMastery(course, p, c.id)} size={30} />
            <span>
              <div className="t">{c.title}</div>
              <div className="s">{c.summary}</div>
            </span>
            <span className="muted">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Mastery, sources and links for a concept. `inDrawer` keeps navigation inside the drawer. */
function Facts({ page, inDrawer }: { page: WikiPage; inDrawer?: boolean }) {
  const { course, dir } = useCourse();
  const p = useProgress(dir);
  const mastery = conceptMastery(course, p, page.id);
  const questions = Object.values(course.questions).filter((q) => q.concept === page.id);
  const lessons = Object.values(course.lessons).filter(
    (l) => l.concepts.includes(page.id) || l.segments.some((s) => scanDirectives(s.body).concepts.includes(page.id)),
  );
  const neededFor = Object.values(course.wiki).filter((w) => w.prerequisites.includes(page.id));
  const toConcept = (id: string) => (inDrawer ? openDrawer({ kind: 'concept', id }) : go(dir, 'wiki', id));
  const links = (ids: string[]) =>
    ids.map((id) => (
      <button key={id} className="linkish" onClick={() => toConcept(id)}>{course.wiki[id]?.title ?? id}</button>
    ));

  const groups: [string, React.ReactNode][] = [
    ['Sources', page.sources.map((s) => <button key={s} className="cite" style={{ marginLeft: 0 }} onClick={() => openDrawer(sourceItem(s))}>{sourceLabel(course, s)}</button>)],
    ['Builds on', page.prerequisites.length ? links(page.prerequisites) : null],
    ['Needed for', neededFor.length ? links(neededFor.map((n) => n.id)) : null],
    ['Related', page.related.length ? links(page.related) : null],
    ['Taught in', lessons.length ? lessons.map((l) => <button key={l.id} className="linkish" onClick={() => { closeDrawer(); go(dir, 'lesson', l.id); }}>{l.title}</button>) : null],
  ];

  return (
    <>
      <div className="mastery">
        <Ring value={mastery} size={44} stroke={3} />
        <div>
          <div className="pct">{Math.round(mastery * 100)}%</div>
          <div className="muted" style={{ fontSize: 13.5 }}>mastery · {questions.length} questions</div>
        </div>
      </div>
      <button className="btn live" disabled={!questions.length} onClick={() => { closeDrawer(); go(dir, 'practice', undefined, undefined, { concepts: page.id }); }}>
        Quiz me on this
      </button>
      {groups.filter(([, v]) => v).map(([k, v]) => (
        <div key={k}>
          <span className="label-sm">{k}</span>
          <div className="stack">{v}</div>
        </div>
      ))}
    </>
  );
}

export function WikiPageView({ page }: { page: WikiPage }) {
  return (
    <div className="page">
      <div className="wiki">
        <div data-block={page.id} data-file={page.file}>
          <div className="page-head" style={{ marginBottom: 28 }}>
            <span className="label-sm">Concept</span>
            <h1>{page.title}</h1>
            <p className="lede">{page.summary}</p>
          </div>
          {page.diagram && <Figure widgetId={page.diagram.widget} params={page.diagram.params} />}
          <Md source={page.body} />
        </div>
        <aside><Facts page={page} /></aside>
      </div>
    </div>
  );
}

/** Compact concept view for the side drawer. */
export function ConceptDrawer({ page }: { page: WikiPage }) {
  return (
    <div data-block={page.id} data-file={page.file}>
      <span className="label-sm">Concept</span>
      <h1>{page.title}</h1>
      <p className="lede">{page.summary}</p>
      {page.diagram && <Figure widgetId={page.diagram.widget} params={page.diagram.params} />}
      <Md source={page.body} />
      <div className="facts" style={{ display: 'grid', gap: 18 }}>
        <Facts page={page} inDrawer />
      </div>
    </div>
  );
}
