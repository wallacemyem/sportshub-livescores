import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Bet Tickets | SlipRadar',
  description:
    'Import sportsbook booking codes and monitor multi-leg accumulator cashouts and live odds in real-time.',
};

export default function TicketsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
