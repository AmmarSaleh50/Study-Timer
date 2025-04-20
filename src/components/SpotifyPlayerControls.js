import React from 'react';

export default function SpotifyPlayerControls({
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrev,
  track,
  progressMs,
  durationMs,
  onSeek
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
      {track && (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16, width: '100%' }}>
          <img src={track.album.images[0]?.url} alt="Album Art" style={{ width: 64, height: 64, borderRadius: 8, boxShadow: '0 2px 8px #0003' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 17 }}>{track.name}</div>
            <div style={{ color: '#aaa', fontSize: 14 }}>{track.artists.map(a => a.name).join(', ')}</div>
            <div style={{ color: '#aaa', fontSize: 13 }}>{track.album.name}</div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <button onClick={onPrev} style={buttonStyle} aria-label="Previous">⏮️</button>
        {isPlaying ? (
          <button onClick={onPause} style={buttonStyle} aria-label="Pause">⏸️</button>
        ) : (
          <button onClick={onPlay} style={buttonStyle} aria-label="Play">▶️</button>
        )}
        <button onClick={onNext} style={buttonStyle} aria-label="Next">⏭️</button>
      </div>
      {/* Progress bar */}
      {typeof progressMs === 'number' && typeof durationMs === 'number' && (
        <div style={{ width: '100%', marginTop: 8 }}>
          <input
            type="range"
            min={0}
            max={durationMs}
            value={progressMs}
            onChange={e => onSeek(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#aaa' }}>
            <span>{formatMs(progressMs)}</span>
            <span>{formatMs(durationMs)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const buttonStyle = {
  background: '#232234',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 16px',
  fontSize: 20,
  cursor: 'pointer',
  boxShadow: '0 2px 8px #0003',
};

function formatMs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
