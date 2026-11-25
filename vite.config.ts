import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_BACKEND_URL || `http://localhost:${env.PORT || '3001'}`;

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/socket.io': {
          target: backendUrl,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    plugins: [react()],
    build: {
      // The Tiny FPS tab is a page of its own (fps.html): the game never weighs on the app.
      rollupOptions: { input: { main: path.resolve(__dirname, 'index.html'), fps: path.resolve(__dirname, 'fps.html') } },
    },
    define: {
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      pool: 'threads',
      exclude: ['**/.claude/**', '**/node_modules/**'],
    },
  };
});
