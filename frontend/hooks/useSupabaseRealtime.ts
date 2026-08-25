'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Match, MatchEvent, BetSlip } from '@/types';

interface UseSupabaseRealtimeProps {
  onMatchUpdate?: (match: Partial<Match>) => void;
  onNewEvent?: (event: MatchEvent) => void;
  onBetSlipUpdate?: (slip: BetSlip) => void;
}

export function useSupabaseRealtime({
  onMatchUpdate,
  onNewEvent,
  onBetSlipUpdate,
}: UseSupabaseRealtimeProps = {}) {
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  useEffect(() => {
    // 1. Subscribe to Matches table changes
    const matchChannel = supabase
      .channel('supabase-realtime-matches')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        (payload) => {
          if (payload.new && onMatchUpdate) {
            onMatchUpdate(payload.new as Partial<Match>);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_events' },
        (payload) => {
          if (payload.new && onNewEvent) {
            onNewEvent(payload.new as MatchEvent);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bet_slips' },
        (payload) => {
          if (payload.new && onBetSlipUpdate) {
            onBetSlipUpdate(payload.new as BetSlip);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeActive(true);
        }
      });

    return () => {
      supabase.removeChannel(matchChannel);
    };
  }, [onMatchUpdate, onNewEvent, onBetSlipUpdate]);

  return { isRealtimeActive };
}
