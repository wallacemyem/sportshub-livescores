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
	// Multi-sport API-Sports provider (Football, Basketball, NFL, Baseball, Rugby, Hockey, etc.)
	APISportsKey          string
	APISportsDailyCap     int
	APIFootballKey        string
	APIFootballBaseURL    string
	APIFootballDailyCap   int
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

	simEnabledStr := getEnv("SIMULATION_ENABLED", "false")
	simEnabled := simEnabledStr == "true" || simEnabledStr == "1"

	return &Config{
		Port:                  port,
		DatabaseURL:           dbURL,
		RedisAddr:             redisAddr,
		RedisPassword:         redisPass,
		RedisDB:               redisDB,
		SupabaseURL:           getEnv("SUPABASE_URL", "https://slipradar.wallacecloud.online"),
		SupabaseAnonKey:       getEnv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg3NzMxODMyLCJleHAiOjE5NDU0MTE4MzJ9.1hdl-Y_PDMuAfAijUMcugBqUPTlp0CyPstpl0gDGmPw"),
		SupabaseServiceKey:    getEnv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODc3MzE4MzIsImV4cCI6MTk0NTQxMTgzMn0.JLb-XXh43TejaYqVgdEyOMpSae738CAY0E5qyw5xmpY"),
		SupabaseStorageBucket: getEnv("SUPABASE_STORAGE_BUCKET", "sports-assets"),
		ESPNAPIBaseURL:        getEnv("ESPN_API_BASE_URL", "https://site.web.api.espn.com/apis/site/v2/sports"),
		APISportsKey:          getEnv("API_SPORTS_KEY", getEnv("API_FOOTBALL_KEY", "")),
		APISportsDailyCap:     getEnvInt("API_SPORTS_DAILY_CAP", getEnvInt("API_FOOTBALL_DAILY_CAP", 7500)),
		APIFootballKey:        getEnv("API_FOOTBALL_KEY", getEnv("API_SPORTS_KEY", "")),
		APIFootballBaseURL:    getEnv("API_FOOTBALL_BASE_URL", "https://v3.football.api-sports.io"),
		APIFootballDailyCap:   getEnvInt("API_FOOTBALL_DAILY_CAP", 7500),
		OddsAPIKey:            getEnv("ODDS_API_KEY", "68492c40a7eb4d001ed4899b75df648d"),
		OddsAPIBaseURL:        getEnv("ODDS_API_BASE_URL", "https://api.the-odds-api.com/v4"),
		FlutterwaveSecret:     getEnv("FLW_SECRET_KEY", "FLWSECK_TEST_3847291847293847"),
		FlutterwaveHash:       getEnv("FLW_SECRET_HASH", "flw_sports_secret_hash_token_18443"),
		CryptomusMerchant:     getEnv("CRYPTOMUS_MERCHANT_ID", "merch_88291a_sports"),
		CryptomusAPIKey:       getEnv("CRYPTOMUS_PAYMENT_KEY", "cryptomus_payment_api_key_secure_18443"),
		FrontendURL:           getEnv("FRONTEND_URL", "http://localhost:17080"),
		AdminURL:              getEnv("ADMIN_URL", "http://localhost:19080"),
		Environment:           getEnv("ENVIRONMENT", "production"),
		SimulationEnabled:     simEnabled,
	}
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return defaultVal
}

// getEnvInt reads an integer setting, falling back when unset or unparseable.
func getEnvInt(key string, defaultVal int) int {
	if raw := os.Getenv(key); raw != "" {
		if val, err := strconv.Atoi(raw); err == nil {
			return val
		}
	}
	return defaultVal
}
