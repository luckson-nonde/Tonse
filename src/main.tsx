import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { initializeFetchInterceptor } from './services/api/fetchInterceptor';

// Initialize fetch interceptor to handle network errors gracefully
initializeFetchInterceptor({
  useMockData: false, // Set to true to always use mock data
  logErrors: true,
  timeout: 10000,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
