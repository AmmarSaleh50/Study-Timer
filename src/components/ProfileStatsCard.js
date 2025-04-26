import React from 'react';
import { useTranslation } from 'react-i18next';

export default function ProfileStatsCard({ streak, totalMinutes, routinesCompleted, badges, showCopyStats, onCopyStats }) {
  const { t, i18n } = useTranslation();
  function formatDuration(minutes) {
    const isRTL = i18n && i18n.dir && i18n.dir() === 'rtl';
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    if (isRTL) {
      if (hours > 0 && rem > 0) {
        return `${hours} ${t('time.hour', 'h')} ${rem} ${t('time.minute', 'm')}`;
      } else if (hours > 0) {
        return `${hours} ${t('time.hour', 'h')}`;
      }
      return `${minutes} ${t('time.minute', 'm')}`;
    } else {
      if (hours > 0 && rem > 0) {
        return `${hours} ${t('time.hour', 'h')} ${rem} ${t('time.minute', 'm')}`;
      } else if (hours > 0) {
        return `${hours} ${t('time.hour', 'h')}`;
      }
      return `${minutes} ${t('time.minute', 'm')}`;
    }
  }
  function handleCopy() {
    const text = `${t('profileStatsCard.copyStatsHeader') || 'My FocusForge Stats:'}\n\n${t('profileStatsCard.streak') || 'Streak'}: ${streak} ${t('profileStatsCard.days') || 'days'}\n${t('profileStatsCard.totalMinutes') || 'Total Minutes'}: ${formatDuration(totalMinutes)}\n${t('profileStatsCard.routinesDone') || 'Routines Done'}: ${routinesCompleted}`;
    navigator.clipboard.writeText(text);
    if (onCopyStats) onCopyStats();
  }
  return (
    <div style={{ background: '#232234', borderRadius: 14, padding: 18, margin: '0 0 18px 0', boxShadow: '0 2px 8px #0002', textAlign: 'center' }}>
      <div style={{ fontWeight: 600, fontSize: 17, color: '#8f8fdd', marginBottom: 8 }}>{t('profileStatsCard.title', 'Study Stats')}</div>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <div>
          <div style={{ color: '#aaa', fontSize: 15 }}>{t('profileStatsCard.longestStreak', 'Longest Streak')}</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 22 }}>{streak}</div>
        </div>
        <div>
          <div style={{ color: '#aaa', fontSize: 15 }}>{t('profileStatsCard.totalMinutes', 'Total Minutes')}</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 22 }}>{formatDuration(totalMinutes)}</div>
        </div>
        <div>
          <div style={{ color: '#aaa', fontSize: 15 }}>{t('profileStatsCard.routinesDone', 'Routines Done')}</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 22 }}>{routinesCompleted}</div>
        </div>
      </div>
      {badges && badges.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ color: '#aaa', fontSize: 14, marginBottom: 4 }}>{t('profileStatsCard.badges', 'Badges')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {badges.map((badge, idx) => (
              <span key={idx} style={{ background: '#39395a', color: '#8f8fdd', borderRadius: 8, padding: '4px 10px', fontSize: 13, fontWeight: 600 }}>{badge}</span>
            ))}
          </div>
        </div>
      )}
      {showCopyStats && (
        <button className="home-btn button-pop button-ripple" style={{ width: '100%', marginTop: 12 }} onClick={handleCopy}>
          {t('profileStatsCard.copyButton', 'Copy Stats to Clipboard')}
        </button>
      )}
    </div>
  );
}
