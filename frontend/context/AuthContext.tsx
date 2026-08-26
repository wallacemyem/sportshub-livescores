'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getApiBaseUrl } from '@/lib/api';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'user' | string;
  is_admin: boolean;
  plan: 'free' | 'pro' | 'elite';
  plan_expiry?: string;
  status?: string;
  created_at?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password?: string) => Promise<{ error?: string; user?: UserProfile }>;
  signUp: (email: string, password?: string, name?: string) => Promise<{ error?: string; user?: UserProfile }>;
  signOut: () => Promise<void>;
  setProStatus: (isPro: boolean) => void;
  updatePlan: (newPlan: 'free' | 'pro' | 'elite') => Promise<{ error?: string; user?: UserProfile }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_USER_KEY = 'slipradar_auth_user';
const STORAGE_TOKEN_KEY = 'slipradar_auth_token';

function setAuthCookies(token: string, user: UserProfile) {
  if (typeof document === 'undefined') return;
  const maxAge = 7 * 24 * 60 * 60; // 7 days
  document.cookie = `slipradar_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `slipradar_role=${encodeURIComponent(user.role || 'user')}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `slipradar_is_admin=${user.is_admin ? 'true' : 'false'}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearAuthCookies() {
  if (typeof document === 'undefined') return;
  document.cookie = 'slipradar_token=; path=/; max-age=0; SameSite=Lax';
  document.cookie = 'slipradar_role=; path=/; max-age=0; SameSite=Lax';
  document.cookie = 'slipradar_is_admin=; path=/; max-age=0; SameSite=Lax';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session from localStorage and backend
  useEffect(() => {
    async function initAuth() {
      try {
        const cachedUser = localStorage.getItem(STORAGE_USER_KEY);
        const cachedToken = localStorage.getItem(STORAGE_TOKEN_KEY);

        if (cachedToken && cachedUser) {
          try {
            const parsedUser: UserProfile = JSON.parse(cachedUser);
            setUser(parsedUser);
            setToken(cachedToken);
            setAuthCookies(cachedToken, parsedUser);
          } catch {
            // Ignore parse errors
          }
        }

        // Verify token with backend /api/v1/auth/me
        if (cachedToken) {
          try {
            const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
              headers: {
                Authorization: `Bearer ${cachedToken}`,
              },
            });
            if (res.ok) {
              const freshUser: UserProfile = await res.json();
              setUser(freshUser);
              localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(freshUser));
              setAuthCookies(cachedToken, freshUser);
            } else if (res.status === 401) {
              // Token expired
              setUser(null);
              setToken(null);
              localStorage.removeItem(STORAGE_USER_KEY);
              localStorage.removeItem(STORAGE_TOKEN_KEY);
              clearAuthCookies();
            }
          } catch {
            // Offline or network warning
          }
        }
      } catch (err) {
        console.warn('[AUTH] Init note:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const signIn = async (email: string, password?: string): Promise<{ error?: string; user?: UserProfile }> => {
    setIsLoading(true);
    try {
      if (!password) {
        return { error: 'Password is required' };
      }

      // 1. Authenticate with Go Backend API
      const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Authentication failed' };
      }

      const loggedUser: UserProfile = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        avatar: data.user.avatar,
        role: data.user.role || 'user',
        is_admin: data.user.is_admin || data.user.role === 'admin',
        plan: data.user.plan || 'free',
        plan_expiry: data.user.plan_expiry,
        status: data.user.status,
        created_at: data.user.created_at,
      };

      const authToken = data.token;
      setUser(loggedUser);
      setToken(authToken);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(loggedUser));
      localStorage.setItem(STORAGE_TOKEN_KEY, authToken);
      setAuthCookies(authToken, loggedUser);

      // Optional Supabase auth sync in parallel
      if (supabase) {
        try {
          await supabase.auth.signInWithPassword({ email: email.trim(), password });
        } catch {
          // Non-blocking
        }
      }

      return { user: loggedUser };
    } catch (err: any) {
      return { error: err?.message || 'Network error occurred during login' };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password?: string,
    name?: string
  ): Promise<{ error?: string; user?: UserProfile }> => {
    setIsLoading(true);
    try {
      if (!password || password.length < 6) {
        return { error: 'Password must be at least 6 characters long' };
      }
      if (!name || !name.trim()) {
        return { error: 'Full name is required' };
      }

      // 1. Register with Go Backend API
      const res = await fetch(`${getApiBaseUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Registration failed' };
      }

      const newUser: UserProfile = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role || 'user',
        is_admin: data.user.is_admin || false,
        plan: data.user.plan || 'free',
        status: data.user.status,
        created_at: data.user.created_at,
      };

      const authToken = data.token;
      setUser(newUser);
      setToken(authToken);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(newUser));
      localStorage.setItem(STORAGE_TOKEN_KEY, authToken);
      setAuthCookies(authToken, newUser);

      // Optional Supabase signup sync
      if (supabase) {
        try {
          await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: { name: name.trim(), plan: 'free' },
            },
          });
        } catch {
          // Non-blocking
        }
      }

      return { user: newUser };
    } catch (err: any) {
      return { error: err?.message || 'Network error occurred during registration' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      if (token) {
        await fetch(`${getApiBaseUrl()}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
      if (supabase) {
        await supabase.auth.signOut().catch(() => {});
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem(STORAGE_USER_KEY);
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      clearAuthCookies();
    }
  };

  const setProStatus = (isPro: boolean) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      plan: isPro ? 'pro' : 'free',
      plan_expiry: isPro ? new Date(Date.now() + 365 * 86400000).toISOString() : undefined,
    };
    setUser(updated);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updated));
  };

  const updatePlan = async (newPlan: 'free' | 'pro' | 'elite'): Promise<{ error?: string; user?: UserProfile }> => {
    try {
      if (!token) {
        return { error: 'You must be signed in to change your plan' };
      }
      const res = await fetch(`${getApiBaseUrl()}/auth/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: newPlan }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Failed to update plan' };
      }

      const updatedUser: UserProfile = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        avatar: data.user.avatar,
        role: data.user.role || 'user',
        is_admin: data.user.is_admin || data.user.role === 'admin',
        plan: data.user.plan,
        plan_expiry: data.user.plan_expiry,
        status: data.user.status,
        created_at: data.user.created_at,
      };

      const newToken = data.token || token;
      setUser(updatedUser);
      setToken(newToken);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updatedUser));
      localStorage.setItem(STORAGE_TOKEN_KEY, newToken);
      setAuthCookies(newToken, updatedUser);

      return { user: updatedUser };
    } catch (err: any) {
      return { error: err?.message || 'Network error updating plan' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        signIn,
        signUp,
        signOut,
        setProStatus,
        updatePlan,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
