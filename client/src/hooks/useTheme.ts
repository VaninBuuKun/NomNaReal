import { useEffect } from 'react';

/** NomNa uses a single Discord-style dark palette. */
export const APP_THEME = 'discord-dark';

export function useTheme() {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', APP_THEME);
    document.body.setAttribute('data-theme', APP_THEME);
    localStorage.removeItem('nomna_theme');
  }, []);
}
