// Browser loader: Vite bundles every course folder. Edits to course files hot-reload the player.
import type { Widget } from '@kit';
import { parseCourses, validateCourse } from './parse';
import type { Course, Issue } from './types';

const raw = import.meta.glob('/courses/*/**/*.{md,yaml,yml}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const widgetModules = import.meta.glob('/courses/*/widgets/*.ts', { eager: true }) as Record<string, { default: Widget }>;

/** courseDir -> widgetId -> widget */
export const widgets: Record<string, Record<string, Widget>> = {};
for (const [path, mod] of Object.entries(widgetModules)) {
  const dir = /^\/courses\/([^/]+)\//.exec(path)![1];
  (widgets[dir] ??= {})[mod.default.id] = mod.default;
}

const widgetIds = Object.fromEntries(Object.entries(widgets).map(([dir, w]) => [dir, Object.keys(w)]));
const parsed = parseCourses(raw, widgetIds);

export const courses: Course[] = parsed.courses;
export const issues: Issue[] = [...parsed.issues, ...parsed.courses.flatMap((c) => validateCourse(c))];

export const courseDir = (course: Course) => course.root.replace('/courses/', '');
const LAST = 'learnsmart:last-course';

/** The requested course, else the last one opened, else the first real (non-sample) course. */
export function findCourse(id: string | undefined) {
  const byId = (d: string | null | undefined) => courses.find((c) => courseDir(c) === d);
  const course = byId(id) ?? byId(localStorage.getItem(LAST)) ?? courses.find((c) => !c.meta.sample) ?? courses[0];
  if (course) localStorage.setItem(LAST, courseDir(course));
  return course;
}
