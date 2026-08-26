'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { Check, Minus, ArrowRight, Crown, Sparkles, CreditCard, Coins, ShieldCheck, Zap } from 'lucide-react';
import { MarketingHeader } from '@/components/brand/MarketingHeader';
import { MarketingFooter } from '@/components/brand/MarketingFooter';

type Cycle = 'monthly' | 'annual';

interface Plan {
  id: string;
  name: string;
  tagline: string;
  monthly: number;
  annual: number;
  cta: string;
  href: string;
  featured?: boolean;
  highlights: string[];
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'For tracking single slips on match day.',
    monthly: 0,
    annual: 0,
    cta: 'Start tracking free',
    href: '/live',
    highlights: [
      '1 tracked slip at a time',
      'Live scores across all 7 sports',
      'Goal and red card alerts',
      'Consensus odds view',
      'Standard support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For active bettors with multiple running slips.',
    monthly: 9,
    annual: 86,
    cta: 'Upgrade to Pro',
    href: '/pro',
    featured: true,
    highlights: [
      'Unlimited tracked slips',
      'Real-time odds & scoreline sync',
      'Pop-out floating scoreboard',
      'Lock screen live widget',
      'Full bookmaker odds comparison',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    tagline: 'For power users and betting syndicates.',
    monthly: 29,
    annual: 279,
    cta: 'Go Elite',
    href: '/pro',
    highlights: [
      'Everything included in Pro',
      'Raw sub-second WebSocket feed',
      'REST API access & webhooks',
      'Full slip history & CSV export',
      'Dedicated VIP support desk',
    ],
  },
];

type Availability = true | false | string;

const COMPARISON: { section: string; rows: { label: string; free: Availability; pro: Availability; elite: Availability }[] }[] = [
  {
    section: 'Slip Tracking & Parser',
    rows: [
      { label: 'Concurrent tracked slips', free: '1', pro: 'Unlimited', elite: 'Unlimited' },
      { label: 'Supported sportsbooks', free: '6 Sportsbooks', pro: '6 Sportsbooks', elite: '6 Sportsbooks' },
      { label: 'Automatic booking code detection', free: true, pro: true, elite: true },
      { label: 'Real-time live multi-bookmaker tracker', free: false, pro: true, elite: true },
      { label: 'Slip history and export', free: false, pro: '90 days', elite: 'Unlimited' },
    ],
  },
  {
    section: 'Live Match Engine',
    rows: [
      { label: 'Sports covered', free: '7 Sports', pro: '7 Sports', elite: '7 Sports' },
      { label: 'Score delivery speed', free: 'Polled', pro: 'Sub-second WebSocket', elite: 'Sub-second WebSocket' },
      { label: '2D pitch and court view', free: true, pro: true, elite: true },
      { label: 'Bookmaker odds comparison', free: 'Consensus only', pro: true, elite: true },
      { label: 'Raw delta WebSocket feed', free: false, pro: false, elite: true },
    ],
  },
  {
    section: 'Alerts & Displays',
    rows: [
      { label: 'Instant goal and card alerts', free: true, pro: true, elite: true },
      { label: 'Custom match event notifications', free: false, pro: true, elite: true },
      { label: 'Pop-out floating scoreboard (PiP)', free: false, pro: true, elite: true },
      { label: 'Phone lock screen widget', free: false, pro: true, elite: true },
    ],
  },
  {
    section: 'Support & Integration',
    rows: [
      { label: 'Knowledge base & guides', free: true, pro: true, elite: true },
      { label: 'Support queue response', free: 'Standard', pro: 'Priority desk', elite: 'Same-day VIP' },
      { label: 'REST API & Webhook dispatch', free: false, pro: false, elite: true },
    ],
  },
];

const FAQS = [
  {
    q: 'Does SlipRadar place bets for me?',
    a: 'No. It parses and monitors booking codes you generate at your bookmaker and tracks fixtures in real-time. It never touches your sportsbook account.',
  },
  {
    q: 'What happens when I reach the free limit?',
    a: 'Your active slip keeps running uninterrupted. When you import a second slip, you are invited to upgrade to Pro, or you can replace your existing tracked slip.',
  },
  {
    q: 'How does annual billing work?',
    a: 'Annual plans are billed once per year with a 20% discount compared to monthly billing. You can switch between monthly and annual plans at any time.',
  },
  {
    q: 'Which payment methods do you accept?',
    a: 'We support cards and bank transfers through Flutterwave, plus instant cryptocurrency payments (USDT, BTC, ETH, SOL, TON) via Cryptomus with automatic on-chain confirmation.',
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Yes. You can cancel with 1-click directly from your Account page. You retain full paid access until the end of your prepaid billing period.',
  },
  {
    q: 'How does booking code parsing work?',
    a: 'SlipRadar connects to live bookmaker networks to pull real match fixtures, starting lineups, and real-time odds for your booking code.',
  },
];

function Cell({ value }: { value: Availability }) {
  if (value === true) {
    return (
      <div className="flex items-center justify-center">
        <span className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
          <Check className="h-3.5 w-3.5" />
        </span>
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="flex items-center justify-center">
        <Minus className="h-4 w-4 text-muted-foreground/40" />
      </div>
    );
  }
  return <span className="text-xs font-bold text-foreground">{value}</span>;
}

export default function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>('monthly');

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <MarketingHeader />

      <main className="flex-1">
        {/* ================================================================= */}
        {/* Header and billing switch                                         */}
        {/* ================================================================= */}
        <section className="relative overflow-hidden border-b border-surface-border">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
          <div
            className="pointer-events-none absolute left-1/2 top-[-10rem] h-[22rem] w-[40rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, var(--brand) 0%, transparent 70%)' }}
            aria-hidden="true"
          />

          <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                <span>Simple Transparent Plans</span>
              </span>

              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
                Choose the plan that fits your bets
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-muted-foreground">
                Start completely free for a single slip. Upgrade to Pro or Elite when you want
                unlimited tracked tickets, live sync, and pop-out scoreboards.
              </p>
            </div>

            {/* Billing cycle toggle */}
            <div className="mt-8 flex justify-center">
              <div
                role="radiogroup"
                aria-label="Billing cycle"
                className="inline-flex items-center gap-1 rounded-2xl border border-surface-border bg-surface p-1.5 shadow-sm"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={cycle === 'monthly'}
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
                  role="radio"
                  aria-checked={cycle === 'annual'}
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

            {/* Plan cards Grid - Perfectly Aligned */}
            <div className="mt-12 grid gap-8 lg:grid-cols-3 items-stretch">
              {PLANS.map((plan) => {
                const price = cycle === 'monthly' ? plan.monthly : plan.annual;
                const isFree = plan.monthly === 0;

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col justify-between rounded-3xl border bg-surface p-7 shadow-sm transition-all hover:shadow-elevated ${
                      plan.featured
                        ? 'border-violet-500 ring-2 ring-violet-500/30 dark:ring-violet-500/40 shadow-lg'
                        : 'border-surface-border'
                    }`}
                  >
                    {plan.featured && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                        Most Popular
                      </span>
                    )}

                    <div className="space-y-5">
                      <div>
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-black text-foreground">{plan.name}</h2>
                          {plan.featured && (
                            <span className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                              <Crown className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed min-h-[32px]">
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
                            ? 'No credit card required'
                            : cycle === 'annual'
                            ? `Billed annually (~$${(plan.annual / 12).toFixed(2)}/mo)`
                            : 'Billed monthly, cancel anytime'}
                        </p>
                      </div>

                      {/* Highlights */}
                      <div className="space-y-3 pt-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Included Features:
                        </p>
                        <ul className="space-y-2.5">
                          {plan.highlights.map((item) => (
                            <li key={item} className="flex items-start gap-2.5 text-xs text-foreground">
                              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                                <Check className="h-3 w-3" />
                              </span>
                              <span className="leading-tight">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* CTA Button Aligned to Bottom */}
                    <div className="mt-8 pt-4 border-t border-surface-border">
                      <Link
                        href={isFree ? plan.href : `${plan.href}?plan=${plan.id}&cycle=${cycle}`}
                        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${
                          plan.featured
                            ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white shadow-violet-500/25 hover:opacity-90'
                            : 'border border-surface-border bg-surface-subtle text-foreground hover:bg-surface-hover'
                        }`}
                      >
                        <span>{plan.cta}</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment Methods Trust Bar */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-violet-500" />
                <span>Credit / Debit cards & Bank Transfers via Flutterwave</span>
              </span>
              <span className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-emerald-500" />
                <span>USDT, BTC, ETH, SOL, TON via Cryptomus</span>
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-500" />
                <span>Instant Automatic Activation</span>
              </span>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Comparison table                                                  */}
        {/* ================================================================= */}
        <section className="border-b border-surface-border bg-surface-subtle/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Full Plan Feature Comparison
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Detailed side-by-side view of all features, limits, and capabilities.
              </p>
            </div>

            <div className="mt-8 overflow-x-auto rounded-2xl border border-surface-border bg-surface shadow-sm">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-subtle">
                    <th scope="col" className="w-2/5 px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Feature
                    </th>
                    {PLANS.map((plan) => (
                      <th
                        key={plan.id}
                        scope="col"
                        className="w-1/5 px-5 py-4 text-center text-xs font-bold uppercase tracking-wider"
                      >
                        <span className={plan.featured ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground'}>
                          {plan.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-surface-border">
                  {COMPARISON.map((group) => (
                    <Fragment key={group.section}>
                      <tr className="bg-surface-subtle/80">
                        <th
                          scope="colgroup"
                          colSpan={4}
                          className="px-6 py-2.5 text-left text-xs font-black uppercase tracking-wider text-foreground"
                        >
                          {group.section}
                        </th>
                      </tr>

                      {group.rows.map((row) => (
                        <tr
                          key={`${group.section}-${row.label}`}
                          className="hover:bg-surface-subtle/30 transition-colors"
                        >
                          <th
                            scope="row"
                            className="px-6 py-3.5 text-left text-xs font-medium text-foreground font-sans"
                          >
                            {row.label}
                          </th>
                          <td className="px-5 py-3.5 text-center">
                            <Cell value={row.free} />
                          </td>
                          <td className="bg-violet-500/5 px-5 py-3.5 text-center">
                            <Cell value={row.pro} />
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <Cell value={row.elite} />
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* FAQs                                                              */}
        {/* ================================================================= */}
        <section className="border-b border-surface-border">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Frequently Asked Questions</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Got a question? Our support desk is always ready to help.
              </p>
            </div>

            <dl className="mt-8 grid gap-5 md:grid-cols-2">
              {FAQS.map((faq) => (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-surface-border bg-surface p-6 shadow-sm space-y-2"
                >
                  <dt className="text-sm font-bold text-foreground">{faq.q}</dt>
                  <dd className="text-xs leading-relaxed text-muted-foreground">{faq.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Closing CTA                                                       */}
        {/* ================================================================= */}
        <section>
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl border border-surface-border bg-surface p-8 text-center shadow-elevated sm:p-12">
              <div
                className="pointer-events-none absolute left-1/2 top-[-8rem] h-72 w-[36rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
                style={{ background: 'radial-gradient(circle, var(--brand) 0%, transparent 70%)' }}
                aria-hidden="true"
              />

              <div className="relative mx-auto max-w-xl space-y-4">
                <Crown className="mx-auto h-8 w-8 text-violet-500" />
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Ready to track tonight&apos;s matches?
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Get started with free tracking in seconds, or activate Pro for unlimited live slips.
                </p>

                <div className="pt-2 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href="/live"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-violet-500/25 transition-opacity hover:opacity-90 sm:w-auto"
                  >
                    <span>Track Free</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/pro?plan=pro&cycle=monthly"
                    className="flex w-full items-center justify-center rounded-xl border border-surface-border bg-surface-subtle px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-surface-hover sm:w-auto"
                  >
                    Upgrade to Pro
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
