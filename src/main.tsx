import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

if (import.meta.env.DEV) {
  console.log('🌍 Environment Variables Check:', {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    ALL_VITE: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'))
  });
}

// Global handler for uncaught Supabase internal AbortErrors
// These come from _acquireLock and _initSupabaseAuthClient internal promises
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  const errorMessage = error?.message || String(error);

  // Suppress AbortError from Supabase's internal localStorage lock mechanism
  if (error?.name === 'AbortError' || errorMessage.includes('AbortError') || errorMessage.includes('aborted')) {
    if (import.meta.env.DEV) {
      console.log('🔇 Suppressed uncaught AbortError from Supabase internal initialization');
    }
    event.preventDefault(); // Prevent "Uncaught (in promise)" console error
    return;
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);