import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in',
  description:
    'Sign in to SlipRadar or create an account to start tracking slips.',
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
