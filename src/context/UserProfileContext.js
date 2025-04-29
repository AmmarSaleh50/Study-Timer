import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const UserProfileContext = createContext();

export function UserProfileProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Defensive derivation: handle undefined user
  const avatar = useMemo(() =>
    (user && (user.avatarUrl || user.avatarBase64)) ? (user.avatarUrl || user.avatarBase64) : null,
    [user]
  );
  const username = useMemo(() =>
    (user && (user.displayName || user.name)) ? (user.displayName || user.name) : '',
    [user]
  );
  const theme = useMemo(() =>
    (user && user.theme) ? user.theme : (localStorage.getItem('theme') || 'dark'),
    [user]
  );
  const language = useMemo(() =>
    (user && user.language) ? user.language : (localStorage.getItem('language') || 'en'),
    [user]
  );

  // Listen to Firestore for real-time updates ONCE for the session
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Merge Firestore data with local user
        const merged = { ...user, ...data };
        setUser(merged);
        // Sync to localStorage
        localStorage.setItem('user', JSON.stringify(merged));
        if (data.theme) localStorage.setItem('theme', data.theme);
        if (data.language) localStorage.setItem('language', data.language);
      }
      setLoading(false);
    }, (err) => {
      setError(err);
      setLoading(false);
    });
    return () => unsub();
    // eslint-disable-next-line
  }, [user?.uid]);

  // Listen to Firebase Auth state and clear user if signed out
  useEffect(() => {
    let unsubscribeAuth;
    import('../firebase').then(({ auth }) => {
      unsubscribeAuth = auth.onAuthStateChanged((firebaseUser) => {
        if (!firebaseUser) {
          setUser(null);
          localStorage.removeItem('user');
          localStorage.removeItem('theme');
          localStorage.removeItem('language');
        }
      });
    });
    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  // Update helpers
  const updateAvatar = useCallback(async (newAvatar) => {
    if (!user?.uid) return;
    await setDoc(doc(db, 'users', user.uid), { avatarUrl: newAvatar }, { merge: true });
  }, [user]);

  const updateUsername = useCallback(async (newUsername) => {
    if (!user?.uid) return;
    await setDoc(doc(db, 'users', user.uid), { displayName: newUsername }, { merge: true });
  }, [user]);

  const updateTheme = useCallback(async (newTheme) => {
    if (!user?.uid) return;
    await setDoc(doc(db, 'users', user.uid), { theme: newTheme }, { merge: true });
    localStorage.setItem('theme', newTheme);
  }, [user]);

  const updateLanguage = useCallback(async (newLang) => {
    if (!user?.uid) return;
    await setDoc(doc(db, 'users', user.uid), { language: newLang }, { merge: true });
    localStorage.setItem('language', newLang);
  }, [user]);

  // For login/register: setUser directly
  const setUserFromAuth = useCallback((profileObj) => {
    setUser(profileObj);
    localStorage.setItem('user', JSON.stringify(profileObj));
    if (profileObj.theme) localStorage.setItem('theme', profileObj.theme);
    if (profileObj.language) localStorage.setItem('language', profileObj.language);
  }, []);

  // For logout/delete: clear everything
  const clearUser = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('theme');
    localStorage.removeItem('language');
  }, []);

  const value = {
    user,
    avatar,
    username,
    theme,
    language,
    loading,
    error,
    setUserFromAuth,
    clearUser,
    updateAvatar,
    updateUsername,
    updateTheme,
    updateLanguage
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfileCtx() {
  return useContext(UserProfileContext);
}
