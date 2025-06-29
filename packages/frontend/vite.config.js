import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // /apiで始まるリクエストをバックエンドサーバーに転送する
      '/api': {
        target: 'http://localhost:3001', // バックエンドサーバーのURL
        changeOrigin: true,
      },
    },
  },
});