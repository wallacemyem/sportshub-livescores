package router

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/sports/livescores/internal/auth"
	"github.com/sports/livescores/internal/config"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/handlers"
	"github.com/sports/livescores/internal/models"
	"github.com/sports/livescores/internal/websocket"
)

type Handlers struct {
	Auth    *handlers.AuthHandler
	Match   *handlers.MatchHandler
	Odds    *handlers.OddsHandler
	Bet     *handlers.BetSlipHandler
	Pay     *handlers.PaymentHandler
	Blog    *handlers.BlogHandler
	Support *handlers.SupportHandler
	Admin   *handlers.AdminHandler
	Health  *handlers.HealthHandler
	WS      *websocket.Hub
	Store   *database.Store
	Secret  string
}

func SetupRouter(cfg *config.Config, h *Handlers) http.Handler {
	r := chi.NewRouter()

	// Standard middlewares
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Compress(5))

	// CORS configuration for multi-origin and non-standard ports
	r.Use(cors.Handler(cors.Options{
		AllowOriginFunc: func(r *http.Request, origin string) bool {
			return true
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "verif-hash", "sign", "X-Admin-Token", "Origin"},
		ExposedHeaders:   []string{"Link", "verif-hash", "sign"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/healthz", h.Health.Healthz)

	// WebSocket Gateway on port 18443
	r.Get("/ws", h.WS.HandleWebSocket)

	jwtSecret := h.Secret
	if jwtSecret == "" {
		jwtSecret = "slipradar_secure_jwt_secret_key_2026"
	}

	// API v1 Namespace
	r.Route("/api/v1", func(api chi.Router) {
		// Authentication & User Management
		api.Post("/auth/register", h.Auth.Register)
		api.Post("/auth/login", h.Auth.Login)
		api.Post("/auth/logout", h.Auth.Logout)
		api.Get("/auth/me", h.Auth.Me)
		api.Post("/auth/plan", h.Auth.UpdatePlan)

		// Matches & Sports
		api.Get("/matches", h.Match.GetMatches)
		api.Get("/matches/{id}", h.Match.GetMatchByID)
		api.Delete("/matches/{id}", h.Match.DeleteMatch)
		api.Delete("/matches", h.Match.ClearAllMatches)
		api.Get("/matches/{id}/odds", h.Odds.GetMatchOdds)
		api.Get("/leagues", h.Match.GetLeagues)
		api.Get("/sports", h.Match.GetSports)

		// Bet Slip & Accumulator Tracker
		api.Post("/betslip/import", h.Bet.ImportBetSlip)
		api.Get("/betslip/{id}", h.Bet.GetBetSlip)
		api.Get("/betslip", h.Bet.GetAllBetSlips)

		// Editorial Sports Blog & Articles
		api.Get("/blog", h.Blog.GetPosts)
		api.Get("/blog/{slug}", h.Blog.GetPostBySlug)
		api.Post("/blog", h.Blog.CreatePost)
		api.Put("/blog/{id}", h.Blog.UpdatePost)
		api.Post("/blog/{id}/like", h.Blog.LikePost)
		api.Delete("/blog/{id}", h.Blog.DeletePost)

		// Customer Support Helpdesk System
		api.Get("/support/tickets", h.Support.GetSupportTickets)
		api.Get("/support/tickets/{id}", h.Support.GetSupportTicketByID)
		api.Post("/support/tickets", h.Support.CreateSupportTicket)
		api.Post("/support/tickets/{id}/messages", h.Support.AddSupportMessage)

		// Payments & Subscriptions
		api.Post("/payments/flutterwave/webhook", h.Pay.HandleFlutterwaveWebhook)
		api.Post("/payments/cryptomus/webhook", h.Pay.HandleCryptomusWebhook)
		api.Post("/payments/simulate", h.Pay.SimulatePayment)
		api.Get("/users/{id}/subscription", h.Pay.GetUserSubscription)

		// Admin Management & Orchestrator (STRICT ADMIN AUTH MIDDLEWARE REQUIRED)
		api.Route("/admin", func(adm chi.Router) {
			adm.Use(AdminAuthMiddleware(jwtSecret, h.Store))

			// Console
			adm.Get("/overview", h.Admin.GetOverview)
			adm.Get("/users", h.Admin.GetUsers)
			adm.Patch("/users/{id}", h.Admin.UpdateUser)
			adm.Get("/slips", h.Admin.GetSlips)
			adm.Get("/transactions", h.Admin.GetTransactions)

			// Live operations
			adm.Get("/telemetry", h.Admin.GetTelemetry)
			adm.Get("/clients", h.Admin.GetClients)
			adm.Post("/matches/{id}/override", h.Admin.OverrideMatch)
			adm.Post("/matches/{id}/simulate-goal", h.Admin.SimulateGoal)

			// Finance & parser
			adm.Get("/financials", h.Admin.GetFinancials)
			adm.Get("/webhooks", h.Admin.GetWebhooks)
			adm.Get("/parser/metrics", h.Admin.GetParserMetrics)
		})
	})

	return r
}

// AdminAuthMiddleware enforces strict admin authentication on protected endpoints
func AdminAuthMiddleware(jwtSecret string, store *database.Store) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")

			var tokenStr string
			authHeader := r.Header.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
			} else if cookie, err := r.Cookie("slipradar_token"); err == nil {
				tokenStr = cookie.Value
			} else if adminTokenHeader := r.Header.Get("X-Admin-Token"); adminTokenHeader != "" {
				tokenStr = adminTokenHeader
			}

			if tokenStr == "" {
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"error":  "Authentication required: Missing admin authorization token",
					"code":   "UNAUTHORIZED",
					"status": 401,
				})
				return
			}

			claims, err := auth.ValidateToken(tokenStr, jwtSecret)
			if err != nil {
				w.WriteHeader(http.StatusUnauthorized)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"error":  "Invalid or expired admin session token",
					"code":   "INVALID_TOKEN",
					"detail": err.Error(),
					"status": 401,
				})
				return
			}

			if !claims.IsAdmin && claims.Role != "admin" {
				w.WriteHeader(http.StatusForbidden)
				json.NewEncoder(w).Encode(map[string]interface{}{
					"error":  "Access denied: Administrator privileges required",
					"code":   "FORBIDDEN",
					"status": 403,
				})
				return
			}

			if store != nil {
				user, exists := store.GetUser(claims.UserID)
				if !exists || (!user.IsAdmin && user.Role != "admin") || user.Status == models.UserSuspended {
					w.WriteHeader(http.StatusForbidden)
					json.NewEncoder(w).Encode(map[string]interface{}{
						"error":  "Access denied: Account lacks active administrator privileges",
						"code":   "FORBIDDEN",
						"status": 403,
					})
					return
				}
				ctx := context.WithValue(r.Context(), "user", user)
				ctx = context.WithValue(ctx, "claims", claims)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			ctx := context.WithValue(r.Context(), "claims", claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
