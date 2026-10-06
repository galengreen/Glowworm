import { useMemo, useState } from 'react';
import type { Question } from '../../course/types';
import { useCourse } from '../../render/context';
import { useProgress } from '../../state/progress';
import { go } from '../../state/router';
import { Bar } from '../bits';
import { QuestionCard } from '../QuestionCard';
import { Boundary } from '../Boundary';

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
  empty: { title: string; body: string };
}

/** A focused run through a queue of questions, one at a time, then a summary. */
function Session({ title, queue, empty }: SessionProps) {
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
          <span className="label-sm">Practice</span>
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
          <p>{pct >= 80 ? 'Strong. Come back in a few days and go again to lock it in.' : 'Go again on the ones you missed. Getting things wrong and retrying is where the learning happens.'}</p>
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
      <Boundary key={q.id} label={`question "${q.id}"`}>
        <QuestionCard q={q} mode="practice" keyboard onNext={() => setI((n) => n + 1)} />
      </Boundary>
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
      empty={{ title: 'No questions here yet', body: 'Ask your agent to add questions that cite these concepts.' }}
    />
  );
}

