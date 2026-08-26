package handlers

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/sports/livescores/internal/auth"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/models"
	"github.com/sports/livescores/internal/parser"
)

type BetSlipHandler struct {
	store     *database.Store
	parser    *parser.BetSlipParser
	jwtSecret string
}

func NewBetSlipHandler(store *database.Store, p *parser.BetSlipParser, jwtSecret string) *BetSlipHandler {
	if jwtSecret == "" {
		jwtSecret = "slipradar_secure_jwt_secret_key_2026"
	}
	return &BetSlipHandler{
		store:     store,
		parser:    p,
		jwtSecret: jwtSecret,
	}
}

type ImportSlipRequest struct {
	Bookmaker   string `json:"bookmaker"`
	BookingCode string `json:"booking_code"`
}

// extractUserAndPlan identifies the requester from Authorization header, cookies, or session
func (h *BetSlipHandler) extractUserAndPlan(r *http.Request) (userID string, plan models.UserPlan, isAdmin bool) {
	var tokenStr string
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
	} else if cookie, err := r.Cookie("slipradar_token"); err == nil {
		tokenStr = cookie.Value
	}

	if tokenStr != "" {
		claims, err := auth.ValidateToken(tokenStr, h.jwtSecret)
		if err == nil && claims != nil {
			userID = claims.UserID
			plan = claims.Plan
			isAdmin = claims.IsAdmin || claims.Role == "admin"
			if h.store != nil {
				if user, exists := h.store.GetUser(claims.UserID); exists {
					plan = user.Plan
					isAdmin = user.IsAdmin || user.Role == "admin"
				}
			}
			if plan == "" {
				plan = models.PlanFree
			}
			return userID, plan, isAdmin
		}
	}

	// Guest user fallback (scoped to session header or IP hash)
	sessionID := r.Header.Get("X-Session-ID")
	if sessionID == "" {
		if cookie, err := r.Cookie("slipradar_session"); err == nil {
			sessionID = cookie.Value
		}
	}
	if sessionID != "" {
		return "guest_" + sessionID, models.PlanFree, false
	}

	ip := r.RemoteAddr
	if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
		ip = realIP
	} else if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		ip = strings.Split(fwd, ",")[0]
	}
	hash := sha256.Sum256([]byte(ip))
	return fmt.Sprintf("guest_%x", hash[:8]), models.PlanFree, false
}

// ImportBetSlip handles importing and tracking a real bookmaker booking code with plan enforcement
func (h *BetSlipHandler) ImportBetSlip(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, plan, _ := h.extractUserAndPlan(r)

	var req ImportSlipRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body format"})
		return
	}

	// Plan Limits Enforcement
	activeCount := h.store.CountActiveBetSlipsForUser(userID)
	maxAllowed := 3
	if plan == models.PlanPro {
		maxAllowed = 25
	} else if plan == models.PlanElite {
		maxAllowed = 1000000
	}

	if activeCount >= maxAllowed {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":         fmt.Sprintf("Plan ticket limit reached (%d/%d tickets for %s plan). Please upgrade to Pro or Elite to track more tickets.", activeCount, maxAllowed, strings.ToUpper(string(plan))),
			"code":          "PLAN_LIMIT_EXCEEDED",
			"current_count": activeCount,
			"max_allowed":   maxAllowed,
			"plan":          string(plan),
		})
		return
	}

	slip, err := h.parser.ParseBookingCodeForUser(req.Bookmaker, req.BookingCode, userID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(slip)
}

// GetBetSlip retrieves a single betslip ensuring private ownership scoping
func (h *BetSlipHandler) GetBetSlip(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, _, isAdmin := h.extractUserAndPlan(r)
	idOrCode := chi.URLParam(r, "id")

	slip, ok := h.store.GetBetSlipForUser(idOrCode, userID, isAdmin)
	if !ok {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Bet slip not found or access denied"})
		return
	}

	json.NewEncoder(w).Encode(slip)
}

// GetAllBetSlips returns strictly the bet slips owned by the requesting user
func (h *BetSlipHandler) GetAllBetSlips(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, plan, isAdmin := h.extractUserAndPlan(r)

	var slips []*models.BetSlip
	if r.URL.Query().Get("all") == "true" && isAdmin {
		slips = h.store.GetAllBetSlips()
	} else {
		slips = h.store.GetBetSlipsByUser(userID)
	}

	maxAllowed := 3
	if plan == models.PlanPro {
		maxAllowed = 25
	} else if plan == models.PlanElite {
		maxAllowed = 1000000
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"slips":       slips,
		"count":       len(slips),
		"max_allowed": maxAllowed,
		"plan":        string(plan),
		"user_id":     userID,
	})
}

// DeleteBetSlip deletes a bet slip strictly owned by the requesting user
func (h *BetSlipHandler) DeleteBetSlip(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, _, isAdmin := h.extractUserAndPlan(r)
	idOrCode := chi.URLParam(r, "id")

	deleted := h.store.DeleteBetSlipForUser(idOrCode, userID, isAdmin)
	if !deleted {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Bet slip not found or access denied"})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "success",
		"message": "Bet slip removed successfully",
		"id":      idOrCode,
	})
}

// ClearAllBetSlips clears all bet slips strictly belonging to the requesting user
func (h *BetSlipHandler) ClearAllBetSlips(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, _, isAdmin := h.extractUserAndPlan(r)

	var count int
	if r.URL.Query().Get("all") == "true" && isAdmin {
		count = h.store.ClearAllBetSlips()
	} else {
		count = h.store.ClearBetSlipsForUser(userID)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":        "success",
		"message":       "Your bet slips have been cleared successfully",
		"cleared_count": count,
	})
}
