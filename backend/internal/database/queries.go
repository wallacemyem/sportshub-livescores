package database

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/sports/livescores/internal/models"
)

type Store struct {
	db             *DB
	mu             sync.RWMutex
	matches        map[string]*models.Match
	events         map[string][]models.MatchEvent
	odds           map[string]*models.MatchOdds
	betSlips       map[string]*models.BetSlip
	users          map[string]*models.User
	payments       map[string]*models.PaymentTransaction
	webhookLogs    []*models.WebhookLog
	posts          map[string]*models.BlogPost
	supportTickets map[string]*models.SupportTicket
	supabaseSyncer SupabaseSyncer

	// Side tables for detail the core models do not carry. Keyed by the
	// transaction / slip ID they annotate.
	txMethods   map[string]string
	txCycles    map[string]string
	slipParseMs map[string]int
}

type SupabaseSyncer interface {
	SyncBetSlip(slip *models.BetSlip)
	SyncMatch(match *models.Match)
	SyncUser(user *models.User)
	SyncBlogPost(post *models.BlogPost)
	SyncSupportTicket(ticket *models.SupportTicket)
}

func (s *Store) SetSupabaseSyncer(syncer SupabaseSyncer) {
	s.mu.Lock()
	s.supabaseSyncer = syncer
	s.mu.Unlock()

	if syncer != nil {
		go func() {
			s.mu.RLock()
			defer s.mu.RUnlock()
			for _, m := range s.matches {
				if !m.IsDeleted {
					syncer.SyncMatch(m)
				}
			}
			for _, sl := range s.betSlips {
				if !sl.IsDeleted {
					syncer.SyncBetSlip(sl)
				}
			}
			for _, p := range s.posts {
				if !p.IsDeleted {
					syncer.SyncBlogPost(p)
				}
			}
			for _, u := range s.users {
				if !u.IsDeleted {
					syncer.SyncUser(u)
				}
			}
		}()
	}
}

func NewStore(db *DB) *Store {
	store := &Store{
		db:             db,
		matches:        make(map[string]*models.Match),
		events:         make(map[string][]models.MatchEvent),
		odds:           make(map[string]*models.MatchOdds),
		betSlips:       make(map[string]*models.BetSlip),
		users:          make(map[string]*models.User),
		payments:       make(map[string]*models.PaymentTransaction),
		webhookLogs:    make([]*models.WebhookLog, 0),
		posts:          make(map[string]*models.BlogPost),
		supportTickets: make(map[string]*models.SupportTicket),
		txMethods:      make(map[string]string),
		txCycles:       make(map[string]string),
		slipParseMs:    make(map[string]int),
	}

	// Seed root system administrator account
	store.seedAdminPopulation()

	// Load all persistent records from PostgreSQL into memory
	if db != nil && db.Pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		store.loadFromPostgres(ctx)
	}

	return store
}

// loadFromPostgres hydrates the in-memory cache with real PostgreSQL rows
func (s *Store) loadFromPostgres(ctx context.Context) {
	if s.db == nil || s.db.Pool == nil {
		return
	}

	// 1. Load Bet Slips
	rows, err := s.db.Pool.Query(ctx, `
		SELECT id, COALESCE(user_id, ''), bookmaker, booking_code, total_odds, status, legs_json, is_deleted, created_at, updated_at
		FROM bet_slips
		WHERE is_deleted = FALSE
	`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var slip models.BetSlip
			var userID, statusStr string
			var legsJSON []byte
			if err := rows.Scan(&slip.ID, &userID, &slip.Bookmaker, &slip.BookingCode, &slip.TotalOdds, &statusStr, &legsJSON, &slip.IsDeleted, &slip.CreatedAt, &slip.UpdatedAt); err == nil {
				slip.UserID = userID
				slip.Status = models.BetSlipStatus(statusStr)
				if len(legsJSON) > 0 {
					_ = json.Unmarshal(legsJSON, &slip.Legs)
				}
				s.betSlips[slip.ID] = &slip
				s.betSlips[slip.BookingCode] = &slip
			}
		}
	}

	// 2. Load Matches with Team and League info
	mRows, err := s.db.Pool.Query(ctx, `
		SELECT m.id, m.sport_id, m.home_score, m.away_score, m.status, m.period, m.minute, m.start_time, m.venue, m.referee, m.is_deleted,
		       l.id, l.name, l.country,
		       ht.id, ht.name, ht.short_name, ht.country,
		       at.id, at.name, at.short_name, at.country
		FROM matches m
		LEFT JOIN leagues l ON m.league_id = l.id
		LEFT JOIN teams ht ON m.home_team_id = ht.id
		LEFT JOIN teams at ON m.away_team_id = at.id
		WHERE m.is_deleted = FALSE
	`)
	if err == nil {
		defer mRows.Close()
		for mRows.Next() {
			var m models.Match
			var sportStr, statusStr, periodStr string
			var lID, lName, lCountry string
			var htID, htName, htShort, htCountry string
			var atID, atName, atShort, atCountry string

			if err := mRows.Scan(
				&m.ID, &sportStr, &m.HomeScore, &m.AwayScore, &statusStr, &periodStr, &m.Minute, &m.StartTime, &m.Venue, &m.Referee, &m.IsDeleted,
				&lID, &lName, &lCountry,
				&htID, &htName, &htShort, &htCountry,
				&atID, &atName, &atShort, &atCountry,
			); err == nil {
				m.Sport = models.SportType(sportStr)
				m.Status = models.MatchStatus(statusStr)
				m.Period = periodStr
				m.League = models.League{ID: lID, Name: lName, Country: lCountry, Sport: m.Sport}
				m.HomeTeam = models.Team{ID: htID, Name: htName, ShortName: htShort, Country: htCountry}
				m.AwayTeam = models.Team{ID: atID, Name: atName, ShortName: atShort, Country: atCountry}
				s.matches[m.ID] = &m
			}
		}
	}

	// 3. Load Users
	uRows, err := s.db.Pool.Query(ctx, `
		SELECT id, email, name, password_hash, role, is_admin, plan, plan_expiry, status, country, signup_source, last_seen_at, is_deleted, created_at
		FROM users
		WHERE is_deleted = FALSE
	`)
	if err == nil {
		defer uRows.Close()
		for uRows.Next() {
			var u models.User
			var planStr, statusStr string
			if err := uRows.Scan(&u.ID, &u.Email, &u.Name, &u.PasswordHash, &u.Role, &u.IsAdmin, &planStr, &u.PlanExpiry, &statusStr, &u.Country, &u.SignupSource, &u.LastSeenAt, &u.IsDeleted, &u.CreatedAt); err == nil {
				u.Plan = models.UserPlan(planStr)
				u.Status = models.UserStatus(statusStr)
				s.users[u.ID] = &u
			}
		}
	}

	// 4. Load Blog Posts
	bRows, err := s.db.Pool.Query(ctx, `
		SELECT id, title, slug, excerpt, content_html, cover_image, category, author_name, author_role, author_avatar, match_id, read_time_min, views, likes, status, is_deleted, published_at, created_at, updated_at
		FROM blog_posts
		WHERE is_deleted = FALSE
	`)
	if err == nil {
		defer bRows.Close()
		for bRows.Next() {
			var p models.BlogPost
			if err := bRows.Scan(&p.ID, &p.Title, &p.Slug, &p.Excerpt, &p.ContentHTML, &p.CoverImage, &p.Category, &p.AuthorName, &p.AuthorRole, &p.AuthorAvatar, &p.MatchID, &p.ReadTimeMin, &p.Views, &p.Likes, &p.Status, &p.IsDeleted, &p.PublishedAt, &p.CreatedAt, &p.UpdatedAt); err == nil {
				s.posts[p.ID] = &p
				s.posts[p.Slug] = &p
			}
		}
	}

	// 5. Load Support Tickets
	tRows, err := s.db.Pool.Query(ctx, `
		SELECT id, user_id, user_name, user_email, subject, category, priority, status, messages, is_deleted, created_at, updated_at
		FROM support_tickets
		WHERE is_deleted = FALSE
	`)
	if err == nil {
		defer tRows.Close()
		for tRows.Next() {
			var t models.SupportTicket
			var messagesJSON []byte
			if err := tRows.Scan(&t.ID, &t.UserID, &t.UserName, &t.UserEmail, &t.Subject, &t.Category, &t.Priority, &t.Status, &messagesJSON, &t.IsDeleted, &t.CreatedAt, &t.UpdatedAt); err == nil {
				if len(messagesJSON) > 0 {
					_ = json.Unmarshal(messagesJSON, &t.Messages)
				}
				s.supportTickets[t.ID] = &t
			}
		}
	}

	log.Printf("[DB] Hydrated in-memory store with %d matches, %d slips, %d users from PostgreSQL", len(s.matches), len(s.betSlips), len(s.users))
}

// Matches
func (s *Store) GetAllMatches(sport models.SportType, status models.MatchStatus) []models.Match {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]models.Match, 0)
	for _, m := range s.matches {
		if m.IsDeleted || m.DeletedAt != nil {
			continue
		}
		if sport != "" && m.Sport != sport {
			continue
		}
		if status != "" && m.Status != status {
			continue
		}
		matchCopy := *m
		if evs, ok := s.events[m.ID]; ok {
			matchCopy.Events = evs
		}
		if o, ok := s.odds[m.ID]; ok {
			matchCopy.Odds = o
		}
		result = append(result, matchCopy)
	}
	return result
}

func (s *Store) GetMatchByID(id string) (*models.Match, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	m, ok := s.matches[id]
	if !ok || m.IsDeleted || m.DeletedAt != nil {
		return nil, false
	}
	matchCopy := *m
	if evs, exists := s.events[id]; exists {
		matchCopy.Events = evs
	}
	if o, exists := s.odds[id]; exists {
		matchCopy.Odds = o
	}
	return &matchCopy, true
}

func (s *Store) SaveMatch(m *models.Match) {
	s.mu.Lock()
	defer s.mu.Unlock()

	matchCopy := *m
	s.matches[m.ID] = &matchCopy

	// Persist to PostgreSQL
	if s.db != nil && s.db.Pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		// 1. Upsert League
		_, _ = s.db.Pool.Exec(ctx, `
			INSERT INTO leagues (id, name, sport_id, country)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sport_id = EXCLUDED.sport_id, country = EXCLUDED.country;
		`, matchCopy.League.ID, matchCopy.League.Name, string(matchCopy.Sport), matchCopy.League.Country)

		// 2. Upsert Home Team
		_, _ = s.db.Pool.Exec(ctx, `
			INSERT INTO teams (id, name, short_name, country)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short_name = EXCLUDED.short_name, country = EXCLUDED.country;
		`, matchCopy.HomeTeam.ID, matchCopy.HomeTeam.Name, matchCopy.HomeTeam.ShortName, matchCopy.HomeTeam.Country)

		// 3. Upsert Away Team
		_, _ = s.db.Pool.Exec(ctx, `
			INSERT INTO teams (id, name, short_name, country)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short_name = EXCLUDED.short_name, country = EXCLUDED.country;
		`, matchCopy.AwayTeam.ID, matchCopy.AwayTeam.Name, matchCopy.AwayTeam.ShortName, matchCopy.AwayTeam.Country)

		// 4. Upsert Match
		if _, err := s.db.Pool.Exec(ctx, `
			INSERT INTO matches (id, sport_id, league_id, home_team_id, away_team_id, home_score, away_score, status, period, minute, start_time, venue, referee, is_deleted, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
			ON CONFLICT (id) DO UPDATE SET
				home_score = EXCLUDED.home_score,
				away_score = EXCLUDED.away_score,
				status = EXCLUDED.status,
				period = EXCLUDED.period,
				minute = EXCLUDED.minute,
				start_time = EXCLUDED.start_time,
				venue = EXCLUDED.venue,
				referee = EXCLUDED.referee,
				is_deleted = EXCLUDED.is_deleted,
				updated_at = EXCLUDED.updated_at;
		`, matchCopy.ID, string(matchCopy.Sport), matchCopy.League.ID, matchCopy.HomeTeam.ID, matchCopy.AwayTeam.ID, matchCopy.HomeScore, matchCopy.AwayScore, string(matchCopy.Status), matchCopy.Period, matchCopy.Minute, matchCopy.StartTime, matchCopy.Venue, matchCopy.Referee, matchCopy.IsDeleted, time.Now(), time.Now()); err != nil {
			log.Printf("[DB ERROR] Failed to save match %s to PostgreSQL: %v", matchCopy.ID, err)
		}
	}

	if s.supabaseSyncer != nil {
		s.supabaseSyncer.SyncMatch(m)
	}
}

func (s *Store) DeleteMatch(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if m, exists := s.matches[id]; exists {
		now := time.Now()
		m.IsDeleted = true
		m.DeletedAt = &now

		if s.db != nil && s.db.Pool != nil {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			_, _ = s.db.Pool.Exec(ctx, `UPDATE matches SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1`, id)
		}
		return true
	}
	return false
}

func (s *Store) ClearAllMatches() int {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	count := 0
	for _, m := range s.matches {
		if !m.IsDeleted {
			m.IsDeleted = true
			m.DeletedAt = &now
			count++
		}
	}

	if s.db != nil && s.db.Pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_, _ = s.db.Pool.Exec(ctx, `UPDATE matches SET is_deleted = TRUE, deleted_at = NOW() WHERE is_deleted = FALSE`)
	}

	return count
}

func (s *Store) AddMatchEvent(event models.MatchEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.events[event.MatchID] = append(s.events[event.MatchID], event)

	if m, ok := s.matches[event.MatchID]; ok {
		m.Events = append(m.Events, event)
	}

	if s.db != nil && s.db.Pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_, _ = s.db.Pool.Exec(ctx, `
			INSERT INTO match_events (id, match_id, type, minute, extra_minute, team_side, player_name, assist_name, detail, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
			ON CONFLICT (id) DO NOTHING;
		`, event.ID, event.MatchID, string(event.Type), event.Minute, event.ExtraMinute, event.TeamSide, event.PlayerName, event.AssistName, event.Detail)
	}
}

func (s *Store) UpdateOdds(matchID string, odds *models.MatchOdds) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.odds[matchID] = odds
	if m, ok := s.matches[matchID]; ok {
		m.Odds = odds
	}
}

// Bet Slips
func (s *Store) SaveBetSlip(slip *models.BetSlip) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.betSlips[slip.ID] = slip
	s.betSlips[slip.BookingCode] = slip

	// Persist to PostgreSQL
	if s.db != nil && s.db.Pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		legsBytes, _ := json.Marshal(slip.Legs)
		_, err := s.db.Pool.Exec(ctx, `
			INSERT INTO bet_slips (id, user_id, bookmaker, booking_code, total_odds, status, legs_json, is_deleted, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			ON CONFLICT (id) DO UPDATE SET
				bookmaker = EXCLUDED.bookmaker,
				booking_code = EXCLUDED.booking_code,
				total_odds = EXCLUDED.total_odds,
				status = EXCLUDED.status,
				legs_json = EXCLUDED.legs_json,
				is_deleted = EXCLUDED.is_deleted,
				updated_at = EXCLUDED.updated_at;
		`, slip.ID, slip.UserID, slip.Bookmaker, slip.BookingCode, slip.TotalOdds, string(slip.Status), legsBytes, slip.IsDeleted, slip.CreatedAt, slip.UpdatedAt)
		if err != nil {
			log.Printf("[DB ERROR] Failed to save betslip %s to PostgreSQL: %v", slip.BookingCode, err)
		}
	}

	if s.supabaseSyncer != nil {
		s.supabaseSyncer.SyncBetSlip(slip)
	}
}

func (s *Store) GetBetSlip(idOrCode string) (*models.BetSlip, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	slip, ok := s.betSlips[idOrCode]
	if !ok || slip.IsDeleted || slip.DeletedAt != nil {
		return nil, false
	}
	return slip, true
}

func (s *Store) GetAllBetSlips() []*models.BetSlip {
	s.mu.RLock()
	defer s.mu.RUnlock()

	seen := make(map[string]bool)
	result := make([]*models.BetSlip, 0)
	for _, slip := range s.betSlips {
		if slip.IsDeleted || slip.DeletedAt != nil {
			continue
		}
		if !seen[slip.ID] {
			seen[slip.ID] = true
			result = append(result, slip)
		}
	}
	return result
}

func (s *Store) DeleteBetSlip(idOrCode string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	slip, ok := s.betSlips[idOrCode]
	if !ok || slip.IsDeleted {
		return false
	}
	now := time.Now()
	slip.IsDeleted = true
	slip.DeletedAt = &now

	if s.db != nil && s.db.Pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_, _ = s.db.Pool.Exec(ctx, `UPDATE bet_slips SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1 OR booking_code = $1`, idOrCode)
	}

	return true
}

func (s *Store) ClearAllBetSlips() int {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	seen := make(map[string]bool)
	count := 0
	for _, slip := range s.betSlips {
		if !seen[slip.ID] && !slip.IsDeleted {
			seen[slip.ID] = true
			slip.IsDeleted = true
			slip.DeletedAt = &now
			count++
		}
	}

	if s.db != nil && s.db.Pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		_, _ = s.db.Pool.Exec(ctx, `UPDATE bet_slips SET is_deleted = TRUE, deleted_at = NOW() WHERE is_deleted = FALSE`)
	}

	return count
}

// Users & Subscriptions
func (s *Store) GetUser(id string) (*models.User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	u, ok := s.users[id]
	if ok && !u.IsDeleted {
		uCopy := *u
		return &uCopy, true
	}

	// Fallback to PostgreSQL
	if s.db != nil && s.db.Pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		var dbUser models.User
		var plan, status string
		err := s.db.Pool.QueryRow(ctx, `
			SELECT id, email, name, password_hash, role, is_admin, plan, plan_expiry, status, country, signup_source, last_seen_at, is_deleted, created_at
			FROM users WHERE id = $1 AND is_deleted = FALSE
		`, id).Scan(&dbUser.ID, &dbUser.Email, &dbUser.Name, &dbUser.PasswordHash, &dbUser.Role, &dbUser.IsAdmin, &plan, &dbUser.PlanExpiry, &status, &dbUser.Country, &dbUser.SignupSource, &dbUser.LastSeenAt, &dbUser.IsDeleted, &dbUser.CreatedAt)
		if err == nil {
			dbUser.Plan = models.UserPlan(plan)
			dbUser.Status = models.UserStatus(status)
			return &dbUser, true
		}
	}

	return nil, false
}

func (s *Store) GetUserByEmail(email string) (*models.User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	cleanEmail := strings.TrimSpace(strings.ToLower(email))
	for _, u := range s.users {
		if !u.IsDeleted && strings.EqualFold(u.Email, cleanEmail) {
			uCopy := *u
			return &uCopy, true
		}
	}

	// Fallback to PostgreSQL
	if s.db != nil && s.db.Pool != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		var dbUser models.User
		var plan, status string
		err := s.db.Pool.QueryRow(ctx, `
			SELECT id, email, name, password_hash, role, is_admin, plan, plan_expiry, status, country, signup_source, last_seen_at, is_deleted, created_at
			FROM users WHERE LOWER(email) = LOWER($1) AND is_deleted = FALSE
		`, cleanEmail).Scan(&dbUser.ID, &dbUser.Email, &dbUser.Name, &dbUser.PasswordHash, &dbUser.Role, &dbUser.IsAdmin, &plan, &dbUser.PlanExpiry, &status, &dbUser.Country, &dbUser.SignupSource, &dbUser.LastSeenAt, &dbUser.IsDeleted, &dbUser.CreatedAt)
		if err == nil {
			dbUser.Plan = models.UserPlan(plan)
			dbUser.Status = models.UserStatus(status)
			return &dbUser, true
		}
	}

	return nil, false
}

func (s *Store) SaveUser(user *models.User) {
	s.mu.Lock()
	defer s.mu.Unlock()

	userCopy := *user
	s.users[user.ID] = &userCopy

	if s.db != nil && s.db.Pool != nil {
		go func(u models.User) {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_, err := s.db.Pool.Exec(ctx, `
				INSERT INTO users (id, email, name, password_hash, role, is_admin, plan, plan_expiry, status, country, signup_source, last_seen_at, is_deleted, created_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
				ON CONFLICT (id) DO UPDATE SET
					email = EXCLUDED.email,
					name = EXCLUDED.name,
					password_hash = CASE WHEN EXCLUDED.password_hash != '' THEN EXCLUDED.password_hash ELSE users.password_hash END,
					role = EXCLUDED.role,
					is_admin = EXCLUDED.is_admin,
					plan = EXCLUDED.plan,
					plan_expiry = EXCLUDED.plan_expiry,
					status = EXCLUDED.status,
					country = EXCLUDED.country,
					last_seen_at = EXCLUDED.last_seen_at,
					is_deleted = EXCLUDED.is_deleted;
			`, u.ID, u.Email, u.Name, u.PasswordHash, u.Role, u.IsAdmin, string(u.Plan), u.PlanExpiry, string(u.Status), u.Country, u.SignupSource, u.LastSeenAt, u.IsDeleted, u.CreatedAt)
			if err != nil {
				log.Printf("[DB ERROR] Failed to save user %s to PostgreSQL: %v", u.Email, err)
			}
		}(*user)
	}

	if s.supabaseSyncer != nil {
		s.supabaseSyncer.SyncUser(user)
	}
}

func (s *Store) UpgradeUserToPro(id string, durationDays int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	expiry := time.Now().Add(time.Duration(durationDays) * 24 * time.Hour)
	if u, ok := s.users[id]; ok {
		u.Plan = models.PlanPro
		u.PlanExpiry = &expiry
		if s.db != nil && s.db.Pool != nil {
			go func() {
				ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
				defer cancel()
				_, _ = s.db.Pool.Exec(ctx, `UPDATE users SET plan = $1, plan_expiry = $2 WHERE id = $3`, string(models.PlanPro), expiry, id)
			}()
		}
		return nil
	}

	newUser := &models.User{
		ID:         id,
		Email:      fmt.Sprintf("%s@user.livescores.io", id),
		Name:       fmt.Sprintf("Pro Subscriber (%s)", id),
		Role:       "user",
		IsAdmin:    false,
		Plan:       models.PlanPro,
		PlanExpiry: &expiry,
		Status:     models.UserActive,
		CreatedAt:  time.Now(),
	}
	s.users[id] = newUser

	if s.db != nil && s.db.Pool != nil {
		go func(u models.User) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, _ = s.db.Pool.Exec(ctx, `
				INSERT INTO users (id, email, name, password_hash, role, is_admin, plan, plan_expiry, status, created_at)
				VALUES ($1, $2, $3, '', 'user', false, $4, $5, 'active', NOW())
				ON CONFLICT (id) DO UPDATE SET plan = EXCLUDED.plan, plan_expiry = EXCLUDED.plan_expiry;
			`, u.ID, u.Email, u.Name, string(u.Plan), u.PlanExpiry)
		}(*newUser)
	}
	return nil
}

func (s *Store) RecordTransaction(tx *models.PaymentTransaction) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.payments[tx.ID] = tx
	s.payments[tx.Reference] = tx

	if s.db != nil && s.db.Pool != nil {
		go func(t models.PaymentTransaction) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, _ = s.db.Pool.Exec(ctx, `
				INSERT INTO payment_transactions (id, user_id, gateway, reference, amount, currency, status, plan, raw_payload, is_deleted, created_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
				ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, is_deleted = EXCLUDED.is_deleted;
			`, t.ID, t.UserID, string(t.Gateway), t.Reference, t.Amount, t.Currency, t.Status, string(t.Plan), t.RawPayload, t.IsDeleted, t.CreatedAt)
		}(*tx)
	}
}

func (s *Store) LogWebhook(log *models.WebhookLog) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.webhookLogs = append([]*models.WebhookLog{log}, s.webhookLogs...)
	if len(s.webhookLogs) > 100 {
		s.webhookLogs = s.webhookLogs[:100]
	}

	if s.db != nil && s.db.Pool != nil {
		go func(w models.WebhookLog) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, _ = s.db.Pool.Exec(ctx, `
				INSERT INTO webhook_logs (id, gateway, event, signature, verified, payload, created_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
				ON CONFLICT (id) DO NOTHING;
			`, w.ID, w.Gateway, w.Event, w.Signature, w.Verified, w.Payload, w.CreatedAt)
		}(*log)
	}
}

func (s *Store) GetWebhookLogs() []*models.WebhookLog {
	s.mu.RLock()
	defer s.mu.RUnlock()

	logsCopy := make([]*models.WebhookLog, len(s.webhookLogs))
	copy(logsCopy, s.webhookLogs)
	return logsCopy
}

func (s *Store) GetFinancialMetrics() models.FinancialMetrics {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var total, flwVol, cryptoVol float64
	var proUsers int

	for _, u := range s.users {
		if !u.IsDeleted && u.Plan == models.PlanPro {
			proUsers++
		}
	}

	seen := make(map[string]bool)
	recent := make([]models.PaymentTransaction, 0)
	for _, tx := range s.payments {
		if !seen[tx.ID] && !tx.IsDeleted {
			seen[tx.ID] = true
			if tx.Status == "successful" || tx.Status == "paid" {
				total += tx.Amount
				if tx.Gateway == models.GatewayFlutterwave {
					flwVol += tx.Amount
				} else if tx.Gateway == models.GatewayCryptomus {
					cryptoVol += tx.Amount
				}
			}
			recent = append(recent, *tx)
		}
	}

	return models.FinancialMetrics{
		TotalRevenueUSD:     total,
		MonthlyRecurringUSD: float64(proUsers) * 9.00,
		FlutterwaveVolume:   flwVol,
		CryptomusVolume:     cryptoVol,
		ActiveProUsers:      proUsers,
		TotalUsers:          len(s.users),
		RecentTransactions:  recent,
	}
}

// Blog Posts
func (s *Store) GetAllBlogPosts(category, tag string) []models.BlogPost {
	s.mu.RLock()
	defer s.mu.RUnlock()

	seen := make(map[string]bool)
	result := make([]models.BlogPost, 0)

	for _, p := range s.posts {
		if p.IsDeleted || p.DeletedAt != nil {
			continue
		}
		if seen[p.ID] {
			continue
		}
		seen[p.ID] = true

		if category != "" && p.Category != category {
			continue
		}

		postCopy := *p
		if postCopy.MatchID != "" {
			if m, ok := s.matches[postCopy.MatchID]; ok {
				matchCopy := *m
				postCopy.Match = &matchCopy
			}
		}
		result = append(result, postCopy)
	}
	return result
}

func (s *Store) GetBlogPostBySlug(slugOrID string) (*models.BlogPost, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	p, ok := s.posts[slugOrID]
	if !ok || p.IsDeleted || p.DeletedAt != nil {
		return nil, false
	}

	p.Views++
	postCopy := *p
	if postCopy.MatchID != "" {
		if m, exists := s.matches[postCopy.MatchID]; exists {
			matchCopy := *m
			postCopy.Match = &matchCopy
		}
	}
	return &postCopy, true
}

func (s *Store) SaveBlogPost(post *models.BlogPost) {
	s.mu.Lock()
	defer s.mu.Unlock()

	postCopy := *post
	s.posts[post.ID] = &postCopy
	s.posts[post.Slug] = &postCopy

	if s.db != nil && s.db.Pool != nil {
		go func(bp models.BlogPost) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, _ = s.db.Pool.Exec(ctx, `
				INSERT INTO blog_posts (id, title, slug, excerpt, content_html, cover_image, category, author_name, author_role, author_avatar, match_id, read_time_min, views, likes, status, is_deleted, published_at, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
				ON CONFLICT (id) DO UPDATE SET
					title = EXCLUDED.title,
					slug = EXCLUDED.slug,
					excerpt = EXCLUDED.excerpt,
					content_html = EXCLUDED.content_html,
					cover_image = EXCLUDED.cover_image,
					category = EXCLUDED.category,
					author_name = EXCLUDED.author_name,
					views = EXCLUDED.views,
					likes = EXCLUDED.likes,
					status = EXCLUDED.status,
					is_deleted = EXCLUDED.is_deleted,
					updated_at = EXCLUDED.updated_at;
			`, bp.ID, bp.Title, bp.Slug, bp.Excerpt, bp.ContentHTML, bp.CoverImage, bp.Category, bp.AuthorName, bp.AuthorRole, bp.AuthorAvatar, bp.MatchID, bp.ReadTimeMin, bp.Views, bp.Likes, bp.Status, bp.IsDeleted, bp.PublishedAt, bp.CreatedAt, bp.UpdatedAt)
		}(*post)
	}

	if s.supabaseSyncer != nil {
		s.supabaseSyncer.SyncBlogPost(post)
	}
}

func (s *Store) LikeBlogPost(slugOrID string) (int, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	p, ok := s.posts[slugOrID]
	if !ok || p.IsDeleted {
		return 0, false
	}
	p.Likes++
	return p.Likes, true
}

func (s *Store) DeleteBlogPost(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	p, ok := s.posts[id]
	if !ok || p.IsDeleted {
		return false
	}
	now := time.Now()
	p.IsDeleted = true
	p.DeletedAt = &now

	if s.db != nil && s.db.Pool != nil {
		go func(bpID string) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, _ = s.db.Pool.Exec(ctx, `UPDATE blog_posts SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1`, bpID)
		}(id)
	}

	return true
}

// Customer Support & Helpdesk
func (s *Store) GetSupportTickets(status string) []*models.SupportTicket {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]*models.SupportTicket, 0)
	for _, t := range s.supportTickets {
		if t.IsDeleted || t.DeletedAt != nil {
			continue
		}
		if status == "" || t.Status == status {
			tCopy := *t
			result = append(result, &tCopy)
		}
	}
	return result
}

func (s *Store) GetSupportTicketByID(id string) (*models.SupportTicket, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	t, ok := s.supportTickets[id]
	if !ok || t.IsDeleted || t.DeletedAt != nil {
		return nil, false
	}
	tCopy := *t
	return &tCopy, true
}

func (s *Store) DeleteSupportTicket(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	t, ok := s.supportTickets[id]
	if !ok || t.IsDeleted {
		return false
	}
	now := time.Now()
	t.IsDeleted = true
	t.DeletedAt = &now

	if s.db != nil && s.db.Pool != nil {
		go func(tID string) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, _ = s.db.Pool.Exec(ctx, `UPDATE support_tickets SET is_deleted = TRUE, deleted_at = NOW() WHERE id = $1`, tID)
		}(id)
	}

	return true
}

func (s *Store) CreateSupportTicket(ticket *models.SupportTicket) {
	s.mu.Lock()
	defer s.mu.Unlock()

	tCopy := *ticket
	s.supportTickets[ticket.ID] = &tCopy

	if s.db != nil && s.db.Pool != nil {
		go func(st models.SupportTicket) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			msgBytes, _ := json.Marshal(st.Messages)
			_, _ = s.db.Pool.Exec(ctx, `
				INSERT INTO support_tickets (id, user_id, user_name, user_email, subject, category, priority, status, messages, is_deleted, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
				ON CONFLICT (id) DO UPDATE SET
					status = EXCLUDED.status,
					priority = EXCLUDED.priority,
					messages = EXCLUDED.messages,
					is_deleted = EXCLUDED.is_deleted,
					updated_at = EXCLUDED.updated_at;
			`, st.ID, st.UserID, st.UserName, st.UserEmail, st.Subject, st.Category, st.Priority, st.Status, msgBytes, st.IsDeleted, st.CreatedAt, st.UpdatedAt)
		}(*ticket)
	}

	if s.supabaseSyncer != nil {
		s.supabaseSyncer.SyncSupportTicket(ticket)
	}
}

func (s *Store) AddSupportMessage(ticketID string, msg *models.SupportTicketMessage) (*models.SupportTicket, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	t, ok := s.supportTickets[ticketID]
	if !ok {
		return nil, false
	}

	t.Messages = append(t.Messages, *msg)
	t.UpdatedAt = time.Now()
	if msg.Sender == "agent" {
		t.Status = "in_progress"
	}
	tCopy := *t

	if s.db != nil && s.db.Pool != nil {
		go func(st models.SupportTicket) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			msgBytes, _ := json.Marshal(st.Messages)
			_, _ = s.db.Pool.Exec(ctx, `
				UPDATE support_tickets SET messages = $1, status = $2, updated_at = NOW() WHERE id = $3
			`, msgBytes, st.Status, st.ID)
		}(tCopy)
	}

	if s.supabaseSyncer != nil {
		s.supabaseSyncer.SyncSupportTicket(&tCopy)
	}

	return &tCopy, true
}
