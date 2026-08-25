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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-lg border-t border-surface-border px-2 py-2 select-none safe-area-pb">
      <div className="flex items-center justify-around">
        {/* Scores / Home */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded-xl transition-colors ${
            isHome ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span className="text-[9px] tracking-tight">Scores</span>
        </Link>

        {/* Global Game Search */}
        {onOpenSearchModal ? (
          <button
            onClick={onOpenSearchModal}
            className="flex flex-col items-center gap-1 py-1 px-1.5 rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span className="text-[9px] tracking-tight">Search</span>
          </button>
        ) : (
          <Link
            href="/"
            className="flex flex-col items-center gap-1 py-1 px-1.5 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <Search className="w-4 h-4" />
            <span className="text-[9px] tracking-tight">Search</span>
          </Link>
        )}

        {/* Live Filter Shortcut */}
        <Link
          href="/?filter=LIVE"
          className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded-xl transition-colors relative ${
            isHome ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Radio className="w-4 h-4 text-foreground animate-pulse" />
          <span className="text-[9px] tracking-tight flex items-center gap-1">
            Live
            {liveCount > 0 && (
              <span className="bg-surface-subtle text-foreground text-[8px] font-mono font-bold px-1 rounded border border-surface-border">
                {liveCount}
              </span>
            )}
          </span>
        </Link>

        {/* Editorial Blog */}
        <Link
          href="/blog"
          className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded-xl transition-colors ${
            isBlog ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          <span className="text-[9px] tracking-tight">Blog</span>
        </Link>

        {/* Support Helpdesk */}
        <Link
          href="/support"
          className={`flex flex-col items-center gap-1 py-1 px-1.5 rounded-xl transition-colors ${
            isSupport ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span className="text-[9px] tracking-tight">Support</span>
        </Link>

        {/* PRO */}
        {onOpenProModal ? (
          <button
            onClick={onOpenProModal}
            className="flex flex-col items-center gap-1 py-1 px-1.5 rounded-xl text-foreground font-bold hover:opacity-80 transition-opacity cursor-pointer"
          >
            <Shield className="w-4 h-4" />
            <span className="text-[9px] tracking-tight font-bold">PRO</span>
          </button>
        ) : (
          <Link
            href="/"
            className="flex flex-col items-center gap-1 py-1 px-1.5 rounded-xl text-foreground font-bold"
          >
            <Shield className="w-4 h-4" />
            <span className="text-[9px] tracking-tight font-bold">PRO</span>
          </Link>
        )}

        {/* Theme Toggle */}
        <ThemeToggle className="!p-1 !w-6 !h-6" />
      </div>
    </nav>
  );
}
