import React, { useState, useEffect, useRef } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import '../../styles/Timer.css';
import '../../styles/animations.css';

import { db } from "../../firebase";
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
import { canRead, canWrite, recordRead, recordWrite } from '../../firestoreQuotaGuard';
import FloatingLabelInput from '../../components/FloatingLabelInput';
import FloatingMusicPlayer from '../music/FloatingMusicPlayer';
import { useTranslation } from 'react-i18next';
import useUserProfile from '../../hooks/useUserProfile';
import PageLoader from '../../components/PageLoader';
import {
  getWeekKey,
  getWeekRange,
  formatSmartDuration,
  getLocalizedShortWeekdays
} from '../../utils/timerHelpers';
import TimerScreen from './TimerScreen';
import WeeklyStatsCard from './WeeklyStatsCard';
import TopicTag from './TopicTag';
import ResetModal from './ResetModal';

/* ============================================================================  
   Helper Functions  
============================================================================ */


/* ============================================================================  
   Timer Component  
   - Main component handling timer, sessions, topics, user actions and rendering.  
============================================================================ */
function Timer(props) {
  const { user, username } = useUserProfile();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState([]);
  const [topicsFetched, setTopicsFetched] = useState(false);
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
      if (!user?.uid) return;
      const userDocRef = doc(db, "users", user.uid);
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
  }, [user?.uid, t]); // eslint-disable-next-line react-hooks/exhaustive-deps

  // Fetch user's topics.
  useEffect(() => {
    const fetchTopics = async () => {
      if (!canRead()) {
        alert(t('dashboard.dailyFirestoreReadLimitReached'));
        setTopicsFetched(true);
        return;
      }
      if (!user?.uid) {
        setTopicsFetched(true);
        return;
      }
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);
      recordRead();
      const userData = userSnap.data();
      if (userData?.topics) {
        setTopics(userData.topics);
      }
      setTopicsFetched(true);
    };
    fetchTopics();
  }, [user?.uid, t]); // eslint-disable-next-line react-hooks/exhaustive-deps

  // --- Real-Time Sessions Sync Across Devices ---
  useEffect(() => {
    if (!user?.uid) return;
    const sessionsRef = collection(db, "users", user.uid, "sessions");
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
  }, [user?.uid, t]); // eslint-disable-next-line react-hooks/exhaustive-deps

  // --- Real-Time Timer State Sync Across Devices ---
  useEffect(() => {
    if (!user?.uid) return;
    const userDocRef = doc(db, "users", user.uid);

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
  }, [user?.uid, t]); // eslint-disable-next-line react-hooks/exhaustive-deps

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
    if (!user?.uid) return;
    const userDocRef = doc(db, "users", user.uid);
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
    if (!user?.uid) return;
    const userDocRef = doc(db, "users", user.uid);
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
    if (!user?.uid) return;
    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);
    recordRead();
    const timerData = userSnap.data()?.activeTimer;
    if (!timerData) return;
    const start = new Date(timerData.startTime);
    const end = new Date();
    // Subtract totalPausedDuration from total time
    const paused = timerData.totalPausedDuration || 0;
    let duration = Math.floor((end - start) / 1000 - paused);
    if (timerData.isPaused && timerData.lastPausedAt) {
      // If timer is currently paused, add the last paused period
      const lastPausedAt = new Date(timerData.lastPausedAt);
      duration = Math.floor((lastPausedAt - start) / 1000 - paused);
    }
    if (duration < 0) duration = 0;
    const sessionsRef = collection(db, "users", user.uid, "sessions");
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
    if (!user?.uid) return;
    const now = new Date();
    
    await updateDoc(doc(db, "users", user.uid), {
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
    if (!user?.uid) return;
    const now = new Date();
    if (!startTime || !lastPausedAt) return;
    const pausedDuration = Math.floor((now - lastPausedAt) / 1000);
    const newTotal = totalPausedDuration + pausedDuration;
  
    await updateDoc(doc(db, "users", user.uid), {
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
    if (!user?.uid) return;
    await updateDoc(doc(db, "users", user.uid), { topics: updated });
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
    if (!user?.uid) return;
    await updateDoc(doc(db, "users", user.uid), { topics: updated });
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
    if (!user?.uid) return;
    // Reset only study sessions (statistics), keep topics and activeTimer
    const sessionsRef = collection(db, "users", user.uid, "sessions");
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

  // Set loading to false when topics have been fetched
  useEffect(() => {
    if (user && topicsFetched) {
      setLoading(false);
    }
  }, [user, topicsFetched]);

  // If timer is active, show the TimerScreen.
  if (showTimerScreen) {
    return (
      <PageLoader loading={loading}>
        <div className="timer-main-bg">
          <div className="app-container">
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
      </PageLoader>
    );
  }

  return (
    <PageLoader loading={loading}>
      <div className="timer-main-bg ">
        <div className="app-container ">
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
            <div style={{ marginBottom: '20px' }} className="">
              <div className="pick-course-label">{t('dashboard.pickCourseToStudy')}</div>
              <div className="topics-container">
                {topics.map(topic => {
                  const isActive = subject === topic.name;
                  return (
                    <TopicTag
                      key={topic.name}
                      topic={topic}
                      isActive={isActive}
                      onSelect={() => handleSelectTopic(topic.name)}
                      onColorChange={updateTopicColor}
                      onRemove={() => {
                        if (timerRunning) {
                          setErrorMessage(t('dashboard.cantDeleteTopicsWhileTimerRunning'));
                          setTimeout(() => setErrorMessage(""), 3000);
                          return;
                        }
                        removeTopic(topic.name);
                      }}
                      timerRunning={timerRunning}
                      t={t}
                      subject={subject}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {errorMessage && (
            <div style={{ color: 'red', fontSize: '14px', marginTop: '5px' }} className="">
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
          <div style={{ marginTop: '20px' }} className="">
            <WeeklyStatsCard
              sessionsData={currentWeekSessions}
              topics={topics}
              sessions={sessions}
              t={t}
              i18n={i18n}
            />
          </div>

          {/* Reset Data Section */}
          <div className="reset-button-container">
          <button className="cancel-btn button-pop button-ripple" style={{ width: '100%', maxWidth: 280}} onClick={confirmReset}>
              {t('dashboard.resetStats')}
            </button>
          </div>

          {showResetConfirm && (
            <ResetModal open={showResetConfirm} onConfirm={handleResetConfirmed} onCancel={handleResetCancelled} t={t} />
          )}
        </div>
      </div>
    </div>
    </PageLoader>
  );
}

export default Timer;

