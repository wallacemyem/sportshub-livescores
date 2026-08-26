'use client';

import { useEffect } from 'react';
import {
  X,
  Ticket,
  CreditCard,
  Crown,
  ShieldOff,
  ShieldCheck,
  Mail,
  Globe,
  Clock,
  CalendarDays,
  Loader2,
} from 'lucide-react';
import type { AdminUserRow, AdminSlipRow, AdminTransactionRow } from '@/types';
import {
  Chip,
  UserCell,
  money,
  relTime,
  shortDate,
  slipTone,
  txTone,
} from './primitives';

interface UserDrawerProps {
  user: AdminUserRow | null;
  slips: AdminSlipRow[];
  transactions: AdminTransactionRow[];
  onClose: () => void;
  onSetPlan: (user: AdminUserRow, plan: 'free' | 'pro') => void;
  onSetStatus: (user: AdminUserRow, status: 'active' | 'suspended') => void;
  pendingAction: string | null;
}

/**
 * Everything about one account in one place: the profile, the slips they
 * scanned, and what they paid. The account actions live here rather than as
 * per-row buttons in the table, so a destructive action always follows from
 * having the account's context on screen.
 */
export function UserDrawer({
  user,
  slips,
  transactions,
  onClose,
  onSetPlan,
  onSetStatus,
  pendingAction,
}: UserDrawerProps) {
  // Escape closes; body scroll is locked while open.
  useEffect(() => {
    if (!user) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [user, onClose]);

  if (!user) return null;

  const isPro = user.plan === 'pro';
  const isSuspended = user.status === 'suspended';
  const settled = transactions.filter((t) => t.status === 'successful' || t.status === 'paid');
  const failed = transactions.filter((t) => t.status === 'failed');

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="animate-in fade-in absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Account details for ${user.name}`}
        className="animate-in fade-in relative flex h-full w-full max-w-lg flex-col border-l border-surface-border bg-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-surface-border p-5">
          <div className="min-w-0">
            <UserCell name={user.name} email={user.email} plan={user.plan} />
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Chip tone={isPro ? 'brand' : 'neutral'}>{isPro ? 'Pro' : 'Free'}</Chip>
              <Chip tone={isSuspended ? 'danger' : 'positive'}>
                {isSuspended ? 'Suspended' : 'Active'}
              </Chip>
              {user.country && <Chip tone="neutral">{user.country}</Chip>}
              {user.signup_source && (
                <Chip tone="neutral">{user.signup_source.replace('_', ' ')}</Chip>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="shrink-0 cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
          {/* Facts */}
          <dl className="grid grid-cols-2 gap-3">
            <Fact icon={Ticket} label="Slips scanned" value={String(user.slips_scanned)} />
            <Fact icon={Ticket} label="Active now" value={String(user.active_slips)} />
            <Fact icon={CreditCard} label="Lifetime value" value={money(user.lifetime_value_usd)} />
            <Fact
              icon={Crown}
              label="Plan renews"
              value={user.plan_expiry ? shortDate(user.plan_expiry) : '—'}
            />
            <Fact icon={CalendarDays} label="Joined" value={shortDate(user.created_at)} />
            <Fact icon={Clock} label="Last seen" value={relTime(user.last_seen_at)} />
            <Fact icon={Mail} label="Account ID" value={user.id} mono />
            <Fact icon={Globe} label="Country" value={user.country || '—'} />
          </dl>

          {/* Slips scanned by this account */}
          <section>
            <h4 className="mb-2.5 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Slips scanned</span>
              <span className="font-mono tabular-nums">{slips.length}</span>
            </h4>

            {slips.length === 0 ? (
              <p className="rounded-xl border border-surface-border bg-surface-subtle px-4 py-5 text-center text-xs text-muted-foreground">
                This account has not scanned a booking code yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {slips.map((slip) => (
                  <li
                    key={slip.id}
                    className="rounded-xl border border-surface-border bg-surface-subtle p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-mono text-xs font-bold text-foreground">
                        {slip.booking_code}
                      </span>
                      <Chip tone={slipTone(slip.status)}>{slip.status.replace('_', ' ')}</Chip>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="capitalize">{slip.bookmaker}</span>
                      <span>{slip.legs} legs</span>
                      <span className="font-mono tabular-nums">{money(slip.stake)} stake</span>
                      <span className="font-mono tabular-nums">{slip.total_odds.toFixed(2)}x</span>
                      <span>{relTime(slip.scanned_at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Payments */}
          <section>
            <h4 className="mb-2.5 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Payments</span>
              <span className="font-mono tabular-nums">
                {settled.length} settled
                {failed.length > 0 && (
                  <span className="text-red-500"> · {failed.length} failed</span>
                )}
              </span>
            </h4>

            {transactions.length === 0 ? (
              <p className="rounded-xl border border-surface-border bg-surface-subtle px-4 py-5 text-center text-xs text-muted-foreground">
                No payments on this account.
              </p>
            ) : (
              <ul className="space-y-2">
                {transactions.map((tx) => (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-subtle p-3"
                  >
                    <div className="min-w-0">
                      <span className="block truncate font-mono text-xs font-bold text-foreground">
                        {tx.reference}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {tx.method || tx.gateway} · {relTime(tx.created_at)}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block font-mono text-xs font-bold tabular-nums text-foreground">
                        {money(tx.amount, tx.currency)}
                      </span>
                      <Chip tone={txTone(tx.status)} className="mt-0.5">
                        {tx.status}
                      </Chip>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Actions */}
        <div className="border-t border-surface-border bg-surface-subtle/60 p-4">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Account actions
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pendingAction !== null}
              onClick={() => onSetPlan(user, isPro ? 'free' : 'pro')}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-surface-border bg-surface px-3 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              {pendingAction === 'plan' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Crown className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>{isPro ? 'Move to Free' : 'Grant Pro'}</span>
            </button>

            <button
              type="button"
              disabled={pendingAction !== null}
              onClick={() => onSetStatus(user, isSuspended ? 'active' : 'suspended')}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                isSuspended
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400'
              }`}
            >
              {pendingAction === 'status' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isSuspended ? (
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ShieldOff className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>{isSuspended ? 'Reinstate' : 'Suspend'}</span>
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Suspending blocks sign-in immediately. Tracked slips keep updating so history stays
            intact.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-subtle p-3">
      <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate">{label}</span>
      </dt>
      <dd
        className={`mt-1 truncate text-sm font-bold text-foreground ${
          mono ? 'font-mono text-xs' : 'tabular-nums'
        }`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
