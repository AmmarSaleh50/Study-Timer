import React from 'react';
import { useTranslation } from 'react-i18next';

export default function ProfileCustomization({ language, onLanguageChange }) {
  const { t, i18n } = useTranslation();

  React.useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  return (
    <div style={{ background: '#232234', borderRadius: 14, padding: 18, margin: '0 0 18px 0', boxShadow: '0 2px 8px #0002' }}>
      <div style={{ fontWeight: 600, fontSize: 17, color: '#8f8fdd', marginBottom: 10 }}>{t('profile.customization')}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ color: '#aaa', fontSize: 15 }}>{t('profile.language')}</span>
        <select value={language} onChange={e => onLanguageChange(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#39395a', color: '#fff', fontSize: 15 }}>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
          <option value="fr">Français</option>
          <option value="es">Español</option>
          <option value="it">Italiano</option>
          <option value="tr">Türkçe</option>
          <option value="ru">Русский</option>
          <option value="zh">中文</option>
          <option value="ar">العربية</option>
          <option value="da">Dansk</option>
          <option value="nn">Norsk Nynorsk</option>
          <option value="nl">Nederlands</option>
          <option value="sv">Svenska</option>
        </select>
      </div>
    </div>
  );
}
