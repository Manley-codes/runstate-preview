import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'preview-src',
  base: './',
  cacheDir: '../.vite',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
  server: { host: '127.0.0.1', port: 5194, strictPort: true },
});
