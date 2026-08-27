'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Radio,
  Newspaper,
  Headphones,
  Crown,
  Activity,
  Search,
  Ticket,
  User,
  Server,
  Home,
  Shield,
  Gem,
  Zap,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { getPlanConfig } from '@/components/brand/PlanBadge';

type NavKey = 'scores' | 'search' | 'tickets' | 'activities' | 'blog' | 'support' | 'pro' | 'account' | 'admin' | 'plan';

interface MobileNavProps {
  onOpenProModal?: () => void;
  onOpenSupportModal?: () => void;
  onOpenSearchModal?: () => void;
  onSelectScores?: () => void;
  activeNav?: NavKey;
  liveCount?: number;
}

/** Resolve the highlighted item from the route when the page does not pin one. */
function resolveActive(pathname: string, activeNav?: NavKey): NavKey {
  if (activeNav) return activeNav;
  if (pathname.startsWith('/activities')) return 'activities';
  if (pathname.startsWith('/tickets')) return 'tickets';
  if (pathname.startsWith('/search')) return 'search';
  if (pathname.startsWith('/account/plan')) return 'plan';
  if (pathname.startsWith('/pro') || pathname.startsWith('/pricing')) return 'pro';
  if (pathname.startsWith('/support')) return 'support';
  if (pathname.startsWith('/account') || pathname.startsWith('/auth')) return 'account';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/blog')) return 'blog';
  return 'scores';
}

export function MobileNav({
  onOpenSearchModal,
  onSelectScores,
  activeNav,
  liveCount = 0,
}: MobileNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const currentActive = resolveActive(pathname, activeNav);
  const isTrackerPage = pathname === '/live';

  const planConfig = getPlanConfig(user?.plan);
  const PlanIcon = planConfig.icon;

  // On the tracker itself this can reset the feed filter.
  const handleScoresClick = (e: React.MouseEvent) => {
    if (isTrackerPage && onSelectScores) {
      e.preventDefault();
      onSelectScores();
    }
  };

  return (
    <>
      {/* ===================================================================== */}
      {/* 1. MOBILE: floating glass dock (< md)                                  */}
      {/* ===================================================================== */}
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 select-none pointer-events-none px-3 pb-3 pb-safe"
      >
        <div className="pointer-events-auto mx-auto w-full max-w-[420px] rounded-2xl p-1.5 backdrop-blur-2xl backdrop-saturate-200 bg-white/80 dark:bg-slate-900/80 border border-white/60 dark:border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.16)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
          <div className="grid grid-cols-5 items-stretch gap-0.5">
            {/* Scores (Merged Scores + Live) */}
            <Link
              href="/live"
              onClick={handleScoresClick}
              aria-current={currentActive === 'scores' ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 px-0.5 transition-colors duration-200 ${
                currentActive === 'scores'
                  ? 'bg-white/90 dark:bg-white/15 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-muted-foreground active:bg-white/50 dark:active:bg-white/10'
              }`}
            >
              <span className="relative shrink-0">
                <Radio className={`w-[18px] h-[18px] ${liveCount > 0 ? 'text-red-500 animate-pulse' : ''}`} />
                {liveCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[15px] rounded-full bg-red-500 px-1 text-[9px] font-bold leading-[15px] text-white text-center">
                    {liveCount > 99 ? '99+' : liveCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-semibold leading-none">Scores</span>
            </Link>

            {/* Search */}
            <Link
              href="/search"
              aria-current={currentActive === 'search' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 px-0.5 transition-colors duration-200 ${
                currentActive === 'search'
                  ? 'bg-white/90 dark:bg-white/15 text-violet-600 dark:text-violet-400 shadow-sm'
                  : 'text-muted-foreground active:bg-white/50 dark:active:bg-white/10'
              }`}
            >
              <Search className="w-[18px] h-[18px] shrink-0" />
              <span className="text-[10px] font-semibold leading-none">Search</span>
            </Link>

            {/* My Tickets */}
            <Link
              href="/tickets"
              aria-current={currentActive === 'tickets' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 px-0.5 transition-colors duration-200 ${
                currentActive === 'tickets'
                  ? 'bg-white/90 dark:bg-white/15 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-muted-foreground active:bg-white/50 dark:active:bg-white/10'
              }`}
            >
              <Ticket className="w-[18px] h-[18px] shrink-0" />
              <span className="text-[10px] font-semibold leading-none">Tickets</span>
            </Link>

            {/* Plan with Dynamic Icon */}
            <Link
              href="/account/plan"
              aria-current={currentActive === 'plan' || currentActive === 'pro' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 px-0.5 transition-colors duration-200 ${
                currentActive === 'plan' || currentActive === 'pro'
                  ? 'bg-white/90 dark:bg-white/15 shadow-sm'
                  : 'active:bg-white/50 dark:active:bg-white/10'
              }`}
            >
              <PlanIcon className={`w-[18px] h-[18px] shrink-0 ${planConfig.iconClass}`} />
              <span className={`text-[10px] font-bold leading-none capitalize ${planConfig.textClass}`}>
                {planConfig.name}
              </span>
            </Link>

            {/* Account */}
            <Link
              href="/account"
              aria-current={currentActive === 'account' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 px-0.5 transition-colors duration-200 ${
                currentActive === 'account'
                  ? 'bg-white/90 dark:bg-white/15 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-muted-foreground active:bg-white/50 dark:active:bg-white/10'
              }`}
            >
              <User className="w-[18px] h-[18px] shrink-0" />
              <span className="text-[10px] font-semibold leading-none">Account</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* ===================================================================== */}
      {/* 2. DESKTOP: floating glass side dock (>= md)                           */}
      {/* ===================================================================== */}
      <aside
        aria-label="Primary"
        className="hidden md:flex fixed left-3 lg:left-4 top-1/2 -translate-y-1/2 z-40 select-none flex-col items-center"
      >
        <div className="relative flex max-h-[92vh] flex-col items-center gap-1.5 overflow-y-auto scrollbar-none rounded-2xl border border-white/60 bg-white/75 p-2 shadow-[0_16px_48px_rgba(0,0,0,0.14)] backdrop-blur-2xl backdrop-saturate-200 dark:border-white/15 dark:bg-slate-900/80 dark:shadow-[0_20px_56px_rgba(0,0,0,0.5)]">
          <DockLink href="/" label="Home" icon={Home} isActive={false} />

          {/* Scores (Merged Scores + Live) */}
          <DockLink
            href="/live"
            label={liveCount > 0 ? `Live Scores (${liveCount})` : 'Live Scores'}
            icon={Radio}
            isActive={currentActive === 'scores'}
            activeClass="bg-blue-600 text-white shadow-md shadow-blue-500/30"
            idleIconClass={liveCount > 0 ? 'text-red-500 animate-pulse' : ''}
            onClick={handleScoresClick}
            badge={liveCount}
          />

          <DockLink
            href="/search"
            label="Search games & leagues"
            icon={Search}
            isActive={currentActive === 'search'}
            activeClass="bg-violet-600 text-white shadow-md shadow-violet-500/30"
          />

          <DockLink
            href="/tickets"
            label="My Bet Tickets"
            icon={Ticket}
            isActive={currentActive === 'tickets'}
            activeClass="bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
          />

          <DockLink
            href="/activities"
            label="Native Lock Screen Activity"
            icon={Zap}
            isActive={currentActive === 'activities'}
            activeClass="bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
          />

          <span className="my-0.5 h-px w-6 bg-white/40 dark:bg-white/10" />

          <DockLink href="/blog" label="Blog" icon={Newspaper} isActive={currentActive === 'blog'} />
          <DockLink
            href="/support"
            label="Support desk"
            icon={Headphones}
            isActive={currentActive === 'support'}
          />
          
          {/* Plan with Dynamic Icon and Current Plan Tooltip */}
          <DockLink
            href="/account/plan"
            label={`Plan: ${planConfig.name} (Change)`}
            icon={PlanIcon}
            isActive={currentActive === 'plan' || currentActive === 'pro'}
            activeClass="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/30"
            idleIconClass={planConfig.iconClass}
          />

          <DockLink
            href="/admin"
            label="Admin console"
            icon={Server}
            isActive={currentActive === 'admin'}
            activeClass="bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
          />
          <DockLink
            href="/account"
            label="Account and profile"
            icon={User}
            isActive={currentActive === 'account'}
          />

          <span className="my-0.5 h-px w-6 bg-white/40 dark:bg-white/10" />

          <div className="flex items-center justify-center p-1">
            <ThemeToggle className="!p-1.5 !w-7 !h-7 hover:bg-white/60 dark:hover:bg-white/10" />
          </div>
        </div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* Dock primitives                                                           */
/* ------------------------------------------------------------------------- */

const DOCK_IDLE =
  'text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10';

function DockTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-slate-800">
      {label}
    </span>
  );
}

function DockLink({
  href,
  label,
  icon: Icon,
  isActive,
  activeClass = 'bg-blue-600 text-white shadow-md shadow-blue-500/30',
  idleIconClass = '',
  onClick,
  badge = 0,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  activeClass?: string;
  idleIconClass?: string;
  onClick?: (e: React.MouseEvent) => void;
  badge?: number;
}) {
  return (
    <div className="relative group flex items-center justify-center">
      <Link
        href={href}
        onClick={onClick}
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 active:scale-95 ${
          isActive ? activeClass : DOCK_IDLE
        }`}
      >
        <Icon className={`h-5 w-5 shrink-0 ${isActive ? '' : idleIconClass}`} />
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
      <DockTooltip label={label} />
    </div>
  );
}

function DockButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <div className="relative group flex items-center justify-center">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${DOCK_IDLE}`}
      >
        <Icon className="h-5 w-5 shrink-0" />
      </button>
      <DockTooltip label={label} />
    </div>
  );
}
