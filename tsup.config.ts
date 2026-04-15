import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    store: 'src/store/index.ts',  // separate entry for headless mode
    query: 'src/query.ts',        // pure filter/sort helpers
    analysis: 'src/analysis.ts',  // forecast / resourceLoad / burndown
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', '@tanstack/react-table'],
  splitting: false,
  treeshake: true,
  minify: false,  // readable output for debugging
  target: 'es2022',
});
