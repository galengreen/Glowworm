import { useEffect, useRef, useState } from 'react';
import type { Question, ShortQuestion } from '../course/types';
import { markMcq, markNumeric, shortMarker, shortMax, type MarkResult } from '../marking';
import { useCourse } from '../render/context';
import { Md } from '../render/Md';
import { recordAttempt, useProgress } from '../state/progress';
import { openDrawer, sourceItem, sourceLabel } from '../state/ui';

interface Props {
  q: Question;
  mode: 'recall' | 'practice';
  onNext?: () => void;
  /** Session shortcuts: 1–4 choose, H hint, Enter next. Only one card on screen should have this. */
  keyboard?: boolean;
}

const TYPE_LABEL = { mcq: 'Multiple choice', numeric: 'Numeric', short: 'Written answer' };
const KEYS = 'ABCDEFGH';

/** Stable per-question shuffle, so the answer position can't be learned. */
function choiceOrder(id: string, n: number) {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function QuestionCard({ q, mode, onNext, keyboard }: Props) {
  const { course, dir } = useCourse();
  const progress = useProgress(dir);
  const [hints, setHints] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<MarkResult | null>(null);
  const [selfMarking, setSelfMarking] = useState(false);
  const [ticks, setTicks] = useState<boolean[]>([]);
  const attempts = progress.attempts[q.id]?.length ?? 0;
  const concept = course.wiki[q.concept];
  const order = q.type === 'mcq' ? choiceOrder(q.id, q.choices.length) : [];
  const field = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const finish = (r: MarkResult) => {
    setResult(r);
    recordAttempt(dir, q.id, r.score, r.max, hints);
  };

  const reset = () => {
    setHints(0);
    setChoice(null);
    setInput('');
    setResult(null);
    setSelfMarking(false);
    setTicks([]);
  };

  async function submitShort(sq: ShortQuestion) {
    if (shortMarker) {
      finish(await shortMarker.mark(sq, input));
    } else {
      setTicks(sq.markScheme.map(() => false));
      setSelfMarking(true);
    }
  }

  const pick = (i: number) => {
    if (result || q.type !== 'mcq') return;
    setChoice(i);
    finish(markMcq(q, i));
  };

  // Focus the answer field when a session card appears.
  useEffect(() => {
    if (keyboard && q.type !== 'mcq') field.current?.focus();
  }, [keyboard, q.id, q.type]);

  // Session keyboard shortcuts.
  useEffect(() => {
    if (!keyboard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const typing = (e.target as Element)?.closest?.('input, textarea');
      if (result && e.key === 'Enter' && onNext) {
        e.preventDefault();
        onNext();
      } else if (!typing && q.type === 'mcq' && /^[1-8]$/.test(e.key) && Number(e.key) <= q.choices.length) {
        pick(order[Number(e.key) - 1]);
      } else if (!typing && !result && e.key.toLowerCase() === 'h') {
        setHints((n) => Math.min(n + 1, q.hints.length));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const ratio = result ? (result.max ? result.score / result.max : 0) : 0;
  const verdict = !result ? null : ratio >= 1 ? 'ok' : ratio > 0 ? 'part' : 'miss';
  const markTotal = q.type === 'short' ? q.markScheme.reduce((s, p, i) => s + (ticks[i] ? p.marks : 0), 0) : 0;

  return (
    <div className="question" data-block={q.id} data-file={q.file}>
      <div className="q-head label-sm">
        <span><span className="tag">{mode === 'recall' ? 'Check yourself' : 'Practice'}</span> · {TYPE_LABEL[q.type]}</span>
        <span>{attempts ? `${attempts} attempt${attempts > 1 ? 's' : ''}` : 'New'}</span>
      </div>
      <div className="prompt"><Md source={q.prompt} className="" /></div>

      {q.type === 'mcq' && (
        <div className="choices" role="group">
          {order.map((i, pos) => {
            const state = result ? (i === q.answer ? 'correct' : i === choice ? 'wrong' : '') : '';
            return (
              <button key={i} className={`choice ${state}`} aria-pressed={choice === i} disabled={!!result} onClick={() => pick(i)}>
                <span className="k">{keyboard ? pos + 1 : KEYS[pos]}</span>
                <span><Md source={q.choices[i]} className="" /></span>
              </button>
            );
          })}
        </div>
      )}

      {q.type === 'numeric' && (
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (!result && input.trim()) finish(markNumeric(q, input)); }}>
          <input ref={field} className="field" inputMode="decimal" value={input} disabled={!!result} onChange={(e) => setInput(e.target.value)} placeholder="Your answer" aria-label="Your answer" />
          {q.unit && <span>{q.unit}</span>}
          <button className="btn primary" disabled={!!result || !input.trim()}>Check</button>
        </form>
      )}

      {q.type === 'short' && !selfMarking && !result && (
        <>
          <textarea ref={field} className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Write your answer in your own words…" />
          <div className="row"><button className="btn primary" disabled={!input.trim()} onClick={() => submitShort(q)}>Submit</button></div>
        </>
      )}

      {q.type === 'short' && selfMarking && !result && (
        <>
          <div className="model"><span className="label-sm">Your answer</span><p>{input}</p></div>
          <span className="label-sm">Tick each point your answer makes</span>
          <div className="scheme">
            {q.markScheme.map((p, i) => (
              <label key={i} className={ticks[i] ? 'on' : ''}>
                <input type="checkbox" checked={!!ticks[i]} onChange={(e) => setTicks((t) => t.map((v, j) => (j === i ? e.target.checked : v)))} />
                <span>{p.point} <span className="muted">({p.marks} mark{p.marks > 1 ? 's' : ''})</span></span>
              </label>
            ))}
          </div>
          <div className="row">
            <button className="btn primary" onClick={() => finish({ score: markTotal, max: shortMax(q), points: ticks.map((awarded) => ({ awarded })) })}>
              Record {markTotal}/{shortMax(q)}
            </button>
          </div>
        </>
      )}

      {!result && q.hints.length > 0 && (
        <>
          {q.hints.slice(0, hints).map((h, i) => <div className="hint" key={i}><Md source={h} className="" /></div>)}
          {hints < q.hints.length && (
            <div className="row">
              <button className="btn small ghost" onClick={() => setHints((n) => n + 1)}>
                {hints ? 'Another hint' : 'Show a hint'} {keyboard && <kbd>H</kbd>}
              </button>
            </div>
          )}
        </>
      )}

      {result && (
        <>
          <div className={`result ${verdict}`}>
            <span className="icon">{verdict === 'ok' ? '✓' : verdict === 'part' ? '◐' : '✕'}</span>
            <div>
              <strong>
                {verdict === 'ok' ? 'Correct' : verdict === 'part' ? `Partly there: ${result.score}/${result.max}` : q.type === 'numeric' ? `Not quite. The answer is ${q.answer}${q.unit ? ` ${q.unit}` : ''}` : 'Not quite'}
              </strong>
              {q.explain && <Md source={q.explain} className="" />}
            </div>
          </div>
          {q.type === 'short' && (
            <>
              <div className="scheme">
                {q.markScheme.map((p, i) => {
                  const got = result.points?.[i]?.awarded;
                  return (
                    <label key={i} className={got ? 'on' : ''} style={{ cursor: 'default' }}>
                      <span style={{ fontFamily: 'var(--mono)', color: got ? 'var(--accent-hi)' : 'var(--miss)' }}>{got ? '✓' : '✕'}</span>
                      <span>{p.point}<span className="fb">{p.feedback}</span></span>
                    </label>
                  );
                })}
              </div>
              {q.model && <div className="model"><span className="label-sm">Model answer</span><Md source={q.model} className="" /></div>}
            </>
          )}
          <div className="q-foot">
            <div className="links">
              {concept && <button className="linkish" onClick={() => openDrawer({ kind: 'concept', id: concept.id })}>Read more: {concept.title}</button>}
              {concept?.sources.map((s) => <button key={s} className="cite" onClick={() => openDrawer(sourceItem(s))}>{sourceLabel(course, s)}</button>)}
            </div>
            <div className="row">
              {mode === 'recall' && <button className="btn small ghost" onClick={reset}>Try again</button>}
              {onNext && <button className="btn live" onClick={onNext}>Next {keyboard && <kbd>↵</kbd>}</button>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
