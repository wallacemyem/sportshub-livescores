import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Ticket,
  Radio,
  Bell,
  LineChart,
  PictureInPicture2,
  Smartphone,
  ShieldCheck,
  Zap,
  Check,
  Layers,
} from 'lucide-react';
import { MarketingHeader } from '@/components/brand/MarketingHeader';
import { MarketingFooter } from '@/components/brand/MarketingFooter';
import { BookmakerIcon } from '@/components/brand/BookmakerLogo';

export const metadata: Metadata = {
  title: 'SlipRadar | Track every bet slip live',
  description:
    'Paste a booking code from SportyBet, Bet9ja, 1xBet or BetKing and watch every leg of your accumulator settle in real time, with live cash-out value and instant goal alerts.',
};

const BOOKMAKERS = ['SportyBet', 'Bet9ja', '1xBet', 'BetKing', 'MSport', 'MozzartBet'];

const STEPS = [
  {
    step: '01',
    icon: Ticket,
    title: 'Paste your booking code',
    body: 'One code is all we need. SlipRadar loops every supported sportsbook until it finds the slip, so you never have to say which one it came from.',
  },
  {
    step: '02',
    icon: Radio,
    title: 'Every leg goes live',
    body: 'Each selection is matched to its fixture and streamed over a persistent socket. Scores, clocks and settlement states update the instant they change.',
  },
  {
    step: '03',
    icon: Bell,
    title: 'Know before the crowd',
    body: 'Goal alerts, red cards and cash-out swings reach your lock screen while the broadcast is still catching up.',
  },
];

const FEATURES = [
  {
    icon: Layers,
    title: 'Multi-book slip engine',
    body: 'Auto-detects and decodes booking codes across six sportsbooks, resolving every leg to a live fixture.',
  },
  {
    icon: LineChart,
    title: 'Live cash-out value',
    body: 'A running estimate of what your slip is worth right now, modelled from live scores, clock and match momentum.',
  },
  {
    icon: Zap,
    title: 'Socket-speed scores',
    body: 'Delta updates over a persistent connection instead of polling, so the score moves the moment the ball does.',
  },
  {
    icon: PictureInPicture2,
    title: 'Pop-out scoreboard',
    body: 'A native always-on-top window that floats over whatever else you are doing. No tab switching, no refreshing.',
  },
  {
    icon: Smartphone,
    title: 'Lock screen widget',
    body: 'Live clock and scoreline on your phone lock screen through the Media Session API, with your phone in your pocket.',
  },
  {
    icon: ShieldCheck,
    title: 'Odds you can check',
    body: 'Consensus pricing and bookmaker-by-bookmaker comparison, so you can see where a line actually moved.',
  },
];

const SPORTS = ['Soccer', 'Basketball', 'Tennis', 'NFL', 'Cricket', 'Baseball', 'Golf'];

const FREE_HIGHLIGHTS = [
  'Track one slip at a time',
  'Live scores across all seven sports',
  'Goal and red-card alerts',
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <MarketingHeader />

      <main className="flex-1">
        {/* ================================================================= */}
        {/* Hero                                                              */}
        {/* ================================================================= */}
        <section className="relative overflow-hidden border-b border-surface-border">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
          <div
            className="pointer-events-none absolute left-1/2 top-[-14rem] h-[26rem] w-[46rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
            style={{ background: 'radial-gradient(circle, var(--brand) 0%, transparent 68%)' }}
            aria-hidden="true"
          />

          <div className="relative mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span>Six sportsbooks. Seven sports. One screen.</span>
              </span>

              <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
                Your slip is live.
                <br />
                <span className="text-brand-gradient">Watch it settle.</span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Paste a booking code and SlipRadar finds every leg, follows every fixture, and tells
                you what your accumulator is worth right now — without opening six betting apps.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/live"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-opacity hover:opacity-90 sm:w-auto"
                >
                  <Ticket className="h-4 w-4" />
                  <span>Track a slip free</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-surface-border bg-surface px-6 py-3.5 text-sm font-bold text-foreground shadow-sm transition-colors hover:bg-surface-subtle sm:w-auto"
                >
                  See pricing
                </Link>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                No card required. Your first slip tracks in about ten seconds.
              </p>
            </div>

            {/* Bookmaker Brand Showcase */}
            <div className="mt-16">
              <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Instant Automatic Decoding Across Major Sportsbooks
              </p>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { id: 'sportybet', name: 'SportyBet', format: '6-8 Chars', badge: 'Auto-Sync' },
                  { id: 'bet9ja', name: 'Bet9ja', format: 'Alphanumeric', badge: 'Fast Parse' },
                  { id: '1xbet', name: '1xBet', format: 'Slip ID', badge: 'Multi-Leg' },
                  { id: 'betking', name: 'BetKing', format: 'Code Zone', badge: 'Realtime' },
                  { id: 'msport', name: 'MSport', format: 'Auto Format', badge: 'Live Settle' },
                  { id: 'mozzartbet', name: 'MozzartBet', format: 'Multi-Match', badge: 'Instant' },
                ].map((book) => (
                  <div
                    key={book.id}
                    className="group relative flex flex-col items-center justify-center p-3.5 rounded-2xl border border-surface-border bg-surface hover:border-violet-500/50 hover:shadow-lg transition-all"
                  >
                    <BookmakerIcon id={book.id} className="w-8 h-8 rounded-lg shadow-sm group-hover:scale-110 transition-transform" />
                    <span className="mt-2 text-xs font-bold text-foreground">{book.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{book.format}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* How it works                                                      */}
        {/* ================================================================= */}
        <section className="border-b border-surface-border">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Three steps, then it runs itself
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                There is nothing to configure and no legs to enter by hand.
              </p>
            </div>

            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              {STEPS.map(({ step, icon: Icon, title, body }) => (
                <li
                  key={step}
                  className="relative rounded-2xl border border-surface-border bg-surface p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--brand-ring)] bg-[var(--brand-soft)] text-[color:var(--brand)]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-2xl font-black text-surface-hover">{step}</span>
                  </div>
                  <h3 className="mt-5 text-base font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Features                                                          */}
        {/* ================================================================= */}
        <section className="border-b border-surface-border bg-surface-subtle/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Built for the ninety minutes that matter
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Everything below is in the product today, on free and paid plans alike unless the
                pricing page says otherwise.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-surface-border bg-surface p-6 shadow-sm transition-shadow hover:shadow-elevated"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--brand-ring)] bg-[var(--brand-soft)] text-[color:var(--brand)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-base font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Covering
              </span>
              {SPORTS.map((sport) => (
                <span
                  key={sport}
                  className="rounded-lg border border-surface-border bg-surface px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                >
                  {sport}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Closing CTA                                                       */}
        {/* ================================================================= */}
        <section>
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl border border-surface-border bg-surface p-8 shadow-elevated sm:p-12">
              <div
                className="pointer-events-none absolute right-[-6rem] top-[-6rem] h-72 w-72 rounded-full opacity-20 blur-3xl"
                style={{ background: 'radial-gradient(circle, var(--brand) 0%, transparent 70%)' }}
                aria-hidden="true"
              />

              <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
                <div>
                  <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                    Start with the free plan
                  </h2>
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
                    Track a slip, see the live cash-out estimate, and decide later whether you want
                    more than one running at a time.
                  </p>

                  <ul className="mt-6 space-y-2.5">
                    {FREE_HIGHLIGHTS.map((item) => (
                      <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <Link
                    href="/live"
                    className="flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-opacity hover:opacity-90"
                  >
                    <span>Open the tracker</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="flex items-center justify-center rounded-2xl border border-surface-border bg-surface-subtle px-6 py-3.5 text-sm font-bold text-foreground transition-colors hover:bg-surface-hover"
                  >
                    Compare plans
                  </Link>
                  <p className="text-center text-xs text-muted-foreground">
                    Cancel a paid plan any time, from your account page.
                  </p>
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
