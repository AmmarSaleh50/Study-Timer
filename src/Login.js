// Login.js
import React, { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { useNavigate, Link } from "react-router-dom";
import FloatingLabelInput from './components/FloatingLabelInput';

export default function Login() {
  // ---------- State Variables ----------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // ---------- Login Functionality ----------
  const loginUser = async (e) => {
    e.preventDefault();
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;
      // Store user details in localStorage
      localStorage.setItem("user", JSON.stringify({ uid: user.uid, email: user.email }));
      navigate("/");
    } catch (err) {
      setError("Invalid email or password.");
    }
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      localStorage.setItem("user", JSON.stringify({ uid: user.uid, email: user.email }));
      navigate("/");
    } catch (err) {
      setError("Google sign-in failed.");
    }
  };

  // ---------- Render Login Form ----------
  return (
    <div className="home-main-bg fade-slide-in" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="app-container" style={{ maxWidth: "400px", textAlign: "center", width: '100%', background: 'rgba(35,34,52,0.93)', borderRadius: 18, boxShadow: '0 2px 24px #0006', padding: '38px 32px' }}>
        <h1 style={{ marginBottom: "30px" }}>Login</h1>
        <form onSubmit={loginUser} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <FloatingLabelInput
            type="email"
            label="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            name="email"
            autoComplete="email"
            required
          />
          <FloatingLabelInput
            type={showPassword ? 'text' : 'password'}
            label="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            name="password"
            autoComplete="current-password"
            required
            icon={
              <span style={{transition:'transform 0.2s'}}>{showPassword ? '🙈' : '👁️'}</span>
            }
            onIconClick={() => setShowPassword(v => !v)}
          />
          <button type="submit" className="button-pop button-ripple" style={{ width: "100%", background: "#47449c", color: "#fff", fontWeight: 600, border: "none", borderRadius: 8, padding: "12px 0", fontSize: "1.1em" }}>
            Login
          </button>
          <button type="button" onClick={handleGoogleSignIn} className="button-pop button-ripple" style={{ width: "100%", background: "#fff", color: "#232234", fontWeight: 600, border: "1.5px solid #675fc0", borderRadius: 8, padding: "12px 0", fontSize: "1.1em", marginBottom: 8, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 22, height: 22, marginRight: 8 }} />
            <span>Sign in with Google</span>
          </button>
        </form>

        {error && <p style={{ color: "#ff6b6b", marginTop: "12px" }}>{error}</p>}

        <p style={{ marginTop: "20px" }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "#675fc0", fontWeight: "bold" }}>
            Register
          </Link>
        </p>
        <p style={{ marginTop: "10px" }}>
          <Link to="/forgot-password" style={{ color: "#aaa", fontSize: "14px", textDecoration: 'underline' }}>
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
}
