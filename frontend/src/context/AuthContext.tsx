import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { CashSession, User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  cashSession: CashSession | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshCashSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('comandas_token'));
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshCashSession = async () => {
    try {
      const session = await api.getActiveCashSession();
      setCashSession(session);
    } catch {
      setCashSession(null);
    }
  };

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('comandas_token');
      if (storedToken) {
        try {
          const profile = await api.getMe();
          setUser(profile);
          await refreshCashSession();
        } catch {
          localStorage.removeItem('comandas_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (username: string, password: string) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const data = await api.login(formData);
    localStorage.setItem('comandas_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    await refreshCashSession();
  };

  const logout = () => {
    localStorage.removeItem('comandas_token');
    setToken(null);
    setUser(null);
    setCashSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Carregando sistema...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        cashSession,
        login,
        logout,
        refreshCashSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
