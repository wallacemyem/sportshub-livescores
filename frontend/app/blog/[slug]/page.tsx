'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BlogPost, Match } from '@/types';
import { MatchEmbed } from '@/components/blog/MatchEmbed';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  Eye,
  Heart,
  Share2,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, useScroll, useSpring } from 'framer-motion';
import { MobileNav } from '@/components/ui/MobileNav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function ArticleReaderPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    async function fetchArticle() {
      try {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const res = await fetch(`http://${host}:18443/api/v1/blog/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setPost(data);
          setLikes(data.likes || 0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    if (slug) fetchArticle();
  }, [slug]);

  const handleLike = async () => {
    if (!post) return;
    setLikes((prev) => prev + 1);
    setHasLiked(true);

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#F43F5E', '#FB7185', '#FDA4AF', '#3B82F6', '#8B5CF6'],
    });

    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      await fetch(`http://${host}:18443/api/v1/blog/${post.id}/like`, { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-mono text-sm">
        <span className="animate-pulse">Loading sports editorial...</span>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-bold">Article not found</p>
        <Link href="/blog" className="text-blue-600 underline text-sm">
          Back to Sports Editorial
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-24 md:pb-8">
      {/* Scroll Progress Bar */}
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 origin-left z-50"
      />

      {/* Top Navbar */}
      <header className="bg-surface/90 backdrop-blur-md border-b border-surface-border sticky top-0 z-40 px-4 lg:px-8 py-3 flex items-center justify-between">
        <Link
          href="/blog"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Stories</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />

          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              hasLiked
                ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
                : 'bg-surface-subtle hover:bg-surface-hover text-foreground border border-surface-border'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-white text-white' : 'text-rose-500'}`} />
            <span>{likes} Claps</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 bg-surface-subtle hover:bg-surface-hover border border-surface-border px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </header>

      {/* Main Article Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 lg:px-6 py-8 space-y-6">
        {/* Article Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {post.category}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" /> {post.read_time_min} min read
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground leading-tight tracking-tight">
            {post.title}
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {post.excerpt}
          </p>

          {/* Author & Meta Bar */}
          <div className="pt-3 border-t border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={post.author_avatar}
                alt={post.author_name}
                className="w-9 h-9 rounded-full object-cover border border-surface-border"
              />
              <div>
                <p className="text-xs sm:text-sm font-bold text-foreground">{post.author_name}</p>
                <p className="text-[11px] text-muted-foreground">{post.author_role || 'Sports Columnist'}</p>
              </div>
            </div>

            <div className="text-right text-xs text-muted-foreground font-mono">
              <p>{new Date(post.published_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <p className="text-[11px]">{post.views} views</p>
            </div>
          </div>
        </div>

        {/* Featured Cover Image */}
        {post.cover_image && (
          <div className="rounded-xl overflow-hidden aspect-[16/9] border border-surface-border shadow-subtle bg-surface-subtle">
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Embedded Live Match Scoreboard (If linked) */}
        {post.match && (
          <section>
            <MatchEmbed match={post.match} />
          </section>
        )}

        {/* Article Body Render */}
        <article
          className="prose dark:prose-invert max-w-none text-foreground text-base leading-relaxed font-sans"
          dangerouslySetInnerHTML={{ __html: post.content_html }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="pt-4 border-t border-surface-border flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground font-bold mr-1 font-mono">TAGS:</span>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs px-2.5 py-1 rounded-lg font-mono"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Clap & Reaction Footer Banner */}
        <div className="p-5 rounded-xl bg-surface border border-surface-border flex items-center justify-between shadow-subtle">
          <div>
            <h3 className="font-bold text-foreground text-sm">Enjoyed this tactical breakdown?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Give it claps or share with fellow sports fans.</p>
          </div>

          <button
            onClick={handleLike}
            className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-rose-500/20"
          >
            <Heart className="w-3.5 h-3.5 fill-white" />
            <span>Clap ({likes})</span>
          </button>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
