// Login.js
import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  // ---------- State Variables ----------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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

  // ---------- Render Login Form ----------
  return (
    <div className="app-container" style={{ maxWidth: "400px", textAlign: "center" }}>
      <h1 style={{ marginBottom: "30px" }}>Login</h1>
      <form onSubmit={loginUser} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: "12px",
            fontSize: "16px",
            borderRadius: "8px",
            border: "1px solid #333",
            backgroundColor: "#232234",
            color: "#f2f2f2"
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            padding: "12px",
            fontSize: "16px",
            borderRadius: "8px",
            border: "1px solid #333",
            backgroundColor: "#232234",
            color: "#f2f2f2"
          }}
        />
        <button type="submit" style={{ width: "100%", background: "#47449c", color: "#fff", fontWeight: 600, border: "none", borderRadius: 8, padding: "12px 0", fontSize: "1.1em" }}>
          Login
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
      <p style={{ marginTop: "10px" }}>
        <Link to="/" style={{ color: "#aaa", fontSize: "14px" }}>
          ← Back to Timer
        </Link>
      </p>

    </div>
  );
}
