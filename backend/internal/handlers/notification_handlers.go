package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/sports/livescores/internal/auth"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/models"
	"github.com/sports/livescores/internal/push"
)

type NotificationHandler struct {
	store       *database.Store
	pushService *push.PushService
	jwtSecret   string
}

func NewNotificationHandler(store *database.Store, pushService *push.PushService, jwtSecret string) *NotificationHandler {
	return &NotificationHandler{
		store:       store,
		pushService: pushService,
		jwtSecret:   jwtSecret,
	}
}

// GetVAPIDKey returns the public VAPID key needed by browser pushManager
func (h *NotificationHandler) GetVAPIDKey(w http.ResponseWriter, r *http.Request) {
	pubKey := h.pushService.GetVAPIDPublicKey()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"public_key": pubKey,
		"enabled":    pubKey != "",
	})
}

// Subscribe registers or updates a client push subscription with channel preferences
func (h *NotificationHandler) Subscribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var sub models.PushSubscription
	if err := json.NewDecoder(r.Body).Decode(&sub); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body format"})
		return
	}

	if sub.Endpoint == "" || sub.P256dh == "" || sub.Auth == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Missing required push subscription credentials (endpoint, p256dh, auth)"})
		return
	}

	// Associate with authenticated user if present
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if claims, err := auth.ValidateToken(tokenStr, h.jwtSecret); err == nil && claims != nil {
			sub.UserID = claims.UserID
		}
	} else if cookie, err := r.Cookie("slipradar_token"); err == nil && cookie.Value != "" {
		if claims, err := auth.ValidateToken(cookie.Value, h.jwtSecret); err == nil && claims != nil {
			sub.UserID = claims.UserID
		}
	}

	// Capture client metadata
	if sub.UserAgent == "" {
		sub.UserAgent = r.UserAgent()
	}
	if sub.IPAddress == "" {
		sub.IPAddress = r.RemoteAddr
	}

	if err := h.pushService.RegisterSubscription(&sub); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":   "success",
		"message":  "Web push subscription established successfully",
		"id":       sub.ID,
		"channels": sub.Channels,
	})
}

// Unsubscribe deactivates a push subscription
func (h *NotificationHandler) Unsubscribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req struct {
		Endpoint string `json:"endpoint"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Endpoint == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request: endpoint is required"})
		return
	}

	_ = h.pushService.UnregisterSubscription(req.Endpoint)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "Subscription deactivated successfully",
	})
}

// GetChannels returns available notification channels and subscriber statistics
func (h *NotificationHandler) GetChannels(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	stats := h.pushService.GetStats()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"channels": stats.Channels,
		"total":    stats.TotalSubscriptions,
	})
}

// SendTestPush sends a test push alert to verify a client's subscription
func (h *NotificationHandler) SendTestPush(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req struct {
		Endpoint string `json:"endpoint"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Endpoint == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Endpoint is required to send test push"})
		return
	}

	sub, exists := h.store.GetPushSubscriptionByEndpoint(req.Endpoint)
	if !exists || !sub.IsActive {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Subscription not found or inactive"})
		return
	}

	if err := h.pushService.SendTestPush(sub); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":  "Failed to send test push notification",
			"detail": err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "Test push notification dispatched successfully",
	})
}

// AdminGetStats returns detailed subscriber metrics and recent broadcast logs (Admin only)
func (h *NotificationHandler) AdminGetStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	stats := h.pushService.GetStats()
	activeSubs := h.store.GetActivePushSubscriptions("all")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"stats":         stats,
		"subscriptions": activeSubs,
	})
}

// AdminBroadcast sends an immediate broadcast notification across selected channels (Admin only)
func (h *NotificationHandler) AdminBroadcast(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req models.BroadcastRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid broadcast request body"})
		return
	}

	if req.Title == "" || req.Body == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Title and Body are required"})
		return
	}

	if req.Channel == "" {
		req.Channel = "all"
	}
	if req.URL == "" {
		req.URL = "/live"
	}

	tag := "sr-broadcast-" + req.Channel
	if req.MatchID != "" {
		tag = "sr-live-" + req.MatchID
	}

	payload := &models.PushNotificationPayload{
		Title:              req.Title,
		Body:               req.Body,
		Icon:               req.Icon,
		Badge:              "/icons/badge-72.png",
		Tag:                tag,
		URL:                req.URL,
		MatchID:            req.MatchID,
		Type:               "broadcast",
		Silent:             false,
		Renotify:           true,
		RequireInteraction: true,
		Vibrate:            []int{150, 75, 150},
		Data: map[string]interface{}{
			"channel": req.Channel,
			"url":     req.URL,
			"matchId": req.MatchID,
		},
	}

	sent, failed, err := h.pushService.BroadcastToChannel(req.Channel, payload)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":  "Failed to execute broadcast",
			"detail": err.Error(),
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":       "success",
		"channel":      req.Channel,
		"sent_count":   sent,
		"failed_count": failed,
		"message":      "Broadcast notification dispatched successfully",
	})
}
