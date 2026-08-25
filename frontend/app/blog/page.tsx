'use client';

import { useState, useEffect, useMemo } from 'react';
import { BlogPost } from '@/types';
import { BlogCard } from '@/components/blog/BlogCard';
import Link from 'next/link';
import {
  Newspaper,
  PenTool,
  Search,
  ArrowLeft,
  Activity,
} from 'lucide-react';
import { MobileNav } from '@/components/ui/MobileNav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const CATEGORIES = [
  'ALL',
  'Tactical Analysis',
  'Match Preview',
  'Post-Match Report',
  'Transfers & Rumors',
  'Betting & Odds Insights',
  'Basketball Analytics',
];

export default function BlogHubPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const res = await fetch(`http://${host}:18443/api/v1/blog`);
        if (res.ok) {
          const data = await res.json();
          setPosts(data.posts || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.author_name.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [posts, selectedCategory, searchQuery]);

  const featuredPost = posts[0];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-24 md:pb-8">
      {/* Editorial Navigation Header */}
      <header className="bg-surface/90 backdrop-blur-md border-b border-surface-border sticky top-0 z-40 px-4 lg:px-8 md:pl-20 xl:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" />
            <span>Scores</span>
          </Link>

          <div className="h-4 w-px bg-surface-border" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
              <Newspaper className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-foreground tracking-tight flex items-center gap-1.5 font-mono">
                EDITORIAL
              </h1>
              <p className="text-[10px] text-muted-foreground">Tactics & Analytics</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="hidden sm:flex items-center relative w-56 md:w-64">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search analysis, tactics..."
              className="w-full bg-surface-subtle border border-surface-border focus:border-blue-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors"
            />
          </div>

          <ThemeToggle />

          <Link
            href="/blog/editor"
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-lg shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Write Story</span>
            <span className="sm:hidden">Write</span>
          </Link>
        </div>
      </header>

      {/* Main Content Feed */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 md:pl-20 xl:px-8 py-6 space-y-6">
        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {CATEGORIES.map((c) => {
            const isSelected = selectedCategory === c;
            return (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'bg-surface border border-surface-border text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* Featured Story Hero Card */}
        {featuredPost && selectedCategory === 'ALL' && !searchQuery && (
          <section>
            <BlogCard post={featuredPost} featured />
          </section>
        )}

        {/* Regular Articles Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 font-mono">
              <Activity className="w-4 h-4 text-blue-500" />
              <span>Latest Insights ({filteredPosts.length})</span>
            </h2>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="p-12 text-center bg-surface border border-surface-border rounded-xl">
              <Newspaper className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-foreground font-bold text-sm">No stories found</p>
              <p className="text-muted-foreground text-xs mt-1">Try adjusting your search query or category filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
