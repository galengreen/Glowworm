// Side drawer: concepts and sources open beside what you're reading, so you never lose your place.
import { useEffect } from 'react';
import { useCourse } from '../render/context';
import { go } from '../state/router';
import { backDrawer, closeDrawer, useUi } from '../state/ui';
import { SourceBody } from './views/Source';
import { ConceptDrawer } from './views/Wiki';

export function Drawer() {
  const { course, dir } = useCourse();
  const { drawer } = useUi();
  const top = drawer.at(-1);

  useEffect(() => {
    if (!top) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeDrawer();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [top]);

  if (!top) return null;
  const page = top.kind === 'concept' ? course.wiki[top.id] : undefined;
  const doc = top.kind === 'source' ? course.sources[top.id] : undefined;

  return (
    <>
      <div className="scrim" onClick={closeDrawer} />
      <aside className="drawer" role="dialog" aria-label={page?.title ?? doc?.title ?? 'Details'}>
        <div className="drawer-head">
          {drawer.length > 1 && <button className="btn small ghost" onClick={backDrawer}>← Back</button>}
          <span className="spacer" />
          {top.kind === 'concept' && page && (
            <button className="btn small" onClick={() => { closeDrawer(); go(dir, 'wiki', page.id); }}>Open page</button>
          )}
          {top.kind === 'source' && doc && (
            <button className="btn small" onClick={() => { closeDrawer(); go(dir, 'source', doc.id, top.anchor); }}>Open source</button>
          )}
          <button className="btn small ghost" onClick={closeDrawer} aria-label="Close">Close <kbd>esc</kbd></button>
        </div>
        <div className="drawer-body" key={drawer.length}>
          {page && <ConceptDrawer page={page} />}
          {doc && <SourceBody doc={doc} anchor={top.kind === 'source' ? top.anchor : undefined} />}
          {!page && !doc && <p className="muted">Not found.</p>}
        </div>
      </aside>
    </>
  );
}
