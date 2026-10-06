import { issues } from '../../course/load';
import { useCourse } from '../../render/context';
import { conceptMastery, continueTarget, lessonProgress, levelMastery, MASTERY_GATE, segmentPassed, useProgress } from '../../state/progress';
import { go } from '../../state/router';
import { Covers, Pips, Ring, pad } from '../bits';

export function Home() {
  const { course, dir } = useCourse();
  const p = useProgress(dir);
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

      {Object.keys(course.lessons).length ? <Today /> : <NoLessons />}

      <div className="section" hidden={!course.meta.levels.length}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <span className="label-sm">Course map</span>
          <button className="linkish" style={{ fontSize: 14 }} onClick={() => go(dir, 'wiki')}>Browse all {Object.keys(course.wiki).length} concepts →</button>
        </div>
        <div className="map">
          {course.meta.levels.map((level, i) => {
            const m = levelMastery(course, p, level.id);
            const prev = i > 0 ? levelMastery(course, p, course.meta.levels[i - 1].id) : 1;
            return (
              <div key={level.id} className={`map-level${m >= MASTERY_GATE ? ' done' : ''}`}>
                <div className="map-node">
                  <Ring value={m} size={40} stroke={2}><span className="n">{pad(i + 1)}</span></Ring>
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
                      <div key={id} className="lesson-row" role="link" tabIndex={0} onClick={() => go(dir, 'lesson', id)} onKeyDown={(e) => e.key === 'Enter' && go(dir, 'lesson', id)}>
                        <span>
                          <div className="t">{lesson.title}</div>
                          <div className="s">{lp.done ? 'Done' : lp.passed ? `${lp.passed} of ${lp.total} sections` : `${lp.total} sections`}</div>
                          <Covers concepts={lesson.concepts} />
                        </span>
                        <Pips done={lp.passed} total={lp.total} />
                      </div>
                    );
                  })}
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

/** A new course: nothing to study until the agent has built something from the material. */
function NoLessons() {
  const { dir } = useCourse();
  return (
    <section className="empty-state no-lessons" aria-label="Get started">
      <h2>No lessons yet</h2>
      <p>Add your slides, notes and past papers, then hand them to your agent to build concepts, lessons and questions.</p>
      <button className="btn live cta" onClick={() => go(dir, 'materials')}>Add material →</button>
    </section>
  );
}

const DAY = 24 * 60 * 60 * 1000;

/** Today: what to do next, plus the few numbers worth acting on. */
function Today() {
  const { course, dir } = useCourse();
  const p = useProgress(dir);
  const order = course.meta.levels.flatMap((l) => l.lessons).filter((id) => course.lessons[id]);
  const target = continueTarget(course, p);
  const lesson = target ? course.lessons[target.lesson] : undefined;
  const lp = lesson ? lessonProgress(lesson, p) : undefined;
  const sections = lesson?.segments.filter((s) => s.title) ?? [];
  const remaining = sections.length - sections.filter((s) => segmentPassed(p, s)).length;

  const totalQ = Object.keys(course.questions).length;
  const seen = Object.keys(p.attempts).filter((id) => course.questions[id]).length;
  const concepts = Object.keys(course.wiki);
  const mastery = concepts.length ? concepts.reduce((sum, c) => sum + conceptMastery(course, p, c), 0) / concepts.length : 0;
  const exam = course.meta.exam ? new Date(course.meta.exam) : undefined;
  const days = exam ? Math.ceil((exam.getTime() - Date.now()) / DAY) : undefined;

  return (
    <section className="today" aria-label="Today">
      <div className="up-next">
        {lesson && lp ? (
          <>
            <span className="label-sm">
              {target?.fresh ? 'Start here' : lp.passed ? 'Continue' : 'Up next'} · Lesson {order.indexOf(lesson.id) + 1} of {order.length}
            </span>
            <h2>{lesson.title}</h2>
            <ol className="next-steps">
              {sections.map((s) => {
                const state = segmentPassed(p, s) ? 'done' : s === sections.find((x) => !segmentPassed(p, x)) ? 'current' : '';
                return (
                  <li key={s.id} className={state}>
                    <span className="st" />
                    {s.title}
                  </li>
                );
              })}
            </ol>
            <div className="cta-row">
              <button className="btn live cta" onClick={() => go(dir, 'lesson', lesson.id)}>
                {target?.fresh ? 'Start lesson' : lp.passed ? 'Continue lesson' : 'Start lesson'} →
              </button>
              <span className="muted">{remaining} section{remaining === 1 ? '' : 's'} left · about {Math.max(3, remaining * 4)} min</span>
            </div>
          </>
        ) : (
          <>
            <span className="label-sm">All lessons done</span>
            <h2>Keep it fresh with mixed practice</h2>
            <p className="muted" style={{ margin: 0 }}>Mixed questions across every topic are the best exam preparation from here.</p>
            <div className="cta-row">
              <button className="btn live cta" onClick={() => go(dir, 'practice')}>Start practice →</button>
            </div>
          </>
        )}
      </div>

      <div className="today-side">
        {exam && days !== undefined && (
          <div className="stat-row">
            <span className={`lead num${days <= 14 ? ' live' : ''}`}>{Math.max(0, days)}</span>
            <span>
              <div className="t">{days > 1 ? 'days until the exam' : days === 1 ? 'day until the exam' : days === 0 ? 'Exam today' : 'Exam finished'}</div>
              <div className="s">{exam.toLocaleString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}</div>
            </span>
            <span />
          </div>
        )}
        <button className="stat-row" onClick={() => go(dir, 'practice')}>
          <span className="lead"><Ring value={totalQ ? seen / totalQ : 0} size={34} stroke={2.5} /></span>
          <span>
            <div className="t">Practice questions</div>
            <div className="s">{seen} of {totalQ} seen · mixed across topics</div>
          </span>
          <span className="go">→</span>
        </button>
        <button className="stat-row" onClick={() => go(dir, 'wiki')}>
          <span className="lead"><Ring value={mastery} size={34} stroke={2.5} /></span>
          <span>
            <div className="t">{Math.round(mastery * 100)}% mastered</div>
            <div className="s">across {concepts.length} concepts</div>
          </span>
          <span className="go">→</span>
        </button>
      </div>
    </section>
  );
}
