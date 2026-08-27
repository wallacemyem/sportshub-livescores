package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/sports/livescores/internal/cache"
	"github.com/sports/livescores/internal/config"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/handlers"
	"github.com/sports/livescores/internal/ingestion"
	"github.com/sports/livescores/internal/parser"
	"github.com/sports/livescores/internal/payments"
	"github.com/sports/livescores/internal/push"
	"github.com/sports/livescores/internal/router"
	"github.com/sports/livescores/internal/supabase"
	"github.com/sports/livescores/internal/websocket"
)

func main() {
	log.Println("=================================================================")
	log.Println("  GLOBAL MULTI-SPORT LIVE SCORE & INGESTION ENGINE")
	log.Println("  Go Backend Gateway - Active on Port 18443")
	log.Println("=================================================================")

	cfg := config.LoadConfig()

	// 1. Database Connection
	db, err := database.NewDB(cfg.DatabaseURL)
	if err != nil {
		log.Printf("[MAIN WARNING] PostgreSQL connection error: %v. Initializing store with in-memory persistence.", err)
		db = &database.DB{Pool: nil}
	}
	defer db.Close()

	store := database.NewStore(db)

	// 1b. Supabase PostgREST Realtime Client & Auto-Sync
	supaClient := supabase.NewClient(cfg.SupabaseURL, cfg.SupabaseServiceKey)
	if supaClient.IsConfigured() {
		log.Printf("[SUPABASE] Connected to Supabase at %s. Activating live dual-sync.", cfg.SupabaseURL)
		store.SetSupabaseSyncer(supaClient)
	}

	// 2. Redis Connection
	redisSvc := cache.NewRedisService(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)

	// 3. WebSocket Hub
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	wsHub := websocket.NewHub(redisSvc)
	go wsHub.Run(ctx)

	// 4. Data Ingestion & Live Simulation Worker
	ingestionWorker := ingestion.NewIngestionWorker(
		store,
		redisSvc,
		cfg.APISportsKey,
		cfg.APISportsDailyCap,
		cfg.ESPNAPIBaseURL,
		cfg.OddsAPIBaseURL,
		cfg.OddsAPIKey,
		cfg.SimulationEnabled,
	)
	ingestionWorker.Start(ctx)
	defer ingestionWorker.Stop()

	// 5. Bet Slip Parser & Payment Gateways
	betParser := parser.NewBetSlipParser(store)
	flwSvc := payments.NewFlutterwaveService(cfg.FlutterwaveSecret, cfg.FlutterwaveHash, store)
	cryptSvc := payments.NewCryptomusService(cfg.CryptomusMerchant, cfg.CryptomusAPIKey, store)

	// 5b. Web Push & Live Activity Broadcast Engine
	vapidContact := os.Getenv("VAPID_CONTACT")
	if vapidContact == "" {
		vapidContact = "mailto:admin@slipradar.app"
	}
	pushService := push.NewPushService(store, os.Getenv("VAPID_PUBLIC_KEY"), os.Getenv("VAPID_PRIVATE_KEY"), vapidContact)
	ingestionWorker.SetPushService(pushService)

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "slipradar_secure_jwt_secret_key_2026"
	}
	authHandler := handlers.NewAuthHandler(store, jwtSecret)
	notifHandler := handlers.NewNotificationHandler(store, pushService, jwtSecret)

	// 6. Handlers
	h := &router.Handlers{
		Auth:         authHandler,
		Match:        handlers.NewMatchHandler(store, redisSvc, ingestionWorker.GetAPISportsClient(), jwtSecret),
		Odds:         handlers.NewOddsHandler(store),
		Bet:          handlers.NewBetSlipHandler(store, betParser, jwtSecret),
		Pay:          handlers.NewPaymentHandler(store, flwSvc, cryptSvc),
		Blog:         handlers.NewBlogHandler(store),
		Support:      handlers.NewSupportHandler(store),
		Admin:        handlers.NewAdminHandler(store, ingestionWorker, wsHub, pushService),
		Notification: notifHandler,
		Health:       handlers.NewHealthHandler(db, redisSvc),
		WS:           wsHub,
		Store:        store,
		Secret:       jwtSecret,
	}

	// 7. HTTP Server Setup
	httpHandler := router.SetupRouter(cfg, h)

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      httpHandler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Server startup in goroutine
	go func() {
		log.Printf("[HTTP] Backend server listening on 0.0.0.0:%s (Host mapped to port 18443)", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[FATAL] HTTP server error: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	log.Printf("[MAIN] Received signal %v. Initiating graceful shutdown...", sig)

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("[FATAL] Server forced shutdown: %v", err)
	}

	log.Println("[MAIN] Server gracefully stopped.")
}
