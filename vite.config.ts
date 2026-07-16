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
      // NOTE: never `define` a payment-provider secret here. Anything in
      // `define` is inlined into the client bundle and shipped to every
      // visitor. The PSP key lives server-side only (backend config) and the
      // browser never talks to the PSP directly — it goes through our API.
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
      // Allow Cloudflare quick-tunnel domains through Vite's host check so
      // the public *.trycloudflare.com URL isn't rejected. Temporary — for
      // exposing the local dev server via a public tunnel.
      allowedHosts: ['.trycloudflare.com'],
      // Same-origin API proxy. The public tunnel only exposes this Vite
      // dev server, so route /api/* through to the NestJS backend on
      // :3001. The backend mounts routes at the root (no global prefix),
      // so strip the /api segment before forwarding. Same-origin means the
      // browser never makes a cross-origin request — no CORS — and one
      // tunnel serves both the frontend and the backend.
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
