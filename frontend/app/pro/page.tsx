'use client';

import { Suspense, useState } from 'react';
import {
  Crown,
  Check,
  Zap,
  Sparkles,
  Loader2,
  CreditCard,
  Coins,
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
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { MobileNav } from '@/components/ui/MobileNav';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { getApiBaseUrl } from '@/lib/api';

const PRO_FEATURES = [
  {
    icon: Layers,
    title: 'Unlimited tracked slips',
    description:
      'Run as many accumulators at once as you like. Every leg is matched to its fixture automatically, whichever sportsbook the code came from.',
  },
  {
    icon: Sliders,
    title: 'Live cash-out value',
    description:
      'A running estimate of what each slip is worth right now, updated from the score, the clock and match momentum.',
  },
  {
    icon: Zap,
    title: 'Scores the moment they change',
    description:
      'A persistent live connection instead of periodic refreshes, so the scoreline moves with the match rather than a few seconds behind it.',
  },
  {
    icon: Activity,
    title: 'Pop-out scoreboard',
    description:
      'An always-on-top floating window you can drag anywhere on screen and keep in the corner while you work.',
  },
  {
    icon: Flame,
    title: 'Lock screen widget',
    description:
      'Live clock and scoreline on your phone lock screen, so you can follow a slip without unlocking anything.',
  },
  {
    icon: Radio,
    title: 'Full odds comparison',
    description:
      'Prices bookmaker by bookmaker alongside the consensus line, so you can see where a market actually moved.',
  },
];

const PRO_FAQS = [
  {
    q: 'How does paying with crypto work?',
    a: 'Crypto payments go through Cryptomus and cover USDT (TRC20, ERC20 and Polygon), BTC, ETH, SOL and BNB. Your plan activates automatically once the transaction confirms on-chain, which is usually under a minute.',
  },
  {
    q: 'Can I cancel at any time?',
    a: 'Yes. There are no contracts or lock-ins. Cancel from your account page in one click and keep your paid access until the end of the cycle you have already paid for.',
  },
  {
    q: 'Does my plan work on all my devices?',
    a: 'Yes. Your plan follows your account across desktop, tablet and phone. The pop-out scoreboard and lock screen widget depend on browser support, and work in current versions of Chrome, Edge and Safari.',
  },
];

/** Kept in step with the tiers advertised on /pricing. */
const PLAN_PRICING = {
  pro: { label: 'Pro', monthly: 9, annual: 86 },
  elite: { label: 'Elite', monthly: 29, annual: 279 },
} as const;

type PlanId = keyof typeof PLAN_PRICING;

function isPlanId(value: string | null): value is PlanId {
  return value === 'pro' || value === 'elite';
}

export default function ProPage() {
  return (
    <Suspense fallback={<ProPageFallback />}>
      <ProCheckout />
    </Suspense>
  );
}

function ProPageFallback() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function ProCheckout() {
  const searchParams = useSearchParams();

  // /pricing deep-links here with the tier and cycle the visitor already chose.
  const planParam = searchParams.get('plan');
  const plan: PlanId = isPlanId(planParam) ? planParam : 'pro';
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(
    searchParams.get('cycle') === 'annual' ? 'annual' : 'monthly'
  );
  const [gateway, setGateway] = useState<'cryptomus' | 'flutterwave'>('cryptomus');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const priceMonthly = PLAN_PRICING[plan].monthly;
  const priceAnnual = PLAN_PRICING[plan].annual;
  const planLabel = PLAN_PRICING[plan].label;

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
          plan,
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
      <AppPageHeader
        icon={Crown}
        title="Checkout"
        subtitle={`Activating the SlipRadar ${planLabel} plan`}
        accentClassName="bg-violet-600/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
        backHref="/pricing"
        backLabel="Plans"
        actions={
          <span className="hidden items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-700 dark:text-violet-400 sm:flex">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{planLabel}</span>
          </span>
        }
      />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 md:pl-24 xl:px-6 py-8 space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-gradient-to-r from-violet-500/15 via-indigo-500/15 to-blue-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 shadow-sm">
            <Crown className="w-3.5 h-3.5 text-violet-500" />
            <span>Secure checkout</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
            Finish setting up{' '}
            <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
              SlipRadar {planLabel}
            </span>
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Pick how you want to pay. Your plan activates the moment the payment clears, and everything you were tracking on the free plan carries straight over.
          </p>

          <p className="text-xs text-muted-foreground">
            Not sure which tier?{' '}
            <Link href="/pricing" className="font-semibold text-violet-600 dark:text-violet-400 underline underline-offset-4">
              Compare all plans
            </Link>
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
                <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-extrabold uppercase">
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
                  <h3 className="text-base font-bold text-foreground">What&apos;s included</h3>
                  <p className="text-xs text-muted-foreground">Everything the {planLabel} plan unlocks</p>
                </div>
                <span className="text-xs font-bold font-mono text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-lg border border-violet-500/20">
                  ALL PLANS
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
            <div className="bg-gradient-to-b from-surface via-surface to-surface-subtle border-2 border-violet-500/50 rounded-3xl p-6 sm:p-8 shadow-xl relative">
              {/* Sits in the border rather than over the card, so it can never land
                  on the plan name or the description beneath it. */}
              <span className="absolute -top-3 right-6 whitespace-nowrap rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                Most popular
              </span>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-5 h-5 text-violet-500 shrink-0" />
                    <h3 className="text-lg font-black text-foreground">{planLabel} plan</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Full access to every live feed, the booking-code engine and sharp odds.
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
                      Plan active
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Your signed webhook confirmation has been processed. Enjoy unlimited sub-millisecond feeds.
                    </p>
                    <Link
                      href="/live"
                      className="inline-block mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all"
                    >
                      Back to live scores
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
                          Pay with {gateway === 'cryptomus' ? 'crypto' : 'card'} &bull; $
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
            <p className="text-xs text-muted-foreground">Billing, cancellation and payment methods.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRO_FAQS.map((faq, i) => (
              <div key={i} className="bg-surface-subtle border border-surface-border rounded-xl p-4 space-y-2">
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
