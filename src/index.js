import React from 'react';
import ReactDOM from 'react-dom/client'; // 🆕 notice the /client here
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// TEMPORARILY DISABLE SERVICE WORKER FOR DEBUGGING
serviceWorkerRegistration.unregister();
// serviceWorkerRegistration.register({
//   onUpdate: registration => {
//     window.swRegistration = registration;
//     window.dispatchEvent(new Event('swUpdated'));
//   }
// });

// ✅ React 18 way:
// REMOVE StrictMode to prevent double-mounting in development
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);
