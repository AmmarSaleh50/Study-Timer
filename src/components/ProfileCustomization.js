import React from 'react';
import { useTranslation } from 'react-i18next';
import useUserProfile from '../hooks/useUserProfile';

export default function ProfileCustomization() {
  const { theme, language, updateTheme, updateLanguage } = useUserProfile();
  const { t, i18n } = useTranslation();

  React.useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  React.useEffect(() => {
    document.body.classList.remove('golden-theme');
    if (theme === 'golden') {
      document.body.classList.add('golden-theme');
    }
  }, [theme]);

  // Handler for theme change
  const handleThemeChange = (e) => {
    const newTheme = e.target.value;
    updateTheme(newTheme);
  };

  // Handler for language change
  const handleLanguageChange = (e) => {
    const selectedLang = e.target.value;
    updateLanguage(selectedLang);
    if (i18n.language !== selectedLang) {
      i18n.changeLanguage(selectedLang);
    }
  };

  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: 14, padding: 18, margin: '0 0 18px 0', boxShadow: '0 2px 8px #0002', color: 'var(--text-color)' }}>
      <div style={{ fontWeight: 600, fontSize: 17, color: 'var(--accent-color)', marginBottom: 10 }}>{t('profile.customization')}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <span style={{ color: 'var(--muted-text)', fontSize: 15 }}>{t('profile.language')}</span>
        <select value={language} onChange={handleLanguageChange} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--drawer-bg)', color: 'var(--button-text)', fontSize: 15 }}>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ color: 'var(--muted-text)', fontSize: 15 }}>{t('profile.theme.label')}</span>
        <select value={theme} onChange={handleThemeChange} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--drawer-bg)', color: 'var(--button-text)', fontSize: 15 }}>
          <option value="default">{t('profile.theme.default')}</option>
          <option value="golden">{t('profile.theme.golden')}</option>
        </select>
      </div>
    </div>
  );
}
