package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/sports/livescores/internal/auth"
	"github.com/sports/livescores/internal/cache"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/ingestion"
	"github.com/sports/livescores/internal/models"
)

type MatchHandler struct {
	store      *database.Store
	redis      *cache.RedisService
	apiSports  *ingestion.APISportsClient
	jwtSecret  string
	singleMu   sync.Mutex
	inProgress map[string]chan struct{}
}

func NewMatchHandler(
	store *database.Store,
	redis *cache.RedisService,
	apiSports *ingestion.APISportsClient,
	jwtSecret string,
) *MatchHandler {
	return &MatchHandler{
		store:      store,
		redis:      redis,
		apiSports:  apiSports,
		jwtSecret:  jwtSecret,
		inProgress: make(map[string]chan struct{}),
	}
}

// extractUserPlan extracts plan ("free", "pro", "elite") from token/cookie
func (h *MatchHandler) extractUserPlan(r *http.Request) models.UserPlan {
	var tokenStr string
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
	} else if cookie, err := r.Cookie("slipradar_token"); err == nil {
		tokenStr = cookie.Value
	}

	if tokenStr != "" && h.jwtSecret != "" {
		if claims, err := auth.ValidateToken(tokenStr, h.jwtSecret); err == nil {
			if user, exists := h.store.GetUser(claims.UserID); exists {
				return user.Plan
			}
			return claims.Plan
		}
	}
	return models.PlanFree
}

// GetMatches returns match fixtures, utilizing Redis buffer zone where available
func (h *MatchHandler) GetMatches(w http.ResponseWriter, r *http.Request) {
	sport := models.SportType(r.URL.Query().Get("sport"))
	status := models.MatchStatus(r.URL.Query().Get("status"))

	matches := h.store.GetAllMatches(sport, status)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"matches": matches,
		"count":   len(matches),
	})
}

// GetMatchByID returns rich match details, first checking Redis buffer zone
func (h *MatchHandler) GetMatchByID(w http.ResponseWriter, r *http.Request) {
	matchID := chi.URLParam(r, "id")
	ctx := r.Context()

	// 1. Check Redis Buffer Zone first (<1ms response, 0 API quota used)
	if h.redis != nil {
		if cachedMatch, err := h.redis.GetMatchDetails(ctx, matchID); err == nil && cachedMatch != nil {
			// Populate lineups/stats if not already in payload
			if cachedMatch.Lineups == nil {
				if l, err := h.redis.GetMatchLineups(ctx, matchID); err == nil {
					cachedMatch.Lineups = l
				}
			}
			if cachedMatch.H2H == nil {
				if h2h, err := h.redis.GetMatchH2H(ctx, matchID); err == nil {
					cachedMatch.H2H = h2h
				}
			}
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT-REDIS-BUFFER")
			_ = json.NewEncoder(w).Encode(cachedMatch)
			return
		}
	}

	// 2. Lookup in database store
	match, ok := h.store.GetMatchByID(matchID)
	if !ok {
		http.Error(w, `{"error": "Match not found"}`, http.StatusNotFound)
		return
	}

	// 3. Hydrate with rich lineups and comprehensive stats from API-Sports if available
	if h.apiSports != nil {
		if lineups, err := h.apiSports.FetchLineups(ctx, match.Sport, matchID); err == nil && lineups != nil {
			if len(lineups.Home.StartingXI) > 0 || len(lineups.Away.StartingXI) > 0 {
				match.Lineups = lineups
				if h.redis != nil {
					_ = h.redis.SetMatchLineups(ctx, matchID, lineups, 15*time.Minute)
				}
			}
		}
		if stats, err := h.apiSports.FetchComprehensiveStats(ctx, match.Sport, matchID); err == nil && stats != nil {
			if stats.PossessionHome > 0 || stats.ShotsHome > 0 || stats.TotalYardsHome > 0 || stats.FieldGoalsHome != "" || stats.HitsHome > 0 {
				match.Stats = *stats
				if h.redis != nil {
					_ = h.redis.SetMatchStats(ctx, matchID, stats, 5*time.Minute)
				}
			}
		}
		if h2h, err := h.apiSports.FetchHeadToHead(ctx, match.Sport, match.HomeTeam.ID, match.AwayTeam.ID); err == nil && h2h != nil {
			if len(h2h.Matches) > 0 {
				match.H2H = h2h
				if h.redis != nil {
					_ = h.redis.SetMatchH2H(ctx, matchID, h2h, 2*time.Hour)
				}
			}
		}
	}

	// Store fully hydrated match in Redis buffer
	if h.redis != nil {
		_ = h.redis.SetMatchDetails(ctx, matchID, match, 10*time.Minute)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Cache", "MISS-HYDRATED")
	_ = json.NewEncoder(w).Encode(match)
}

// GetMatchLineups returns starting XI, substitutes, coach info, and player photos
func (h *MatchHandler) GetMatchLineups(w http.ResponseWriter, r *http.Request) {
	matchID := chi.URLParam(r, "id")
	ctx := r.Context()

	// 1. Check Redis Buffer Zone
	if h.redis != nil {
		if lineups, err := h.redis.GetMatchLineups(ctx, matchID); err == nil && lineups != nil {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT-REDIS-BUFFER")
			_ = json.NewEncoder(w).Encode(lineups)
			return
		}
	}

	// 2. Fetch from API-Sports
	var sport models.SportType = models.SportSoccer
	if match, ok := h.store.GetMatchByID(matchID); ok {
		sport = match.Sport
	}

	if h.apiSports != nil {
		lineups, err := h.apiSports.FetchLineups(ctx, sport, matchID)
		if err == nil && lineups != nil && (len(lineups.Home.StartingXI) > 0 || len(lineups.Away.StartingXI) > 0) {
			if h.redis != nil {
				_ = h.redis.SetMatchLineups(ctx, matchID, lineups, 15*time.Minute)
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(lineups)
			return
		}
	}

	http.Error(w, `{"error": "Lineups not available for this match"}`, http.StatusNotFound)
}

// GetMatchStats returns comprehensive statistics (xG, passes, tackles, rebounds, etc.)
func (h *MatchHandler) GetMatchStats(w http.ResponseWriter, r *http.Request) {
	matchID := chi.URLParam(r, "id")
	ctx := r.Context()

	// 1. Check Redis Buffer Zone
	if h.redis != nil {
		if stats, err := h.redis.GetMatchStats(ctx, matchID); err == nil && stats != nil {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT-REDIS-BUFFER")
			_ = json.NewEncoder(w).Encode(stats)
			return
		}
	}

	// 2. Fetch from API-Sports
	var sport models.SportType = models.SportSoccer
	if match, ok := h.store.GetMatchByID(matchID); ok {
		sport = match.Sport
	}

	if h.apiSports != nil {
		stats, err := h.apiSports.FetchComprehensiveStats(ctx, sport, matchID)
		if err == nil && stats != nil {
			if h.redis != nil {
				_ = h.redis.SetMatchStats(ctx, matchID, stats, 5*time.Minute)
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(stats)
			return
		}
	}

	// Fallback to match stats in store
	if match, ok := h.store.GetMatchByID(matchID); ok {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(match.Stats)
		return
	}

	http.Error(w, `{"error": "Statistics not available"}`, http.StatusNotFound)
}

// GetMatchPlayerStats returns player ratings and stats with headshots
func (h *MatchHandler) GetMatchPlayerStats(w http.ResponseWriter, r *http.Request) {
	matchID := chi.URLParam(r, "id")
	ctx := r.Context()

	// 1. Check Redis Buffer Zone
	if h.redis != nil {
		if pstats, err := h.redis.GetMatchPlayerStats(ctx, matchID); err == nil && pstats != nil {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT-REDIS-BUFFER")
			_ = json.NewEncoder(w).Encode(pstats)
			return
		}
	}

	// 2. Fetch from API-Sports
	var sport models.SportType = models.SportSoccer
	if match, ok := h.store.GetMatchByID(matchID); ok {
		sport = match.Sport
	}

	if h.apiSports != nil {
		pstats, err := h.apiSports.FetchPlayerStats(ctx, sport, matchID)
		if err == nil && pstats != nil {
			if h.redis != nil {
				_ = h.redis.SetMatchPlayerStats(ctx, matchID, pstats, 15*time.Minute)
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(pstats)
			return
		}
	}

	http.Error(w, `{"error": "Player stats not available"}`, http.StatusNotFound)
}

// GetMatchH2H returns head to head past encounters
func (h *MatchHandler) GetMatchH2H(w http.ResponseWriter, r *http.Request) {
	matchID := chi.URLParam(r, "id")
	ctx := r.Context()

	// 1. Check Redis Buffer Zone
	if h.redis != nil {
		if h2h, err := h.redis.GetMatchH2H(ctx, matchID); err == nil && h2h != nil {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT-REDIS-BUFFER")
			_ = json.NewEncoder(w).Encode(h2h)
			return
		}
	}

	// 2. Fetch from API-Sports
	homeID, awayID := "", ""
	var sport models.SportType = models.SportSoccer
	if match, ok := h.store.GetMatchByID(matchID); ok {
		homeID = match.HomeTeam.ID
		awayID = match.AwayTeam.ID
		sport = match.Sport
	}

	if h.apiSports != nil {
		h2h, err := h.apiSports.FetchHeadToHead(ctx, sport, homeID, awayID)
		if err == nil && h2h != nil {
			if h.redis != nil {
				_ = h.redis.SetMatchH2H(ctx, matchID, h2h, 2*time.Hour)
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(h2h)
			return
		}
	}

	http.Error(w, `{"error": "Head to head data not available"}`, http.StatusNotFound)
}

// GetAPISportsQuota reports quota metrics and remaining budget
func (h *MatchHandler) GetAPISportsQuota(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if h.redis != nil {
		if q, err := h.redis.GetQuotaInfo(ctx); err == nil && q != nil {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(q)
			return
		}
	}

	if h.apiSports != nil {
		used, limit, rem := h.apiSports.GetQuotaInfo()
		quota := &models.APISportsQuota{
			Plan:        "pro_multi_sport",
			RequestsDay: limit,
			UsedDay:     used,
			Remaining:   rem,
			ResetAt:     time.Now().UTC().Truncate(24*time.Hour).Add(24 * time.Hour),
			LastUpdated: time.Now(),
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(quota)
		return
	}

	http.Error(w, `{"error": "API-Sports not configured"}`, http.StatusServiceUnavailable)
}

func (h *MatchHandler) GetLeagues(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"leagues": database.InitialLeagues,
	})
}

func (h *MatchHandler) GetSports(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"sports": database.InitialSports,
	})
}

func (h *MatchHandler) DeleteMatch(w http.ResponseWriter, r *http.Request) {
	matchID := chi.URLParam(r, "id")
	deleted := h.store.DeleteMatch(matchID)
	w.Header().Set("Content-Type", "application/json")
	if !deleted {
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Match not found"})
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "Match removed successfully",
		"id":      matchID,
	})
}

func (h *MatchHandler) ClearAllMatches(w http.ResponseWriter, r *http.Request) {
	count := h.store.ClearAllMatches()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":        "success",
		"message":       "All matches cleared successfully",
		"cleared_count": count,
	})
}
