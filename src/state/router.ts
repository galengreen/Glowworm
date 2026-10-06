import { useSyncExternalStore } from 'react';

// Hash routes: #/c/<course>/<view>/<id>/<sub>?<query>
export interface Route {
  course?: string;
  view: 'home' | 'lesson' | 'wiki' | 'source' | 'practice';
  id?: string;
  sub?: string;
  query: URLSearchParams;
}

function parse(): Route {
  const [path, q = ''] = location.hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const query = new URLSearchParams(q);
  if (parts[0] !== 'c') return { view: 'home', query };
  return { course: parts[1], view: (parts[2] as Route['view']) ?? 'home', id: parts[3], sub: parts[4], query };
}

let current = parse();
let currentHash = location.hash;
const subscribe = (l: () => void) => {
  const h = () => {
    if (location.hash === currentHash) return;
    currentHash = location.hash;
    current = parse();
    l();
  };
  window.addEventListener('hashchange', h);
  return () => window.removeEventListener('hashchange', h);
};

export const useRoute = () => useSyncExternalStore(subscribe, () => current);

export function href(course: string, view: Route['view'] = 'home', id?: string, sub?: string, query?: Record<string, string>) {
  const parts = ['c', course, ...(view === 'home' ? [] : [view]), ...(id ? [id] : []), ...(sub ? [sub] : [])];
  const q = query ? `?${new URLSearchParams(query)}` : '';
  return `#/${parts.map(encodeURIComponent).join('/')}${q}`;
}

export const go = (...args: Parameters<typeof href>) => {
  location.hash = href(...args);
  window.scrollTo({ top: 0 });
};
