import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import useUserProfile from '../hooks/useUserProfile';

export default function RecentActivity() {
  const { user } = useUserProfile();
  const { t } = useTranslation();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      if (!user?.uid) return;
      const userId = user.uid;
      const sessionsRef = collection(db, 'users', userId, 'sessions');
      const snapshot = await getDocs(sessionsRef);
      const sessionList = snapshot.docs.map(doc => doc.data());
      // Sort by endTime descending
      sessionList.sort((a, b) => (b.endTime || '').localeCompare(a.endTime || ''));
      setSessions(sessionList.slice(0, 3)); // Show 3 most recent
      setLoading(false);
    }
    fetchSessions();
  }, [user?.uid]);

  function formatDuration(mins, t) {
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const rem = mins % 60;
      if (rem === 0) {
        return `${hours} ${t('time.hour', 'hr')}`;
      } else {
        return `${hours} ${t('time.hour', 'hr')} ${rem} ${t('time.minute', 'min')}`;
      }
    }
    return `${mins} ${t('time.minute', 'min')}`;
  }

  if (loading) return <div className="homepage-card" style={{ margin: '18px 0', color: 'var(--muted-text)' }}>{t('recentActivity.loading')}</div>;

  return (
    <div className="homepage-card">
      <div style={{ fontWeight: 600, fontSize: 17, color: 'var(--accent-color)', marginBottom: 8 }}>{t('recentActivity.title')}</div>
      {sessions.length === 0 ? (
        <div style={{ color: 'var(--muted-text)', fontSize: 15 }}>{t('recentActivity.noSessions')}</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {sessions.map((s, idx) => (
            <li key={s.id || idx} style={{ padding: '7px 0', borderBottom: idx !== sessions.length-1 ? '1px solid var(--card-border)' : 'none', color: 'var(--muted-text)', fontSize: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{s.subject || <span style={{ color: 'var(--muted-text)' }}>{t('recentActivity.unknownSubject')}</span>}</span>
              <span style={{ color: 'var(--muted-text)', fontSize: 14 }}>{s.durationSeconds ? formatDuration(Math.round(s.durationSeconds/60), t) : ''}</span>
              <span style={{ color: 'var(--muted-text)', fontSize: 13 }}>{s.endTime ? new Date(s.endTime).toLocaleDateString() : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
