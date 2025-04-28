import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TodayRoutinePreview() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    async function fetchTodayRoutine() {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return;
      const userId = user.uid;
      const today = DAYS[new Date().getDay()];
      const routineRef = doc(db, 'users', userId, 'routines', today);
      const routineSnap = await getDoc(routineRef);
      if (routineSnap.exists()) {
        setTasks(routineSnap.data().tasks || []);
      } else {
        setTasks([]);
      }
      setLoading(false);
    }
    fetchTodayRoutine();
  }, []);

  if (loading) return <div style={{ margin: '18px 0', color: '#aaa' }}>{t('todayRoutine.loading')}</div>;

  return (
    <div className="homepage-card">
      <div style={{ fontWeight: 600, fontSize: 17, color: 'var(--accent-color)', marginBottom: 8 }}>{t('todayRoutine.title')}</div>
      {tasks.length === 0 ? (
        <div style={{ color: 'var(--muted-text)', fontSize: 15 }}>{t('todayRoutine.noTasks')}</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {tasks.map((task, idx) => (
            <li key={task.id || idx} style={{ padding: '7px 0', borderBottom: idx !== tasks.length-1 ? '1px solid var(--card-border)' : 'none', color: 'var(--muted-text)', fontSize: 15, display: 'flex', justifyContent: 'space-between' }}>
              <span>{task.name || <span style={{ color: 'var(--muted-text)' }}>{t('common.untitledTask')}</span>}</span>
              <span style={{ color: 'var(--muted-text)', fontSize: 14 }}>{task.startTime} - {task.endTime}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
