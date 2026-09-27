import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('nomna_theme') || 'warm-orange';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('nomna_theme', theme);
  }, [theme]);

  const changeTheme = (newTheme: string) => {
    setTheme(newTheme);
  };

  return { theme, changeTheme };
}
