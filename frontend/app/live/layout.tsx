import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live scores',
  description:
    'Live scores and bet slip tracking across soccer, basketball, tennis, NFL, cricket, baseball and golf.',
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
