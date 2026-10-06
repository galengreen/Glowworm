import { useCourse } from '../../render/context';
import { INTENTS, useInbox } from '../../state/inbox';

export function InboxView() {
  const { dir } = useCourse();
  const items = useInbox().filter((r) => r.course === dir).reverse();
  const label = (id: string) => INTENTS.find((i) => i.id === id)?.label ?? id;
  return (
    <div className="page narrow">
      <div className="page-head">
        <span className="label-sm">Agent inbox</span>
        <h1>Inbox</h1>
        <p className="lede">
          Highlight any text and send it here. Your agent works through open requests with <code>pnpm learnsmart inbox</code> and replies when it's done.
        </p>
      </div>
      {!items.length && <p className="muted">Nothing here yet. Select some text in a lesson to try it.</p>}
      {items.map((r) => (
        <div key={r.id} className="inbox-item">
          <div className="row">
            <span><span className={r.status === 'open' ? 'status-open' : ''}>{r.status === 'open' ? '● Open' : '✓ Done'}</span> · {label(r.intent)}</span>
            <span className="num">{r.file} #{r.block}</span>
          </div>
          <blockquote>{r.quote.exact}</blockquote>
          {r.note && <div className="reply"><span className="label-sm">Your note</span> {r.note}</div>}
          {r.reply && <div className="reply"><span className="label-sm" style={{ color: 'var(--accent-hi)' }}>Agent</span> {r.reply}</div>}
        </div>
      ))}
    </div>
  );
}
