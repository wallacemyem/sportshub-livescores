'use client';

import React from 'react';
import Link from 'next/link';
import { Crown, Gem, Shield, Sparkles } from 'lucide-react';

export type PlanType = 'free' | 'pro' | 'elite' | string;

export interface PlanConfig {
  id: 'free' | 'pro' | 'elite';
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  iconClass: string;
  textClass: string;
  glowClass: string;
}

export const PLAN_CONFIGS: Record<string, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Single slip tracker & consensus odds',
    icon: Shield,
    badgeClass: 'bg-surface-subtle border-surface-border text-muted-foreground hover:border-surface-border/80',
    iconClass: 'text-muted-foreground',
    textClass: 'text-muted-foreground',
    glowClass: '',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Unlimited slips, real-time sync & PiP scoreboard',
    icon: Crown,
    badgeClass: 'bg-gradient-to-r from-violet-500/15 via-indigo-500/15 to-blue-500/15 border-violet-500/30 text-violet-700 dark:text-violet-300 hover:border-violet-500/50 shadow-sm shadow-violet-500/10',
    iconClass: 'text-violet-600 dark:text-violet-400',
    textClass: 'text-violet-700 dark:text-violet-300 font-bold',
    glowClass: 'shadow-violet-500/20',
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    tagline: 'Sub-second raw WebSocket streams & VIP API access',
    icon: Gem,
    badgeClass: 'bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-yellow-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:border-amber-500/60 shadow-sm shadow-amber-500/15',
    iconClass: 'text-amber-600 dark:text-amber-400',
    textClass: 'text-amber-700 dark:text-amber-300 font-bold',
    glowClass: 'shadow-amber-500/20',
  },
};

export function getPlanConfig(plan?: string): PlanConfig {
  const key = (plan || 'free').toLowerCase();
  return PLAN_CONFIGS[key] || PLAN_CONFIGS.free;
}

export function PlanIcon({
  plan,
  className = 'w-4 h-4',
}: {
  plan?: string;
  className?: string;
}) {
  const config = getPlanConfig(plan);
  const Icon = config.icon;
  return <Icon className={`${config.iconClass} ${className}`} />;
}

interface PlanBadgeProps {
  plan?: string;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
  interactive?: boolean;
  className?: string;
}

export function PlanBadge({
  plan,
  size = 'sm',
  showIcon = true,
  interactive = true,
  className = '',
}: PlanBadgeProps) {
  const config = getPlanConfig(plan);
  const Icon = config.icon;

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px] gap-1',
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-xs font-semibold gap-2',
  }[size];

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  }[size];

  const content = (
    <span
      className={`inline-flex items-center rounded-full border transition-all ${config.badgeClass} ${sizeClasses} ${className}`}
    >
      {showIcon && <Icon className={`${config.iconClass} ${iconSizes} shrink-0`} />}
      <span className={`uppercase tracking-wider font-mono font-bold ${config.textClass}`}>
        {config.name}
      </span>
    </span>
  );

  if (interactive) {
    return (
      <Link
        href="/account/plan"
        title={`Current plan: ${config.name} — Click to change plan`}
        className="inline-block transition-transform hover:scale-105 active:scale-95 cursor-pointer"
      >
        {content}
      </Link>
    );
  }

  return content;
}
