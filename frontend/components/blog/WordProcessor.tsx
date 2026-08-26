'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { BlogPost, Match } from '@/types';
import { uploadToSupabaseStorage } from '@/lib/supabase';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Image as ImageIcon,
  Table as TableIcon,
  Link as LinkIcon,
  Quote,
  Code,
  Sparkles,
  Save,
  Send,
  Eye,
  FileText,
  HelpCircle,
  Subscript,
  Superscript,
  Highlighter,
  Palette,
  Minus,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Layers,
  Upload,
  Loader2,
  Search,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatClock } from '@/lib/sportFormat';

interface WordProcessorProps {
  initialPost?: Partial<BlogPost>;
  onSave: (postData: Partial<BlogPost>) => Promise<void>;
  matches?: Match[];
}

const FONTS = [
  { name: 'Inter (Sans-Serif)', value: 'Inter, sans-serif' },
  { name: 'Georgia (Serif)', value: 'Georgia, serif' },
  { name: 'Playfair Display', value: '"Playfair Display", serif' },
  { name: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Times New Roman', value: '"Times New Roman", serif' },
];

const HEADINGS = [
  { label: 'Normal Text', value: 'p' },
  { label: 'Heading 1 (Main Title)', value: 'h1' },
  { label: 'Heading 2 (Section)', value: 'h2' },
  { label: 'Heading 3 (Sub-section)', value: 'h3' },
  { label: 'Quote Callout', value: 'blockquote' },
  { label: 'Preformatted Code', value: 'pre' },
];

const CATEGORIES = [
  'Tactical Breakdown',
  'Transfer News',
  'Match Preview',
  'Post-Match Report',
  'Data & Analytics',
  'Betting Strategy',
  'Editorial Opinion',
];

export function WordProcessor({ initialPost, onSave, matches = [] }: WordProcessorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeRibbonTab, setActiveRibbonTab] = useState<'home' | 'insert' | 'layout' | 'review' | 'publish'>('home');
  const [title, setTitle] = useState(initialPost?.title || '');
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || '');
  const [category, setCategory] = useState(initialPost?.category || CATEGORIES[0]);
  const [tags, setTags] = useState(initialPost?.tags?.join(', ') || '');
  const [coverImage, setCoverImage] = useState(initialPost?.cover_image || '');
  const [authorName, setAuthorName] = useState(initialPost?.author_name || 'Chief Football Analyst');
  const [authorRole, setAuthorRole] = useState(initialPost?.author_role || 'Senior Sports Editor');
  const [selectedMatchId, setSelectedMatchId] = useState(initialPost?.match_id || '');
  const [matchSearchTerm, setMatchSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'a4' | 'fluid'>('a4');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [readingTime, setReadingTime] = useState(1);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [slug, setSlug] = useState(initialPost?.slug || '');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // AI Assistant State
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Initialize Editor Content
  useEffect(() => {
    if (editorRef.current && initialPost?.content_html) {
      editorRef.current.innerHTML = initialPost.content_html;
      calculateStats();
    }
  }, [initialPost?.content_html]);

  // Execute formatting command
  const format = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    calculateStats();
  };

  // Word & Character count calculation
  const calculateStats = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    setWordCount(words);
    setCharCount(chars);
    setReadingTime(Math.max(1, Math.ceil(words / 200)));
  }, []);

  // Auto-generate slug from title
  useEffect(() => {
    if (title && !initialPost?.slug) {
      const generated = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generated);
    }
  }, [title, initialPost?.slug]);

  // Insert Table
  const insertTable = (rows = 3, cols = 3) => {
    let tableHtml = '<table class="w-full my-4 border-collapse border border-slate-700 font-sans text-sm">';
    tableHtml += '<thead><tr class="bg-slate-800 text-slate-200">';
    for (let c = 1; c <= cols; c++) {
      tableHtml += `<th class="border border-slate-700 p-2 text-left font-bold">Header ${c}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';
    for (let r = 1; r <= rows; r++) {
      tableHtml += '<tr class="hover:bg-slate-800/40">';
      for (let c = 1; c <= cols; c++) {
        tableHtml += `<td class="border border-slate-700 p-2">Row ${r} Cell ${c}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p><br></p>';
    format('insertHTML', tableHtml);
  };

  // Insert Callout Box
  const insertCallout = (type: 'tip' | 'warning' | 'info' | 'quote') => {
    const styles = {
      tip: 'bg-emerald-950/60 border-l-4 border-emerald-500 text-emerald-200',
      warning: 'bg-amber-950/60 border-l-4 border-amber-500 text-amber-200',
      info: 'bg-cyan-950/60 border-l-4 border-cyan-500 text-cyan-200',
      quote: 'bg-purple-950/60 border-l-4 border-purple-500 text-purple-200 italic',
    }[type];

    const html = `<div class="my-4 p-4 rounded-r-lg ${styles} text-sm"><p><strong>${type.toUpperCase()}:</strong> Enter key insight or tactical note here...</p></div><p><br></p>`;
    format('insertHTML', html);
  };

  // Insert Live Match Scoreboard Embed
  const insertMatchEmbed = (matchId: string) => {
    const targetMatch = matches.find((m) => m.id === matchId) || matches[0];
    if (!targetMatch) return;

    const html = `
      <div class="match-embed-card my-6 p-4 rounded-xl bg-[#121824] border-2 border-emerald-500/50 shadow-neon-sm not-prose select-none" data-match-id="${targetMatch.id}">
        <div class="flex items-center justify-between text-xs text-slate-400 mb-2 pb-2 border-b border-slate-700">
          <span class="font-mono text-emerald-neon font-bold">🔴 LIVE EMBED: ${targetMatch.league.name}</span>
          <span class="font-mono font-bold text-white">${formatClock(targetMatch)}</span>
        </div>
        <div class="flex items-center justify-between py-2 font-sans font-bold text-base text-white">
          <span>${targetMatch.home_team.name}</span>
          <span class="font-mono text-xl bg-slate-900 px-3 py-1 rounded border border-emerald-500/40 text-emerald-neon">${targetMatch.home_score} : ${targetMatch.away_score}</span>
          <span>${targetMatch.away_team.name}</span>
        </div>
      </div>
      <p><br></p>
    `;
    format('insertHTML', html);
  };

  // Supabase Storage Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const filename = `blog-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const res = await uploadToSupabaseStorage(file, `articles/${filename}`, 'sports-assets');
      const publicUrl = res
        ? `https://sports-livescores.supabase.co/storage/v1/object/public/sports-assets/articles/${filename}`
        : URL.createObjectURL(file);

      format('insertHTML', `<div class="my-4 text-center"><img src="${publicUrl}" alt="${file.name}" class="rounded-xl mx-auto max-h-96 object-cover shadow-lg border border-slate-700"/><p class="text-xs text-slate-400 mt-1.5 italic">Figure: Uploaded match graphic</p></div><p><br></p>`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // AI Headline Generator
  const generateAiHeadlines = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      setAiSuggestions([
        `Tactical Masterclass: How Overloading the Half-Spaces Decided the Derby`,
        `High-Stakes Analysis: Why Late-Game xG Swings Are Defying Bookmaker Odds`,
        `The Anatomy of an Upset: Data Breakdown of Key Defensive Transitions`,
        `Championship DNA: How Tactical Adaptations Delivered 3 Critical Points`,
      ]);
      setIsGeneratingAi(false);
    }, 600);
  };

  // Save & Publish handler
  const handlePublish = async (status: 'published' | 'draft' = 'published') => {
    if (!title.trim()) {
      alert('Please provide an article title before publishing.');
      setActiveRibbonTab('publish');
      return;
    }

    setIsSubmitting(true);
    const contentHtml = editorRef.current?.innerHTML || '';

    const postData: Partial<BlogPost> = {
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      excerpt: excerpt || title,
      content_html: contentHtml,
      category,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      cover_image: coverImage,
      author_name: authorName,
      author_role: authorRole,
      match_id: selectedMatchId,
      status,
      read_time_min: readingTime,
    };

    try {
      await onSave(postData);
      setLastSaved(new Date().toLocaleTimeString());
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#FFFFFF', '#A1A1AA', '#71717A'],
      });
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface text-foreground rounded-2xl border border-surface-border overflow-hidden shadow-elevated">
      {/* 1. TOP APP BAR & TITLE */}
      <div className="bg-surface px-4 py-2 border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-surface-border flex items-center justify-center text-foreground font-black">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document Title (e.g. Tactical Breakdown: Arsenal vs Man City)"
              className="bg-transparent text-sm font-bold text-foreground focus:outline-none placeholder:text-muted-foreground w-80 md:w-96"
            />
            <p className="text-[10px] text-muted-foreground font-mono">
              Word-Style Sports Article Processor
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
              Saved at {lastSaved}
            </span>
          )}
          <button
            onClick={() => handlePublish('draft')}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 bg-surface-subtle hover:bg-surface-hover border border-surface-border px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          <button
            onClick={() => handlePublish('published')}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 bg-foreground hover:opacity-90 text-background font-bold px-4 py-1.5 rounded-lg text-xs uppercase tracking-wider transition-all shadow-subtle cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Publish Article</span>
          </button>
        </div>
      </div>

      {/* 2. RIBBON TABS */}
      <div className="bg-surface-subtle border-b border-surface-border px-4 flex items-center gap-1 text-xs select-none">
        {[
          { id: 'home', label: 'Home' },
          { id: 'insert', label: 'Insert' },
          { id: 'layout', label: 'Page Layout' },
          { id: 'review', label: 'Review & AI' },
          { id: 'publish', label: 'SEO & Metadata' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveRibbonTab(tab.id as any)}
            className={`px-4 py-2 font-bold transition-all border-b-2 cursor-pointer ${
              activeRibbonTab === tab.id
                ? 'border-foreground text-foreground bg-surface'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. RIBBON TOOLBAR CONTROLS */}
      <div className="bg-surface border-b border-surface-border p-2.5 overflow-x-auto scrollbar-none flex items-center gap-4 text-xs select-none">
        {/* HOME TAB CONTROLS */}
        {activeRibbonTab === 'home' && (
          <div className="flex items-center gap-3">
            {/* Font Family */}
            <select
              onChange={(e) => format('fontName', e.target.value)}
              className="bg-surface-subtle border border-surface-border text-foreground text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-foreground font-sans"
            >
              {FONTS.map((f) => (
                <option key={f.value} value={f.value}>{f.name}</option>
              ))}
            </select>

            {/* Headings */}
            <select
              onChange={(e) => format('formatBlock', `<${e.target.value}>`)}
              className="bg-surface-subtle border border-surface-border text-foreground text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-foreground font-sans"
            >
              {HEADINGS.map((h) => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>

            <div className="h-5 w-px bg-surface-border" />

            {/* Basic Styles: B, I, U, S */}
            <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-lg border border-surface-border">
              <button
                onClick={() => format('bold')}
                className="p-1.5 rounded hover:bg-surface-hover text-foreground"
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => format('italic')}
                className="p-1.5 rounded hover:bg-surface-hover text-foreground"
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => format('underline')}
                className="p-1.5 rounded hover:bg-surface-hover text-foreground"
                title="Underline (Ctrl+U)"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => format('strikeThrough')}
                className="p-1.5 rounded hover:bg-surface-hover text-foreground"
                title="Strikethrough"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sub/Super Script */}
            <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-lg border border-surface-border">
              <button
                onClick={() => format('subscript')}
                className="p-1.5 rounded hover:bg-surface-hover text-foreground"
                title="Subscript"
              >
                <Subscript className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => format('superscript')}
                className="p-1.5 rounded hover:bg-surface-hover text-foreground"
                title="Superscript"
              >
                <Superscript className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-5 w-px bg-surface-border" />

            {/* Alignment */}
            <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-lg border border-surface-border">
              <button onClick={() => format('justifyLeft')} className="p-1.5 rounded hover:bg-surface-hover text-foreground" title="Align Left">
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => format('justifyCenter')} className="p-1.5 rounded hover:bg-surface-hover text-foreground" title="Center">
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => format('justifyRight')} className="p-1.5 rounded hover:bg-surface-hover text-foreground" title="Align Right">
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => format('justifyFull')} className="p-1.5 rounded hover:bg-surface-hover text-foreground" title="Justify">
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Lists */}
            <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-lg border border-surface-border">
              <button onClick={() => format('insertUnorderedList')} className="p-1.5 rounded hover:bg-surface-hover text-foreground" title="Bullets">
                <List className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => format('insertOrderedList')} className="p-1.5 rounded hover:bg-surface-hover text-foreground" title="Numbering">
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => format('formatBlock', '<blockquote>')} className="p-1.5 rounded hover:bg-surface-hover text-foreground" title="Quote Block">
                <Quote className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* INSERT TAB CONTROLS */}
        {activeRibbonTab === 'insert' && (
          <div className="flex items-center gap-3">
            {/* Supabase Storage Image Upload */}
            <label className="flex items-center gap-1.5 bg-surface-subtle border border-surface-border text-foreground px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer font-bold">
              {isUploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>Upload to Supabase Storage</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>

            {/* Insert Table */}
            <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-lg border border-surface-border">
              <button
                onClick={() => insertTable(3, 3)}
                className="flex items-center gap-1 px-2.5 py-1 text-foreground rounded hover:bg-surface-hover cursor-pointer"
              >
                <TableIcon className="w-3.5 h-3.5" /> 3x3 Table
              </button>
            </div>

            {/* Insert Live Match Embed with Search Filter */}
            <div className="flex items-center gap-1.5 bg-surface-subtle px-2 py-1 rounded-lg border border-surface-border">
              <Zap className="w-3.5 h-3.5 text-foreground" />
              <Search className="w-3 h-3 text-muted-foreground" />
              <input
                type="text"
                value={matchSearchTerm}
                onChange={(e) => setMatchSearchTerm(e.target.value)}
                placeholder="Search game..."
                className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground w-20 sm:w-28 focus:outline-none"
              />
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    insertMatchEmbed(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="bg-surface border border-surface-border text-foreground text-xs rounded px-2 py-1 focus:outline-none max-w-[130px] sm:max-w-[200px]"
              >
                <option value="">Insert score widget...</option>
                {matches
                  .filter((m) => {
                    if (!matchSearchTerm.trim()) return true;
                    const q = matchSearchTerm.toLowerCase();
                    return (
                      m.home_team.name.toLowerCase().includes(q) ||
                      m.away_team.name.toLowerCase().includes(q) ||
                      m.league.name.toLowerCase().includes(q) ||
                      m.sport.toLowerCase().includes(q)
                    );
                  })
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.home_team.name} vs {m.away_team.name} ({formatClock(m)})
                    </option>
                  ))}
              </select>
            </div>

            {/* Callouts */}
            <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-lg border border-surface-border">
              <button onClick={() => insertCallout('tip')} className="px-2 py-1 text-foreground hover:bg-surface-hover rounded font-bold cursor-pointer">
                + Tip
              </button>
              <button onClick={() => insertCallout('warning')} className="px-2 py-1 text-muted-foreground hover:bg-surface-hover rounded font-bold cursor-pointer">
                + Warning
              </button>
              <button onClick={() => insertCallout('quote')} className="px-2 py-1 text-foreground hover:bg-surface-hover rounded font-bold cursor-pointer">
                + Quote
              </button>
            </div>
          </div>
        )}

        {/* LAYOUT TAB CONTROLS */}
        {activeRibbonTab === 'layout' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-surface-subtle p-1 rounded-lg border border-surface-border">
              <button
                onClick={() => setViewMode('a4')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
                  viewMode === 'a4' ? 'bg-foreground text-background shadow-subtle' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Document Sheet View (A4)
              </button>
              <button
                onClick={() => setViewMode('fluid')}
                className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
                  viewMode === 'fluid' ? 'bg-foreground text-background shadow-subtle' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Fluid Web View
              </button>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground pl-4 border-l border-surface-border">
              <span>Words: <strong className="text-foreground">{wordCount}</strong></span>
              <span>Characters: <strong className="text-foreground">{charCount}</strong></span>
              <span>Reading Time: <strong className="text-foreground">~{readingTime} min</strong></span>
            </div>
          </div>
        )}

        {/* REVIEW & AI TAB CONTROLS */}
        {activeRibbonTab === 'review' && (
          <div className="flex items-center gap-3">
            <button
              onClick={generateAiHeadlines}
              disabled={isGeneratingAi}
              className="flex items-center gap-1.5 bg-surface-subtle border border-surface-border text-foreground hover:bg-surface-hover px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer"
            >
              {isGeneratingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Generate Headline Suggestions</span>
            </button>

            {aiSuggestions.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {aiSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setTitle(s)}
                    className="bg-surface-subtle hover:bg-surface-hover border border-surface-border text-foreground px-2.5 py-1 rounded text-xs truncate max-w-xs transition-colors cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PUBLISH & METADATA TAB */}
        {activeRibbonTab === 'publish' && (
          <div className="flex items-center gap-3 w-full">
            <div className="grid grid-cols-4 gap-3 w-full">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">CATEGORY</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface-subtle border border-surface-border text-foreground text-xs rounded px-2 py-1 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">AUTHOR NAME</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full bg-surface-subtle border border-surface-border text-foreground text-xs rounded px-2 py-1 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">COVER IMAGE URL</label>
                <input
                  type="text"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="w-full bg-surface-subtle border border-surface-border text-foreground text-xs rounded px-2 py-1 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-0.5">LINKED MATCH FIXTURE</label>
                <select
                  value={selectedMatchId}
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                  className="w-full bg-surface-subtle border border-surface-border text-foreground text-xs rounded px-2 py-1 focus:outline-none"
                >
                  <option value="">None (General Article)</option>
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.home_team.name} vs {m.away_team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. MAIN EDITING CANVAS */}
      <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-background">
        <div
          className={`w-full transition-all duration-300 ${
            viewMode === 'a4'
              ? 'max-w-4xl bg-surface rounded-xl border border-surface-border shadow-elevated p-8 sm:p-12 min-h-[850px]'
              : 'max-w-6xl bg-surface rounded-xl border border-surface-border p-6 min-h-[650px]'
          }`}
        >
          {/* Article Title in Document */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground mb-6 pb-4 border-b border-surface-border">
            {title || 'Untitled Article'}
          </h1>

          {/* WYSIWYG Content Editable Area */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={calculateStats}
            data-placeholder="Type your story, paste statistics, or use the Insert tab to add live match widgets, tables, and callouts..."
            className="prose dark:prose-invert max-w-none focus:outline-none text-foreground text-base leading-relaxed min-h-[500px]"
          />
        </div>
      </div>

      {/* 5. STATUS BAR */}
      <div className="bg-surface border-t border-surface-border px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
            <span>Ready • English (US)</span>
          </span>
          <span>{wordCount} Words</span>
          <span>{charCount} Characters</span>
        </div>

        <div className="flex items-center gap-4">
          <span>Est. Reading Time: <strong className="text-foreground">{readingTime} min</strong></span>
          <span>Layout: <strong className="text-foreground">{viewMode.toUpperCase()}</strong></span>
        </div>
      </div>
    </div>
  );
}
