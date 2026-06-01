/**
 * Auth Store - Zustand store for authentication state
 */
import { create } from 'zustand';
import api from '../api/axios';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,

  login: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/login/', { username, password });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  logout: async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      await api.post('/auth/logout/', { refresh });
    } catch { /* ignore */ }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: () => {
    const token = localStorage.getItem('access_token');
    set({ isAuthenticated: !!token });
    if (token) {
      api.get('/auth/profile/').then(res => {
        set({ user: res.data });
      }).catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ isAuthenticated: false, user: null });
      });
    }
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    await api.post('/auth/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },
}));
