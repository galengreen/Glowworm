import { useEffect, useRef, useState } from 'react';
import { DEFS } from '@kit';
import { courseDir, findCourse } from './course/load';
import type { Course } from './course/types';
import { CourseContext } from './render/context';
import { useInbox } from './state/inbox';
import { dueQuestions, lessonProgress, resetProgress, useProgress } from './state/progress';
import { go, href, useRoute, type Route } from './state/router';
import { ACCENTS, settings, useSettings } from './state/settings';
import { closeDrawer, setPalette } from './state/ui';
import { CommandPalette } from './ui/CommandPalette';
import { Drawer } from './ui/Drawer';
import { Highlighter } from './ui/Highlighter';
import { Home } from './ui/views/Home';
import { InboxView } from './ui/views/Inbox';
import { Lesson } from './ui/views/Lesson';
import { Practice, Review } from './ui/views/Practice';
import { SourceView } from './ui/views/Source';
import { WikiIndex, WikiPageView } from './ui/views/Wiki';

export function App() {
  const route = useRoute();
  const course = findCourse(route.course);

  useEffect(() => {
    if (course && !route.course) location.replace(href(courseDir(course)));
  }, [course, route.course]);

  // Navigating closes any open drawer.
  useEffect(() => closeDrawer(), [route]);

  if (!course) return <div className="page"><h1>No courses found in <code>courses/</code>.</h1></div>;
  const dir = courseDir(course);

  return (
    <CourseContext.Provider value={{ course, dir }}>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden dangerouslySetInnerHTML={{ __html: DEFS }} />
      <TopBar course={course} dir={dir} route={route} />
      <main>
        <View course={course} route={route} />
      </main>
      <Drawer />
      <CommandPalette />
      <Highlighter />
    </CourseContext.Provider>
  );
}

function TopBar({ course, dir, route }: { course: Course; dir: string; route: Route }) {
  const p = useProgress(dir);
  const due = dueQuestions(course, p).length;
  const open = useInbox().filter((r) => r.course === dir && r.status === 'open').length;
  const lesson = route.view === 'lesson' ? course.lessons[route.id ?? ''] : undefined;
  const lp = lesson ? lessonProgress(lesson, p) : undefined;

  const here: Record<Route['view'], string | undefined> = {
    home: undefined,
    lesson: lesson?.title,
    wiki: route.id ? course.wiki[route.id]?.title ?? 'Concept' : 'Concepts',
    source: course.sources[route.id ?? '']?.title ?? 'Source',
    practice: 'Practice',
    review: 'Review',
    inbox: 'Inbox',
  };

  return (
    <header className="topbar">
      <a className="brand" href={href(dir)}><span className="dot" />LearnSmart</a>
      <nav className="crumbs" aria-label="Breadcrumb">
        <span className="sep">/</span>
        <a href={href(dir)}>{course.meta.title}</a>
        {route.view === 'wiki' && route.id && (
          <>
            <span className="sep">/</span>
            <a href={href(dir, 'wiki')}>Concepts</a>
          </>
        )}
        {here[route.view] && (
          <>
            <span className="sep">/</span>
            <span className="here">{here[route.view]}</span>
          </>
        )}
      </nav>
      <span className="spacer" />
      <button className={`chip${due ? ' live' : ''}`} onClick={() => go(dir, 'review')} title="Questions due for spaced review">
        Review{due > 0 && <span className="n">{due}</span>}
      </button>
      <button className="chip" onClick={() => go(dir, 'inbox')} title="Requests sent to your agent">
        Inbox{open > 0 && <span className="n">{open}</span>}
      </button>
      <button className="chip" onClick={() => setPalette(true)} title="Search lessons and concepts">
        Search <kbd>⌘K</kbd>
      </button>
      <Settings dir={dir} />
      {lp && <span className="progress-line" style={{ width: `${(lp.passed / Math.max(1, lp.total)) * 100}%` }} />}
    </header>
  );
}

function Settings({ dir }: { dir: string }) {
  const s = useSettings();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="chip" aria-expanded={open} onClick={() => setOpen((o) => !o)}>Settings</button>
      {open && (
        <div className="popover">
          <span className="label-sm">Accent</span>
          <div className="swatches" role="radiogroup" aria-label="Accent colour">
            {ACCENTS.map((a, i) => (
              <button key={a.name} role="radio" aria-checked={s.accent === i} aria-label={a.name} title={a.name} style={{ ['--sw' as string]: a.accent }} onClick={() => settings.set({ ...s, accent: i })}>
                <i />
              </button>
            ))}
          </div>
          <hr />
          <label>
            Wide text spacing
            <input type="checkbox" checked={s.spacing === 'wide'} onChange={(e) => settings.set({ ...s, spacing: e.target.checked ? 'wide' : 'normal' })} />
          </label>
          <label>
            Calm mode (no motion)
            <input type="checkbox" checked={s.calm} onChange={(e) => settings.set({ ...s, calm: e.target.checked })} />
          </label>
          <hr />
          <button className="linkish" style={{ justifySelf: 'start', fontSize: 14 }} onClick={() => confirm('Reset all progress for this course?') && resetProgress(dir)}>
            Reset progress
          </button>
        </div>
      )}
    </div>
  );
}

function View({ course, route }: { course: Course; route: Route }) {
  switch (route.view) {
    case 'lesson': {
      const lesson = course.lessons[route.id ?? ''];
      return lesson ? <Lesson key={lesson.id} lesson={lesson} /> : <Missing what="lesson" />;
    }
    case 'wiki': {
      if (!route.id) return <WikiIndex />;
      const page = course.wiki[route.id];
      return page ? <WikiPageView key={page.id} page={page} /> : <Missing what="concept" />;
    }
    case 'source': {
      const doc = course.sources[route.id ?? ''];
      return doc ? <SourceView doc={doc} anchor={route.sub} /> : <Missing what="source" />;
    }
    case 'practice': {
      const concepts = route.query.get('concepts')?.split(',').filter(Boolean);
      return <Practice key={route.query.toString()} concepts={concepts} />;
    }
    case 'review':
      return <Review />;
    case 'inbox':
      return <InboxView />;
    default:
      return <Home />;
  }
}

function Missing({ what }: { what: string }) {
  return (
    <div className="page narrow">
      <div className="page-head"><span className="label-sm">Not found</span><h1>No such {what}</h1></div>
    </div>
  );
}
