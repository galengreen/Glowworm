// ⌘K / Ctrl+K / "/": jump to any lesson, concept or study mode.
import { useEffect, useMemo, useRef, useState } from 'react';
import { courseDir, courses } from '../course/load';
import { useCourse } from '../render/context';
import { go } from '../state/router';
import { openDrawer, setPalette, useUi } from '../state/ui';

interface Item {
  label: string;
  kind: string;
  run: () => void;
}

export function CommandPalette() {
  const { course, dir } = useCourse();
  const { palette } = useUi();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as Element)?.closest?.('input, textarea, [contenteditable]');
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (palette) {
      setQ('');
      setSel(0);
      setTimeout(() => input.current?.focus(), 0);
    }
  }, [palette]);

  const items = useMemo<Item[]>(() => {
    const order = course.meta.levels.flatMap((l) => l.lessons).filter((id) => course.lessons[id]);
    return [
      { label: 'Home', kind: 'Go', run: () => go(dir) },
      { label: 'Mixed practice', kind: 'Study', run: () => go(dir, 'practice') },
      { label: 'All concepts', kind: 'Go', run: () => go(dir, 'wiki') },
      { label: 'Add material', kind: 'Build', run: () => go(dir, 'materials') },
      { label: 'Every widget', kind: 'Build', run: () => go(dir, 'widget') },
      ...courses.filter((c) => courseDir(c) !== dir).map((c) => ({ label: `Switch to ${c.meta.title}`, kind: 'Course', run: () => go(courseDir(c)) })),
      ...order.map((id, i) => ({ label: `${i + 1}. ${course.lessons[id].title}`, kind: 'Lesson', run: () => go(dir, 'lesson', id) })),
      ...Object.values(course.wiki).map((w) => ({ label: w.title, kind: 'Concept', run: () => openDrawer({ kind: 'concept', id: w.id }) })),
      ...Object.values(course.wiki).map((w) => ({ label: `Practise: ${w.title}`, kind: 'Quiz', run: () => go(dir, 'practice', undefined, undefined, { concepts: w.id }) })),
    ];
  }, [course, dir]);

  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = items.filter((i) => words.every((w) => `${i.label} ${i.kind}`.toLowerCase().includes(w))).slice(0, 12);

  if (!palette) return null;
  const run = (i: Item | undefined) => {
    if (!i) return;
    setPalette(false);
    i.run();
  };

  return (
    <>
      <div className="scrim" style={{ zIndex: 50 }} onClick={() => setPalette(false)} />
      <div className="palette" role="dialog" aria-label="Command palette">
        <input
          ref={input}
          value={q}
          placeholder="Jump to a lesson, concept or mode…"
          onChange={(e) => { setQ(e.target.value); setSel(0); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setPalette(false);
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, shown.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
            if (e.key === 'Enter') run(shown[sel]);
          }}
        />
        {shown.length ? (
          <ul role="listbox">
            {shown.map((i, n) => (
              <li key={`${i.kind}-${i.label}`} role="option" aria-selected={n === sel} onMouseEnter={() => setSel(n)} onClick={() => run(i)}>
                {i.label}
                <span className="kind">{i.kind}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="none">No matches.</div>
        )}
      </div>
    </>
  );
}
