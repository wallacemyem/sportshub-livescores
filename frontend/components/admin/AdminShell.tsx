'use client';

import Link from 'next/link';
import { ArrowLeft, RefreshCw, AlertTriangle, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export interface AdminSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Count shown on the right of the nav item. */
  badge?: number;
  /** Renders the badge as a warning rather than a neutral count. */
  badgeTone?: 'neutral' | 'danger';
}

interface AdminShellProps {
  sections: AdminSection[];
  activeId: string;
  onSelect: (id: string) => void;
  title: string;
  description: string;
  /** Set when the API could not be reached. */
  offline?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  lastUpdated?: Date | null;
  children: React.ReactNode;
}

/**
 * Console chrome: a persistent left rail on desktop, a sheet on mobile.
 *
 * The console deliberately does not render the consumer navigation dock. An
 * operator tool needs its own stable navigation, and mixing the two meant the
 * floating dock sat on top of the data tables. The way back to the app is the
 * link at the top of the rail.
 */
export function AdminShell({
  sections,
  activeId,
  onSelect,
  title,
  description,
  offline = false,
  isRefreshing = false,
  onRefresh,
  lastUpdated,
  children,
}: AdminShellProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);

  const handleSelect = (id: string) => {
    onSelect(id);
    setIsNavOpen(false);
  };

  const navItems = (
    <nav className="space-y-0.5" aria-label="Admin sections">
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = section.id === activeId;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => handleSelect(section.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-[var(--brand-soft)] text-[color:var(--brand)]'
                : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{section.label}</span>
            {typeof section.badge === 'number' && section.badge > 0 && (
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums ${
                  section.badgeTone === 'danger'
                    ? 'bg-red-500 text-white'
                    : 'bg-surface-hover text-muted-foreground'
                }`}
              >
                {section.badge > 99 ? '99+' : section.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-surface-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsNavOpen((open) => !open)}
              aria-expanded={isNavOpen}
              aria-label={isNavOpen ? 'Close sections' : 'Open sections'}
              className="rounded-lg border border-surface-border bg-surface-subtle p-2 text-foreground transition-colors hover:bg-surface-hover lg:hidden"
            >
              {isNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>

            <Logo size="sm" href="/live" showWordmark={false} />

            <div className="min-w-0">
              <span className="flex items-center gap-2">
                <h1 className="truncate text-sm font-bold text-foreground">Admin console</h1>
                <span className="hidden shrink-0 rounded border border-surface-border bg-surface-subtle px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:inline">
                  Internal
                </span>
              </span>
              <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
                SlipRadar operations
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {lastUpdated && !offline && (
              <span className="hidden font-mono text-[11px] text-muted-foreground xl:inline">
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh data"
                aria-label="Refresh data"
                className="cursor-pointer rounded-lg border border-surface-border bg-surface-subtle p-2 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
              </button>
            )}

            <ThemeToggle />

            <Link
              href="/live"
              className="hidden items-center gap-1.5 rounded-lg border border-surface-border bg-surface-subtle px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-surface-hover sm:flex"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Exit</span>
            </Link>
          </div>
        </div>

        {/* Mobile section sheet */}
        {isNavOpen && (
          <div className="animate-in fade-in border-t border-surface-border bg-surface px-4 py-3 lg:hidden">
            {navItems}
            <Link
              href="/live"
              className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>Back to SlipRadar</span>
            </Link>
          </div>
        )}
      </header>

      {offline && (
        <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="mx-auto flex w-full max-w-[1600px] items-start gap-2.5 px-4 py-2.5 sm:px-6">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              <strong className="font-bold">Cannot reach the API.</strong> Tables below are empty
              because no data could be loaded — they are not showing zero activity. Check that the
              backend is running, then refresh.
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-6 px-4 py-6 sm:px-6">
        {/* Desktop rail */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-20">
            {navItems}
            <div className="mt-4 border-t border-surface-border pt-4">
              <Link
                href="/live"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>Back to SlipRadar</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          <div className="mb-5">
            <h2 className="text-xl font-black tracking-tight text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
