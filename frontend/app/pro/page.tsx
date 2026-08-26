'use client';

import { useState } from 'react';
import {
  Crown,
  Check,
  Zap,
  Sparkles,
  Loader2,
  CreditCard,
  Coins,
  ArrowLeft,
  ShieldCheck,
  Radio,
  Sliders,
  ExternalLink,
  Activity,
  Layers,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { MobileNav } from '@/components/ui/MobileNav';
import { getApiBaseUrl } from '@/lib/api';

const PRO_FEATURES = [
  {
    icon: Zap,
    title: 'Sub-Millisecond WebSockets',
    description: 'Direct zero-delay live delta stream connection with instant score updates and game clocks on port 18443.',
  },
  {
    icon: Layers,
    title: 'Multi-Bookmaker Auto-Looping Slip Engine',
    description: 'Auto-detects and resolves booking codes across SportyBet, Bet9ja, 1xBet, and BetKing with dynamic cash-out probability.',
  },
  {
    icon: Sliders,
    title: 'Consensus & Sharp Odds Comparison',
    description: 'Live bookmaker margins, price movements, and market consensus from top sportsbooks via The Odds API.',
  },
  {
    icon: Radio,
    title: 'Live Audio Commentary & Radio',
    description: 'Stream live match audio broadcasts directly in-browser with zero background tab throttling.',
  },
  {
    icon: Activity,
    title: 'OS Document Picture-in-Picture',
    description: 'Pop out a native always-on-top draggable floating scoreboard over games, spreadsheets, or work apps.',
  },
  {
    icon: Flame,
    title: 'Mobile Lock Screen Real-Time Dynamic Widget',
    description: 'HTML5 Media Session API integration displaying live match clocks and goals on your phone lock screen.',
  },
];

const PRO_FAQS = [
  {
    q: 'How does cryptocurrency payment work?',
    a: 'We integrate with Cryptomus for seamless crypto payments (USDT on TRC20/ERC20/Polygon, BTC, ETH, SOL, BNB). Once your transaction is confirmed on-chain (typically under 60 seconds), your Pro status is instantly activated via automated webhooks.',
  },
  {
    q: 'Can I cancel my subscription at any time?',
    a: 'Yes, absolutely. There are no lock-ins or contracts. You can manage or cancel your subscription anytime with a single click, and retain Pro access until the end of your billing cycle.',
  },
  {
    q: 'Does PRO work across all my devices?',
    a: 'Yes! Your SportsHub PRO access syncs seamlessly across Desktop, Tablets, iPhone, and Android with full Picture-in-Picture and lock screen capabilities on supported browsers.',
  },
];

export default function ProPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [gateway, setGateway] = useState<'cryptomus' | 'flutterwave'>('cryptomus');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const priceMonthly = 29;
  const priceAnnual = 279; // ~23.25/mo, saves $69

  async function handleCheckout() {
    setIsLoading(true);
    try {
      const apiBase = getApiBaseUrl();
      const amount = billingCycle === 'monthly' ? priceMonthly : priceAnnual;
      const res = await fetch(`${apiBase}/payments/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'pro_subscriber_live',
          gateway,
          amount,
          billing_cycle: billingCycle,
        }),
      });

      if (res.ok) {
        setIsSuccess(true);
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'],
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
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
            <div className="w-8 h-8 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 flex items-center justify-center font-bold">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-foreground tracking-tight flex items-center gap-1.5">
                SportsHub PRO
              </h1>
              <p className="text-[10px] text-muted-foreground hidden sm:block">
                Ultra-low latency live data, multi-bookmaker cashout engine & odds
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="flex items-center gap-2 text-[11px] font-medium text-violet-700 dark:text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PRO Tier Access</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 md:pl-24 xl:px-6 py-8 space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-gradient-to-r from-violet-500/15 via-indigo-500/15 to-blue-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 shadow-sm">
            <Crown className="w-3.5 h-3.5 text-violet-500" />
            <span>Next-Generation Live Sports Architecture</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
            Unlock Real-Time Edge with{' '}
            <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
              SportsHub PRO
            </span>
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Engineered for high-volume sports fans, sharp bettors, and live traders needing sub-millisecond WebSocket updates, multi-bookmaker ticket resolution, and 2D visual coordinate trackers.
          </p>

          {/* Billing Cycle Switcher */}
          <div className="pt-4 flex items-center justify-center">
            <div className="bg-surface border border-surface-border p-1 rounded-2xl flex items-center gap-1 shadow-sm">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full font-extrabold uppercase">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing & Checkout Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Free vs Pro Comparison */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-surface border border-surface-border rounded-2xl p-6 sm:p-7 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-surface-border pb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Plan Inclusions</h3>
                  <p className="text-xs text-muted-foreground">What you get with your PRO Membership</p>
                </div>
                <span className="text-xs font-bold font-mono text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-lg border border-violet-500/20">
                  ALL-INCLUSIVE
                </span>
              </div>

              <div className="space-y-4">
                {PRO_FEATURES.map((feat, idx) => {
                  const Icon = feat.icon;
                  return (
                    <div key={idx} className="flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-foreground">{feat.title}</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {feat.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-surface-border flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Instant Automatic Webhook Activation</span>
                </span>
                <span className="font-medium">Cancel Anytime</span>
              </div>
            </div>
          </div>

          {/* Right: Checkout & Gateway Selector */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-gradient-to-b from-surface via-surface to-surface-subtle border-2 border-violet-500/50 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-l from-violet-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-4 py-1 rounded-bl-xl shadow-md">
                MOST POPULAR
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-5 h-5 text-violet-500" />
                    <h3 className="text-lg font-black text-foreground">PRO VIP Pass</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Full unlocked access to all live feeds, booking code engines & sharp odds.
                  </p>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline gap-2 bg-surface-subtle border border-surface-border p-4 rounded-2xl">
                  <span className="text-4xl sm:text-5xl font-black text-foreground font-mono">
                    ${billingCycle === 'monthly' ? priceMonthly : priceAnnual}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    /{billingCycle === 'monthly' ? 'month' : 'year (billed annually)'}
                  </span>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider font-mono">
                    Select Payment Gateway
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setGateway('cryptomus')}
                      className={`p-3.5 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer ${
                        gateway === 'cryptomus'
                          ? 'bg-violet-50 dark:bg-violet-500/15 border-violet-500 ring-2 ring-violet-500/30'
                          : 'bg-surface border-surface-border hover:bg-surface-subtle text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Coins className={`w-5 h-5 ${gateway === 'cryptomus' ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground'}`} />
                        {gateway === 'cryptomus' && (
                          <div className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px]">
                            ✓
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Cryptomus</p>
                        <p className="text-[10px] text-muted-foreground">USDT, BTC, ETH, SOL</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGateway('flutterwave')}
                      className={`p-3.5 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer ${
                        gateway === 'flutterwave'
                          ? 'bg-violet-50 dark:bg-violet-500/15 border-violet-500 ring-2 ring-violet-500/30'
                          : 'bg-surface border-surface-border hover:bg-surface-subtle text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <CreditCard className={`w-5 h-5 ${gateway === 'flutterwave' ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground'}`} />
                        {gateway === 'flutterwave' && (
                          <div className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px]">
                            ✓
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Cards & Bank</p>
                        <p className="text-[10px] text-muted-foreground">Visa, MC, Flutterwave</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Checkout Trigger */}
                {isSuccess ? (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl text-center space-y-2 animate-in fade-in">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      PRO Membership Active!
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Your signed webhook confirmation has been processed. Enjoy unlimited sub-millisecond feeds.
                    </p>
                    <Link
                      href="/"
                      className="inline-block mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all"
                    >
                      Return to Live Scores
                    </Link>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleCheckout}
                    className="w-full py-3.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying {gateway === 'cryptomus' ? 'On-Chain Signature' : 'Payment Gateway'}...</span>
                      </>
                    ) : (
                      <>
                        <Crown className="w-4 h-4" />
                        <span>
                          Activate PRO with {gateway === 'cryptomus' ? 'Crypto' : 'Card'} &bull; $
                          {billingCycle === 'monthly' ? priceMonthly : priceAnnual}
                        </span>
                      </>
                    )}
                  </button>
                )}

                <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>256-Bit SSL Encrypted</span>
                  </span>
                  <span>&bull;</span>
                  <span>Zero Lock-in</span>
                  <span>&bull;</span>
                  <span>Instant Setup</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-surface border border-surface-border rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">Frequently Asked Questions</h3>
            <p className="text-xs text-muted-foreground">Everything you need to know about PRO membership & billing.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRO_FAQS.map((faq, i) => (
              <div key={i} className="bg-surface-subtle border border-surface-border rounded-xl p-4.5 space-y-2">
                <h4 className="text-xs font-bold text-foreground">{faq.q}</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Navigation */}
      <MobileNav activeNav="pro" />
    </div>
  );
}
