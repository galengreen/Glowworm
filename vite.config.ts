import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@kit': fileURLToPath(new URL('./src/kit/index.ts', import.meta.url)) },
  },
});
