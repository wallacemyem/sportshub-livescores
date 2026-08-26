'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { Check, Minus, ArrowRight, Crown, Sparkles, CreditCard, Coins } from 'lucide-react';
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
    tagline: 'For following one slip on a match night.',
    monthly: 0,
    annual: 0,
    cta: 'Start tracking',
    href: '/live',
    highlights: [
      '1 tracked slip at a time',
      'Live scores across all 7 sports',
      'Goal and card alerts',
      'Consensus odds',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For anyone with more than one slip running.',
    monthly: 9,
    annual: 86,
    cta: 'Upgrade to Pro',
    href: '/pro',
    featured: true,
    highlights: [
      'Unlimited tracked slips',
      'Live cash-out valuation',
      'Pop-out and lock screen scoreboards',
      'Full bookmaker odds comparison',
      'Priority support',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    tagline: 'For traders who need the raw feed.',
    monthly: 29,
    annual: 279,
    cta: 'Go Elite',
    href: '/pro',
    highlights: [
      'Everything in Pro',
      'Raw WebSocket delta feed',
      'REST API access and webhooks',
      'Slip history export',
      'Same-day engineering support',
    ],
  },
];

type Availability = true | false | string;

const COMPARISON: { section: string; rows: { label: string; free: Availability; pro: Availability; elite: Availability }[] }[] = [
  {
    section: 'Slip tracking',
    rows: [
      { label: 'Concurrent tracked slips', free: '1', pro: 'Unlimited', elite: 'Unlimited' },
      { label: 'Supported sportsbooks', free: '6', pro: '6', elite: '6' },
      { label: 'Automatic booking-code detection', free: true, pro: true, elite: true },
      { label: 'Live cash-out valuation', free: false, pro: true, elite: true },
      { label: 'Slip history and export', free: false, pro: '90 days', elite: 'Unlimited' },
    ],
  },
  {
    section: 'Live data',
    rows: [
      { label: 'Sports covered', free: '7', pro: '7', elite: '7' },
      { label: 'Score update method', free: 'Polled', pro: 'Live socket', elite: 'Live socket' },
      { label: '2D pitch and court view', free: true, pro: true, elite: true },
      { label: 'Bookmaker odds comparison', free: 'Consensus only', pro: true, elite: true },
      { label: 'Raw delta feed access', free: false, pro: false, elite: true },
    ],
  },
  {
    section: 'Alerts and displays',
    rows: [
      { label: 'Goal and red-card alerts', free: true, pro: true, elite: true },
      { label: 'Cash-out swing alerts', free: false, pro: true, elite: true },
      { label: 'Pop-out floating scoreboard', free: false, pro: true, elite: true },
      { label: 'Lock screen live widget', free: false, pro: true, elite: true },
    ],
  },
  {
    section: 'Support',
    rows: [
      { label: 'Knowledge base', free: true, pro: true, elite: true },
      { label: 'Email support', free: 'Best effort', pro: 'Priority', elite: 'Same day' },
      { label: 'API and webhooks', free: false, pro: false, elite: true },
    ],
  },
];

const FAQS = [
  {
    q: 'Does SlipRadar place bets for me?',
    a: 'No. SlipRadar is read-only. It decodes a booking code you already created at your sportsbook and follows the fixtures on that slip. It never places, edits or cashes out a bet, and it never asks for your betting account password.',
  },
  {
    q: 'What happens when I hit the free plan limit?',
    a: 'Nothing breaks. Your tracked slip keeps running. Adding a second one prompts you to upgrade, and you can swap which slip is active as often as you like on the free plan.',
  },
  {
    q: 'How does annual billing work?',
    a: 'Annual plans are charged once for twelve months and work out around 20 percent cheaper than paying monthly. Switching between cycles takes effect at your next renewal.',
  },
  {
    q: 'Which payment methods are supported?',
    a: 'Cards and bank transfer through Flutterwave, and USDT, BTC, ETH, SOL or TON through Cryptomus. Crypto payments activate as soon as the transaction confirms on-chain, usually inside a minute.',
  },
  {
    q: 'Can I cancel at any time?',
    a: 'Yes, from your account page, with no cancellation step to talk anyone out of. You keep paid access until the end of the cycle you have already paid for.',
  },
  {
    q: 'Is the cash-out figure the same as my bookmaker offers?',
    a: 'No, and it should not be treated as one. It is SlipRadar’s own estimate from live match state, shown so you can see which way your slip is moving. The binding number is always the one in your sportsbook.',
  },
];

function Cell({ value }: { value: Availability }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center" title="Included">
        <Check className="h-4 w-4 text-emerald-500" />
        <span className="sr-only">Included</span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center" title="Not included">
        <Minus className="h-4 w-4 text-muted-foreground/50" />
        <span className="sr-only">Not included</span>
      </span>
    );
  }
  return <span className="text-xs font-semibold text-foreground">{value}</span>;
}

export default function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>('monthly');

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <MarketingHeader />

      <main className="flex-1">
        {/* ================================================================= */}
        {/* Header and billing switch                                         */}
        {/* ================================================================= */}
        <section className="relative overflow-hidden border-b border-surface-border">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

          <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-[color:var(--brand)]" />
                <span>Simple plans, no per-slip fees</span>
              </span>

              <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">
                Pricing that scales with your slips
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
                Start free and stay free for a single slip. Upgrade when you want several running at
                once, live cash-out value, and the pop-out scoreboard.
              </p>
            </div>

            {/* Billing cycle toggle */}
            <div className="mt-10 flex justify-center">
              <div
                role="radiogroup"
                aria-label="Billing cycle"
                className="inline-flex items-center gap-1 rounded-2xl border border-surface-border bg-surface p-1 shadow-sm"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={cycle === 'monthly'}
                  onClick={() => setCycle('monthly')}
                  className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                    cycle === 'monthly'
                      ? 'bg-brand-gradient text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={cycle === 'annual'}
                  onClick={() => setCycle('annual')}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                    cycle === 'annual'
                      ? 'bg-brand-gradient text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>Annual</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${
                      cycle === 'annual'
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                    }`}
                  >
                    -20%
                  </span>
                </button>
              </div>
            </div>

            {/* Plan cards */}
            <div className="mt-12 grid gap-6 lg:grid-cols-3 lg:items-start">
              {PLANS.map((plan) => {
                const price = cycle === 'monthly' ? plan.monthly : plan.annual;
                const isFree = plan.monthly === 0;

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-3xl border bg-surface p-6 shadow-sm sm:p-7 ${
                      plan.featured
                        ? 'border-[var(--brand)] shadow-elevated lg:-mt-3 lg:pt-9'
                        : 'border-surface-border'
                    }`}
                  >
                    {/* The badge sits in the border, centred, so it cannot land on the plan name */}
                    {plan.featured && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-gradient px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                        Most popular
                      </span>
                    )}

                    <div>
                      <h2 className="text-lg font-black tracking-tight">{plan.name}</h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {plan.tagline}
                      </p>
                    </div>

                    <div className="mt-6 flex items-baseline gap-1.5">
                      <span className="font-mono text-4xl font-black tracking-tight">
                        {isFree ? 'Free' : `$${price}`}
                      </span>
                      {!isFree && (
                        <span className="text-sm font-medium text-muted-foreground">
                          /{cycle === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 min-h-[1.25rem] text-xs text-muted-foreground">
                      {isFree
                        ? 'Free forever, no card required'
                        : cycle === 'annual'
                          ? `Billed once a year — about $${(plan.annual / 12).toFixed(2)} a month`
                          : 'Billed monthly, cancel any time'}
                    </p>

                    <Link
                      href={
                        isFree ? plan.href : `${plan.href}?plan=${plan.id}&cycle=${cycle}`
                      }
                      className={`mt-6 flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all ${
                        plan.featured
                          ? 'bg-brand-gradient text-white shadow-lg shadow-indigo-500/25 hover:opacity-90'
                          : 'border border-surface-border bg-surface-subtle text-foreground hover:bg-surface-hover'
                      }`}
                    >
                      <span>{plan.cta}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>

                    <ul className="mt-7 space-y-3 border-t border-surface-border pt-6">
                      {plan.highlights.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <span className="leading-relaxed text-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                Cards and bank transfer via Flutterwave
              </span>
              <span className="flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5" />
                USDT, BTC, ETH, SOL and TON via Cryptomus
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
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Everything, side by side
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                The full breakdown, so you can see exactly where the paid line sits.
              </p>
            </div>

            {/* Scrolls inside itself on narrow screens rather than pushing the page sideways */}
            <div className="mt-10 overflow-x-auto rounded-2xl border border-surface-border bg-surface shadow-sm">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-subtle">
                    <th scope="col" className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Feature
                    </th>
                    {PLANS.map((plan) => (
                      <th
                        key={plan.id}
                        scope="col"
                        className="w-[140px] px-5 py-4 text-center text-xs font-bold uppercase tracking-wider"
                      >
                        <span className={plan.featured ? 'text-[color:var(--brand)]' : 'text-muted-foreground'}>
                          {plan.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {COMPARISON.map((group) => (
                    <Fragment key={group.section}>
                      <tr className="border-b border-surface-border bg-surface-subtle/60">
                        <th
                          scope="colgroup"
                          colSpan={4}
                          className="px-5 py-2.5 text-left text-[11px] font-black uppercase tracking-wider text-foreground"
                        >
                          {group.section}
                        </th>
                      </tr>

                      {group.rows.map((row) => (
                        <tr
                          key={`${group.section}-${row.label}`}
                          className="border-b border-surface-border last:border-0"
                        >
                          <th
                            scope="row"
                            className="px-5 py-3.5 text-left text-sm font-medium text-foreground"
                          >
                            {row.label}
                          </th>
                          <td className="px-5 py-3.5 text-center">
                            <Cell value={row.free} />
                          </td>
                          <td className="bg-[var(--brand-soft)] px-5 py-3.5 text-center">
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
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Questions</h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Anything else, the{' '}
                <Link href="/support" className="font-semibold text-[color:var(--brand)] underline underline-offset-4">
                  support desk
                </Link>{' '}
                answers in a few minutes.
              </p>
            </div>

            <dl className="mt-10 grid gap-5 md:grid-cols-2">
              {FAQS.map((faq) => (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-surface-border bg-surface p-6 shadow-sm"
                >
                  <dt className="text-sm font-bold text-foreground">{faq.q}</dt>
                  <dd className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{faq.a}</dd>
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

              <div className="relative mx-auto max-w-xl">
                <Crown className="mx-auto h-8 w-8 text-[color:var(--brand)]" />
                <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                  Try it on tonight&apos;s slip
                </h2>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  The free plan needs no card. If it earns a place on your second screen, upgrading
                  takes about a minute.
                </p>

                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href="/live"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-opacity hover:opacity-90 sm:w-auto"
                  >
                    <span>Track a slip free</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/pro?plan=pro&cycle=monthly"
                    className="flex w-full items-center justify-center rounded-2xl border border-surface-border bg-surface-subtle px-6 py-3.5 text-sm font-bold text-foreground transition-colors hover:bg-surface-hover sm:w-auto"
                  >
                    Go straight to Pro
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
