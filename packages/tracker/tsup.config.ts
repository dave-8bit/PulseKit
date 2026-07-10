import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  clean: true,
  dts: true,
  sourcemap: true,
  format: ['cjs', 'esm'],
  splitting: false,
  target: 'es2019',
})

