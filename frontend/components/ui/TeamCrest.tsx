'use client';

import React, { useState } from 'react';
import { getTeamBranding, TeamBranding } from '@/lib/flags';
import { Shield, Crown, Target, Activity, Trophy, Sparkles } from 'lucide-react';

interface TeamCrestProps {
  name: string;
  shortName?: string;
  logoUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showName?: boolean;
}

const SIZE_MAP = {
  xs: { box: 'w-5 h-5 text-[9px]', icon: 'w-3 h-3', radius: 'rounded-md' },
  sm: { box: 'w-6 h-6 text-[10px]', icon: 'w-3.5 h-3.5', radius: 'rounded-lg' },
  md: { box: 'w-8 h-8 text-xs', icon: 'w-4 h-4', radius: 'rounded-xl' },
  lg: { box: 'w-12 h-12 text-sm', icon: 'w-6 h-6', radius: 'rounded-xl' },
  xl: { box: 'w-16 h-16 text-lg', icon: 'w-8 h-8', radius: 'rounded-2xl' },
};

export function TeamCrest({
  name,
  shortName,
  logoUrl,
  size = 'md',
  className = '',
  showName = false,
}: TeamCrestProps) {
  const [imgError, setImgError] = useState(false);
  const branding = getTeamBranding(name, shortName);
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;

  const isCustomImage = Boolean(logoUrl && !imgError && logoUrl.startsWith('http'));

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Crest Container */}
      <div
        style={{
          background: isCustomImage
            ? undefined
            : `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
          borderColor: isCustomImage ? undefined : branding.secondaryColor,
        }}
        className={`relative ${sizeConfig.box} ${sizeConfig.radius} shrink-0 flex items-center justify-center font-mono font-black text-white shadow-sm overflow-hidden border border-white/20 select-none`}
      >
        {isCustomImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={name}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-0.5"
            loading="lazy"
          />
        ) : (
          <div className="relative z-10 flex items-center justify-center tracking-tighter drop-shadow-sm">
            {branding.shortName.slice(0, 3)}
          </div>
        )}

        {/* Specular Sheen Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/20 pointer-events-none" />
      </div>

      {showName && (
        <span className="font-bold text-foreground truncate">{name}</span>
      )}
    </div>
  );
}
