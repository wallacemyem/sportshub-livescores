'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, X, Radio, ArrowRight, Zap } from 'lucide-react';
import Link from 'next/link';
import {
  sendMatchNotification,
  requestNotificationPermission,
  playMatchAlertSound,
} from '@/lib/notifications';

export interface MatchAlert {
  id: string;
  title: string;
  body: string;
  matchId?: string;
  type: 'goal' | 'kickoff' | 'point' | 'event';
  timestamp: Date;
}

interface NotificationContextType {
  alertsEnabled: boolean;
  setAlertsEnabled: (enabled: boolean) => void;
  triggerAlert: (title: string, body: string, type?: 'goal' | 'kickoff' | 'point' | 'event', matchId?: string) => void;
  requestPermission: () => Promise<boolean>;
  activeToast: MatchAlert | null;
  dismissToast: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  alertsEnabled: true,
  setAlertsEnabled: () => {},
  triggerAlert: () => {},
  requestPermission: async () => false,
  activeToast: null,
  dismissToast: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(true);
  const [activeToast, setActiveToast] = useState<MatchAlert | null>(null);

  // Load alert preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('slipradar_alerts_enabled');
      if (saved !== null) {
        setAlertsEnabled(saved === 'true');
      }
    }
  }, []);

  const handleSetAlertsEnabled = (enabled: boolean) => {
    setAlertsEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('slipradar_alerts_enabled', String(enabled));
    }
    if (enabled) {
      requestNotificationPermission();
    }
  };

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const triggerAlert = useCallback(
    (title: string, body: string, type: 'goal' | 'kickoff' | 'point' | 'event' = 'goal', matchId?: string) => {
      if (!alertsEnabled) return;

      const alert: MatchAlert = {
        id: Math.random().toString(36).substring(2, 9),
        title,
        body,
        matchId,
        type,
        timestamp: new Date(),
      };

      setActiveToast(alert);

      // Trigger native notification & audio
      sendMatchNotification(title, {
        body,
        type,
        url: matchId ? `/match/${matchId}` : undefined,
      });

      // Auto dismiss in-app toast after 6 seconds
      setTimeout(() => {
        setActiveToast((current) => (current?.id === alert.id ? null : current));
      }, 6000);
    },
    [alertsEnabled]
  );

  return (
    <NotificationContext.Provider
      value={{
        alertsEnabled,
        setAlertsEnabled: handleSetAlertsEnabled,
        triggerAlert,
        requestPermission: requestNotificationPermission,
        activeToast,
        dismissToast,
      }}
    >
      {children}

      {/* Floating In-App Alert Toast */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed top-4 right-4 z-50 max-w-sm w-full pointer-events-auto"
          >
            <div className="bg-surface/95 backdrop-blur-xl border-2 border-red-500/40 rounded-2xl p-4 shadow-2xl shadow-red-500/20 text-foreground overflow-hidden relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-md shadow-red-500/30 shrink-0 mt-0.5 animate-bounce">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider text-red-500 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Live Match Alert
                    </span>
                    <h4 className="font-bold text-sm text-foreground mt-0.5">{activeToast.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{activeToast.body}</p>

                    {activeToast.matchId && (
                      <Link
                        href={`/match/${activeToast.matchId}`}
                        onClick={dismissToast}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <span>View Match Center</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={dismissToast}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-surface-subtle transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
