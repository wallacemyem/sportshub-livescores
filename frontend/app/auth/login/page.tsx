'use client';

import { useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Logo } from '@/components/brand/Logo';

function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/live';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    const res = await signIn(email.trim(), password);
    setIsLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      if (res.user?.is_admin && redirectUrl === '/live') {
        router.push('/admin');
      } else {
        router.push(redirectUrl);
      }
    }
  };

  return (
    <div className="w-full max-w-md bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 shadow-xl relative z-10 space-y-6">
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 mb-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Secure SlipRadar Authentication</span>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-foreground">Welcome Back</h2>
        <p className="text-xs text-muted-foreground">
          Sign in to access live scores, track bet slips, and manage your account.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-foreground mb-1.5 font-mono uppercase tracking-wider">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full pl-10 pr-3.5 py-2.5 bg-surface-subtle border border-surface-border focus:border-blue-500 focus:bg-surface rounded-xl text-xs sm:text-sm text-foreground focus:outline-none transition-all"
              required
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-foreground font-mono uppercase tracking-wider">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 bg-surface-subtle border border-surface-border focus:border-blue-500 focus:bg-surface rounded-xl text-xs sm:text-sm text-foreground focus:outline-none transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !email.trim() || !password.trim()}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <span>{isLoading ? 'Signing In...' : 'Sign In to Account'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>

      <div className="pt-2 border-t border-surface-border text-center text-xs text-muted-foreground">
        <span>Don&apos;t have an account? </span>
        <Link href="/auth/register" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
          Create Account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-surface-border">
        <Logo size="sm" href="/" tagline="Track every slip live" />
        <ThemeToggle />
      </header>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute -left-20 top-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-20 bottom-1/4 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <Suspense fallback={<div className="text-center text-xs text-muted-foreground">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
