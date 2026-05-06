import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig, loadEnv} from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.LENCO_API_KEY': JSON.stringify(env.LENCO_API_KEY),
      'global': 'window.global',
      'globalThis': 'window.global',
      'self': 'window.global',
      'window.fetch': 'window.global.fetch',
      'window.FormData': 'window.global.FormData',
    },
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, '.') },
        { find: 'node-fetch', replacement: path.resolve(__dirname, 'src/fetch-shim.js') },
        { find: 'formdata-polyfill/esm.min.js', replacement: path.resolve(__dirname, 'src/formdata-shim.js') },
        { find: 'formdata-polyfill', replacement: path.resolve(__dirname, 'src/formdata-shim.js') },
      ],
    },
    optimizeDeps: {
      include: ['@google/genai', 'gaxios', 'google-auth-library'],
      exclude: ['node-fetch', 'formdata-polyfill'],
      esbuildOptions: {
        define: {
          global: 'window.global',
          globalThis: 'window.global',
          self: 'window.global',
          'window.fetch': 'window.global.fetch',
          'window.FormData': 'window.global.FormData',
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
