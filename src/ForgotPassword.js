// ForgotPassword.js
import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./firebase";
import {Link } from "react-router-dom";
import FloatingLabelInput from './components/FloatingLabelInput';

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset link sent! Check your email.");
    } catch (err) {
      setError("Failed to send reset email. Please check your address.");
    }
  };

  return (
    <div className="home-main-bg fade-slide-in" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="app-container" style={{ maxWidth: "400px", textAlign: "center", width: '100%', background: 'rgba(35,34,52,0.93)', borderRadius: 18, boxShadow: '0 2px 24px #0006', padding: '38px 32px' }}>
        <h1 style={{ marginBottom: "30px" }}>Forgot Password</h1>
        <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <FloatingLabelInput
            type="email"
            label="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            name="email"
            autoComplete="email"
            required
          />
          <button type="submit" className="button-pop button-ripple" style={{ width: "100%", background: "#47449c", color: "#fff", fontWeight: 600, border: "none", borderRadius: 8, padding: "12px 0", fontSize: "1.1em" }}>
            Send Reset Link
          </button>
        </form>
        {message && <p style={{ color: "#5d996c", marginTop: "12px" }}>{message}</p>}
        {error && <p style={{ color: "#ff6b6b", marginTop: "12px" }}>{error}</p>}
        <p style={{ marginTop: "20px" }}>
          <Link to="/login" style={{ color: "#675fc0", fontWeight: "bold" }}>
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
