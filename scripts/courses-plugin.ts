// Serves every course to the player as `virtual:glowworm-courses`, from the central folder and the repo,
// and reloads the player when course content changes in either.
import { mkdirSync } from 'node:fs';
import { searchForWorkspaceRoot, type Plugin } from 'vite';
import { courseLocations, GLOWWORM_HOME, HOME_COURSES, isCourseFile, readCourses, REPO } from './paths.ts';

const ID = 'virtual:glowworm-courses';
const RESOLVED = `\0${ID}`;

export function coursesPlugin(): Plugin {
  return {
    name: 'glowworm-courses',
    config: () => ({
      server: { fs: { allow: [searchForWorkspaceRoot(REPO), GLOWWORM_HOME] } },
    }),
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return;
      const { files, widgets } = readCourses();
      const locations = Object.fromEntries(courseLocations().map(({ dir, path, bundled }) => [dir, { path, bundled }]));
      return [
        ...widgets.map((w, i) => `import * as w${i} from ${JSON.stringify(w.path)};`),
        `export const files = ${JSON.stringify(files)};`,
        `export const widgetModules = {${widgets.map((w, i) => `${JSON.stringify(w.key)}: w${i}`).join(', ')}};`,
        `export const locations = ${JSON.stringify(locations)};`,
        `export const paths = ${JSON.stringify({ repo: REPO, home: HOME_COURSES })};`,
      ].join('\n');
    },
    configureServer(server) {
      mkdirSync(HOME_COURSES, { recursive: true });
      server.watcher.add(HOME_COURSES);
      server.watcher.on('all', (_event, path) => {
        if (!isCourseFile(path)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      });
    },
  };
}
