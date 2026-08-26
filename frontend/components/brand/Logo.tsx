'use client';

import Link from 'next/link';

interface LogoProps {
  /** Renders the wordmark next to the glyph. */
  showWordmark?: boolean;
  /** Small caption under the wordmark (hidden below `sm`). */
  tagline?: string;
  size?: 'sm' | 'md' | 'lg';
  href?: string | null;
  className?: string;
}

const GLYPH_SIZES = {
  sm: 'w-7 h-7 rounded-lg',
  md: 'w-9 h-9 rounded-xl',
  lg: 'w-12 h-12 rounded-2xl',
} as const;

const WORD_SIZES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
} as const;

/** The radar dish: concentric rings, a sweeping arm, and a single tracked blip. */
function RadarGlyph({ size }: { size: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      className={`${GLYPH_SIZES[size]} bg-brand-gradient text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0 relative overflow-hidden`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="w-[62%] h-[62%]" fill="none">
        <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.4" />
        <circle cx="12" cy="12" r="5" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.4" />
        <g className="animate-radar-sweep" style={{ transformOrigin: '12px 12px' }}>
          <path d="M12 12V2.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </g>
        <circle cx="16.4" cy="8.1" r="1.9" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Logo({
  showWordmark = true,
  tagline,
  size = 'md',
  href = '/',
  className = '',
}: LogoProps) {
  const content = (
    <span className={`flex items-center gap-2.5 min-w-0 ${className}`}>
      <RadarGlyph size={size} />
      {showWordmark && (
        <span className="min-w-0">
          <span
            className={`block ${WORD_SIZES[size]} font-black tracking-tight text-foreground leading-none whitespace-nowrap`}
          >
            Slip<span className="text-brand-gradient">Radar</span>
          </span>
          {tagline && (
            <span className="hidden sm:block text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">
              {tagline}
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      className="flex items-center min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)]"
    >
      {content}
    </Link>
  );
}
