import { useMemo, useState } from 'react';
import type { Question } from '../../course/types';
import { useCourse } from '../../render/context';
import { dueQuestions, progress, useProgress } from '../../state/progress';
import { go } from '../../state/router';
import { Bar } from '../bits';
import { QuestionCard } from '../QuestionCard';

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface SessionProps {
  title: string;
  queue: Question[];
  mode: 'practice' | 'review';
  empty: { title: string; body: string };
}

/** A focused run through a queue of questions, one at a time, then a summary. */
function Session({ title, queue, mode, empty }: SessionProps) {
  const { dir } = useCourse();
  const [i, setI] = useState(0);
  const [started] = useState(() => Date.now());
  const p = useProgress(dir);
  const q = queue[i];

  const session = queue.map((x) => p.attempts[x.id]?.filter((a) => a.at >= started).at(-1)).filter((a) => a !== undefined);
  const score = session.reduce((s, a) => s + a.score, 0);
  const max = session.reduce((s, a) => s + a.max, 0);

  if (!queue.length) {
    return (
      <div className="session">
        <div className="empty-state">
          <span className="label-sm">{mode === 'review' ? 'Review' : 'Practice'}</span>
          <h2>{empty.title}</h2>
          <p>{empty.body}</p>
          <button className="btn" onClick={() => go(dir)}>Back to course</button>
        </div>
      </div>
    );
  }

  if (!q) {
    const pct = max ? Math.round((score / max) * 100) : 0;
    return (
      <div className="session">
        <div className="empty-state">
          <span className="label-sm">Session complete</span>
          <h2>{score}/{max} marks · {pct}%</h2>
          <p>{pct >= 80 ? 'Strong. These will come back for review just before you\'d forget them.' : 'The ones you missed will come back for review sooner. That\'s where the learning happens.'}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={() => setI(0)}>Go again</button>
            <button className="btn live" onClick={() => go(dir)}>Back to course</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="session">
      <div className="session-top">
        <div className="row">
          <h1>{title}</h1>
          <span className="label-sm">{i + 1} / {queue.length}{max ? ` · ${score}/${max}` : ''}</span>
        </div>
        <Bar value={i / queue.length} />
      </div>
      <QuestionCard key={q.id} q={q} mode={mode} keyboard onNext={() => setI((n) => n + 1)} />
      <div className="keys">
        {q.type === 'mcq' && <span><kbd>1</kbd>–<kbd>{q.choices.length}</kbd> choose</span>}
        <span><kbd>H</kbd> hint</span>
        <span><kbd>↵</kbd> next</span>
        <span><kbd>esc</kbd> close panels</span>
      </div>
    </div>
  );
}

export function Practice({ concepts }: { concepts?: string[] }) {
  const { course } = useCourse();
  const key = concepts?.join(',');
  // Interleaved: mixed across topics, shuffled once per visit.
  const queue = useMemo(
    () => shuffle(Object.values(course.questions).filter((q) => q.exam !== false && (!concepts?.length || concepts.includes(q.concept)))),
    [course, key],
  );
  const names = concepts?.map((c) => course.wiki[c]?.title ?? c).join(', ');
  return (
    <Session
      title={names ? `Practise: ${names}` : 'Mixed practice'}
      queue={queue}
      mode="practice"
      empty={{ title: 'No questions here yet', body: 'Ask your agent to add some: highlight a concept and choose “Quiz me”.' }}
    />
  );
}

export function Review() {
  const { course, dir } = useCourse();
  // Snapshot the due list when the view opens, so answering doesn't reshuffle the queue.
  const queue = useMemo(() => {
    const p = progress.get()[dir];
    return p ? dueQuestions(course, p).map((id) => course.questions[id]) : [];
  }, [course, dir]);
  const p = useProgress(dir);
  const upcoming = Object.values(p.cards).map((c) => c.due.getTime()).filter((t) => t > Date.now()).sort((a, b) => a - b)[0];
  return (
    <Session
      title="Review"
      queue={queue}
      mode="review"
      empty={{
        title: 'Nothing due',
        body: upcoming
          ? `Next review ${new Date(upcoming).toLocaleString('en-NZ', { weekday: 'long', hour: 'numeric', minute: '2-digit' })}. Questions come back just before you're likely to forget them.`
          : 'Answer some questions in a lesson first. They\'ll come back here, spaced out so they stick.',
      }}
    />
  );
}
