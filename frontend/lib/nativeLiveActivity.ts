'use client';

import type { Match } from '@/types';
import { formatClock, formatScore } from '@/lib/sportFormat';

let silentAudio: HTMLAudioElement | null = null;
let activeTrackedMatch: Match | null = null;
let canvasCache: HTMLCanvasElement | null = null;

/**
 * Generates dynamic 512x512 PNG artwork of the live scoreboard
 * for native iOS Lock Screen and Dynamic Island MediaSession display.
 */
export function generateScoreboardArtwork(match: Match): string {
  if (typeof window === 'undefined') return '/icons/icon-512.png';

  if (!canvasCache) {
    canvasCache = document.createElement('canvas');
    canvasCache.width = 512;
    canvasCache.height = 512;
  }

  const canvas = canvasCache;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '/icons/icon-512.png';

  // 1. Dark Futuristic Sports Gradient Background
  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, '#090d16');
  gradient.addColorStop(0.5, '#0f172a');
  gradient.addColorStop(1, '#020617');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle border glow
  ctx.strokeStyle = '#4f46e5';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 504, 504);

  // 2. Header: League & Live Indicator
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(48, 56, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LIVE ACTIVITY', 68, 64);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 20px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'right';
  const leagueName = match.league?.name ? match.league.name.slice(0, 24) : 'MATCH CENTER';
  ctx.fillText(leagueName, 464, 64);

  // Divider Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(32, 90);
  ctx.lineTo(480, 90);
  ctx.stroke();

  // 3. Team Names
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';

  const homeName = match.home_team.short_name || match.home_team.name;
  const awayName = match.away_team.short_name || match.away_team.name;

  ctx.fillText(homeName.slice(0, 14), 130, 200);
  ctx.fillText(awayName.slice(0, 14), 382, 200);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillText('HOME', 130, 235);
  ctx.fillText('AWAY', 382, 235);

  // 4. Giant Neon Score Center
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 84px monospace, system-ui';
  ctx.textAlign = 'center';
  const scoreText = `${match.home_score} - ${match.away_score}`;
  ctx.fillText(scoreText, 256, 320);

  // 5. Match Minute Pill
  const clockText = formatClock(match);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
  ctx.beginPath();
  ctx.roundRect(176, 365, 160, 48, 24);
  ctx.fill();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 24px monospace, system-ui';
  ctx.fillText(`⏱ ${clockText}`, 256, 398);

  // 6. Footer Branding
  ctx.fillStyle = '#6366f1';
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillText('SLIPRADAR LIVE ENGINE', 256, 475);

  return canvas.toDataURL('image/png');
}

/**
 * Initializes a looping silent audio track to keep the native iOS / Android
 * MediaSession lock-screen widget active when the screen is locked.
 */
function ensureSilentAudio(): HTMLAudioElement {
  if (!silentAudio && typeof window !== 'undefined') {
    // 1-second ultra-lightweight silent WAV data URI
    const silentWav =
      'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
    silentAudio = new Audio(silentWav);
    silentAudio.loop = true;
    silentAudio.volume = 0.01;
  }
  return silentAudio!;
}

/**
 * Starts the native iOS Lock Screen Live Activity via the W3C MediaSession API.
 * This displays the real-time match scoreboard on the native lock screen and Dynamic Island.
 */
export async function startNativeLiveActivity(match: Match): Promise<boolean> {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
    return false;
  }

  activeTrackedMatch = match;

  try {
    const audio = ensureSilentAudio();
    await audio.play();
  } catch (err) {
    console.warn('[NATIVE LIVE ACTIVITY] Audio playback required user gesture', err);
  }

  updateNativeLiveActivity(match);
  return true;
}

/**
 * Updates the native iOS / Android lock screen scoreboard in real-time.
 */
export function updateNativeLiveActivity(match: Match): void {
  if (typeof window === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }

  activeTrackedMatch = match;
  const clock = formatClock(match);
  const home = match.home_team.short_name || match.home_team.name;
  const away = match.away_team.short_name || match.away_team.name;
  const score = `${match.home_score} - ${match.away_score}`;

  const title = `⚽ ${home} ${score} ${away} (${clock})`;
  const artist = `${match.league?.name || 'Live Match'} · SlipRadar Live`;
  const album = `Live Activity · ${match.status}`;
  const artworkUrl = generateScoreboardArtwork(match);

  navigator.mediaSession.metadata = new MediaMetadata({
    title,
    artist,
    album,
    artwork: [
      { src: artworkUrl, sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  });

  // Handle native lock screen media action buttons
  try {
    navigator.mediaSession.setActionHandler('play', () => {
      if (silentAudio) silentAudio.play();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      if (silentAudio) silentAudio.pause();
    });
  } catch {
    // Some browsers do not support custom action handlers
  }

  // Update App Icon badge if supported
  if ('setAppBadge' in navigator) {
    try {
      const totalGoals = (match.home_score || 0) + (match.away_score || 0);
      (navigator as any).setAppBadge(totalGoals > 0 ? totalGoals : 1);
    } catch {
      // ignore
    }
  }
}

/**
 * Stops and tears down the native Lock Screen Live Activity.
 */
export function stopNativeLiveActivity(): void {
  activeTrackedMatch = null;

  if (silentAudio) {
    try {
      silentAudio.pause();
      silentAudio.currentTime = 0;
    } catch {
      // ignore
    }
  }

  if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
    navigator.mediaSession.metadata = null;
  }

  if (typeof window !== 'undefined' && 'clearAppBadge' in navigator) {
    try {
      (navigator as any).clearAppBadge();
    } catch {
      // ignore
    }
  }
}

/**
 * Returns the currently active match for native Live Activity, if any.
 */
export function getActiveNativeLiveMatch(): Match | null {
  return activeTrackedMatch;
}
