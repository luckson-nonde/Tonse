import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig} from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    // NOTE: no process.env.* secret injection here on purpose. This used to
    // manually reach into loadEnv(mode, '.', '') — an empty prefix filter —
    // to bake GEMINI_API_KEY/LENCO_API_KEY into the client bundle, which
    // defeats Vite's VITE_-prefix convention that exists specifically to
    // stop server secrets from reaching the browser. Only import.meta.env.VITE_*
    // vars are safe to expose to client code; anything else belongs behind
    // the NestJS backend, never referenced from src/.
    define: {
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
