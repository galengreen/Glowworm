// Select any text → send it to the agent inbox with an intent, or copy it as a reference.
import { useEffect, useRef, useState } from 'react';
import { useCourse } from '../render/context';
import { INTENTS, sendRequest, type Intent } from '../state/inbox';

interface Selection {
  exact: string;
  prefix: string;
  suffix: string;
  block: string;
  file: string;
  locked: boolean;
  x: number;
  y: number;
}

function capture(): Selection | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const exact = sel.toString().trim();
  if (exact.length < 2) return null;
  const node = range.commonAncestorContainer;
  const el = node instanceof Element ? node : node.parentElement;
  if (!el || el.closest('input, textarea, .hl-bar')) return null;
  const container = el.closest<HTMLElement>('[data-block]');
  const fileEl = el.closest<HTMLElement>('[data-file]');
  if (!container || !fileEl) return null;

  // Text either side of the quote, so the request still finds its place if the content moves.
  const before = document.createRange();
  before.selectNodeContents(container);
  before.setEnd(range.startContainer, range.startOffset);
  const text = container.textContent ?? '';
  const start = before.toString().length;
  const rect = range.getBoundingClientRect();
  return {
    exact,
    prefix: text.slice(Math.max(0, start - 48), start),
    suffix: text.slice(start + sel.toString().length, start + sel.toString().length + 48),
    block: container.dataset.block!,
    file: fileEl.dataset.file!,
    // Unanswered questions: no "explain"/"example", so hints still come before answers.
    locked: !!el.closest('[data-locked="true"]'),
    x: Math.min(Math.max(12, rect.left), window.innerWidth - 300),
    y: rect.bottom + 10 > window.innerHeight - 160 ? Math.max(12, rect.top - 170) : rect.bottom + 10,
  };
}

export function Highlighter() {
  const { course, dir } = useCourse();
  const [sel, setSel] = useState<Selection | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState('');
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onUp = (e: MouseEvent) => {
      if (bar.current?.contains(e.target as Node)) return;
      setTimeout(() => {
        const s = capture();
        setSel(s);
        setIntent(null);
        setNote('');
      }, 0);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSel(null);
    const onScroll = () => setSel(null);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const send = async () => {
    if (!sel || !intent) return;
    try {
      await sendRequest({ course: dir, file: sel.file, block: sel.block, quote: { exact: sel.exact, prefix: sel.prefix, suffix: sel.suffix }, intent, note: note.trim() });
      setToast('Sent to inbox');
    } catch {
      setToast('Inbox unavailable: is the dev server running?');
    }
    setSel(null);
    window.getSelection()?.removeAllRanges();
  };

  const copy = async () => {
    if (!sel) return;
    await navigator.clipboard.writeText(`> ${sel.exact}\n\n— ${course.root.slice(1)}/${sel.file} #${sel.block}`);
    setToast('Reference copied');
    setSel(null);
  };

  return (
    <>
      {sel && (
        <div className="hl-bar" ref={bar} style={{ left: sel.x, top: sel.y }} role="dialog" aria-label="Send selection to agent">
          <div className="row">
            {INTENTS.map((i) => {
              const disabled = sel.locked && (i.id === 'explain' || i.id === 'example');
              return (
                <button
                  key={i.id}
                  className={`btn${intent === i.id ? ' live' : ''}`}
                  title={disabled ? 'Answer the question first' : i.hint}
                  disabled={disabled}
                  onClick={() => setIntent(i.id)}
                >
                  {i.label}
                </button>
              );
            })}
            <button className="btn" onClick={copy} title="Copy as a reference to paste into an agent chat">Copy ref</button>
          </div>
          {intent && (
            <>
              <textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder={INTENTS.find((i) => i.id === intent)?.hint} onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && send()} />
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="label-sm">{sel.block}</span>
                <button className="btn live" onClick={send}>Send to inbox</button>
              </div>
            </>
          )}
        </div>
      )}
      {toast && <div className="toast"><span className="dot" />{toast}</div>}
    </>
  );
}
