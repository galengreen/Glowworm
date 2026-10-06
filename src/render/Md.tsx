import { Children, useEffect, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { openDrawer, sourceItem } from '../state/ui';
import { QuestionCard } from '../ui/QuestionCard';
import { useCourse } from './context';
import { Figure } from './Figure';
import { remarkGlowworm } from './remarkGlowworm';

type P = Record<string, string | undefined> & { children?: ReactNode };

function Callout({ type = 'note', title, children }: P) {
  const label = title ?? ({ key: 'Key idea', note: 'Note', why: 'Why it matters', exam: 'Exam tip' } as Record<string, string>)[type] ?? type;
  return (
    <div className={`callout ${type}`}>
      <span className="k">{label}</span>
      {children}
    </div>
  );
}

function Concept({ id = '', children }: P) {
  const { course } = useCourse();
  const [hover, setHover] = useState(false);
  const page = course.wiki[id];
  const open = () => {
    setHover(false);
    openDrawer({ kind: 'concept', id });
  };
  return (
    <span
      className="concept"
      role="link"
      tabIndex={0}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onClick={open}
      onKeyDown={(e) => e.key === 'Enter' && open()}
    >
      {children}
      {hover && page && (
        <span className="concept-card">
          <b>{page.title}</b>
          {page.summary}
          <span className="muted">Click to open</span>
        </span>
      )}
    </span>
  );
}

function Cite({ src = '', children }: P) {
  const { course } = useCourse();
  const [doc] = src.split('#');
  const label = children ?? course.sources[doc]?.title ?? doc;
  return (
    <button className="cite" onClick={() => openDrawer(sourceItem(src))} title={`Source: ${course.sources[doc]?.title ?? doc}`}>
      {label}
    </button>
  );
}

function FigureDirective({ widget = '', predict, caption, children, ...rest }: P) {
  const params = Object.fromEntries(Object.entries(rest).filter(([k, v]) => k !== 'node' && typeof v === 'string')) as Record<string, string>;
  const body = children && Children.count(children) ? children : caption;
  return <Figure widgetId={widget} params={params} predict={predict} caption={body} />;
}

function Recall({ q = '' }: P) {
  const { course } = useCourse();
  const question = course.questions[q];
  if (!question) return <div className="question">Missing question “{q}”</div>;
  return <QuestionCard q={question} mode="recall" />;
}

/** Reveals list items one at a time, so worked examples and processes build up step by step. */
function Steps({ children }: P) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(1);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    const items = ref.current?.querySelectorAll(':scope > ol > li, :scope > ul > li') ?? [];
    setTotal(items.length);
    items.forEach((li, i) => ((li as HTMLElement).style.display = i < shown ? '' : 'none'));
  }, [shown, children]);
  return (
    <div className="callout steps" ref={ref}>
      <span className="k">Step {Math.min(shown, total)} of {total}</span>
      {children}
      <div className="row">
        <button className="btn small" disabled={shown >= total} onClick={() => setShown((s) => s + 1)}>Next step →</button>
        <button className="btn small" disabled={shown >= total} onClick={() => setShown(total)}>Show all</button>
      </div>
    </div>
  );
}

const components = {
  'ls-callout': Callout,
  'ls-concept': Concept,
  'ls-cite': Cite,
  'ls-figure': FigureDirective,
  'ls-recall': Recall,
  'ls-steps': Steps,
} as unknown as Components;

export function Md({ source, className = 'prose' }: { source: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkDirective, remarkGlowworm]}
        rehypePlugins={[rehypeKatex, rehypeSlug]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
