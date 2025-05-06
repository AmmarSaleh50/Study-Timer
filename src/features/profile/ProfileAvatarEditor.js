import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';

export default function ProfileAvatarEditor({ avatarUrl, onAvatarChange, initialLetter }) {
  const [preview, setPreview] = useState(avatarUrl || null);
  const [showMenu, setShowMenu] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
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

  function handlePenClick(e) {
    e.stopPropagation();
    setShowMenu(m => !m);
  }

  function handleRemove() {
    setPreview(null);
    onAvatarChange(null);
    setShowMenu(false);
  }

  function handleAdd() {
    fileInput.current.click();
    setShowMenu(false);
  }

  return (
    <div style={{ position: 'relative', width: 72, height: 72 }}>
      <div
        style={{
          background: 'var(--accent-color)', width: 72, height: 72, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 34, color: 'var(--profile-pfp-text)', boxShadow: '0 2px 8px #0003',
          letterSpacing: 1,
          overflow: 'hidden',
          cursor: preview ? 'pointer' : 'default',
          transition: 'box-shadow 0.2s',
        }}
        title={preview ? "Preview profile photo" : "Change avatar"}
        onClick={() => preview && setShowPreviewModal(true)}
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
      {/* Pen button and menu */}
      <div style={{ position: 'absolute', bottom: 0, right: 0, zIndex: 10, pointerEvents: 'auto' }}>
        <button
          type="button"
          style={{
            background: 'var(--accent-color)', color: '#fff', border: '2px solid var(--card-border)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 6px #0002', padding: 0
          }}
          onClick={handlePenClick}
          aria-label="Edit profile photo"
        >
          <span role="img" aria-label="edit">✏️</span>
        </button>
        {showMenu && (
          <div style={{
            position: 'absolute', bottom: 29, right: -55, background: 'var(--card-bg)', borderRadius: 8, boxShadow: '0 2px 12px #0006', zIndex: 10, padding: 8, minWidth: 120, display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center', alignItems: 'center'
          }}>
            <button
              onClick={handleAdd}
              style={{ background: 'none', color: 'var(--accent-color)', border: 'none', padding: '8px 0', fontSize: 15, cursor: 'pointer', borderRadius: 6, textAlign: 'left', transition: 'background 0.15s' }}
            >
              {preview ? 'Change Photo' : 'Add Photo'}
            </button>
            {preview && (
              <button
                onClick={handleRemove}
                style={{ background: 'none', color: 'var(--danger-color)', border: 'none', padding: '8px 0', fontSize: 15, cursor: 'pointer', borderRadius: 6, textAlign: 'left', transition: 'background 0.15s' }}
              >
                Remove Photo
              </button>
            )}
          </div>
        )}
      </div>
      {/* Preview Modal */}
      {showPreviewModal && preview && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, background: 'var(--drawer-bg)', zIndex: 1000, display: 'grid', placeItems: 'center', pointerEvents: 'auto', width: '100vw', height: '100vh', minHeight: '100dvh', minWidth: '100dvw', boxSizing: 'border-box', overflow: 'hidden'
          }}
          onClick={() => setShowPreviewModal(false)}
        >
          <img
            src={preview}
            alt="Profile Preview"
            style={{ maxWidth: 'min(92vw, 480px)', maxHeight: '80vh', borderRadius: 18, boxShadow: '0 4px 32px #000a', border: '3px solid var(--drawer-bg)', display: 'block', background: 'var(--card-bg)' }}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
