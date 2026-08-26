import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support',
  description:
    'Knowledge base, ticket submission and live help for SlipRadar.',
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
