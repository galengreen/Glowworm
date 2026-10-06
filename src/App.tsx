import { useEffect, useRef, useState } from 'react';
import { DEFS } from '@kit';
import { courseDir, courses, findCourse } from './course/load';
import type { Course } from './course/types';
import { CourseContext } from './render/context';
import { lessonProgress, resetProgress, useProgress } from './state/progress';
import { go, href, useRoute, type Route } from './state/router';
import { ACCENTS, THEMES, settings, useSettings } from './state/settings';
import { closeDrawer, setPalette } from './state/ui';
import { CommandPalette } from './ui/CommandPalette';
import { Drawer } from './ui/Drawer';
import { Home } from './ui/views/Home';
import { Lesson } from './ui/views/Lesson';
import { Practice } from './ui/views/Practice';
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
    </CourseContext.Provider>
  );
}

function TopBar({ course, dir, route }: { course: Course; dir: string; route: Route }) {
  const p = useProgress(dir);
  const lesson = route.view === 'lesson' ? course.lessons[route.id ?? ''] : undefined;
  const lp = lesson ? lessonProgress(lesson, p) : undefined;

  const here: Record<Route['view'], string | undefined> = {
    home: undefined,
    lesson: lesson?.title,
    wiki: route.id ? course.wiki[route.id]?.title ?? 'Concept' : 'Concepts',
    source: course.sources[route.id ?? '']?.title ?? 'Source',
    practice: 'Practice',
  };

  return (
    <header className="topbar">
      <a className="brand" href={href(dir)}><span className="dot" />Glowworm</a>
      <nav className="crumbs" aria-label="Breadcrumb">
        <span className="sep">/</span>
        <CourseMenu current={dir} title={course.meta.title} />
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
      <button className={`chip${route.view === 'wiki' ? ' current' : ''}`} onClick={() => go(dir, 'wiki')} title="Every concept in the course (the wiki)">
        Concepts<span className="n dim">{Object.keys(course.wiki).length}</span>
      </button>
      <button className="chip" onClick={() => setPalette(true)} title="Search lessons and concepts">
        Search <kbd>⌘K</kbd>
      </button>
      <Settings dir={dir} />
      {lp && <span className="progress-line" style={{ width: `${(lp.passed / Math.max(1, lp.total)) * 100}%` }} />}
    </header>
  );
}

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  return { open, setOpen, ref };
}

function CourseMenu({ current, title }: { current: string; title: string }) {
  const { open, setOpen, ref } = usePopover();
  if (courses.length < 2) return <a href={href(current)}>{title}</a>;
  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button aria-expanded={open} onClick={() => setOpen((o) => !o)}>{title} ▾</button>
      {open && (
        <div className="popover" style={{ left: 0, right: 'auto', width: 340 }}>
          <span className="label-sm">Courses</span>
          {courses.map((c) => (
            <button key={c.root} className="linkish" style={{ justifySelf: 'start', textDecoration: courseDir(c) === current ? 'underline solid var(--accent)' : undefined }} onClick={() => { setOpen(false); go(courseDir(c)); }}>
              {c.meta.title}{c.meta.sample ? ' (sample)' : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Settings({ dir }: { dir: string }) {
  const s = useSettings();
  const { open, setOpen, ref } = usePopover();

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="chip" aria-expanded={open} onClick={() => setOpen((o) => !o)}>Settings</button>
      {open && (
        <div className="popover">
          <span className="label-sm">Theme</span>
          <div className="segmented" role="radiogroup" aria-label="Theme">
            {THEMES.map((t) => (
              <button key={t} role="radio" aria-checked={s.theme === t} onClick={() => settings.set({ ...s, theme: t })}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
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
      return lesson ? <Lesson key={lesson.id} lesson={lesson} focus={route.sub} /> : <Missing what="lesson" />;
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
