import React from 'react';

export interface BookmakerBrand {
  id: string;
  name: string;
  tagline: string;
  bgGradient: string;
  borderColor: string;
  accentColor: string;
  textColor: string;
}

export const BOOKMAKER_BRANDS: Record<string, BookmakerBrand> = {
  sportybet: {
    id: 'sportybet',
    name: 'SportyBet',
    tagline: 'Instant Booking Code Sync',
    bgGradient: 'from-red-600 to-rose-700',
    borderColor: 'border-red-500/30',
    accentColor: '#E41818',
    textColor: 'text-red-500',
  },
  bet9ja: {
    id: 'bet9ja',
    name: 'Bet9ja',
    tagline: 'Original Nigerian Sportsbook',
    bgGradient: 'from-emerald-600 to-green-800',
    borderColor: 'border-emerald-500/30',
    accentColor: '#008751',
    textColor: 'text-emerald-500',
  },
  '1xbet': {
    id: '1xbet',
    name: '1xBet',
    tagline: 'Global Multi-Leg Settle',
    bgGradient: 'from-blue-600 to-sky-700',
    borderColor: 'border-blue-500/30',
    accentColor: '#1A569A',
    textColor: 'text-sky-400',
  },
  betking: {
    id: 'betking',
    name: 'BetKing',
    tagline: 'Royal Odds & Multipliers',
    bgGradient: 'from-blue-900 to-indigo-950',
    borderColor: 'border-amber-500/40',
    accentColor: '#FFC72C',
    textColor: 'text-amber-400',
  },
  msport: {
    id: 'msport',
    name: 'MSport',
    tagline: 'High Speed Multi-Bets',
    bgGradient: 'from-amber-500 to-yellow-600',
    borderColor: 'border-amber-400/40',
    accentColor: '#FFCC00',
    textColor: 'text-amber-500',
  },
  mozzartbet: {
    id: 'mozzartbet',
    name: 'MozzartBet',
    tagline: 'Live Sportsbook Radar',
    bgGradient: 'from-yellow-500 to-amber-600',
    borderColor: 'border-yellow-500/30',
    accentColor: '#FFE000',
    textColor: 'text-yellow-400',
  },
  betway: {
    id: 'betway',
    name: 'Betway',
    tagline: 'Premier Sportsbook Network',
    bgGradient: 'from-slate-800 to-black',
    borderColor: 'border-emerald-500/30',
    accentColor: '#00A826',
    textColor: 'text-emerald-400',
  },
  bet365: {
    id: 'bet365',
    name: 'Bet365',
    tagline: 'World Leading Consensus',
    bgGradient: 'from-emerald-700 to-teal-900',
    borderColor: 'border-yellow-400/40',
    accentColor: '#FFDF00',
    textColor: 'text-yellow-400',
  },
};

export function BookmakerIcon({ id, className = 'w-6 h-6' }: { id: string; className?: string }) {
  const normalized = id.toLowerCase().replace(/[^a-z0-9]/g, '');

  switch (normalized) {
    case 'sportybet':
    case 'sporty':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#E41818" />
          <path d="M17.5 5L8 18H15.5L14.5 27L24 14H16.5L17.5 5Z" fill="white" />
        </svg>
      );
    case 'bet9ja':
    case 'b9ja':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#008751" />
          <text x="16" y="21" fill="white" fontSize="13" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">
            9ja
          </text>
          <circle cx="16" cy="7" r="2" fill="#F4D03F" />
        </svg>
      );
    case '1xbet':
    case 'onexbet':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#1A569A" />
          <text x="16" y="21" fill="#00C0FF" fontSize="12" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">
            1X
          </text>
        </svg>
      );
    case 'betking':
    case 'king':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#0A1E3F" />
          <path d="M7 21L9 11L13 16L16 10L19 16L23 11L25 21H7Z" fill="#FFC72C" />
          <circle cx="9" cy="9" r="1.5" fill="#FFC72C" />
          <circle cx="16" cy="8" r="1.5" fill="#FFC72C" />
          <circle cx="23" cy="9" r="1.5" fill="#FFC72C" />
        </svg>
      );
    case 'msport':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#0F172A" />
          <path d="M7 22V10L12 17L16 10L20 17L25 10V22H21V16L18 20H14L11 16V22H7Z" fill="#FFCC00" />
        </svg>
      );
    case 'mozzartbet':
    case 'mozzart':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#1E1B4B" />
          <path d="M16 6L18.5 12.5H25L19.5 16.5L21.5 23L16 19L10.5 23L12.5 16.5L7 12.5H13.5L16 6Z" fill="#FFE000" />
        </svg>
      );
    case 'betway':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#000000" />
          <text x="16" y="21" fill="#00A826" fontSize="14" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">
            b
          </text>
        </svg>
      );
    case 'bet365':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#006042" />
          <text x="16" y="20" fill="#FFDF00" fontSize="10" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">
            365
          </text>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#4B5563" />
          <text x="16" y="20" fill="white" fontSize="11" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
            {id.substring(0, 3).toUpperCase()}
          </text>
        </svg>
      );
  }
}

export function BookmakerBadge({
  id,
  showName = true,
  size = 'md',
}: {
  id: string;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const brandKey = id.toLowerCase().replace(/[^a-z0-9]/g, '');
  const brand = BOOKMAKER_BRANDS[brandKey] || {
    id,
    name: id,
    tagline: 'Sportsbook',
    bgGradient: 'from-slate-700 to-slate-900',
    borderColor: 'border-slate-600',
    accentColor: '#6B7280',
    textColor: 'text-slate-300',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-surface-border shadow-sm hover:border-surface-hover transition-colors">
      <BookmakerIcon id={brandKey} className={iconSizes[size]} />
      {showName && (
        <span className="text-xs font-bold text-foreground font-sans tracking-tight">
          {brand.name}
        </span>
      )}
    </div>
  );
}

export function BookmakerLogo({
  bookmaker,
  size = 'md',
  className = '',
}: {
  bookmaker: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  return <BookmakerIcon id={bookmaker} className={`${iconSizes[size]} ${className}`} />;
}
