// One widget on its own, for authors and `glowworm shot`: #/c/<course>/widget/<id>?param=value
import { widgets } from '../../course/load';
import { Figure } from '../../render/Figure';
import { useCourse } from '../../render/context';
import { pad } from '../bits';
import { go } from '../../state/router';
import { sourceItem, openDrawer, sourceLabel } from '../../state/ui';

export function WidgetPreview({ id, query }: { id?: string; query: URLSearchParams }) {
  const { course, dir } = useCourse();
  const all = Object.values(widgets[dir] ?? {});
  const widget = id ? widgets[dir]?.[id] : undefined;

  if (!widget) {
    return (
      <div className="page narrow">
        <div className="page-head">
          <span className="label-sm">Widgets</span>
          <h1>{id ? `No widget "${id}"` : 'Every widget'}</h1>
        </div>
        <div className="concept-list">
          {all.map((w, i) => (
            <button key={w.id} className="concept-item" onClick={() => go(dir, 'widget', w.id)}>
              <span className="num muted">{pad(i + 1)}</span>
              <span>
                <div className="t">{w.name}</div>
                <div className="s">{w.id}</div>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const params = Object.fromEntries(query.entries());
  return (
    <div className="page narrow">
      <div className="page-head">
        <span className="label-sm">Widget · {widget.id}</span>
        <h1>{widget.name}</h1>
        {!!widget.sources?.length && (
          <p className="lede" style={{ fontSize: 15 }}>
            Drawn from{' '}
            {widget.sources.map((s, i) => (
              <span key={s}>
                {i > 0 && ', '}
                <button className="linkish" onClick={() => openDrawer(sourceItem(s))}>{sourceLabel(course, s)}</button>
              </span>
            ))}
          </p>
        )}
      </div>
      <Figure key={query.toString()} widgetId={widget.id} params={params} />
    </div>
  );
}
