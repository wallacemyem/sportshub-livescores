package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port                  string
	DatabaseURL           string
	RedisAddr             string
	RedisPassword         string
	RedisDB               int
	SupabaseURL           string
	SupabaseAnonKey       string
	SupabaseServiceKey    string
	SupabaseStorageBucket string
	ESPNAPIBaseURL        string
	OddsAPIKey            string
	OddsAPIBaseURL        string
	FlutterwaveSecret     string
	FlutterwaveHash       string
	CryptomusMerchant     string
	CryptomusAPIKey       string
	FrontendURL           string
	AdminURL              string
	Environment           string
	SimulationEnabled     bool
}

func LoadConfig() *Config {
	port := getEnv("PORT", "8080")
	dbURL := getEnv("DATABASE_URL", "postgres://postgres:postgres@postgres:5432/sportsdb?sslmode=disable")
	redisAddr := getEnv("REDIS_ADDR", "redis:6379")
	redisPass := getEnv("REDIS_PASSWORD", "")
	redisDBStr := getEnv("REDIS_DB", "0")
	redisDB, _ := strconv.Atoi(redisDBStr)

	simEnabledStr := getEnv("SIMULATION_ENABLED", "true")
	simEnabled := simEnabledStr == "true" || simEnabledStr == "1"

	return &Config{
		Port:                  port,
		DatabaseURL:           dbURL,
		RedisAddr:             redisAddr,
		RedisPassword:         redisPass,
		RedisDB:               redisDB,
		SupabaseURL:           getEnv("SUPABASE_URL", "https://sports-livescores.supabase.co"),
		SupabaseAnonKey:       getEnv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwb3J0cyIsImV4cCI6MTk4MzIzODQ0M30.sports_anon_token_18443"),
		SupabaseServiceKey:    getEnv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwb3J0cyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUifQ.sports_service_token_18443"),
		SupabaseStorageBucket: getEnv("SUPABASE_STORAGE_BUCKET", "sports-assets"),
		ESPNAPIBaseURL:        getEnv("ESPN_API_BASE_URL", "https://site.api.espn.com/apis/site/v2/sports"),
		OddsAPIKey:            getEnv("ODDS_API_KEY", "demo_pro_key_sports_18443"),
		OddsAPIBaseURL:        getEnv("ODDS_API_BASE_URL", "https://api.the-odds-api.com/v4"),
		FlutterwaveSecret:     getEnv("FLW_SECRET_KEY", "FLWSECK_TEST_3847291847293847"),
		FlutterwaveHash:       getEnv("FLW_SECRET_HASH", "flw_sports_secret_hash_token_18443"),
		CryptomusMerchant:     getEnv("CRYPTOMUS_MERCHANT_ID", "merch_88291a_sports"),
		CryptomusAPIKey:       getEnv("CRYPTOMUS_PAYMENT_KEY", "cryptomus_payment_api_key_secure_18443"),
		FrontendURL:           getEnv("FRONTEND_URL", "http://localhost:17080"),
		AdminURL:              getEnv("ADMIN_URL", "http://localhost:19080"),
		Environment:           getEnv("ENVIRONMENT", "development"),
		SimulationEnabled:     simEnabled,
	}
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return defaultVal
}
