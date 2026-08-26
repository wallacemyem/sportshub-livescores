import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search & Ticket Importer | SlipRadar',
  description:
    'Search matches, teams, leagues and import sportsbook booking tickets to track real-time accumulators.',
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
