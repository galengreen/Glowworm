// The prompt the player hands to the user's agent to turn new material into course content.
// The process itself lives in AUTHORING.md ("Building from material"); this only says what's new and where.
import type { Material } from '../../scripts/dev-api';
import type { Course } from './types';

/** `root` is the course folder on disk; the agent runs in the Glowworm repo with write access to it. */
export function buildPrompt(course: Course, dir: string, root: string, files: Material[], note: string) {
  const fresh = files.filter((f) => !f.converted);
  const built = Object.keys(course.lessons).length > 0;
  const lines = [
    `You're the lead for the Glowworm course in \`${root}/\` ("${course.meta.title}"). Write course files in that folder, even though it may be outside this repo. Use New Zealand English.`,
    '',
    'Read AUTHORING.md first, and follow its "Building from material" process exactly: plan every source section into topics, and the widgets to build, in `outline.yaml`; start a widget builder subagent per widget (following WIDGETS.md) and a writer subagent per topic, all in parallel with the same briefs; review each topic against its source sections and send revisions until it meets the quality bar, then do a consistency pass across all topics. Nothing in the sources may be left out unless it\'s skipped with a reason, and the wiki and lessons must be at least as complete and rigorous as the sources.',
    '',
  ];

  if (fresh.length) {
    lines.push(
      `New material in \`${root}/materials/\` to convert into \`sources/\` first:`,
      ...fresh.map((f) => `- ${f.name}`),
      '',
      built
        ? 'The course already has content. Assign the new sections in `outline.yaml` (to existing topics or new ones), and only rebuild and review the affected topics, then run the consistency pass.'
        : 'The course has no content yet, so plan the whole outline from the sources.',
    );
  } else if (!course.outline) {
    lines.push('All material is already in `sources/`, but the course has no `outline.yaml`. Write it from the sources, then fill whatever the coverage check shows is missing or below the bar, topic by topic.');
  } else {
    lines.push('All material is already in `sources/`. Review every topic against the quality bar, send writers to fix what falls short, then run the consistency pass.');
  }

  lines.push(
    '',
    `Run the CLI from this repo: \`pnpm glowworm validate ${dir}\` and \`pnpm glowworm coverage ${dir}\`, plus \`pnpm typecheck\` if there are new widgets (\`@kit\` resolves to this repo's src/kit). Finish with a short report: what's covered, what was skipped and why, and anything the sources didn't explain well enough to teach.`,
  );
  if (note.trim()) lines.push('', 'Notes from the student:', note.trim());
  return lines.join('\n');
}
