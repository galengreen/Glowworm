import { useSyncExternalStore } from 'react';
import { createStore } from './store';

// `hi` is the accent used for text, so on light surfaces it goes darker rather than lighter.
export const ACCENTS = [
  { name: 'Ember', accent: '#ff7a1a', hi: '#ffb070', light: { accent: '#ea6a0c', hi: '#b04c00' } },
  { name: 'Cyan', accent: '#22d3ee', hi: '#9beefa', light: { accent: '#0aa2c2', hi: '#0b6f85' } },
  { name: 'Lime', accent: '#a3e635', hi: '#d6f79f', light: { accent: '#6aa80f', hi: '#477309' } },
  { name: 'Violet', accent: '#a78bfa', hi: '#d6caff', light: { accent: '#7c55ea', hi: '#5b34c4' } },
  { name: 'Ice', accent: '#dfe9ef', hi: '#ffffff', light: { accent: '#5d7180', hi: '#33434f' } },
] as const;

export const THEMES = ['system', 'dark', 'light'] as const;
export type Theme = (typeof THEMES)[number];

export interface Settings {
  theme: Theme;
  accent: number;
  spacing: 'normal' | 'wide';
  calm: boolean;
}

const KEY = 'glowworm:settings';
const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Settings> | null;
export const settings = createStore<Settings>({ theme: 'dark', accent: 0, spacing: 'normal', calm: false, ...saved });

const systemLight = matchMedia('(prefers-color-scheme: light)');
const resolveTheme = (t: Theme) => (t === 'system' ? (systemLight.matches ? 'light' : 'dark') : t);

function apply(s: Settings) {
  const root = document.documentElement;
  const theme = resolveTheme(s.theme);
  const a = ACCENTS[s.accent] ?? ACCENTS[0];
  const shade = theme === 'light' ? a.light : a;
  root.dataset.theme = theme;
  root.style.setProperty('--accent', shade.accent);
  root.style.setProperty('--accent-hi', shade.hi);
  root.dataset.spacing = s.spacing;
  root.dataset.calm = String(s.calm);
  localStorage.setItem(KEY, JSON.stringify(s));
}
apply(settings.get());
settings.subscribe(() => apply(settings.get()));
systemLight.addEventListener('change', () => settings.get().theme === 'system' && apply(settings.get()));

export const useSettings = () => useSyncExternalStore(settings.subscribe, settings.get);

export const prefersCalm = () => settings.get().calm || matchMedia('(prefers-reduced-motion: reduce)').matches;
