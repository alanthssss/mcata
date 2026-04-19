import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Strips type="module" and crossorigin from script/link tags so the built
// index.html can be opened directly from the filesystem (file:// protocol).
// This is safe because the bundle is output as IIFE (no ES-module imports).
function classicScriptPlugin(): Plugin {
  return {
    name: 'classic-script',
    enforce: 'post',
    transformIndexHtml(html: string) {
      return html
        .replace(/<script type="module" crossorigin/g, '<script defer')
        .replace(/<link rel="stylesheet" crossorigin/g, '<link rel="stylesheet"');
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), classicScriptPlugin()],
  build: {
    rollupOptions: {
      output: {
        format: 'iife',
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
