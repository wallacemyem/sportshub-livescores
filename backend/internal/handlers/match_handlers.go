package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/models"
)

type MatchHandler struct {
	store *database.Store
}

func NewMatchHandler(store *database.Store) *MatchHandler {
	return &MatchHandler{store: store}
}

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

func (h *MatchHandler) GetMatchByID(w http.ResponseWriter, r *http.Request) {
	matchID := chi.URLParam(r, "id")
	match, ok := h.store.GetMatchByID(matchID)
	if !ok {
		http.Error(w, `{"error": "Match not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(match)
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
