import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { initializeFetchInterceptor } from './services/api/fetchInterceptor';
import { initInstallPrompt } from './services/installPrompt';

// Initialize fetch interceptor to handle network errors gracefully
initializeFetchInterceptor({
  useMockData: false, // Set to true to always use mock data
  logErrors: true,
  timeout: 10000,
});

// Capture `beforeinstallprompt` before it can fire (it's a one-shot event) so
// FloatingHub can offer an in-app "Install ProQuote" banner later.
initInstallPrompt();

// Register the Web Push service worker. It is a PLAIN file at /sw.js (served
// from public/, copied verbatim) so it never passes through Vite's esbuild
// `define` that rewrites `self`→window.global — which would break any SW.
// Registered at the site root so its scope is '/'.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.warn('Service worker registration failed:', err));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
