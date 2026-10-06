// Where courses live. Real courses sit in one central folder (~/.glowworm/courses, or $GLOWWORM_HOME/courses)
// so every checkout and worktree sees the same ones; the repo's courses/ only holds the bundled sample.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative, resolve } from 'node:path';

export const REPO = process.cwd();
export const GLOWWORM_HOME = resolve(process.env.GLOWWORM_HOME?.replace(/^~(?=$|\/)/, homedir()) || join(homedir(), '.glowworm'));
export const HOME_COURSES = join(GLOWWORM_HOME, 'courses');
export const REPO_COURSES = join(REPO, 'courses');

export interface CourseLocation {
  dir: string; // folder name, also the course id in URLs and keys
  path: string; // absolute path
  bundled: boolean; // ships with the repo (the sample) rather than living in GLOWWORM_HOME
}

const hasCourse = (p: string) => existsSync(join(p, 'course.yaml'));
const subdirs = (p: string) => (existsSync(p) ? readdirSync(p).filter((d) => !d.startsWith('.') && statSync(join(p, d)).isDirectory()) : []);

/** Every course folder; a central course wins over a repo course with the same name. */
export function courseLocations(): CourseLocation[] {
  const central = subdirs(HOME_COURSES).filter((d) => hasCourse(join(HOME_COURSES, d)));
  const bundled = subdirs(REPO_COURSES).filter((d) => !central.includes(d));
  return [
    ...central.map((dir) => ({ dir, path: join(HOME_COURSES, dir), bundled: false })),
    ...bundled.map((dir) => ({ dir, path: join(REPO_COURSES, dir), bundled: true })),
  ];
}

export const findCourse = (dir: string) => courseLocations().find((c) => c.dir === dir);

/** Is this absolute path course content (not raw material) inside any course folder? */
export const isCourseFile = (p: string) =>
  [HOME_COURSES, REPO_COURSES].some((root) => {
    const rel = relative(root, p);
    return !rel.startsWith('..') && !rel.split(/[\\/]/).includes('materials');
  });

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    if (f === 'materials' || f.startsWith('.')) return []; // raw uploads; the agent converts them into sources/
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/**
 * Course files keyed as `/courses/<dir>/<file>`, whichever folder they really live in, so the parser
 * and the player don't care where a course is. Widgets are listed separately as absolute paths.
 */
export function readCourses() {
  const files: Record<string, string> = {};
  const widgets: { dir: string; key: string; path: string }[] = [];
  for (const loc of courseLocations()) {
    for (const abs of walk(loc.path)) {
      const key = `/courses/${loc.dir}/${relative(loc.path, abs).split('\\').join('/')}`;
      if (/\.(md|ya?ml)$/.test(abs)) files[key] = readFileSync(abs, 'utf8');
      if (/\/widgets\/[^/]+\.ts$/.test(key)) widgets.push({ dir: loc.dir, key, path: abs });
    }
  }
  return { files, widgets };
}
