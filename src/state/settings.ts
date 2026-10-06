import { useSyncExternalStore } from 'react';
import { createStore } from './store';

export const ACCENTS = [
  { name: 'Ember', accent: '#ff7a1a', hi: '#ffb070' },
  { name: 'Cyan', accent: '#22d3ee', hi: '#9beefa' },
  { name: 'Lime', accent: '#a3e635', hi: '#d6f79f' },
  { name: 'Violet', accent: '#a78bfa', hi: '#d6caff' },
  { name: 'Ice', accent: '#dfe9ef', hi: '#ffffff' },
] as const;

export interface Settings {
  accent: number;
  spacing: 'normal' | 'wide';
  calm: boolean;
}

const KEY = 'glowworm:settings';
const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Settings> | null;
export const settings = createStore<Settings>({ accent: 0, spacing: 'normal', calm: false, ...saved });

function apply(s: Settings) {
  const root = document.documentElement;
  const a = ACCENTS[s.accent] ?? ACCENTS[0];
  root.style.setProperty('--accent', a.accent);
  root.style.setProperty('--accent-hi', a.hi);
  root.dataset.spacing = s.spacing;
  root.dataset.calm = String(s.calm);
  localStorage.setItem(KEY, JSON.stringify(s));
}
apply(settings.get());
settings.subscribe(() => apply(settings.get()));

export const useSettings = () => useSyncExternalStore(settings.subscribe, settings.get);

export const prefersCalm = () => settings.get().calm || matchMedia('(prefers-reduced-motion: reduce)').matches;
