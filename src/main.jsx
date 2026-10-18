import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './AuthContext.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter>
);

// PWA: service worker sirf production build me register hota hai (dev me cache dikkat deta hai)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
