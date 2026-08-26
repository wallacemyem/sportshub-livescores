'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Radio, ArrowRight } from 'lucide-react';
import { Logo } from './Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { PlanBadge } from '@/components/brand/PlanBadge';

const NAV_LINKS = [
  { href: '/live', label: 'Scores' },
  { href: '/search', label: 'Search' },
  { href: '/tickets', label: 'My Tickets' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
  { href: '/support', label: 'Support' },
];

export function MarketingHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close the sheet on navigation so it never lingers over the next page.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Lock body scroll behind the mobile sheet.
  useEffect(() => {
    if (!isMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo size="sm" href="/" />

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-foreground bg-surface-subtle'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              <PlanBadge plan={user.plan} size="sm" />
              <Link
                href="/account"
                className="rounded-xl border border-surface-border bg-surface-subtle px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover"
              >
                My account
              </Link>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          )}
          <Link
            href="/live"
            className="flex items-center gap-1.5 rounded-xl bg-brand-gradient px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-500/25 transition-opacity hover:opacity-90"
          >
            <span>Track a slip</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-1.5 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            className="rounded-xl border border-surface-border bg-surface-subtle p-2 text-foreground transition-colors hover:bg-surface-hover"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sheet — sits below the bar rather than over it, so nothing overlaps the logo */}
      {isMenuOpen && (
        <div className="animate-in fade-in border-t border-surface-border bg-background md:hidden">
          <nav className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-4" aria-label="Mobile">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-surface-subtle text-foreground'
                      : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-surface-border pt-3">
              <Link
                href={user ? '/account' : '/auth/login'}
                className="rounded-xl border border-surface-border bg-surface-subtle px-3 py-3 text-center text-sm font-semibold text-foreground"
              >
                {user ? 'My account' : 'Sign in'}
              </Link>
              <Link
                href="/live"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-3 text-center text-sm font-bold text-white shadow-md shadow-indigo-500/25"
              >
                <Radio className="h-4 w-4" />
                <span>Track a slip</span>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
