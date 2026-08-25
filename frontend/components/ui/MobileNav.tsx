'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radio, Newspaper, Headphones, Shield, Activity, Search } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface MobileNavProps {
  onOpenProModal?: () => void;
  onOpenSupportModal?: () => void;
  onOpenSearchModal?: () => void;
  liveCount?: number;
}

export function MobileNav({
  onOpenProModal,
  onOpenSupportModal,
  onOpenSearchModal,
  liveCount = 0,
}: MobileNavProps) {
  const pathname = usePathname();

  const isHome = pathname === '/';
  const isBlog = pathname.startsWith('/blog');
  const isSupport = pathname === '/support';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-xl border-t border-surface-border safe-area-pb">
      <div className="flex items-center justify-around px-1 py-1.5">
        {/* Scores / Home */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors min-w-[48px] ${
            isHome ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[9px] font-medium">Scores</span>
        </Link>

        {/* Global Game Search */}
        {onOpenSearchModal ? (
          <button
            onClick={onOpenSearchModal}
            className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-muted-foreground active:text-foreground transition-colors cursor-pointer min-w-[48px]"
          >
            <Search className="w-5 h-5" />
            <span className="text-[9px] font-medium">Search</span>
          </button>
        ) : (
          <Link
            href="/"
            className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-muted-foreground min-w-[48px]"
          >
            <Search className="w-5 h-5" />
            <span className="text-[9px] font-medium">Search</span>
          </Link>
        )}

        {/* Live Filter Shortcut */}
        <Link
          href="/?filter=LIVE"
          className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors relative min-w-[48px]"
        >
          <div className="relative">
            <Radio className="w-5 h-5 text-red-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </div>
          <span className="text-[9px] font-medium text-foreground flex items-center gap-1">
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
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors min-w-[48px] ${
            isBlog ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
          }`}
        >
          <Newspaper className="w-5 h-5" />
          <span className="text-[9px] font-medium">Blog</span>
        </Link>

        {/* Support Helpdesk */}
        <Link
          href="/support"
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors min-w-[48px] ${
            isSupport ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
          }`}
        >
          <Headphones className="w-5 h-5" />
          <span className="text-[9px] font-medium">Support</span>
        </Link>

        {/* PRO */}
        {onOpenProModal ? (
          <button
            onClick={onOpenProModal}
            className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl cursor-pointer min-w-[48px]"
          >
            <Shield className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400">PRO</span>
          </button>
        ) : (
          <Link
            href="/"
            className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl min-w-[48px]"
          >
            <Shield className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400">PRO</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
