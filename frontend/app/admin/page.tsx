'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Ticket,
  CreditCard,
  Radio,
  Headphones,
  TrendingUp,
  DollarSign,
  UserPlus,
  ScanLine,
  AlertTriangle,
  Activity,
  Server,
  Send,
  Minus,
  Plus,
  Loader2,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { AdminShell, type AdminSection } from '@/components/admin/AdminShell';
import { DataTable, type Column } from '@/components/admin/DataTable';
import {
  BreakdownBars,
  Chip,
  KpiCard,
  Panel,
  TrendBars,
  UserCell,
  money,
  num,
  relTime,
  shortDate,
  slipTone,
  txTone,
  type Tone,
} from '@/components/admin/primitives';
import { UserDrawer } from '@/components/admin/UserDrawer';
import { getApiBaseUrl, getAuthHeaders } from '@/lib/api';
import type {
  AdminOverview,
  AdminSlipRow,
  AdminTransactionRow,
  AdminUserRow,
  SupportTicket,
} from '@/types';

type SectionId = 'overview' | 'users' | 'slips' | 'transactions' | 'live' | 'support';

const REFRESH_MS = 15000;

export default function AdminConsolePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<SectionId>('overview');

  // Console data
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [slips, setSlips] = useState<AdminSlipRow[]>([]);
  const [transactions, setTransactions] = useState<AdminTransactionRow[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Live ops
  const [telemetry, setTelemetry] = useState<any | null>(null);
  const [matches, setMatches] = useState<any[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const notify = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Admin Auth Verification Gate
  useEffect(() => {
    if (!isAuthLoading) {
      if (!user) {
        router.push('/auth/login?redirect=/admin');
      } else if (!user.is_admin && user.role !== 'admin') {
        router.push('/live?error=admin_access_denied');
      }
    }
  }, [user, isAuthLoading, router]);

  /* ----------------------------- data loading ---------------------------- */

  const fetchAll = useCallback(async () => {
    setIsRefreshing(true);
    const apiBase = getApiBaseUrl();
    const headers = getAuthHeaders();

    const getJSON = async (path: string) => {
      const res = await fetch(`${apiBase}${path}`, { headers });
      if (!res.ok) throw new Error(`${path} -> ${res.status}`);
      return res.json();
    };

    try {
      const [ov, us, sl, tx, tk, tel, mt] = await Promise.all([
        getJSON('/admin/overview'),
        getJSON('/admin/users'),
        getJSON('/admin/slips'),
        getJSON('/admin/transactions'),
        getJSON('/support/tickets'),
        getJSON('/admin/telemetry'),
        getJSON('/matches'),
      ]);

      setOverview(ov);
      setUsers(us.users ?? []);
      setSlips(sl.slips ?? []);
      setTransactions(tx.transactions ?? []);
      setTickets(tk.tickets ?? []);
      setTelemetry(tel);
      setMatches(mt.matches ?? []);

      setOffline(false);
      setLastUpdated(new Date());
    } catch (err) {
      // The console shows an explicit offline banner and empty tables rather
      // than substituting placeholder figures. An operator must never be shown
      // a number that did not come from the API.
      console.warn('Admin data unavailable:', err);
      setOffline(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Keep an open drawer in step with refreshed data.
  useEffect(() => {
    setSelectedUser((current) => {
      if (!current) return current;
      return users.find((u) => u.id === current.id) ?? current;
    });
  }, [users]);

  /* -------------------------------- actions ------------------------------ */

  const patchUser = async (
    user: AdminUserRow,
    body: Record<string, unknown>,
    action: string,
    successMessage: string
  ) => {
    setPendingAction(action);
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(String(res.status));
      notify(successMessage);
      await fetchAll();
    } catch {
      notify(`Could not update ${user.name}. The API did not accept the change.`);
    } finally {
      setPendingAction(null);
    }
  };

  const handleSetPlan = (user: AdminUserRow, plan: 'free' | 'pro') =>
    patchUser(
      user,
      { plan, duration_days: 30 },
      'plan',
      plan === 'pro' ? `${user.name} moved to Pro` : `${user.name} moved to Free`
    );

  const handleSetStatus = (user: AdminUserRow, status: 'active' | 'suspended') =>
    patchUser(
      user,
      { status },
      'status',
      status === 'suspended' ? `${user.name} suspended` : `${user.name} reinstated`
    );

  const triggerGoal = async (matchId: string, side: 'HOME' | 'AWAY') => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/matches/${matchId}/simulate-goal`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ team_side: side }),
      });
      if (res.ok) {
        notify(`Test goal broadcast to all live clients (${side})`);
        fetchAll();
      }
    } catch {
      notify('Could not reach the match orchestrator.');
    }
  };

  const adjustScore = async (match: any, homeDelta: number, awayDelta: number) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/matches/${match.id}/override`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          home_score: Math.max(0, match.home_score + homeDelta),
          away_score: Math.max(0, match.away_score + awayDelta),
          status: match.status,
          period: match.period,
          minute: match.minute,
        }),
      });
      if (res.ok) {
        notify(`Score corrected: ${match.home_team?.name} v ${match.away_team?.name}`);
        fetchAll();
      }
    } catch {
      notify('Could not reach the match orchestrator.');
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    const text = replyText.trim();
    setIsSendingReply(true);
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/support/tickets/${selectedTicket.id}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: 'agent',
            sender_name: 'Support',
            message: text,
          }),
        }
      );
      if (!res.ok) throw new Error(String(res.status));

      const updated = await res.json();
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setReplyText('');
      notify('Reply sent');
    } catch {
      notify('Reply could not be sent.');
    } finally {
      setIsSendingReply(false);
    }
  };

  /* ------------------------------- derived ------------------------------- */

  const openTickets = useMemo(
    () => tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length,
    [tickets]
  );

  const failedPayments = useMemo(
    () => transactions.filter((t) => t.status === 'failed').length,
    [transactions]
  );

  const drawerSlips = useMemo(
    () => (selectedUser ? slips.filter((s) => s.user_id === selectedUser.id) : []),
    [slips, selectedUser]
  );

  const drawerTransactions = useMemo(
    () => (selectedUser ? transactions.filter((t) => t.user_id === selectedUser.id) : []),
    [transactions, selectedUser]
  );

  const liveMatchCount = useMemo(
    () => matches.filter((m) => m.status === 'LIVE').length,
    [matches]
  );

  const sections: AdminSection[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users, badge: users.length },
    { id: 'slips', label: 'Slips scanned', icon: Ticket, badge: slips.length },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: CreditCard,
      badge: failedPayments,
      badgeTone: 'danger',
    },
    { id: 'live', label: 'Live ops', icon: Radio, badge: liveMatchCount },
    {
      id: 'support',
      label: 'Support',
      icon: Headphones,
      badge: openTickets,
      badgeTone: 'danger',
    },
  ];

  const meta: Record<SectionId, { title: string; description: string }> = {
    overview: {
      title: 'Overview',
      description: 'How the platform is doing right now, and anything that needs a look.',
    },
    users: {
      title: 'Users',
      description: 'Every account, what plan it is on, and how much the product gets used.',
    },
    slips: {
      title: 'Slips scanned',
      description: 'Every booking code the parser resolved, and the account it belongs to.',
    },
    transactions: {
      title: 'Transactions',
      description: 'Payments across both gateways, with the payer attached.',
    },
    live: {
      title: 'Live operations',
      description: 'Feed health, and manual control over in-play fixtures.',
    },
    support: {
      title: 'Support',
      description: 'The inbound queue, and the conversation on each ticket.',
    },
  };

  return (
    <AdminShell
      sections={sections}
      activeId={section}
      onSelect={(id) => setSection(id as SectionId)}
      title={meta[section].title}
      description={meta[section].description}
      offline={offline}
      isRefreshing={isRefreshing}
      onRefresh={fetchAll}
      lastUpdated={lastUpdated}
    >
      {toast && (
        <div className="animate-in fade-in mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">{toast}</p>
        </div>
      )}

      {section === 'overview' && (
        <OverviewSection overview={overview} isLoading={isLoading} onJump={setSection} />
      )}

      {section === 'users' && (
        <UsersSection
          users={users}
          isLoading={isLoading}
          selectedUser={selectedUser}
          onSelect={setSelectedUser}
        />
      )}

      {section === 'slips' && (
        <SlipsSection
          slips={slips}
          isLoading={isLoading}
          onOpenUser={(userId) => {
            const user = users.find((u) => u.id === userId);
            if (user) {
              setSection('users');
              setSelectedUser(user);
            }
          }}
        />
      )}

      {section === 'transactions' && (
        <TransactionsSection transactions={transactions} isLoading={isLoading} />
      )}

      {section === 'live' && (
        <LiveSection
          telemetry={telemetry}
          matches={matches}
          isLoading={isLoading}
          onSimulateGoal={triggerGoal}
          onAdjustScore={adjustScore}
        />
      )}

      {section === 'support' && (
        <SupportSection
          tickets={tickets}
          isLoading={isLoading}
          selectedTicket={selectedTicket}
          onSelect={setSelectedTicket}
          replyText={replyText}
          onReplyChange={setReplyText}
          onSendReply={sendReply}
          isSending={isSendingReply}
        />
      )}

      <UserDrawer
        user={selectedUser}
        slips={drawerSlips}
        transactions={drawerTransactions}
        onClose={() => setSelectedUser(null)}
        onSetPlan={handleSetPlan}
        onSetStatus={handleSetStatus}
        pendingAction={pendingAction}
      />
    </AdminShell>
  );
}

/* =========================================================================== */
/* Overview                                                                    */
/* =========================================================================== */

function OverviewSection({
  overview,
  isLoading,
  onJump,
}: {
  overview: AdminOverview | null;
  isLoading: boolean;
  onJump: (id: SectionId) => void;
}) {
  if (isLoading && !overview) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-surface-border bg-surface"
          />
        ))}
      </div>
    );
  }

  const o = overview;
  const bookmakers = Object.entries(o?.slips_by_bookmaker ?? {}).sort((a, b) => b[1] - a[1]);
  const plans = Object.entries(o?.plan_split ?? {}).sort((a, b) => b[1] - a[1]);

  const attention = [
    {
      show: (o?.failed_payments_7d ?? 0) > 0,
      label: `${o?.failed_payments_7d} failed payment${o?.failed_payments_7d === 1 ? '' : 's'} in the last 7 days`,
      action: 'transactions' as SectionId,
      cta: 'Review',
    },
    {
      show: (o?.open_tickets ?? 0) > 0,
      label: `${o?.open_tickets} support ticket${o?.open_tickets === 1 ? '' : 's'} awaiting a reply`,
      action: 'support' as SectionId,
      cta: 'Open queue',
    },
    {
      show: (o?.suspended_users ?? 0) > 0,
      label: `${o?.suspended_users} suspended account${o?.suspended_users === 1 ? '' : 's'}`,
      action: 'users' as SectionId,
      cta: 'View',
    },
  ].filter((item) => item.show);

  return (
    <div className="space-y-5">
      {/* The four numbers you would check first */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total users"
          value={num(o?.total_users ?? 0)}
          sub={`${num(o?.new_users_7d ?? 0)} joined this week`}
          icon={UserPlus}
          tone="info"
        />
        <KpiCard
          label="Monthly recurring"
          value={money(o?.mrr_usd ?? 0)}
          sub={`${num(o?.pro_users ?? 0)} on a paid plan`}
          icon={DollarSign}
          tone="positive"
        />
        <KpiCard
          label="Slips scanned (24h)"
          value={num(o?.slips_scanned_24h ?? 0)}
          sub={`${num(o?.slips_scanned_total ?? 0)} all time`}
          icon={ScanLine}
          tone="brand"
        />
        <KpiCard
          label="Active slips"
          value={num(o?.active_slips ?? 0)}
          sub={`${(o?.parse_success_pct ?? 0).toFixed(1)}% parse success`}
          icon={Ticket}
          tone="warning"
        />
      </div>

      {attention.length > 0 && (
        <Panel
          title="Needs attention"
          description="Surfaced here so nothing sits waiting in a tab you did not open."
        >
          <ul className="space-y-2">
            {attention.map((item) => (
              <li
                key={item.label}
                className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="truncate text-xs font-semibold text-amber-900 dark:text-amber-200">
                    {item.label}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onJump(item.action)}
                  className="shrink-0 cursor-pointer rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-500/40 dark:bg-transparent dark:text-amber-300"
                >
                  {item.cta}
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Last 7 days" description="Revenue booked per day." className="lg:col-span-2">
          <TrendBars
            points={o?.trend ?? []}
            valueOf={(p) => p.revenue_usd}
            format={(v) => money(v)}
            label={`${money(o?.revenue_7d_usd ?? 0)} booked this week · ${money(o?.revenue_usd ?? 0)} all time`}
          />
        </Panel>

        <Panel title="Plan split" description="Where accounts sit today.">
          <BreakdownBars data={plans} total={o?.total_users ?? 0} />

          <dl className="mt-5 space-y-2 border-t border-surface-border pt-4 text-xs">
            <Stat label="Revenue per user" value={money(o?.arpu_usd ?? 0)} />
            <Stat label="New this week" value={num(o?.new_users_7d ?? 0)} />
          </dl>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          title="Scans by sportsbook"
          description="Which books the parser is asked for most."
          className="lg:col-span-2"
        >
          <BreakdownBars
            data={bookmakers}
            total={o?.slips_scanned_total ?? 0}
            emptyLabel="No slips scanned yet"
          />
        </Panel>

        <Panel title="Live feed" description="Right now.">
          <dl className="space-y-3 text-xs">
            <Stat label="Matches in play" value={num(o?.live_matches ?? 0)} />
            <Stat label="Connected clients" value={num(o?.connected_clients ?? 0)} />
            <Stat
              label="Ingestion latency"
              value={`${(o?.ingestion_latency_ms ?? 0).toFixed(1)} ms`}
            />
            <Stat label="Parse success" value={`${(o?.parse_success_pct ?? 0).toFixed(1)}%`} />
          </dl>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-surface-border pb-2.5 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono font-bold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

/* =========================================================================== */
/* Users                                                                       */
/* =========================================================================== */

function UsersSection({
  users,
  isLoading,
  selectedUser,
  onSelect,
}: {
  users: AdminUserRow[];
  isLoading: boolean;
  selectedUser: AdminUserRow | null;
  onSelect: (user: AdminUserRow) => void;
}) {
  const columns: Column<AdminUserRow>[] = [
    {
      key: 'name',
      header: 'Account',
      cell: (u) => <UserCell name={u.name} email={u.email} plan={u.plan} />,
      sortValue: (u) => u.name.toLowerCase(),
    },
    {
      key: 'plan',
      header: 'Plan',
      cell: (u) => (
        <span className="flex flex-wrap items-center gap-1">
          <Chip tone={u.plan === 'pro' ? 'brand' : 'neutral'}>{u.plan}</Chip>
          {u.status === 'suspended' && <Chip tone="danger">Suspended</Chip>}
        </span>
      ),
      sortValue: (u) => u.plan,
    },
    {
      key: 'slips',
      header: 'Slips',
      align: 'right',
      // The active count sits in its own chip: rendered inline it ran straight
      // into the total, so "1" and "1 live" read as "11 live".
      cell: (u) => (
        <span className="flex items-center justify-end gap-1.5">
          <span className="font-mono tabular-nums text-foreground">{u.slips_scanned}</span>
          {u.active_slips > 0 && (
            <Chip tone="brand">{u.active_slips} live</Chip>
          )}
        </span>
      ),
      sortValue: (u) => u.slips_scanned,
    },
    {
      key: 'ltv',
      header: 'Lifetime value',
      align: 'right',
      hideBelow: 'md',
      cell: (u) => (
        <span className="font-mono font-semibold tabular-nums text-foreground">
          {money(u.lifetime_value_usd)}
        </span>
      ),
      sortValue: (u) => u.lifetime_value_usd,
    },
    {
      key: 'country',
      header: 'Country',
      hideBelow: 'xl',
      cell: (u) => <span className="text-muted-foreground">{u.country || '—'}</span>,
      sortValue: (u) => u.country,
    },
    {
      key: 'last_seen',
      header: 'Last seen',
      hideBelow: 'lg',
      cell: (u) => <span className="text-muted-foreground">{relTime(u.last_seen_at)}</span>,
      sortValue: (u) => new Date(u.last_seen_at).getTime(),
    },
    {
      key: 'joined',
      header: 'Joined',
      align: 'right',
      hideBelow: 'lg',
      cell: (u) => <span className="text-muted-foreground">{shortDate(u.created_at)}</span>,
      sortValue: (u) => new Date(u.created_at).getTime(),
    },
  ];

  return (
    <DataTable
      rows={users}
      columns={columns}
      rowKey={(u) => u.id}
      searchFields={(u) => `${u.name} ${u.email} ${u.id} ${u.country}`}
      searchPlaceholder="Search name, email or ID..."
      filters={[
        {
          key: 'plan',
          label: 'Plan',
          options: [
            { value: 'pro', label: 'Pro' },
            { value: 'free', label: 'Free' },
          ],
        },
        {
          key: 'status',
          label: 'Status',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'suspended', label: 'Suspended' },
          ],
        },
      ]}
      filterValue={(u, key) => (key === 'plan' ? u.plan : u.status)}
      onRowClick={onSelect}
      isSelected={(u) => u.id === selectedUser?.id}
      defaultSort={{ key: 'joined', dir: 'desc' }}
      itemLabel="accounts"
      isLoading={isLoading}
      emptyTitle="No accounts"
      emptyBody="No accounts match this view. Clear the filters, or check the API is reachable."
      minWidth="min-w-[900px]"
    />
  );
}

/* =========================================================================== */
/* Slips                                                                       */
/* =========================================================================== */

function SlipsSection({
  slips,
  isLoading,
  onOpenUser,
}: {
  slips: AdminSlipRow[];
  isLoading: boolean;
  onOpenUser: (userId: string) => void;
}) {
  const bookmakers = useMemo(
    () => Array.from(new Set(slips.map((s) => s.bookmaker))).sort(),
    [slips]
  );

  const columns: Column<AdminSlipRow>[] = [
    {
      key: 'code',
      header: 'Booking code',
      cell: (s) => (
        <span>
          <span className="block font-mono text-xs font-bold text-foreground">
            {s.booking_code}
          </span>
          <span className="block text-[11px] capitalize text-muted-foreground">{s.bookmaker}</span>
        </span>
      ),
      sortValue: (s) => s.booking_code,
    },
    {
      key: 'user',
      header: 'Scanned by',
      cell: (s) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenUser(s.user_id);
          }}
          className="group min-w-0 cursor-pointer text-left"
        >
          <span className="block truncate text-xs font-semibold text-foreground group-hover:text-[color:var(--brand)]">
            {s.user_name}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">{s.user_email}</span>
        </button>
      ),
      sortValue: (s) => s.user_name.toLowerCase(),
    },
    {
      key: 'legs',
      header: 'Legs',
      align: 'right',
      cell: (s) => (
        <span className="flex items-center justify-end gap-1.5 font-mono tabular-nums">
          <span className="text-foreground">{s.legs}</span>
          {(s.legs_won > 0 || s.legs_lost > 0) && (
            <span className="whitespace-nowrap text-[10px]">
              <span className="text-emerald-600 dark:text-emerald-400">{s.legs_won}W</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-red-600 dark:text-red-400">{s.legs_lost}L</span>
            </span>
          )}
        </span>
      ),
      sortValue: (s) => s.legs,
    },
    {
      key: 'stake',
      header: 'Stake',
      align: 'right',
      hideBelow: 'md',
      cell: (s) => <span className="font-mono tabular-nums text-foreground">{money(s.stake)}</span>,
      sortValue: (s) => s.stake,
    },
    {
      key: 'odds',
      header: 'Odds',
      align: 'right',
      hideBelow: 'lg',
      cell: (s) => (
        <span className="font-mono tabular-nums text-amber-600 dark:text-amber-400">
          {s.total_odds.toFixed(2)}x
        </span>
      ),
      sortValue: (s) => s.total_odds,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (s) => <Chip tone={slipTone(s.status)}>{s.status.replace('_', ' ')}</Chip>,
      sortValue: (s) => s.status,
    },
    {
      key: 'parse',
      header: 'Parse',
      align: 'right',
      hideBelow: 'xl',
      cell: (s) => (
        <span
          className={`font-mono tabular-nums ${
            s.parse_ms > 400 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
          }`}
        >
          {s.parse_ms ? `${s.parse_ms}ms` : '—'}
        </span>
      ),
      sortValue: (s) => s.parse_ms,
    },
    {
      key: 'scanned',
      header: 'Scanned',
      align: 'right',
      cell: (s) => <span className="text-muted-foreground">{relTime(s.scanned_at)}</span>,
      sortValue: (s) => new Date(s.scanned_at).getTime(),
    },
  ];

  return (
    <DataTable
      rows={slips}
      columns={columns}
      rowKey={(s) => s.id}
      searchFields={(s) => `${s.booking_code} ${s.bookmaker} ${s.user_name} ${s.user_email}`}
      searchPlaceholder="Search code, sportsbook or user..."
      filters={[
        {
          key: 'bookmaker',
          label: 'Book',
          options: bookmakers.map((b) => ({ value: b, label: b })),
        },
        {
          key: 'status',
          label: 'Status',
          options: [
            { value: 'RUNNING', label: 'Running' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'WON', label: 'Won' },
            { value: 'LOST', label: 'Lost' },
            { value: 'CASHED_OUT', label: 'Cashed out' },
          ],
        },
      ]}
      filterValue={(s, key) => (key === 'bookmaker' ? s.bookmaker : s.status)}
      defaultSort={{ key: 'scanned', dir: 'desc' }}
      itemLabel="slips"
      isLoading={isLoading}
      emptyTitle="No slips scanned"
      emptyBody="Booking codes appear here the moment the parser resolves one."
      minWidth="min-w-[980px]"
    />
  );
}

/* =========================================================================== */
/* Transactions                                                                */
/* =========================================================================== */

function TransactionsSection({
  transactions,
  isLoading,
}: {
  transactions: AdminTransactionRow[];
  isLoading: boolean;
}) {
  const settled = transactions
    .filter((t) => t.status === 'successful' || t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);
  const failedCount = transactions.filter((t) => t.status === 'failed').length;

  const columns: Column<AdminTransactionRow>[] = [
    {
      key: 'reference',
      header: 'Reference',
      cell: (t) => (
        <span>
          <span className="block font-mono text-xs font-bold text-foreground">{t.reference}</span>
          <span className="block text-[11px] capitalize text-muted-foreground">
            {t.gateway} · {t.billing_cycle || '—'}
          </span>
        </span>
      ),
      sortValue: (t) => t.reference,
    },
    {
      key: 'user',
      header: 'Payer',
      cell: (t) => <UserCell name={t.user_name} email={t.user_email} plan={t.plan} />,
      sortValue: (t) => t.user_name.toLowerCase(),
    },
    {
      key: 'method',
      header: 'Method',
      hideBelow: 'lg',
      cell: (t) => <span className="text-muted-foreground">{t.method || '—'}</span>,
      sortValue: (t) => t.method,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (t) => (
        <span className="font-mono font-bold tabular-nums text-foreground">
          {money(t.amount, t.currency)}
        </span>
      ),
      sortValue: (t) => t.amount,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (t) => <Chip tone={txTone(t.status)}>{t.status}</Chip>,
      sortValue: (t) => t.status,
    },
    {
      key: 'created',
      header: 'When',
      align: 'right',
      cell: (t) => <span className="text-muted-foreground">{relTime(t.created_at)}</span>,
      sortValue: (t) => new Date(t.created_at).getTime(),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Settled volume"
          value={money(settled)}
          sub={`${transactions.length} transactions`}
          icon={DollarSign}
          tone="positive"
        />
        <KpiCard
          label="Failed"
          value={num(failedCount)}
          sub="Needs follow-up"
          icon={AlertTriangle}
          tone={failedCount > 0 ? 'danger' : 'neutral'}
        />
        <KpiCard
          label="Average payment"
          value={money(transactions.length ? settled / transactions.length : 0)}
          sub="Across all gateways"
          icon={TrendingUp}
          tone="info"
        />
      </div>

      <DataTable
        rows={transactions}
        columns={columns}
        rowKey={(t) => t.id}
        searchFields={(t) => `${t.reference} ${t.user_name} ${t.user_email} ${t.method}`}
        searchPlaceholder="Search reference, payer or method..."
        filters={[
          {
            key: 'gateway',
            label: 'Gateway',
            options: [
              { value: 'flutterwave', label: 'Flutterwave' },
              { value: 'cryptomus', label: 'Cryptomus' },
            ],
          },
          {
            key: 'status',
            label: 'Status',
            options: [
              { value: 'successful', label: 'Successful' },
              { value: 'pending', label: 'Pending' },
              { value: 'failed', label: 'Failed' },
              { value: 'refunded', label: 'Refunded' },
            ],
          },
        ]}
        filterValue={(t, key) => (key === 'gateway' ? t.gateway : t.status)}
        defaultSort={{ key: 'created', dir: 'desc' }}
        itemLabel="transactions"
        isLoading={isLoading}
        emptyTitle="No transactions"
        emptyBody="Payments appear here as soon as a gateway webhook is processed."
        minWidth="min-w-[880px]"
      />
    </div>
  );
}

/* =========================================================================== */
/* Live operations                                                             */
/* =========================================================================== */

function LiveSection({
  telemetry,
  matches,
  isLoading,
  onSimulateGoal,
  onAdjustScore,
}: {
  telemetry: any | null;
  matches: any[];
  isLoading: boolean;
  onSimulateGoal: (id: string, side: 'HOME' | 'AWAY') => void;
  onAdjustScore: (match: any, home: number, away: number) => void;
}) {
  const quotaTone = (used: number, limit: number): Tone =>
    used / Math.max(1, limit) > 0.8 ? 'danger' : 'neutral';

  const columns: Column<any>[] = [
    {
      key: 'fixture',
      header: 'Fixture',
      cell: (m) => (
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-foreground">
            {m.home_team?.name} v {m.away_team?.name}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {m.league?.name} · {m.sport}
          </span>
        </span>
      ),
      sortValue: (m) => m.home_team?.name ?? '',
    },
    {
      key: 'score',
      header: 'Score',
      align: 'right',
      cell: (m) => (
        <span className="font-mono text-sm font-black tabular-nums text-foreground">
          {m.home_score}–{m.away_score}
        </span>
      ),
      sortValue: (m) => m.home_score + m.away_score,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (m) => (
        <Chip
          tone={m.status === 'LIVE' ? 'danger' : m.status === 'FINISHED' ? 'neutral' : 'warning'}
        >
          {m.status === 'LIVE' ? `${m.period} ${m.minute}'` : m.status}
        </Chip>
      ),
      sortValue: (m) => m.status,
    },
    {
      key: 'correct',
      header: 'Correct score',
      hideBelow: 'md',
      cell: (m) => (
        <span className="flex items-center gap-1">
          <ScoreStep label="Home -1" onClick={() => onAdjustScore(m, -1, 0)} icon={Minus} />
          <ScoreStep label="Home +1" onClick={() => onAdjustScore(m, 1, 0)} icon={Plus} />
          <span className="mx-1 text-[10px] font-bold text-muted-foreground">/</span>
          <ScoreStep label="Away -1" onClick={() => onAdjustScore(m, 0, -1)} icon={Minus} />
          <ScoreStep label="Away +1" onClick={() => onAdjustScore(m, 0, 1)} icon={Plus} />
        </span>
      ),
    },
    {
      key: 'simulate',
      header: 'Test event',
      align: 'right',
      hideBelow: 'lg',
      cell: (m) => (
        <span className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onSimulateGoal(m.id, 'HOME')}
            className="cursor-pointer rounded-md border border-surface-border bg-surface-subtle px-2 py-1 text-[10px] font-bold text-foreground transition-colors hover:bg-surface-hover"
          >
            Goal H
          </button>
          <button
            type="button"
            onClick={() => onSimulateGoal(m.id, 'AWAY')}
            className="cursor-pointer rounded-md border border-surface-border bg-surface-subtle px-2 py-1 text-[10px] font-bold text-foreground transition-colors hover:bg-surface-hover"
          >
            Goal A
          </button>
        </span>
      ),
    },
    {
      key: 'open',
      header: '',
      align: 'right',
      cell: (m) => (
        <Link
          href={`/match/${m.id}`}
          aria-label="Open match page"
          className="inline-flex rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Connected clients"
          value={num(telemetry?.connected_clients ?? 0)}
          sub={`${num(telemetry?.broadcasts_per_minute ?? 0)} broadcasts/min`}
          icon={Radio}
          tone="positive"
        />
        <KpiCard
          label="Ingestion latency"
          value={`${(telemetry?.avg_ingestion_latency_ms ?? 0).toFixed(1)} ms`}
          sub={`${num(telemetry?.active_pollers ?? 0)} active pollers`}
          icon={Activity}
          tone="info"
        />
        <KpiCard
          label="ESPN quota"
          value={num(telemetry?.espn_quota_used ?? 0)}
          sub={`of ${num(telemetry?.espn_quota_limit ?? 0)} calls`}
          icon={Server}
          tone={quotaTone(telemetry?.espn_quota_used ?? 0, telemetry?.espn_quota_limit ?? 1)}
        />
        <KpiCard
          label="Odds API quota"
          value={num(telemetry?.odds_api_quota_used ?? 0)}
          sub={`of ${num(telemetry?.odds_api_quota_limit ?? 0)} calls`}
          icon={TrendingUp}
          tone={quotaTone(telemetry?.odds_api_quota_used ?? 0, telemetry?.odds_api_quota_limit ?? 1)}
        />
      </div>

      <Panel
        title="Match orchestrator"
        description="Correct a wrong scoreline, or push a test event to every connected client. Both broadcast live immediately."
      >
        <DataTable
          rows={matches}
          columns={columns}
          rowKey={(m) => m.id}
          searchFields={(m) =>
            `${m.home_team?.name} ${m.away_team?.name} ${m.league?.name} ${m.sport}`
          }
          searchPlaceholder="Search fixture, league or sport..."
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'LIVE', label: 'Live' },
                { value: 'SCHEDULED', label: 'Scheduled' },
                { value: 'FINISHED', label: 'Finished' },
              ],
            },
          ]}
          filterValue={(m) => m.status}
          defaultSort={{ key: 'status', dir: 'asc' }}
          pageSize={8}
          itemLabel="fixtures"
          isLoading={isLoading}
          emptyTitle="No fixtures"
          emptyBody="Fixtures appear once the ingestion worker has polled a feed."
          minWidth="min-w-[900px]"
        />
      </Panel>
    </div>
  );
}

function ScoreStep({
  label,
  onClick,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="cursor-pointer rounded-md border border-surface-border bg-surface-subtle p-1 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      <Icon className="h-3 w-3" />
    </button>
  );
}

/* =========================================================================== */
/* Support                                                                     */
/* =========================================================================== */

function SupportSection({
  tickets,
  isLoading,
  selectedTicket,
  onSelect,
  replyText,
  onReplyChange,
  onSendReply,
  isSending,
}: {
  tickets: SupportTicket[];
  isLoading: boolean;
  selectedTicket: SupportTicket | null;
  onSelect: (t: SupportTicket) => void;
  replyText: string;
  onReplyChange: (v: string) => void;
  onSendReply: (e: React.FormEvent) => void;
  isSending: boolean;
}) {
  const priorityTone = (p: string): Tone =>
    p === 'urgent' ? 'danger' : p === 'high' ? 'warning' : p === 'medium' ? 'info' : 'neutral';

  const statusTone = (s: string): Tone =>
    s === 'open' ? 'danger' : s === 'in_progress' ? 'warning' : 'positive';

  const columns: Column<SupportTicket>[] = [
    {
      key: 'subject',
      header: 'Ticket',
      cell: (t) => (
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-foreground">{t.subject}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {t.category} · #{t.id.slice(-6)}
          </span>
        </span>
      ),
      sortValue: (t) => t.subject.toLowerCase(),
    },
    {
      key: 'user',
      header: 'From',
      hideBelow: 'md',
      cell: (t) => <UserCell name={t.user_name} email={t.user_email} />,
      sortValue: (t) => t.user_name.toLowerCase(),
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (t) => <Chip tone={priorityTone(t.priority)}>{t.priority}</Chip>,
      sortValue: (t) => ['low', 'medium', 'high', 'urgent'].indexOf(t.priority),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (t) => <Chip tone={statusTone(t.status)}>{t.status.replace('_', ' ')}</Chip>,
      sortValue: (t) => t.status,
    },
    {
      key: 'updated',
      header: 'Updated',
      align: 'right',
      cell: (t) => <span className="text-muted-foreground">{relTime(t.updated_at)}</span>,
      sortValue: (t) => new Date(t.updated_at).getTime(),
    },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-5">
      <div className="min-w-0 xl:col-span-3">
        <DataTable
          rows={tickets}
          columns={columns}
          rowKey={(t) => t.id}
          searchFields={(t) => `${t.subject} ${t.user_name} ${t.user_email} ${t.category} ${t.id}`}
          searchPlaceholder="Search subject, sender or category..."
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'open', label: 'Open' },
                { value: 'in_progress', label: 'In progress' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'closed', label: 'Closed' },
              ],
            },
          ]}
          filterValue={(t) => t.status}
          onRowClick={onSelect}
          isSelected={(t) => t.id === selectedTicket?.id}
          defaultSort={{ key: 'updated', dir: 'desc' }}
          pageSize={8}
          itemLabel="tickets"
          isLoading={isLoading}
          emptyTitle="Queue is clear"
          emptyBody="No tickets match this view."
          minWidth="min-w-[680px]"
        />
      </div>

      <div className="min-w-0 xl:col-span-2">
        {selectedTicket ? (
          <Panel
            title={selectedTicket.subject}
            description={`${selectedTicket.user_name} · ${selectedTicket.category}`}
            actions={
              <Chip tone={statusTone(selectedTicket.status)}>
                {selectedTicket.status.replace('_', ' ')}
              </Chip>
            }
          >
            <div className="max-h-[26rem] space-y-3 overflow-y-auto pr-1">
              {selectedTicket.messages?.map((msg) => {
                const fromAgent = msg.sender === 'agent';
                return (
                  <div
                    key={msg.id}
                    className={`rounded-xl border p-3 ${
                      fromAgent
                        ? 'border-[var(--brand-ring)] bg-[var(--brand-soft)]'
                        : 'border-surface-border bg-surface-subtle'
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[11px] font-bold text-foreground">
                        {msg.sender_name}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {relTime(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-foreground">{msg.message}</p>
                  </div>
                );
              })}
            </div>

            <form onSubmit={onSendReply} className="mt-4 border-t border-surface-border pt-4">
              <label htmlFor="admin-reply" className="sr-only">
                Reply to ticket
              </label>
              <textarea
                id="admin-reply"
                value={replyText}
                onChange={(e) => onReplyChange(e.target.value)}
                rows={3}
                placeholder="Write a reply..."
                className="w-full resize-none rounded-xl border border-surface-border bg-surface-subtle p-3 text-xs text-foreground transition-colors placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSending || !replyText.trim()}
                className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Send reply</span>
              </button>
            </form>
          </Panel>
        ) : (
          <div className="flex h-full min-h-[16rem] flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border bg-surface p-8 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-surface-border bg-surface-subtle text-muted-foreground">
              <Headphones className="h-5 w-5" />
            </span>
            <p className="mt-3.5 text-sm font-bold text-foreground">No ticket open</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Pick a ticket from the queue to read the thread and reply.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
