/**
 * Theme Store - Dark/Light mode toggle
 */
import { create } from 'zustand';

interface ThemeState {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  // Initialize from localStorage or system preference
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = (stored as 'light' | 'dark') || (prefersDark ? 'dark' : 'light');
  
  // Apply theme immediately
  document.documentElement.setAttribute('data-theme', initial);

  return {
    theme: initial,
    sidebarCollapsed: false,

    toggleTheme: () => {
      set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        return { theme: newTheme };
      });
    },

    toggleSidebar: () => {
      set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
    },
  };
});
