import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'joule' | 'iberdrola';

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const ThemeContext = createContext<ThemeCtx>({ theme: 'dark', setTheme: () => {} });

const VALID_THEMES: Theme[] = ['dark', 'joule', 'iberdrola'];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('src-theme') as Theme;
    return VALID_THEMES.includes(saved) ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('src-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
