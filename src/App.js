import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";

function App() {
  // ✅ Auto-refresh when a new version is deployed
  useEffect(() => {
    const storedVersion = localStorage.getItem("app-version");
    const currentVersion = document.querySelector('meta[name="app-version"]')?.content;

    if (storedVersion && currentVersion && storedVersion !== currentVersion) {
      localStorage.setItem("app-version", currentVersion);
      window.location.reload(); // Force reload
    } else {
      localStorage.setItem("app-version", currentVersion);
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  );
}

export default App;
