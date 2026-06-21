import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Transforme le JSX en runtime automatique (react-jsx) pour les tests de
  // composants (.tsx) sans import explicite de React.
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/**/src/**/*.test.{ts,tsx}',
      'apps/**/src/**/*.test.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['packages/**/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@puzzlehub/shared': new URL('./packages/shared/src/index.ts', import.meta.url).pathname,
      '@puzzlehub/engine/server': new URL('./packages/engine/src/server.ts', import.meta.url).pathname,
      '@puzzlehub/engine': new URL('./packages/engine/src/index.ts', import.meta.url).pathname,
    },
  },
});
