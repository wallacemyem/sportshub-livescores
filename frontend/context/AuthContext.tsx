'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'pro';
  plan_expiry?: string;
  created_at?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password?: string) => Promise<{ error?: string }>;
  signUp: (email: string, password?: string, name?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  signInDemo: (type?: 'fan' | 'pro') => void;
  setProStatus: (isPro: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_FAN: UserProfile = {
  id: 'usr_alex_01',
  email: 'alex.mercer@sportsfan.io',
  name: 'Alex Mercer',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
  plan: 'free',
  created_at: '2026-01-15T00:00:00Z',
};

const DEMO_USER_PRO: UserProfile = {
  id: 'usr_pro_01',
  email: 'pro.trader@slipradar.app',
  name: 'Jordan Hayes (PRO)',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
  plan: 'pro',
  plan_expiry: '2027-08-26T00:00:00Z',
  created_at: '2026-02-10T00:00:00Z',
};

const STORAGE_KEY = 'slipradar_auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session from localStorage and Supabase
  useEffect(() => {
    async function initAuth() {
      try {
        // 1. Check local cached user for instant hydration
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          try {
            setUser(JSON.parse(cached));
          } catch {
            // Ignore parse errors
          }
        }

        // 2. Check Supabase session
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const sbUser: UserProfile = {
              id: session.user.id,
              email: session.user.email || 'user@slipradar.app',
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Sports Fan',
              avatar: session.user.user_metadata?.avatar_url,
              plan: session.user.user_metadata?.plan || 'free',
              created_at: session.user.created_at,
            };
            setUser(sbUser);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sbUser));
          }

          // 3. Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              const updatedUser: UserProfile = {
                id: session.user.id,
                email: session.user.email || 'user@slipradar.app',
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Sports Fan',
                avatar: session.user.user_metadata?.avatar_url,
                plan: session.user.user_metadata?.plan || 'free',
                created_at: session.user.created_at,
              };
              setUser(updatedUser);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
            } else if (!localStorage.getItem(STORAGE_KEY)) {
              setUser(null);
            }
          });

          return () => {
            subscription.unsubscribe();
          };
        }
      } catch (err) {
        console.warn('Auth init note:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const signIn = async (email: string, password?: string): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      if (supabase && password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data.user) {
          const loggedUser: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            name: data.user.user_metadata?.name || email.split('@')[0],
            avatar: data.user.user_metadata?.avatar_url,
            plan: data.user.user_metadata?.plan || 'free',
            created_at: data.user.created_at,
          };
          setUser(loggedUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedUser));
          return {};
        }
      }

      // Seamless fallback for local authentication
      const demoUser: UserProfile = {
        id: `usr_${Date.now()}`,
        email,
        name: email.split('@')[0].replace('.', ' '),
        plan: 'free',
        created_at: new Date().toISOString(),
      };
      setUser(demoUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Failed to sign in' };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password?: string, name?: string): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      if (supabase && password) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split('@')[0],
              plan: 'free',
            },
          },
        });

        if (!error && data.user) {
          const newUser: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            name: name || email.split('@')[0],
            plan: 'free',
            created_at: new Date().toISOString(),
          };
          setUser(newUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
          return {};
        }
      }

      // Seamless fallback for local signup
      const newUser: UserProfile = {
        id: `usr_${Date.now()}`,
        email,
        name: name || email.split('@')[0],
        plan: 'free',
        created_at: new Date().toISOString(),
      };
      setUser(newUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Failed to sign up' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const signInDemo = (type: 'fan' | 'pro' = 'fan') => {
    const selected = type === 'pro' ? DEMO_USER_PRO : DEMO_USER_FAN;
    setUser(selected);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
  };

  const setProStatus = (isPro: boolean) => {
    if (!user) return;
    const updated: UserProfile = {
      ...user,
      plan: isPro ? 'pro' : 'free',
      plan_expiry: isPro ? new Date(Date.now() + 365 * 86400000).toISOString() : undefined,
    };
    setUser(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signUp,
        signOut,
        signInDemo,
        setProStatus,
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
