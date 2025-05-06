import React from 'react';

function TopicTag({ topic, isActive, onSelect, onColorChange, onRemove, timerRunning, t, subject }) {
  return (
    <div
      className={`topic-tag ${isActive ? 'active' : ''}`}
      style={{
        borderColor: topic.color,
        backgroundColor: isActive ? topic.color : 'transparent',
        color: isActive ? '#fff' : topic.color,
        fontWeight: 600,
        letterSpacing: '0.01em',
      }}
      onClick={() => onSelect(topic.name)}
    >
      {topic.name}
      <input
        type="color"
        value={topic.color}
        onClick={e => e.stopPropagation()}
        onChange={e => onColorChange(topic.name, e.target.value)}
        className="tag-color-picker"
        title={t('dashboard.changeColor')}
        disabled={timerRunning}
      />
      <span
        className="tag-remove"
        title={t('dashboard.removeTopic')}
        onClick={e => {
          e.stopPropagation();
          if (timerRunning) {
            return;
          }
          onRemove(topic.name);
        }}
        style={{
          cursor: timerRunning ? 'not-allowed' : 'pointer',
          color: '#ba2f3d',
          marginLeft: 8,
          opacity: timerRunning ? 0.5 : 1,
          fontWeight: 'bold',
          fontSize: '1.2em',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: timerRunning ? '#eee' : 'transparent',
          transition: 'background 0.2s',
          border: '1.5px solid #ba2f3d',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" style={{ display: 'block' }}>
          <line x1="2" y1="2" x2="10" y2="10" stroke="#ba2f3d" strokeWidth="2" strokeLinecap="round" />
          <line x1="10" y1="2" x2="2" y2="10" stroke="#ba2f3d" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}

export default TopicTag; 