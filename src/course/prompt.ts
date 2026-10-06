// The prompt the player hands to the user's agent to turn new material into course content.
import type { Material } from '../../scripts/dev-api';
import type { Course } from './types';

/** `root` is the course folder on disk; the agent runs in the Glowworm repo with write access to it. */
export function buildPrompt(course: Course, dir: string, root: string, files: Material[], note: string) {
  const fresh = files.filter((f) => !f.converted);
  const lessons = Object.keys(course.lessons).length;
  const lines = [
    `You're building the Glowworm course in \`${root}/\` ("${course.meta.title}"). Write course files in that folder, even though it may be outside this repo. Follow AUTHORING.md exactly; PRODUCT.md explains the why. Use New Zealand English.`,
    '',
  ];

  if (fresh.length) {
    lines.push(
      `New material in \`${root}/materials/\` that isn't in \`sources/\` yet:`,
      ...fresh.map((f) => `- ${f.name}`),
      '',
      '1. Convert each file to Markdown at `sources/<same name>.md` (e.g. `materials/week-3.pdf` → `sources/week-3.md`). Transcribe, don\'t summarise: keep the wording, maths, tables and code. Start with a `# Title` heading, then one heading per slide, page or section, with the slide or page number in the heading (e.g. `## Slide 12: Backpropagation`) so citations can point at it. Describe diagrams in words. Never edit `materials/` or existing sources.',
      lessons
        ? '2. Work out the learning objectives the new sources cover and where they fit in the existing levels in `course.yaml`. Add new levels or lessons rather than renaming existing ids.'
        : '2. Work out the learning objectives across all the sources, then plan the levels in `course.yaml` from the prerequisite order of the concepts.',
      '3. Write or update wiki pages (one concept each, every claim cited), then lessons, widgets and questions (3+ per concept). If the material includes past papers, calibrate exam-style questions against them.',
    );
  } else {
    lines.push(
      'Everything in `materials/` is already in `sources/`. Check the course against its sources and fill the gaps:',
      '',
      '1. Every topic in `sources/` should have a wiki page, be taught in a lesson, and have 3+ questions.',
      '2. Add missing standard diagrams and widgets wherever a concept has a knob.',
      '3. If past papers are in the sources, check the questions are calibrated against them.',
    );
  }

  lines.push(
    `4. From this repo, run \`pnpm glowworm validate ${dir}\` until there are no errors, and \`pnpm typecheck\` if you added widgets (\`@kit\` resolves to this repo's src/kit).`,
    '5. Finish with a short summary: what you added, and anything the sources didn\'t cover well enough to teach.',
  );
  if (note.trim()) lines.push('', 'Notes from the student:', note.trim());
  return lines.join('\n');
}
