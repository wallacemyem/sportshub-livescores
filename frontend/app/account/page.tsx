'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  User,
  Crown,
  ShieldCheck,
  Mail,
  Calendar,
  LogOut,
  ArrowRight,
  ExternalLink,
  Zap,
  Ticket,
  Headphones,
  Sliders,
} from 'lucide-react';
import Link from 'next/link';
import { MobileNav } from '@/components/ui/MobileNav';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { getAdminUrl } from '@/lib/api';

export default function AccountPage() {
  const { user, signOut, setProStatus } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const adminUrl = getAdminUrl();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-24 md:pb-12">
      {/* Header */}
      <AppPageHeader
        icon={User}
        title="Account"
        subtitle="Profile, plan and security"
        accentClassName="bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
      />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 md:pl-24 xl:px-6 py-8 space-y-6">
        {user ? (
          <>
            {/* Profile Overview Card */}
            <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-blue-500/20 shrink-0 overflow-hidden">
                    {user.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
                      {user.plan === 'pro' ? (
                        <span className="text-[10px] font-bold font-mono text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/15 border border-violet-300 dark:border-violet-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Crown className="w-3 h-3 text-violet-500" />
                          <span>PRO</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold font-mono text-muted-foreground bg-surface-subtle border border-surface-border px-2 py-0.5 rounded-full">
                          FREE FAN TIER
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{user.email}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-surface-subtle hover:bg-red-500/10 text-muted-foreground hover:text-red-500 border border-surface-border hover:border-red-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Subscription & Features Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Membership Status */}
              <div className="bg-surface border border-surface-border rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-violet-500" />
                    <h3 className="text-sm font-bold text-foreground">Membership Tier</h3>
                  </div>
                  <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                    Status: {user.plan.toUpperCase()}
                  </span>
                </div>

                {user.plan === 'pro' ? (
                  <div className="p-4 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-violet-800 dark:text-violet-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-violet-500" />
                      <span>Pro active</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Unlimited tracked slips, live cash-out value, and the pop-out and lock screen scoreboards.
                    </p>
                    <button
                      onClick={() => setProStatus(false)}
                      className="text-[10px] text-muted-foreground hover:text-red-500 underline pt-1 cursor-pointer"
                    >
                      (Demo) Revert to Free Plan
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-surface-subtle border border-surface-border rounded-xl space-y-3">
                    <div>
                      <p className="text-xs font-bold text-foreground">Upgrade to SlipRadar Pro</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Unlock bookmaker odds comparison, zero-delay live scores, and multi-bookmaker ticket loopers.
                      </p>
                    </div>
                    <Link
                      href="/pro?plan=pro&cycle=monthly"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm hover:opacity-90 transition-all"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>Upgrade to Pro ($9/mo)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>

              {/* Quick Launch & Admin Access */}
              <div className="bg-surface border border-surface-border rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-bold text-foreground">Administrative & Support Hub</h3>
                </div>

                <div className="space-y-2.5">
                  <a
                    href={adminUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-surface-subtle hover:bg-surface-hover border border-surface-border rounded-xl flex items-center justify-between transition-all group"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground group-hover:text-blue-500 transition-colors">
                        Admin Orchestrator Dashboard
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Port 19080 &bull; Telemetry, Webhooks & Quotas
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                  </a>

                  <Link
                    href="/support"
                    className="p-3 bg-surface-subtle hover:bg-surface-hover border border-surface-border rounded-xl flex items-center justify-between transition-all group"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground group-hover:text-blue-500 transition-colors">
                        Customer Helpdesk & Inquiries
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        View active support tickets & FAQs
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                  </Link>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Logged Out State */
          <div className="bg-surface border border-surface-border rounded-3xl p-10 text-center space-y-4 shadow-sm max-w-md mx-auto">
            <User className="w-12 h-12 text-muted-foreground mx-auto opacity-30" />
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">Sign In to Your Account</h2>
              <p className="text-xs text-muted-foreground">
                Access your profile, subscription tier, and synchronized betting slips.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/auth/login"
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="w-full sm:w-auto px-5 py-2.5 bg-surface-subtle hover:bg-surface-hover border border-surface-border text-foreground font-semibold text-xs rounded-xl transition-all"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
