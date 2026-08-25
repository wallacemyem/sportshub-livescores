'use client';

import { useState, useEffect } from 'react';
import { SupportTicket, SupportTicketMessage } from '@/types';
import {
  Headphones,
  Send,
  MessageSquare,
  HelpCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  LifeBuoy,
} from 'lucide-react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { MobileNav } from '@/components/ui/MobileNav';

const FAQS = [
  {
    q: 'How does the Multi-Bookmaker Auto-Looping Bet Slip Resolver work?',
    a: 'When you import any booking code (e.g. BC99214, B9JA-44912, 1X-88231, BK-10294), our Go backend parser automatically loops across SportyBet, Bet9ja, 1xBet, and BetKing in milliseconds. It extracts the legs, matches them with live fixtures, and computes dynamic cash-out probability. You are only notified if no bookmaker is found.',
  },
  {
    q: 'How do I activate the Picture-in-Picture (PiP) floating scoreboard?',
    a: 'Click the "Pop Out" button on any live fixture or header. If your browser supports Document PiP (Chrome/Edge/Opera), a native draggable OS window pops up that stays always-on-top over other apps. On mobile and other browsers, an in-DOM floating widget opens automatically.',
  },
  {
    q: 'How do I pay with Cryptocurrency (USDT, BTC, ETH, SOL)?',
    a: 'Click "PRO", select Cryptomus as your payment gateway, and pick your preferred crypto asset. Once the on-chain transaction receives 1 confirmation, your account upgrades to Pro automatically via signed webhooks.',
  },
  {
    q: 'How do I stream live scores to my phone lock screen?',
    a: 'Our web app integrates HTML5 Media Session API. When you view any live match, lock your phone or switch apps; your OS notification drawer and lock screen will display live scores and game clock in real-time.',
  },
];

const DEPARTMENTS = [
  'Live Stream & Scores',
  'VIP & Pro Billing',
  'Odds & Bet Tracking',
  'Data Delay / Bug Report',
  'General Inquiry',
];

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // New ticket state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(DEPARTMENTS[0]);
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');
  const [message, setMessage] = useState('');
  const [ticketCreatedSuccess, setTicketCreatedSuccess] = useState(false);

  useEffect(() => {
    async function fetchTickets() {
      try {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const res = await fetch(`http://${host}:18443/api/v1/support/tickets`);
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

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsLoading(true);
    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const res = await fetch(`http://${host}:18443/api/v1/support/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'usr_fan_01',
          user_name: 'Alex Mercer',
          user_email: 'alex.mercer@sportsfan.io',
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
        setTimeout(() => setTicketCreatedSuccess(false), 4000);

        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'],
        });
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
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const res = await fetch(`http://${host}:18443/api/v1/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'user',
          sender_name: 'Alex Mercer',
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-24 md:pb-8">
      {/* Header */}
      <header className="bg-surface/90 backdrop-blur-md border-b border-surface-border sticky top-0 z-40 px-4 lg:px-8 md:pl-20 xl:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Scores</span>
          </Link>

          <div className="h-4 w-px bg-surface-border" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-foreground tracking-tight flex items-center gap-1.5 font-mono">
                CUSTOMER SUPPORT
              </h1>
              <p className="text-[10px] text-muted-foreground">Helpdesk & Knowledge Base</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <div className="flex items-center gap-2 font-mono text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Desk Online</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 md:pl-20 xl:px-8 py-6 space-y-6">
        {/* Top Hero Banner */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-violet-50 dark:from-blue-500/5 dark:via-indigo-500/5 dark:to-violet-500/5 border border-blue-200/80 dark:border-blue-500/20 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-subtle">
          <div className="max-w-xl">
            <span className="bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-3 inline-block">
              24/7 Dedicated Response
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">
              How can we assist you today?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
              Track active support inquiries, chat with technical specialists, or browse instant solutions in our FAQ knowledge base.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-surface border border-surface-border p-3.5 rounded-xl text-center min-w-[120px] shadow-sm">
              <p className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">&lt; 3 min</p>
              <p className="text-[10px] text-muted-foreground font-mono">Avg Reply Time</p>
            </div>
            <div className="bg-surface border border-surface-border p-3.5 rounded-xl text-center min-w-[120px] shadow-sm">
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">99.8%</p>
              <p className="text-[10px] text-muted-foreground font-mono">Resolution Rate</p>
            </div>
          </div>
        </div>

        {/* 2-Column: Open Ticket / Track Tickets */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Submit New Ticket */}
          <div className="lg:col-span-5 bg-surface border border-surface-border rounded-2xl p-6 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <LifeBuoy className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-mono">
                  Submit New Inquiry
                </h3>
              </div>

              {ticketCreatedSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2 mb-4 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>Ticket opened successfully! Agent assigned.</span>
                </div>
              )}

              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1 font-mono">
                    Department
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-surface-subtle border border-surface-border focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                  >
                    {DEPARTMENTS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1 font-mono">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-surface-subtle border border-surface-border focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none font-mono"
                  >
                    <option value="urgent">Urgent (Match In Progress)</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1 font-mono">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. WebSocket score delta question"
                    className="w-full bg-surface-subtle border border-surface-border focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1 font-mono">
                    Message Details
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Provide details about your query..."
                    className="w-full bg-surface-subtle border border-surface-border focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-blue-500/20"
                >
                  {isLoading ? 'Opening Ticket...' : 'Open Support Ticket'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Active Inquiries & Live Chat Thread */}
          <div className="lg:col-span-7 bg-surface border border-surface-border rounded-2xl overflow-hidden shadow-subtle flex flex-col h-[560px]">
            {/* Header */}
            <div className="p-4 border-b border-surface-border bg-surface-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
                  Live Ticket Center
                </h3>
              </div>

              {selectedTicket && (
                <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-500/30">
                  {selectedTicket.status.toUpperCase()}
                </span>
              )}
            </div>

            {/* Inquiries Selector Bar */}
            <div className="p-2 border-b border-surface-border bg-surface-subtle flex items-center gap-2 overflow-x-auto scrollbar-none">
              {tickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm shadow-blue-500/20'
                        : 'bg-surface border-surface-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    #{t.id.slice(-6)} • {t.subject.slice(0, 20)}...
                  </button>
                );
              })}
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface">
              {selectedTicket?.messages && selectedTicket.messages.length > 0 ? (
                selectedTicket.messages.map((msg, idx) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1 font-mono">
                        <span>{msg.sender_name || (isUser ? 'You' : 'Support Desk')}</span>
                        <span>•</span>
                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`p-3 rounded-2xl max-w-md text-xs leading-relaxed ${
                          isUser
                            ? 'bg-blue-600 text-white rounded-br-none shadow-sm shadow-blue-500/20'
                            : 'bg-surface-subtle border border-surface-border text-foreground rounded-bl-none shadow-subtle'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground font-mono text-xs">
                  <Headphones className="w-8 h-8 mb-2 opacity-40 text-muted-foreground" />
                  <p>No messages in this ticket yet.</p>
                </div>
              )}
            </div>

            {/* Reply Input Bar */}
            {selectedTicket && (
              <form onSubmit={handleSendReply} className="p-3 border-t border-surface-border bg-surface-subtle flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a response to the support agent..."
                  className="flex-1 bg-surface border border-surface-border focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 rounded-lg transition-opacity disabled:opacity-40 cursor-pointer shadow-sm shadow-blue-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Knowledge Base FAQs */}
        <div className="bg-surface border border-surface-border rounded-2xl p-6 sm:p-8 space-y-4 shadow-subtle">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-mono">
              Frequently Asked Questions & Quick Solutions
            </h3>
          </div>

          <div className="space-y-2.5">
            {FAQS.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-surface-border rounded-xl overflow-hidden bg-surface-subtle transition-colors"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-foreground hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-surface-border pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation & Desktop Side Nav */}
      <MobileNav activeNav="support" />
    </div>
  );
}
