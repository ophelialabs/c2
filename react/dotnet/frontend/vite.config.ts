import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API calls to the app service
      '/api': {
        target: process.env.services__server__https__0 || process.env.services__server__http__0 || 'http://localhost:5381',
        changeOrigin: true
      }
    }
  }
});
