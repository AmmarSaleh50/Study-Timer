import React, { useState, useRef, useEffect } from 'react';
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
  // Helper for streak label
  function streakLabel(count) {
    return count === 1 ? t('profileStatsCard.streakDay', { count }) : t('profileStatsCard.streakDays', { count });
  }
  function handleCopy() {
    const text = `${t('profileStatsCard.copyStatsHeader') || 'My FocusForge Stats:'}\n\n${t('profileStatsCard.streak') || 'Streak'}: ${streakLabel(streak)}\n${t('profileStatsCard.totalMinutes') || 'Total Minutes'}: ${formatDuration(totalMinutes)}\n${t('profileStatsCard.routinesDone') || 'Routines Done'}: ${routinesCompleted}`;
    navigator.clipboard.writeText(text);
    if (onCopyStats) onCopyStats();
  }
  // Tooltip for routines (mobile/desktop)
  const [showRoutineTip, setShowRoutineTip] = useState(false);
  const tipRef = useRef();
  const iconRef = useRef();
  useEffect(() => {
    if (!showRoutineTip) return;
    function handleClick(e) {
      // If click/touch is outside both icon and tooltip, close
      if (
        (!tipRef.current || !tipRef.current.contains(e.target)) &&
        (!iconRef.current || !iconRef.current.contains(e.target))
      ) {
        setShowRoutineTip(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [showRoutineTip]);
  // Handler for icon tap/click
  function handleRoutineIcon(e) {
    e.stopPropagation();
    setShowRoutineTip(v => !v);
  }
  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: 14, padding: 18, margin: '0 0 18px 0', boxShadow: '0 2px 8px #0002', textAlign: 'center' }}>
      <div style={{ fontWeight: 600, fontSize: 17, color: 'var(--text-color)', marginBottom: 8 }}>{t('profileStatsCard.title', 'Study Stats')}</div>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <div>
          <div style={{ color: 'var(--muted-text)', fontSize: 15 }}>{t('profileStatsCard.longestStreak', 'Longest Streak')}</div>
          <div style={{ color: 'var(--accent-color)', fontWeight: 700, fontSize: 22 }}>{streakLabel(streak)}</div>
        </div>
        <div>
          <div style={{ color: 'var(--muted-text)', fontSize: 15 }}>{t('profileStatsCard.totalMinutes', 'Total Minutes')}</div>
          <div style={{ color: 'var(--accent-color)', fontWeight: 700, fontSize: 22 }}>{formatDuration(totalMinutes)}</div>
        </div>
        <div>
          <div style={{ color: 'var(--muted-text)', fontSize: 15, position: 'relative', display: 'inline-block' }}>
            {t('profileStatsCard.routinesDone', 'Routines Done')}
            <span
              ref={iconRef}
              style={{ cursor: 'pointer', marginLeft: 6, color: 'var(--accent-color)', background: 'none', border: 'none', padding: 0, fontSize: 18, lineHeight: 1, verticalAlign: 'middle', transition: 'color 0.18s' }}
              onClick={handleRoutineIcon}
              onTouchStart={handleRoutineIcon}
              onMouseEnter={() => setShowRoutineTip(true)}
              onMouseLeave={() => setShowRoutineTip(false)}
              tabIndex={0}
              aria-label={t('profileStatsCard.routinesTooltip', 'Earn a routine by completing at least one study session every day (Mon–Sun) in a week.')}
            >
              <svg height="15" width="15" viewBox="0 0 20 20" style={{ verticalAlign: 'middle', fill: 'var(--accent-color)' }}>
                <circle cx="10" cy="10" r="9" stroke="var(--accent-color)" strokeWidth="1.5" fill="none"/>
                <text x="10" y="15" textAnchor="middle" fontSize="13" fill="var(--accent-color)" fontFamily="Arial" fontWeight="bold">?</text>
              </svg>
            </span>
            {showRoutineTip && (
              <div
                ref={tipRef}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '120%',
                  transform: 'translateX(-50%)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-color)',
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 14,
                  boxShadow: '0 2px 8px #0005',
                  zIndex: 99,
                  minWidth: 180,
                  maxWidth: 230,
                  whiteSpace: 'normal',
                  pointerEvents: 'auto',
                }}
              >
                {t('profileStatsCard.routinesTooltip', 'Earn a routine by completing at least one study session every day (Mon–Sun) in a week.')}
              </div>
            )}
          </div>
          <div style={{ color: 'var(--accent-color)', fontWeight: 700, fontSize: 22 }}>{routinesCompleted}</div>
        </div>
      </div>
      {badges && badges.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ color: 'var(--muted-text)', fontSize: 14, marginBottom: 4 }}>{t('profileStatsCard.badges', 'Badges')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {badges.map((badge, idx) => (
              <span key={idx} style={{ background: 'var(--card-bg)', color: 'var(--accent-color)', borderRadius: 8, padding: '4px 10px', fontSize: 13, fontWeight: 600 }}>{badge}</span>
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
