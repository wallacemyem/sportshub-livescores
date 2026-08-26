'use client';

import { useState, useEffect, useMemo } from 'react';
import { BlogPost } from '@/types';
import { BlogCard } from '@/components/blog/BlogCard';
import Link from 'next/link';
import {
  Newspaper,
  PenTool,
  Search,
  Activity,
} from 'lucide-react';
import { MobileNav } from '@/components/ui/MobileNav';
import { AppPageHeader } from '@/components/ui/AppPageHeader';
import { getApiBaseUrl } from '@/lib/api';

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
        const apiBase = getApiBaseUrl();
        const res = await fetch(`${apiBase}/blog`);
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
      <AppPageHeader
        icon={Newspaper}
        title="Blog"
        subtitle="Tactics, analysis and product notes"
        accentClassName="bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
        actions={
          <Link
            href="/blog/editor"
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-opacity hover:opacity-90"
          >
            <PenTool className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Write</span>
          </Link>
        }
      />

      {/* Main Content Feed */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 md:pl-20 xl:px-8 py-6 space-y-6">
        {/* Search + category filters.
            The search box lives here rather than in the header, where it had no room
            to sit beside the title and the write button on anything under a laptop. */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-1 order-2 overflow-x-auto scrollbar-none px-1 lg:order-1">
            <div className="flex w-max items-center gap-2">
              {CATEGORIES.map((c) => {
                const isSelected = selectedCategory === c;
                return (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    aria-current={isSelected ? 'page' : undefined}
                    className={`shrink-0 cursor-pointer whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                        : 'border border-surface-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative order-1 w-full shrink-0 lg:order-2 lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search analysis and tactics..."
              aria-label="Search articles"
              className="w-full rounded-lg border border-surface-border bg-surface-subtle py-2 pl-9 pr-3 text-xs text-foreground transition-colors placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none"
            />
          </div>
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

      {/* Mobile Bottom Navigation & Desktop Side Nav */}
      <MobileNav activeNav="blog" />
    </div>
  );
}
