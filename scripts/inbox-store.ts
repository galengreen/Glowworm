// File-based inbox shared by the dev server (player writes) and the CLI (agent reads/resolves).
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export type Intent = 'explain' | 'example' | 'wrong' | 'quiz' | 'note';

export interface InboxRequest {
  id: string;
  createdAt: string;
  course: string;
  file: string; // course-relative path, e.g. lessons/01-neuron.md
  block: string; // stable block id (segment / question / wiki page)
  quote: { exact: string; prefix: string; suffix: string };
  intent: Intent;
  note: string;
  status: 'open' | 'done';
  reply?: string;
  resolvedAt?: string;
}

export const INBOX_DIR = join(process.cwd(), '.glowworm', 'inbox');

function ensure() {
  if (!existsSync(INBOX_DIR)) mkdirSync(INBOX_DIR, { recursive: true });
}

export function listRequests(): InboxRequest[] {
  ensure();
  return readdirSync(INBOX_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(INBOX_DIR, f), 'utf8')) as InboxRequest)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function addRequest(input: Omit<InboxRequest, 'id' | 'createdAt' | 'status'>): InboxRequest {
  ensure();
  const req: InboxRequest = { ...input, id: randomUUID().slice(0, 8), createdAt: new Date().toISOString(), status: 'open' };
  writeFileSync(join(INBOX_DIR, `${req.id}.json`), JSON.stringify(req, null, 2));
  return req;
}

export function resolveRequest(id: string, reply: string): InboxRequest {
  const path = join(INBOX_DIR, `${id}.json`);
  if (!existsSync(path)) throw new Error(`No inbox request with id ${id}`);
  const req = JSON.parse(readFileSync(path, 'utf8')) as InboxRequest;
  req.status = 'done';
  req.reply = reply;
  req.resolvedAt = new Date().toISOString();
  writeFileSync(path, JSON.stringify(req, null, 2));
  return req;
}
