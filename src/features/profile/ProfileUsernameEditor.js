import React, { useState } from 'react';
import FloatingLabelInput from '../../components/FloatingLabelInput';

export default function ProfileUsernameEditor({ username, onUsernameChange }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(username || '');

  function handleSave() {
    if (value.trim()) {
      onUsernameChange(value.trim());
      setEditing(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
      {editing ? (
        <>
          <FloatingLabelInput
            label="Username"
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            style={{ minWidth: 120, maxWidth: 220 }}
          />
          <div style={{ marginLeft: 5, display: 'flex'}}>
          <button
            className="save-btn button-pop button-ripple"
            style={{ background: 'var(--accent-color)', color: 'var(--button-text)', minWidth: 64, height: 40, fontSize: 16, padding: '0 18px', borderRadius: 8, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={handleSave}
          >
            Save
          </button>
          <button
            className="cancel-btn button-pop button-ripple"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
          </div>
        </>
      ) : (
        <>
          <h2 style={{ margin: 0, fontWeight: 700 }}>{username}</h2>
          <button className="home-btn button-pop button-ripple" style={{ background: 'var(--accent-color)', color: 'var(--button-text)', padding: '6px 12px', fontSize: 15, marginLeft: 5 }} onClick={() => setEditing(true)}>Edit</button>
        </>
      )}
    </div>
  );
}
