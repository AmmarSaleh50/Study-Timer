import React, { useState, useEffect } from 'react';
import '../styles/Onboarding.css';
import { db } from '../firebase';
import { setDoc, doc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
  { code: 'da', label: 'Dansk' },
  { code: 'nn', label: 'Norsk Nynorsk' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'sv', label: 'Svenska' },
];

export default function Onboarding({ onFinish }) {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const [idx, setIdx] = useState(0);
  const [maxIdx, setMaxIdx] = useState(0);
  const [username, setUsername] = useState(user.displayName || user.name || '');
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
  const [theme, setTheme] = useState(localStorage.getItem('theme'));
  const [error, setError] = useState('');

  const slides = [
    {
      title: t('onboarding.themeTitle'),
      img: '🎨',
      ask: 'theme',
    },
    {
      title: t('onboarding.languageTitle'),
      desc: '',
      img: '🌐',
      ask: 'language',
    },
    {
      title: t('onboarding.nameTitle'),
      desc: '',
      img: '👤',
      ask: 'username',
    },
    {
      title: t('onboarding.welcomeTitle'),
      desc: t('onboarding.welcomeDesc'),
      img: '📚',
    },
    {
      title: t('onboarding.studySessionsTitle'),
      desc: t('onboarding.studySessionsDesc'),
      img: '⏱️',
    },
    {
      title: t('onboarding.routinesTitle'),
      desc: t('onboarding.routinesDesc'),
      img: '📅',
    },
    {
      title: t('onboarding.aiAssistantTitle'),
      desc: t('onboarding.aiAssistantDesc'),
      img: '🤖',
    },
    {
      title: t('onboarding.progressTitle'),
      desc: t('onboarding.progressDesc'),
      img: '🏆',
    },
    {
      title: t('onboarding.getStartedTitle'),
      desc: t('onboarding.getStartedDesc'),
      img: '🚀',
    }
  ];

  useEffect(() => {
    if (idx > maxIdx) setMaxIdx(idx);
  }, [idx]);

  async function saveProfile() {
    if (!username.trim()) {
      setError('Please enter a username.');
      return false;
    }
    if (!language) {
      setError('Please select a language.');
      return false;
    }
    const updatedUser = { ...user, name: username.trim(), displayName: username.trim() };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    localStorage.setItem('language', language);
    if (user.uid) {
      await setDoc(doc(db, 'users', user.uid), { name: username.trim(), displayName: username.trim(), language }, { merge: true });
    }
    setError('');
    return true;
  }

  async function next() {
    if (slides[idx].ask === 'theme') {
      setError('');
      setIdx(idx + 1);
      return;
    }
    if (slides[idx].ask === 'language') {
      if (!language) {
        setError('Please select a language.');
        return;
      }
      if (i18n.language !== language) {
        await i18n.changeLanguage(language);
      }
      setError('');
      setIdx(idx + 1);
      return;
    }
    if (slides[idx].ask === 'username') {
      if (!username.trim()) {
        setError('Please enter a username.');
        return;
      }
      await saveProfile();
      setError('');
      setIdx(idx + 1);
      return;
    }
    if (idx < slides.length - 1) setIdx(idx + 1);
    else handleFinish();
  }
  function skip() {
    if (idx < 2) return; // Disabled for first two slides
    handleFinish();
  }
  function handleFinish() {
    if (user && user.uid) {
      setDoc(doc(db, 'users', user.uid), { onboardingComplete: true }, { merge: true });
    }
    if (onFinish) onFinish();
    navigate('/home', { replace: true });
  }

  // Change language in real time when user selects a language
  function handleLanguageChange(e) {
    const selectedLang = e.target.value;
    setLanguage(selectedLang);
    if (i18n.language !== selectedLang) {
      i18n.changeLanguage(selectedLang);
    }
  }

  const slide = slides[idx];

  return (
    <div className="onboarding-overlay onboarding-fullscreen">
      <div className="onboarding-card onboarding-card-responsive">
        {/* Fade transition for slides */}
        <div className="onboarding-slide-fade" key={idx}>
          <div className="onboarding-img">{slide.img}</div>
          <div className="onboarding-title">{slide.title}</div>
          {slide.ask === 'theme' ? (
            <div className="onboarding-custom-form">
              <select
                value={theme}
                onChange={e => {
                  setTheme(e.target.value);
                  localStorage.setItem('theme', e.target.value);
                  if (e.target.value === 'golden') {
                    document.body.classList.add('golden-theme');
                    document.body.classList.remove('purple-theme');
                  } else if (e.target.value === 'purple') {
                    document.body.classList.add('purple-theme');
                    document.body.classList.remove('golden-theme');
                  } else {
                    document.body.classList.remove('golden-theme');
                    document.body.classList.remove('purple-theme');
                  }
                }}
                className="onboarding-input"
                style={{ marginBottom: 8 }}
              >
                <option value="default">Classic Purple</option>
                <option value="golden">Gold & Black</option>
              </select>
              {error && <div style={{ color: '#ff6b6b', marginBottom: 8 }}>{error}</div>}
              <button
                className="onboarding-next"
                onClick={next}
                style={{ width: '100%', marginTop: 3 }}
              >
                {t('onboarding.next')}
              </button>
            </div>
          ) : slide.ask === 'username' ? (
            <div className="onboarding-custom-form">
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your name..."
                className="onboarding-input"
                maxLength={32}
                autoFocus
              />
              {error && <div style={{ color: '#ff6b6b', marginBottom: 8 }}>{error}</div>}
              <button
                className="onboarding-next"
                onClick={next}
                style={{ width: '100%', marginTop: 3 }}
                disabled={!username.trim()}
              >
                {t('onboarding.next')}
              </button>
            </div>
          ) : slide.ask === 'language' ? (
            <div className="onboarding-custom-form">
              <select
                value={language}
                onChange={handleLanguageChange}
                className="onboarding-select"
                autoFocus
              >
                {LANGUAGE_OPTIONS.map(opt => (
                  <option key={opt.code} value={opt.code}>{opt.label}</option>
                ))}
              </select>
              {error && <div style={{ color: '#ff6b6b', marginBottom: 8 }}>{error}</div>}
              <button
                className="onboarding-next"
                onClick={next}
                style={{ width: '100%', marginTop: 3 }}
                disabled={!language}
              >
                {t('onboarding.next')}
              </button>
            </div>
          ) : null}

          <div className="onboarding-desc">{slide.desc}</div>
          {/* Only show navigation controls if slide.ask is not present */}
          {!slide.ask && (
            <div className="onboarding-controls">
              {idx >= 2 && idx < slides.length - 1 && (
                <button className="onboarding-skip" onClick={skip}>{t('onboarding.skip')}</button>
              )}
              {idx >= 2 && (
                <button className="onboarding-next" onClick={next}>
                  {idx === slides.length - 1 ? t('onboarding.getStartedBtn') : t('onboarding.next')}
                </button>
              )}
            </div>
          )}
        </div>
        {/* Progress stepper at the bottom */}
        <div className="onboarding-dots">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`onboarding-dot${i === idx ? ' active' : ''}${i <= maxIdx ? ' onboarding-dot--visited' : ''}${i > maxIdx ? ' onboarding-dot--locked' : ''}`}
              tabIndex={i <= maxIdx ? 0 : -1}
              role="button"
              aria-label={`Go to step ${i + 1}`}
              onClick={i <= maxIdx ? () => setIdx(i) : undefined}
              style={{ pointerEvents: i <= maxIdx ? 'auto' : 'none' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
