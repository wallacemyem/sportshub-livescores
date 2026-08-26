package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/parser"
)

type BetSlipHandler struct {
	store  *database.Store
	parser *parser.BetSlipParser
}

func NewBetSlipHandler(store *database.Store, p *parser.BetSlipParser) *BetSlipHandler {
	return &BetSlipHandler{
		store:  store,
		parser: p,
	}
}

type ImportSlipRequest struct {
	Bookmaker   string `json:"bookmaker"`
	BookingCode string `json:"booking_code"`
}

func (h *BetSlipHandler) ImportBetSlip(w http.ResponseWriter, r *http.Request) {
	var req ImportSlipRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}

	slip, err := h.parser.ParseBookingCode(req.Bookmaker, req.BookingCode)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(slip)
}

func (h *BetSlipHandler) GetBetSlip(w http.ResponseWriter, r *http.Request) {
	idOrCode := chi.URLParam(r, "id")
	slip, ok := h.store.GetBetSlip(idOrCode)
	if !ok {
		http.Error(w, `{"error": "Bet slip not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(slip)
}

func (h *BetSlipHandler) GetAllBetSlips(w http.ResponseWriter, r *http.Request) {
	slips := h.store.GetAllBetSlips()

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"slips": slips,
		"count": len(slips),
	})
}

func (h *BetSlipHandler) DeleteBetSlip(w http.ResponseWriter, r *http.Request) {
	idOrCode := chi.URLParam(r, "id")
	deleted := h.store.DeleteBetSlip(idOrCode)
	w.Header().Set("Content-Type", "application/json")
	if !deleted {
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Bet slip not found"})
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "Bet slip removed successfully",
		"id":      idOrCode,
	})
}

func (h *BetSlipHandler) ClearAllBetSlips(w http.ResponseWriter, r *http.Request) {
	count := h.store.ClearAllBetSlips()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":        "success",
		"message":       "All bet slips cleared successfully",
		"cleared_count": count,
	})
}
