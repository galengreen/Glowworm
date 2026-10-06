// Browser loader: courses come from the central folder and the repo via scripts/courses-plugin.ts.
// Edits to course files reload the player.
import type { Widget } from '@kit';
import { files as raw, locations, widgetModules } from 'virtual:glowworm-courses';
import { parseCourses, validateCourse } from './parse';
import type { Course, Issue } from './types';

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
/** Absolute path of a course folder on disk. */
export const coursePath = (course: Course) => locations[courseDir(course)]?.path ?? course.root.slice(1);
const LAST = 'glowworm:last-course';

/** The requested course, else the last one opened, else the first real (non-sample) course. */
export function findCourse(id: string | undefined) {
  const byId = (d: string | null | undefined) => courses.find((c) => courseDir(c) === d);
  const course = byId(id) ?? byId(localStorage.getItem(LAST)) ?? courses.find((c) => !c.meta.sample) ?? courses[0];
  if (course) localStorage.setItem(LAST, courseDir(course));
  return course;
}
