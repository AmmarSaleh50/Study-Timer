import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import it from './locales/it.json';
import tr from './locales/tr.json';
import ru from './locales/ru.json';
import zh from './locales/zh.json';
import ar from './locales/ar.json';
import da from './locales/da.json';
import nn from './locales/nn.json';
import nl from './locales/nl.json';
import sv from './locales/sv.json';

const resources = {
  en: { translation: en },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  it: { translation: it },
  tr: { translation: tr },
  ru: { translation: ru },
  zh: { translation: zh },
  ar: { translation: ar },
  da: { translation: da },
  nn: { translation: nn },
  nl: { translation: nl },
  sv: { translation: sv },
};

const savedLang = localStorage.getItem('language');
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang || 'en', // Use saved language or fallback to English
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
