import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  logLevel: 'error',
  plugins: [react()],
  server: {
    host: true,
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
});
