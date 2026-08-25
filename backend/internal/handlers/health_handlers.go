package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/sports/livescores/internal/cache"
	"github.com/sports/livescores/internal/database"
)

type HealthHandler struct {
	db    *database.DB
	redis *cache.RedisService
}

func NewHealthHandler(db *database.DB, redis *cache.RedisService) *HealthHandler {
	return &HealthHandler{db: db, redis: redis}
}

func (h *HealthHandler) Healthz(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	dbOK := h.db.IsHealthy(ctx)
	redisOK := h.redis.IsHealthy(ctx)

	status := "healthy"
	httpCode := http.StatusOK

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(httpCode)

	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":      status,
		"service":     "sports-livescores-engine",
		"port":        18443,
		"postgres_ok": dbOK,
		"redis_ok":    redisOK,
		"timestamp":   time.Now().Unix(),
	})
}
