import { useState, useEffect, useCallback } from 'react';

export type ThemeName = 'discord-dark' | 'celestial-violet' | 'graphite-obsidian';

export interface ThemeOption {
  id: ThemeName;
  name: string;
  description: string;
  primaryColor: string;
  badge?: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'discord-dark',
    name: 'Đen Mặc Định (Classic)',
    description: 'Tông màu đen tiêu chuẩn thân quen, dễ nhìn.',
    primaryColor: '#5865f2',
    badge: 'Mặc định',
  },
  {
    id: 'celestial-violet',
    name: 'Celestial Violet',
    description: 'Tím sương huyền ảo Dribbble, pastel candy accents.',
    primaryColor: '#9061f9',
    badge: '★ Đã chọn',
  },
  {
    id: 'graphite-obsidian',
    name: 'Graphite Onyx',
    description: 'Đen than chì tối giản chuẩn Linear, viền titan.',
    primaryColor: '#6366f1',
    badge: '★ Đã chọn',
  },
];

export const DEFAULT_THEME: ThemeName = 'discord-dark';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('nomna_theme') as ThemeName;
    if (saved && (saved === 'discord-dark' || saved === 'celestial-violet' || saved === 'graphite-obsidian')) {
      return saved;
    }
    return DEFAULT_THEME;
  });

  const setTheme = useCallback((newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem('nomna_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  return {
    theme,
    setTheme,
    themes: THEME_OPTIONS,
  };
}
