import { issues } from '../../course/load';
import { useCourse } from '../../render/context';
import { conceptMastery, continueTarget, dueQuestions, lessonProgress, levelMastery, MASTERY_GATE, useProgress } from '../../state/progress';
import { go } from '../../state/router';
import { openDrawer } from '../../state/ui';
import { Pips, Ring, pad } from '../bits';

export function Home() {
  const { course, dir } = useCourse();
  const p = useProgress(dir);
  const due = dueQuestions(course, p).length;
  const target = continueTarget(course, p);
  const targetLesson = target ? course.lessons[target.lesson] : undefined;
  const targetProgress = targetLesson ? lessonProgress(targetLesson, p) : undefined;
  const nextSeg = targetLesson?.segments.find((_, i) => i === targetProgress?.passed);
  const totalQ = Object.keys(course.questions).length;
  const mine = issues.filter((i) => i.file.startsWith(course.root));
  const errors = mine.filter((i) => i.level === 'error');

  return (
    <div className="page">
      <div className="page-head">
        <span className="label-sm">Course</span>
        <h1>{course.meta.title}</h1>
        {course.meta.subtitle && <p className="lede">{course.meta.subtitle}</p>}
        {course.meta.sample && <span className="sample">Sample course, written for the prototype rather than from real course material</span>}
      </div>

      <div className="today">
        {targetLesson ? (
          <button className="card hero" onClick={() => go(dir, 'lesson', targetLesson.id)}>
            <span className="label-sm">{target?.fresh ? 'Start here' : 'Continue where you left off'}</span>
            <h3>{targetLesson.title}</h3>
            <p>{nextSeg?.title ? `Next: ${nextSeg.title}` : 'Pick up the next section'}</p>
            {targetProgress && <Pips done={targetProgress.passed} total={targetProgress.total} />}
            <span className="go">{target?.fresh ? 'Start lesson →' : 'Continue →'}</span>
          </button>
        ) : (
          <button className="card hero" onClick={() => go(dir, 'practice')}>
            <span className="label-sm">All lessons done</span>
            <h3>Keep it fresh with mixed practice</h3>
            <span className="go">Practise →</span>
          </button>
        )}
        <button className="card" onClick={() => go(dir, 'review')}>
          <span className="label-sm">Review</span>
          <span className={`big${due ? ' live' : ''}`}>{due}</span>
          <p>{due ? `due now · about ${Math.max(1, Math.round(due * 0.75))} min` : 'nothing due right now'}</p>
        </button>
        <button className="card" onClick={() => go(dir, 'practice')}>
          <span className="label-sm">Practice</span>
          <span className="big">{totalQ}</span>
          <p>exam-style questions, mixed across topics</p>
        </button>
      </div>

      <div className="section">
        <span className="label-sm">Course map</span>
        <div className="map">
          {course.meta.levels.map((level, i) => {
            const m = levelMastery(course, p, level.id);
            const prev = i > 0 ? levelMastery(course, p, course.meta.levels[i - 1].id) : 1;
            const concepts = [...new Set(level.lessons.flatMap((l) => course.lessons[l]?.concepts ?? []))];
            return (
              <div key={level.id} className={`map-level${m >= MASTERY_GATE ? ' done' : ''}`}>
                <div className="map-node">
                  <Ring value={m} size={56} stroke={2.5}><span className="n">{pad(i + 1)}</span></Ring>
                </div>
                <div className="map-body">
                  <div>
                    <h3>{level.title}</h3>
                    <div className="meta">
                      {Math.round(m * 100)}% mastered
                      {prev < MASTERY_GATE && ` · best after ${Math.round(MASTERY_GATE * 100)}% on level ${pad(i)}`}
                    </div>
                  </div>
                  {level.lessons.map((id) => {
                    const lesson = course.lessons[id];
                    if (!lesson) return null;
                    const lp = lessonProgress(lesson, p);
                    return (
                      <button key={id} className="lesson-row" onClick={() => go(dir, 'lesson', id)}>
                        <span>
                          <div className="t">{lesson.title}</div>
                          <div className="s">{lp.done ? 'Done' : lp.passed ? `${lp.passed} of ${lp.total} sections` : `${lp.total} sections`}</div>
                        </span>
                        <Pips done={lp.passed} total={lp.total} />
                      </button>
                    );
                  })}
                  <div className="concept-chips">
                    {concepts.map((c) => (
                      <button key={c} className="cchip" onClick={() => openDrawer({ kind: 'concept', id: c })}>
                        <Ring value={conceptMastery(course, p, c)} size={20} />
                        {course.wiki[c]?.title ?? c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <details className="section">
        <summary className="label-sm" style={{ cursor: 'pointer' }}>
          Course checks · {errors.length} error{errors.length === 1 ? '' : 's'} · {mine.length - errors.length} warning{mine.length - errors.length === 1 ? '' : 's'}
        </summary>
        <ul style={{ fontSize: 14, lineHeight: 1.7 }}>
          {mine.map((i, k) => (
            <li key={k} style={{ color: i.level === 'error' ? 'var(--miss)' : 'var(--ink)' }}>
              {i.level} · {i.file.replace(`${course.root}/`, '')} · {i.message}
            </li>
          ))}
          {!mine.length && <li>All checks pass.</li>}
        </ul>
      </details>
    </div>
  );
}
