// Login.js
import React, { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import FloatingLabelInput from './FloatingLabelInput';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import useUserProfile from '../hooks/useUserProfile';

export default function Login() {
  // ---------- State Variables ----------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { setUserFromAuth } = useUserProfile();

  // ---------- Login Functionality ----------
  const loginUser = async (e) => {
    e.preventDefault();
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      console.log('Auth login success:', userCred.user);

      const userDocRef = doc(db, "users", userCred.user.uid);
      const userDoc = await getDoc(userDocRef);
      console.log('Firestore userDoc:', userDoc.exists(), userDoc.data());

      let profile = { uid: userCred.user.uid, email: userCred.user.email };
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.displayName) profile.displayName = data.displayName;
        if (data.avatarUrl) profile.avatarUrl = data.avatarUrl;
        else if (data.avatarBase64) profile.avatarUrl = data.avatarBase64;
        if (data.language) profile.language = data.language;
        if (data.theme) profile.theme = data.theme;
      } else {
        await setDoc(userDocRef, { email: userCred.user.email }, { merge: true });
        console.log('Created minimal Firestore user doc');
      }
      setUserFromAuth(profile);
      console.log('Profile set, navigating in:', profile);
      // --- Apply language immediately ---
      if (profile.language && i18n.language !== profile.language) {
        i18n.changeLanguage(profile.language);
      }
      // --- Apply theme immediately ---
      if (profile.theme && typeof document !== 'undefined') {
        if (profile.theme === 'golden') {
          document.body.classList.add('golden-theme');
          document.body.classList.remove('purple-theme');
        } else if (profile.theme === 'purple') {
          document.body.classList.add('purple-theme');
          document.body.classList.remove('golden-theme');
        } else {
          document.body.classList.remove('golden-theme');
          document.body.classList.remove('purple-theme');
        }
      }
      navigate("/");
    } catch (err) {
      console.error('Login error:', err);
      setError(t('login.invalidEmailOrPassword'));
    }
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Fetch full profile from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      let profile = { uid: user.uid, email: user.email };
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.displayName) profile.displayName = data.displayName;
        if (data.avatarUrl) profile.avatarUrl = data.avatarUrl;
        else if (data.avatarBase64) profile.avatarUrl = data.avatarBase64;
        if (data.language) profile.language = data.language;
        if (data.theme) profile.theme = data.theme;
      }
      setUserFromAuth(profile);
      // --- Apply language immediately ---
      if (profile.language && i18n.language !== profile.language) {
        i18n.changeLanguage(profile.language);
      }
      // --- Apply theme immediately ---
      if (profile.theme && typeof document !== 'undefined') {
        if (profile.theme === 'golden') {
          document.body.classList.add('golden-theme');
          document.body.classList.remove('purple-theme');
        } else if (profile.theme === 'purple') {
          document.body.classList.add('purple-theme');
          document.body.classList.remove('golden-theme');
        } else {
          document.body.classList.remove('golden-theme');
          document.body.classList.remove('purple-theme');
        }
      }
      navigate("/");
    } catch (err) {
      setError(t('login.googleSignInFailed'));
    }
  };

  // ---------- Render Login Form ----------
  return (
      <div className="home-main-bg fade-slide-in" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="login-container card-animate login-card-ring" style={{ maxWidth: "400px", width: "100%", textAlign: "center", padding: "20px", position: 'relative' }}>
        <h1 style={{ marginBottom: "30px" }}>{t('login.title')}</h1>
        <form onSubmit={loginUser} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <FloatingLabelInput
            type="email"
            label={t('login.emailLabel')}
            value={email}
            onChange={e => setEmail(e.target.value)}
            name="email"
            autoComplete="email"
            required
          />
          <FloatingLabelInput
            type={showPassword ? 'text' : 'password'}
            label={t('login.passwordLabel')}
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
          <button type="submit" className="button-pop button-ripple" style={{ width: "100%", background: "var(--accent-color)", color: "var(--button-text)", fontWeight: 600, border: "none", borderRadius: 8, padding: "12px 0", fontSize: "1.1em" }}>
            {t('login.loginButton')}
          </button>
          <button type="button" onClick={handleGoogleSignIn} className="button-pop button-ripple" style={{ width: "100%", background: "#fff", color: "#232234", fontWeight: 600, border: "1.5px solid var(--accent-color)", borderRadius: 8, padding: "12px 0", fontSize: "1.1em", marginBottom: 8, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt={t('login.googleSignInButton')} style={{ width: 22, height: 22, marginRight: 8 }} />
            <span>{t('login.googleSignInButton')}</span>
          </button>
        </form>

        {error && <p style={{ color: "var(--danger-color)", marginTop: "12px" }}>{error}</p>}

        <p style={{ marginTop: "20px" }}>
          {t('login.dontHaveAccount')} {" "}
          <Link to="/register" style={{ color: "var(--accent-color)", fontWeight: "bold" }}>
            {t('login.register')}
          </Link>
        </p>
        <p style={{ marginTop: "10px" }}>
          <Link to="/forgot-password" style={{ color: "var(--muted-text)", fontSize: "14px", textDecoration: 'underline' }}>
            {t('login.forgotPassword')}
          </Link>
        </p>
      </div>
    </div>
  );
}
