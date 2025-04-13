// Register.js
import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  // ---------- State Variables ----------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // ---------- Registration Functionality ----------
  const registerUser = async (e) => {
    e.preventDefault();
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      localStorage.setItem(
        "user",
        JSON.stringify({ uid: userCred.user.uid, email: userCred.user.email })
      );
      navigate("/");
    } catch (err) {
      setError("Registration failed. Try again with a different email.");
    }
  };

  // ---------- Render Registration Form ----------
  return (
    <div className="app-container" style={{ maxWidth: "400px", textAlign: "center" }}>
      <h1 style={{ marginBottom: "30px" }}>Register</h1>
      <form onSubmit={registerUser} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
            border: "1px solid #ccc",
            backgroundColor: "white"
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
            border: "1px solid #ccc",
            backgroundColor: "white"
          }}
        />
        <button type="submit" style={{ width: "100%" }}>
          Register
        </button>
      </form>

      {error && <p style={{ color: "red", marginTop: "12px" }}>{error}</p>}

      <p style={{ marginTop: "20px" }}>
        Already have an account?{" "}
        <Link to="/login" style={{ color: "#675fc0", fontWeight: "bold" }}>
          Login
        </Link>
      </p>
    </div>
  );
}
