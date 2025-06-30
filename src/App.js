import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Login from "./features/auth/Login";
import Register from "./features/auth/Register";
import Timer from "./features/timer/Timer";
import RoutinesPage from "./features/routines/RoutinesPage";
import ForgotPassword from "./features/auth/ForgotPassword";
import HomePage from "./features/home/HomePage";
import RoutineChatPage from "./features/chat/RoutineChatPage";
import ProfilePage from "./features/profile/ProfilePage";
import './styles/animations.css';
import './styles/App.css';
import './styles/HomePage.css';
import './styles/Timer.css';
import './styles/RoutinesPage.css';
import './styles/RoutineChatPage.css';
import './styles/ProfilePage.css';
import './styles/RoutineRunner.css';
import './styles/Onboarding.css';
import './styles/ProfilePage.css';
import { db } from "./firebase";
import { setDoc, doc} from "firebase/firestore";
import BottomNavBar from './components/BottomNavBar';
import Onboarding from './components/Onboarding';
import { useTranslation } from 'react-i18next';
import { UserProfileProvider } from './context/UserProfileContext';
import InteractiveDotBackground from './components/InteractiveDotBackground';
import { ThemeProvider } from './context/ThemeProvider';

function AppInner() {
  const { t, i18n } = useTranslation();
  const [showUpdate, setShowUpdate] = useState(false);
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const isAuth = !!user;
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('onboardingComplete'));

  useEffect(() => {
    const storedVersion = localStorage.getItem("app-version");
    const currentVersion = document.querySelector('meta[name="app-version"]')?.content;
    if (currentVersion && currentVersion !== storedVersion) {
      localStorage.setItem("app-version", currentVersion);
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    // Listen for service worker update event
    const handler = () => setShowUpdate(true);
    window.addEventListener('swUpdated', handler);
    return () => window.removeEventListener('swUpdated', handler);
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      const storedRoutines = localStorage.getItem('routines');
      if (storedRoutines) {
        const routines = JSON.parse(storedRoutines);
        const newRoutines = {};
        for (const day in routines) {
          newRoutines[day] = routines[day];
        }
        localStorage.setItem('routines', JSON.stringify(newRoutines));
      }
    }
  }, []);

  const updateApp = () => {
    if (window.swRegistration && window.swRegistration.waiting) {
      window.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  const [routines, setRoutines] = React.useState({});


  function normalizeRoutineObject(routineObj) {
    const DAYS = [
      t('common.monday'),
      t('common.tuesday'),
      t('common.wednesday'),
      t('common.thursday'),
      t('common.friday'),
      t('common.saturday'),
      t('common.sunday')
    ];
    const normalized = {};
    for (const dayKey in routineObj) {
      const canonicalDay = DAYS.find(d => d.toLowerCase() === dayKey.toLowerCase());
      if (!canonicalDay) continue;
      const dayVal = routineObj[dayKey];
      if (Array.isArray(dayVal)) {
        normalized[canonicalDay] = dayVal;
      } else if (typeof dayVal === 'object' && dayVal !== null) {
        normalized[canonicalDay] = Object.entries(dayVal).map(([subject, times]) => ({
          name: subject,
          startTime: times.start_time || times.startTime || '',
          endTime: times.end_time || times.endTime || '',
        }));
      }
    }
    return normalized;
  }

  // Import handler copied from RoutinesPage
  const handleImportRoutine = async (routineObj) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const userId = user && user.uid;
    if (!userId || !routineObj) return;
    let daysObj = routineObj.weekly_study_routine || routineObj;
    daysObj = normalizeRoutineObject(daysObj);
    const DAYS = [
      t('common.monday'),
      t('common.tuesday'),
      t('common.wednesday'),
      t('common.thursday'),
      t('common.friday'),
      t('common.saturday'),
      t('common.sunday')
    ];
    for (const day of DAYS) {
      const tasks = Array.isArray(daysObj[day]) ? daysObj[day] : [];
      try {
        await setDoc(doc(db, 'users', userId, 'routines', day), { tasks });
        console.log(`${t('common.savedTasksFor')} ${day}:`, tasks);
      } catch (e) {
        console.error(`${t('common.failedToSaveTasksFor')} ${day}:`, e);
      }
    }
    // Optionally, update local state immediately for better UX
    const newRoutines = { ...routines };
    for (const day of DAYS) {
      newRoutines[day] = Array.isArray(daysObj[day]) ? daysObj[day] : [];
    }
    setRoutines(newRoutines);
    console.log(`${t('common.routineImportComplete')}:`, newRoutines);
  };


  // Background preset
  const [bgPreset, setBgPreset] = React.useState(() => localStorage.getItem('bg-preset') || 'dots');
  React.useEffect(() => {
    const handler = () => setBgPreset(localStorage.getItem('bg-preset') || 'dots');
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Add this effect to toggle the geometric-bg-active class
  React.useEffect(() => {
    if (bgPreset === 'none') {
      document.body.classList.add('geometric-bg-active');
    } else {
      document.body.classList.remove('geometric-bg-active');
    }
  }, [bgPreset]);

  if (isAuth && showOnboarding) {
    return <Onboarding onFinish={() => {
      setShowOnboarding(false);
      localStorage.setItem('onboardingComplete', 'true');
    }} />;
  }

  // Wait until i18n is initialized with the correct language
  if (!i18n.isInitialized) {
    return <div />; // Or a loading spinner
  }

  // Redirect all non-auth users to /login unless already on /login or /register or /forgot-password
  if (!isAuth && !["/login", "/register", "/forgot-password"].includes(location.pathname)) {
    return <Navigate to="/login" replace />;
  }

  // Prevent going back to timer/home/routines if not logged in
  if (!isAuth && ["/", "/home", "/timer", "/routines"].includes(location.pathname)) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div>
      {bgPreset === 'dots' && <InteractiveDotBackground />}
      {/* Removed Theme Toggle Button from Top Right */}
      {showUpdate && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
          background: '#232234', color: '#fff', padding: '16px', textAlign: 'center', boxShadow: '0 -2px 12px #0007',
        }}>
          <span>{t('common.updateAvailable')}</span>
          <button style={{ marginLeft: 18 }} onClick={updateApp}>{t('common.updateNow')}</button>
        </div>
      )}
      <Routes location={location}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/onboarding" element={isAuth ? <Onboarding onFinish={() => {
          setShowOnboarding(false);
          localStorage.setItem('onboardingComplete', 'true');
        }} /> : <Navigate to="/login" replace />} />
        <Route path="/" element={isAuth ? <HomePage /> : <Navigate to="/login" replace />} />
        <Route path="/home" element={isAuth ? <HomePage /> : <Navigate to="/login" replace />} />
        <Route path="/timer" element={isAuth ? <Timer /> : <Navigate to="/login" replace />} />
        <Route path="/routines" element={isAuth ? <RoutinesPage /> : <Navigate to="/login" replace />} />
        <Route path="/routine-chat" element={isAuth ? <RoutineChatPage onImportRoutine={handleImportRoutine} /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={isAuth ? <ProfilePage /> : <Navigate to="/login" replace />} />
      </Routes>
      {/* Show BottomNavBar only for authenticated users and not on auth pages */}
      {isAuth && !["/login", "/register", "/forgot-password"].includes(location.pathname) && (
        <BottomNavBar />
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <UserProfileProvider>
        <ThemeProvider>
          <AppInner />
        </ThemeProvider>
      </UserProfileProvider>
    </Router>
  );
}
