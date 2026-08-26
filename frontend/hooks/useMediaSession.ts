'use client';

import { useEffect, useRef } from 'react';
import { Match } from '@/types';
import { formatClock, formatScore } from '@/lib/sportFormat';

export function useMediaSession(match: Match | null, isStreaming: boolean = true) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator) || !match) {
      return;
    }

    // Initialize silent looping audio element to maintain active media session
    if (!audioRef.current && isStreaming) {
      const audio = document.createElement('audio');
      // 1-second silent MP3 base64 data URI
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      audio.loop = true;
      audioRef.current = audio;
    }

    const title = `${match.home_team.name} ${formatScore(match)} ${match.away_team.name}`;
    const artist = `🔴 LIVE (${formatClock(match)}) • ${match.league.name}`;
    const album = `SlipRadar Live Match Center • ${match.venue || 'Stadium'}`;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: title,
      artist: artist,
      album: album,
      artwork: [
        {
          src: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=512&auto=format&fit=crop&q=80',
          sizes: '512x512',
          type: 'image/jpeg',
        },
      ],
    });

    // Action handlers
    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play().catch(() => {});
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause();
    });

    return () => {
      // Cleanup media metadata when unmounted
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [match?.id, match?.home_score, match?.away_score, match?.minute, match?.display_clock, match?.period, isStreaming]);
}
