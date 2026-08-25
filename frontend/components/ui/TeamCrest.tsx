'use client';

import React, { useState, useEffect } from 'react';
import { getTeamBranding, fetchPublicTeamBadge, fetchPublicPlayerHeadshot } from '@/lib/flags';
import { SportType } from '@/types';

interface TeamCrestProps {
  name: string;
  shortName?: string;
  logoUrl?: string;
  sport?: SportType;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showName?: boolean;
}

const SIZE_MAP = {
  xs: { box: 'w-5 h-5 text-[9px]', radius: 'rounded-md' },
  sm: { box: 'w-6 h-6 text-[10px]', radius: 'rounded-lg' },
  md: { box: 'w-8 h-8 text-xs', radius: 'rounded-xl' },
  lg: { box: 'w-12 h-12 text-sm', radius: 'rounded-xl' },
  xl: { box: 'w-16 h-16 text-base', radius: 'rounded-2xl' },
};

export function TeamCrest({
  name,
  shortName,
  logoUrl,
  sport,
  size = 'md',
  className = '',
  showName = false,
}: TeamCrestProps) {
  const [imgError, setImgError] = useState(false);
  const [dynamicLogo, setDynamicLogo] = useState<string | null>(null);
  const isGolf = sport === 'golf';
  const branding = getTeamBranding(name, shortName, isGolf);
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;

  // Resolve best crest/headshot URL (explicit logoUrl -> registry crestUrl -> dynamic public API)
  const resolvedUrl = (!imgError && (logoUrl?.startsWith('http') ? logoUrl : branding.crestUrl || dynamicLogo)) || null;

  const isHeadshot = isGolf || branding.badgeType === 'circle' || Boolean(resolvedUrl?.includes('/headshots/'));

  useEffect(() => {
    if (!resolvedUrl && !imgError && name) {
      let isMounted = true;
      if (isGolf) {
        fetchPublicPlayerHeadshot(name).then((headshot) => {
          if (isMounted && headshot) {
            setDynamicLogo(headshot);
          }
        });
      } else {
        fetchPublicTeamBadge(name).then((badge) => {
          if (isMounted && badge) {
            setDynamicLogo(badge);
          }
        });
      }
      return () => {
        isMounted = false;
      };
    }
  }, [name, resolvedUrl, imgError, isGolf]);

  const frameRadius = isGolf || isHeadshot ? 'rounded-full' : sizeConfig.radius;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Crest / Player Headshot Circle */}
      <div
        style={{
          background: resolvedUrl
            ? '#FFFFFF'
            : `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
          borderColor: resolvedUrl ? 'rgba(0,0,0,0.12)' : branding.secondaryColor,
        }}
        className={`relative ${sizeConfig.box} ${frameRadius} shrink-0 flex items-center justify-center font-mono font-black shadow-sm overflow-hidden border border-white/20 select-none ${
          isGolf ? 'ring-1.5 ring-emerald-500/30' : ''
        }`}
      >
        {resolvedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedUrl}
            alt={name}
            onError={() => setImgError(true)}
            className={`w-full h-full ${
              isGolf || isHeadshot
                ? 'object-cover object-top scale-110'
                : 'object-contain p-0.5'
            }`}
            loading="lazy"
          />
        ) : (
          <div className="relative z-10 flex items-center justify-center tracking-tighter text-white drop-shadow-sm">
            {branding.shortName.slice(0, 3)}
          </div>
        )}

        {/* Specular Sheen Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/20 pointer-events-none" />
      </div>

      {showName && (
        <span className="font-bold text-foreground truncate">
          <span className="inline sm:hidden">{branding.shortName}</span>
          <span className="hidden sm:inline">{name}</span>
        </span>
      )}
    </div>
  );
}
