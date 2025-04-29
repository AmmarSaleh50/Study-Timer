import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useUserProfile from '../hooks/useUserProfile';
import '../styles/HomePage.css';
import TodayRoutinePreview from './TodayRoutinePreview';
import RecentActivity from './RecentActivity';

export default function HomePage() {
  // Use centralized user profile hook
  const { user, avatar, username } = useUserProfile();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userName = username || user?.displayName || user?.name || t('home.student');
  const userInitial = userName[0] || 'S';
  // Avatar state for live updates
  const [avatarState, setAvatar] = React.useState(avatar);
  // Simple motivational quotes array
  const quotes = [
    t('home.quote1'),
    t('home.quote2'),
    t('home.quote3'),
    t('home.quote4'),
    t('home.quote5')
  ];
  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  // Optionally, show a study streak from localStorage
  const streak = Number(localStorage.getItem('studyStreak')) || 0;

  // Listen for avatar changes via localStorage events
  React.useEffect(() => {
    function handleStorageChange(e) {
      if (e.key === 'user') {
        const updatedUser = JSON.parse(e.newValue);
        setAvatar(updatedUser?.avatarUrl || null);
      }
    }
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Helper for streak label
  function streakLabel(count) {
    return count === 1 ? t('home.streakDay', { count }) : t('home.streakDays', { count });
  }

  return (
    <div className="dashboard-main-bg fade-slide-in" style={{ paddingBottom: 72 }}>
      <div className="app-container card-animate" style={{ maxWidth: 540, width: '98vw', marginTop: 10 }}>
        {/* Greeting */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 18, marginTop: 6 }}>
          <div
            style={{
              background: avatarState ? `url(${avatarState}) center/cover` : 'var(--accent-color)',
              width: 60, height: 60, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 28, color: 'var(--profile-pfp-text)', boxShadow: '0 2px 8px #0003',
              letterSpacing: 1,
              cursor: 'pointer',
              border: '2px solid var(--text-color)',
              transition: 'box-shadow 0.2s',
              marginBottom: 5
            }}
            title={t('home.myAccount')}
            onClick={() => navigate('/profile')}
          >
            {!avatarState && userInitial}
          </div>
          <h1 className="heading-animate" style={{ margin: 0, fontSize: 30, fontWeight: 700, color: 'var(--text-color)', letterSpacing: '-1px', textAlign: 'center', lineHeight: 1.2 }}>
            {t('home.greeting', { name: userName })}
          </h1>
        </div>
        {/* Dashboard Overview */}
        <div className="homepage-card">
          <div style={{ fontSize: 15, color: 'var(--muted-text)', marginBottom: 4 }}>{t('home.currentStudyStreak')}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-color)', marginBottom: 10 }}>{streakLabel(streak)} 🔥</div>
          <div style={{ fontSize: 15, color: 'var(--accent-color)', fontStyle: 'italic', marginBottom: 8 }}>
            “{quote}”
          </div>
        </div>
        {/* Today's Routine Preview */}
        <TodayRoutinePreview />
        {/* Recent Activity */}
        <RecentActivity />
      </div>
    </div>
  );
}
