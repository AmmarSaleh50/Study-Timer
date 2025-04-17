import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import RoutinesPage from "./RoutinesPage";
import ForgotPassword from "./ForgotPassword";

function AppInner() {
  useEffect(() => {
    const storedVersion = localStorage.getItem("app-version");
    const currentVersion = document.querySelector('meta[name="app-version"]')?.content;
    if (currentVersion && currentVersion !== storedVersion) {
      localStorage.setItem("app-version", currentVersion);
      window.location.reload();
    }
  }, []);

  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const isAuth = !!user;

  // Redirect all non-auth users to /register unless already on /login or /register or /forgot-password
  if (!isAuth && !["/login", "/register", "/forgot-password"].includes(location.pathname)) {
    return <Navigate to="/register" replace />;
  }

  // Prevent going back to timer/dashboard/routines if not logged in
  if (!isAuth && ["/", "/routines"].includes(location.pathname)) {
    return <Navigate to="/register" replace />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={isAuth ? <Dashboard /> : <Navigate to="/register" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/routines" element={isAuth ? <RoutinesPage /> : <Navigate to="/register" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppInner />
    </Router>
  );
}
