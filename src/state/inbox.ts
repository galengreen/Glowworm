import { useSyncExternalStore } from 'react';
import type { InboxRequest, Intent } from '../../scripts/inbox-store';
import { createStore } from './store';

export type { InboxRequest, Intent };

export const INTENTS: { id: Intent; label: string; hint: string }[] = [
  { id: 'explain', label: 'Explain more', hint: 'Expand this, or add a wiki page if the concept is missing' },
  { id: 'example', label: 'Example', hint: 'Add a worked example or a widget' },
  { id: 'wrong', label: 'This is wrong', hint: 'Check it against the cited source and fix it' },
  { id: 'quiz', label: 'Quiz me', hint: 'Generate questions on this' },
  { id: 'note', label: 'Note', hint: 'Anything else, e.g. “not examinable”' },
];

export const inbox = createStore<InboxRequest[]>([]);
export const useInbox = () => useSyncExternalStore(inbox.subscribe, inbox.get);

export async function refreshInbox() {
  try {
    const res = await fetch('/api/inbox');
    if (res.ok) inbox.set(await res.json());
  } catch {
    // inbox needs the dev server; ignore when unavailable
  }
}

export async function sendRequest(req: Omit<InboxRequest, 'id' | 'createdAt' | 'status'>) {
  const res = await fetch('/api/inbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) });
  if (!res.ok) throw new Error(await res.text());
  await refreshInbox();
}

refreshInbox();
window.addEventListener('focus', refreshInbox);
setInterval(refreshInbox, 8000);
