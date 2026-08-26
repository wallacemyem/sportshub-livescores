package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/sports/livescores/internal/auth"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/models"
)

type AuthHandler struct {
	store     *database.Store
	jwtSecret string
}

func NewAuthHandler(store *database.Store, jwtSecret string) *AuthHandler {
	if jwtSecret == "" {
		jwtSecret = "slipradar_secure_jwt_secret_key_2026"
	}
	return &AuthHandler{
		store:     store,
		jwtSecret: jwtSecret,
	}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body format"})
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Name = strings.TrimSpace(req.Name)
	req.Password = strings.TrimSpace(req.Password)

	if req.Email == "" || !strings.Contains(req.Email, "@") {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Valid email address is required"})
		return
	}

	if req.Name == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Full name is required"})
		return
	}

	if len(req.Password) < 6 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Password must be at least 6 characters"})
		return
	}

	// Check if user already exists
	if _, exists := h.store.GetUserByEmail(req.Email); exists {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"error": "An account with this email already exists"})
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to secure password"})
		return
	}

	now := time.Now()
	user := &models.User{
		ID:           "usr_" + uuid.New().String()[:12],
		Email:        req.Email,
		Name:         req.Name,
		PasswordHash: hash,
		Role:         "user",
		IsAdmin:      false,
		Plan:         models.PlanFree,
		Status:       models.UserActive,
		Country:      "US",
		SignupSource: "organic_signup",
		CreatedAt:    now,
		LastSeenAt:   now,
	}

	h.store.SaveUser(user)

	token, err := auth.GenerateToken(user, h.jwtSecret)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to generate authentication token"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(models.AuthResponse{
		Token: token,
		User:  user,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body format"})
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Password = strings.TrimSpace(req.Password)

	if req.Email == "" || req.Password == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Email and password are required"})
		return
	}

	user, exists := h.store.GetUserByEmail(req.Email)
	if !exists {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid email or password"})
		return
	}

	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid email or password"})
		return
	}

	if user.Status == models.UserSuspended {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Your account has been suspended. Please contact support."})
		return
	}

	user.LastSeenAt = time.Now()
	h.store.SaveUser(user)

	token, err := auth.GenerateToken(user, h.jwtSecret)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to generate session token"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(models.AuthResponse{
		Token: token,
		User:  user,
	})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	authHeader := r.Header.Get("Authorization")
	var tokenStr string
	if strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
	} else if cookie, err := r.Cookie("slipradar_token"); err == nil {
		tokenStr = cookie.Value
	}

	if tokenStr == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Authentication token missing"})
		return
	}

	claims, err := auth.ValidateToken(tokenStr, h.jwtSecret)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	user, exists := h.store.GetUser(claims.UserID)
	if !exists {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "User account not found"})
		return
	}

	json.NewEncoder(w).Encode(user)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"message": "Successfully signed out",
	})
}

type UpdatePlanRequest struct {
	Plan string `json:"plan"`
}

func (h *AuthHandler) UpdatePlan(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	authHeader := r.Header.Get("Authorization")
	var tokenStr string
	if strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
	} else if cookie, err := r.Cookie("slipradar_token"); err == nil {
		tokenStr = cookie.Value
	}

	if tokenStr == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Authentication token missing"})
		return
	}

	claims, err := auth.ValidateToken(tokenStr, h.jwtSecret)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	var req UpdatePlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body format"})
		return
	}

	req.Plan = strings.ToLower(strings.TrimSpace(req.Plan))
	if req.Plan != "free" && req.Plan != "pro" && req.Plan != "elite" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Valid plan must be free, pro, or elite"})
		return
	}

	user, exists := h.store.GetUser(claims.UserID)
	if !exists {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "User account not found"})
		return
	}

	user.Plan = models.UserPlan(req.Plan)
	if req.Plan == "free" {
		user.PlanExpiry = nil
	} else {
		exp := time.Now().AddDate(0, 1, 0)
		user.PlanExpiry = &exp
	}

	h.store.SaveUser(user)

	newToken, err := auth.GenerateToken(user, h.jwtSecret)
	if err != nil {
		newToken = tokenStr
	}

	json.NewEncoder(w).Encode(models.AuthResponse{
		Token: newToken,
		User:  user,
	})
}
