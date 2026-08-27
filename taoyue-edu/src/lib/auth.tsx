/** 认证状态管理 */
'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { authApi } from './api';

export interface User {
  id: number;
  uid: string;
  nickname: string;
  avatar: string;
  phone: string;
  role: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (phone: string, code: string) => Promise<void>;
  register: (phone: string, code: string, nickname: string) => Promise<void>;
  passwordLogin: (username: string, password: string) => Promise<void>;
  passwordRegister: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoggedIn: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  passwordLogin: async () => {},
  passwordRegister: async () => {},
  logout: () => {},
  isLoggedIn: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authApi.getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (phone: string, code: string) => {
    const res = await authApi.login(phone, code);
    localStorage.setItem('access_token', res.data.access_token);
    localStorage.setItem('refresh_token', res.data.refresh_token);
    setUser(res.data.user);
  };

  const register = async (phone: string, code: string, nickname: string) => {
    const res = await authApi.register(phone, code, nickname);
    localStorage.setItem('access_token', res.data.access_token);
    localStorage.setItem('refresh_token', res.data.refresh_token);
    setUser(res.data.user);
  };

  const passwordLogin = async (username: string, password: string) => {
    const res = await authApi.passwordLogin(username, password);
    localStorage.setItem('access_token', res.data.access_token);
    localStorage.setItem('refresh_token', res.data.refresh_token);
    setUser(res.data.user);
  };

  const passwordRegister = async (username: string, password: string) => {
    const res = await authApi.passwordRegister(username, password);
    localStorage.setItem('access_token', res.data.access_token);
    localStorage.setItem('refresh_token', res.data.refresh_token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, passwordLogin, passwordRegister, logout, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
