import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  document.body.innerHTML = '<div style="min-height:100vh;background:#0B0E14;color:#E2E8F0;display:flex;align-items:center;justify-content:center;font-family:system-ui">#root 요소를 찾을 수 없습니다.</div>';
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

window.addEventListener('error', (e) => console.error('Uncaught error:', e));
window.addEventListener('unhandledrejection', (e) => console.error('Unhandled promise:', e));
