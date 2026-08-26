import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account',
  description:
    'Manage your SlipRadar profile, plan and security settings.',
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
