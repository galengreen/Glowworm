import { useEffect } from 'react';
import type { Lesson as LessonT } from '../../course/types';
import { useCourse } from '../../render/context';
import { Md } from '../../render/Md';
import { Boundary } from '../Boundary';
import { conceptMastery, passSegment, segmentPassed, segmentRecalls, setLast, useProgress } from '../../state/progress';
import { go } from '../../state/router';
import { openDrawer } from '../../state/ui';
import { Covers, Ring, pad } from '../bits';

/** `focus`: a section id to scroll to (e.g. from a concept page's "Learn this"). */
export function Lesson({ lesson, focus }: { lesson: LessonT; focus?: string }) {
  const { course, dir } = useCourse();
  const p = useProgress(dir);

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

  // Jump to the focused section; if it's still locked, go to the section that's currently open instead.
  useEffect(() => {
    if (!focus) return;
    const idx = lesson.segments.findIndex((s) => s.id === focus);
    if (idx < 0) return;
    const target = idx < visible ? focus : lesson.segments[Math.max(0, visible - 1)].id;
    const t = setTimeout(() => scrollTo(target), 150);
    return () => clearTimeout(t);
  }, [focus, lesson.id]);

  return (
    <div className="lesson">
      <nav className="rail" aria-label="Lesson">
        <div className="rail-group">
          <span className="label-sm">Sections</span>
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
        </div>
        {lesson.concepts.length > 0 && (
          <div className="rail-group concepts">
            <span className="label-sm">Concepts in this lesson</span>
            {lesson.concepts.map((c) => (
              <button key={c} onClick={() => openDrawer({ kind: 'concept', id: c })}>
                <Ring value={conceptMastery(course, p, c)} size={16} stroke={2} />
                <span>{course.wiki[c]?.title ?? c}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      <div className="main">
        <div className="lesson-head">
          <span className="label-sm">Level {pad(levelIdx + 1)} · {level?.title}</span>
          <h1>{lesson.title}</h1>
          <Covers concepts={lesson.concepts} className="narrow-only" />
        </div>

        {lesson.segments.slice(0, visible + 1).map((seg, i) => {
          const locked = i >= visible;
          const n = titled.indexOf(seg) + 1;
          return (
            <section
              key={seg.id}
              id={`seg-${seg.id}`}
              className={`seg${locked ? ' locked' : ''}`}
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
              <Boundary label="this section"><Md source={seg.body} /></Boundary>
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

