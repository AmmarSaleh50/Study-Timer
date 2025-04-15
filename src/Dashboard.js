import React, { useState, useEffect, useRef } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import './App.css';
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db, auth } from "./firebase";
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

// Formats a duration (in seconds) smartly as seconds, minutes, or hours + minutes.
function formatSmartDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

/* ============================================================================  
   TimerScreen Component  
============================================================================ */
function TimerScreen({ subject, elapsedSeconds, formatTime, stopTimer, isPaused, onPause, onResume }) {
  return (
    <div className="timer-screen">
      <h2>Currently Studying: {subject}</h2>
      <div className="big-timer">{formatTime(elapsedSeconds)}</div>
      <div className="timer-controls">
        <button 
          className={`control-button ${isPaused ? 'resume' : 'pause'}`}
          onClick={isPaused ? onResume : onPause}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button className="control-button stop" onClick={stopTimer}>
          Stop
        </button>
      </div>
    </div>
  );
}

/* ============================================================================  
   WeeklyStatsCard Component  
   - Renders tab navigation, Doughnut and Stacked Bar charts based on the view mode.  
============================================================================ */
function WeeklyStatsCard({ sessionsData, topics, sessions }) {
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
    while (currentDate <= sunday) {
      const isoDate = currentDate.toISOString().split("T")[0];
      dayKeys.push(isoDate);
      dayLabels.push(
        currentDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        })
      );
      currentDate.setDate(currentDate.getDate() + 1);
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
              return `${label}: ${formatSmartDuration(value)}`;
            }
          }
        }
      },
      responsive: true,
      scales: {
        x: { stacked: true },
        y: { 
          stacked: true,
          ticks: { callback: (value) => formatSmartDuration(value) }
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
                className={`tab-button ${viewMode === mode ? 'active' : ''}`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
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
                  {formatSmartDuration(totalDuration)}
                </div>
                <ul className="stats-topics">
                  {subjects.map((subj) => (
                    <li key={subj} className="topic-line">
                      <span className="dot" style={{ backgroundColor: topics.find((t) => t.name === subj)?.color || '#ccc' }}></span>
                      <span className="topic-name">{subj}</span>
                      <span className="topic-time">{formatSmartDuration(displayData[subj])}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p>No study sessions recorded for this view.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================================  
   Dashboard Component  
   - Main component handling timer, sessions, topics, user actions and rendering.  
============================================================================ */
function Dashboard() {
  const navigate = useNavigate();

  // Timer and session related states.
  const [topics, setTopics] = useState([]);
  const [newTopic, setNewTopic] = useState('');
  const [newTopicColor, setNewTopicColor] = useState('#47449c');
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

  // Card background color state (persist in localStorage)
  const [cardBg, setCardBg] = useState(() => {
    return localStorage.getItem('cardBg') || '#232234';
  });
  useEffect(() => {
    localStorage.setItem('cardBg', cardBg);
  }, [cardBg]);

  // Resume active timer if exists.
  useEffect(() => {
    const fetchTimer = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) return;
      const userId = user.uid;
      const userDocRef = doc(db, "users", userId);
      const userSnap = await getDoc(userDocRef);
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
        if (!timerData.isPaused) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          const id = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - start) / 1000 - (timerData.totalPausedDuration || 0)));
          }, 1000);
          intervalRef.current = id;
        }
      }
    };
    fetchTimer();
  }, []);

  // Fetch user's topics.
  useEffect(() => {
    const fetchTopics = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) return;
      const userId = user.uid;
      const userDocRef = doc(db, "users", userId);
      const userSnap = await getDoc(userDocRef);
      const userData = userSnap.data();
      if (userData?.topics) {
        setTopics(userData.topics);
      }
    };
    fetchTopics();
  }, []);

  // --- Real-Time Sessions Sync Across Devices ---
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    const userId = user.uid;
    const sessionsRef = collection(db, "users", userId, "sessions");
    // Listen for real-time updates to sessions
    const unsubscribeSessions = onSnapshot(sessionsRef, (snapshot) => {
      const sessionList = snapshot.docs.map((doc) => doc.data());
      setSessions(sessionList);
    });
    return () => {
      unsubscribeSessions();
    };
  }, []);

  // --- Real-Time Timer State Sync Across Devices ---
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    const userId = user.uid;
    const userDocRef = doc(db, "users", userId);

    let intervalId = null;
    // Listen for timer changes
    const unsubscribeTimer = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const timerData = data.activeTimer;
        if (timerData) {
          setTimerRunning(true);
          setShowTimerScreen(true);
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
      if (docSnap.exists()) {
        const data = docSnap.data();
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
  }, []);

  /* --------------------- User Action Handlers ---------------------- */

  // Sign Out user.
  const handleSignOut = async () => {
    await signOut(auth);
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Add a new topic.
  const addTopic = async () => {
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
    setNewTopic("");
    setNewTopicColor("#47449c");
  };

  // Start the timer.
  const startTimer = async () => {
    if (!subject || !topics.some((t) => t.name === subject)) {
      setErrorMessage("Please select a study topic before starting.");
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
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - actualStart.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);
    intervalRef.current = id;
  };

  // Stop the timer and record the session.
  const stopTimer = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    const userId = user.uid;
    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);
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
    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user.uid;
    const now = new Date();
    
    await updateDoc(doc(db, "users", userId), {
      'activeTimer.isPaused': true,
      'activeTimer.lastPausedAt': now.toISOString(),
    });
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPaused(true);
    setLastPausedAt(now);
  };

  const handleResume = async () => {
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
    const updated = topics.map((t) =>
      t.name === topicName ? { ...t, color: newColor } : t
    );
    setTopics(updated);
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    const userId = user.uid;
    await updateDoc(doc(db, "users", userId), { topics: updated });
  };

  // Remove a topic.
  const removeTopic = async (topicName) => {
    const updated = topics.filter((t) => t.name !== topicName);
    setTopics(updated);
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    const userId = user.uid;
    await updateDoc(doc(db, "users", userId), { topics: updated });
    if (subject === topicName) setSubject("");
  };

  // Confirm and handle reset of all study data.
  const confirmReset = () => setShowResetConfirm(true);

  const handleResetConfirmed = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    const userId = user.uid;
    const sessionsRef = collection(db, "users", userId, "sessions");
    const snapshot = await getDocs(sessionsRef);
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, {
      topics: [],
      activeTimer: deleteField()
    });
    setSessions([]);
    setTopics([]);
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
  const currentUser = JSON.parse(localStorage.getItem("user"));

  // --- Prevent changing subject while timer is running ---
  const handleSelectTopic = (topicName) => {
    if (timerRunning) {
      setErrorMessage("You can't change your study topic while a timer is running.");
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

  // --- Drawer State ---
  const [drawerOpen, setDrawerOpen] = useState(false);

  // --- Touch gesture for opening drawer on mobile ---
  const touchStartX = useRef(null);
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e) => {
    if (touchStartX.current !== null) {
      const deltaX = e.touches[0].clientX - touchStartX.current;
      if (deltaX > 60 && touchStartX.current < 40) {
        setDrawerOpen(true);
        touchStartX.current = null;
      }
    }
  };
  const handleTouchEnd = () => {
    touchStartX.current = null;
  };

  // Add touch listeners to the main container
  useEffect(() => {
    const container = document.getElementById('main-app-container');
    if (!container) return;
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  /* --------------------- Render Logic ---------------------- */

  // If timer is active, show the TimerScreen.
  if (showTimerScreen) {
    return (
      <div id="main-app-container" className="app-container" style={{ backgroundColor: cardBg }}>
        {/* Drawer overlay and drawer */}
        <div className={`drawer-overlay${drawerOpen ? ' open' : ''}`} onClick={() => setDrawerOpen(false)} />
        <nav className={`drawer${drawerOpen ? ' open' : ''}`}
          style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ height: '38px' }} />
          <div className="drawer-color-picker" style={{ marginBottom: 24 }}>
            <label>Card Color:</label>
            <input
              type="color"
              value={cardBg}
              onChange={e => setCardBg(e.target.value)}
            />
          </div>
          <div className="drawer-actions">
            {currentUser ? (
              <button onClick={handleSignOut}>Sign Out</button>
            ) : (
              <>
                <button onClick={() => navigate('/login')}>Sign In</button>
                <button onClick={() => navigate('/register')}>Register</button>
              </>
            )}
          </div>
        </nav>
        {/* Drawer open button (three centered slashes) */}
        <button className="drawer-open-btn" onClick={() => setDrawerOpen(true)}>
          <span className="drawer-slashes">
            <span className="drawer-slash"></span>
            <span className="drawer-slash"></span>
            <span className="drawer-slash"></span>
          </span>
        </button>
        <TimerScreen
          subject={subject}
          elapsedSeconds={elapsedSeconds}
          formatTime={formatTime}
          stopTimer={stopTimer}
          isPaused={isPaused}
          onPause={handlePause}
          onResume={handleResume}
        />
        {/* Back to Main Page button below card */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
          <button
            className="back-to-main-btn"
            style={{
              background: 'none',
              border: 'none',
              color: '#aaa',
              fontSize: '14px',
              textDecoration: 'underline',
              cursor: 'pointer',
              marginTop: 10
            }}
            onClick={() => setShowTimerScreen(false)}
          >
        ←Back to Main Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="main-app-container" className="app-container" style={{ backgroundColor: cardBg }}>
      {/* Drawer open button (three centered slashes only) */}
      <button className="drawer-open-btn" onClick={() => setDrawerOpen(true)}>
        <span className="drawer-slashes">
          <span className="drawer-slash"></span>
          <span className="drawer-slash"></span>
          <span className="drawer-slash"></span>
        </span>
      </button>
      <div className={`drawer-overlay${drawerOpen ? ' open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <nav className={`drawer${drawerOpen ? ' open' : ''}`}
        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ height: '38px' }} />
        <div className="drawer-color-picker" style={{ marginBottom: 24 }}>
          <label>Card Color:</label>
          <input
            type="color"
            value={cardBg}
            onChange={e => setCardBg(e.target.value)}
          />
        </div>
        <div className="drawer-actions">
          {currentUser ? (
            <button onClick={handleSignOut}>Sign Out</button>
          ) : (
            <>
              <button onClick={() => navigate('/login')}>Sign In</button>
              <button onClick={() => navigate('/register')}>Register</button>
            </>
          )}
        </div>
      </nav>
      <div style={{ fontFamily: 'Arial' }}>
        <h1>Study Timer</h1>

        {/* Add New Topic Section */}
        <div className="add-course-wrapper">
          <label style={{ whiteSpace: 'nowrap' }}>Add new Course:</label>
          <input
            type="text"
            placeholder="e.g. Calculus"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
          />
          <input
            type="color"
            value={newTopicColor}
            onChange={(e) => setNewTopicColor(e.target.value)}
            title="Choose course color"
          />
          <button onClick={addTopic}>Add</button>
        </div>

        {/* Select Active Topic */}
        <div style={{ marginBottom: '20px' }}>
          <label>Study Course:</label>
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
                    color: isActive ? '#fff' : 'inherit'
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
                    title="Change color"
                    disabled={timerRunning}
                  />
                  <span
                    className="tag-remove"
                    title="Remove topic"
                    onClick={e => {
                      e.stopPropagation();
                      if (timerRunning) {
                        setErrorMessage("You can't delete topics while a timer is running.");
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

        {errorMessage && (
          <div style={{ color: 'red', fontSize: '14px', marginTop: '5px' }}>
            {errorMessage}
          </div>
        )}

        {/* Timer Control */}
        {timerRunning && !showTimerScreen && (
          <div className="timer-link">
            <button className="start-button" onClick={() => setShowTimerScreen(true)}>
              Back to Timer
            </button>
          </div>
        )}
        {!timerRunning ? (
          <button className="start-button" onClick={startTimer}>
            Start
          </button>
        ) : null}

        <hr style={{ margin: '30px 0' }} />

        {/* Weekly Stats Card */}
        <div style={{ marginTop: '20px' }}>
          <WeeklyStatsCard
            sessionsData={currentWeekSessions}
            topics={topics}
            sessions={sessions}
          />
        </div>
      </div>

      {/* Reset Data Section */}
      <div className="reset-button-container">
        <button className="reset-button" onClick={confirmReset}>
          Reset Data
        </button>
      </div>

      {showResetConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <p>Are you sure you want to reset all study data?</p>
            <div className="modal-buttons">
              <button onClick={handleResetConfirmed} className="confirm">
                Yes
              </button>
              <button onClick={handleResetCancelled} className="cancel">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
