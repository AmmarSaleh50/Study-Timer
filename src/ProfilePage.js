import React, { useState, useEffect } from 'react';
import './App.css';
import ProfileAvatarEditor from './components/ProfileAvatarEditor';
import ProfileStatsCard from './components/ProfileStatsCard';
import ProfileAccountSettings from './components/ProfileAccountSettings';
import ProfileCustomization from './components/ProfileCustomization';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

export default function ProfilePage() {
  // Simulate user info from localStorage
  const { t, i18n } = useTranslation();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userName = user.displayName || user.name || t('profile.defaultName');
  const email = user.email || 'No email set';
  const [avatar, setAvatar] = React.useState(user.avatarUrl || null);
  const [theme, setTheme] = React.useState('dark');
  const [language, setLanguage] = React.useState('en');
  const [showInviteCopied, setShowInviteCopied] = React.useState(false);
  const [toast, setToast] = React.useState('');

  // Dummy stats for now
  const streak = localStorage.getItem('studyStreak') || 0;
  const totalMinutes = localStorage.getItem('totalMinutes') || 0;
  const routinesCompleted = localStorage.getItem('routinesCompleted') || 0;
  const badges = [streak >= 7 ? '7-Day Streak' : null, routinesCompleted >= 1 ? 'First Routine' : null].filter(Boolean);

  function handleLogout() {
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  function handleDeleteAccount() {
    import('firebase/auth').then(({ deleteUser }) => {
      const { auth } = require('./firebase');
      if (auth.currentUser) {
        deleteUser(auth.currentUser)
          .then(() => {
            localStorage.clear();
            window.location.href = '/register';
          })
          .catch(err => {
            showToast('Failed to delete account: ' + err.message);
          });
      } else {
        localStorage.clear();
        window.location.href = '/register';
      }
    });
  }

  function handleChangePassword() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?.email) {
      showToast('No email found for this account.');
      return;
    }
    import('firebase/auth').then(({ sendPasswordResetEmail }) => {
      const { auth } = require('./firebase');
      sendPasswordResetEmail(auth, user.email)
        .then(() => {
          showToast('Password reset email sent! Check your inbox.');
        })
        .catch(err => {
          showToast('Failed to send reset email: ' + err.message);
        });
    });
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2300);
  }

  function handleThemeChange(newTheme) {
    setTheme(newTheme);
    // Optionally persist theme
  }
  function handleLanguageChange(newLang) {
    setLanguage(newLang);
    // Persist language to Firestore
    if (user?.uid) {
      setDoc(doc(db, 'users', user.uid), { language: newLang }, { merge: true });
    }
    // Persist language to localStorage
    localStorage.setItem('language', newLang);
    // Change i18n language immediately
    i18n.changeLanguage(newLang);
  }

  function handleAvatarChange(newAvatar) {
    setAvatar(newAvatar);
    // Optionally persist avatar
  }

  React.useEffect(() => {
    // Fetch language from Firestore if user is logged in
    async function fetchLanguage() {
      if (!user?.uid) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().language) {
          setLanguage(userDoc.data().language);
          if (i18n.language !== userDoc.data().language) {
            i18n.changeLanguage(userDoc.data().language);
          }
        }
      } catch (e) { /* Optionally handle error */ }
    }
    fetchLanguage();
  }, [user?.uid, i18n]);

  React.useEffect(() => {
    // Change app language immediately when language changes
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  return (
    <div className="dashboard-main-bg fade-slide-in" style={{ paddingBottom: 72}}>
      <div className="app-container card-animate" style={{ maxWidth: 480, width: '98vw', marginTop: 48 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <ProfileAvatarEditor avatarUrl={avatar} onAvatarChange={handleAvatarChange} initialLetter={userName[0]} />
          <h2 style={{ margin: 0, fontWeight: 700 }}>{userName}</h2>
          <div style={{ color: '#aaa', fontSize: 16, marginTop: -10, marginBottom: 14 }}>{email}</div>
        </div>
        <ProfileStatsCard streak={streak} totalMinutes={totalMinutes} routinesCompleted={routinesCompleted} badges={badges} />
        <div style={{ background: '#232234', borderRadius: 14, padding: 14, margin: '0 0 18px 0', boxShadow: '0 2px 8px #0002', textAlign: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 17, color: '#8f8fdd', marginBottom: 10 }}>{t('profile.invite_friends')}</div>
          <button className="save-btn button-pop button-ripple" style={{ width: '80%', maxWidth: 280, fontSize: 17, padding: '10px 0' }} onClick={() => {
            navigator.clipboard.writeText(window.location.origin + '/register');
            setShowInviteCopied(true);
          }}>
            {t('profile.copy_invite_link')}
          </button>
        </div>
        <ProfileCustomization language={language} onLanguageChange={handleLanguageChange} />
        <ProfileAccountSettings onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} onChangePassword={handleChangePassword} />
        {showInviteCopied && <div className="copied-notification">{t('profile.copy_invite_link')}</div>}
        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  );
}
