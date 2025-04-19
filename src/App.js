import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import RoutinesPage from "./RoutinesPage";
import ForgotPassword from "./ForgotPassword";
import HomePage from "./HomePage";
import UniversalDrawerLayout from './components/UniversalDrawerLayout';
import './animations.css';

function AppInner() {
  const [showUpdate, setShowUpdate] = useState(false);
  useEffect(() => {
    const storedVersion = localStorage.getItem("app-version");
    const currentVersion = document.querySelector('meta[name="app-version"]')?.content;
    if (currentVersion && currentVersion !== storedVersion) {
      localStorage.setItem("app-version", currentVersion);
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    // Listen for service worker update event
    const handler = () => setShowUpdate(true);
    window.addEventListener('swUpdated', handler);
    return () => window.removeEventListener('swUpdated', handler);
  }, []);

  const updateApp = () => {
    if (window.swRegistration && window.swRegistration.waiting) {
      window.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const isAuth = !!user;

  // Redirect all non-auth users to /login unless already on /login or /register or /forgot-password
  if (!isAuth && !["/login", "/register", "/forgot-password"].includes(location.pathname)) {
    return <Navigate to="/login" replace />;
  }

  // Prevent going back to timer/home/routines if not logged in
  if (!isAuth && ["/", "/home", "/timer", "/routines"].includes(location.pathname)) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div>
      {showUpdate && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
          background: '#232234', color: '#fff', padding: '16px', textAlign: 'center', boxShadow: '0 -2px 12px #0007',
        }}>
          New version available! <button style={{ marginLeft: 16, background: '#5d996c', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }} onClick={updateApp}>Update</button>
        </div>
      )}
      <Routes location={location}>
        <Route path="/" element={isAuth ? <HomePage /> : <Navigate to="/login" replace />} />
        <Route path="/home" element={isAuth ? <HomePage /> : <Navigate to="/login" replace />} />
        <Route path="/timer" element={isAuth ? <UniversalDrawerLayout><Dashboard /></UniversalDrawerLayout> : <Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/routines" element={isAuth ? <UniversalDrawerLayout><RoutinesPage /></UniversalDrawerLayout> : <Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppInner />
    </Router>
  );
}
