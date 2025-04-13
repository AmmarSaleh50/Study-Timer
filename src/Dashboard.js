// Dashboard.js
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
   Displays the current study session information: subject, formatted timer,
   and a stop button.
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

/**
 * Computes a week key (e.g. "2023-W15") from an ISO date string.
 */
function getWeekKey(isoString) {
  const date = new Date(isoString);
  const day = (date.getDay() + 6) % 7; // Adjust so Monday = 0
  date.setDate(date.getDate() + 4 - day);
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNumber = Math.ceil(
    ((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${year}-W${weekNumber}`;
}

/**
 * Returns the Monday and Sunday of the week for a given date.
 */
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

/**
 * Formats a Date object to a short date string (e.g., "Apr 7").
 */
function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Converts seconds into a concise duration string (e.g., "1h 30m").
 */
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h > 0 ? h + 'h ' : ''}${m}m`;
}

/* -------------------------------------------------------------------------
   WeeklyStatsCard Component
   Displays the weekly study stats using a doughnut chart and details.
-------------------------------------------------------------------------- */
function WeeklyStatsCard({ sessionsData, topics }) {
  // Get subjects and total study duration
  const subjects = Object.keys(sessionsData || {});
  const totalDuration = subjects.reduce(
    (sum, subj) => sum + sessionsData[subj],
    0
  );

  // Prepare chart data with colors set from the topics list.
  const chartData = {
    labels: subjects,
    datasets: [
      {
        data: subjects.map((subj) => sessionsData[subj]),
        backgroundColor: subjects.map((subj) => {
          const topic = topics.find((t) => t.name === subj);
          return topic ? topic.color : '#ccc';
        })
      }
    ]
  };

  const { monday, sunday } = getWeekRange(new Date());
  const weekRangeStr = `${formatDate(monday)} – ${formatDate(sunday)}`;

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h2>{weekRangeStr}</h2>
      </div>
      {subjects.length > 0 ? (
        <div className="stats-card-content">
          <div className="stats-chart">
            <Doughnut data={chartData} />
          </div>
          <div className="stats-details">
            <div className="total-study-time">
              {formatDuration(totalDuration)}
            </div>
            <ul className="stats-topics">
              {subjects.map((subj) => (
                <li key={subj}>
                  <span
                    className="dot"
                    style={{
                      backgroundColor:
                        (topics.find((t) => t.name === subj)?.color) || '#ccc'
                    }}
                  ></span>
                  {subj}: {formatDuration(sessionsData[subj])}
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
   Main component managing study timer operations, topics, user sessions,
   and data reset functionality.
-------------------------------------------------------------------------- */
function Dashboard() {
  // ---------- State Variables ----------
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

  // ---------- Side Effects ----------
  // Set dark mode on body and store user preference.
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Check and resume active timer if exists when component mounts.
  useEffect(() => {
    const fetchTimer = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
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

  // Fetch user's topics from Firestore.
  useEffect(() => {
    const fetchTopics = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
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

  // Fetch user's study sessions from Firestore.
  useEffect(() => {
    const fetchSessions = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      const userId = user.uid;
      const sessionsRef = collection(db, "users", userId, "sessions");

      const snapshot = await getDocs(sessionsRef);
      const sessionList = snapshot.docs.map((doc) => doc.data());

      setSessions(sessionList);
    };

    fetchSessions();
  }, []);

  // ---------- User Actions ----------
  /**
   * Sign out the user and clear local storage.
   */
  const handleSignOut = async () => {
    await signOut(auth);
    localStorage.removeItem("user");
    navigate("/login");
  };

  /**
   * Adds a new study topic.
   */
  const addTopic = async () => {
    const name = newTopic.trim();
    if (!name) return;
    if (topics.some((t) => t.name === name)) return;

    const newEntry = { name, color: newTopicColor };
    const updated = [...topics, newEntry];
    setTopics(updated);

    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user.uid;
    const userDocRef = doc(db, "users", userId);

    await setDoc(userDocRef, { topics: updated }, { merge: true });

    setNewTopic("");
    setNewTopicColor("#47449c");
  };

  /**
   * Starts the timer for the selected subject.
   */
  const startTimer = async () => {
    if (!subject || !topics.some((t) => t.name === subject)) {
      setErrorMessage("Please select a study topic before starting.");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user.uid;
    const userDocRef = doc(db, "users", userId);

    // Store active timer data in Firestore.
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

  /**
   * Stops the active timer, records the session data, and clears the active timer.
   */
  const stopTimer = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user.uid;
    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);

    const timerData = userSnap.data()?.activeTimer;
    if (!timerData) return;

    const start = new Date(timerData.startTime);
    const end = new Date();
    const duration = Math.floor((end - start) / 1000);

    // Save session data in Firestore.
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

    // Remove active timer from the user's document.
    await updateDoc(userDocRef, {
      activeTimer: deleteField()
    });

    if (intervalId) clearInterval(intervalId);
    setTimerRunning(false);
    setShowTimerScreen(false);
    setElapsedSeconds(0);
    setSubject("");
  };

  /**
   * Updates the color for a specific topic.
   */
  const updateTopicColor = async (topicName, newColor) => {
    const updated = topics.map((t) =>
      t.name === topicName ? { ...t, color: newColor } : t
    );
    setTopics(updated);

    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user.uid;
    await updateDoc(doc(db, "users", userId), { topics: updated });
  };

  /**
   * Removes a study topic.
   */
  const removeTopic = async (topicName) => {
    const updated = topics.filter((t) => t.name !== topicName);
    setTopics(updated);

    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user.uid;
    await updateDoc(doc(db, "users", userId), { topics: updated });

    if (subject === topicName) setSubject("");
  };

  /**
   * Initiates data reset confirmation.
   */
  const confirmReset = () => setShowResetConfirm(true);

  /**
   * Handles confirmed data reset: deletes sessions, clears topics and active timer.
   */
  const handleResetConfirmed = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const userId = user.uid;

    // Delete all session documents.
    const sessionsRef = collection(db, "users", userId, "sessions");
    const snapshot = await getDocs(sessionsRef);
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);

    // Clear topics and active timer.
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, {
      topics: [],
      activeTimer: deleteField()
    });

    // Clear local state.
    setSessions([]);
    setTopics([]);
    localStorage.removeItem('studySessions');
    setShowResetConfirm(false);
  };

  /**
   * Cancels the data reset operation.
   */
  const handleResetCancelled = () => setShowResetConfirm(false);

  /**
   * Formats seconds into a HH:MM:SS string.
   */
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Groups study sessions by week using the week key.
   */
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

  // Determine current week sessions for stats card.
  const groupedSessions = groupSessionsByWeek();
  const currentWeekKey = getWeekKey(new Date().toISOString());
  const currentWeekSessions = groupedSessions[currentWeekKey] || {};

  // ---------- Render Components ----------
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
      {/* Sign Out Button */}
      <div style={{ position: "absolute", top: 20, right: 20 }}>
        <button onClick={handleSignOut} style={{ padding: "6px 12px", cursor: "pointer" }}>
          Sign Out
        </button>
      </div>

      {/* Dark Mode Toggle */}
      <div className="dark-toggle">
        <label className="switch">
          <input
            type="checkbox"
            checked={darkMode}
            onChange={() => setDarkMode(prev => !prev)}
          />
          <span className="slider round"></span>
        </label>
        <span style={{ marginLeft: '10px' }}>Dark Mode</span>
      </div>

      <div style={{ fontFamily: 'Arial' }}>
        <h1>Study Timer</h1>

        {/* Add New Topic */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
