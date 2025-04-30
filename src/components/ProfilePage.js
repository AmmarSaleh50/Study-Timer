import React, { useState, useEffect } from 'react';
import '../styles/ProfilePage.css';
import '../styles/animations.css';
import ProfileAvatarEditor from './ProfileAvatarEditor';
import ProfileStatsCard from './ProfileStatsCard';
import ProfileAccountSettings from './ProfileAccountSettings';
import ProfileCustomization from './ProfileCustomization';
import ProfileUsernameEditor from './ProfileUsernameEditor';
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, onSnapshot, deleteDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import useUserProfile from '../hooks/useUserProfile';
import PageLoader from './PageLoader';
import { auth } from '../firebase';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
// Set to false after profile and stats loaded
const [profileLoaded, setProfileLoaded] = useState(false);
const [statsLoaded, setStatsLoaded] = useState(false);
  const {
    user,
    avatar,
    username,
    theme,
    language,
    updateAvatar,
    updateUsername,
    updateTheme,
    updateLanguage,
    clearUser,
  } = useUserProfile();
  const { t, i18n } = useTranslation();
  const email = user?.email || 'No email set';
  const [showInviteCopied, setShowInviteCopied] = React.useState(false);
  const [toast, setToast] = React.useState('');
  const [totalMinutes, setTotalMinutes] = React.useState(0);
  const [streak, setStreak] = React.useState(0);
  const [routinesCompleted, setRoutinesCompleted] = React.useState(0);
  const [badges, setBadges] = React.useState([]);
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
  const streakLabel = (count) => {
    return count === 1 ? t('profileStatsCard.streakDay', { count }) : t('profileStatsCard.streakDays', { count });
  };

  function handleLogout() {
    auth.signOut().then(() => {
      clearUser();
      window.location.href = '/login';
    });
  }

  async function deleteUserData(uid) {
    // Delete routines subcollection (if exists)
    const routinesCol = collection(db, "users", uid, "routines");
    const routinesSnap = await getDocs(routinesCol);
    for (const docSnap of routinesSnap.docs) {
      await deleteDoc(docSnap.ref);
    }
    // Delete user document
    await deleteDoc(doc(db, "users", uid));
  }

  function handleDeleteAccount() {
    import('firebase/auth').then(({ deleteUser }) => {
      const { auth } = require('../firebase');
      if (auth.currentUser) {
        const uid = auth.currentUser.uid;
        // Delete Firestore data first (entire user document and subcollections)
        deleteUserData(uid)
          .then(() => {
            // Then delete Auth user
            return deleteUser(auth.currentUser);
          })
          .then(() => {
            clearUser();
            window.location.href = '/register';
          })
          .catch(err => {
            showToast('Failed to delete account: ' + err.message);
          });
      } else {
        clearUser();
        window.location.href = '/register';
      }
    });
  }

  function handleChangePassword() {
    const currentUser = user;
    if (!currentUser?.email) {
      showToast('No email found for this account.');
      return;
    }
    import('firebase/auth').then(({ sendPasswordResetEmail }) => {
      const { auth } = require('../firebase');
      sendPasswordResetEmail(auth, currentUser.email)
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
    updateTheme(newTheme);
  }
  function handleLanguageChange(newLang) {
    updateLanguage(newLang);
    if (i18n.language !== newLang) {
      i18n.changeLanguage(newLang);
    }
  }

  async function handleAvatarChange(newAvatar) {
    await updateAvatar(newAvatar);
    showToast('Profile photo updated!');
  }

  function handleUsernameChange(newUsername) {
    updateUsername(newUsername);
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
      setStatsLoaded(true);
    }
    fetchStats();
  }, [user?.uid]);

  useEffect(() => {
    if (user && username && email) {
      setProfileLoaded(true);
    }
  }, [user, username, email]);

  useEffect(() => {
    if (profileLoaded && statsLoaded) {
      setLoading(false);
    }
  }, [profileLoaded, statsLoaded]);

  useEffect(() => {
    // Detect if the user logged in with Google
    if (user && user.providerData) {
      setIsGoogleUser(user.providerData.some(p => p.providerId === 'google.com'));
    } else if (window.firebase && window.firebase.auth) {
      const current = window.firebase.auth().currentUser;
      setIsGoogleUser(!!(current && current.providerData && current.providerData.some(p => p.providerId === 'google.com')));
    } else {
      setIsGoogleUser(false);
    }
  }, [user]);

  useEffect(() => {
    // Fetch language from Firestore if user is logged in
    async function fetchLanguage() {
      if (!user?.uid) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().language) {
          updateLanguage(userDoc.data().language);
          if (i18n.language !== userDoc.data().language) {
            i18n.changeLanguage(userDoc.data().language);
          }
        }
      } catch (e) { /* Optionally handle error */ }
    }
    fetchLanguage();
  }, [user?.uid, i18n]);

  useEffect(() => {
    // Change app language immediately when language changes
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  // Add effect to update body class on theme change
  useEffect(() => {
    if (theme === 'golden') {
      document.body.classList.add('golden-theme');
      document.body.classList.remove('purple-theme');
    } else if (theme === 'purple') {
      document.body.classList.add('purple-theme');
      document.body.classList.remove('golden-theme');
    } else {
      document.body.classList.remove('golden-theme');
      document.body.classList.remove('purple-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <PageLoader loading={loading}>
      <div className="profile-main-bg">
        <div className="app-container">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: -80}}>
          <ProfileAvatarEditor avatarUrl={avatar} onAvatarChange={handleAvatarChange} initialLetter={username[0]} />
            <ProfileUsernameEditor username={username} onUsernameChange={handleUsernameChange} />
            <div style={{ color: 'var(--muted-text)', fontSize: 16, marginTop: -10, marginBottom: 14 }}>{email}</div>
          </div>
          <div><ProfileStatsCard streak={streak} totalMinutes={totalMinutes} routinesCompleted={routinesCompleted} badges={badges} /></div>
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
        <div>
        <ProfileCustomization
          theme={theme}
          language={language}
          onThemeChange={handleThemeChange}
          onLanguageChange={handleLanguageChange}
        />
        </div>
        <div>
        <ProfileAccountSettings
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
          onChangePassword={handleChangePassword}
          isGoogleUser={isGoogleUser}
        />
        </div>
        {/* Centered toast for profile actions and copy invite link */}
        {toast && (
          <div className="profile-toast-centered">{toast}</div>
        )}
      </div>
    </div>
    </PageLoader>
  );
}
