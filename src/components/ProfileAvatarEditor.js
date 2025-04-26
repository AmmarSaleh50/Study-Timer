import React, { useRef, useState } from 'react';

export default function ProfileAvatarEditor({ avatarUrl, onAvatarChange, initialLetter }) {
  const [preview, setPreview] = useState(avatarUrl || null);
  const fileInput = useRef();

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setPreview(ev.target.result);
      onAvatarChange(ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ position: 'relative', width: 72, height: 72 }}>
      <div style={{
        background: 'linear-gradient(135deg,#675fc0,#47449c)',
        width: 72, height: 72, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 34, color: '#fff', boxShadow: '0 2px 8px #0003',
        letterSpacing: 1,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      }}
        title="Change avatar"
        onClick={() => fileInput.current.click()}
      >
        {preview ? (
          <img src={preview} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          initialLetter || 'S'
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#8f8fdd', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, border: '2px solid #232234' }}>✏️</div>
    </div>
  );
}
