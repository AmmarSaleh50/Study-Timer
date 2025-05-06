import React from 'react';

function ResetModal({ open, onConfirm, onCancel, t }) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ padding: '20px' }}>
        <p>{t('dashboard.confirmResetStats')}</p>
        <div className="modal-buttons">
          <button onClick={onConfirm} className="confirm button-pop button-ripple">
            {t('dashboard.yesResetStats')}
          </button>
          <button onClick={onCancel} className="cancel-btn button-pop button-ripple" style={{  background: "var(--card-bg)", color: "var(--accent-color)", minWidth: 20, height: 40, fontSize: 16, padding: "0 18px", borderRadius: 8, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: -5, border: "1.5px solid var(--accent-color)" }}>
            {t('dashboard.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResetModal; 