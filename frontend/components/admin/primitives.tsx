'use client';

import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

/* ---------------------------------------------------------------------------
 * Shared vocabulary for the console.
 *
 * One chip component, one tone scale, one set of formatters. Previously each
 * tab picked its own colours for the same state, so "successful" was green in
 * one table and blue in another.
 * ------------------------------------------------------------------------- */

export type Tone = 'neutral' | 'positive' | 'warning' | 'danger' | 'info' | 'brand';

const TONE_CLASS: Record<Tone, string> = {
  neutral:
    'bg-surface-subtle text-muted-foreground border-surface-border',
  positive:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
  warning:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  danger:
    'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30',
  info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30',
  brand:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/30',
};

export function Chip({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Slip lifecycle → tone. Kept in one place so every table agrees. */
export function slipTone(status: string): Tone {
  switch (status) {
    case 'WON':
      return 'positive';
    case 'LOST':
      return 'danger';
    case 'CASHED_OUT':
      return 'info';
    case 'PENDING':
      return 'warning';
    default:
      return 'brand';
  }
}

export function txTone(status: string): Tone {
  switch (status) {
    case 'successful':
    case 'paid':
      return 'positive';
    case 'pending':
      return 'warning';
    case 'failed':
      return 'danger';
    case 'refunded':
      return 'info';
    default:
      return 'neutral';
  }
}

/* --------------------------------- format -------------------------------- */

export const money = (v: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: v % 1 === 0 ? 0 : 2,
  }).format(v ?? 0);

export const num = (v: number) => new Intl.NumberFormat('en-US').format(v ?? 0);

/** Compact relative time: the console cares about "how long ago", not dates. */
export function relTime(iso: string): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';

  const secs = Math.floor((Date.now() - then) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function shortDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: '2-digit' });
}

/* ---------------------------------- KPI ---------------------------------- */

export function KpiCard({
  label,
  value,
  sub,
  delta,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  /** Percent change; positive is rendered as an improvement. */
  delta?: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: Tone;
}) {
  const showDelta = typeof delta === 'number' && Number.isFinite(delta);
  const up = (delta ?? 0) >= 0;

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${TONE_CLASS[tone]}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>

      <p className="mt-2.5 font-mono text-2xl font-black tabular-nums tracking-tight text-foreground">
        {value}
      </p>

      <div className="mt-1 flex items-center gap-1.5">
        {showDelta && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${
              up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta!).toFixed(0)}%
          </span>
        )}
        {sub && <span className="truncate text-[11px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

/* --------------------------------- charts -------------------------------- */

/**
 * Seven-day bars. Deliberately a plain SVG: an admin trend needs to be
 * readable at a glance, and a charting dependency for one sparkline is not
 * worth the bundle.
 */
export function TrendBars({
  points,
  valueOf,
  format,
  label,
}: {
  points: { label: string }[];
  valueOf: (p: any) => number;
  format: (v: number) => string;
  label: string;
}) {
  const values = points.map(valueOf);
  const max = Math.max(...values, 1);

  return (
    <div>
      <div className="flex items-end justify-between gap-1.5" style={{ height: 96 }}>
        {points.map((p, i) => {
          const v = values[i];
          const pct = Math.max((v / max) * 100, v > 0 ? 6 : 2);
          return (
            <div key={p.label + i} className="group flex min-w-0 flex-1 flex-col justify-end">
              <div
                className="w-full rounded-t bg-[var(--brand)] opacity-80 transition-opacity group-hover:opacity-100"
                style={{ height: `${pct}%` }}
                title={`${p.label}: ${format(v)}`}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between gap-1.5 border-t border-surface-border pt-2">
        {points.map((p, i) => (
          <span
            key={p.label + i}
            className="min-w-0 flex-1 truncate text-center text-[10px] font-medium text-muted-foreground"
          >
            {p.label}
          </span>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

/** Horizontal breakdown, used for slips-per-bookmaker and plan split. */
export function BreakdownBars({
  data,
  total,
  emptyLabel = 'No data yet',
}: {
  data: [string, number][];
  total: number;
  emptyLabel?: string;
}) {
  if (data.length === 0 || total === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2.5">
      {data.map(([name, count]) => {
        const pct = Math.round((count / total) * 100);
        return (
          <li key={name}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate font-medium capitalize text-foreground">{name}</span>
              <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                {count} <span className="opacity-60">({pct}%)</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
              <div
                className="h-full rounded-full bg-[var(--brand)] transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------ section shell ---------------------------- */

export function Panel({
  title,
  description,
  actions,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-surface-border bg-surface p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-foreground">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** Small identity block used wherever a person is referenced. */
export function UserCell({
  name,
  email,
  plan,
}: {
  name: string;
  email: string;
  plan?: string;
}) {
  const initial = (name || '?').charAt(0).toUpperCase();
  const isPro = plan === 'pro';

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white ${
          isPro ? 'bg-brand-gradient' : 'bg-slate-400 dark:bg-slate-600'
        }`}
        aria-hidden="true"
      >
        {initial}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-foreground">{name}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{email}</span>
      </span>
    </div>
  );
}
