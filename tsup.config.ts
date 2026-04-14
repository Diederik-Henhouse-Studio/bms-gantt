import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    store: 'src/store/index.ts',  // separate entry for headless mode
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
