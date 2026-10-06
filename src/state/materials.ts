// Client for the dev-server API (scripts/dev-api.ts). Only available under `pnpm dev`.
import type { Agent, MaterialsInfo } from '../../scripts/dev-api';

export type { Agent, Material, MaterialsInfo } from '../../scripts/dev-api';

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);
  const body = await res.json().catch(() => ({ error: `The dev server isn't running (${res.status})` }));
  if (!res.ok) throw new Error(body.error ?? res.statusText);
  return body as T;
}

const q = (params: Record<string, string>) => `?${new URLSearchParams(params)}`;
const post = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const listMaterials = (course: string) => call<MaterialsInfo>(`/materials${q({ course })}`);
export const uploadMaterial = (course: string, file: File) => call<{ name: string }>(`/materials${q({ course, name: file.name })}`, { method: 'POST', body: file });
export const removeMaterial = (course: string, name: string) => call(`/materials${q({ course, name })}`, { method: 'DELETE' });
export const revealMaterials = (course: string) => call(`/reveal${q({ course })}`, { method: 'POST' });
export const createCourse = (title: string, exam?: string) => call<{ dir: string }>('/courses', post({ title, exam }));
export const launchAgent = (course: string, agent: Agent, prompt: string) => call('/agent', post({ course, agent, prompt }));

export const AGENT_NAMES: Record<Agent, string> = { claude: 'Claude Code', codex: 'Codex' };
export const agentCommand = (agent: Agent) => (agent === 'claude' ? 'claude' : 'codex');
