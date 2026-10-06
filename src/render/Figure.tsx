// Hosts a widget: mounts it into an SVG stage, wires the kit API, and handles predict-first gating.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { WidgetApi, WidgetHandle } from '@kit';
import { widgets } from '../course/load';
import { setPrediction, useProgress } from '../state/progress';
import { prefersCalm, useSettings } from '../state/settings';
import { useCourse } from './context';

const injected = new Set<string>();

interface Props {
  widgetId: string;
  params?: Record<string, string>;
  caption?: ReactNode;
  predict?: string;
}

export function Figure({ widgetId, params = {}, caption, predict }: Props) {
  const { dir } = useCourse();
  const widget = widgets[dir]?.[widgetId];
  const svgRef = useRef<SVGSVGElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<WidgetHandle | void>(undefined);
  const [readout, setReadout] = useState('');
  const { calm } = useSettings();
  const progress = useProgress(dir);
  const predKey = `${widgetId}:${predict ?? ''}`;
  const predicted = predict ? progress.predictions[predKey] : undefined;
  const [draft, setDraft] = useState('');
  const paramsKey = JSON.stringify(params);
  // Predict first: the figure (and its readout) stay hidden until a prediction is locked in.
  const locked = !!predict && predicted === undefined;

  useEffect(() => {
    if (!widget?.css || injected.has(widget.id)) return;
    const style = document.createElement('style');
    style.dataset.widget = widget.id;
    style.textContent = widget.css;
    document.head.appendChild(style);
    injected.add(widget.id);
  }, [widget]);

  useEffect(() => {
    const stage = svgRef.current;
    const controls = controlsRef.current;
    if (!widget || !stage || !controls) return;
    const timeouts: number[] = [];
    const intervals: number[] = [];
    const loops: (() => void)[] = [];
    const api: WidgetApi = {
      readout: setReadout,
      report: (event, data) => console.debug(`[widget ${widget.id}]`, event, data ?? ''),
      flash: (el, ms = 160) => {
        if (!el) return;
        el.classList.add('down', 'lit');
        timeouts.push(window.setTimeout(() => el.classList.remove('down'), 110));
        timeouts.push(window.setTimeout(() => el.classList.remove('lit'), ms));
      },
      replay: (el, cls = 'go') => {
        if (!el) return;
        el.classList.remove(cls);
        void el.getBoundingClientRect();
        el.classList.add(cls);
      },
      after: (ms, fn) => void timeouts.push(window.setTimeout(fn, ms)),
      every: (ms, fn) => void intervals.push(window.setInterval(fn, ms)),
      loop: (fn) => {
        let alive = true;
        const f = (t: number) => {
          if (!alive) return;
          fn(t);
          requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
        const stop = () => void (alive = false);
        loops.push(stop);
        return stop;
      },
      calm: prefersCalm(),
      params: JSON.parse(paramsKey),
      controls,
    };
    handleRef.current = widget.mount(stage, api);
    return () => {
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      loops.forEach((s) => s());
      handleRef.current?.destroy?.();
      stage.innerHTML = '';
      controls.innerHTML = '';
    };
  }, [widget, paramsKey, calm]);

  if (!widget) {
    return (
      <div className="figure">
        <div className="fig-top"><span>Missing widget</span><span className="readout">{widgetId}</span></div>
      </div>
    );
  }

  return (
    <figure className="figure" data-widget={widget.id} data-block={`fig-${widget.id}`}>
      <div className="fig-top">
        <span className="name">{widget.name}</span>
        <span className="readout">{locked ? '' : readout}</span>
      </div>
      <div className="stage-holder" style={locked ? { visibility: 'hidden' } : undefined}>
        <svg
          ref={svgRef}
          className="stage"
          role="img"
          aria-label={widget.aria}
          tabIndex={0}
          onKeyDown={(e) => {
            if (handleRef.current?.key?.(e.nativeEvent)) e.preventDefault();
          }}
        />
      </div>
      <div className="controls" ref={controlsRef} style={locked ? { visibility: 'hidden' } : undefined} />
      <div className="fig-bottom">
        <span>{widget.hint}</span>
        {predicted !== undefined && <span>Your prediction: <span style={{ color: 'var(--ink-hi)' }}>“{predicted}”</span></span>}
      </div>
      {caption && <figcaption className="caption">{caption}</figcaption>}
      {locked && (
        <div className="predict">
          <div className="inner">
            <span className="label-sm">Predict first</span>
            <div className="q">{predict}</div>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type your prediction (optional)" />
            <button className="btn live" onClick={() => setPrediction(dir, predKey, draft.trim() || 'no prediction written')}>
              Lock in prediction
            </button>
          </div>
        </div>
      )}
    </figure>
  );
}
