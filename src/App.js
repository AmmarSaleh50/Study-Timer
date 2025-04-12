import React, { useState, useEffect} from 'react';

import { Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import './App.css';

/**
 * A simple separate component for showing the big timer screen.
 * Press "Stop" to return to the main page.
 */
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

function App() {
  // ========== Dark Mode ==========
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // ========== Topics / Courses ==========
  const [topics, setTopics] = useState(() => {
    const stored = localStorage.getItem('studyTopics');
    return stored ? JSON.parse(stored) : [];
  });
  const [newTopic, setNewTopic] = useState('');
  const [newTopicColor, setNewTopicColor] = useState('#47449c');

  // ========== Timer & Sessions ==========
  const [subject, setSubject] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [intervalId, setIntervalId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState('');
  // We'll show/hide the big Timer screen based on this:
  const [showTimerScreen, setShowTimerScreen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);


  // ========== On Mount: Load Sessions ==========
  useEffect(() => {
    const stored = localStorage.getItem('studySessions');
    if (stored) setSessions(JSON.parse(stored));
  }, []);

  // ========== Persist sessions after every change ==========
  useEffect(() => {
    localStorage.setItem('studySessions', JSON.stringify(sessions));
  }, [sessions]);

  // ========== Add a new topic/course ==========
  const addTopic = () => {
    const name = newTopic.trim();
    if (!name) return;
    // Check if already exists
    const exists = topics.some(t => t.name === name);
    if (!exists) {
      const updated = [...topics, { name, color: newTopicColor }];
      setTopics(updated);
      localStorage.setItem('studyTopics', JSON.stringify(updated));
    }
    // Reset input & color
    setNewTopic('');
    setNewTopicColor('#47449c');
  };

  // ========== Start Timer ==========
  const startTimer = () => {
    if (!subject || !topics.some(t => t.name === subject)) {
      setErrorMessage('Please select a study topic before starting.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    setStartTime(new Date());
    setTimerRunning(true);
    setShowTimerScreen(true);
  
    const id = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    setIntervalId(id);
  };
  

  // ========== Stop Timer ==========
  const stopTimer = () => {
    if (!timerRunning) return;
    clearInterval(intervalId);
    setTimerRunning(false);
    setShowTimerScreen(false); // Return to main page

    const endTime = new Date();
    const duration = Math.floor((endTime - startTime) / 1000);
    const newSession = {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      subject: subject,
      durationSeconds: duration,
    };
    setSessions(prev => [...prev, newSession]);
    setElapsedSeconds(0);
    // keep the subject selected, or clear it? Let's clear:
    setSubject('');
  };

  // ========== Update Topic Color ==========

  const updateTopicColor = (topicName, newColor) => {
    const updated = topics.map(t =>
      t.name === topicName ? { ...t, color: newColor } : t
    );
    setTopics(updated);
    localStorage.setItem('studyTopics', JSON.stringify(updated));
  };

  const removeTopic = topicName => {
    const updated = topics.filter(t => t.name !== topicName);
    setTopics(updated);
    localStorage.setItem('studyTopics', JSON.stringify(updated));
    if (subject === topicName) setSubject('');
  };
  

  // ========== Reset Data ==========
  const confirmReset = () => {
    setShowResetConfirm(true);
  };
  
  const handleResetConfirmed = () => {
    localStorage.removeItem('studySessions');
    setSessions([]);
    setShowResetConfirm(false);
  };
  
  const handleResetCancelled = () => {
    setShowResetConfirm(false);
  };
  
  // ========== Format Time Helper ==========
  const formatTime = seconds => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ========== Weekly Statistics ==========
  const getWeekKey = isoString => {
    const date = new Date(isoString);
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() + 4 - day);
    const year = date.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const weekNumber = Math.ceil(
      ((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7
    );
    return `${year}-W${weekNumber}`;
  };

  const groupSessionsByWeek = () => {
    const groups = {};
    sessions.forEach(session => {
      const key = getWeekKey(session.startTime);
      if (!groups[key]) groups[key] = {};
      const subj = session.subject;
      if (!groups[key][subj]) groups[key][subj] = 0;
      groups[key][subj] += session.durationSeconds;
    });
    return groups;
  };

  const groupedSessions = groupSessionsByWeek();
  const weeks = Object.keys(groupedSessions).sort();

  // If user selected a week, build the pie chart data
  let pieData = null;
  if (selectedWeek && groupedSessions[selectedWeek]) {
    const subjects = Object.keys(groupedSessions[selectedWeek]);
    const durations = subjects.map(subj => groupedSessions[selectedWeek][subj]);

    // Format labels as "2h 15m"
    const labels = subjects.map(subj => {
      const totalSeconds = groupedSessions[selectedWeek][subj];
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const label = `${h > 0 ? `${h}h ` : ''}${m > 0 || h === 0 ? `${m}m` : ''}`;
      return `${subj} (${label.trim()})`;
    });

    // Use topic color if it exists
    const backgroundColor = subjects.map(subj => {
      const topic = topics.find(t => t.name === subj);
      return topic?.color || '#ccc';
    });

    pieData = {
      labels,
      datasets: [
        {
          data: durations,
          backgroundColor,
        },
      ],
    };
  }

  // ========== If we are on the Timer Screen ==========
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

  // ========== Main Page UI ==========
  return (
    <div className="app-container">
      {/* Dark Mode Switch */}
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


      {/* Main Content */}
      <div style={{ fontFamily: 'Arial' }}>
        <h1>Study Timer</h1>

        {/* Add New Course Section */}
        <div
          style={{
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <label style={{ whiteSpace: 'nowrap' }}>Add new Course:</label>
          <input
            type="text"
            placeholder="e.g. Calculus"
            value={newTopic}
            onChange={e => setNewTopic(e.target.value)}
          />
          <input
            type="color"
            value={newTopicColor}
            onChange={e => setNewTopicColor(e.target.value)}
            title="Choose course color"
          />
          <button onClick={addTopic}>Add</button>
        </div>

        {/* Course Tags */}
        <div style={{ marginBottom: '20px' }}>
          <label>Study topics:</label>
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
                    color: isActive ? '#fff' : 'inherit',
                  }}
                  onClick={() =>
                    setSubject(prev => (prev === topic.name ? '' : topic.name))
                  }                  
                >
                  {topic.name}

                  {/* Color Picker */}
                  <input
                    type="color"
                    value={topic.color}
                    onClick={e => e.stopPropagation()}
                    onChange={e => updateTopicColor(topic.name, e.target.value)}
                    className="tag-color-picker"
                    title="Change color"
                  />

                  {/* Remove Button */}
                  <span
                    className="tag-remove"
                    title="Remove topic"
                    onClick={e => {
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

        {/* Error Message */}
        {errorMessage && (
          <div style={{ color: 'red', fontSize: '14px', marginTop: '5px' }}>
            {errorMessage}
          </div>
        )}

        {/* BIG "Start" Button */}
        {!timerRunning && (
          <button
            className="start-button"
            onClick={startTimer}
          >
            Start
          </button>
        )}

        <hr style={{ margin: '30px 0' }} />

        {/* Weekly Statistics */}
        <button onClick={() => setShowStats(!showStats)}>
          {showStats ? 'Hide Statistics' : 'View Statistics'}
        </button>
        {/* Reset Data Button */}
        <button onClick={confirmReset} style={{ marginTop: '10px' }}>
          Reset Data
        </button>

        {showResetConfirm && (
          <div className="modal-overlay">
            <div className="modal">
              <p>Are you sure you want to reset all study data?</p>
              <div className="modal-buttons">
                <button onClick={handleResetConfirmed} className="confirm">Yes</button>
                <button onClick={handleResetCancelled} className="cancel">Cancel</button>
              </div>
            </div>
          </div>
        )}



        {showStats && (
          <div style={{ marginTop: '20px' }}>
            <h2>Weekly Statistics</h2>
            {weeks.length > 0 ? (
              <>
                <label>
                  Select Week:
                  <select
                    value={selectedWeek}
                    onChange={e => setSelectedWeek(e.target.value)}
                    style={{ marginLeft: '10px' }}
                  >
                    <option value="">--Select--</option>
                    {weeks.map(week => (
                      <option key={week} value={week}>
                        {week}
                      </option>
                    ))}
                  </select>
                </label>
                {pieData && (
                  <div className="chart-container">
                    <Pie data={pieData} />
                  </div>
                )}
              </>
            ) : (
              <p>No study sessions recorded.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
