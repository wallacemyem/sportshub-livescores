'use client';

import { useState, useEffect } from 'react';
import { SupportTicket, SupportTicketMessage } from '@/types';
import { X, Headphones, Send, MessageSquare, AlertCircle, CheckCircle2, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEPARTMENTS = [
  'Live Stream & Scores',
  'VIP & Pro Billing',
  'Odds & Bet Tracking',
  'Data Delay / Bug Report',
  'General Inquiry',
];

export function SupportModal({ isOpen, onClose }: SupportModalProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(DEPARTMENTS[0]);
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');
  const [initialMessage, setInitialMessage] = useState('');

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
    if (isOpen) {
      fetchTickets();
    }
  }, [isOpen, selectedTicket]);

  if (!isOpen) return null;

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !initialMessage.trim()) return;

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
          message: initialMessage,
        }),
      });

      if (res.ok) {
        const newTicket: SupportTicket = await res.json();
        setTickets([newTicket, ...tickets]);
        setSelectedTicket(newTicket);
        setIsCreatingNew(false);
        setSubject('');
        setInitialMessage('');

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
    if (!selectedTicket || !replyMessage.trim()) return;

    const messageText = replyMessage.trim();
    setReplyMessage('');

    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const res = await fetch(`http://${host}:18443/api/v1/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'user',
          sender_name: 'Alex Mercer',
          message: messageText,
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-surface border border-surface-border rounded-2xl w-full max-w-3xl overflow-hidden shadow-elevated animate-in fade-in zoom-in-95 duration-150 flex flex-col h-[600px] max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black shadow-sm">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">Customer Support</h3>
              <p className="text-[11px] text-muted-foreground font-mono">Live response & technical support queue</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreatingNew((prev) => !prev)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm shadow-blue-500/20"
            >
              {isCreatingNew ? 'View Active Tickets' : '+ Open Ticket'}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {isCreatingNew ? (
          /* CREATE TICKET FORM */
          <form onSubmit={handleCreateTicket} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <h4 className="text-sm font-bold text-foreground mb-1">Submit a Support Inquiry</h4>
              <p className="text-xs text-muted-foreground">Our engineering and billing specialists respond within minutes.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1 font-mono">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. WebSocket latency issue during match"
                className="w-full bg-surface-subtle border border-surface-border focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1 font-mono">
                Message Details
              </label>
              <textarea
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                rows={4}
                placeholder="Please include details like match ID, browser version, or transaction reference..."
                className="w-full bg-surface-subtle border border-surface-border focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-blue-500/20"
            >
              {isLoading ? 'Submitting Ticket...' : 'Submit Support Ticket'}
            </button>
          </form>
        ) : (
          /* THREADS LIST & CHAT VIEW */
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
            {/* Tickets Sidebar */}
            <div className="md:col-span-4 border-r border-surface-border overflow-y-auto bg-surface-subtle/50 p-2 space-y-1.5 max-h-48 md:max-h-full">
              <p className="text-[10px] font-mono uppercase text-muted-foreground px-2 py-1 font-bold">
                Your Tickets ({tickets.length})
              </p>

              {tickets.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground font-mono">
                  No active tickets
                </div>
              ) : (
                tickets.map((t) => {
                  const isSelected = selectedTicket?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-surface border-blue-500 text-foreground shadow-sm'
                          : 'bg-surface-subtle border-surface-border hover:bg-surface-hover text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-mono font-bold uppercase text-blue-600 dark:text-blue-400 truncate">
                          {t.category}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground bg-surface px-1.5 py-0.5 rounded border border-surface-border">
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-foreground truncate">{t.subject}</p>
                    </button>
                  );
                })
              )}
            </div>

            {/* Chat Conversation */}
            <div className="md:col-span-8 flex flex-col h-full bg-surface overflow-hidden">
              {selectedTicket ? (
                <>
                  <div className="p-3 border-b border-surface-border bg-surface-subtle flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <h4 className="text-xs font-bold text-foreground truncate">{selectedTicket.subject}</h4>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Ticket #{selectedTicket.id} • Priority: <strong className="text-blue-600 dark:text-blue-400 uppercase">{selectedTicket.priority}</strong>
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-500/30 shrink-0">
                      {selectedTicket.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {selectedTicket.messages?.map((msg, i) => {
                      const isUser = msg.sender === 'user';
                      return (
                        <div
                          key={i}
                          className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1 font-mono">
                            <span>{msg.sender_name || (isUser ? 'You' : 'Support Desk')}</span>
                            <span>•</span>
                            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div
                            className={`p-3 rounded-2xl max-w-sm text-xs leading-relaxed ${
                              isUser
                                ? 'bg-blue-600 text-white rounded-br-none shadow-sm shadow-blue-500/20'
                                : 'bg-surface-subtle border border-surface-border text-foreground rounded-bl-none shadow-subtle'
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <form onSubmit={handleSendReply} className="p-3 border-t border-surface-border bg-surface-subtle flex items-center gap-2">
                    <input
                      type="text"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type a reply..."
                      className="flex-1 bg-surface border border-surface-border focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!replyMessage.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 rounded-lg transition-opacity disabled:opacity-40 cursor-pointer shadow-sm shadow-blue-500/20"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="text-xs font-mono">Select a ticket or open a new inquiry</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
