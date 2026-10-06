import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { addRequest, listRequests } from './scripts/inbox-store';

// Serves the file inbox to the player: GET lists requests, POST adds one.
function inbox(): Plugin {
  return {
    name: 'glowworm-inbox',
    configureServer(server) {
      server.middlewares.use('/api/inbox', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.method === 'GET') {
          res.end(JSON.stringify(listRequests()));
          return;
        }
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (c) => (body += c));
          req.on('end', () => {
            try {
              res.end(JSON.stringify(addRequest(JSON.parse(body))));
            } catch (e) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: String(e) }));
            }
          });
          return;
        }
        res.statusCode = 405;
        res.end('{}');
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), inbox()],
  resolve: {
    alias: { '@kit': fileURLToPath(new URL('./src/kit/index.ts', import.meta.url)) },
  },
  server: { watch: { ignored: ['**/.glowworm/**'] } },
});
