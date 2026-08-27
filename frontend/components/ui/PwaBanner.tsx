'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Bell,
  X,
  Share,
  PlusSquare,
  Sparkles,
  CheckCircle2,
  Smartphone,
  Zap,
  Radio,
  ShieldCheck,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { getDevicePlatform, isStandalonePWA } from '@/lib/pushManager';

export function PwaBanner() {
  const { isPushSubscribed, permission, subscribePush } = useNotification();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(true);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [justSubscribed, setJustSubscribed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detectedPlatform = getDevicePlatform();
    const standalone = isStandalonePWA();
    setPlatform(detectedPlatform);
    setIsStandalone(standalone);

    // Listen for Android beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if dismissed previously within 2 days
    const dismissedTime = localStorage.getItem('slipradar_pwa_banner_dismissed');
    const now = Date.now();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;

    if (!dismissedTime || now - parseInt(dismissedTime, 10) > twoDaysMs) {
      if (!standalone || Notification.permission !== 'granted') {
        setIsDismissed(false);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallAndroid = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsStandalone(true);
        // Automatically request notification permissions right after install
        handleEnableNotifications();
      }
    } else {
      handleEnableNotifications();
    }
  };

  const handleEnableNotifications = async () => {
    setIsSubscribing(true);
    try {
      const ok = await subscribePush(['all', 'live_matches', 'goal_alerts', 'betslip_alerts']);
      if (ok) {
        setJustSubscribed(true);
        setTimeout(() => {
          setIsDismissed(true);
        }, 3500);
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('slipradar_pwa_banner_dismissed', Date.now().toString());
  };

  // If already standalone AND push notifications are granted, do not show banner
  if (isStandalone && (permission === 'granted' || isPushSubscribed)) {
    return null;
  }

  // Floating pill if dismissed
  if (isDismissed) {
    if (permission === 'granted' && isStandalone) return null;
    return (
      <aside aria-label="Mobile App and Live Alerts" className="fixed bottom-4 left-4 z-40">
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className="flex items-center gap-2 bg-slate-950/90 backdrop-blur-md border border-indigo-500/40 text-indigo-300 px-3.5 py-2 rounded-full shadow-2xl text-xs font-bold hover:bg-slate-900 transition-all cursor-pointer select-none"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
          <span>Install App & Alerts</span>
        </button>
      </aside>
    );
  }

  return (
    <aside aria-label="Mobile App and Live Alerts Banner" className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 pointer-events-auto">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 350, damping: 26 }}
          className="relative"
        >
          {platform === 'android' ? (
            /* ========================================================================= */
            /* 1. Android Material You & Cyberpunk Sports Banner                         */
            /* ========================================================================= */
            <div className="bg-slate-950/95 backdrop-blur-2xl border-2 border-emerald-500/50 rounded-3xl p-5 shadow-2xl shadow-emerald-500/20 text-white relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-teal-500/15 rounded-full blur-2xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/30 flex items-center justify-center shrink-0">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Android Live Engine
                    </span>
                    <h3 className="font-black text-sm text-white leading-tight">
                      Install SlipRadar & Live Alerts
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Features List */}
              <div className="mt-3.5 text-xs text-slate-300 space-y-2 relative z-10">
                {justSubscribed ? (
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>Live score cards and push notifications activated!</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-[11px] text-slate-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Persistent lock-screen match scorecards that update in place</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Instant goal chimes & bet slip cashout alerts</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Zero browser URL bar · Full standalone speed</span>
                    </div>
                  </>
                )}
              </div>

              {/* CTA Buttons */}
              {!justSubscribed && (
                <div className="mt-4 flex items-center gap-2.5 relative z-10">
                  <button
                    type="button"
                    onClick={handleInstallAndroid}
                    disabled={isSubscribing}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold py-2.5 px-3 rounded-2xl text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install App (1-Tap)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleEnableNotifications}
                    disabled={isSubscribing || permission === 'granted'}
                    className={`flex-1 flex items-center justify-center gap-1.5 font-bold py-2.5 px-3 rounded-2xl text-xs transition-all cursor-pointer ${
                      permission === 'granted'
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 cursor-default'
                        : 'bg-white/10 hover:bg-white/15 border border-white/15 text-white'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                    <span>
                      {isSubscribing
                        ? 'Connecting...'
                        : permission === 'granted'
                        ? 'Alerts Active ✓'
                        : 'Enable Alerts'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================================= */
            /* 2. iOS Safari & PWA Cupertino Glass Banner                                */
            /* ========================================================================= */
            <div className="bg-slate-950/95 backdrop-blur-3xl border-2 border-indigo-500/50 rounded-3xl p-5 shadow-2xl shadow-indigo-500/20 text-white relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-400 p-0.5 shadow-lg shadow-indigo-500/30 flex items-center justify-center shrink-0">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-indigo-400" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> iOS Live Activity & Push
                    </span>
                    <h3 className="font-black text-sm text-white leading-tight">
                      Add to Home Screen & Enable Alerts
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="mt-3.5 text-xs text-slate-300 relative z-10 space-y-3">
                {justSubscribed ? (
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>iOS Live push notifications are now active!</span>
                  </div>
                ) : (
                  <>
                    <p className="leading-relaxed text-[11px] text-slate-300">
                      Install SlipRadar to unlock iOS Dynamic Island Live Activities and lock-screen
                      goal alerts on iOS 16.4+.
                    </p>

                    {/* iOS Step-by-Step Guide */}
                    {!isStandalone && (
                      <div className="p-3 bg-indigo-950/70 border border-indigo-500/30 rounded-2xl space-y-2">
                        <p className="font-bold text-slate-200 text-[11px]">
                          Quick 2-Step iOS Setup:
                        </p>
                        <div className="flex items-center gap-2.5 text-[11px] text-slate-300">
                          <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                            1
                          </span>
                          <span>
                            Tap Safari's <Share className="w-3.5 h-3.5 inline mx-0.5 text-indigo-400" /> <strong>Share</strong> button at bottom
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 text-[11px] text-slate-300">
                          <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                            2
                          </span>
                          <span>
                            Select <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-emerald-400" /> <strong>Add to Home Screen</strong>
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Action Buttons */}
              {!justSubscribed && (
                <div className="mt-4 flex items-center gap-2.5 relative z-10">
                  <button
                    type="button"
                    onClick={handleEnableNotifications}
                    disabled={isSubscribing || permission === 'granted'}
                    className={`w-full flex items-center justify-center gap-1.5 font-bold py-2.5 px-3 rounded-2xl text-xs shadow-lg transition-all cursor-pointer ${
                      permission === 'granted'
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 cursor-default'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/25'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                    <span>
                      {isSubscribing
                        ? 'Activating...'
                        : permission === 'granted'
                        ? 'Alerts Active ✓'
                        : 'Enable Live Goal Alerts'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}
