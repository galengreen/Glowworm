import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { coursesPlugin } from './scripts/courses-plugin.ts';
import { devApi } from './scripts/dev-api.ts';

export default defineConfig({
  plugins: [react(), coursesPlugin(), devApi()],
  resolve: {
    alias: { '@kit': fileURLToPath(new URL('./src/kit/index.ts', import.meta.url)) },
  },
  // Raw material (PDFs, slides) isn't part of the app; only the sources the agent writes from it are.
  server: { watch: { ignored: ['**/courses/*/materials/**', '**/.glowworm/**'] } },
});
