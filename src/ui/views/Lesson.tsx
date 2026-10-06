import { useEffect } from 'react';
import type { Lesson as LessonT } from '../../course/types';
import { useCourse } from '../../render/context';
import { Md } from '../../render/Md';
import { useInbox } from '../../state/inbox';
import { passSegment, segmentPassed, segmentRecalls, setLast, useProgress } from '../../state/progress';
import { go } from '../../state/router';
import { openDrawer } from '../../state/ui';
import { pad } from '../bits';

export function Lesson({ lesson }: { lesson: LessonT }) {
  const { course, dir } = useCourse();
  const p = useProgress(dir);
  const updated = new Set(useInbox().filter((r) => r.course === dir && r.status === 'done').map((r) => r.block));

  useEffect(() => setLast(dir, lesson.id), [dir, lesson.id]);

  const levelIdx = course.meta.levels.findIndex((l) => l.lessons.includes(lesson.id));
  const level = course.meta.levels[levelIdx];
  const order = course.meta.levels.flatMap((l) => l.lessons);
  const next = order[order.indexOf(lesson.id) + 1];

  // Learn loop: each segment ends in a recall prompt; the next opens once it's attempted (or skipped).
  const firstOpen = lesson.segments.findIndex((s) => !segmentPassed(p, s));
  const visible = firstOpen === -1 ? lesson.segments.length : firstOpen + 1;
  const done = firstOpen === -1;
  const titled = lesson.segments.filter((s) => s.title);
  const scrollTo = (id: string) => document.getElementById(`seg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="lesson">
      <nav className="rail" aria-label="Sections">
        {titled.map((seg, i) => {
          const idx = lesson.segments.indexOf(seg);
          const state = segmentPassed(p, seg) ? 'done' : idx === firstOpen ? 'current' : '';
          return (
            <button key={seg.id} className={state} disabled={idx >= visible} onClick={() => scrollTo(seg.id)}>
              <span className="state" />
              <span><span className="num">{pad(i + 1)}</span> {seg.title}</span>
            </button>
          );
        })}
      </nav>

      <div className="main">
        <div className="lesson-head">
          <span className="label-sm">Level {pad(levelIdx + 1)} · {level?.title}</span>
          <h1>{lesson.title}</h1>
          <div className="concept-chips">
            {lesson.concepts.map((c) => (
              <button key={c} className="cchip" style={{ paddingLeft: 12 }} onClick={() => openDrawer({ kind: 'concept', id: c })}>
                {course.wiki[c]?.title ?? c}
              </button>
            ))}
          </div>
        </div>

        {lesson.segments.slice(0, visible + 1).map((seg, i) => {
          const locked = i >= visible;
          const n = titled.indexOf(seg) + 1;
          return (
            <section
              key={seg.id}
              id={`seg-${seg.id}`}
              className={`seg${locked ? ' locked' : ''}${updated.has(seg.id) ? ' updated' : ''}`}
              data-block={seg.id}
              data-file={lesson.file}
              aria-hidden={locked}
            >
              {seg.title && (
                <div className="seg-head">
                  <span className="n">{pad(n)}</span>
                  <h2>{seg.title}</h2>
                </div>
              )}
              <Md source={seg.body} />
              {i === firstOpen && segmentRecalls(seg).length > 0 && (
                <div className="gate">
                  <span className="dot" />
                  <span>Answer the question above to unlock the next section.</span>
                  <span style={{ flex: 1 }} />
                  <button className="linkish" onClick={() => passSegment(dir, seg.id)}>Skip for now</button>
                </div>
              )}
            </section>
          );
        })}

        {done && (
          <div className="lesson-end">
            <span className="label-sm">Lesson complete</span>
            <h3>Lock it in with a few practice questions</h3>
            <div className="row">
              <button className="btn live" onClick={() => go(dir, 'practice', undefined, undefined, { concepts: lesson.concepts.join(',') })}>
                Practise these concepts
              </button>
              {next && course.lessons[next] && <button className="btn" onClick={() => go(dir, 'lesson', next)}>Next: {course.lessons[next].title} →</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

