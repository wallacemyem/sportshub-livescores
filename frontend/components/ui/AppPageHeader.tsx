'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface AppPageHeaderProps {
  /** Page icon, rendered inside the tinted square. */
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  /** One-line description. Hidden below `sm` so it never wraps under the title. */
  subtitle?: string;
  /** Tailwind classes for the icon square. Defaults to the brand tint. */
  accentClassName?: string;
  /** Where the back arrow goes. Defaults to the live feed. */
  backHref?: string;
  backLabel?: string;
  /** Rendered to the right of the theme toggle. */
  actions?: React.ReactNode;
  /** Set false to drop the built-in theme toggle (e.g. when `actions` supplies one). */
  showThemeToggle?: boolean;
}

/**
 * The shared header for the signed-in pages (account, admin, pro, support, blog).
 *
 * Each of those pages had its own hand-rolled copy of this markup, which is how
 * their spacing drifted apart. The min-w-0/truncate chain here is what keeps a
 * long title from pushing the action buttons off the right edge on narrow screens.
 */
export function AppPageHeader({
  icon: Icon,
  title,
  subtitle,
  accentClassName = 'bg-[var(--brand-soft)] text-[color:var(--brand)] border-[var(--brand-ring)]',
  backHref = '/live',
  backLabel = 'Scores',
  actions,
  showThemeToggle = true,
}: AppPageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-surface-border bg-surface/90 px-4 py-3 backdrop-blur-md md:pl-20 lg:px-8 xl:px-8">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <Link
          href={backHref}
          className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{backLabel}</span>
        </Link>

        <span className="hidden h-4 w-px shrink-0 bg-surface-border sm:block" />

        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${accentClassName}`}
          >
            <Icon className="h-4 w-4" />
          </span>

          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold tracking-tight text-foreground sm:text-base">
              {title}
            </h1>
            {subtitle && (
              <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {showThemeToggle && <ThemeToggle />}
        {actions}
      </div>
    </header>
  );
}
