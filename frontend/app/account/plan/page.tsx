'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Crown,
  Gem,
  Shield,
  Check,
  ArrowRight,
  Sparkles,
  CreditCard,
  Coins,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { MobileNav } from '@/components/ui/MobileNav';
import { PlanBadge, getPlanConfig } from '@/components/brand/PlanBadge';

type Cycle = 'monthly' | 'annual';
type Gateway = 'cryptomus' | 'flutterwave';

interface PlanOption {
  id: 'free' | 'pro' | 'elite';
  name: string;
  tagline: string;
  monthly: number;
  annual: number;
  icon: typeof Shield;
  featured?: boolean;
  colorClass: string;
  borderClass: string;
  badgeBg: string;
  features: string[];
}

const PLANS: PlanOption[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Standard live match tracker & consensus odds.',
    monthly: 0,
    annual: 0,
    icon: Shield,
    colorClass: 'text-muted-foreground',
    borderClass: 'border-surface-border',
    badgeBg: 'bg-surface-subtle',
    features: [
      '1 active tracked slip at a time',
      'Live scores across all 7 sports',
      'Goal and red card instant alerts',
      'Consensus odds monitor',
      'Standard support queue',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For active bettors with multiple tickets.',
    monthly: 9,
    annual: 86,
    icon: Crown,
    featured: true,
    colorClass: 'text-violet-600 dark:text-violet-400',
    borderClass: 'border-violet-500 ring-2 ring-violet-500/30',
    badgeBg: 'bg-gradient-to-r from-violet-600 to-indigo-600',
    features: [
      'Unlimited tracked bet slips',
      'Real-time cashout valuation engine',
      'Pop-out Picture-in-Picture scoreboard',
      'Lock screen live widget stream',
      'Multi-sportsbook odds comparison',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    tagline: 'Sub-second WebSocket feeds & syndicate API.',
    monthly: 29,
    annual: 279,
    icon: Gem,
    colorClass: 'text-amber-600 dark:text-amber-400',
    borderClass: 'border-amber-500 ring-2 ring-amber-500/30',
    badgeBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    features: [
      'Everything in Pro included',
      'Sub-second raw WebSocket feeds',
      'REST API access & webhook dispatch',
      'Unlimited slip history & CSV export',
      'Dedicated VIP support desk',
    ],
  },
];

export default function ChangePlanPage() {
  const { user, updatePlan } = useAuth();
  const router = useRouter();

  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [gateway, setGateway] = useState<Gateway>('cryptomus');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentPlanId = (user?.plan || 'free').toLowerCase();
  const currentConfig = getPlanConfig(currentPlanId);
  const CurrentIcon = currentConfig.icon;

  const handleSwitchPlan = async (targetPlan: 'free' | 'pro' | 'elite') => {
    if (targetPlan === currentPlanId) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await updatePlan(targetPlan);
    setIsProcessing(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`Successfully switched to ${targetPlan.toUpperCase()} plan!`);
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: targetPlan === 'elite' ? ['#F59E0B', '#EF4444', '#10B981'] : ['#8B5CF6', '#3B82F6', '#10B981'],
      });
      setTimeout(() => setSuccessMsg(null), 6000);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-24 md:pb-12">
      {/* Header */}
      <AppPageHeader
        icon={Crown}
        title="Change Plan"
        subtitle="Manage your membership tier and upgrades"
        accentClassName="bg-violet-600/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
        backHref="/account"
        backLabel="Account"
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 md:pl-24 xl:px-6 py-8 space-y-8">
        {/* Status Alerts */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-2xl flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs font-bold">{successMsg}</p>
              <p className="text-[11px] text-muted-foreground">Your account features have been updated in real-time.</p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300 rounded-2xl flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-xs font-bold">{errorMsg}</p>
          </div>
        )}

        {/* Current Active Plan Banner */}
        <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-surface-subtle border border-surface-border flex items-center justify-center shadow-sm shrink-0">
                <CurrentIcon className={`w-7 h-7 ${currentConfig.iconClass}`} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">Current Active Plan</h2>
                  <PlanBadge plan={currentPlanId} size="sm" interactive={false} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentConfig.tagline}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[11px] font-mono uppercase font-bold text-muted-foreground block">
                Billing Status
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 sm:justify-end mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Active &bull; {currentPlanId === 'free' ? 'No Expiry' : 'Auto-Renew'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Billing Cycle Switcher */}
        <div className="text-center space-y-3">
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Select Your New Plan
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
            Upgrade or switch tiers anytime. All your current saved slips and settings remain completely intact.
          </p>

          <div className="pt-2 flex justify-center">
            <div className="inline-flex items-center gap-1 rounded-2xl border border-surface-border bg-surface p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => setCycle('monthly')}
                className={`cursor-pointer rounded-xl px-5 py-2 text-xs font-bold transition-all ${
                  cycle === 'monthly'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setCycle('annual')}
                className={`flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold transition-all ${
                  cycle === 'annual'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Annual Billing</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                    cycle === 'annual'
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                  }`}
                >
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid gap-8 lg:grid-cols-3 items-stretch">
          {PLANS.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const price = cycle === 'monthly' ? plan.monthly : plan.annual;
            const isFree = plan.monthly === 0;
            const PlanIconComponent = plan.icon;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-3xl border bg-surface p-7 shadow-sm transition-all hover:shadow-elevated ${
                  isCurrent
                    ? 'border-emerald-500/60 ring-2 ring-emerald-500/30'
                    : plan.featured
                    ? 'border-violet-500 ring-2 ring-violet-500/30 shadow-lg'
                    : 'border-surface-border'
                }`}
              >
                {/* Top Badge */}
                {isCurrent ? (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-4 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md flex items-center gap-1">
                    <Check className="w-3 h-3" /> Current Plan
                  </span>
                ) : plan.featured ? (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                    Most Popular
                  </span>
                ) : null}

                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-8 h-8 rounded-xl bg-surface-subtle border border-surface-border flex items-center justify-center ${plan.colorClass}`}>
                          <PlanIconComponent className="w-4 h-4" />
                        </span>
                        <h2 className="text-xl font-black text-foreground">{plan.name}</h2>
                      </div>
                      <PlanBadge plan={plan.id} size="xs" interactive={false} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed min-h-[32px]">
                      {plan.tagline}
                    </p>
                  </div>

                  {/* Price Section */}
                  <div className="p-4 rounded-2xl bg-surface-subtle border border-surface-border">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-3xl sm:text-4xl font-black text-foreground">
                        {isFree ? 'Free' : `$${price}`}
                      </span>
                      {!isFree && (
                        <span className="text-xs font-semibold text-muted-foreground">
                          /{cycle === 'monthly' ? 'month' : 'year'}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {isFree
                        ? 'Zero subscription fees'
                        : cycle === 'annual'
                        ? `Billed annually (~$${(plan.annual / 12).toFixed(2)}/mo)`
                        : 'Billed monthly, cancel anytime'}
                    </p>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 pt-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Included Features:
                    </p>
                    <ul className="space-y-2.5">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5 text-xs text-foreground">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                            <Check className="h-3 w-3" />
                          </span>
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Plan Action CTA */}
                <div className="mt-8 pt-4 border-t border-surface-border">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1.5 cursor-default"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Active Plan</span>
                    </button>
                  ) : isFree ? (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleSwitchPlan('free')}
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider border border-surface-border bg-surface-subtle hover:bg-surface-hover text-foreground flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                      <span>Switch to Free Tier</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleSwitchPlan(plan.id)}
                      className={`w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                        plan.id === 'elite'
                          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:opacity-90 shadow-amber-500/25'
                          : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:opacity-90 shadow-violet-500/25'
                      }`}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <PlanIconComponent className="w-4 h-4" />
                      )}
                      <span>Switch to {plan.name} (${price})</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment Gateways Bar */}
        <div className="p-6 bg-surface border border-surface-border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Supported Payment & Webhook Gateways
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Instant on-chain crypto verification or international card settlements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold">Cryptomus (USDT, BTC, ETH, SOL)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-violet-500" />
              <span className="font-semibold">Flutterwave (Cards, Bank Transfer)</span>
            </span>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
