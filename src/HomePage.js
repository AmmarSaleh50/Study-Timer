import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './App.css';
import TodayRoutinePreview from './components/TodayRoutinePreview';
import RecentActivity from './components/RecentActivity';

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Optionally fetch user info from localStorage or context
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userName = user.displayName || user.name || t('home.student');
  const userInitial = userName[0] || 'S';
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
  const streak = localStorage.getItem('studyStreak') || 0;

  return (
    <div className="dashboard-main-bg fade-slide-in" style={{ paddingBottom: 72 }}>
      <div className="app-container card-animate" style={{ maxWidth: 540, width: '98vw', marginTop: 10 }}>
        {/* Greeting */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 18, marginTop: 6 }}>
          <div
            style={{
              background: 'linear-gradient(135deg,#675fc0,#47449c)',
              width: 60, height: 60, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 28, color: '#fff', boxShadow: '0 2px 8px #0003',
              letterSpacing: 1,
              cursor: 'pointer',
              border: '2px solid #675fc0',
              transition: 'box-shadow 0.2s',
              marginBottom: 5
            }}
            title={t('home.myAccount')}
            onClick={() => navigate('/profile')}
          >
            {userInitial}
          </div>
          <h1 className="heading-animate" style={{ margin: 0, fontSize: 30, fontWeight: 700, color: '#fff', letterSpacing: '-1px', textAlign: 'center', lineHeight: 1.2 }}>
            {t('home.greeting', { name: userName })}
          </h1>
        </div>
        {/* Dashboard Overview */}
        <div style={{ background: '#232234', borderRadius: 14, padding: '18px 18px 10px 18px', margin: '0 0 22px 0', boxShadow: '0 2px 8px #0002', textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: '#aaa', marginBottom: 4 }}>{t('home.currentStudyStreak')}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 10 }}>{t('home.streak', { count: streak })} 🔥</div>
          <div style={{ fontSize: 15, color: '#8f8fdd', fontStyle: 'italic', marginBottom: 8 }}>
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
