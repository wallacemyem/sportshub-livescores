'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BetSlip } from '@/types';
import { Ticket, X, Check, Loader2, AlertCircle, Zap, Crown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getApiBaseUrl } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface TicketImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (slip: BetSlip) => void;
}

export function TicketImporterModal({ isOpen, onClose, onImportSuccess }: TicketImporterModalProps) {
  const { user, token } = useAuth();
  const [bookingCode, setBookingCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isPlanLimit, setIsPlanLimit] = useState(false);

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
    setIsPlanLimit(false);
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${apiBase}/betslip/import`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bookmaker: 'auto',
          booking_code: cleanCode,
        }),
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.code === 'PLAN_LIMIT_EXCEEDED') {
          setIsPlanLimit(true);
        }
        throw new Error(
          errData.error ||
          `Could not find a bet slip matching code "${cleanCode}". Please verify the code.`
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
              <p className="text-[11px] text-muted-foreground">Auto-detects SportyBet, Bet9ja, 1xBet, BetKing, MSport & MozzartBet</p>
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
            <div className="p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 rounded-xl text-xs flex flex-col gap-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{isPlanLimit ? 'Plan Limit Reached' : 'Unable to Import Ticket'}</p>
                  <p className="mt-0.5 text-xs leading-relaxed">{error}</p>
                </div>
              </div>
              {isPlanLimit && (
                <div className="pt-1 flex justify-end">
                  <Link
                    href="/account/plan"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Upgrade to Pro / Elite</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Booking Code Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider font-sans">
                Booking Code / Bet ID
              </label>
              <span className="text-[10px] text-violet-600 dark:text-violet-400 font-sans flex items-center gap-1 font-bold">
                <Zap className="w-3 h-3" /> Auto-Detect
              </span>
            </div>
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
