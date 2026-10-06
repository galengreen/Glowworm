// Small shared display pieces.
import { useCourse } from '../render/context';
import { openDrawer } from '../state/ui';
export const pad = (n: number) => String(n).padStart(2, '0');

/** Line-art mastery ring: faint track, accent arc for progress. */
export function Ring({ value, size = 22, stroke = 2, children }: { value: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2 - 1;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-grid', placeItems: 'center', flex: 'none' }} aria-label={`${Math.round(v * 100)}% mastery`}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={1} />
        {v > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} style={{ filter: 'drop-shadow(0 0 3px var(--accent))' }} />
        )}
      </svg>
      {children}
    </span>
  );
}

/** One pip per lesson segment. */
export const Pips = ({ done, total }: { done: number; total: number }) => (
  <span className="pips" aria-label={`${done} of ${total} sections done`}>
    {Array.from({ length: total }, (_, i) => <i key={i} className={i < done ? 'on' : ''} />)}
  </span>
);

export const Bar = ({ value }: { value: number }) => (
  <div className="bar" aria-label={`${Math.round(value * 100)}%`}><i style={{ width: `${Math.round(value * 100)}%` }} /></div>
);

/** "Covers: A · B · C": the concepts something teaches, each opening in the drawer. */
export function Covers({ concepts, className = '' }: { concepts: string[]; className?: string }) {
  const { course } = useCourse();
  if (!concepts.length) return null;
  return (
    <p className={`covers ${className}`}>
      <span className="k">Covers</span>
      {concepts.map((c, i) => (
        <span key={c}>
          {i > 0 && <span className="sep"> · </span>}
          <button className="linkish" onClick={(e) => { e.stopPropagation(); openDrawer({ kind: 'concept', id: c }); }}>{course.wiki[c]?.title ?? c}</button>
        </span>
      ))}
    </p>
  );
}
