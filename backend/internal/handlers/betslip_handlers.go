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
	Bookmaker   string  `json:"bookmaker"`
	BookingCode string  `json:"booking_code"`
	Stake       float64 `json:"stake"`
}

func (h *BetSlipHandler) ImportBetSlip(w http.ResponseWriter, r *http.Request) {
	var req ImportSlipRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}

	slip, err := h.parser.ParseBookingCode(req.Bookmaker, req.BookingCode, req.Stake)
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

	h.parser.RecalculateCashout(slip)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(slip)
}

func (h *BetSlipHandler) GetAllBetSlips(w http.ResponseWriter, r *http.Request) {
	slips := h.store.GetAllBetSlips()
	for _, s := range slips {
		h.parser.RecalculateCashout(s)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"slips": slips,
		"count": len(slips),
	})
}
