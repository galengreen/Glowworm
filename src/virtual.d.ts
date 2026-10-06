declare module 'virtual:glowworm-courses' {
  import type { Widget } from '@kit';
  /** Course files keyed as `/courses/<dir>/<file>` */
  export const files: Record<string, string>;
  export const widgetModules: Record<string, { default: Widget }>;
  export const locations: Record<string, { path: string; bundled: boolean }>;
  export const paths: { repo: string; home: string };
}
