import React, { useState, useEffect } from 'react';
import '../styles/ProfilePage.css';
import ProfileAvatarEditor from './ProfileAvatarEditor';
import ProfileStatsCard from './ProfileStatsCard';
import ProfileAccountSettings from './ProfileAccountSettings';
import ProfileCustomization from './ProfileCustomization';
import ProfileUsernameEditor from './ProfileUsernameEditor';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

export default function ProfilePage() {
  // Simulate user info from localStorage
  const { t, i18n } = useTranslation();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const [username, setUsername] = React.useState(user.displayName || user.name || t('profile.defaultName'));
  const email = user.email || 'No email set';
  const [avatar, setAvatar] = React.useState(user.avatarUrl || null);
  const [theme, setTheme] = React.useState('dark');
  const [language, setLanguage] = React.useState('en');
  const [showInviteCopied, setShowInviteCopied] = React.useState(false);
  const [toast, setToast] = React.useState('');
  const [isGoogleUser, setIsGoogleUser] = React.useState(false);

  // Helper: get start/end of current week (Monday-Sunday)
  function getCurrentWeekRange() {
    const now = new Date();
    const day = now.getDay();
    // Monday as start (0=Sunday, so 1=Monday)
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { monday, sunday };
  }

  // Dummy stats for now
  const [streak, setStreak] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [routinesCompleted, setRoutinesCompleted] = useState(0);
  const badges = [streak >= 7 ? '7-Day Streak' : null, routinesCompleted >= 1 ? 'First Routine' : null].filter(Boolean);

  // Helper for streak label
  function streakLabel(count) {
    return count === 1 ? t('profileStatsCard.streakDay', { count }) : t('profileStatsCard.streakDays', { count });
  }

  function handleLogout() {
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  function handleDeleteAccount() {
    import('firebase/auth').then(({ deleteUser }) => {
      const { auth } = require('../firebase');
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
      const { auth } = require('../firebase');
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

  async function handleAvatarChange(newAvatar) {
    setAvatar(newAvatar);
    // Persist avatar to Firestore and localStorage
    if (!user?.uid) {
      showToast('User ID missing. Cannot save avatar.');
      return;
    }
    try {
      if (newAvatar === null) {
        await setDoc(doc(db, 'users', user.uid), { avatarUrl: null }, { merge: true });
      } else {
        await setDoc(doc(db, 'users', user.uid), { avatarUrl: newAvatar }, { merge: true });
      }
      const updatedUser = { ...user, avatarUrl: newAvatar };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      showToast('Profile photo updated!');
    } catch (err) {
      showToast('Failed to save avatar: ' + err.message);
    }
  }

  function handleUsernameChange(newUsername) {
    setUsername(newUsername);
    // Persist to Firestore
    if (user?.uid) {
      setDoc(doc(db, 'users', user.uid), { displayName: newUsername }, { merge: true });
    }
    // Persist to localStorage
    const updatedUser = { ...user, displayName: newUsername };
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }

  // Fetch stats from Firestore sessions
  useEffect(() => {
    async function fetchStats() {
      if (!user?.uid) return;
      try {
        const sessionsRef = collection(db, 'users', user.uid, 'sessions');
        const snapshot = await getDocs(sessionsRef);
        const sessions = snapshot.docs.map(doc => doc.data());

        // --- Total Minutes Studied: SUM of all sessions ever ---
        const totalSec = sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
        setTotalMinutes(Math.round(totalSec / 60));

        // --- Routines Completed: Count of finished weeks ---
        // Group sessions by week number (ISO week: Monday-Sunday)
        const weekMap = {};
        sessions.forEach(s => {
          if (!s.endTime) return;
          const date = new Date(s.endTime);
          // Get ISO week key: yyyy-Www
          const year = date.getFullYear();
          // ISO week: Monday as first day
          const d = new Date(date);
          d.setHours(0,0,0,0);
          d.setDate(d.getDate() + 4 - (d.getDay()||7));
          const week1 = new Date(d.getFullYear(),0,1);
          const week = Math.ceil((((d - week1) / 86400000) + week1.getDay()+1)/7);
          const weekKey = `${year}-W${week}`;
          if (!weekMap[weekKey]) weekMap[weekKey] = new Set();
          // JS getDay: 0=Sunday, 1=Monday, ... 6=Saturday; ISO: 1=Monday, 7=Sunday
          let isoDay = date.getDay();
          isoDay = isoDay === 0 ? 7 : isoDay;
          weekMap[weekKey].add(isoDay);
        });
        // Count weeks with all 7 days present
        let routinesDone = 0;
        Object.values(weekMap).forEach(daysSet => {
          if (daysSet.size === 7) routinesDone++;
        });
        setRoutinesCompleted(routinesDone);

        // --- Streak: consecutive days up to today with a session ---
        // Use all sessions, not just this week
        const daysSet = new Set();
        sessions.forEach(s => {
          if (s.endTime) {
            const d = new Date(s.endTime);
            daysSet.add(d.toISOString().slice(0, 10));
          }
        });
        let streakCount = 0;
        const today = new Date('2025-04-27T02:58:10+02:00'); // Use provided current time
        for (let i = 0; i < 365; ++i) { // up to 1 year
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          if (daysSet.has(key)) {
            streakCount++;
          } else {
            break;
          }
        }
        setStreak(streakCount);
      } catch (e) {
        // Optionally handle error
      }
    }
    fetchStats();
  }, [user?.uid]);

  React.useEffect(() => {
    // Detect if the user logged in with Google
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.providerData) {
      setIsGoogleUser(user.providerData.some(p => p.providerId === 'google.com'));
    } else if (window.firebase && window.firebase.auth) {
      // Fallback: try to get currentUser from firebase auth
      const currentUser = window.firebase.auth().currentUser;
      if (currentUser && currentUser.providerData) {
        setIsGoogleUser(currentUser.providerData.some(p => p.providerId === 'google.com'));
      }
    }
  }, []);

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
    <div className="profile-main-bg fade-slide-in">
      <div className="app-container card-animate">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: -80}}>
          <ProfileAvatarEditor avatarUrl={avatar} onAvatarChange={handleAvatarChange} initialLetter={username[0]} />
          <ProfileUsernameEditor username={username} onUsernameChange={handleUsernameChange} />
          <div style={{ color: 'var(--muted-text)', fontSize: 16, marginTop: -10, marginBottom: 14 }}>{email}</div>
        </div>
        <ProfileStatsCard streak={streak} totalMinutes={totalMinutes} routinesCompleted={routinesCompleted} badges={badges} />
        <div style={{ background: 'var(--card-bg)', borderRadius: 14, padding: 14, margin: '0 0 18px 0', boxShadow: '0 2px 8px #0002', textAlign: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 17, color: 'var(--accent-color)', marginBottom: 10 }}>{t('profile.invite_friends')}</div>
          <button
            className="save-btn button-pop button-ripple"
            style={{ width: '80%', maxWidth: 280, fontSize: 17, padding: '10px 0', background: 'var(--button-bg)', color: 'var(--button-text)' }}
            onClick={() => {
              navigator.clipboard.writeText(window.location.origin + '/register');
              showToast(t('profile.copied_invite_link'));
            }}
          >
            {t('profile.copy_invite_link')}
          </button>
        </div>
        <ProfileCustomization language={language} onLanguageChange={handleLanguageChange} />
        <ProfileAccountSettings
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
          onChangePassword={handleChangePassword}
          isGoogleUser={isGoogleUser}
        />
        {/* Centered toast for profile actions and copy invite link */}
        {toast && (
          <div className="profile-toast-centered">{toast}</div>
        )}
      </div>
    </div>
  );
}
