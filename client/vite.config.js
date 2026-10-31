import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Усі запити /api проксуються на Express — браузер бачить один origin,
// тому cookie працюють без налаштування CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: false, xfwd: true },
    },
  },
});
