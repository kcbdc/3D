import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths keep the build working under GitHub Pages subpaths such as /3D/.
  base: './',
  build: {
    target: 'es2020',
    sourcemap: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});
