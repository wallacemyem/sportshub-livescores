package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/sports/livescores/internal/database"
)

type OddsHandler struct {
	store *database.Store
}

func NewOddsHandler(store *database.Store) *OddsHandler {
	return &OddsHandler{store: store}
}

func (h *OddsHandler) GetMatchOdds(w http.ResponseWriter, r *http.Request) {
	matchID := chi.URLParam(r, "id")
	match, ok := h.store.GetMatchByID(matchID)
	if !ok {
		http.Error(w, `{"error": "Match not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if match.Odds != nil {
		_ = json.NewEncoder(w).Encode(match.Odds)
	} else {
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"match_id": matchID,
			"message":  "No active odds snapshot available",
		})
	}
}
