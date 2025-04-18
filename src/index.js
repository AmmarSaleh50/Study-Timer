import React from 'react';
import ReactDOM from 'react-dom/client'; // 🆕 notice the /client here
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

serviceWorkerRegistration.register();

// ✅ React 18 way:
// REMOVE StrictMode to prevent double-mounting in development
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);
