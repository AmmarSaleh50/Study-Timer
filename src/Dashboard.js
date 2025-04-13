// src/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
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
  serverTimestamp
} from "firebase/firestore";

/* -------------------------------------------------------------------------
   TimerScreen Component
-------------------------------------------------------------------------- */
function TimerScreen({ subject, elapsedSeconds, formatTime, stopTimer }) {
  return (
    <div className="timer-screen">
      <h2>Currently Studying: {subject}</h2>
      <div className="big-timer">{formatTime(elapsedSeconds)}</div>
      <button className="stop-button" onClick={stopTimer}>
        Stop
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Helper Functions
-------------------------------------------------------------------------- */
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

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* -------------------------------------------------------------------------
   WeeklyStatsCard Component
-------------------------------------------------------------------------- */
function WeeklyStatsCard({ sessionsData, topics }) {
  const subjects = Object.keys(sessionsData || {});
  const totalDuration = subjects.reduce(
    (sum, subj) => sum + sessionsData[subj],
    0
  );

  const chartData = {
    labels: subjects,
    datasets: [
      {
        data: subjects.map((subj) => sessionsData[subj]),
        backgroundColor: subjects.map((subj) => {
          const topic = topics.find((t) => t.name === subj);
          return topic ? topic.color : '#ccc';
        }),
        borderWidth: 0
      }
    ]
  };

  const chartOptions = {
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false
      }
    },
    maintainAspectRatio: false,
    responsive: true,
    cutout: '60%'
  };

  const { monday, sunday } = getWeekRange(new Date());
  const weekRangeStr = `${formatDate(monday)} – ${formatDate(sunday)}`;

  const formatSmartDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
  
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
  
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };
  
  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h2>{weekRangeStr}</h2>
      </div>
      {subjects.length > 0 ? (
        <div className="stats-card-content">
          <div className="stats-chart" style={{ height: "220px" }}>
            <Doughnut data={chartData} options={chartOptions} />
          </div>
          <div className="stats-details">
            <div className="total-study-time">
              {formatSmartDuration(totalDuration)}
            </div>
            <ul className="stats-topics">
              {subjects.map((subj) => (
                <li key={subj}>
                  <span
                    className="dot"
                    style={{
                      backgroundColor:
                        topics.find((t) => t.name === subj)?.color || '#ccc'
                    }}
                  ></span>
                  {subj}: {formatSmartDuration(sessionsData[subj])}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p>No study sessions recorded for the current week.</p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Dashboard Component
-------------------------------------------------------------------------- */
function Dashboard() {
  const [darkMode, setDarkMode] = useState(() =>
    localStorage.getItem('darkMode') === 'true'
  );
  const navigate = useNavigate();

  // Timer and session related states
  const [topics, setTopics] = useState([]);
  const [newTopic, setNewTopic] = useState('');
  const [newTopicColor, setNewTopicColor] = useState('#47449c');
  const [subject, setSubject] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [intervalId, setIntervalId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [showTimerScreen, setShowTimerScreen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Set dark mode on body.
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Resume active timer if exists.
  useEffect(() => {
    const fetchTimer = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) return;
      const userId = user.uid;
      const userDocRef = doc(db, "users", userId);
      const userSnap = await getDoc(userDocRef);
      const timerData = userSnap.data()?.activeTimer;
      if (!timerData) return;
      const start = new Date(timerData.startTime);
      setSubject(timerData.subject);
      setTimerRunning(true);
      setShowTimerScreen(true);
      const id = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
        setElapsedSeconds(elapsed);
      }, 1000);
      setIntervalId(id);
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

  // Fetch user's sessions.
  useEffect(() => {
    const fetchSessions = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) return;
      const userId = user.uid;
      const sessionsRef = collection(db, "users", userId, "sessions");
      const snapshot = await getDocs(sessionsRef);
      const sessionList = snapshot.docs.map((doc) => doc.data());
      setSessions(sessionList);
    };
    fetchSessions();
  }, []);

  // ---------- User Actions ----------
  const handleSignOut = async () => {
    await signOut(auth);
    localStorage.removeItem("user");
    navigate("/login");
  };

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
          startTime: new Date().toISOString()
        }
      },
      { merge: true }
    );
    setTimerRunning(true);
    setShowTimerScreen(true);
    const actualStart = new Date();
    const id = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - actualStart.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);
    setIntervalId(id);
  };

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
    if (intervalId) clearInterval(intervalId);
    setTimerRunning(false);
    setShowTimerScreen(false);
    setElapsedSeconds(0);
    setSubject("");
  };

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

  const removeTopic = async (topicName) => {
    const updated = topics.filter((t) => t.name !== topicName);
    setTopics(updated);
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    const userId = user.uid;
    await updateDoc(doc(db, "users", userId), { topics: updated });
    if (subject === topicName) setSubject("");
  };

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

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

  // Read current user for header.
  const currentUser = JSON.parse(localStorage.getItem("user"));

  // ---------- Render ----------
  if (showTimerScreen) {
    return (
      <div className="app-container">
        <TimerScreen
          subject={subject}
          elapsedSeconds={elapsedSeconds}
          formatTime={formatTime}
          stopTimer={stopTimer}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="header-controls">
        <div className="header-buttons">
          {currentUser ? (
            <button onClick={handleSignOut} style={{ padding: "6px 12px", cursor: "pointer" }}>
              Sign Out
            </button>
          ) : (
            <>
              <button onClick={() => navigate("/login")}>Login</button>
              <button onClick={() => navigate("/register")}>Register</button>
            </>
          )}
        </div>

        <div className="dark-toggle">
          <label className="switch">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => setDarkMode((prev) => !prev)}
            />
            <span className="slider round"></span>
          </label>
          <span>Dark Mode</span>
        </div>
      </div>

      <div style={{ fontFamily: 'Arial' }}>
        <h1>Study Timer</h1>

        {/* Add New Topic */}
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
                  onClick={() =>
                    setSubject(prev => (prev === topic.name ? '' : topic.name))
                  }
                >
                  {topic.name}
                  <input
                    type="color"
                    value={topic.color}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateTopicColor(topic.name, e.target.value)}
                    className="tag-color-picker"
                    title="Change color"
                  />
                  <span
                    className="tag-remove"
                    title="Remove topic"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTopic(topic.name);
                    }}
                  >
                    ❌
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

        {/* Start Timer Button */}
        {!timerRunning && (
          <button className="start-button" onClick={startTimer}>
            Start
          </button>
        )}

        <hr style={{ margin: '30px 0' }} />

        {/* Weekly Stats Card */}
        <div style={{ marginTop: '20px' }}>
          <WeeklyStatsCard sessionsData={currentWeekSessions} topics={topics} />
        </div>
      </div>

      {/* Reset Data */}
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
