import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Match analysis, betting explainers and product notes from the SlipRadar team.',
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
