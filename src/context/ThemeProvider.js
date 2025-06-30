import React, { createContext, useContext, useEffect } from 'react';
import useUserProfile from '../hooks/useUserProfile';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const { theme } = useUserProfile();

  useEffect(() => {
    const htmlEl = document.documentElement;
    const rootEl = document.getElementById('root');
    const themeClasses = ['golden-theme', 'light-theme', 'purple-theme', 'default-theme'];

    [document.body, htmlEl, rootEl].forEach(el => el?.classList.remove(...themeClasses));

    const selectedClass =
      theme === 'golden'
        ? 'golden-theme'
        : theme === 'light'
        ? 'light-theme'
        : theme === 'purple'
        ? 'purple-theme'
        : 'default-theme';

    [document.body, htmlEl, rootEl].forEach(el => el?.classList.add(selectedClass));
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
} 