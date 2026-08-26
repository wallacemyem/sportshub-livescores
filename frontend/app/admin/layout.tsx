import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin console',
  description:
    'Ingestion telemetry, match orchestration, revenue and the support queue.',
};

export default function SegmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
