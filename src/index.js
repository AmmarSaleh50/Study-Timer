import React from 'react';
import ReactDOM from 'react-dom/client'; // 🆕 notice the /client here
import App from './App';

// ✅ React 18 way:
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
