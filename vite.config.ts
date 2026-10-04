import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // `vite build --mode artifact`: relative paths + model embedded in JS
  base: mode === 'artifact' ? './' : '/',
  assetsInclude: ['**/*.glb'],
  resolve: {
    alias:
      mode === 'artifact'
        ? {
            './saiGlbUrl': fileURLToPath(new URL('./src/game/models/saiGlbUrl.inline.ts', import.meta.url)),
            './cityModelUrls': fileURLToPath(new URL('./src/game/models/cityModelUrls.inline.ts', import.meta.url)),
          }
        : {},
  },
  build: {
    chunkSizeWarningLimit: 2500,
  },
}));
