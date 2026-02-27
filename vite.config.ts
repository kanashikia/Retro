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
    define: {
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './setupTests.ts',
      pool: 'threads',
      deps: {
        optimizer: {
          web: {
            enabled: true,
            include: ['@exodus/bytes', 'html-encoding-sniffer'],
          },
        },
      },
      server: {
        deps: {
          inline: [
            'jsdom',
            'html-encoding-sniffer',
            'whatwg-url',
            '@exodus/bytes',
          ],
        },
      },
    },
  };
});
