import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Match',
  description:
    'Live scores, stats, timeline, lineups and odds for a single match.',
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
