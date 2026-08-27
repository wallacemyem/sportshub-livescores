package handlers

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/models"
	"github.com/sports/livescores/internal/payments"
)

type PaymentHandler struct {
	store *database.Store
	flw   *payments.FlutterwaveService
	crypt *payments.CryptomusService
}

func NewPaymentHandler(store *database.Store, flw *payments.FlutterwaveService, crypt *payments.CryptomusService) *PaymentHandler {
	return &PaymentHandler{
		store: store,
		flw:   flw,
		crypt: crypt,
	}
}

func (h *PaymentHandler) HandleFlutterwaveWebhook(w http.ResponseWriter, r *http.Request) {
	signature := r.Header.Get("verif-hash")
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error": "Failed to read body"}`, http.StatusBadRequest)
		return
	}

	tx, err := h.flw.ProcessWebhook(signature, body)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":      "success",
		"transaction": tx,
	})
}

func (h *PaymentHandler) HandleCryptomusWebhook(w http.ResponseWriter, r *http.Request) {
	signature := r.Header.Get("sign")
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, `{"error": "Failed to read body"}`, http.StatusBadRequest)
		return
	}

	tx, err := h.crypt.ProcessWebhook(signature, body)
	if err != nil {
		http.Error(w, `{"error": "`+err.Error()+`"}`, http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":      "success",
		"transaction": tx,
	})
}

func (h *PaymentHandler) GetUserSubscription(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id")
	user, ok := h.store.GetUser(userID)
	if !ok {
		// Return default free tier
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(models.User{
			ID:   userID,
			Plan: models.PlanFree,
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(user)
}

type SimulatePaymentRequest struct {
	UserID  string  `json:"user_id"`
	Gateway string  `json:"gateway"`
	Amount  float64 `json:"amount"`
}

func (h *PaymentHandler) SimulatePayment(w http.ResponseWriter, r *http.Request) {
	var req SimulatePaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.UserID == "" {
		req.UserID = "usr_guest"
	}

	_ = h.store.UpgradeUserToPro(req.UserID, 30)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "upgraded",
		"user_id": req.UserID,
		"plan":    "pro",
		"message": "User upgraded to PRO plan successfully for 30 days",
	})
}
