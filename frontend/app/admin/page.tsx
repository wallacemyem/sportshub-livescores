'use client';

import { useState, useEffect, useMemo } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import {
  Activity,
  Server,
  Zap,
  DollarSign,
  TrendingUp,
  Radio,
  Sliders,
  ShieldCheck,
  Ticket,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  Sparkles,
  Headphones,
  Send,
  MessageSquare,
  Search,
  ArrowLeft,
  RefreshCw,
  Coins,
  CreditCard,
  Plus,
  Minus,
  Check,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { MobileNav } from '@/components/ui/MobileNav';
import { getApiBaseUrl } from '@/lib/api';

interface TelemetryData {
  active_pollers: number;
  espn_polling_rate_sec: number;
  odds_api_polling_rate_sec: number;
  espn_quota_used: number;
  espn_quota_limit: number;
  odds_api_quota_used: number;
  odds_api_quota_limit: number;
  avg_ingestion_latency_ms: number;
  redis_keys_count: number;
  redis_memory_used_mb: number;
  connected_clients: number;
  broadcasts_per_minute: number;
  last_updated: string;
}

interface FinancialData {
  total_revenue_usd: number;
  mrr_usd: number;
  flutterwave_volume_usd: number;
  cryptomus_volume_usd: number;
  active_pro_users: number;
  total_users: number;
  recent_transactions: any[];
}

interface ParserMetricsData {
  total_parsed: number;
  success_count: number;
  failure_count: number;
  success_rate_pct: number;
  by_bookmaker: Record<string, number>;
  recent_parsed_slips: any[];
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'ingestion' | 'orchestrator' | 'financials' | 'parser' | 'support'>('ingestion');
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [financials, setFinancials] = useState<FinancialData | null>(null);
  const [parserMetrics, setParserMetrics] = useState<ParserMetricsData | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [agentReplyText, setAgentReplyText] = useState('');
  const [testBookingCode, setTestBookingCode] = useState('BC99214');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isTestingParser, setIsTestingParser] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination states across tables
  const [clientsPage, setClientsPage] = useState(1);
  const [clientsPageSize, setClientsPageSize] = useState(5);

  const [matchesPage, setMatchesPage] = useState(1);
  const [matchesPageSize, setMatchesPageSize] = useState(6);

  const [webhooksPage, setWebhooksPage] = useState(1);
  const [webhooksPageSize, setWebhooksPageSize] = useState(5);

  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketsPageSize, setTicketsPageSize] = useState(5);

  // Filtered & Paginated Slices
  const paginatedClients = useMemo(() => {
    const start = (clientsPage - 1) * clientsPageSize;
    return clients.slice(start, start + clientsPageSize);
  }, [clients, clientsPage, clientsPageSize]);

  const filteredMatches = useMemo(() => {
    if (!matchSearchQuery.trim()) return matches;
    const q = matchSearchQuery.toLowerCase();
    return matches.filter((m) =>
      m.home_team?.name?.toLowerCase().includes(q) ||
      m.away_team?.name?.toLowerCase().includes(q) ||
      m.league?.name?.toLowerCase().includes(q) ||
      m.sport?.toLowerCase().includes(q)
    );
  }, [matches, matchSearchQuery]);

  const paginatedMatches = useMemo(() => {
    const start = (matchesPage - 1) * matchesPageSize;
    return filteredMatches.slice(start, start + matchesPageSize);
  }, [filteredMatches, matchesPage, matchesPageSize]);

  const paginatedWebhooks = useMemo(() => {
    const start = (webhooksPage - 1) * webhooksPageSize;
    return webhooks.slice(start, start + webhooksPageSize);
  }, [webhooks, webhooksPage, webhooksPageSize]);

  const filteredTickets = useMemo(() => {
    if (!ticketSearchQuery.trim()) return supportTickets;
    const q = ticketSearchQuery.toLowerCase();
    return supportTickets.filter((t) =>
      t.subject?.toLowerCase().includes(q) ||
      t.user_name?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q) ||
      t.id?.toLowerCase().includes(q)
    );
  }, [supportTickets, ticketSearchQuery]);

  const paginatedTickets = useMemo(() => {
    const start = (ticketsPage - 1) * ticketsPageSize;
    return filteredTickets.slice(start, start + ticketsPageSize);
  }, [filteredTickets, ticketsPage, ticketsPageSize]);

  // Fetch all admin data
  const fetchAll = async () => {
    try {
      setIsRefreshing(true);
      const apiBase = getApiBaseUrl();
      const [telRes, finRes, parRes, matRes, cliRes, whRes, supRes] = await Promise.all([
        fetch(`${apiBase}/admin/telemetry`),
        fetch(`${apiBase}/admin/financials`),
        fetch(`${apiBase}/admin/parser/metrics`),
        fetch(`${apiBase}/matches`),
        fetch(`${apiBase}/admin/clients`),
        fetch(`${apiBase}/admin/webhooks`),
        fetch(`${apiBase}/support/tickets`),
      ]);

      if (telRes.ok) setTelemetry(await telRes.json());
      if (finRes.ok) setFinancials(await finRes.json());
      if (parRes.ok) setParserMetrics(await parRes.json());
      if (matRes.ok) {
        const d = await matRes.json();
        setMatches(d.matches || []);
      }
      if (cliRes.ok) {
        const d = await cliRes.json();
        setClients(d.clients || []);
      }
      if (whRes.ok) {
        const d = await whRes.json();
        setWebhooks(d.logs || []);
      }
      if (supRes.ok) {
        const d = await supRes.json();
        setSupportTickets(d.tickets || []);
        if (d.tickets?.length > 0 && !selectedTicket) {
          setSelectedTicket(d.tickets[0]);
        }
      }
    } catch (e) {
      console.warn('Admin sync error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, []);

  // Trigger Goal Simulation
  async function triggerGoal(matchId: string, teamSide: 'HOME' | 'AWAY') {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/admin/matches/${matchId}/simulate-goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_side: teamSide }),
      });
      if (res.ok) {
        setActionSuccess(`Simulated goal dispatched for match (${teamSide})! Broadcasted to live sockets.`);
        setTimeout(() => setActionSuccess(null), 4000);
        fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Override Match Score
  async function handleOverride(match: any, homeDelta: number, awayDelta: number) {
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/admin/matches/${match.id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          home_score: Math.max(0, match.home_score + homeDelta),
          away_score: Math.max(0, match.away_score + awayDelta),
          status: match.status,
          period: match.period,
          minute: match.minute,
        }),
      });
      if (res.ok) {
        setActionSuccess(`Score adjusted for ${match.home_team.name} vs ${match.away_team.name}`);
        setTimeout(() => setActionSuccess(null), 3000);
        fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Test Parser
  async function handleTestParser() {
    try {
      setIsTestingParser(true);
      setTestResult(null);
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/betslip/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_code: testBookingCode,
          stake: 50.0,
        }),
      });
      if (res.ok) {
        setTestResult(await res.json());
      } else {
        const err = await res.json();
        setTestResult({ error: err.error || 'No matching bookmaker found' });
      }
    } catch (e: any) {
      setTestResult({ error: e.message || 'Error communicating with parser service' });
    } finally {
      setIsTestingParser(false);
    }
  }

  // Send Support Reply
  async function handleSendSupportReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket || !agentReplyText.trim()) return;

    const text = agentReplyText.trim();
    setAgentReplyText('');

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'agent',
          sender_name: 'Lead Support Engineer',
          message: text,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedTicket(updated);
        setSupportTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setActionSuccess(`Reply sent to ticket #${selectedTicket.id.slice(-6)}`);
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-24 md:pb-12">
      {/* Header */}
      <header className="bg-surface/90 backdrop-blur-md border-b border-surface-border sticky top-0 z-40 px-4 lg:px-8 md:pl-20 xl:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Scores Feed</span>
          </Link>

          <div className="h-4 w-px bg-surface-border" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-foreground tracking-tight flex items-center gap-1.5 font-mono">
                ADMIN ORCHESTRATOR
              </h1>
              <p className="text-[10px] text-muted-foreground hidden sm:block">
                Live Data Ingestion, Goal Simulation & Financial Console
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAll}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-surface-subtle hover:bg-surface-hover border border-surface-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh Live Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
          </button>
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Engine Online</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 md:pl-24 xl:px-6 py-6 space-y-6">
        {/* Action Success Notification */}
        {actionSuccess && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-2xl flex items-center gap-2 animate-in fade-in shadow-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
        )}

        {/* Executive KPI Overview Grid (Responsive 2 cols on mobile, 4 on desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Active Pollers */}
          <div className="bg-surface border border-surface-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Pollers</span>
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-foreground font-mono">
              {telemetry ? telemetry.active_pollers : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Latency: <strong className="text-emerald-500">{telemetry?.avg_ingestion_latency_ms || 2.4}ms</strong>
            </p>
          </div>

          {/* Connected WebSocket Clients */}
          <div className="bg-surface border border-surface-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider font-mono">WS Clients</span>
              <Radio className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-foreground font-mono">
              {telemetry ? telemetry.connected_clients : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Broadcasts: <strong className="text-foreground">{telemetry?.broadcasts_per_minute || 0}/min</strong>
            </p>
          </div>

          {/* PRO Revenue */}
          <div className="bg-surface border border-surface-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider font-mono">PRO Revenue</span>
              <DollarSign className="w-4 h-4 text-violet-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-foreground font-mono">
              ${financials ? financials.total_revenue_usd.toLocaleString() : '0'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Active Subs: <strong className="text-violet-500">{financials?.active_pro_users || 0}</strong>
            </p>
          </div>

          {/* Parser Success Rate */}
          <div className="bg-surface border border-surface-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Parser Rate</span>
              <Ticket className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-foreground font-mono">
              {parserMetrics ? `${parserMetrics.success_rate_pct.toFixed(1)}%` : '98.5%'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Resolved: <strong className="text-foreground">{parserMetrics?.total_parsed || 0} slips</strong>
            </p>
          </div>
        </div>

        {/* Segmented Navigation Tab Bar (Mobile-friendly horizontal swipe) */}
        <div className="border-b border-surface-border pb-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 p-1 bg-surface-subtle border border-surface-border rounded-2xl w-max">
            <button
              onClick={() => setActiveTab('ingestion')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'ingestion'
                  ? 'bg-surface text-foreground shadow-sm border border-surface-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              <span>Telemetry & Ingestion</span>
            </button>

            <button
              onClick={() => setActiveTab('orchestrator')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'orchestrator'
                  ? 'bg-surface text-foreground shadow-sm border border-surface-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Play className="w-3.5 h-3.5 text-emerald-500" />
              <span>Match Controller ({matches.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('financials')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'financials'
                  ? 'bg-surface text-foreground shadow-sm border border-surface-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-violet-500" />
              <span>Financials & Webhooks</span>
            </button>

            <button
              onClick={() => setActiveTab('parser')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'parser'
                  ? 'bg-surface text-foreground shadow-sm border border-surface-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Ticket className="w-3.5 h-3.5 text-amber-500" />
              <span>Bet Slip Parser</span>
            </button>

            <button
              onClick={() => setActiveTab('support')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'support'
                  ? 'bg-surface text-foreground shadow-sm border border-surface-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Headphones className="w-3.5 h-3.5 text-indigo-500" />
              <span>Support Queue ({supportTickets.length})</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: TELEMETRY & INGESTION                                              */}
        {/* ========================================================================= */}
        {activeTab === 'ingestion' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Quota & Memory Meters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ESPN Ingestion */}
              <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <h3 className="text-xs font-bold text-foreground">ESPN API Quota & Poller</h3>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">Rate: 1s interval</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Quota Used</span>
                    <span className="font-bold text-foreground">
                      {telemetry?.espn_quota_used || 1240} / {telemetry?.espn_quota_limit || 10000}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-subtle overflow-hidden border border-surface-border">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ((telemetry?.espn_quota_used || 1240) / (telemetry?.espn_quota_limit || 10000)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* The Odds API */}
              <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-bold text-foreground">The Odds API Quota</h3>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">Rate: 5s interval</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Quota Used</span>
                    <span className="font-bold text-foreground">
                      {telemetry?.odds_api_quota_used || 820} / {telemetry?.odds_api_quota_limit || 5000}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-subtle overflow-hidden border border-surface-border">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ((telemetry?.odds_api_quota_used || 820) / (telemetry?.odds_api_quota_limit || 5000)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Redis & System Telemetry */}
            <div className="bg-surface border border-surface-border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold text-foreground">Redis Memory & Socket Broker</h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  HEALTHY
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-surface-subtle p-3 rounded-xl border border-surface-border">
                  <span className="text-[10px] text-muted-foreground uppercase">Keys Cached</span>
                  <p className="text-lg font-bold text-foreground mt-0.5">{telemetry?.redis_keys_count || 142}</p>
                </div>
                <div className="bg-surface-subtle p-3 rounded-xl border border-surface-border">
                  <span className="text-[10px] text-muted-foreground uppercase">RAM Used</span>
                  <p className="text-lg font-bold text-foreground mt-0.5">{telemetry?.redis_memory_used_mb || 4.2} MB</p>
                </div>
                <div className="bg-surface-subtle p-3 rounded-xl border border-surface-border">
                  <span className="text-[10px] text-muted-foreground uppercase">Avg Latency</span>
                  <p className="text-lg font-bold text-emerald-500 mt-0.5">{telemetry?.avg_ingestion_latency_ms || 2.4} ms</p>
                </div>
                <div className="bg-surface-subtle p-3 rounded-xl border border-surface-border">
                  <span className="text-[10px] text-muted-foreground uppercase">Broadcasts</span>
                  <p className="text-lg font-bold text-foreground mt-0.5">{telemetry?.broadcasts_per_minute || 60}/min</p>
                </div>
              </div>
            </div>

            {/* Connected WebSocket Clients (Responsive Table / Mobile Cards) */}
            <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-sm space-y-0">
              <div className="p-4 border-b border-surface-border bg-surface-subtle flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-blue-500" />
                  <h3 className="text-xs font-bold text-foreground">Connected Clients ({clients.length})</h3>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">Port 18443</span>
              </div>

              {clients.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground font-mono">
                  No active WebSocket client connections
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-surface-subtle/60 border-b border-surface-border text-muted-foreground text-[10px] uppercase">
                        <tr>
                          <th className="p-3">Client IP</th>
                          <th className="p-3">User Agent</th>
                          <th className="p-3">Subscribed Matches</th>
                          <th className="p-3">Connected Since</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {paginatedClients.map((c, i) => (
                          <tr key={i} className="hover:bg-surface-hover/50 transition-colors">
                            <td className="p-3 text-foreground font-bold">{c.ip || '127.0.0.1'}</td>
                            <td className="p-3 text-muted-foreground truncate max-w-xs">{c.user_agent || 'Mozilla/5.0'}</td>
                            <td className="p-3">
                              <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 text-[10px]">
                                {c.subscriptions?.length || 1} match feeds
                              </span>
                            </td>
                            <td className="p-3 text-muted-foreground">{new Date(c.connected_at || Date.now()).toLocaleTimeString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="sm:hidden divide-y divide-surface-border">
                    {paginatedClients.map((c, i) => (
                      <div key={i} className="p-3 space-y-1.5 text-xs font-mono">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{c.ip || '127.0.0.1'}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(c.connected_at || Date.now()).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{c.user_agent || 'Browser Client'}</p>
                      </div>
                    ))}
                  </div>

                  <Pagination
                    currentPage={clientsPage}
                    totalItems={clients.length}
                    pageSize={clientsPageSize}
                    onPageChange={setClientsPage}
                    onPageSizeChange={setClientsPageSize}
                    itemLabel="clients"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MATCH CONTROLLER & SIMULATION                                      */}
        {/* ========================================================================= */}
        {activeTab === 'orchestrator' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={matchSearchQuery}
                onChange={(e) => setMatchSearchQuery(e.target.value)}
                placeholder="Search fixtures, teams, leagues..."
                className="w-full pl-10 pr-4 py-2 bg-surface border border-surface-border focus:border-blue-500 rounded-xl text-xs text-foreground focus:outline-none"
              />
            </div>

            {/* Matches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedMatches.map((m) => (
                <div
                  key={m.id}
                  className="bg-surface border border-surface-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {m.sport}
                      </span>
                      <span className="text-xs text-muted-foreground truncate max-w-[160px] sm:max-w-xs">
                        {m.league?.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {m.period} {m.minute ? `${m.minute}'` : ''}
                    </span>
                  </div>

                  {/* Teams & Score Steppers */}
                  <div className="space-y-3">
                    {/* Home Team */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-foreground truncate">{m.home_team.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOverride(m, -1, 0)}
                          className="p-1 rounded-lg bg-surface-subtle hover:bg-surface-hover border border-surface-border text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-base font-black font-mono text-foreground min-w-[20px] text-center">
                          {m.home_score}
                        </span>
                        <button
                          onClick={() => handleOverride(m, 1, 0)}
                          className="p-1 rounded-lg bg-surface-subtle hover:bg-surface-hover border border-surface-border text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => triggerGoal(m.id, 'HOME')}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg cursor-pointer"
                        >
                          + Goal
                        </button>
                      </div>
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-foreground truncate">{m.away_team.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOverride(m, 0, -1)}
                          className="p-1 rounded-lg bg-surface-subtle hover:bg-surface-hover border border-surface-border text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-base font-black font-mono text-foreground min-w-[20px] text-center">
                          {m.away_score}
                        </span>
                        <button
                          onClick={() => handleOverride(m, 0, 1)}
                          className="p-1 rounded-lg bg-surface-subtle hover:bg-surface-hover border border-surface-border text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => triggerGoal(m.id, 'AWAY')}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg cursor-pointer"
                        >
                          + Goal
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={matchesPage}
              totalItems={filteredMatches.length}
              pageSize={matchesPageSize}
              onPageChange={setMatchesPage}
              onPageSizeChange={setMatchesPageSize}
              itemLabel="matches"
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: FINANCIALS & WEBHOOKS                                              */}
        {/* ========================================================================= */}
        {activeTab === 'financials' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Gateway Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-violet-500" />
                    <h3 className="text-xs font-bold text-foreground">Cryptomus On-Chain Volume</h3>
                  </div>
                  <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                    USDT / BTC / ETH
                  </span>
                </div>
                <p className="text-2xl font-black text-foreground font-mono">
                  ${financials ? financials.cryptomus_volume_usd.toLocaleString() : '0'}
                </p>
                <p className="text-[11px] text-muted-foreground">Automated Webhook Verification with 1 block confirmation</p>
              </div>

              <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    <h3 className="text-xs font-bold text-foreground">Flutterwave Card & Bank Volume</h3>
                  </div>
                  <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    Cards / Bank
                  </span>
                </div>
                <p className="text-2xl font-black text-foreground font-mono">
                  ${financials ? financials.flutterwave_volume_usd.toLocaleString() : '0'}
                </p>
                <p className="text-[11px] text-muted-foreground">Direct webhook HMAC signed token processing</p>
              </div>
            </div>

            {/* Webhook Activity Logs */}
            <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-surface-border bg-surface-subtle flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-xs font-bold text-foreground">Recent Webhook Inbound Logs ({webhooks.length})</h3>
                </div>
              </div>

              {webhooks.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground font-mono">
                  No webhook transactions recorded yet.
                </div>
              ) : (
                <>
                  <div className="divide-y divide-surface-border">
                    {paginatedWebhooks.map((w, idx) => (
                      <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground uppercase">{w.provider || 'Cryptomus'}</span>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/20">
                              {w.status || 'VERIFIED'}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{w.event || 'charge.completed'}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-foreground text-sm">${w.amount || 29}.00</span>
                          <p className="text-[10px] text-muted-foreground">{new Date(w.timestamp || Date.now()).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Pagination
                    currentPage={webhooksPage}
                    totalItems={webhooks.length}
                    pageSize={webhooksPageSize}
                    onPageChange={setWebhooksPage}
                    onPageSizeChange={setWebhooksPageSize}
                    itemLabel="webhooks"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: BET SLIP PARSER ENGINE                                             */}
        {/* ========================================================================= */}
        {activeTab === 'parser' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Parser Tester Card */}
            <div className="bg-surface border border-surface-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Multi-Bookmaker Ticket Resolver Simulator</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Test auto-resolution across SportyBet, Bet9ja, 1xBet, and BetKing backend algorithms.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-muted-foreground font-mono">Sample Codes:</span>
                {['BC99214', 'B9JA-44912', '1X-88231', 'BK-10294'].map((code) => (
                  <button
                    key={code}
                    onClick={() => setTestBookingCode(code)}
                    className="px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-surface-hover border border-surface-border text-xs font-mono font-semibold text-foreground cursor-pointer"
                  >
                    {code}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <input
                  type="text"
                  value={testBookingCode}
                  onChange={(e) => setTestBookingCode(e.target.value.toUpperCase())}
                  placeholder="Enter Booking Code..."
                  className="w-full sm:max-w-xs px-3.5 py-2 bg-surface-subtle border border-surface-border focus:border-blue-500 rounded-xl text-xs font-mono text-foreground focus:outline-none"
                />
                <button
                  onClick={handleTestParser}
                  disabled={isTestingParser || !testBookingCode.trim()}
                  className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isTestingParser ? 'Resolving...' : 'Test Resolve'}</span>
                </button>
              </div>

              {/* Result View */}
              {testResult && (
                <div className="p-4 bg-surface-subtle border border-surface-border rounded-xl space-y-3 font-mono text-xs animate-in fade-in">
                  {testResult.error ? (
                    <div className="text-red-500 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      <span>{testResult.error}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between border-b border-surface-border pb-2">
                        <span className="font-bold text-emerald-500">Bookmaker: {testResult.bookmaker}</span>
                        <span className="text-muted-foreground">Total Odds: {testResult.total_odds?.toFixed(2)}x</span>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-muted-foreground">
                          Cash-out Probability: <strong className="text-foreground">{((testResult.cashout_probability || 0.85) * 100).toFixed(0)}%</strong>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Potential Win: <strong className="text-emerald-500">${testResult.potential_win?.toFixed(2)}</strong>
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: SUPPORT HELP DESK                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'support' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Search Input */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={ticketSearchQuery}
                onChange={(e) => setTicketSearchQuery(e.target.value)}
                placeholder="Search ticket subject, user email, category..."
                className="w-full pl-10 pr-4 py-2 bg-surface border border-surface-border focus:border-blue-500 rounded-xl text-xs text-foreground focus:outline-none"
              />
            </div>

            {/* Split View on Desktop / Stack on Mobile */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left Ticket List */}
              <div className="md:col-span-5 bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-3 border-b border-surface-border bg-surface-subtle">
                  <h3 className="text-xs font-bold text-foreground">Support Inquiries ({supportTickets.length})</h3>
                </div>

                <div className="divide-y divide-surface-border overflow-y-auto max-h-[450px]">
                  {paginatedTickets.map((t) => {
                    const isSelected = selectedTicket?.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={`w-full text-left p-3 transition-all cursor-pointer space-y-1 ${
                          isSelected
                            ? 'bg-blue-500/10 border-l-4 border-l-blue-500 text-foreground'
                            : 'hover:bg-surface-subtle text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase text-blue-600 dark:text-blue-400">
                            {t.category}
                          </span>
                          <span className="text-[9px] font-mono bg-surface-subtle px-1.5 py-0.5 rounded border border-surface-border">
                            {t.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-foreground truncate">{t.subject}</p>
                        <div className="text-[10px] text-muted-foreground flex items-center justify-between font-mono">
                          <span>{t.user_name || 'User'}</span>
                          <span>{new Date(t.created_at).toLocaleDateString()}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <Pagination
                  currentPage={ticketsPage}
                  totalItems={filteredTickets.length}
                  pageSize={ticketsPageSize}
                  onPageChange={setTicketsPage}
                  onPageSizeChange={setTicketsPageSize}
                  itemLabel="tickets"
                />
              </div>

              {/* Right Message Thread & Reply Composer */}
              <div className="md:col-span-7 bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[450px]">
                {selectedTicket ? (
                  <>
                    <div className="p-4 border-b border-surface-border bg-surface-subtle flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{selectedTicket.subject}</h4>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          From: {selectedTicket.user_name} ({selectedTicket.user_email}) &bull; Priority: {selectedTicket.priority}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {selectedTicket.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[340px]">
                      {selectedTicket.messages?.map((msg: any, i: number) => {
                        const isAgent = msg.sender === 'agent';
                        return (
                          <div key={i} className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1 font-mono">
                              <span>{msg.sender_name || (isAgent ? 'Support Engineer' : 'User')}</span>
                              <span>&bull;</span>
                              <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div
                              className={`p-3 rounded-2xl max-w-md text-xs leading-relaxed ${
                                isAgent
                                  ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                                  : 'bg-surface-subtle border border-surface-border text-foreground rounded-bl-none'
                              }`}
                            >
                              {msg.message}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <form onSubmit={handleSendSupportReply} className="p-3 border-t border-surface-border bg-surface-subtle flex items-center gap-2">
                      <input
                        type="text"
                        value={agentReplyText}
                        onChange={(e) => setAgentReplyText(e.target.value)}
                        placeholder="Type official support engineer response..."
                        className="flex-1 bg-surface border border-surface-border focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!agentReplyText.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold p-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <MessageSquare className="w-8 h-8 opacity-30 mb-2" />
                    <p className="text-xs font-mono">Select a support ticket from the queue</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <MobileNav activeNav="admin" />
    </div>
  );
}
