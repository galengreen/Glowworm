#!/usr/bin/env tsx
// glowworm CLI: the agent's side of the loop.
//   pnpm glowworm validate [course]        check structure, citations, coverage and design rules
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseCourses, validateCourse, type FileMap } from '../src/course/parse';

const ROOT = process.cwd();
const COURSES = join(ROOT, 'courses');
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const orange = (s: string) => `\x1b[38;5;208m${s}\x1b[0m`;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function load() {
  const files: FileMap = {};
  const widgetIds: Record<string, string[]> = {};
  const widgetSources: Record<string, Record<string, string>> = {};
  for (const abs of walk(COURSES)) {
    const rel = '/' + relative(ROOT, abs).split('\\').join('/');
    const dir = rel.split('/')[2];
    if (/\.(md|ya?ml)$/.test(abs)) files[rel] = readFileSync(abs, 'utf8');
    if (/\/widgets\/[^/]+\.ts$/.test(rel)) {
      const src = readFileSync(abs, 'utf8');
      const id = /defineWidget\(\s*\{\s*id:\s*['"]([\w-]+)['"]/.exec(src)?.[1];
      if (id) (widgetIds[dir] ??= []).push(id);
      (widgetSources[dir] ??= {})[rel.replace(`/courses/${dir}/`, '')] = src;
    }
  }
  return { ...parseCourses(files, widgetIds), widgetSources };
}

function validate(only?: string) {
  const { courses, issues, widgetSources } = load();
  let errors = 0;
  for (const course of courses) {
    const dir = course.root.split('/')[2];
    if (only && dir !== only) continue;
    const all = [...issues.filter((i) => i.file.startsWith(course.root)), ...validateCourse(course, widgetSources[dir])];
    const q = Object.keys(course.questions).length;
    console.log(`\n${orange('●')} ${course.meta.title} ${dim(`(${dir})`)}`);
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

const [cmd, ...args] = process.argv.slice(2);
try {
  if (cmd === 'validate') validate(args[0]);
  else console.log('Usage: glowworm validate [course]');
} catch (e) {
  console.error(red((e as Error).message));
  process.exitCode = 1;
}
