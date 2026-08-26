import Link from 'next/link';
import { Logo } from './Logo';

const FOOTER_COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: 'Product',
    links: [
      { href: '/live', label: 'Live scores' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/pro', label: 'Upgrade to Pro' },
      { href: '/blog', label: 'Blog' },
    ],
  },
  {
    heading: 'Sports',
    links: [
      { href: '/live?sport=soccer', label: 'Soccer' },
      { href: '/live?sport=basketball', label: 'Basketball' },
      { href: '/live?sport=tennis', label: 'Tennis' },
      { href: '/live?sport=nfl', label: 'NFL' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/support', label: 'Support' },
      { href: '/account', label: 'Account' },
      { href: '/auth/register', label: 'Create account' },
      { href: '/auth/login', label: 'Sign in' },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-surface-border bg-surface-subtle/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo size="sm" href="/" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Paste a booking code and watch every leg of your slip settle in real time — across
              SportyBet, Bet9ja, 1xBet and BetKing.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                {column.heading}
              </h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-surface-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SlipRadar. Scores and odds are provided for
            information only.
          </p>
          <p className="text-xs text-muted-foreground">
            18+. SlipRadar tracks bets you already placed — it does not accept wagers.
          </p>
        </div>
      </div>
    </footer>
  );
}
