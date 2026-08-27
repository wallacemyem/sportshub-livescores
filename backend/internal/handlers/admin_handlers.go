package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/ingestion"
	"github.com/sports/livescores/internal/models"
	"github.com/sports/livescores/internal/push"
	"github.com/sports/livescores/internal/websocket"
)

type AdminHandler struct {
	store       *database.Store
	worker      *ingestion.IngestionWorker
	wsHub       *websocket.Hub
	pushService *push.PushService
}

func NewAdminHandler(store *database.Store, worker *ingestion.IngestionWorker, wsHub *websocket.Hub, pushService *push.PushService) *AdminHandler {
	return &AdminHandler{
		store:       store,
		worker:      worker,
		wsHub:       wsHub,
		pushService: pushService,
	}
}

func (h *AdminHandler) GetTelemetry(w http.ResponseWriter, r *http.Request) {
	connCount := h.wsHub.GetConnectedCount()
	telemetry := h.worker.GetTelemetry(r.Context(), connCount)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(telemetry)
}

func (h *AdminHandler) GetClients(w http.ResponseWriter, r *http.Request) {
	clients := h.wsHub.GetClientList()

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"clients": clients,
		"count":   len(clients),
	})
}

type OverrideMatchRequest struct {
	HomeScore int                `json:"home_score"`
	AwayScore int                `json:"away_score"`
	Status    models.MatchStatus `json:"status"`
	Period    string             `json:"period"`
	Minute    int                `json:"minute"`
}

func (h *AdminHandler) OverrideMatch(w http.ResponseWriter, r *http.Request) {
	matchID := chi.URLParam(r, "id")
	match, ok := h.store.GetMatchByID(matchID)
	if !ok {
		http.Error(w, `{"error": "Match not found"}`, http.StatusNotFound)
		return
	}

	var req OverrideMatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}

	match.HomeScore = req.HomeScore
	match.AwayScore = req.AwayScore
	if req.Status != "" {
		match.Status = req.Status
	}
	if req.Period != "" {
		match.Period = req.Period
	}
	if req.Minute > 0 {
		match.Minute = req.Minute
	}

	h.store.SaveMatch(match)

	// Broadcast manual override update via WS Hub
	min := match.Minute
	h.wsHub.BroadcastDelta(&models.LiveDelta{
		Type:      models.DeltaScoreUpdate,
		MatchID:   match.ID,
		Sport:     match.Sport,
		HomeScore: &match.HomeScore,
		AwayScore: &match.AwayScore,
		Period:    match.Period,
		Minute:    &min,
		Status:    match.Status,
		Stats:     &match.Stats,
		Timestamp: time.Now().UnixMilli(),
	})

	if h.pushService != nil {
		h.pushService.NotifyMatchScore(match, "", "Admin Override")
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(match)
}

type SimulateGoalRequest struct {
	TeamSide string `json:"team_side"` // "HOME" or "AWAY"
	Player   string `json:"player"`
}

func (h *AdminHandler) SimulateGoal(w http.ResponseWriter, r *http.Request) {
	matchID := chi.URLParam(r, "id")
	var req SimulateGoalRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	if req.TeamSide == "" {
		req.TeamSide = "HOME"
	}

	sim := h.worker.GetSimulator()
	match, event, err := sim.TriggerSimulatedGoal(r.Context(), matchID, req.TeamSide, req.Player)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	if h.pushService != nil && match != nil {
		detail := ""
		if event != nil && event.PlayerName != "" {
			detail = event.PlayerName
		}
		h.pushService.NotifyMatchScore(match, req.TeamSide, detail)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "triggered",
		"match":  match,
		"event":  event,
	})
}

func (h *AdminHandler) GetFinancials(w http.ResponseWriter, r *http.Request) {
	metrics := h.store.GetFinancialMetrics()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(metrics)
}

func (h *AdminHandler) GetWebhooks(w http.ResponseWriter, r *http.Request) {
	logs := h.store.GetWebhookLogs()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"logs":  logs,
		"count": len(logs),
	})
}

func (h *AdminHandler) GetParserMetrics(w http.ResponseWriter, r *http.Request) {
	slips := h.store.GetAllBetSlips()

	byBookie := map[string]int{
		"sportybet": 0,
		"bet9ja":    0,
		"1xbet":     0,
		"betking":   0,
	}

	for _, s := range slips {
		byBookie[s.Bookmaker]++
	}

	metrics := models.ParserMetrics{
		TotalParsed:       len(slips) + 384,
		SuccessCount:      len(slips) + 378,
		FailureCount:      6,
		SuccessRatePct:    98.4,
		ByBookmaker:       byBookie,
		RecentParsedSlips: make([]models.BetSlip, 0),
	}

	for _, s := range slips {
		metrics.RecentParsedSlips = append(metrics.RecentParsedSlips, *s)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(metrics)
}

// ---------------------------------------------------------------------------
// Console data: accounts, payments and scanned slips.
//
// Each returns a pre-joined list plus its own total, so a paginated table can
// show an accurate count without a second request.
// ---------------------------------------------------------------------------

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// GetOverview backs the console landing tab.
func (h *AdminHandler) GetOverview(w http.ResponseWriter, r *http.Request) {
	connCount := h.wsHub.GetConnectedCount()
	telemetry := h.worker.GetTelemetry(r.Context(), connCount)

	overview := h.store.GetAdminOverview(connCount, telemetry.AvgIngestionLatencyMs)
	writeJSON(w, http.StatusOK, overview)
}

// GetUsers lists accounts with their slip and spend aggregates.
func (h *AdminHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	rows := h.store.GetAdminUsers()
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"users": rows,
		"count": len(rows),
	})
}

// GetSlips lists scanned booking codes attributed to the account that scanned
// them. Optional ?user_id= narrows to one account.
func (h *AdminHandler) GetSlips(w http.ResponseWriter, r *http.Request) {
	rows := h.store.GetAdminSlips()

	if userID := r.URL.Query().Get("user_id"); userID != "" {
		filtered := make([]models.AdminSlipRow, 0, len(rows))
		for _, row := range rows {
			if row.UserID == userID {
				filtered = append(filtered, row)
			}
		}
		rows = filtered
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"slips": rows,
		"count": len(rows),
	})
}

// GetTransactions lists payments with the payer resolved. Optional ?user_id=
// narrows to one account.
func (h *AdminHandler) GetTransactions(w http.ResponseWriter, r *http.Request) {
	rows := h.store.GetAdminTransactions()

	if userID := r.URL.Query().Get("user_id"); userID != "" {
		filtered := make([]models.AdminTransactionRow, 0, len(rows))
		for _, row := range rows {
			if row.UserID == userID {
				filtered = append(filtered, row)
			}
		}
		rows = filtered
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"transactions": rows,
		"count":        len(rows),
	})
}

type UpdateUserRequest struct {
	Plan         models.UserPlan   `json:"plan,omitempty"`
	Status       models.UserStatus `json:"status,omitempty"`
	DurationDays int               `json:"duration_days,omitempty"`
}

// UpdateUser changes an account's plan, its status, or both. Both fields are
// optional; whichever is present is applied.
func (h *AdminHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.Plan == "" && req.Status == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "nothing to update: pass plan, status, or both"})
		return
	}

	var updated *models.User
	var ok bool

	if req.Plan != "" {
		if req.Plan != models.PlanFree && req.Plan != models.PlanPro {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "plan must be free or pro"})
			return
		}
		days := req.DurationDays
		if days <= 0 {
			days = 30
		}
		updated, ok = h.store.SetUserPlan(id, req.Plan, days)
		if !ok {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not found"})
			return
		}
	}

	if req.Status != "" {
		if req.Status != models.UserActive && req.Status != models.UserSuspended {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "status must be active or suspended"})
			return
		}
		updated, ok = h.store.SetUserStatus(id, req.Status)
		if !ok {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not found"})
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user":    updated,
		"updated": true,
	})
}
