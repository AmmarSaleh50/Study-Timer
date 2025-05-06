import React, { useEffect, useState, useRef } from 'react';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import useUserProfile from '../../hooks/useUserProfile';
import './styles/RoutineRunner.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getNowTimeStr() {
  const now = new Date();
  return now.toTimeString().slice(0,5);
}

function getCurrentTask(tasks) {
  const now = getNowTimeStr();
  for (let i = 0; i < tasks.length; i++) {
    if (now >= tasks[i].startTime && now < tasks[i].endTime) {
      return i;
    }
  }
  return -1;
}

function parseTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

const RoutineRunner = ({ hideUI = false }) => {
  const { user } = useUserProfile();
  const [userId, setUserId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const notificationRef = useRef(null);

  useEffect(() => {
    if (user) setUserId(user.uid);
  }, [user]);

  useEffect(() => {
    if (!userId) return;
    const fetchTodayRoutine = async () => {
      const today = DAYS[new Date().getDay()];
      const routineRef = doc(db, 'users', userId, 'routines', today);
      const routineSnap = await getDoc(routineRef);
      if (routineSnap.exists()) {
        setTasks(routineSnap.data().tasks || []);
      } else {
        setTasks([]);
      }
    };
    fetchTodayRoutine();
  }, [userId]);

  useEffect(() => {
    if (!tasks.length || !running) return;
    const updateCurrentTask = () => {
      const idx = getCurrentTask(tasks);
      if (idx !== currentIdx) {
        setCurrentIdx(idx);
        if (idx !== -1 && notificationRef.current) {
          notificationRef.current(`Now: ${tasks[idx].name}`);
        }
      }
      // update overall progress
      const startMin = parseTime(tasks[0].startTime);
      const endMin = parseTime(tasks[tasks.length - 1].endTime);
      const nowMin = parseTime(getNowTimeStr());
      const frac = Math.max(0, Math.min(1, (nowMin - startMin) / (endMin - startMin)));
      setProgress(frac * 100);
    };
    updateCurrentTask();
    const interval = setInterval(updateCurrentTask, 10000); // check every 10s
    return () => clearInterval(interval);
  }, [tasks, running, currentIdx]);

  // Notification logic
  useEffect(() => {
    notificationRef.current = (msg) => {
      if (window.Notification && Notification.permission === 'granted') {
        new Notification(msg);
      } else if (window.Notification && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(msg);
          }
        });
      } else {
        alert(msg);
      }
    };
  }, []);

  if (hideUI) return null;

  return (
    <div className="routine-runner">
      <h2>Today's Routine</h2>
      {!running ? (
        <button className="save-btn" onClick={() => setRunning(true)} style={{marginBottom: 20}}>Start Routine</button>
      ) : (
        <></>
      )}
      <ul className="routine-runner-list">
        {tasks.map((task, idx) => (
          <li
            key={idx}
            className={idx === currentIdx && running ? 'active-task' : ''}
            style={{ borderLeft: `8px solid ${task.color}` }}
          >
            <div><b>{task.name}</b> ({task.startTime} - {task.endTime})</div>
            <div>{task.description}</div>
            {idx === currentIdx && running && <span className="now-indicator">Now</span>}
          </li>
        ))}
      </ul>
      {running && (
        <div className="routine-progress">
          <div
            className="routine-progress-bar"
            style={{ width: `${progress}%`, background: tasks[currentIdx]?.color || '#47449c' }}
          />
          <div className="routine-progress-label">Routine Progress</div>
        </div>
      )}
      {running && currentIdx === -1 && <div className="routine-runner-wait">No active task right now.</div>}
    </div>
  );
};

export default RoutineRunner;
