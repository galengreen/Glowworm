// Dev-server API for adding material: the player uploads files into <course>/materials/,
// creates new courses, and opens a terminal running the user's agent with a build prompt.
// Only served by `pnpm dev`; the agent does the actual work, following AUTHORING.md.
import { execFile, execFileSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import { basename, extname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Plugin } from 'vite';
import { findCourse, HOME_COURSES, REPO } from './paths.ts';

const AGENTS = { claude: 'claude', codex: 'codex' } as const;
export type Agent = keyof typeof AGENTS;

export interface Material {
  name: string;
  size: number;
  addedAt: string;
  /** sources/<stem>.md exists, so the agent has already converted it */
  converted: boolean;
}

export interface MaterialsInfo {
  path: string;
  files: Material[];
  /** agents found on PATH, and whether we can open a terminal for them (macOS only for now) */
  agents: Agent[];
  canLaunch: boolean;
}

const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
export const stem = (name: string) => basename(name, extname(name));

function courseDir(id: string | null) {
  const course = id && /^[\w-]+$/.test(id) ? findCourse(id) : undefined;
  if (!course) throw new HttpError(404, `No course "${id}"`);
  return course.path;
}

const onPath = (cmd: string) => {
  try {
    execFileSync('which', [cmd], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
const agents = (Object.keys(AGENTS) as Agent[]).filter((a) => onPath(AGENTS[a]));

function listMaterials(dir: string): MaterialsInfo {
  const materials = join(dir, 'materials');
  const files = existsSync(materials)
    ? readdirSync(materials)
        .filter((f) => !f.startsWith('.'))
        .map((name) => {
          const st = statSync(join(materials, name));
          return { name, size: st.size, addedAt: st.birthtime.toISOString(), converted: existsSync(join(dir, 'sources', `${stem(name)}.md`)) };
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  return { path: materials, files, agents, canLaunch: process.platform === 'darwin' };
}

/** A safe, citation-friendly file name: lowercase slug stem, original extension, never overwriting. */
function freeName(materials: string, raw: string) {
  const ext = extname(basename(raw)).toLowerCase().replace(/[^.\w]/g, '');
  const base = slug(stem(basename(raw))) || 'material';
  let name = `${base}${ext}`;
  for (let i = 2; existsSync(join(materials, name)); i++) name = `${base}-${i}${ext}`;
  return name;
}

async function upload(req: IncomingMessage, dir: string, raw: string | null) {
  if (!raw) throw new HttpError(400, 'Missing file name');
  const materials = join(dir, 'materials');
  mkdirSync(materials, { recursive: true });
  const name = freeName(materials, raw);
  await pipeline(req, createWriteStream(join(materials, name)));
  return { name };
}

function remove(dir: string, name: string | null) {
  if (!name || name !== basename(name)) throw new HttpError(400, 'Bad file name');
  rmSync(join(dir, 'materials', name), { force: true });
  return {};
}

function createCourse(body: { title?: string; exam?: string }) {
  const title = body.title?.trim();
  if (!title) throw new HttpError(400, 'A course needs a title');
  const id = slug(title);
  if (!id) throw new HttpError(400, 'Use some letters or numbers in the title');
  if (findCourse(id) || existsSync(join(HOME_COURSES, id))) throw new HttpError(409, `A course folder called "${id}" already exists`);
  const dir = join(HOME_COURSES, id);
  for (const sub of ['materials', 'sources']) mkdirSync(join(dir, sub), { recursive: true });
  const exam = body.exam && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(body.exam) ? `exam: "${body.exam}"\n` : '';
  writeFileSync(join(dir, 'course.yaml'), `id: ${id}\ntitle: ${JSON.stringify(title)}\n${exam}levels: []\n`);
  return { dir: id };
}

const sh = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
const appleString = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/**
 * Opens Terminal in the project root (for AUTHORING.md and the CLI) running the agent with the prompt,
 * with write access to the course folder, so the user watches and steers it.
 */
function launch(body: { course?: string; agent?: Agent; prompt?: string }) {
  const dir = courseDir(body.course ?? null);
  const agent = body.agent && agents.includes(body.agent) ? body.agent : undefined;
  if (!agent) throw new HttpError(400, 'That agent is not installed');
  if (process.platform !== 'darwin') throw new HttpError(501, 'Opening a terminal is only supported on macOS; copy the command instead');
  if (!body.prompt?.trim()) throw new HttpError(400, 'Empty prompt');
  const prompts = join(REPO, '.glowworm', 'prompts');
  mkdirSync(prompts, { recursive: true });
  const file = join(prompts, `${body.course}.md`);
  writeFileSync(file, body.prompt);
  const cmd = `cd ${sh(REPO)} && ${AGENTS[agent]} --add-dir ${sh(dir)} "$(cat ${sh(file)})"`;
  execFile('osascript', ['-e', `tell application "Terminal" to do script ${appleString(cmd)}`, '-e', 'tell application "Terminal" to activate']);
  return {};
}

function reveal(dir: string) {
  const materials = join(dir, 'materials');
  mkdirSync(materials, { recursive: true });
  if (process.platform === 'darwin') execFile('open', [materials]);
  return {};
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function json<T>(req: IncomingMessage): Promise<T> {
  let body = '';
  for await (const chunk of req) body += chunk;
  return JSON.parse(body || '{}') as T;
}

async function handle(req: IncomingMessage) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const q = (k: string) => url.searchParams.get(k);
  const route = `${req.method} ${url.pathname}`;
  switch (route) {
    case 'GET /materials': return listMaterials(courseDir(q('course')));
    case 'POST /materials': return upload(req, courseDir(q('course')), q('name'));
    case 'DELETE /materials': return remove(courseDir(q('course')), q('name'));
    case 'POST /reveal': return reveal(courseDir(q('course')));
    case 'POST /courses': return createCourse(await json(req));
    case 'POST /agent': return launch(await json(req));
    default: throw new HttpError(404, `No route ${route}`);
  }
}

export function devApi(): Plugin {
  return {
    name: 'glowworm-dev-api',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        handle(req)
          .then((out) => res.end(JSON.stringify(out)))
          .catch((e: Error) => {
            res.statusCode = e instanceof HttpError ? e.status : 500;
            res.end(JSON.stringify({ error: e.message }));
          });
      });
    },
  };
}
