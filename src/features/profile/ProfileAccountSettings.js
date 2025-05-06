import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ProfileAccountSettings({ onLogout, onDeleteAccount, onChangePassword, isGoogleUser }) {
  const { t } = useTranslation();
  const [showDelete, setShowDelete] = useState(false);
  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: 14, padding: 18, margin: '0 0 18px 0', boxShadow: '0 2px 8px #0002' }}>
      <div style={{ fontWeight: 600, fontSize: 17, color: 'var(--accent-color)', marginBottom: 10 }}>{t('profile.account_settings')}</div>
      {!isGoogleUser ? (
        <button
          className="save-btn button-pop button-ripple"
          style={{ width: '80%', maxWidth: 280, fontSize: 16, padding: '10px 0', margin: '0 auto 10px auto', display: 'block', background: 'var(--button-bg)', color: 'var(--button-text)' }}
          onClick={onChangePassword}
        >
          {t('profile.reset_password')}
        </button>
      ) : (
        <div style={{ width: '80%', maxWidth: 280, margin: '0 auto 10px auto', color: 'var(--accent-color)', fontSize: 14, textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--drawer-bg)', borderRadius: 8, padding: '8px 6px 7px 6px', marginBottom: 12 }}>
          {t('profile.google_auth_password_note', 'You signed up with Google. To change your password, visit your Google Account settings.')}
        </div>
      )}
      <button
        className="save-btn button-pop button-ripple"
        style={{ width: '80%', maxWidth: 280, fontSize: 16, padding: '10px 0', margin: '0 auto 10px auto', display: 'block', background: 'var(--button-bg)', color: 'var(--button-text)' }}
        onClick={onLogout}
      >
        {t('profile.logout')}
      </button>
      <button className="cancel-btn button-pop button-ripple" style={{ width: '80%', maxWidth: 280, fontSize: 16, padding: '10px 0', margin: '0 auto', display: 'block'}} onClick={() => setShowDelete(v => !v)}>
        {t('profile.delete_account')}
      </button>
      {showDelete && (
        <>
          <div className="modal-overlay" style={{
            position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: 'rgba(24,24,43,0.75)', zIndex: 3000
          }} />
          <div className="modal-confirm" style={{
            position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', background: 'var(--card-bg)', color: 'var(--accent-color)', borderRadius: 16, padding: '32px 28px 22px 28px', boxShadow: '0 6px 32px #000a', zIndex: 3010, minWidth: 260, textAlign: 'center', maxWidth: '90vw'
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{t('profile.confirm_delete')}</div>
            <div style={{ color: 'var(--accent-color)', fontSize: 15, marginBottom: 16 }}>{t('profile.delete_confirm')}</div>
            <button className="home-btn button-pop button-ripple" style={{ background: '#c23c3c', color: '#fff', width: 160, fontSize: 15, padding: '10px 0', marginBottom: 8 }} onClick={onDeleteAccount}>
              {t('profile.confirm_delete')}
            </button>
            <br />
            <button className="home-btn button-pop button-ripple" style={{ background: 'var(--drawer-bg)', color: 'var(--button-text)', width: 160, fontSize: 15, padding: '10px 0' }} onClick={() => setShowDelete(false)}>
              {t('profile.cancel')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
