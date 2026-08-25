package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DB struct {
	Pool *pgxpool.Pool
}

func NewDB(databaseURL string) (*DB, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse db config: %w", err)
	}

	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = 1 * time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("unable to connect to postgres: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		log.Printf("[DB WARNING] Failed to ping PostgreSQL at %s: %v. Running in hybrid in-memory fallback mode.", databaseURL, err)
		return &DB{Pool: nil}, nil
	}

	log.Printf("[DB] Connected successfully to PostgreSQL on port 25432 / 5432")
	db := &DB{Pool: pool}

	if err := db.RunMigrations(context.Background()); err != nil {
		log.Printf("[DB ERROR] Error running migrations: %v", err)
	}

	if err := db.SeedInitialData(context.Background()); err != nil {
		log.Printf("[DB ERROR] Error seeding data: %v", err)
	}

	return db, nil
}

func (db *DB) Close() {
	if db.Pool != nil {
		db.Pool.Close()
	}
}

func (db *DB) IsHealthy(ctx context.Context) bool {
	if db.Pool == nil {
		return false
	}
	return db.Pool.Ping(ctx) == nil
}
