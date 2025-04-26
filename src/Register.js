// Register.js
import React, { useState } from "react";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { useNavigate, Link } from "react-router-dom";
import FloatingLabelInput from './components/FloatingLabelInput';
import { useTranslation } from 'react-i18next';

export default function Register() {
  // ---------- State Variables ----------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

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
      setError(t('register.registrationFailed'));
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
      setError(t('register.googleSignInFailed'));
    }
  };

  // ---------- Render Registration Form ----------
  return (
    <div className="home-main-bg fade-slide-in" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="register-container card-animate" style={{ maxWidth: "400px", textAlign: "center", width: '100%' }}>
        <h1 style={{ marginBottom: "30px" }}>{t('register.title')}</h1>
        <form onSubmit={registerUser} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <FloatingLabelInput
            type="email"
            label={t('register.emailLabel')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            name="email"
            autoComplete="email"
            required
          />
          <FloatingLabelInput
            type={showPassword ? 'text' : 'password'}
            label={t('register.passwordLabel')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            name="password"
            autoComplete="new-password"
            required
            icon={
              <span style={{transition:'transform 0.2s'}}>{showPassword ? '🙈' : '👁️'}</span>
            }
            onIconClick={() => setShowPassword(v => !v)}
          />
          <button type="submit" className="button-pop button-ripple" style={{ width: "100%", background: "#47449c", color: "#fff", fontWeight: 600, border: "none", borderRadius: 8, padding: "12px 0", fontSize: "1.1em" }}>
            {t('register.registerButton')}
          </button>
          <button type="button" onClick={handleGoogleSignIn} className="button-pop button-ripple" style={{ width: "100%", background: "#fff", color: "#232234", fontWeight: 600, border: "1.5px solid #675fc0", borderRadius: 8, padding: "12px 0", fontSize: "1.1em", marginBottom: 8, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 22, height: 22, marginRight: 8 }} />
            <span>{t('register.googleSignInButton')}</span>
          </button>
        </form>

        {error && <p style={{ color: "#ff6b6b", marginTop: "12px" }}>{error}</p>}

        <p style={{ marginTop: "20px" }}>
          {t('register.alreadyHaveAccount')} {" "}
          <Link to="/login" style={{ color: "#675fc0", fontWeight: "bold" }}>
            {t('register.loginLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
