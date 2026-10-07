#!/usr/bin/env tsx
// glowworm CLI: the agent's side of the loop.
//   pnpm glowworm validate [course]        check structure, citations, coverage and design rules
//   pnpm glowworm coverage <course>        each topic's source sections, who cites them, and its content at a glance
//   pnpm glowworm shot <course> <widget> [...]  screenshot a widget, press keys, and check its layout
//   pnpm glowworm typecheck                typecheck widgets in the central course folder
//   pnpm glowworm import <folder>          copy a course folder into the central course folder
//   pnpm glowworm where                    show where courses live
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { coverage, parseCourses, validateCourse, widgetMetaFromSource, type FileMap, type WidgetMap } from '../src/course/parse';
import { courseLocations, findCourse, GLOWWORM_HOME, HOME_COURSES, readCourses, REPO } from './paths.ts';

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const orange = (s: string) => `\x1b[38;5;208m${s}\x1b[0m`;

function load() {
  const { files, widgets } = readCourses();
  const widgetMap: WidgetMap = {};
  const widgetSources: Record<string, Record<string, string>> = {};
  for (const w of widgets) {
    const src = readFileSync(w.path, 'utf8');
    const meta = widgetMetaFromSource(src);
    if (meta) (widgetMap[w.dir] ??= []).push(meta);
    (widgetSources[w.dir] ??= {})[w.key.replace(`/courses/${w.dir}/`, '')] = src;
  }
  return { ...parseCourses(files as FileMap, widgetMap), widgetSources };
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

/** The lead's review view: what each topic covers, who cites it, and enough numbers to compare topics. */
function coverageReport(only?: string) {
  const course = load().courses.find((c) => c.root === `/courses/${only}`);
  if (!course) throw new Error(`Usage: glowworm coverage <course>  (courses: ${courseLocations().map((c) => c.dir).join(', ')})`);
  if (!course.outline) throw new Error(`${only} has no outline.yaml yet (see "Building from material" in AUTHORING.md)`);
  const report = coverage(course);
  const short = (f: string) => f.replace(/^(wiki|lessons)\//, '').replace(/\.md$/, '');
  for (const t of report.topics) {
    const topic = course.outline.topics.find((x) => x.id === t.topic)!;
    const qs = Object.values(course.questions).filter((q) => topic.concepts.includes(q.concept));
    const types = ['mcq', 'numeric', 'short'].map((k) => `${qs.filter((q) => q.type === k).length} ${k}`).join(' / ');
    const diagrams = topic.concepts.filter((c) => course.wiki[c]?.diagram).length;
    const built = topic.widgets.filter((w) => course.widgetIds.includes(w.id)).length;
    console.log(`\n${orange('●')} ${topic.title} ${dim(`(${t.topic})`)}`);
    console.log(dim(`  ${topic.concepts.length} concepts · ${diagrams} with diagrams · ${built} of ${topic.widgets.length} planned widgets built · ${qs.length} questions (${types})`));
    for (const s of t.sections) {
      const mark = s.citedBy.length ? orange('✓') : red('✗');
      console.log(`  ${mark} ${s.key} ${dim(s.title)}${s.citedBy.length ? dim(`  ← ${s.citedBy.map(short).join(', ')}`) : red('  not cited')}`);
    }
    for (const c of t.missingConcepts) console.log(`  ${red('✗')} concept ${c} ${red('has no wiki page')}`);
    for (const w of t.missingWidgets) console.log(`  ${red('✗')} widget ${w} ${red('not built yet')}`);
  }
  if (report.skipped.length) {
    console.log(`\n${dim('Skipped')}`);
    for (const s of report.skipped) console.log(`  ${dim('–')} ${s.src} ${dim(s.why)}`);
  }
  if (report.unassigned.length) {
    console.log(`\n${red('Left out')} ${dim('(add to a topic, or skip with a reason)')}`);
    for (const s of report.unassigned) console.log(`  ${red('✗')} ${s.key} ${dim(s.title)}`);
  }
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
  else if (cmd === 'coverage') coverageReport(args[0]);
  else if (cmd === 'shot') await import('./shot.ts').then((m) => m.shot(args));
  else if (cmd === 'typecheck') typecheck();
  else if (cmd === 'import') importCourse(args[0]);
  else if (cmd === 'where') where();
  else console.log('Usage: glowworm validate [course] | coverage <course> | shot <course> <widget> | typecheck | import <folder> | where');
} catch (e) {
  console.error(red((e as Error).message));
  process.exitCode = 1;
}
