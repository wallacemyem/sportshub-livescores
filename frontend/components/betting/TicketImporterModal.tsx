'use client';

import { useState } from 'react';
import { BetSlip } from '@/types';
import { Ticket, X, Check, Loader2, AlertCircle, Zap, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TicketImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (slip: BetSlip) => void;
}

const SAMPLE_CODES = [
  { bookmaker: 'sportybet', code: 'BC99214', label: 'BC99214 (SportyBet • 6-8 Alphanumeric)' },
  { bookmaker: 'bet9ja', code: '557877Y', label: '557877Y (Bet9ja • 6-7 Alphanumeric / B9JA)' },
  { bookmaker: '1xbet', code: 'DPK3Q', label: 'DPK3Q (1xBet • 5-Char Bet Slip Download)' },
  { bookmaker: 'betking', code: 'BK-10294', label: 'BK-10294 (BetKing • 5-8 Alphanumeric Code Zone)' },
  { bookmaker: 'msport', code: 'MS-88192', label: 'MS-88192 (MSport • 6-8 Alphanumeric)' },
  { bookmaker: 'mozzartbet', code: 'MZ-44912', label: 'MZ-44912 (MozzartBet • Alphanumeric Multi)' },
];

export function TicketImporterModal({ isOpen, onClose, onImportSuccess }: TicketImporterModalProps) {
  const [bookmaker, setBookmaker] = useState('auto');
  const [bookingCode, setBookingCode] = useState('BC99214');
  const [stake, setStake] = useState('50');
  const [isLoading, setIsLoading] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = bookingCode.trim();
    if (!cleanCode) {
      setError('Please enter a booking code.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setScanStep('Connecting to multi-bookmaker resolver...');

    const scanSteps = [
      'Scanning SportyBet registry (6-8 char format)...',
      'Scanning Bet9ja booking registry (6-7 char format)...',
      'Scanning 1xBet bet slip registry (5-char format)...',
      'Scanning BetKing accumulator database...',
      'Scanning MSport and MozzartBet feeds...',
    ];

    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      if (stepIdx < scanSteps.length) {
        setScanStep(scanSteps[stepIdx]);
        stepIdx++;
      }
    }, 350);

    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const res = await fetch(`http://${host}:18443/api/v1/betslip/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookmaker: bookmaker === 'auto' ? '' : bookmaker,
          booking_code: cleanCode,
          stake: parseFloat(stake) || 20,
        }),
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          data.error ||
          `No matching bookmaker found for code "${cleanCode}". Scanned across SportyBet, Bet9ja, 1xBet, BetKing, MSport, and MozzartBet.`
        );
      }

      const slip: BetSlip = await res.json();

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'],
      });

      onImportSuccess(slip);
      onClose();
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err.message || `No bookmaker found matching code "${cleanCode}".`);
    } finally {
      setIsLoading(false);
      setScanStep('');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-surface border border-surface-border rounded-2xl w-full max-w-lg overflow-hidden shadow-elevated animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center font-black shadow-sm">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm font-mono">Multi-Bookmaker Bet Slip Resolver</h3>
              <p className="text-[11px] text-muted-foreground font-mono">Automatic looping across global bookmakers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleImport} className="p-4 space-y-4">
          {/* Error Notification */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Ticket Resolution Failed</p>
                <p className="mt-0.5 text-xs leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Bookmaker Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
                Bookmaker Resolution Mode
              </label>
              <span className="text-[10px] text-violet-600 dark:text-violet-400 font-mono flex items-center gap-1 font-bold">
                <Zap className="w-3 h-3" /> Auto-Looping
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {/* Auto-Detect Button */}
              <button
                type="button"
                onClick={() => setBookmaker('auto')}
                className={`col-span-2 sm:col-span-3 py-2 px-3 rounded-lg text-xs font-bold border text-left flex items-center justify-between transition-all cursor-pointer ${
                  bookmaker === 'auto'
                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-500/20'
                    : 'bg-surface-subtle border-surface-border text-foreground hover:bg-surface-hover'
                }`}
              >
                <span className="flex items-center gap-1.5 font-mono">
                  <span>Auto-Detect (Loop All Bookmakers)</span>
                </span>
                {bookmaker === 'auto' && <Check className="w-3.5 h-3.5" />}
              </button>

              {/* Individual Bookmaker Options */}
              {[
                { id: 'sportybet', name: 'SportyBet' },
                { id: 'bet9ja', name: 'Bet9ja' },
                { id: '1xbet', name: '1xBet' },
                { id: 'betking', name: 'BetKing' },
                { id: 'msport', name: 'MSport' },
                { id: 'mozzartbet', name: 'MozzartBet' },
              ].map((b) => (
                <button
                  type="button"
                  key={b.id}
                  onClick={() => setBookmaker(b.id)}
                  className={`py-1.5 px-2.5 rounded-lg text-xs font-medium border text-left flex items-center justify-between transition-all cursor-pointer ${
                    bookmaker === b.id
                      ? 'bg-violet-50 dark:bg-violet-500/15 border-violet-500 text-violet-700 dark:text-violet-300 font-bold shadow-sm'
                      : 'bg-surface-subtle border-surface-border text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                  }`}
                >
                  <span className="text-[11px] font-mono">{b.name}</span>
                  {bookmaker === b.id && <Check className="w-3 h-3 text-violet-600 dark:text-violet-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Booking Code Input */}
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Booking Code
            </label>
            <input
              type="text"
              value={bookingCode}
              onChange={(e) => setBookingCode(e.target.value)}
              placeholder="e.g. BC99214, 557877Y, DPK3Q, BK-10294"
              className="w-full bg-surface-subtle border border-surface-border focus:border-violet-500 rounded-lg px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Stake Input */}
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
              Stake Amount ($)
            </label>
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              min="1"
              step="any"
              className="w-full bg-surface-subtle border border-surface-border focus:border-violet-500 rounded-lg px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Preset Demo Codes */}
          <div>
            <p className="text-[11px] text-muted-foreground font-semibold mb-1">
              Quick Codes for Demo:
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {SAMPLE_CODES.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => {
                    setBookmaker('auto');
                    setBookingCode(s.code);
                  }}
                  className="text-left bg-surface-subtle hover:bg-surface-hover border border-surface-border hover:border-violet-300 dark:hover:border-violet-600 px-2 py-1.5 rounded text-[10px] text-muted-foreground hover:text-foreground transition-colors truncate cursor-pointer font-mono"
                >
                  <strong className="text-violet-600 dark:text-violet-400">{s.code}</strong> - Auto Loop
                </button>
              ))}
            </div>
          </div>

          {/* Active Scanning Status Message */}
          {isLoading && scanStep && (
            <div className="p-2.5 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 rounded-lg text-center text-xs font-mono text-violet-700 dark:text-violet-300 flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600" />
              <span>{scanStep}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-violet-500/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Looping Bookmakers & Resolving...
              </>
            ) : (
              'Auto-Resolve & Track Accumulator'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
