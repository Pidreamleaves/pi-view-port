/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import dts from 'vite-plugin-dts'

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: 'hidden',
    lib: {
      entry: {
        'pi-view-port': path.resolve(__dirname, 'index.ts'),
        'vite': path.resolve(__dirname, 'src/plugins/vite.ts')
      },
      name: 'PiViewPort',
      fileName: (format, entryName) => {
        if (entryName === 'vite') {
          return `vite.${format === 'es' ? 'mjs' : 'cjs'}`;
        }
        return `${entryName}.${format}.js`;
      }
    },
    rollupOptions: {
      external: [
        'vue',
        'fs-extra',
        'serve-static',
        'path',
        'fs',
        'vite',
        'url'
      ],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  },
  test: {
    environment: 'jsdom'
  },
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      include: ['src/**/*.ts', 'src/**/*.vue', 'index.ts'],
      rollupTypes: true
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // ✅ 定义 @ = src
    },
  },
})
