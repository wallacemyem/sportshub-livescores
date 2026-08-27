'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Radio,
  Bell,
  Smartphone,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowLeft,
  Share,
  PlusSquare,
  Volume2,
  VolumeX,
  Play,
  Square,
  ShieldCheck,
  Ticket,
  Plus,
  Trash2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Match, BetSlip } from '@/types';
import { getApiBaseUrl } from '@/lib/api';
import { getCachedData, setCachedData } from '@/lib/cache';
import { formatClock, formatScore } from '@/lib/sportFormat';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import {
  startNativeLiveActivity,
  updateNativeLiveActivity,
  stopNativeLiveActivity,
  getActiveNativeLiveMatch,
  generateScoreboardArtwork,
} from '@/lib/nativeLiveActivity';
import { getDevicePlatform, isStandalonePWA } from '@/lib/pushManager';
import { MobileNav } from '@/components/ui/MobileNav';
import { Logo } from '@/components/brand/Logo';

export default function LiveActivitiesPage() {
  const { user, token } = useAuth();
  const { isPushSubscribed, permission, subscribePush } = useNotification();
  const [matches, setMatches] = useState<Match[]>([]);
  const [betSlips, setBetSlips] = useState<BetSlip[]>([]);
  const [activeLiveMatchId, setActiveLiveMatchId] = useState<string | null>(null);
  const [customTrackedIds, setCustomTrackedIds] = useState<string[]>([]);
  const [previewArtwork, setPreviewArtwork] = useState<string>('');
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [selectedSportTab, setSelectedSportTab] = useState<string>('all');

  const slipCacheKey = `slips_${user?.id || 'guest'}`;

  // Initial load & device detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setPlatform(getDevicePlatform());
    setIsStandalone(isStandalonePWA());

    // Load custom followed matches from localStorage
    const savedFollowed = localStorage.getItem('slipradar_followed_matches');
    if (savedFollowed) {
      try {
        setCustomTrackedIds(JSON.parse(savedFollowed));
      } catch {
        // ignore
      }
    }

    // Check if there is already an active native live match
    const active = getActiveNativeLiveMatch();
    if (active) {
      setActiveLiveMatchId(active.id);
      setPreviewArtwork(generateScoreboardArtwork(active));
    }

    // Load matches and slips
    const cachedMatches = getCachedData<Match[]>('matches');
    const cachedSlips = getCachedData<BetSlip[]>(slipCacheKey);
    if (cachedMatches) setMatches(cachedMatches);
    if (cachedSlips) setBetSlips(cachedSlips);

    async function loadData() {
      try {
        const apiBase = getApiBaseUrl();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const [matchRes, slipRes] = await Promise.all([
          fetch(`${apiBase}/matches`),
          fetch(`${apiBase}/betslip`, { headers }),
        ]);

        if (matchRes.ok) {
          const d = await matchRes.json();
          if (d.matches) {
            setMatches(d.matches);
            setCachedData('matches', d.matches);
          }
        }
        if (slipRes.ok) {
          const d = await slipRes.json();
          if (d.slips) {
            setBetSlips(d.slips);
            setCachedData(slipCacheKey, d.slips);
          }
        }
      } catch (err) {
        console.warn('Connecting to API...', err);
      }
    }

    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [user?.id, token]);

  // Extract match IDs from user's loaded bet slips
  const ticketMatchIds = useMemo(() => {
    const ids = new Set<string>();
    betSlips.forEach((slip) => {
      slip.legs?.forEach((leg) => {
        if (leg.match_id) ids.add(leg.match_id);
        if (leg.match?.id) ids.add(leg.match_id || leg.match.id);
      });
    });
    return ids;
  }, [betSlips]);

  // Combined set of all matches the user has added (from slips + custom followed)
  const allUserAddedMatchIds = useMemo(() => {
    const set = new Set<string>(ticketMatchIds);
    customTrackedIds.forEach((id) => set.add(id));
    return set;
  }, [ticketMatchIds, customTrackedIds]);

  // Matches the user has added
  const userAddedMatches = useMemo(() => {
    return matches.filter((m) => allUserAddedMatchIds.has(m.id));
  }, [matches, allUserAddedMatchIds]);

  // Active match object for the lock screen preview
  const activeMatch = useMemo(() => {
    if (!activeLiveMatchId) return null;
    return matches.find((m) => m.id === activeLiveMatchId) || null;
  }, [matches, activeLiveMatchId]);

  // Keep preview artwork updated
  useEffect(() => {
    if (activeMatch) {
      const art = generateScoreboardArtwork(activeMatch);
      setPreviewArtwork(art);
      updateNativeLiveActivity(activeMatch);
    }
  }, [activeMatch]);

  // Toggle tracking on native Lock Screen
  const handleToggleNativeActivity = async (match: Match) => {
    if (activeLiveMatchId === match.id) {
      stopNativeLiveActivity();
      setActiveLiveMatchId(null);
      setPreviewArtwork('');
    } else {
      const ok = await startNativeLiveActivity(match);
      if (ok) {
        setActiveLiveMatchId(match.id);
        setPreviewArtwork(generateScoreboardArtwork(match));
      }
    }
  };

  // Add/remove custom followed match
  const handleToggleFollowMatch = (matchId: string) => {
    setCustomTrackedIds((prev) => {
      let next: string[];
      if (prev.includes(matchId)) {
        next = prev.filter((id) => id !== matchId);
      } else {
        next = [...prev, matchId];
      }
      localStorage.setItem('slipradar_followed_matches', JSON.stringify(next));

      // Sync push channels with updated matches
      if (isPushSubscribed) {
        const matchChannels = Array.from(new Set([...Array.from(ticketMatchIds), ...next])).map(
          (id) => `match_${id}`
        );
        subscribePush(['all', 'betslip_alerts', ...matchChannels]);
      }

      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/live"
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Logo />
        </div>

        <div className="flex items-center gap-2">
          {activeLiveMatchId && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold animate-pulse">
              <Radio className="w-3.5 h-3.5" />
              <span>Native Lock Screen Active</span>
            </div>
          )}
          <Link
            href="/live"
            className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            Back to Match Board
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Section */}
        <div className="relative rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-slate-950 border border-indigo-500/30 p-6 sm:p-8 overflow-hidden shadow-2xl">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-bold">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>NATIVE SYSTEM LIVE ACTIVITIES</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Native Lock Screen & Dynamic Island Scoreboard
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Track live scores directly on your iPhone Lock Screen, Dynamic Island, and Android
              Notification Shade. Score updates and goal pushes are strictly delivered{' '}
              <strong>only for games you have added</strong>.
            </p>
          </div>
        </div>

        {/* Section 1: User's Added Games (Bet Slips + Followed Matches) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
                <Ticket className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Your Tracked Games</h2>
                <p className="text-xs text-slate-400">
                  {userAddedMatches.length} games in your bet slips and watchlist
                </p>
              </div>
            </div>

            <Link
              href="/live"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <span>+ Add more from board</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {userAddedMatches.length === 0 ? (
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-white/10 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-slate-400">
                <Ticket className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-200">No games added yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Import a booking code (Bet9ja, SportyBet, 1xBet) or click "+ Add to Live Activity"
                  on any game below to start native lock screen tracking.
                </p>
              </div>
              <Link
                href="/live"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Browse Live Games</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userAddedMatches.map((m) => {
                const isPlayingNative = activeLiveMatchId === m.id;
                const isFromTicket = ticketMatchIds.has(m.id);

                return (
                  <div
                    key={m.id}
                    className={`p-5 rounded-3xl border transition-all ${
                      isPlayingNative
                        ? 'bg-indigo-950/60 border-indigo-500 shadow-xl shadow-indigo-500/20'
                        : 'bg-slate-900/80 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                      <span className="font-semibold text-slate-300">
                        {m.league?.name || 'League Match'}
                      </span>
                      <div className="flex items-center gap-2">
                        {isFromTicket && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono text-[10px] font-bold">
                            Ticket Leg
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                            m.status === 'LIVE'
                              ? 'bg-emerald-500/20 text-emerald-400 animate-pulse'
                              : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {m.status === 'LIVE' ? formatClock(m) : m.status}
                        </span>
                      </div>
                    </div>

                    {/* Match Teams & Score */}
                    <div className="flex items-center justify-between gap-4 my-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {m.home_team.logo ? (
                          <img
                            src={m.home_team.logo}
                            alt=""
                            className="w-7 h-7 object-contain rounded-full bg-white/5 p-0.5"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs">
                            {m.home_team.name.slice(0, 1)}
                          </div>
                        )}
                        <span className="font-bold text-sm text-white truncate">
                          {m.home_team.name}
                        </span>
                      </div>

                      <div className="font-mono text-xl font-black text-white px-3 py-1 bg-white/5 rounded-xl border border-white/10 tabular-nums">
                        {m.home_score} - {m.away_score}
                      </div>

                      <div className="flex items-center justify-end gap-3 flex-1 min-w-0">
                        <span className="font-bold text-sm text-white truncate text-right">
                          {m.away_team.name}
                        </span>
                        {m.away_team.logo ? (
                          <img
                            src={m.away_team.logo}
                            alt=""
                            className="w-7 h-7 object-contain rounded-full bg-white/5 p-0.5"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs">
                            {m.away_team.name.slice(0, 1)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleNativeActivity(m)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isPlayingNative
                            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                            : 'bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white shadow-lg shadow-indigo-600/25'
                        }`}
                      >
                        {isPlayingNative ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>Stop Lock Screen Widget</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Pin to Lock Screen (iOS/Android)</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleFollowMatch(m.id)}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Remove from Tracked List"
                      >
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 2: Native Lock Screen Live Simulator & Preview */}
        {activeMatch && previewArtwork && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Live on Your Lock Screen Now
                </h2>
                <p className="text-xs text-slate-400">
                  Dynamic high-res canvas rendering playing via Apple & Android MediaSession
                </p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/40 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-4 flex justify-center">
                {/* Simulated Apple Lock Screen Widget */}
                <div className="w-64 rounded-3xl overflow-hidden border-4 border-slate-700 shadow-2xl bg-black">
                  <img
                    src={previewArtwork}
                    alt="Live Lock Screen Scoreboard"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>

              <div className="lg:col-span-8 space-y-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Real-time Sync Active</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {activeMatch.home_team.name} vs {activeMatch.away_team.name}
                  </h3>
                  <p className="text-xs text-slate-300">
                    When you lock your phone or switch apps, this live widget stays visible on your
                    lock screen and Dynamic Island.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      stopNativeLiveActivity();
                      setActiveLiveMatchId(null);
                      setPreviewArtwork('');
                    }}
                    className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Deactivate Live Activity</span>
                  </button>
                  <Link
                    href={`/match/${activeMatch.id}`}
                    className="bg-white/10 hover:bg-white/15 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    Match Details
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section 3: Add More Games via Search */}
        <section className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Want to Track More Games?</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-xl">
              Search any live or upcoming game across football, basketball, tennis, and more to add it to your Live Activities and receive native lock-screen pushes.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <span>Search All Games</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <MobileNav activeNav="scores" onSelectScores={() => {}} onOpenProModal={() => {}} onOpenSupportModal={() => {}} onOpenSearchModal={() => {}} liveCount={matches.filter(m => m.status === 'LIVE').length} />
    </div>
  );
}
