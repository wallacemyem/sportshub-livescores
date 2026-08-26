'use client';

import { useState } from 'react';
import { BetSlip } from '@/types';
import { Ticket, X, Check, Loader2, AlertCircle, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getApiBaseUrl } from '@/lib/api';
import { BookmakerIcon } from '@/components/brand/BookmakerLogo';

interface TicketImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (slip: BetSlip) => void;
}

export function TicketImporterModal({ isOpen, onClose, onImportSuccess }: TicketImporterModalProps) {
  const [bookmaker, setBookmaker] = useState('auto');
  const [bookingCode, setBookingCode] = useState('');
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
    setScanStep('Connecting to sportsbook network...');

    const scanSteps = [
      'Checking SportyBet...',
      'Checking Bet9ja...',
      'Checking 1xBet...',
      'Checking BetKing...',
      'Checking MSport & MozzartBet...',
    ];

    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      if (stepIdx < scanSteps.length) {
        setScanStep(scanSteps[stepIdx]);
        stepIdx++;
      }
    }, 350);

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/betslip/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookmaker,
          booking_code: cleanCode,
        }),
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error ||
          `Could not find a bet slip matching code "${cleanCode}". Please verify the code or select your sportsbook.`
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
      setError(err.message || `No bet slip found matching code "${cleanCode}".`);
    } finally {
      setIsLoading(false);
      setScanStep('');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-surface border border-surface-border rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-elevated animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center font-black shadow-sm">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm font-sans">Import & Track Bet Slip</h3>
              <p className="text-[11px] text-muted-foreground">Real-time live scores and match event tracking</p>
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
                <p className="font-bold">Bet Slip Not Found</p>
                <p className="mt-0.5 text-xs leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Bookmaker Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider font-sans">
                Sportsbook
              </label>
              <span className="text-[10px] text-violet-600 dark:text-violet-400 font-sans flex items-center gap-1 font-bold">
                <Zap className="w-3 h-3" /> Auto-Detect
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
                <span className="flex items-center gap-1.5 font-sans">
                  <span>Auto-Detect Any Sportsbook</span>
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
                  <span className="flex items-center gap-1.5 min-w-0">
                    <BookmakerIcon id={b.id} className="w-4 h-4 rounded shrink-0" />
                    <span className="text-[11px] font-sans truncate">{b.name}</span>
                  </span>
                  {bookmaker === b.id && <Check className="w-3 h-3 text-violet-600 dark:text-violet-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Booking Code Input */}
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5 font-sans">
              Booking Code / Bet ID
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

          {/* Active Scanning Status Message */}
          {isLoading && scanStep && (
            <div className="p-2.5 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 rounded-lg text-center text-xs font-sans text-violet-700 dark:text-violet-300 flex items-center justify-center gap-2">
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
                <span>Finding Bet Slip...</span>
              </>
            ) : (
              <span>Track Bet Slip</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
