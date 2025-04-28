import React, { useState, useEffect, useRef } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import '../styles/RoutinesPage.css';
import '../styles/Timer.css';

import { db } from "../firebase";
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteField,
  deleteDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";
import { canRead, canWrite, recordRead, recordWrite } from '../firestoreQuotaGuard';
import FloatingLabelInput from './FloatingLabelInput';
import FloatingMusicPlayer from './FloatingMusicPlayer';
import { useTranslation } from 'react-i18next';

/* ============================================================================  
   Helper Functions  
============================================================================ */

// Returns a unique key for a given ISO date string based on the week of the year.
function getWeekKey(isoString) {
  const date = new Date(isoString);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() + 4 - day);
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNumber = Math.ceil(
    ((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${year}-W${weekNumber}`;
}

// Returns the Monday and Sunday of the week for a given date.
function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
}

// Formats a duration (in seconds) smartly as seconds, minutes, or hours + minutes, using localization.
function formatSmartDuration(seconds, t, i18n) {
  const isRTL = i18n && i18n.dir && i18n.dir() === 'rtl';
  if (seconds < 60) return `${seconds}${t ? 's' : ''}`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (isRTL) {
    if (hours > 0 && minutes > 0) return `${hours} ${t ? t('time.hour', 'h') : 'h'} ${minutes} ${t ? t('time.minute', 'm') : 'm'}`;
    if (hours > 0) return `${hours} ${t ? t('time.hour', 'h') : 'h'}`;
    return `${minutes} ${t ? t('time.minute', 'm') : 'm'}`;
  } else {
    if (hours > 0 && minutes > 0) return `${hours} ${t ? t('time.hour', 'h') : 'h'} ${minutes} ${t ? t('time.minute', 'm') : 'm'}`;
    if (hours > 0) return `${hours} ${t ? t('time.hour', 'h') : 'h'}`;
    return `${minutes} ${t ? t('time.minute', 'm') : 'm'}`;
  }
}

// --- i18n helper for localized weekday short names ---
const WEEKDAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getLocalizedShortWeekdays(t) {
  // Returns [Sun, Mon, ...] using t('dashboard.Mon') etc.
  return WEEKDAY_KEYS.map((key) => t(`dashboard.${key}`));
}

/* ============================================================================  
   TimerScreen Component  
============================================================================ */
const SPOTIFY_EMBED_URL = "https://open.spotify.com/embed/playlist/37i9dQZF1DXc8kgYqQLMfH"; // Chill Lofi Study Beats

function TimerScreen({ subject, elapsedSeconds, formatTime, stopTimer, isPaused, onPause, onResume, t, i18n }) {
  const [showSpotify] = useState(false);
  return (
    <div className="timer-screen card-animate">
      <h2>{t('dashboard.currentlyStudying')} {subject}</h2>
      <div className="big-timer">{formatTime(elapsedSeconds, t, i18n)}</div>
      <div className="timer-controls">
        <button 
          className={`control-button ${isPaused ? 'resume' : 'pause'} button-pop button-ripple`}
          onClick={isPaused ? onResume : onPause}
        >
          {isPaused ? t('dashboard.resume') : t('dashboard.pause')}
        </button>
        <button className="control-button stop button-pop button-ripple" onClick={stopTimer}>
          {t('dashboard.stop')}
        </button>
        {/* Spotify button removed as requested */}
      </div>
      {showSpotify && (
        <div style={{ marginTop: 24, width: '100%', maxWidth: 420 }}>
          <iframe
            title={t('dashboard.chillStudyPlaylist')}
            src={SPOTIFY_EMBED_URL}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ borderRadius: 12 }}
          ></iframe>
        </div>
      )}
    </div>
  );
}

/* ============================================================================  
   WeeklyStatsCard Component  
   - Renders tab navigation, Doughnut and Stacked Bar charts based on the view mode.  
============================================================================ */
function WeeklyStatsCard({ sessionsData, topics, sessions, t, i18n }) {
  const { t: t2 } = useTranslation();
  // Tab view state: 'week', 'today', or 'daily'
  const [viewMode, setViewMode] = useState("week");
  const tabs = ["today", "week", "daily"];
  const tabIndex = tabs.indexOf(viewMode);

  // Prepare display data for different view modes
  let displayData = {};
  if (viewMode === "week") {
    // Week view uses aggregated data passed as sessionsData.
    displayData = sessionsData;
  } else if (viewMode === "today") {
    // Aggregate today's sessions by subject.
    const todayStr = new Date().toISOString().split("T")[0];
    sessions.forEach((s) => {
      if (s.startTime.split("T")[0] === todayStr) {
        displayData[s.subject] = (displayData[s.subject] || 0) + s.durationSeconds;
      }
    });
  }
  
  // Calculate total duration and subject list (for week and today views)
  const subjects = Object.keys(displayData);
  const totalDuration = subjects.reduce((sum, subj) => sum + displayData[subj], 0);

  // Doughnut chart data (for 'week' and 'today' views)
  const doughnutChartData = {
    labels: subjects,
    datasets: [
      {
        data: subjects.map((subj) => displayData[subj]),
        backgroundColor: subjects.map((subj) => {
          const topic = topics.find((t) => t.name === subj);
          return topic ? topic.color : '#ccc';
        }),
        borderWidth: 0
      }
    ]
  };

  const doughnutChartOptions = {
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
    maintainAspectRatio: false,
    responsive: true,
    cutout: '60%'
  };

  // Daily view: Prepare data for a stacked bar chart
  let dailyChartData = null;
  let dailyChartOptions = null;
  if (viewMode === "daily") {
    // Create arrays of ISO day keys and labels for the current week.
    const { monday, sunday } = getWeekRange(new Date());
    const dayKeys = [];
    const dayLabels = [];
    const currentDate = new Date(monday);
    const localizedShortWeekdays = getLocalizedShortWeekdays(t2); // [So, Mo, ...] or [Sun, Mon, ...]
    let weekdayIdx = currentDate.getDay();
    while (currentDate <= sunday) {
      const isoDate = currentDate.toISOString().split("T")[0];
      dayKeys.push(isoDate);
      // Use localized short weekday name, e.g. 'Mo 8 Jul'
      const label = `${localizedShortWeekdays[weekdayIdx]} ${currentDate.getDate()}.${currentDate.getMonth()+1}`;
      dayLabels.push(label);
      currentDate.setDate(currentDate.getDate() + 1);
      weekdayIdx = (weekdayIdx + 1) % 7;
    }
    
    // Build datasets: one per topic with durations per day.
    const datasets = topics.map(topic => {
      const data = dayKeys.map(dayKey => {
        let sum = 0;
        sessions.forEach(s => {
          if (s.subject === topic.name && s.startTime.startsWith(dayKey)) {
            sum += s.durationSeconds;
          }
        });
        return sum;
      });
      return {
        label: topic.name,
        data,
        backgroundColor: topic.color
      };
    });
    
    dailyChartData = { labels: dayLabels, datasets };
    
    dailyChartOptions = {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${formatSmartDuration(value, t2, i18n)}`;
            }
          }
        }
      },
      responsive: true,
      scales: {
        x: { stacked: true },
        y: { 
          stacked: true,
          ticks: { callback: (value) => formatSmartDuration(value, t2, i18n) }
        }
      }
    };
  }

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        {/* Tab Navigation */}
        <div className='tabs-wrapper'>
          <div className="view-tabs">
            {tabs.map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`tab-button ${viewMode === mode ? 'active' : ''} button-pop button-ripple`}
              >
                {t(`dashboard.${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}
              </button>
            ))}
            <div
              className="tab-indicator"
              style={{ transform: `translateX(${tabIndex * 100}%)` }}
            />
          </div>
        </div> 
      </div>
      
      {viewMode === "daily" ? (
        // Render Daily Stacked Bar Chart
        <div className="stats-card-content" style={{ height: "300px" }}>
          {dailyChartData && (
            <Bar data={dailyChartData} options={dailyChartOptions} />
          )}
        </div>
      ) : (
        // Render Doughnut chart and list summary for 'week' and 'today' views.
        <div className="stats-card-content">
          {subjects.length > 0 ? (
            <>
              <div className="stats-chart" style={{ height: "220px" }}>
                <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
              </div>
              <div className="stats-details">
                <div className="total-study-time">
                  {t('dashboard.total')} {formatSmartDuration(totalDuration, t2, i18n)}
                </div>
                <ul className="stats-topics">
                  {subjects.map((subj) => (
                    <li key={subj} className="topic-line">
                      <span className="dot" style={{ backgroundColor: topics.find((t) => t.name === subj)?.color || 'var(--accent-color)' }}></span>
                      <span className="topic-name">{subj}</span>
                      <span className="topic-time">{formatSmartDuration(displayData[subj], t2, i18n)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="stats-no-sessions-message">{t('dashboard.noSessionsRecorded')}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================================  
   Timer Component  
   - Main component handling timer, sessions, topics, user actions and rendering.  
============================================================================ */
function Timer() {
  const { t, i18n } = useTranslation();
  // Timer and session related states.
  const [topics, setTopics] = useState([]);
  const [newTopic, setNewTopic] = useState('');
  const [newTopicColor, setNewTopicColor] = useState('var(--accent-color)');
  const [subject, setSubject] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // Remove intervalId from state and use ref instead.
  const intervalRef = useRef(null);
  const [sessions, setSessions] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [showTimerScreen, setShowTimerScreen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [totalPausedDuration, setTotalPausedDuration] = useState(0);
  const [lastPausedAt, setLastPausedAt] = useState(null);
  const [startTime, setStartTime] = useState(null);

  // --- Helper: Calculate streak from session list (array of {endTime}) ---
  function calculateStreak(sessions) {
    if (!Array.isArray(sessions) || sessions.length === 0) return 0;
    // Use local date (YYYY-MM-DD) instead of UTC to avoid timezone issues
    const toLocalDate = (iso) => {
      if (!iso) return null;
      const d = new Date(iso);
      return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    };
    const days = Array.from(new Set(sessions.map(s => toLocalDate(s.endTime)).filter(Boolean))).sort((a, b) => b.localeCompare(a)); // Descending
    // Debug: Log for troubleshooting
    if (typeof window !== 'undefined') {
      const today = toLocalDate(new Date().toISOString());
      console.log('[DEBUG] Session days:', days, 'Today:', today);
    }
    if (days.length === 0) return 0;
    let streak = 1;
    let prev = days[0];
    for (let i = 1; i < days.length; ++i) {
      const prevDate = new Date(prev);
      const curDate = new Date(days[i]);
      const diff = (prevDate - curDate) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        streak++;
        prev = days[i];
      } else if (diff > 1) {
        break;
      }
    }
    // Check if today is included in the streak; if not, streak is 0
    const todayStr = toLocalDate(new Date().toISOString());
    if (days[0] !== todayStr) return 0;
    return streak;
  }

  // --- Update streak in localStorage after sessions change ---
  useEffect(() => {
    if (!sessions || sessions.length === 0) {
      localStorage.setItem('studyStreak', '0');
      return;
    }
    const streak = calculateStreak(sessions);
    localStorage.setItem('studyStreak', String(streak));
  }, [sessions, t]);

  // Resume active timer if exists.
  useEffect(() => {
    const fetchTimer = async () => {
      if (!canRead()) {
        alert(t('dashboard.dailyFirestoreReadLimitReached'));
        return;
      }
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) return;
      const userId = user.uid;
      const userDocRef = doc(db, "users", userId);
      const userSnap = await getDoc(userDocRef);
      recordRead();
      const timerData = userSnap.data()?.activeTimer;
      if (timerData) {
        const start = new Date(timerData.startTime);
        setStartTime(start);
        setTotalPausedDuration(timerData.totalPausedDuration || 0);
        setIsPaused(timerData.isPaused || false);
        setLastPausedAt(timerData.lastPausedAt ? new Date(timerData.lastPausedAt) : null);
        
        // Calculate elapsed time
        let elapsed;
        if (timerData.isPaused) {
          elapsed = Math.floor((new Date(timerData.lastPausedAt) - start) / 1000 - (timerData.totalPausedDuration || 0));
        } else {
          elapsed = Math.floor((Date.now() - start) / 1000 - (timerData.totalPausedDuration || 0));
        }
        setElapsedSeconds(elapsed);
        
        // Start interval if not paused
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (!timerData.isPaused) {
          const id = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - start) / 1000 - (timerData.totalPausedDuration || 0)));
          }, 1000);
          intervalRef.current = id;
        }
      }
    };
    fetchTimer();
  }, [t]); // eslint-disable-next-line react-hooks/exhaustive-deps

  // Fetch user's topics.
  useEffect(() => {
    const fetchTopics = async () => {
      if (!canRead()) {
        alert(t('dashboard.dailyFirestoreReadLimitReached'));
        return;
      }
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) return;
      const userId = user.uid;
      const userDocRef = doc(db, "users", userId);
      const userSnap = await getDoc(userDocRef);
      recordRead();
      const userData = userSnap.data();
      if (userData?.topics) {
        setTopics(userData.topics);
      }
    };
    fetchTopics();
  }, [t]); // eslint-disable-next-line react-hooks/exhaustive-deps

  // --- Real-Time Sessions Sync Across Devices ---
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    const userId = user.uid;
    const sessionsRef = collection(db, "users", userId, "sessions");
    // Listen for real-time updates to sessions
    const unsubscribeSessions = onSnapshot(sessionsRef, (snapshot) => {
      if (!canRead()) {
        alert(t('dashboard.dailyFirestoreReadLimitReached'));
        return;
      }
      const sessionList = snapshot.docs.map((doc) => doc.data());
      recordRead();
      setSessions(sessionList);
    });
    return () => {
      unsubscribeSessions();
    };
  }, [t]); // eslint-disable-next-line react-hooks/exhaustive-deps

  // --- Real-Time Timer State Sync Across Devices ---
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    const userId = user.uid;
    const userDocRef = doc(db, "users", userId);

    let intervalId = null;
    let lastTimerRunning = timerRunning;
    let lastShowTimerScreen = showTimerScreen;

    // Listen for timer changes
    const unsubscribeTimer = onSnapshot(userDocRef, (docSnap) => {
      if (!canRead()) {
        alert(t('dashboard.dailyFirestoreReadLimitReached'));
        return;
      }
      if (docSnap.exists()) {
        const data = docSnap.data();
        const timerData = data.activeTimer;
        recordRead();
        if (timerData) {
          if (!lastTimerRunning) setTimerRunning(true);
          if (!lastShowTimerScreen) setShowTimerScreen(true);
          lastTimerRunning = true;
          lastShowTimerScreen = true;
          setSubject(timerData.subject);
          setStartTime(new Date(timerData.startTime));
          setTotalPausedDuration(timerData.totalPausedDuration || 0);
          setIsPaused(timerData.isPaused || false);
          setLastPausedAt(timerData.lastPausedAt ? new Date(timerData.lastPausedAt) : null);
          // Calculate elapsed seconds
          let elapsed;
          if (timerData.isPaused) {
            elapsed = Math.floor((new Date(timerData.lastPausedAt) - new Date(timerData.startTime)) / 1000 - (timerData.totalPausedDuration || 0));
          } else {
            elapsed = Math.floor((Date.now() - new Date(timerData.startTime)) / 1000 - (timerData.totalPausedDuration || 0));
          }
          setElapsedSeconds(elapsed > 0 ? elapsed : 0);
          // Start/clear interval for ticking
          if (intervalId) clearInterval(intervalId);
          if (!timerData.isPaused) {
            intervalId = setInterval(() => {
              const now = Date.now();
              const elapsed = Math.floor((now - new Date(timerData.startTime)) / 1000 - (timerData.totalPausedDuration || 0));
              setElapsedSeconds(elapsed > 0 ? elapsed : 0);
            }, 1000);
          }
        } else {
          lastTimerRunning = false;
          lastShowTimerScreen = false;
          setTimerRunning(false);
          setShowTimerScreen(false);
          setElapsedSeconds(0);
          setSubject("");
          if (intervalId) clearInterval(intervalId);
        }
      }
    });

    // Listen for topic changes
    const unsubscribeTopics = onSnapshot(userDocRef, (docSnap) => {
      if (!canRead()) {
        alert(t('dashboard.dailyFirestoreReadLimitReached'));
        return;
      }
      if (docSnap.exists()) {
        const data = docSnap.data();
        recordRead();
        if (data.topics) {
          setTopics(data.topics);
        }
      }
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
      unsubscribeTimer();
      unsubscribeTopics();
    };
    // Only run once on mount
    // eslint-disable-next-line
  }, [t]); // eslint-disable-next-line react-hooks/exhaustive-deps

  /* --------------------- User Action Handlers ---------------------- */

  // Add a new topic.
  const addTopic = async () => {
    if (!canWrite()) {
      alert(t('dashboard.dailyFirestoreWriteLimitReached'));
      return;
    }
    const name = newTopic.trim();
    if (!name) return;
    if (topics.some((t) => t.name === name)) return;
    const newEntry = { name, color: newTopicColor };
    const updated = [...topics, newEntry];
    setTopics(updated);
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    const userId = user.uid;
    const userDocRef = doc(db, "users", userId);
    await setDoc(userDocRef, { topics: updated }, { merge: true });
    recordWrite();
    setNewTopic("");
    setNewTopicColor("var(--accent-color)");
  };

  // Start the timer.
  const startTimer = async () => {
    if (!canWrite()) {
      alert(t('dashboard.dailyFirestoreWriteLimitReached'));
      return;
    }
    if (!subject || !topics.some((t) => t.name === subject)) {
      setErrorMessage(t('dashboard.selectStudyTopicBeforeStarting'));
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    const userId = user.uid;
    const userDocRef = doc(db, "users", userId);
    await setDoc(
      userDocRef,
      {
        activeTimer: {
          subject,
          startTime: new Date().toISOString(),
          totalPausedDuration: 0,
          isPaused: false,
          lastPausedAt: null
        }
      },
      { merge: true }
    );
    recordWrite();
    setIsPaused(false);
    setLastPausedAt(null);
    setTotalPausedDuration(0);
    setTimerRunning(true);
    setShowTimerScreen(true);
    const actualStart = new Date();
    setStartTime(actualStart);
    // Clear any existing intervals
    if (intervalRef.current) clearInterval(intervalRef.current);
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - actualStart) / 1000));
    }, 1000);
    intervalRef.current = id;
  };

  // Stop the timer and record the session.
  const stopTimer = async () => {
    if (!canRead() || !canWrite()) {
      alert(t('dashboard.dailyFirestoreQuotaReached'));
      return;
    }
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    const userId = user.uid;
    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);
    recordRead();
    const timerData = userSnap.data()?.activeTimer;
    if (!timerData) return;
    const start = new Date(timerData.startTime);
    const end = new Date();
    const duration = Math.floor((end - start) / 1000);
    const sessionsRef = collection(db, "users", userId, "sessions");
    await addDoc(sessionsRef, {
      subject: timerData.subject,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      durationSeconds: duration,
      createdAt: serverTimestamp()
    });
    recordWrite();
    setSessions((prev) => [
      ...prev,
      {
        subject: timerData.subject,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        durationSeconds: duration
      }
    ]);
    await updateDoc(userDocRef, {
      activeTimer: deleteField()
    });
    recordWrite();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimerRunning(false);
    setShowTimerScreen(false);
    setElapsedSeconds(0);
    setSubject("");
  };

  // Add pause/resume handlers
  const handlePause = async () => {
    if (!canWrite()) {
      alert(t('dashboard.dailyFirestoreWriteLimitReached'));
      return;
    }
    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user.uid;
    const now = new Date();
    
    await updateDoc(doc(db, "users", userId), {
      'activeTimer.isPaused': true,
      'activeTimer.lastPausedAt': now.toISOString(),
    });
    recordWrite();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPaused(true);
    setLastPausedAt(now);
  };

  const handleResume = async () => {
    if (!canWrite()) {
      alert(t('dashboard.dailyFirestoreWriteLimitReached'));
      return;
    }
    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user.uid;
    const now = new Date();
    if (!startTime || !lastPausedAt) return;
    const pausedDuration = Math.floor((now - lastPausedAt) / 1000);
    const newTotal = totalPausedDuration + pausedDuration;
  
    await updateDoc(doc(db, "users", userId), {
      'activeTimer.isPaused': false,
      'activeTimer.totalPausedDuration': newTotal,
      'activeTimer.lastPausedAt': null,
    });
    recordWrite();
    setTotalPausedDuration(newTotal);
    setIsPaused(false);
    
    // Clear any existing interval before starting a new one
    if (intervalRef.current) clearInterval(intervalRef.current);
    const id = setInterval(() => {
      const currentElapsed = Math.floor((Date.now() - startTime.getTime()) / 1000 - newTotal);
      setElapsedSeconds(currentElapsed > 0 ? currentElapsed : 0);
    }, 1000);
    intervalRef.current = id;
  };

  // Update the color for a specific topic.
  const updateTopicColor = async (topicName, newColor) => {
    if (!canWrite()) {
      alert(t('dashboard.dailyFirestoreWriteLimitReached'));
      return;
    }
    const updated = topics.map((t) =>
      t.name === topicName ? { ...t, color: newColor } : t
    );
    setTopics(updated);
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    const userId = user.uid;
    await updateDoc(doc(db, "users", userId), { topics: updated });
    recordWrite();
  };

  // Remove a topic.
  const removeTopic = async (topicName) => {
    if (!canWrite()) {
      alert(t('dashboard.dailyFirestoreWriteLimitReached'));
      return;
    }
    const updated = topics.filter((t) => t.name !== topicName);
    setTopics(updated);
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    const userId = user.uid;
    await updateDoc(doc(db, "users", userId), { topics: updated });
    recordWrite();
    if (subject === topicName) setSubject("");
  };

  // Confirm and handle reset of all study data.
  const confirmReset = () => setShowResetConfirm(true);

  const handleResetConfirmed = async () => {
    if (!canRead() || !canWrite()) {
      alert(t('dashboard.dailyFirestoreQuotaReached'));
      return;
    }
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    const userId = user.uid;
    // Reset only study sessions (statistics), keep topics and activeTimer
    const sessionsRef = collection(db, "users", userId, "sessions");
    const snapshot = await getDocs(sessionsRef);
    recordRead();
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
    recordWrite();
    setSessions([]);
    localStorage.removeItem('studySessions');
    setShowResetConfirm(false);
  };

  const handleResetCancelled = () => setShowResetConfirm(false);

  // Format seconds to HH:MM:SS
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Group sessions by week.
  const groupSessionsByWeek = () => {
    const groups = {};
    sessions.forEach((session) => {
      const key = getWeekKey(session.startTime);
      if (!groups[key]) groups[key] = {};
      const subj = session.subject;
      if (!groups[key][subj]) groups[key][subj] = 0;
      groups[key][subj] += session.durationSeconds;
    });
    return groups;
  };

  const groupedSessions = groupSessionsByWeek();
  const currentWeekKey = getWeekKey(new Date().toISOString());
  const currentWeekSessions = groupedSessions[currentWeekKey] || {};

  // --- Prevent changing subject while timer is running ---
  const handleSelectTopic = (topicName) => {
    if (timerRunning) {
      setErrorMessage(t('dashboard.cantChangeStudyTopicWhileTimerRunning'));
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }
    // If the clicked topic is already selected, deselect it
    if (subject === topicName) {
      setSubject("");
      return;
    }
    setSubject(topicName);
  };

  /* --------------------- Render Logic ---------------------- */

  // If timer is active, show the TimerScreen.
  if (showTimerScreen) {
    return (
      <div className="dashboard-main-bg fade-slide-in">
        <div className="app-container card-animate">
          <TimerScreen
            subject={subject}
            elapsedSeconds={elapsedSeconds}
            formatTime={(seconds) => formatTime(seconds)}
            stopTimer={stopTimer}
            isPaused={isPaused}
            onPause={handlePause}
            onResume={handleResume}
            t={t}
            i18n={i18n}
          />
          <FloatingMusicPlayer />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-bg fade-slide-in">
      <div className="app-container card-animate">
        <div style={{ fontFamily: 'Arial' }}>
          <h1 className="routines-title heading-animate">{t('dashboard.studyTimer')}</h1>

          {/* Add New Topic Section */}
          <div className="add-topic-inline-row" style={{ display: 'flex', alignItems: 'stretch', width: '100%', gap: 0 }}>
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', minWidth: 0 }}>
              <FloatingLabelInput
                type="text"
                label={t('dashboard.topicNameAndColor')}
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                name="new-topic"
                required
                rightElement={
                  <input
                    type="color"
                    value={newTopicColor}
                    onChange={e => setNewTopicColor(e.target.value)}
                    className="topic-color-picker-inline"
                    title={t('dashboard.pickColorForTopic')}
                    style={{ border: 'none', background: 'none', width: 32, height: 32, borderRadius: 6, boxShadow: '0 1px 4px #232234', cursor: 'pointer', display: 'inline-block', verticalAlign: 'middle', padding: 0 }}
                  />
                }
              />
            </div>
            <button
              type="button"
              className="button-pop button-ripple add-topic-btn"
              style={{ marginLeft: 16, padding: '12px 18px', fontWeight: 600, fontSize: '1em', borderRadius: 8, height: 48, alignSelf: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={addTopic}
              disabled={!newTopic.trim()}
            >
              +
            </button>
          </div>

          {/* Separator after Add button */}
          <hr className="separator" />

          {/* Select Active Topic */}
          {topics.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div className="pick-course-label">{t('dashboard.pickCourseToStudy')}</div>
              <div className="topics-container">
                {topics.map(topic => {
                  const isActive = subject === topic.name;
                  return (
                    <div
                      key={topic.name}
                      className={`topic-tag ${isActive ? 'active' : ''}`}
                      style={{
                        borderColor: topic.color,
                        backgroundColor: isActive ? topic.color : 'transparent',
                        color: isActive ? '#fff' : topic.color, // Use topic color for text if not active
                        fontWeight: 600,
                        letterSpacing: '0.01em',
                      }}
                      onClick={() => handleSelectTopic(topic.name)}
                    >
                      {topic.name}
                      <input
                        type="color"
                        value={topic.color}
                        onClick={e => e.stopPropagation()}
                        onChange={e => updateTopicColor(topic.name, e.target.value)}
                        className="tag-color-picker"
                        title={t('dashboard.changeColor')}
                        disabled={timerRunning}
                      />
                      <span
                        className="tag-remove"
                        title={t('dashboard.removeTopic')}
                        onClick={e => {
                          e.stopPropagation();
                          if (timerRunning) {
                            setErrorMessage(t('dashboard.cantDeleteTopicsWhileTimerRunning'));
                            setTimeout(() => setErrorMessage(""), 3000);
                            return;
                          }
                          removeTopic(topic.name);
                        }}
                        style={{
                          cursor: timerRunning ? 'not-allowed' : 'pointer',
                          color: '#ba2f3d',
                          marginLeft: 8,
                          opacity: timerRunning ? 0.5 : 1,
                          fontWeight: 'bold',
                          fontSize: '1.2em',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: timerRunning ? '#eee' : 'transparent',
                          transition: 'background 0.2s',
                          border: '1.5px solid #ba2f3d',
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" style={{ display: 'block' }}>
                          <line x1="2" y1="2" x2="10" y2="10" stroke="#ba2f3d" strokeWidth="2" strokeLinecap="round" />
                          <line x1="10" y1="2" x2="2" y2="10" stroke="#ba2f3d" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {errorMessage && (
            <div style={{ color: 'red', fontSize: '14px', marginTop: '5px' }}>
              {errorMessage}
            </div>
          )}

          {/* Timer Control */}
          {timerRunning && !showTimerScreen && (
            <div className="timer-link">
              <button className="start-button button-pop button-ripple" onClick={() => setShowTimerScreen(true)}>
                {t('dashboard.backToTimer')}
              </button>
            </div>
          )}
          {!timerRunning ? (
            <button
              className="save-btn"
              onClick={startTimer}
              disabled={topics.length === 0 || !subject}
              style={{width: '100%', height: '40px',padding: '0 18px', borderRadius: 8}}
            >
              {t('dashboard.start')}
            </button>
          ) : null}

          {/* Separator between Start button and Stats card */}
          <hr className="separator" />

          {/* Weekly Stats Card */}
          <div style={{ marginTop: '20px' }}>
            <WeeklyStatsCard
              sessionsData={currentWeekSessions}
              topics={topics}
              sessions={sessions}
              t={t}
              i18n={i18n}
            />
          </div>

          {/* Separator for Dashboard section */}
          <div className="separator"></div>

          {/* Reset Data Section */}
          <div className="reset-button-container">
          <button className="cancel-btn button-pop button-ripple" style={{ width: '100%', maxWidth: 280}} onClick={confirmReset}>
              {t('dashboard.resetStats')}
            </button>
          </div>

          {showResetConfirm && (
            <div className="modal-overlay">
              <div className="modal" style={{ padding: '20px' }}>
                <p>{t('dashboard.confirmResetStats')}</p>
                <div className="modal-buttons">
                  <button onClick={handleResetConfirmed} className="confirm button-pop button-ripple">
                    {t('dashboard.yesResetStats')}
                  </button>
                  <button onClick={handleResetCancelled} className="cancel-btn button-pop button-ripple" style={{  background: "var(--card-bg)", color: "var(--accent-color)", minWidth: 20, height: 40, fontSize: 16, padding: "0 18px", borderRadius: 8, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: -5, border: "1.5px solid var(--accent-color)" }}>
                    {t('dashboard.cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Timer;
