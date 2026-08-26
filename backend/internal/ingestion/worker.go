package ingestion

import (
	"context"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/sports/livescores/internal/cache"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/models"
)

type IngestionWorker struct {
	store             *database.Store
	redis             *cache.RedisService
	espnClient        *ESPNClient
	oddsClient        *OddsAPIClient
	simulator         *Simulator
	simulationEnabled bool
	mu                sync.RWMutex
	activePollers     int
	avgLatencyMs      float64
	broadcastsCount   int
	espnPollCount     int
	stopChan          chan struct{}
}

func NewIngestionWorker(
	store *database.Store,
	redis *cache.RedisService,
	espnBaseURL string,
	oddsBaseURL string,
	oddsAPIKey string,
	simEnabled bool,
) *IngestionWorker {
	espn := NewESPNClient(espnBaseURL)
	odds := NewOddsAPIClient(oddsBaseURL, oddsAPIKey)
	sim := NewSimulator(store, redis)

	return &IngestionWorker{
		store:             store,
		redis:             redis,
		espnClient:        espn,
		oddsClient:        odds,
		simulator:         sim,
		simulationEnabled: simEnabled,
		activePollers:     len(ActiveESPNLeagues),
		avgLatencyMs:      15.0,
		stopChan:          make(chan struct{}),
	}
}

func (w *IngestionWorker) Start(ctx context.Context) {
	log.Printf("[INGESTION] Starting multi-tier data ingestion workers (Real ESPN & Odds Ingestion, Simulation: %v)", w.simulationEnabled)

	// Run initial ingestion immediately
	go w.pollESPN(ctx)
	go w.pollOdds(ctx)

	// 1. Live Match Poller / ESPN Ingestion (10s interval)
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				start := time.Now()
				w.pollESPN(ctx)
				if w.simulationEnabled {
					w.simulator.TickLiveMatches(ctx)
				}
				elapsed := time.Since(start).Milliseconds()

				w.mu.Lock()
				w.avgLatencyMs = float64(elapsed)*0.1 + w.avgLatencyMs*0.9
				w.broadcastsCount += len(ActiveESPNLeagues)
				w.mu.Unlock()

			case <-w.stopChan:
				return
			case <-ctx.Done():
				return
			}
		}
	}()

	// 2. Upcoming Fixture & Odds API Poller (60s interval)
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				w.pollOdds(ctx)
			case <-w.stopChan:
				return
			case <-ctx.Done():
				return
			}
		}
	}()
}

func (w *IngestionWorker) pollESPN(ctx context.Context) {
	for _, l := range ActiveESPNLeagues {
		resp, err := w.espnClient.FetchScoreboard(ctx, l.SportPath, l.LeaguePath)
		if err != nil {
			continue
		}

		w.mu.Lock()
		w.espnPollCount++
		w.mu.Unlock()

		for _, evt := range resp.Events {
			match := ConvertESPNToMatch(evt, l)
			if match != nil {
				// Retain existing odds if already present in store
				if existing, ok := w.store.GetMatchByID(match.ID); ok && existing.Odds != nil && match.Odds == nil {
					match.Odds = existing.Odds
				}

				w.store.SaveMatch(match)
				_ = w.redis.SetLiveMatchState(ctx, match)

				hScore := match.HomeScore
				aScore := match.AwayScore
				min := match.Minute

				delta := &models.LiveDelta{
					Type:      models.DeltaScoreUpdate,
					MatchID:   match.ID,
					Sport:     match.Sport,
					HomeScore: &hScore,
					AwayScore: &aScore,
					Minute:    &min,
					Period:    match.Period,
					Status:    match.Status,
					Stats:     &match.Stats,
					Timestamp: time.Now().UnixMilli(),
				}
				_ = w.redis.PublishDelta(ctx, match.ID, match.League.ID, delta)
			}
		}
	}
}

func (w *IngestionWorker) pollOdds(ctx context.Context) {
	for _, sportKey := range ActiveOddsSports {
		oddsMatches, err := w.oddsClient.FetchOdds(ctx, sportKey)
		if err != nil || len(oddsMatches) == 0 {
			continue
		}

		for _, om := range oddsMatches {
			mOdds := ConvertOddsAPIToMatchOdds(om)
			if mOdds == nil {
				continue
			}

			// Try to match with existing match in store by team names
			matches := w.store.GetAllMatches("", "")
			for _, m := range matches {
				if strings.Contains(strings.ToLower(m.HomeTeam.Name), strings.ToLower(om.HomeTeam)) ||
					strings.Contains(strings.ToLower(om.HomeTeam), strings.ToLower(m.HomeTeam.Name)) ||
					strings.Contains(strings.ToLower(m.AwayTeam.Name), strings.ToLower(om.AwayTeam)) ||
					strings.Contains(strings.ToLower(om.AwayTeam), strings.ToLower(m.AwayTeam.Name)) {
					mOdds.MatchID = m.ID
					w.store.UpdateOdds(m.ID, mOdds)
					break
				}
			}
		}
	}
}

func (w *IngestionWorker) Stop() {
	close(w.stopChan)
}

func (w *IngestionWorker) GetSimulator() *Simulator {
	return w.simulator
}

func (w *IngestionWorker) GetTelemetry(ctx context.Context, connectedClients int) models.IngestionMetrics {
	w.mu.RLock()
	defer w.mu.RUnlock()

	oddsUsed, oddsTotal := w.oddsClient.GetQuotaInfo()
	keysCount, memMB := w.redis.GetMetrics(ctx)

	return models.IngestionMetrics{
		ActivePollers:         w.activePollers,
		ESPNPollingRateSec:    10,
		OddsAPIPollingRateSec: 60,
		ESPNQuotaUsed:         w.espnPollCount,
		ESPNQuotaLimit:        50000,
		OddsAPIQuotaUsed:      oddsUsed,
		OddsAPIQuotaLimit:     oddsTotal,
		AvgIngestionLatencyMs: w.avgLatencyMs,
		RedisKeysCount:        keysCount,
		RedisMemoryUsedMB:     memMB,
		ConnectedClients:      connectedClients,
		BroadcastsPerMinute:   w.broadcastsCount * 6,
		LastUpdated:           time.Now(),
	}
}
