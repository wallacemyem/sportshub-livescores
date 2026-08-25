package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/models"
)

type SupportHandler struct {
	store *database.Store
}

func NewSupportHandler(store *database.Store) *SupportHandler {
	return &SupportHandler{store: store}
}

// GetSupportTickets: List support inquiries
func (h *SupportHandler) GetSupportTickets(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	tickets := h.store.GetSupportTickets(status)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"tickets": tickets,
		"count":   len(tickets),
	})
}

// GetSupportTicketByID: Get single inquiry thread
func (h *SupportHandler) GetSupportTicketByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	ticket, ok := h.store.GetSupportTicketByID(id)
	if !ok {
		http.Error(w, `{"error": "Ticket not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(ticket)
}

// CreateSupportTicket: User submits new support ticket
func (h *SupportHandler) CreateSupportTicket(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID    string `json:"user_id"`
		UserName  string `json:"user_name"`
		UserEmail string `json:"user_email"`
		Subject   string `json:"subject"`
		Category  string `json:"category"`
		Priority  string `json:"priority"`
		Message   string `json:"message"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid request"}`, http.StatusBadRequest)
		return
	}

	if req.Subject == "" {
		req.Subject = "General Inquiry"
	}
	if req.Category == "" {
		req.Category = "General"
	}
	if req.Priority == "" {
		req.Priority = "medium"
	}
	if req.UserName == "" {
		req.UserName = "Sports Fan"
	}
	if req.UserEmail == "" {
		req.UserEmail = "fan@livescores.io"
	}

	now := time.Now()
	ticket := &models.SupportTicket{
		ID:        "sup_tkt_" + uuid.New().String()[:8],
		UserID:    req.UserID,
		UserName:  req.UserName,
		UserEmail: req.UserEmail,
		Subject:   req.Subject,
		Category:  req.Category,
		Priority:  req.Priority,
		Status:    "open",
		Messages: []models.SupportTicketMessage{
			{
				ID:         "msg_" + uuid.New().String()[:6],
				Sender:     "user",
				SenderName: req.UserName,
				Message:    req.Message,
				CreatedAt:  now,
			},
		},
		CreatedAt: now,
		UpdatedAt: now,
	}

	h.store.CreateSupportTicket(ticket)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(ticket)
}

// AddSupportMessage: Reply to support ticket
func (h *SupportHandler) AddSupportMessage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var msg models.SupportTicketMessage
	if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
		http.Error(w, `{"error": "Invalid request"}`, http.StatusBadRequest)
		return
	}

	msg.ID = "msg_" + uuid.New().String()[:6]
	msg.CreatedAt = time.Now()
	if msg.Sender == "" {
		msg.Sender = "user"
	}
	if msg.SenderName == "" {
		if msg.Sender == "agent" {
			msg.SenderName = "Support Team"
		} else {
			msg.SenderName = "You"
		}
	}

	updated, ok := h.store.AddSupportMessage(id, &msg)
	if !ok {
		http.Error(w, `{"error": "Ticket not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(updated)
}
