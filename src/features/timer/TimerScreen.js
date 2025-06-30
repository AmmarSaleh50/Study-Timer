import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const SPOTIFY_EMBED_URL = "https://open.spotify.com/embed/playlist/37i9dQZF1DXc8kgYqQLMfH"; // Chill Lofi Study Beats

function TimerScreen({ subject, elapsedSeconds, formatTime, stopTimer, isPaused, onPause, onResume, timerMode, pomodoroDuration, t, i18n }) {
  const [showSpotify] = useState(false);
  return (
    <div className="timer-screen">
      <h2>{t('dashboard.currentlyStudying')} {subject}</h2>
      <div className="big-timer">{formatTime(timerMode === 'pomodoro' ? Math.max(pomodoroDuration - elapsedSeconds, 0) : elapsedSeconds, t, i18n)}</div>
      <div className="timer-controls">
        <button 
          className={`control-button ${isPaused ? 'resume' : 'pause'} button-pop button-ripple`}
          onClick={isPaused ? onResume : onPause}
        >
          {isPaused ? t('dashboard.resume') : t('dashboard.pause')}
        </button>
        <button className="control-button stop button-pop button-ripple" onClick={stopTimer}>
          {t('dashboard.stop')}
        </button>
        {/* Spotify button removed as requested */}
      </div>
      {showSpotify && (
        <div style={{ marginTop: 24, width: '100%', maxWidth: 420 }}>
          <iframe
            title={t('dashboard.chillStudyPlaylist')}
            src={SPOTIFY_EMBED_URL}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            style={{ borderRadius: 12 }}
          ></iframe>
        </div>
      )}
    </div>
  );
}

export default TimerScreen; 