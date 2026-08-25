'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BlogPost, Match } from '@/types';
import { WordProcessor } from '@/components/blog/WordProcessor';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ExternalLink } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function BlogEditorPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const res = await fetch(`http://${host}:18443/api/v1/matches`);
        if (res.ok) {
          const data = await res.json();
          setMatches(data.matches || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchMatches();
  }, []);

  const handleSavePost = async (postData: Partial<BlogPost>) => {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const res = await fetch(`http://${host}:18443/api/v1/blog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
    });

    if (!res.ok) {
      throw new Error('Failed to save article');
    }

    const saved: BlogPost = await res.json();
    setPublishedSlug(saved.slug);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-4">
      {/* Top Breadcrumb Bar */}
      <div className="max-w-7xl mx-auto w-full mb-3 flex items-center justify-between">
        <Link
          href="/blog"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Editor to Editorial Feed</span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {publishedSlug && (
            <div className="flex items-center gap-2 bg-surface-subtle border border-surface-border text-foreground px-3 py-1 rounded-lg text-xs font-mono animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Story Published!</span>
              <Link
                href={`/blog/${publishedSlug}`}
                className="underline font-bold hover:opacity-80 flex items-center gap-0.5 ml-1"
              >
                View Live <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Full Word Processor Component */}
      <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col">
        <WordProcessor onSave={handleSavePost} matches={matches} />
      </div>
    </div>
  );
}
