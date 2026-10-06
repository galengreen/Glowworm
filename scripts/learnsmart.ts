#!/usr/bin/env tsx
// learnsmart CLI: the agent's side of the loop.
//   pnpm learnsmart validate [course]        check structure, citations, coverage and design rules
//   pnpm learnsmart inbox [--all]            list open highlight requests from the player
//   pnpm learnsmart inbox show <id>          show one request with surrounding context
//   pnpm learnsmart inbox resolve <id> "reply"   mark a request done with a reply shown in the player
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseCourses, validateCourse, type FileMap } from '../src/course/parse';
import { listRequests, resolveRequest } from './inbox-store';

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
      const id = /\bid:\s*['"]([\w-]+)['"]/.exec(src)?.[1];
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

function inbox(args: string[]) {
  const [sub, id, ...rest] = args;
  if (sub === 'resolve') {
    if (!id || !rest.length) throw new Error('Usage: learnsmart inbox resolve <id> "reply"');
    const r = resolveRequest(id, rest.join(' '));
    console.log(`${orange('✓')} resolved ${r.id}`);
    return;
  }
  if (sub === 'show') {
    const r = listRequests().find((x) => x.id === id);
    if (!r) throw new Error(`No request ${id}`);
    console.log(JSON.stringify(r, null, 2));
    console.log(dim(`\nFile: courses/${r.course}/${r.file}  ·  block #${r.block}`));
    return;
  }
  const all = sub === '--all';
  const list = listRequests().filter((r) => all || r.status === 'open');
  if (!list.length) return console.log(dim('Inbox empty.'));
  for (const r of list) {
    console.log(`\n${r.status === 'open' ? orange('●') : dim('✓')} ${r.id}  ${r.intent.toUpperCase()}  ${dim(`courses/${r.course}/${r.file} #${r.block}`)}`);
    console.log(`  “${r.quote.exact}”`);
    if (r.note) console.log(dim(`  note: ${r.note}`));
    if (r.reply) console.log(dim(`  reply: ${r.reply}`));
  }
}

const [cmd, ...args] = process.argv.slice(2);
try {
  if (cmd === 'validate') validate(args[0]);
  else if (cmd === 'inbox') inbox(args);
  else console.log('Usage: learnsmart <validate [course] | inbox [--all | show <id> | resolve <id> "reply"]>');
} catch (e) {
  console.error(red((e as Error).message));
  process.exitCode = 1;
}
