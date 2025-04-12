import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import './App.css';

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

// Helper: derive a week key (e.g. "2023-W15") from a given ISO date string.
// This is used to group study sessions.
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

// Helper: returns the Monday and Sunday of the current week.
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

// Helper: formats a Date object to a string like "Apr 7".
function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Helper: formats seconds into a concise string (e.g. "1h 30m").
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h > 0 ? h + 'h ' : ''}${m}m`;
}

// The new Weekly Stats Card component.
function WeeklyStatsCard({ sessionsData, topics }) {
  // sessionsData is an object: { subject: durationSeconds, ... } for the current week.
  const subjects = Object.keys(sessionsData || {});
  const totalDuration = subjects.reduce(
    (sum, subj) => sum + sessionsData[subj],
    0
  );

  // Build doughnut chart data.
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

  // Get the current week range.
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

function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const [topics, setTopics] = useState(() => {
    const stored = localStorage.getItem('studyTopics');
    return stored ? JSON.parse(stored) : [];
  });
  const [newTopic, setNewTopic] = useState('');
  const [newTopicColor, setNewTopicColor] = useState('#47449c');

  const [subject, setSubject] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [intervalId, setIntervalId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [showTimerScreen, setShowTimerScreen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('studySessions');
    if (stored) setSessions(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem('studySessions', JSON.stringify(sessions));
  }, [sessions]);

  const addTopic = () => {
    const name = newTopic.trim();
    if (!name) return;
    if (!topics.some((t) => t.name === name)) {
      const updated = [...topics, { name, color: newTopicColor }];
      setTopics(updated);
      localStorage.setItem('studyTopics', JSON.stringify(updated));
    }
    setNewTopic('');
    setNewTopicColor('#47449c');
  };

  const startTimer = () => {
    if (!subject || !topics.some((t) => t.name === subject)) {
      setErrorMessage('Please select a study topic before starting.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    setStartTime(new Date());
    setTimerRunning(true);
    setShowTimerScreen(true);
    const id = setInterval(() => setElapsedSeconds((prev) => prev + 1), 1000);
    setIntervalId(id);
  };

  const stopTimer = () => {
    if (!timerRunning) return;
    clearInterval(intervalId);
    setTimerRunning(false);
    setShowTimerScreen(false);
    const endTime = new Date();
    const duration = Math.floor((endTime - startTime) / 1000);
    const newSession = {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      subject,
      durationSeconds: duration
    };
    setSessions((prev) => [...prev, newSession]);
    setElapsedSeconds(0);
    setSubject('');
  };

  const updateTopicColor = (topicName, newColor) => {
    const updated = topics.map((t) =>
      t.name === topicName ? { ...t, color: newColor } : t
    );
    setTopics(updated);
    localStorage.setItem('studyTopics', JSON.stringify(updated));
  };

  const removeTopic = (topicName) => {
    const updated = topics.filter((t) => t.name !== topicName);
    setTopics(updated);
    localStorage.setItem('studyTopics', JSON.stringify(updated));
    if (subject === topicName) setSubject('');
  };

  const confirmReset = () => setShowResetConfirm(true);
  const handleResetConfirmed = () => {
    localStorage.removeItem('studySessions');
    setSessions([]);
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

  // Group study sessions by week.
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
      <div className="dark-toggle">
        <label className="switch">
          <input
            type="checkbox"
            checked={darkMode}
            onChange={() => setDarkMode((prev) => !prev)}
          />
          <span className="slider round"></span>
        </label>
        <span style={{ marginLeft: '10px' }}>Dark Mode</span>
      </div>

      <div style={{ fontFamily: 'Arial' }}>
        <h1>Study Timer</h1>

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

        <div style={{ marginBottom: '20px' }}>
          <label>Study Course:</label>
          <div className="topics-container">
            {topics.map((topic) => {
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
                    setSubject((prev) => (prev === topic.name ? '' : topic.name))
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

        {!timerRunning && (
          <button className="start-button" onClick={startTimer}>
            Start
          </button>
        )}

        <hr style={{ margin: '30px 0' }} />
       
      <div style={{ marginTop: '20px' }}>
        <WeeklyStatsCard sessionsData={currentWeekSessions} topics={topics} />
        </div>
      </div>

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

export default App;
