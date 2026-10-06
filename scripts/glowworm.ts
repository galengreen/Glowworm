#!/usr/bin/env tsx
// glowworm CLI: the agent's side of the loop.
//   pnpm glowworm validate [course]        check structure, citations, coverage and design rules
//   pnpm glowworm typecheck                typecheck widgets in the central course folder
//   pnpm glowworm import <folder>          copy a course folder into the central course folder
//   pnpm glowworm where                    show where courses live
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { parseCourses, validateCourse, type FileMap } from '../src/course/parse';
import { courseLocations, findCourse, GLOWWORM_HOME, HOME_COURSES, readCourses, REPO } from './paths.ts';

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const orange = (s: string) => `\x1b[38;5;208m${s}\x1b[0m`;

function load() {
  const { files, widgets } = readCourses();
  const widgetIds: Record<string, string[]> = {};
  const widgetSources: Record<string, Record<string, string>> = {};
  for (const w of widgets) {
    const src = readFileSync(w.path, 'utf8');
    const id = /defineWidget\(\s*\{\s*id:\s*['"]([\w-]+)['"]/.exec(src)?.[1];
    if (id) (widgetIds[w.dir] ??= []).push(id);
    (widgetSources[w.dir] ??= {})[w.key.replace(`/courses/${w.dir}/`, '')] = src;
  }
  return { ...parseCourses(files as FileMap, widgetIds), widgetSources };
}

function validate(only?: string) {
  const { courses, issues, widgetSources } = load();
  let errors = 0;
  for (const course of courses) {
    const dir = course.root.split('/')[2];
    if (only && dir !== only) continue;
    const all = [...issues.filter((i) => i.file.startsWith(course.root)), ...validateCourse(course, widgetSources[dir])];
    const q = Object.keys(course.questions).length;
    console.log(`\n${orange('●')} ${course.meta.title} ${dim(`(${findCourse(dir)?.path ?? dir})`)}`);
    console.log(dim(`  ${Object.keys(course.wiki).length} wiki pages · ${Object.keys(course.lessons).length} lessons · ${q} questions · ${course.widgetIds.length} widgets · ${Object.keys(course.sources).length} sources`));
    for (const i of all) {
      const tag = i.level === 'error' ? red('error') : yellow('warn ');
      console.log(`  ${tag} ${dim(i.file.replace(`${course.root}/`, ''))}  ${i.message}`);
    }
    const e = all.filter((i) => i.level === 'error').length;
    errors += e;
    if (!all.length) console.log(`  ${orange('✓')} all checks pass`);
    else console.log(dim(`  ${e} error(s), ${all.length - e} warning(s)`));
  }
  process.exitCode = errors ? 1 : 0;
}

/** Repo widgets are covered by tsconfig.json; central ones need a generated config that includes them. */
function typecheck() {
  if (!courseLocations().some((c) => !c.bundled)) return;
  const config = join(REPO, '.glowworm', 'tsconfig.courses.json');
  mkdirSync(join(REPO, '.glowworm'), { recursive: true });
  const rel = (p: string) => relative(join(REPO, '.glowworm'), p).split('\\').join('/');
  writeFileSync(config, JSON.stringify({ extends: '../tsconfig.json', include: [rel(join(REPO, 'src')), `${rel(HOME_COURSES)}/*/widgets/*.ts`] }, null, 2));
  execFileSync(join(REPO, 'node_modules', '.bin', 'tsc'), ['-p', config], { stdio: 'inherit' });
}

function importCourse(from?: string) {
  if (!from) throw new Error('Usage: glowworm import <course folder>');
  const src = resolve(from);
  if (!existsSync(join(src, 'course.yaml'))) throw new Error(`No course.yaml in ${src}`);
  const dest = join(HOME_COURSES, basename(src));
  if (existsSync(dest)) throw new Error(`${dest} already exists`);
  cpSync(src, dest, { recursive: true });
  console.log(`${orange('✓')} Copied to ${dest}`);
  console.log(dim(`  The original is untouched. Delete ${src} once you've checked the copy.`));
}

function where() {
  console.log(`Central courses: ${HOME_COURSES}${process.env.GLOWWORM_HOME ? dim(' (from GLOWWORM_HOME)') : dim(` (set GLOWWORM_HOME to move ${GLOWWORM_HOME})`)}`);
  for (const c of courseLocations()) console.log(`  ${c.dir}  ${dim(c.path)}${c.bundled ? dim(' (bundled)') : ''}`);
}

const [cmd, ...args] = process.argv.slice(2);
try {
  if (cmd === 'validate') validate(args[0]);
  else if (cmd === 'typecheck') typecheck();
  else if (cmd === 'import') importCourse(args[0]);
  else if (cmd === 'where') where();
  else console.log('Usage: glowworm validate [course] | typecheck | import <folder> | where');
} catch (e) {
  console.error(red((e as Error).message));
  process.exitCode = 1;
}
