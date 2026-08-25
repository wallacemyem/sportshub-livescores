'use client';

import { useState } from 'react';
import { Crown, Check, X, ShieldCheck, Zap, Sparkles, Loader2, CreditCard, Coins } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProUpgradeModal({ isOpen, onClose, onSuccess }: ProUpgradeModalProps) {
  const [gateway, setGateway] = useState<'flutterwave' | 'cryptomus'>('cryptomus');
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  async function handleCheckout() {
    setIsLoading(true);
    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const res = await fetch(`http://${host}:18443/api/v1/payments/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'pro_client_17080',
          gateway,
          amount: 29.00,
        }),
      });

      if (res.ok) {
        setIsDone(true);
        confetti({
          particleCount: 80,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'],
        });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1800);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-violet-300 dark:border-violet-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-elevated animate-in fade-in zoom-in-95 duration-200">
        {/* Banner */}
        <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-6 relative text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white shadow-lg">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-violet-200 uppercase tracking-wider">
                PRO TIER MEMBERSHIP
              </span>
              <h2 className="text-xl font-black text-white">Unlock Ultra-Fast Pro Feeds</h2>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="p-6 space-y-4">
          <div className="space-y-2.5 text-xs text-foreground">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span><strong>The Odds API Integration:</strong> Live bookmaker line comparison & sharp consensus</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span><strong>Sub-Millisecond WebSockets:</strong> Zero-delay delta score streams on port 18443</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span><strong>Accumulator Cash-Out Engine:</strong> Automatic fuzzy parsing for SportyBet, Bet9ja, 1xBet, BetKing</span>
            </div>
          </div>

          {/* Pricing & Gateway Selector */}
          <div className="bg-surface-subtle border border-surface-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold text-foreground">Monthly Pro Pass</p>
                <p className="text-[11px] text-muted-foreground">Cancel anytime. Instant automatic activation.</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-violet-600 dark:text-violet-400 font-mono">$29<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setGateway('cryptomus')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  gateway === 'cryptomus'
                    ? 'bg-violet-50 dark:bg-violet-500/15 border-violet-500 text-violet-700 dark:text-violet-300 ring-1 ring-violet-500/40 font-bold'
                    : 'bg-surface border-surface-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-1.5 font-bold">
                  <Coins className="w-4 h-4 text-muted-foreground" />
                  <span>Cryptomus</span>
                </span>
                <span className="text-[10px] text-muted-foreground">USDT, BTC, ETH, SOL</span>
              </button>

              <button
                type="button"
                onClick={() => setGateway('flutterwave')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  gateway === 'flutterwave'
                    ? 'bg-violet-50 dark:bg-violet-500/15 border-violet-500 text-violet-700 dark:text-violet-300 ring-1 ring-violet-500/40 font-bold'
                    : 'bg-surface border-surface-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-1.5 font-bold">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span>Flutterwave</span>
                </span>
                <span className="text-[10px] text-muted-foreground">Cards, Bank Transfer</span>
              </button>
            </div>
          </div>

          {/* Upgrade Action */}
          <button
            type="button"
            disabled={isLoading || isDone}
            onClick={handleCheckout}
            className="w-full py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-violet-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying Gateway Signature...
              </>
            ) : isDone ? (
              <>
                <Check className="w-4 h-4" /> PRO Plan Activated!
              </>
            ) : (
              `Subscribe with ${gateway === 'cryptomus' ? 'Cryptomus Crypto' : 'Flutterwave'}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
