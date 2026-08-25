'use client';

import React, { useState } from 'react';
import { getCountryFlag } from '@/lib/flags';
import { Globe } from 'lucide-react';

interface CountryFlagProps {
  country?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showName?: boolean;
}

const FLAG_SIZES = {
  xs: { box: 'w-4 h-3', text: 'text-[9px]' },
  sm: { box: 'w-5 h-3.5', text: 'text-[10px]' },
  md: { box: 'w-6 h-4', text: 'text-xs' },
  lg: { box: 'w-8 h-5', text: 'text-sm' },
};

export function CountryFlag({
  country,
  size = 'sm',
  className = '',
  showName = false,
}: CountryFlagProps) {
  const [imgError, setImgError] = useState(false);
  const info = getCountryFlag(country);
  const sizeConfig = FLAG_SIZES[size] || FLAG_SIZES.sm;

  return (
    <span className={`inline-flex items-center gap-1.5 align-middle ${className}`}>
      <span
        style={{
          background: imgError
            ? `linear-gradient(135deg, ${info.colors[0]}, ${info.colors[1]})`
            : undefined,
        }}
        className={`relative inline-block ${sizeConfig.box} rounded-sm overflow-hidden border border-surface-border shadow-xs shrink-0 select-none bg-surface-subtle`}
      >
        {!imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={info.flagUrl}
            alt={info.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="w-full h-full flex items-center justify-center font-mono font-bold text-[8px] text-white">
            {info.code.slice(0, 2).toUpperCase()}
          </span>
        )}
      </span>

      {showName && (
        <span className={`text-muted-foreground font-medium ${sizeConfig.text}`}>
          {info.name}
        </span>
      )}
    </span>
  );
}
