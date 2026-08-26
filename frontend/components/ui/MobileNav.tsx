'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Radio, Newspaper, Headphones, Shield, Activity, Search, User, Server } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface MobileNavProps {
  onOpenProModal?: () => void;
  onOpenSupportModal?: () => void;
  onOpenSearchModal?: () => void;
  onSelectScores?: () => void;
  onSelectLive?: () => void;
  activeNav?: 'scores' | 'live' | 'blog' | 'support' | 'pro' | 'account' | 'admin';
  liveCount?: number;
}

export function MobileNav({
  onOpenProModal,
  onOpenSupportModal,
  onOpenSearchModal,
  onSelectScores,
  onSelectLive,
  activeNav,
  liveCount = 0,
}: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Determine current active item
  let currentActive: 'scores' | 'live' | 'blog' | 'support' | 'pro' | 'account' | 'admin' = 'scores';
  if (activeNav) {
    currentActive = activeNav;
  } else if (pathname.startsWith('/pro')) {
    currentActive = 'pro';
  } else if (pathname.startsWith('/support')) {
    currentActive = 'support';
  } else if (pathname.startsWith('/account') || pathname.startsWith('/auth')) {
    currentActive = 'account';
  } else if (pathname.startsWith('/admin')) {
    currentActive = 'admin';
  } else if (pathname.startsWith('/blog')) {
    currentActive = 'blog';
  } else if (pathname.startsWith('/match')) {
    currentActive = 'scores';
  } else if (pathname === '/') {
    currentActive = 'scores';
  }

  const handleScoresClick = (e: React.MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault();
      if (onSelectScores) {
        onSelectScores();
      }
    }
  };

  const handleLiveClick = (e: React.MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault();
      if (onSelectLive) {
        onSelectLive();
      }
    }
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. MOBILE: iOS Liquid Glass Floating Pill Dock (< md)                      */}
      {/* ========================================================================= */}
      <nav
        aria-label="Mobile Navigation Dock"
        className="md:hidden fixed bottom-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[430px] z-50 select-none pointer-events-auto"
      >
        {/* Glass Container */}
        <div className="relative rounded-full p-1.5 backdrop-blur-2xl backdrop-saturate-200 bg-white/75 dark:bg-slate-900/75 border border-white/60 dark:border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.16)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.6)] overflow-hidden before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-b before:from-white/30 before:to-transparent before:pointer-events-none">
          <div className="relative flex items-center justify-around z-10">
            {/* Scores / Home */}
            <Link
              href="/"
              onClick={handleScoresClick}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-full transition-all duration-200 min-w-[52px] ${
                currentActive === 'scores'
                  ? 'bg-white/90 dark:bg-white/15 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/10'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span className="text-[9px] font-medium">Scores</span>
            </Link>

            {/* Global Game Search */}
            {onOpenSearchModal ? (
              <button
                onClick={onOpenSearchModal}
                className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/10 active:scale-95 transition-all duration-200 cursor-pointer min-w-[52px]"
              >
                <Search className="w-4 h-4" />
                <span className="text-[9px] font-medium">Search</span>
              </button>
            ) : (
              <Link
                href="/"
                className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/10 transition-all duration-200 min-w-[52px]"
              >
                <Search className="w-4 h-4" />
                <span className="text-[9px] font-medium">Search</span>
              </Link>
            )}

            {/* Live Filter Shortcut */}
            <Link
              href="/?filter=LIVE"
              onClick={handleLiveClick}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-full transition-all duration-200 relative min-w-[52px] ${
                currentActive === 'live'
                  ? 'bg-white/90 dark:bg-white/15 text-red-600 dark:text-red-400 font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/10'
              }`}
            >
              <div className="relative">
                <Radio className={`w-4 h-4 ${currentActive === 'live' ? 'text-red-500' : 'text-muted-foreground'}`} />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </div>
              <span className="text-[9px] font-medium flex items-center gap-1">
                Live
                {liveCount > 0 && (
                  <span className="bg-red-500 text-white text-[8px] font-mono font-bold px-1 rounded-full min-w-[14px] text-center">
                    {liveCount}
                  </span>
                )}
              </span>
            </Link>

            {/* Editorial Blog */}
            <Link
              href="/blog"
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-full transition-all duration-200 min-w-[52px] ${
                currentActive === 'blog'
                  ? 'bg-white/90 dark:bg-white/15 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/10'
              }`}
            >
              <Newspaper className="w-4 h-4" />
              <span className="text-[9px] font-medium">Blog</span>
            </Link>

            {/* Support Helpdesk */}
            <Link
              href="/support"
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-full transition-all duration-200 min-w-[52px] ${
                currentActive === 'support'
                  ? 'bg-white/90 dark:bg-white/15 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/10'
              }`}
            >
              <Headphones className="w-4 h-4" />
              <span className="text-[9px] font-medium">Help</span>
            </Link>

            {/* PRO */}
            <Link
              href="/pro"
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-full transition-all duration-200 min-w-[52px] ${
                currentActive === 'pro'
                  ? 'bg-white/90 dark:bg-white/15 text-violet-600 dark:text-violet-400 font-bold shadow-sm'
                  : 'text-violet-600 dark:text-violet-400 hover:bg-white/40 dark:hover:bg-white/10'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span className="text-[9px] font-bold">PRO</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 2. BIGGER SCREENS: Liquid Glass Floating Side Nav Dock (>= md)             */}
      {/* ========================================================================= */}
      <aside
        aria-label="Desktop Side Navigation Dock"
        className="hidden md:flex fixed left-3 lg:left-4 top-1/2 -translate-y-1/2 z-40 select-none flex-col items-center pointer-events-auto"
      >
        <div className="relative rounded-2xl p-2 flex flex-col items-center gap-2 backdrop-blur-2xl backdrop-saturate-200 bg-white/70 dark:bg-slate-900/75 border border-white/60 dark:border-white/15 shadow-[0_16px_48px_rgba(0,0,0,0.14)] dark:shadow-[0_20px_56px_rgba(0,0,0,0.5)] overflow-hidden before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-b before:from-white/30 before:to-transparent before:pointer-events-none">
          {/* Scores Feed */}
          <Link
            href="/"
            onClick={handleScoresClick}
            title="Scores Feed"
            className={`group relative p-2.5 rounded-xl flex items-center justify-center transition-all duration-200 ${
              currentActive === 'scores'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10'
            }`}
          >
            <Activity className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
              Scores Feed
            </span>
          </Link>

          {/* Global Search */}
          {onOpenSearchModal ? (
            <button
              onClick={onOpenSearchModal}
              title="Search Games (⌘K)"
              className="group relative p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10 flex items-center justify-center transition-all duration-200 cursor-pointer"
            >
              <Search className="w-5 h-5" />
              <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
                Search (⌘K)
              </span>
            </button>
          ) : (
            <Link
              href="/"
              title="Search Games"
              className="group relative p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10 flex items-center justify-center transition-all duration-200"
            >
              <Search className="w-5 h-5" />
              <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
                Search
              </span>
            </Link>
          )}

          {/* Live Filter */}
          <Link
            href="/?filter=LIVE"
            onClick={handleLiveClick}
            title="Live Matches"
            className={`group relative p-2.5 rounded-xl flex items-center justify-center transition-all duration-200 ${
              currentActive === 'live'
                ? 'bg-red-500 text-white shadow-md shadow-red-500/30 font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10'
            }`}
          >
            <div className="relative">
              <Radio className={`w-5 h-5 ${currentActive === 'live' ? 'text-white' : 'text-red-500'}`} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </div>
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50 flex items-center gap-1.5">
              Live Matches
              {liveCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-mono px-1 rounded">
                  {liveCount}
                </span>
              )}
            </span>
          </Link>

          <div className="w-6 h-px bg-white/40 dark:bg-white/10 my-0.5" />

          {/* Editorial Blog */}
          <Link
            href="/blog"
            title="Editorial Blog"
            className={`group relative p-2.5 rounded-xl flex items-center justify-center transition-all duration-200 ${
              currentActive === 'blog'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10'
            }`}
          >
            <Newspaper className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
              Editorial Blog
            </span>
          </Link>

          {/* Customer Support */}
          <Link
            href="/support"
            title="Customer Support"
            className={`group relative p-2.5 rounded-xl flex items-center justify-center transition-all duration-200 ${
              currentActive === 'support'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10'
            }`}
          >
            <Headphones className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
              Support Desk
            </span>
          </Link>

          {/* PRO Upgrade */}
          <Link
            href="/pro"
            title="Upgrade to PRO"
            className={`group relative p-2.5 rounded-xl flex items-center justify-center transition-all duration-200 ${
              currentActive === 'pro'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30 font-bold'
                : 'text-violet-600 dark:text-violet-400 hover:bg-violet-500/15'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-violet-900 text-white text-[11px] font-bold rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
              PRO Pass
            </span>
          </Link>

          {/* Admin Dashboard */}
          <Link
            href="/admin"
            title="Admin Console (Port 19080)"
            className={`group relative p-2.5 rounded-xl flex items-center justify-center transition-all duration-200 ${
              currentActive === 'admin'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10'
            }`}
          >
            <Server className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
              Admin Console
            </span>
          </Link>

          {/* User Account */}
          <Link
            href="/account"
            title="User Account & Settings"
            className={`group relative p-2.5 rounded-xl flex items-center justify-center transition-all duration-200 ${
              currentActive === 'account'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg z-50">
              Account & Profile
            </span>
          </Link>

          <div className="w-6 h-px bg-white/40 dark:bg-white/10 my-0.5" />

          {/* Theme Toggle */}
          <div className="p-1 flex items-center justify-center">
            <ThemeToggle className="!p-1.5 !w-7 !h-7 hover:bg-white/60 dark:hover:bg-white/10" />
          </div>
        </div>
      </aside>
    </>
  );
}
