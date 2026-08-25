'use client';

import { useState, useEffect, useMemo } from 'react';
import { Pagination } from '@/components/Pagination';
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
  RotateCcw,
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
} from 'lucide-react';

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
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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

  // Poll admin metrics
  useEffect(() => {
    async function fetchAll() {
      try {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const [telRes, finRes, parRes, matRes, cliRes, whRes, supRes] = await Promise.all([
          fetch(`http://${host}:18443/api/v1/admin/telemetry`),
          fetch(`http://${host}:18443/api/v1/admin/financials`),
          fetch(`http://${host}:18443/api/v1/admin/parser/metrics`),
          fetch(`http://${host}:18443/api/v1/matches`),
          fetch(`http://${host}:18443/api/v1/admin/clients`),
          fetch(`http://${host}:18443/api/v1/admin/webhooks`),
          fetch(`http://${host}:18443/api/v1/support/tickets`),
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
        console.warn('Admin API sync error:', e);
      }
    }

    fetchAll();
    const interval = setInterval(fetchAll, 4000);
    return () => clearInterval(interval);
  }, [selectedTicket]);

  // Trigger Goal Simulation
  async function triggerGoal(matchId: string, teamSide: 'HOME' | 'AWAY') {
    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const res = await fetch(`http://${host}:18443/api/v1/admin/matches/${matchId}/simulate-goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_side: teamSide }),
      });
      if (res.ok) {
        setActionSuccess(`Simulated goal dispatched for match ${matchId} (${teamSide})! Broadcasted to WS.`);
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Override Match Score
  async function handleOverride(match: any, homeDelta: number, awayDelta: number) {
    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const res = await fetch(`http://${host}:18443/api/v1/admin/matches/${match.id}/override`, {
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
        setActionSuccess(`Score updated for ${match.id}`);
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Test Parser
  async function handleTestParser() {
    try {
      setTestResult(null);
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const res = await fetch(`http://${host}:18443/api/v1/betslip/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_code: testBookingCode,
          stake: 50.00,
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
    }
  }

  async function handleAgentReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket || !agentReplyText.trim()) return;

    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const res = await fetch(`http://${host}:18443/api/v1/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'agent',
          sender_name: 'Sarah (Admin Desk)',
          message: agentReplyText.trim(),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedTicket(updated);
        setSupportTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setAgentReplyText('');
        setActionSuccess(`Reply sent to customer on Ticket #${selectedTicket.id}!`);
        setTimeout(() => setActionSuccess(null), 3500);
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0D13] text-slate-100 flex flex-col font-sans">
      {/* Kumo Header */}
      <header className="bg-kumo-surface border-b border-kumo-border px-6 py-3.5 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-kumo-orange/20 border border-kumo-orange flex items-center justify-center text-kumo-orange font-bold font-mono text-xs">
              KUMO
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-wide">CLOUDFLARE KUMO</h1>
                <span className="text-[10px] bg-kumo-orange/20 text-kumo-orange font-mono px-2 py-0.5 rounded border border-kumo-orange/40 font-bold">
                  ADMIN PORT 19080
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Sports Ingestion Hub & Live Match Orchestrator</p>
            </div>
          </div>
        </div>

        {/* Global Cluster State Badges */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-2 bg-kumo-card px-3 py-1.5 rounded-lg border border-kumo-border">
            <span className="w-2 h-2 rounded-full bg-kumo-emerald animate-pulse"></span>
            <span className="text-slate-300">Backend Port: <strong className="text-white">18443</strong></span>
          </div>

          <div className="flex items-center gap-2 bg-kumo-card px-3 py-1.5 rounded-lg border border-kumo-border">
            <Database className="w-3.5 h-3.5 text-kumo-cyan" />
            <span className="text-slate-300">Redis: <strong className="text-white">26379</strong></span>
          </div>

          <a
            href="http://localhost:17080/blog/editor"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-purple-950/80 border border-purple-500/50 hover:bg-purple-900 text-purple-300 font-bold px-3 py-1.5 rounded-lg transition-colors text-xs"
          >
            <span>Word Processor</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <a
            href="http://localhost:17080"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-kumo-emerald hover:bg-emerald-400 text-black font-bold px-3 py-1.5 rounded-lg transition-colors text-xs"
          >
            <span>Open Client (17080)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Action Notification Banner */}
      {actionSuccess && (
        <div className="bg-kumo-emerald/20 border-b border-kumo-emerald/50 px-6 py-2 text-xs font-mono text-kumo-emerald flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-kumo-surface border-b border-kumo-border px-6 flex items-center gap-2">
        {[
          { id: 'ingestion', label: 'Real-Time Ingestion Monitor', icon: Activity },
          { id: 'orchestrator', label: 'Live Match Orchestrator', icon: Sliders },
          { id: 'financials', label: 'Financial & Subscriptions Hub', icon: DollarSign },
          { id: 'parser', label: 'Bet Slip Parser Health', icon: Ticket },
          { id: 'support', label: 'Support Helpdesk Queue', icon: Headphones },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-kumo-orange text-kumo-orange bg-kumo-card/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-kumo-card/20'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-[1720px] w-full mx-auto space-y-6">
        {/* TAB 1: INGESTION MONITOR */}
        {activeTab === 'ingestion' && (
          <div className="space-y-6">
            {/* Top Telemetry KPI Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Active Pollers */}
              <div className="bg-kumo-surface border border-kumo-border rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span className="uppercase font-semibold tracking-wider">Active Polling Workers</span>
                  <Server className="w-4 h-4 text-kumo-orange" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-black text-white">{telemetry?.active_pollers ?? 4}</span>
                  <span className="text-xs text-kumo-emerald font-mono">Live: 5s • Sched: 60s</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Goroutine worker pool dynamically throttled</p>
              </div>

              {/* Card 2: Ingestion Latency */}
              <div className="bg-kumo-surface border border-kumo-border rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span className="uppercase font-semibold tracking-wider">Avg Ingestion Latency</span>
                  <Zap className="w-4 h-4 text-kumo-emerald" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-black text-kumo-emerald">
                    {telemetry?.avg_ingestion_latency_ms?.toFixed(1) ?? '12.4'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">ms (Sub-millisecond)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Redis pipeline write + Pub/Sub dispatch</p>
              </div>

              {/* Card 3: Connected WS Clients */}
              <div className="bg-kumo-surface border border-kumo-border rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span className="uppercase font-semibold tracking-wider">WebSocket Gateway (18443)</span>
                  <Radio className="w-4 h-4 text-kumo-cyan" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-black text-white">{clients.length || telemetry?.connected_clients || 1}</span>
                  <span className="text-xs text-kumo-cyan font-mono">Active Client Sessions</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">~{telemetry?.broadcasts_per_minute ?? 36} broadcasts/min</p>
              </div>

              {/* Card 4: Redis In-Memory State */}
              <div className="bg-kumo-surface border border-kumo-border rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span className="uppercase font-semibold tracking-wider">Redis Live State (26379)</span>
                  <Database className="w-4 h-4 text-kumo-purple" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-black text-white">{telemetry?.redis_keys_count ?? 28}</span>
                  <span className="text-xs text-slate-400 font-mono">Keys ({telemetry?.redis_memory_used_mb ?? 3.4} MB)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">TTL 24h match state hashes</p>
              </div>
            </div>

            {/* Quota Usage Meters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ESPN API Quota */}
              <div className="bg-kumo-surface border border-kumo-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      ESPN Unofficial API (Free Plan / Fallback Tier)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Used for base scoreboards, timelines & schedules</p>
                  </div>
                  <span className="font-mono text-xs text-slate-300">
                    {telemetry?.espn_quota_used ?? 412} / {telemetry?.espn_quota_limit ?? 10000} reqs
                  </span>
                </div>
                <div className="w-full h-2.5 bg-kumo-card rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '4.1%' }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 font-mono">
                  <span>Polling Frequency: Every 5s</span>
                  <span>Health: Operational (100%)</span>
                </div>
              </div>

              {/* The Odds API Quota */}
              <div className="bg-kumo-surface border border-kumo-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-kumo-orange"></span>
                      The Odds API (Pro Tier Feeds)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Live bookmaker lines, consensus & spreads</p>
                  </div>
                  <span className="font-mono text-xs text-kumo-orange font-bold">
                    {telemetry?.odds_api_quota_used ?? 15} / {telemetry?.odds_api_quota_limit ?? 500} reqs
                  </span>
                </div>
                <div className="w-full h-2.5 bg-kumo-card rounded-full overflow-hidden">
                  <div className="bg-kumo-orange h-full rounded-full" style={{ width: '3%' }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 font-mono">
                  <span>Polling Frequency: Every 10s</span>
                  <span>Header: x-requests-remaining: 485</span>
                </div>
              </div>
            </div>

            {/* Live WebSocket Sessions Table */}
            <div className="bg-kumo-surface border border-kumo-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 pb-3 flex items-center justify-between border-b border-kumo-border/40">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Radio className="w-4 h-4 text-kumo-cyan" /> Connected WebSocket Client Inspector
                </h3>
                <span className="text-xs font-mono text-slate-400">{clients.length} Total Sessions</span>
              </div>

              {clients.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 font-mono">
                  Connecting to WebSocket hub on port 18443...
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left font-mono">
                      <thead>
                        <tr className="border-b border-kumo-border text-slate-400 text-[10px] uppercase bg-kumo-card/30">
                          <th className="py-2.5 px-4">Client Remote IP</th>
                          <th className="py-2.5 px-4">Connected Since</th>
                          <th className="py-2.5 px-4">Subscribed Rooms</th>
                          <th className="py-2.5 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-kumo-border/50">
                        {paginatedClients.map((c, i) => (
                          <tr key={i} className="hover:bg-kumo-hover/50 transition-colors">
                            <td className="py-2.5 px-4 text-white font-bold">{c.ip}</td>
                            <td className="py-2.5 px-4 text-slate-400">
                              {new Date(c.connected_at).toLocaleTimeString()}
                            </td>
                            <td className="py-2.5 px-4 text-kumo-cyan">
                              {c.topics?.join(', ') || 'all_live'}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <span className="bg-kumo-emerald/20 text-kumo-emerald px-2 py-0.5 rounded text-[10px] font-bold">
                                STREAMING
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    currentPage={clientsPage}
                    totalItems={clients.length}
                    pageSize={clientsPageSize}
                    onPageChange={setClientsPage}
                    onPageSizeChange={(sz) => {
                      setClientsPageSize(sz);
                      setClientsPage(1);
                    }}
                    itemLabel="client sessions"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE MATCH ORCHESTRATOR */}
        {activeTab === 'orchestrator' && (
          <div className="space-y-6">
            <div className="bg-kumo-surface border border-kumo-border rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-kumo-orange" /> Real-Time Match Control Panel
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Override scores, periods, or trigger simulated goals. Changes broadcast immediately through Redis to all active clients.
                  </p>
                </div>

                {/* Match Search Input */}
                <div className="relative min-w-[280px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={matchSearchQuery}
                    onChange={(e) => setMatchSearchQuery(e.target.value)}
                    placeholder="Filter by team, sport, or league..."
                    className="w-full bg-kumo-card border border-kumo-border focus:border-kumo-orange rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-kumo-border text-slate-400 text-[10px] uppercase font-mono">
                      <th className="py-3 px-3">Match Fixture</th>
                      <th className="py-3 px-3">Sport / League</th>
                      <th className="py-3 px-3 text-center">Live Score</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Quick Adjust</th>
                      <th className="py-3 px-3 text-right">Simulate Live Goal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-kumo-border/50">
                    {paginatedMatches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 font-mono text-xs">
                          No matches found matching filter &quot;{matchSearchQuery}&quot;
                        </td>
                      </tr>
                    ) : (
                      paginatedMatches.map((m) => (
                        <tr key={m.id} className="hover:bg-kumo-hover/50 transition-colors">
                          <td className="py-3 px-3 font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <span>{m.home_team.name}</span>
                              <span className="text-slate-500 font-mono">vs</span>
                              <span>{m.away_team.name}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                            {m.league.name} ({m.sport})
                          </td>

                          <td className="py-3 px-3 text-center font-mono text-base font-black text-white">
                            {m.home_score} - {m.away_score}
                          </td>

                          <td className="py-3 px-3 text-center font-mono">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                m.status === 'LIVE'
                                  ? 'bg-kumo-emerald/20 text-kumo-emerald border border-kumo-emerald/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {m.status} ({m.minute}&apos;)
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 font-mono">
                              <button
                                onClick={() => handleOverride(m, 1, 0)}
                                className="bg-kumo-card hover:bg-kumo-border border border-kumo-border text-white px-2 py-1 rounded text-xs transition-colors cursor-pointer"
                                title="Add Home Goal"
                              >
                                +1 H
                              </button>
                              <button
                                onClick={() => handleOverride(m, 0, 1)}
                                className="bg-kumo-card hover:bg-kumo-border border border-kumo-border text-white px-2 py-1 rounded text-xs transition-colors cursor-pointer"
                                title="Add Away Goal"
                              >
                                +1 A
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => triggerGoal(m.id, 'HOME')}
                                className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-kumo-emerald px-2.5 py-1 rounded text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1"
                              >
                                <Play className="w-3 h-3" /> Home Goal
                              </button>
                              <button
                                onClick={() => triggerGoal(m.id, 'AWAY')}
                                className="bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-kumo-cyan px-2.5 py-1 rounded text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1"
                              >
                                <Play className="w-3 h-3" /> Away Goal
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={matchesPage}
                totalItems={filteredMatches.length}
                pageSize={matchesPageSize}
                onPageChange={setMatchesPage}
                onPageSizeChange={(sz) => {
                  setMatchesPageSize(sz);
                  setMatchesPage(1);
                }}
                itemLabel="matches"
                pageSizeOptions={[4, 6, 10, 20]}
              />
            </div>
          </div>
        )}

        {/* TAB 3: FINANCIAL & SUBSCRIPTIONS HUB */}
        {activeTab === 'financials' && (
          <div className="space-y-6">
            {/* Revenue KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-kumo-surface border border-kumo-border rounded-xl p-4">
                <span className="text-slate-400 text-xs uppercase font-semibold">Total Revenue (USD)</span>
                <p className="text-3xl font-black font-mono text-white mt-1">
                  ${financials?.total_revenue_usd?.toLocaleString() ?? '4,820.00'}
                </p>
                <span className="text-[11px] text-kumo-emerald font-mono">Combined Gateways</span>
              </div>

              <div className="bg-kumo-surface border border-kumo-border rounded-xl p-4">
                <span className="text-slate-400 text-xs uppercase font-semibold">Monthly Recurring (MRR)</span>
                <p className="text-3xl font-black font-mono text-kumo-emerald mt-1">
                  ${financials?.mrr_usd?.toLocaleString() ?? '3,480.00'}
                </p>
                <span className="text-[11px] text-slate-400 font-mono">
                  {financials?.active_pro_users ?? 120} Active Pro Subscriptions
                </span>
              </div>

              <div className="bg-kumo-surface border border-kumo-border rounded-xl p-4">
                <span className="text-slate-400 text-xs uppercase font-semibold">Flutterwave API v3 Volume</span>
                <p className="text-3xl font-black font-mono text-kumo-cyan mt-1">
                  ${financials?.flutterwave_volume_usd?.toLocaleString() ?? '2,650.00'}
                </p>
                <span className="text-[11px] text-slate-400 font-mono">Cards / Bank / USSD</span>
              </div>

              <div className="bg-kumo-surface border border-kumo-border rounded-xl p-4">
                <span className="text-slate-400 text-xs uppercase font-semibold">Cryptomus Gateway Volume</span>
                <p className="text-3xl font-black font-mono text-kumo-orange mt-1">
                  ${financials?.cryptomus_volume_usd?.toLocaleString() ?? '2,170.00'}
                </p>
                <span className="text-[11px] text-slate-400 font-mono">USDT / BTC / ETH / TON</span>
              </div>
            </div>

            {/* Webhook Logs Table */}
            <div className="bg-kumo-surface border border-kumo-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 pb-3 flex items-center justify-between border-b border-kumo-border/40">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-kumo-orange" /> Recent Payment Webhook Logs & Signatures
                </h3>
                <span className="text-xs font-mono text-slate-400">{webhooks.length} Total Events</span>
              </div>

              {webhooks.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 font-mono">
                  No webhook events received yet. Sandbox ready on /api/v1/payments/*
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left font-mono">
                      <thead>
                        <tr className="border-b border-kumo-border text-slate-400 text-[10px] uppercase bg-kumo-card/30">
                          <th className="py-2.5 px-4">Gateway</th>
                          <th className="py-2.5 px-4">Event</th>
                          <th className="py-2.5 px-4">Signature Verification</th>
                          <th className="py-2.5 px-4">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-kumo-border/50">
                        {paginatedWebhooks.map((wh) => (
                          <tr key={wh.id} className="hover:bg-kumo-hover/50 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-white uppercase">{wh.gateway}</td>
                            <td className="py-2.5 px-4 text-slate-300">{wh.event}</td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  wh.verified ? 'bg-kumo-emerald/20 text-kumo-emerald' : 'bg-amber-500/20 text-amber-400'
                                }`}
                              >
                                {wh.verified ? 'VERIFIED (PASS)' : 'SANDBOX UNVERIFIED'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-400">
                              {new Date(wh.created_at).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    currentPage={webhooksPage}
                    totalItems={webhooks.length}
                    pageSize={webhooksPageSize}
                    onPageChange={setWebhooksPage}
                    onPageSizeChange={(sz) => {
                      setWebhooksPageSize(sz);
                      setWebhooksPage(1);
                    }}
                    itemLabel="webhook events"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: BET SLIP PARSER HEALTH */}
        {activeTab === 'parser' && (
          <div className="space-y-6">
            {/* Parser KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-kumo-surface border border-kumo-border rounded-xl p-4">
                <span className="text-slate-400 text-xs uppercase font-semibold">Total Slips Decoded</span>
                <p className="text-3xl font-black font-mono text-white mt-1">
                  {parserMetrics?.total_parsed ?? 384}
                </p>
                <span className="text-[11px] text-kumo-emerald font-mono">98.4% Success Rate</span>
              </div>

              <div className="bg-kumo-surface border border-kumo-border rounded-xl p-4">
                <span className="text-slate-400 text-xs uppercase font-semibold">Supported Bookmakers</span>
                <div className="flex items-center gap-2 mt-2 font-mono text-xs text-slate-300">
                  <span className="bg-kumo-card px-2 py-0.5 rounded border border-kumo-border">SportyBet</span>
                  <span className="bg-kumo-card px-2 py-0.5 rounded border border-kumo-border">Bet9ja</span>
                  <span className="bg-kumo-card px-2 py-0.5 rounded border border-kumo-border">1xBet</span>
                  <span className="bg-kumo-card px-2 py-0.5 rounded border border-kumo-border">BetKing</span>
                </div>
              </div>

              <div className="bg-kumo-surface border border-kumo-border rounded-xl p-4">
                <span className="text-slate-400 text-xs uppercase font-semibold">Dynamic Cashout Engine</span>
                <p className="text-3xl font-black font-mono text-kumo-emerald mt-1">Poisson Decayed</p>
                <span className="text-[11px] text-slate-400 font-mono">Real-time match fulfillment tracking</span>
              </div>
            </div>

            {/* Interactive Parser Sandbox */}
            <div className="bg-kumo-surface border border-kumo-border rounded-xl p-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-kumo-orange" /> Interactive Booking Code Decode Sandbox
              </h3>

              <div className="flex items-center gap-3 mb-4">
                <input
                  type="text"
                  value={testBookingCode}
                  onChange={(e) => setTestBookingCode(e.target.value)}
                  placeholder="e.g. BC99214, B9JA-44912, 1X-88231, BK-10294"
                  className="flex-1 bg-kumo-card border border-kumo-border focus:border-kumo-orange rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none"
                />
                <button
                  onClick={handleTestParser}
                  className="bg-kumo-orange hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Test Decode & Match
                </button>
              </div>

              {testResult && (
                testResult.error ? (
                  <div className="bg-rose-950/80 border border-rose-700 text-rose-300 rounded-xl p-3 text-xs font-mono">
                    ⚠️ {testResult.error}
                  </div>
                ) : (
                <div className="bg-kumo-card border border-kumo-border rounded-xl p-4 font-mono text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-kumo-border pb-2">
                    <span className="text-kumo-emerald font-bold">
                      Bookmaker: {testResult.bookmaker} • Total Odds: {testResult.total_odds}x
                    </span>
                    <span className="text-slate-400">
                      Potential Return: ${testResult.potential_win?.toFixed(2)} • Cashout Offer: ${testResult.current_cashout?.toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <p className="text-slate-400 mb-1">Decoded Legs ({testResult.legs?.length}):</p>
                    <ul className="space-y-1 pl-2 text-slate-300">
                      {testResult.legs?.map((leg: any, idx: number) => (
                        <li key={idx} className="flex items-center justify-between">
                          <span>
                            {leg.match?.home_team?.name} vs {leg.match?.away_team?.name} [{leg.selection}]
                          </span>
                          <span className="text-kumo-emerald font-bold">
                            {leg.odds} • {leg.status} ({leg.current_score})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                )
              )}
            </div>
          </div>
        )}

        {/* TAB 5: Support Helpdesk Queue */}
        {activeTab === 'support' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-kumo-surface border border-kumo-border p-4 rounded-xl">
                <p className="text-xs text-slate-400 font-mono">Total Inquiries</p>
                <p className="text-2xl font-black text-white font-mono mt-1">{supportTickets.length}</p>
              </div>
              <div className="bg-kumo-surface border border-kumo-border p-4 rounded-xl">
                <p className="text-xs text-amber-400 font-mono">Open / Pending</p>
                <p className="text-2xl font-black text-amber-400 font-mono mt-1">
                  {supportTickets.filter((t) => t.status === 'open').length}
                </p>
              </div>
              <div className="bg-kumo-surface border border-kumo-border p-4 rounded-xl">
                <p className="text-xs text-cyan-400 font-mono">In Progress</p>
                <p className="text-2xl font-black text-cyan-400 font-mono mt-1">
                  {supportTickets.filter((t) => t.status === 'in_progress').length}
                </p>
              </div>
              <div className="bg-kumo-surface border border-kumo-border p-4 rounded-xl">
                <p className="text-xs text-kumo-emerald font-mono">Resolved</p>
                <p className="text-2xl font-black text-kumo-emerald font-mono mt-1">
                  {supportTickets.filter((t) => t.status === 'resolved').length}
                </p>
              </div>
            </div>

            {/* Inquiries & Conversation Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-kumo-surface border border-kumo-border rounded-xl overflow-hidden h-[600px]">
              {/* Left Column: Tickets Queue */}
              <div className="lg:col-span-5 border-r border-kumo-border flex flex-col h-full overflow-hidden bg-kumo-card/30">
                <div className="p-3.5 border-b border-kumo-border bg-kumo-surface flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-kumo-orange" /> Inquiries Queue ({supportTickets.length})
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">Live Sync 4s</span>
                </div>

                {/* Ticket Filter Search Bar */}
                <div className="p-2.5 border-b border-kumo-border bg-kumo-card/20">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
                    <input
                      type="text"
                      value={ticketSearchQuery}
                      onChange={(e) => {
                        setTicketSearchQuery(e.target.value);
                        setTicketsPage(1);
                      }}
                      placeholder="Filter by subject, user, category..."
                      className="w-full bg-kumo-card border border-kumo-border focus:border-kumo-orange rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {paginatedTickets.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 font-mono text-xs">
                      No support tickets found.
                    </div>
                  ) : (
                    paginatedTickets.map((ticket) => {
                      const isSelected = selectedTicket?.id === ticket.id;
                      const priorityColor =
                        ticket.priority === 'urgent'
                          ? 'text-rose-400 bg-rose-950/80 border-rose-600'
                          : ticket.priority === 'high'
                          ? 'text-amber-400 bg-amber-950/80 border-amber-600'
                          : 'text-slate-300 bg-slate-800 border-slate-700';

                      return (
                        <button
                          key={ticket.id}
                          onClick={() => setSelectedTicket(ticket)}
                          className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-kumo-card border-kumo-orange text-white ring-1 ring-kumo-orange/40 shadow-lg'
                              : 'bg-kumo-card/50 border-kumo-border hover:bg-kumo-card text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${priorityColor}`}>
                              {ticket.priority}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                              {ticket.status}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-white truncate">{ticket.subject}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                            <span>{ticket.user_name} ({ticket.category})</span>
                            <span>{new Date(ticket.updated_at || ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <Pagination
                  currentPage={ticketsPage}
                  totalItems={filteredTickets.length}
                  pageSize={ticketsPageSize}
                  onPageChange={setTicketsPage}
                  onPageSizeChange={(sz) => {
                    setTicketsPageSize(sz);
                    setTicketsPage(1);
                  }}
                  itemLabel="inquiries"
                  pageSizeOptions={[3, 5, 8]}
                />
              </div>

              {/* Right Column: Chat & Agent Reply */}
              <div className="lg:col-span-7 flex flex-col h-full bg-[#080A0F] overflow-hidden">
                {selectedTicket ? (
                  <>
                    <div className="p-3.5 border-b border-kumo-border bg-kumo-surface flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <h4 className="text-xs font-bold text-white truncate">{selectedTicket.subject}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">
                          User: <strong className="text-white">{selectedTicket.user_name}</strong> ({selectedTicket.user_email}) • ID: {selectedTicket.id}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-kumo-orange bg-kumo-orange/10 px-2 py-1 rounded border border-kumo-orange/30 shrink-0">
                        {selectedTicket.category}
                      </span>
                    </div>

                    {/* Messages Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {selectedTicket.messages?.map((msg: any, i: number) => {
                        const isAgent = msg.sender === 'agent';
                        return (
                          <div
                            key={i}
                            className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                          >
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 font-mono">
                              <span>{msg.sender_name || (isAgent ? 'Sarah (Admin)' : 'Customer')}</span>
                              <span>•</span>
                              <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div
                              className={`p-3 rounded-xl max-w-md text-xs leading-relaxed ${
                                isAgent
                                  ? 'bg-kumo-orange text-white rounded-br-none font-medium'
                                  : 'bg-kumo-card border border-kumo-border text-slate-200 rounded-bl-none'
                              }`}
                            >
                              {msg.message}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Agent Reply Form */}
                    <form onSubmit={handleAgentReply} className="p-3 border-t border-kumo-border bg-kumo-surface flex items-center gap-2">
                      <input
                        type="text"
                        value={agentReplyText}
                        onChange={(e) => setAgentReplyText(e.target.value)}
                        placeholder="Type an official admin response to the customer..."
                        className="flex-1 bg-kumo-card border border-kumo-border focus:border-kumo-orange rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!agentReplyText.trim()}
                        className="bg-kumo-orange hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Reply</span>
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono text-xs">
                    <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                    <p>Select a customer support inquiry from the queue</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
