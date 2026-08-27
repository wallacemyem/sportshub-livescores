package database

import (
	"context"
	"fmt"
	"log"
)

const schemaSQL = `
CREATE TABLE IF NOT EXISTS sports (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS leagues (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    sport_id VARCHAR(50) NOT NULL,
    country VARCHAR(100) DEFAULT '',
    logo VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    short_name VARCHAR(50) NOT NULL,
    logo VARCHAR(255) DEFAULT '',
    country VARCHAR(100) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
    id VARCHAR(100) PRIMARY KEY,
    sport_id VARCHAR(50) NOT NULL,
    league_id VARCHAR(100) NOT NULL,
    home_team_id VARCHAR(100) NOT NULL,
    away_team_id VARCHAR(100) NOT NULL,
    home_score INT DEFAULT 0,
    away_score INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    period VARCHAR(50) DEFAULT '1H',
    minute INT DEFAULT 0,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    venue VARCHAR(150) DEFAULT '',
    referee VARCHAR(100) DEFAULT '',
    stats_json JSONB DEFAULT '{}'::jsonb,
    period_scores JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_events (
    id VARCHAR(100) PRIMARY KEY,
    match_id VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    minute INT NOT NULL,
    extra_minute INT DEFAULT 0,
    team_side VARCHAR(10) NOT NULL,
    player_name VARCHAR(150) NOT NULL,
    assist_name VARCHAR(150) DEFAULT '',
    detail VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS odds_snapshots (
    id VARCHAR(100) PRIMARY KEY,
    match_id VARCHAR(100) NOT NULL,
    bookmaker_key VARCHAR(50) NOT NULL,
    home_win NUMERIC(6,2),
    draw NUMERIC(6,2),
    away_win NUMERIC(6,2),
    over_25 NUMERIC(6,2),
    under_25 NUMERIC(6,2),
    spread_home NUMERIC(6,2),
    spread_away NUMERIC(6,2),
    raw_payload JSONB DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) DEFAULT '',
    role VARCHAR(50) DEFAULT 'user',
    is_admin BOOLEAN DEFAULT FALSE,
    plan VARCHAR(50) DEFAULT 'free',
    plan_expiry TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'active',
    country VARCHAR(100) DEFAULT '',
    signup_source VARCHAR(100) DEFAULT '',
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_source VARCHAR(100) DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS bet_slips (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100),
    bookmaker VARCHAR(50) NOT NULL,
    booking_code VARCHAR(100) NOT NULL,
    stake NUMERIC(10,2) DEFAULT 10.00,
    total_odds NUMERIC(10,2) NOT NULL,
    potential_win NUMERIC(10,2) NOT NULL,
    current_cashout NUMERIC(10,2) DEFAULT 0.00,
    cashout_probability NUMERIC(4,3) DEFAULT 0.500,
    status VARCHAR(50) DEFAULT 'RUNNING',
    legs_json JSONB DEFAULT '[]'::jsonb,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE bet_slips ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE bet_slips ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bet_slips ALTER COLUMN stake DROP NOT NULL;
ALTER TABLE bet_slips ALTER COLUMN potential_win DROP NOT NULL;
ALTER TABLE bet_slips ALTER COLUMN current_cashout DROP NOT NULL;
ALTER TABLE bet_slips ALTER COLUMN cashout_probability DROP NOT NULL;

CREATE TABLE IF NOT EXISTS payment_transactions (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    gateway VARCHAR(50) NOT NULL,
    reference VARCHAR(150) UNIQUE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL,
    plan VARCHAR(50) NOT NULL,
    raw_payload TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_logs (
    id VARCHAR(100) PRIMARY KEY,
    gateway VARCHAR(50) NOT NULL,
    event VARCHAR(100) NOT NULL,
    signature VARCHAR(255) DEFAULT '',
    verified BOOLEAN DEFAULT FALSE,
    payload TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_posts (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT NOT NULL,
    content_html TEXT NOT NULL,
    cover_image VARCHAR(500) DEFAULT '',
    category VARCHAR(100) NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    author_name VARCHAR(150) NOT NULL,
    author_role VARCHAR(150) DEFAULT '',
    author_avatar VARCHAR(500) DEFAULT '',
    match_id VARCHAR(100) DEFAULT '',
    read_time_min INT DEFAULT 3,
    views INT DEFAULT 0,
    likes INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'published',
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(150) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'open',
    messages JSONB DEFAULT '[]'::jsonb,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) DEFAULT '',
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    device_type VARCHAR(50) DEFAULT 'desktop',
    channels JSONB DEFAULT '["all", "live_matches", "goal_alerts"]'::jsonb,
    user_agent TEXT DEFAULT '',
    ip_address VARCHAR(100) DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcast_logs (
    id VARCHAR(100) PRIMARY KEY,
    channel VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    url VARCHAR(255) DEFAULT '',
    sent_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_sport_status ON matches (sport_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_league ON matches (league_id);
CREATE INDEX IF NOT EXISTS idx_events_match ON match_events (match_id, minute);
CREATE INDEX IF NOT EXISTS idx_odds_match ON odds_snapshots (match_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_betslips_user ON bet_slips (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payment_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_gateway ON webhook_logs (gateway, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_slug ON blog_posts (slug);
CREATE INDEX IF NOT EXISTS idx_blog_category ON blog_posts (category);
CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_user ON support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_status ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_push_active ON push_subscriptions (is_active);
CREATE INDEX IF NOT EXISTS idx_push_device ON push_subscriptions (device_type);
CREATE INDEX IF NOT EXISTS idx_broadcast_sent ON broadcast_logs (sent_at DESC);

-- Enable Supabase Realtime Replication & REPLICA IDENTITY
ALTER TABLE matches REPLICA IDENTITY FULL;
ALTER TABLE match_events REPLICA IDENTITY FULL;
ALTER TABLE odds_snapshots REPLICA IDENTITY FULL;
ALTER TABLE bet_slips REPLICA IDENTITY FULL;
ALTER TABLE blog_posts REPLICA IDENTITY FULL;
ALTER TABLE support_tickets REPLICA IDENTITY FULL;
ALTER TABLE push_subscriptions REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime FOR TABLE matches, match_events, odds_snapshots, bet_slips, blog_posts, support_tickets, push_subscriptions;
    ELSE
        ALTER PUBLICATION supabase_realtime ADD TABLE matches, match_events, odds_snapshots, bet_slips, blog_posts, support_tickets, push_subscriptions;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Supabase realtime publication note: %', SQLERRM;
END $$;
`

func (db *DB) RunMigrations(ctx context.Context) error {
	if db.Pool == nil {
		return nil
	}
	_, err := db.Pool.Exec(ctx, schemaSQL)
	if err != nil {
		return fmt.Errorf("migration failure: %w", err)
	}
	log.Println("[DB] Successfully applied PostgreSQL & Supabase Realtime migrations")
	return nil
}
