'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  createElement,
} from 'react';
import { api, ApiSuccess, ApiError } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin: string | null;
  createdAt: string;
  companies: Array<{ id: string; name: string; role: string }>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

const ACCESS_KEY = 'smarterp_accessToken';
const REFRESH_KEY = 'smarterp_refreshToken';
const USER_KEY = 'smarterp_user';

interface AuthContextValue {
  user: User | null;
  tokens: AuthTokens | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  setActiveCompanyId: (id: string) => void;
  activeCompanyId: string | null;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  companyName?: string;
  address?: string;
  contactNumber?: string;
  gstNumber?: string;
  state?: string;
  stateCode?: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const access = localStorage.getItem(ACCESS_KEY);
      const refresh = localStorage.getItem(REFRESH_KEY);
      const userStr = localStorage.getItem(USER_KEY);
      const activeCompany = localStorage.getItem('smarterp_activeCompanyId');
      if (access && refresh && userStr) {
        setTokens({ accessToken: access, refreshToken: refresh, accessTokenExpiresIn: '15m', refreshTokenExpiresIn: '7d' });
        setUser(JSON.parse(userStr));
        setActiveCompanyIdState(activeCompany);
      }
    } catch (err) {
      console.error('Auth hydration failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync tokens to localStorage
  const persistTokens = useCallback((t: AuthTokens | null) => {
    if (t) {
      localStorage.setItem(ACCESS_KEY, t.accessToken);
      localStorage.setItem(REFRESH_KEY, t.refreshToken);
    } else {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('smarterp_activeCompanyId');
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      const res = await api.post<ApiSuccess<{ user: User; tokens: AuthTokens; companies: any[] }> | ApiError>(
        '/auth/login',
        { email, password },
      );
      if (!res.data.success) throw new Error((res.data as ApiError).error.message);
      const data = (res.data as ApiSuccess<{ user: User; tokens: AuthTokens; companies: any[] }>).data;
      setUser(data.user);
      setTokens(data.tokens);
      persistTokens(data.tokens);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      if (data.companies.length > 0) {
        setActiveCompanyIdState(data.companies[0].id);
        localStorage.setItem('smarterp_activeCompanyId', data.companies[0].id);
      }
      return data.user;
    },
    [persistTokens],
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<User> => {
      const res = await api.post<ApiSuccess<{ user: User; tokens: AuthTokens; companies: any[] }> | ApiError>(
        '/auth/register',
        input,
      );
      if (!res.data.success) throw new Error((res.data as ApiError).error.message);
      const data = (res.data as ApiSuccess<{ user: User; tokens: AuthTokens; companies: any[] }>).data;
      setUser(data.user);
      setTokens(data.tokens);
      persistTokens(data.tokens);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      if (data.companies.length > 0) {
        setActiveCompanyIdState(data.companies[0].id);
        localStorage.setItem('smarterp_activeCompanyId', data.companies[0].id);
      }
      return data.user;
    },
    [persistTokens],
  );

  const logout = useCallback(async () => {
    try {
      if (tokens?.refreshToken) {
        await api.post('/auth/logout', { refreshToken: tokens.refreshToken });
      } else {
        await api.post('/auth/logout', {});
      }
    } catch (err) {
      // ignore errors on logout
    } finally {
      setUser(null);
      setTokens(null);
      setActiveCompanyIdState(null);
      persistTokens(null);
    }
  }, [tokens, persistTokens]);

  const setActiveCompanyId = useCallback((id: string) => {
    setActiveCompanyIdState(id);
    localStorage.setItem('smarterp_activeCompanyId', id);
  }, []);

  const value: AuthContextValue = {
    user,
    tokens,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    setActiveCompanyId,
    activeCompanyId,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
