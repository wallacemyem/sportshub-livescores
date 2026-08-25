'use client';

import React from 'react';
import { BlogPost } from '@/types';
import Link from 'next/link';
import { Clock, Eye, Heart } from 'lucide-react';

interface BlogCardProps {
  post: BlogPost;
  featured?: boolean;
}

export function BlogCard({ post, featured }: BlogCardProps) {
  const isFeatured = Boolean(featured);

  if (isFeatured) {
    return (
      <div className="group relative bg-surface border border-surface-border hover:border-blue-300 dark:hover:border-blue-700 rounded-2xl overflow-hidden shadow-subtle hover:shadow-lg transition-all">
        <Link href={`/blog/${post.slug}`} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 relative aspect-[16/10] overflow-hidden bg-surface-subtle">
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-4 left-4">
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider px-3 py-1 rounded-full shadow-md shadow-blue-500/20 font-mono">
                Featured Story
              </span>
            </div>
            <div className="absolute bottom-4 left-4 bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs text-foreground border border-surface-border font-mono flex items-center gap-1.5 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{post.read_time_min} min read</span>
            </div>
          </div>

          <div className="lg:col-span-5 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/30">
                  {post.category}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(post.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              <h2 className="text-xl lg:text-2xl font-black text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                {post.title}
              </h2>

              <p className="text-muted-foreground text-sm mt-3 line-clamp-3 leading-relaxed">
                {post.excerpt}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={post.author_avatar}
                  alt={post.author_name}
                  className="w-8 h-8 rounded-full object-cover border border-surface-border"
                />
                <div>
                  <p className="text-xs font-bold text-foreground">{post.author_name}</p>
                  <p className="text-[10px] text-muted-foreground">{post.author_role || 'Sports Writer'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{post.views}</span>
                </span>
                <span className="flex items-center gap-1 text-rose-500">
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                  <span>{post.likes}</span>
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="group bg-surface border border-surface-border hover:border-blue-300 dark:hover:border-blue-700 rounded-xl overflow-hidden shadow-subtle hover:shadow-lg transition-all flex flex-col justify-between">
      <Link href={`/blog/${post.slug}`} className="flex flex-col h-full">
        <div className="relative aspect-[16/9] overflow-hidden bg-surface-subtle">
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3">
            <span className="bg-surface/90 backdrop-blur-sm text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/30 font-mono shadow-sm">
              {post.category}
            </span>
          </div>
          <div className="absolute bottom-3 right-3 bg-surface/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-foreground font-mono flex items-center gap-1 border border-surface-border shadow-sm">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span>{post.read_time_min}m</span>
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
              {post.title}
            </h3>
            <p className="text-muted-foreground text-xs mt-2 line-clamp-2 leading-relaxed">
              {post.excerpt}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={post.author_avatar}
                alt={post.author_name}
                className="w-6 h-6 rounded-full object-cover border border-surface-border"
              />
              <span className="text-[11px] font-semibold text-foreground truncate">{post.author_name}</span>
            </div>

            <div className="flex items-center gap-2.5 text-[11px] font-mono text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Eye className="w-3 h-3" />
                <span>{post.views}</span>
              </span>
              <span className="flex items-center gap-0.5 text-rose-500">
                <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                <span>{post.likes}</span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
