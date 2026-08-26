package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/sports/livescores/internal/config"
	"github.com/sports/livescores/internal/handlers"
	"github.com/sports/livescores/internal/websocket"
)

type Handlers struct {
	Match   *handlers.MatchHandler
	Odds    *handlers.OddsHandler
	Bet     *handlers.BetSlipHandler
	Pay     *handlers.PaymentHandler
	Blog    *handlers.BlogHandler
	Support *handlers.SupportHandler
	Admin   *handlers.AdminHandler
	Health  *handlers.HealthHandler
	WS      *websocket.Hub
}

func SetupRouter(cfg *config.Config, h *Handlers) http.Handler {
	r := chi.NewRouter()

	// Standard middlewares
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Compress(5))

	// CORS configuration for non-standard ports
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{
			"http://localhost:17080",
			"http://127.0.0.1:17080",
			"http://localhost:19080",
			"http://127.0.0.1:19080",
			"http://localhost:3000",
			"http://127.0.0.1:3000",
			"*",
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "verif-hash", "sign"},
		ExposedHeaders:   []string{"Link", "verif-hash", "sign"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/healthz", h.Health.Healthz)

	// WebSocket Gateway on port 18443
	r.Get("/ws", h.WS.HandleWebSocket)

	// API v1 Namespace
	r.Route("/api/v1", func(api chi.Router) {
		// Matches & Sports
		api.Get("/matches", h.Match.GetMatches)
		api.Get("/matches/{id}", h.Match.GetMatchByID)
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

		// Admin Management & Orchestrator
		api.Route("/admin", func(adm chi.Router) {
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
