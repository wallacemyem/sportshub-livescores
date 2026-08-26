'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  Server,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowLeft,
  ArrowRight,
  Database,
  Radio,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getAdminUrl } from '@/lib/api';

export default function AdminLauncherPage() {
  const [adminUrl, setAdminUrl] = useState('http://localhost:19080');

  useEffect(() => {
    setAdminUrl(getAdminUrl());
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Header */}
      <header className="bg-surface/90 backdrop-blur-md border-b border-surface-border sticky top-0 z-40 px-4 lg:px-8 md:pl-20 xl:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Scores Feed</span>
          </Link>

          <div className="h-4 w-px bg-surface-border" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-foreground tracking-tight font-mono">
                ADMIN CONTROL CENTER
              </h1>
              <p className="text-[10px] text-muted-foreground">Port 19080 &bull; Cloudflare Kumo Dashboard</p>
            </div>
          </div>
        </div>

        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 md:pl-24 xl:px-6 py-10 flex items-center justify-center">
        <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-10 shadow-xl max-w-2xl w-full space-y-6 text-center relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/25">
            <Server className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Admin Service Online &bull; Port 19080</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">
              SportsHub Orchestrator & Admin Console
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
              The Admin Dashboard runs on a dedicated high-performance isolated container port (<strong>19080</strong>) featuring real-time API poller telemetry, webhook inspection, financial metrics, and live ticket resolution.
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="bg-surface-subtle border border-surface-border p-3 rounded-xl">
              <p className="text-[10px] font-mono text-muted-foreground uppercase">Port</p>
              <p className="text-base font-bold text-foreground font-mono">19080</p>
            </div>
            <div className="bg-surface-subtle border border-surface-border p-3 rounded-xl">
              <p className="text-[10px] font-mono text-muted-foreground uppercase">Backend</p>
              <p className="text-base font-bold text-foreground font-mono">18443</p>
            </div>
            <div className="bg-surface-subtle border border-surface-border p-3 rounded-xl">
              <p className="text-[10px] font-mono text-muted-foreground uppercase">Database</p>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">Postgres 16</p>
            </div>
            <div className="bg-surface-subtle border border-surface-border p-3 rounded-xl">
              <p className="text-[10px] font-mono text-muted-foreground uppercase">Broker</p>
              <p className="text-base font-bold text-violet-600 dark:text-violet-400 font-mono">Redis 7</p>
            </div>
          </div>

          {/* Launch Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={adminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Launch Admin Dashboard</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3.5 bg-surface-subtle hover:bg-surface-hover border border-surface-border text-foreground font-semibold text-xs rounded-2xl transition-all"
            >
              Back to Scores
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
