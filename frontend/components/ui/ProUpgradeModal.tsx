'use client';

import { useState } from 'react';
import { Crown, Check, X, ShieldCheck, Zap, Sparkles, Loader2 } from 'lucide-react';
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
          colors: ['#00F59B', '#F59E0B', '#3B82F6', '#8B5CF6'],
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
      <div className="bg-surface border border-emerald-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-neon animate-in fade-in zoom-in-95 duration-200">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-surface to-surface-subtle p-6 border-b border-surface-border relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-hover"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-neon flex items-center justify-center text-emerald-neon shadow-neon-sm">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-emerald-neon uppercase tracking-wider">
                PRO TIER MEMBERSHIP
              </span>
              <h2 className="text-xl font-black text-white">Unlock Ultra-Fast Pro Feeds</h2>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="p-6 space-y-4">
          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-neon flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span><strong>The Odds API Integration:</strong> Live bookmaker line comparison & sharp consensus</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-neon flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span><strong>Sub-Millisecond WebSockets:</strong> Zero-delay delta score streams on port 18443</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-neon flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <span><strong>Accumulator Cash-Out Engine:</strong> Automatic fuzzy parsing for SportyBet, Bet9ja, 1xBet, BetKing</span>
            </div>
          </div>

          {/* Pricing & Gateway Selector */}
          <div className="bg-surface-subtle border border-surface-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold text-white">Monthly Pro Pass</p>
                <p className="text-[11px] text-slate-400">Cancel anytime. Instant automatic activation.</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-emerald-neon font-mono">$29<span className="text-xs font-normal text-slate-400">/mo</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setGateway('cryptomus')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                  gateway === 'cryptomus'
                    ? 'bg-emerald-950/60 border-emerald-neon text-white ring-1 ring-emerald-neon/40'
                    : 'bg-surface border-surface-border text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-sm">🪙 Cryptomus</span>
                <span className="text-[10px] text-slate-400">USDT, BTC, ETH, TON, SOL</span>
              </button>

              <button
                type="button"
                onClick={() => setGateway('flutterwave')}
                className={`py-2.5 px-3 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                  gateway === 'flutterwave'
                    ? 'bg-emerald-950/60 border-emerald-neon text-white ring-1 ring-emerald-neon/40'
                    : 'bg-surface border-surface-border text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-sm">💳 Flutterwave</span>
                <span className="text-[10px] text-slate-400">Cards, Bank Transfer, USSD</span>
              </button>
            </div>
          </div>

          {/* Upgrade Action */}
          <button
            type="button"
            disabled={isLoading || isDone}
            onClick={handleCheckout}
            className="w-full py-3 bg-emerald-neon hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl shadow-neon flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
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
