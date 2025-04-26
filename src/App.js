import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import RoutinesPage from "./RoutinesPage";
import ForgotPassword from "./ForgotPassword";
import HomePage from "./HomePage";
import RoutineChatPage from "./RoutineChatPage";
import ProfilePage from "./ProfilePage";
import './animations.css';
import { db } from "./firebase";
import { setDoc, doc } from "firebase/firestore";
import BottomNavBar from './components/BottomNavBar';
import { useTranslation } from 'react-i18next';

function AppInner() {
  const { t, i18n } = useTranslation();
  const [showUpdate, setShowUpdate] = useState(false);
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const isAuth = !!user;

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

  const updateApp = () => {
    if (window.swRegistration && window.swRegistration.waiting) {
      window.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

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
        <Route path="/" element={isAuth ? <HomePage /> : <Navigate to="/login" replace />} />
        <Route path="/home" element={isAuth ? <HomePage /> : <Navigate to="/login" replace />} />
        <Route path="/timer" element={isAuth ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="/routines" element={isAuth ? <RoutinesPage /> : <Navigate to="/login" replace />} />
        <Route path="/routine-chat" element={isAuth ? <RoutineChatWithImport /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={isAuth ? <ProfilePage /> : <Navigate to="/login" replace />} />
      </Routes>
      {/* Show BottomNavBar only for authenticated users and not on auth pages */}
      {isAuth && !["/login", "/register", "/forgot-password"].includes(location.pathname) && (
        <BottomNavBar />
      )}
    </div>
  );
}

// Helper wrapper to wire up handleImportRoutine from RoutinesPage to RoutineChatPage
function RoutineChatWithImport() {
  const { t } = useTranslation();
  // Use state to store routines and handler
  const [routines, setRoutines] = React.useState({});
  const [userId, setUserId] = React.useState(null);

  React.useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) setUserId(user.uid);
  }, []);

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

  return <RoutineChatPage onImportRoutine={handleImportRoutine} />;
}

export default function App() {
  return (
    <Router>
      <AppInner />
    </Router>
  );
}
