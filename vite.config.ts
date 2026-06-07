import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/orbital-atlas/' : '/',
  worker: { format: 'es' },
  test: { environment: 'jsdom' },
}));
