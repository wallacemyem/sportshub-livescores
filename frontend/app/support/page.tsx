'use client';

import { useState, useEffect, useMemo } from 'react';
import { SupportTicket } from '@/types';
import {
  Headphones,
  Send,
  MessageSquare,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  LifeBuoy,
  Search,
  X,
  Sparkles,
  Clock,
  ShieldCheck,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Check,
  Activity,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { MobileNav } from '@/components/ui/MobileNav';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { getApiBaseUrl } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface FAQItem {
  id: string;
  category: 'betting' | 'features' | 'billing' | 'technical';
  categoryLabel: string;
  q: string;
  a: string;
  tags: string[];
}

const FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'betting',
    categoryLabel: 'Betting & Odds',
    q: 'How does the Multi-Bookmaker Auto-Looping Bet Slip Resolver work?',
    a: 'Paste any booking code (for example BC99214, B9JA-44912, 1X-88231 or BK-10294) and SlipRadar checks SportyBet, Bet9ja, 1xBet and BetKing until it finds the slip. It then reads out the legs, matches each one to its live fixture, and starts tracking — you never have to say which sportsbook it came from.',
    tags: ['SportyBet', 'Bet9ja', '1xBet', 'BetKing', 'Booking Code', 'Live Odds'],
  },
  {
    id: 'faq-2',
    category: 'features',
    categoryLabel: 'Features & Tracker',
    q: 'How do I activate the Picture-in-Picture (PiP) floating scoreboard?',
    a: 'Click the "Pop Out" button on any live fixture or the top scoreboard header. If your browser supports Document PiP (Chrome, Edge, Opera), an always-on-top native desktop window pops up over all other apps. On mobile and Firefox, an in-app floating scoreboard opens automatically.',
    tags: ['PiP', 'Floating Scoreboard', 'Pop Out', 'Multitasking'],
  },
  {
    id: 'faq-3',
    category: 'features',
    categoryLabel: 'Features & Tracker',
    q: 'How do the 2D Pitch & Multi-Sport Court Visualizers work?',
    a: 'Each individual match page features sport-specific 2D visual coordinate tracking: full soccer pitches with attacking vectors, basketball courts with 3-point lines, tennis courts, NFL gridirons with yard markers, baseball diamonds, and golf courses with player headshots and fairways. If real-time GPS coordinates are unavailable, a live radar status overlay is shown.',
    tags: ['2D Pitch', 'Basketball Court', 'Tennis', 'NFL', 'Baseball', 'Golf'],
  },
  {
    id: 'faq-4',
    category: 'billing',
    categoryLabel: 'VIP & Billing',
    q: 'How do I upgrade to Pro with Cryptocurrency (USDT, BTC, ETH, SOL) or Card?',
    a: 'Open the pricing page, pick a plan, and choose card, bank transfer or crypto at checkout. Crypto payments confirm on-chain in about a minute, and your plan activates as soon as they do.',
    tags: ['PRO', 'Crypto', 'USDT', 'Bitcoin', 'Payment', 'Billing'],
  },
  {
    id: 'faq-5',
    category: 'features',
    categoryLabel: 'Features & Tracker',
    q: 'How do I stream live scores to my phone lock screen?',
    a: 'Our web app integrates HTML5 Media Session API. When you view any live match, lock your phone or switch apps; your OS notification center and lock screen will display live scores, goal alerts, and the match clock in real-time.',
    tags: ['Lock Screen', 'Media Session', 'Push Notifications', 'Mobile'],
  },
  {
    id: 'faq-6',
    category: 'technical',
    categoryLabel: 'Technical & Data',
    q: 'Live scores look delayed. What should I check?',
    a: 'SlipRadar keeps a persistent live connection, and falls back to refreshing every few seconds if your network or firewall blocks it. If scores feel behind, reload the page and check whether an ad blocker or VPN is interrupting the connection — that restores instant updates in most cases.',
    tags: ['WebSocket', 'Latency', 'Realtime', 'Data Delay', 'Troubleshooting'],
  },
  {
    id: 'faq-7',
    category: 'betting',
    categoryLabel: 'Betting & Odds',
    q: 'How frequently are sportsbook odds refreshed?',
    a: 'Odds are streamed live from leading bookmakers and updated every few seconds during active fixtures. Odds margins, market consensus, and bookmaker price comparisons highlight real-time fluctuations as soon as they shift.',
    tags: ['Odds', 'Consensus', 'Bookmakers', 'Margins', 'Live Shifts'],
  },
];

const TOPIC_CHIPS = [
  { id: 'all', label: 'All Topics' },
  { id: 'betting', label: 'Betting & Odds' },
  { id: 'features', label: 'Features & 2D Tracker' },
  { id: 'billing', label: 'Plans & billing' },
  { id: 'technical', label: 'Technical Support' },
];

const DEPARTMENTS = [
  'Live Stream & Scores',
  'VIP & Pro Billing',
  'Odds & Bet Tracking',
  'Data Delay / Bug Report',
  'General Inquiry',
];

export default function SupportPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'faqs' | 'ticket' | 'inquiries'>('faqs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');
  const [helpfulFeedback, setHelpfulFeedback] = useState<Record<string, 'yes' | 'no'>>({});

  // Ticket Management
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // New ticket state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(DEPARTMENTS[0]);
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');
  const [message, setMessage] = useState('');
  const [ticketCreatedSuccess, setTicketCreatedSuccess] = useState(false);

  // Fetch tickets
  useEffect(() => {
    async function fetchTickets() {
      try {
        const apiBase = getApiBaseUrl();
        const res = await fetch(`${apiBase}/support/tickets`);
        if (res.ok) {
          const data = await res.json();
          setTickets(data.tickets || []);
          if (data.tickets && data.tickets.length > 0 && !selectedTicket) {
            setSelectedTicket(data.tickets[0]);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchTickets();
  }, [selectedTicket]);

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return FAQS.filter((faq) => {
      const matchesTopic = selectedTopic === 'all' || faq.category === selectedTopic;
      if (!matchesTopic) return false;
      if (!q) return true;
      return (
        faq.q.toLowerCase().includes(q) ||
        faq.a.toLowerCase().includes(q) ||
        faq.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, selectedTopic]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || 'usr_guest',
          user_name: user?.name || 'Customer',
          user_email: user?.email || 'customer@slipradar.com',
          subject,
          category,
          priority,
          message,
        }),
      });

      if (res.ok) {
        const newTicket: SupportTicket = await res.json();
        setTickets([newTicket, ...tickets]);
        setSelectedTicket(newTicket);
        setSubject('');
        setMessage('');
        setTicketCreatedSuccess(true);
        setActiveTab('inquiries');

        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'],
        });

        setTimeout(() => setTicketCreatedSuccess(false), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    const text = replyText.trim();
    setReplyText('');

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'user',
          sender_name: user?.name || 'Customer',
          message: text,
        }),
      });

      if (res.ok) {
        const updated: SupportTicket = await res.json();
        setSelectedTicket(updated);
        setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFeedback = (id: string, rating: 'yes' | 'no') => {
    setHelpfulFeedback((prev) => ({ ...prev, [id]: rating }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-24 md:pb-12">
      {/* Header */}
      <AppPageHeader
        icon={Headphones}
        title="Support"
        subtitle="Answers, guides and a direct line to the team"
        accentClassName="bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
        actions={
          <span className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 lg:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span>Desk open</span>
          </span>
        }
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 md:pl-24 xl:px-6 py-6 space-y-6">
        {/* Search Hero */}
        <div className="bg-surface border border-surface-border rounded-2xl p-6 sm:p-8 shadow-sm text-center relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl mx-auto relative z-10 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Knowledge base and support queue</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              How can we help?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
              Answers on booking codes, live tracking, the pop-out scoreboard, plans and billing.
            </p>

            {/* Clean Search Input */}
            <div className="relative max-w-lg mx-auto pt-2">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search help, e.g. booking codes, cash-out, billing..."
                className="w-full pl-10 pr-10 py-2.5 bg-surface-subtle border border-surface-border focus:border-blue-500 focus:bg-surface rounded-xl text-xs sm:text-sm text-foreground focus:outline-none shadow-sm transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Segmented navigation tabs.
            The three labels are wider than a phone viewport, so the strip scrolls
            inside itself instead of squeezing the buttons into each other. */}
        <div className="flex flex-col gap-3 border-b border-surface-border pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-1 overflow-x-auto scrollbar-none px-1">
            <div className="flex w-max items-center gap-1.5 rounded-xl border border-surface-border bg-surface-subtle p-1">
              {([
                { id: 'faqs', label: 'Knowledge base', icon: HelpCircle, iconClass: 'text-blue-500' },
                { id: 'ticket', label: 'Submit ticket', icon: Plus, iconClass: 'text-emerald-500' },
                {
                  id: 'inquiries',
                  label: 'My inquiries',
                  icon: MessageSquare,
                  iconClass: 'text-violet-500',
                  count: tickets.length,
                },
              ] as const).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? 'border border-surface-border bg-surface font-bold text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${tab.iconClass}`} />
                    <span>{tab.label}</span>
                    {'count' in tab && tab.count > 0 && (
                      <span className="rounded-full bg-blue-600 px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-white">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Avg response: &lt; 3 mins</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: KNOWLEDGE BASE & FAQS                                              */}
        {/* ========================================================================= */}
        {activeTab === 'faqs' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Topic Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {TOPIC_CHIPS.map((chip) => {
                const isSelected = selectedTopic === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => setSelectedTopic(chip.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-sm shadow-blue-500/20'
                        : 'bg-surface border-surface-border text-muted-foreground hover:text-foreground hover:bg-surface-subtle'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* FAQs Accordion List */}
            {filteredFaqs.length > 0 ? (
              <div className="space-y-3">
                {filteredFaqs.map((faq) => {
                  const isOpen = openFaqId === faq.id;
                  const feedback = helpfulFeedback[faq.id];

                  return (
                    <div
                      key={faq.id}
                      className={`border rounded-2xl transition-all duration-200 bg-surface ${
                        isOpen
                          ? 'border-blue-500/40 shadow-sm'
                          : 'border-surface-border hover:border-surface-border/80'
                      }`}
                    >
                      <button
                        onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                        className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-4 cursor-pointer"
                      >
                        <div className="space-y-1.5 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-500/20">
                              {faq.categoryLabel}
                            </span>
                          </div>
                          <h3 className="text-xs sm:text-sm font-bold text-foreground">
                            {faq.q}
                          </h3>
                        </div>
                        <div className="p-1 rounded-lg bg-surface-subtle text-muted-foreground shrink-0 mt-0.5">
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-4 sm:px-5 pb-5 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-surface-border/60 space-y-4">
                          <p>{faq.a}</p>

                          {/* Related Tags */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-mono text-muted-foreground">Tags:</span>
                            {faq.tags.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] bg-surface-subtle border border-surface-border text-muted-foreground px-2 py-0.5 rounded-md"
                              >
                                {t}
                              </span>
                            ))}
                          </div>

                          {/* Feedback Action */}
                          <div className="flex items-center justify-between pt-2 border-t border-surface-border/40 text-[11px]">
                            <span className="text-muted-foreground">Was this solution helpful?</span>
                            <div className="flex items-center gap-2">
                              {feedback ? (
                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                                  <Check className="w-3.5 h-3.5" />
                                  Thanks for your feedback!
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleFeedback(faq.id, 'yes')}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-surface-border hover:bg-surface-subtle text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  >
                                    <ThumbsUp className="w-3 h-3" />
                                    <span>Yes</span>
                                  </button>
                                  <button
                                    onClick={() => handleFeedback(faq.id, 'no')}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-surface-border hover:bg-surface-subtle text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  >
                                    <ThumbsDown className="w-3 h-3" />
                                    <span>No</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-surface border border-surface-border rounded-2xl p-8 text-center space-y-3">
                <HelpCircle className="w-8 h-8 text-muted-foreground mx-auto opacity-40" />
                <h4 className="text-sm font-bold text-foreground">No matches found</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  We couldn&apos;t find an existing article matching &ldquo;{searchQuery}&rdquo;. You can submit a direct inquiry to our 24/7 technical desk.
                </p>
                <button
                  onClick={() => {
                    setSubject(searchQuery);
                    setActiveTab('ticket');
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Open Ticket for &ldquo;{searchQuery}&rdquo;</span>
                </button>
              </div>
            )}

            {/* Bottom Help Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-surface border border-surface-border rounded-2xl p-4 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-foreground">Dedicated Helpdesk</h4>
                <p className="text-[11px] text-muted-foreground">
                  Need personalized troubleshooting? Open a ticket to connect directly with on-duty engineers.
                </p>
                <button
                  onClick={() => setActiveTab('ticket')}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 pt-1 cursor-pointer"
                >
                  <span>Submit Inquiry</span>
                  <span>&rarr;</span>
                </button>
              </div>

              <div className="bg-surface border border-surface-border rounded-2xl p-4 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-foreground">System Status</h4>
                <p className="text-[11px] text-muted-foreground">
                  Live score delivery, odds updates and booking-code lookups, all reporting healthy.
                </p>
                <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>All Systems Normal</span>
                </div>
              </div>

              <div className="bg-surface border border-surface-border rounded-2xl p-4 space-y-2">
                <div className="w-7 h-7 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-foreground">Pro priority queue</h4>
                <p className="text-[11px] text-muted-foreground">
                  Pro subscribers enjoy expedited sub-minute response times and direct ticket escalations.
                </p>
                <Link
                  href="/pricing"
                  className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1 pt-1"
                >
                  <span>See plans</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SUBMIT A TICKET                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'ticket' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
            {/* Left Form */}
            <div className="lg:col-span-8 bg-surface border border-surface-border rounded-2xl p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-base font-bold text-foreground">Submit a Support Ticket</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Provide details about your query and our team will respond within minutes.
                </p>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5">
                      Department
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-surface-subtle border border-surface-border focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                    >
                      {DEPARTMENTS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5">
                      Priority Level
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full bg-surface-subtle border border-surface-border focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                    >
                      <option value="urgent">Urgent (Live Match in Progress)</option>
                      <option value="high">High (Billing / Account Issue)</option>
                      <option value="medium">Medium (General Query)</option>
                      <option value="low">Low (Feedback / Feature Request)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Subject Summary
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Booking code BC99214 fixture sync inquiry"
                    className="w-full bg-surface-subtle border border-surface-border focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Message Details
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    placeholder="Please include details like booking codes, match IDs, or transaction references to help us assist you faster..."
                    className="w-full bg-surface-subtle border border-surface-border focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || !subject.trim() || !message.trim()}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isLoading ? 'Submitting Inquiry...' : 'Submit Support Ticket'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Guide Card */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Tips for Faster Resolution</span>
                </div>

                <ul className="space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span>For bet slips, include the exact booking code and bookmaker name.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span>For billing issues, include your transaction hash or the email on the account.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span>Inquiries are automatically routed to our 24/7 technical desk.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl p-5 space-y-2">
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>Average Reply Time</span>
                </div>
                <p className="text-2xl font-black text-foreground font-mono">&lt; 3 minutes</p>
                <p className="text-[11px] text-muted-foreground">
                  You will receive real-time message updates directly inside the My Inquiries tab.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MY INQUIRIES & LIVE CHAT                                           */}
        {/* ========================================================================= */}
        {activeTab === 'inquiries' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {ticketCreatedSuccess && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span className="font-medium">Ticket submitted successfully! An agent has been assigned to your case.</span>
              </div>
            )}

            {tickets.length === 0 ? (
              <div className="bg-surface border border-surface-border rounded-2xl p-12 text-center space-y-4">
                <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto opacity-30" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">No active support tickets</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    You haven&apos;t opened any tickets yet. Need a hand with a slip, live scores or billing?
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('ticket')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Open Your First Ticket</span>
                </button>
              </div>
            ) : (
              <div className="bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
                {/* Left Ticket List Sidebar */}
                <div className="md:col-span-4 border-r border-surface-border bg-surface-subtle/40 p-3 space-y-2 overflow-y-auto max-h-56 md:max-h-[560px]">
                  <div className="flex items-center justify-between px-1 pt-1 pb-2">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Your Inquiries ({tickets.length})
                    </span>
                    <button
                      onClick={() => setActiveTab('ticket')}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New</span>
                    </button>
                  </div>

                  {tickets.map((t) => {
                    const isSelected = selectedTicket?.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                          isSelected
                            ? 'bg-surface border-blue-500 text-foreground shadow-sm'
                            : 'bg-surface/50 border-surface-border hover:bg-surface text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono font-bold uppercase text-blue-600 dark:text-blue-400 truncate">
                            {t.category}
                          </span>
                          <span className="text-[9px] font-mono text-muted-foreground bg-surface-subtle px-1.5 py-0.5 rounded border border-surface-border">
                            {t.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-foreground truncate">{t.subject}</p>
                        <div className="text-[10px] text-muted-foreground flex items-center justify-between font-mono pt-0.5">
                          <span>#{t.id.slice(-6)}</span>
                          <span>{new Date(t.created_at).toLocaleDateString()}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right Chat Thread */}
                <div className="md:col-span-8 flex flex-col h-full bg-surface overflow-hidden">
                  {selectedTicket ? (
                    <>
                      {/* Ticket Thread Header */}
                      <div className="p-4 border-b border-surface-border bg-surface-subtle flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                            {selectedTicket.subject}
                          </h4>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            Ticket #{selectedTicket.id} &bull; Priority:{' '}
                            <span className="uppercase font-bold text-blue-600 dark:text-blue-400">
                              {selectedTicket.priority}
                            </span>
                          </p>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-500/30 shrink-0">
                          {selectedTicket.status.toUpperCase()}
                        </span>
                      </div>

                      {/* Messages Scroll Area */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
                        {selectedTicket.messages?.map((msg, idx) => {
                          const isUser = msg.sender === 'user';
                          return (
                            <div
                              key={idx}
                              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                            >
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1 font-mono">
                                <span>{msg.sender_name || (isUser ? 'You' : 'Support Desk')}</span>
                                <span>&bull;</span>
                                <span>
                                  {new Date(msg.created_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <div
                                className={`p-3 rounded-2xl max-w-md text-xs leading-relaxed ${
                                  isUser
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

                      {/* Reply Form */}
                      <form
                        onSubmit={handleSendReply}
                        className="p-3 border-t border-surface-border bg-surface-subtle flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your response to the support agent..."
                          className="flex-1 bg-surface border border-surface-border focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!replyText.trim()}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold p-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2">
                      <MessageSquare className="w-8 h-8 opacity-30" />
                      <p className="text-xs">Select a ticket from the left to view the message history.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Navigation */}
      <MobileNav activeNav="support" />
    </div>
  );
}
