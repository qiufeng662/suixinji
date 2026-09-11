import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  build: {
    outDir: 'dist-electron',
    emptyOutDir: true,
    lib: {
      entry: {
        main: path.resolve(__dirname, 'electron/main.ts'),
        preload: path.resolve(__dirname, 'electron/preload.ts'),
      },
      formats: ['cjs'],
      fileName: (_format, entryName) => `${entryName}.cjs`,
    },
    rollupOptions: {
      external: ['electron', 'node:path', 'node:fs', 'node:os', 'node:url'],
      output: {
        entryFileNames: '[name].cjs',
      },
    },
    minify: false,
    target: 'node18',
  },
})
