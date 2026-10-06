import { useEffect, useRef } from 'react';
import type { SourceDoc } from '../../course/types';
import { Md } from '../../render/Md';

/** Source material, scrolled to the cited heading so the claim can be checked. */
export function SourceBody({ doc, anchor }: { doc: SourceDoc; anchor?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anchor) return;
    const el = ref.current?.querySelector<HTMLElement>(`#${CSS.escape(anchor)}`);
    if (!el) return;
    el.scrollIntoView({ block: 'start' });
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }, [anchor, doc.id]);

  return (
    <div data-block={`source-${doc.id}`} data-file={doc.file}>
      <span className="label-sm">Source · {doc.file}</span>
      <div className="source-body" ref={ref}>
        <Md source={doc.body} />
      </div>
    </div>
  );
}

export const SourceView = ({ doc, anchor }: { doc: SourceDoc; anchor?: string }) => (
  <div className="page narrow"><SourceBody doc={doc} anchor={anchor} /></div>
);
