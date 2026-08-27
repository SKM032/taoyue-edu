import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: any | null;
  setAuth: (token: string, user: any) => void;
  logout: () => void;
  isLoggedIn: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('admin_token'),
  user: null,
  setAuth: (token, user) => {
    localStorage.setItem('admin_token', token);
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('admin_token');
    set({ token: null, user: null });
  },
  isLoggedIn: () => !!get().token,
}));
