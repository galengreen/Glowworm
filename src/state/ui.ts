// Transient UI state: the side drawer (concepts and sources open beside the lesson) and the command palette.
import { useSyncExternalStore } from 'react';
import { createStore } from './store';

export type DrawerItem = { kind: 'concept'; id: string } | { kind: 'source'; id: string; anchor?: string };

interface UiState {
  drawer: DrawerItem[]; // a stack, so links inside the drawer can go back
  palette: boolean;
}

export const ui = createStore<UiState>({ drawer: [], palette: false });
export const useUi = () => useSyncExternalStore(ui.subscribe, ui.get);

export const openDrawer = (item: DrawerItem) => ui.set((s) => ({ ...s, drawer: [...s.drawer, item] }));
export const backDrawer = () => ui.set((s) => ({ ...s, drawer: s.drawer.slice(0, -1) }));
export const closeDrawer = () => ui.set((s) => ({ ...s, drawer: [] }));
export const setPalette = (palette: boolean) => ui.set((s) => ({ ...s, palette }));

/** "notes#gradients" → source drawer item */
export const sourceItem = (ref: string): DrawerItem => {
  const [id, anchor] = ref.split('#');
  return { kind: 'source', id, anchor };
};
