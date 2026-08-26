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
	"github.com/sports/livescores/internal/router"
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

	// 6. Handlers
	h := &router.Handlers{
		Match:   handlers.NewMatchHandler(store),
		Odds:    handlers.NewOddsHandler(store),
		Bet:     handlers.NewBetSlipHandler(store, betParser),
		Pay:     handlers.NewPaymentHandler(store, flwSvc, cryptSvc),
		Blog:    handlers.NewBlogHandler(store),
		Support: handlers.NewSupportHandler(store),
		Admin:   handlers.NewAdminHandler(store, ingestionWorker, wsHub),
		Health:  handlers.NewHealthHandler(db, redisSvc),
		WS:      wsHub,
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
