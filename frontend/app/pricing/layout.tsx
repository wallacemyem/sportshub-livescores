import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'SlipRadar plans: track one slip free forever, or upgrade for unlimited slips, live cash-out valuation, pop-out scoreboards and full odds comparison.',
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
