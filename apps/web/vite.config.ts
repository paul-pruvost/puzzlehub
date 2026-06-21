import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@puzzlehub/shared': pkg('../../packages/shared/src/index.ts'),
      '@puzzlehub/engine': pkg('../../packages/engine/src/index.ts'),
      '@puzzlehub/ui/tokens.css': pkg('../../packages/ui/src/tokens.css'),
      '@puzzlehub/ui': pkg('../../packages/ui/src/index.ts'),
    },
  },
  server: { port: 5173 },
});
