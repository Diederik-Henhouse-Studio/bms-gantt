import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/store/**/*.ts'],
      exclude: ['src/store/index.ts', 'src/store/types.ts'],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.test.ts'],
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@bluemillstudio/gantt/store': resolve(__dirname, 'src/store/index.ts'),
      '@bluemillstudio/gantt/query': resolve(__dirname, 'src/query.ts'),
      '@bluemillstudio/gantt/analysis': resolve(__dirname, 'src/analysis.ts'),
      '@bluemillstudio/gantt': resolve(__dirname, 'src/index.ts'),
    },
  },
});
