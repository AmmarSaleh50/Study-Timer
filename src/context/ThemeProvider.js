import React, { createContext, useContext, useEffect } from 'react';
import useUserProfile from '../hooks/useUserProfile';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const { theme } = useUserProfile();

  useEffect(() => {
    document.body.classList.remove('golden-theme', 'light-theme', 'purple-theme', 'default-theme');
    if (theme === 'golden') {
      document.body.classList.add('golden-theme');
    } else if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else if (theme === 'purple') {
      document.body.classList.add('purple-theme');
    } else {
      document.body.classList.add('default-theme');
    }
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