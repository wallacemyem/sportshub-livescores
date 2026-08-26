import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout',
  description:
    'Upgrade your SlipRadar plan with card, bank transfer or crypto.',
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
