package database

import (
	"fmt"
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

	// Side tables for detail the core models do not carry. Keyed by the
	// transaction / slip ID they annotate.
	txMethods   map[string]string
	txCycles    map[string]string
	slipParseMs map[string]int
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

	// Seed blog posts
	for _, p := range GetInitialBlogPosts() {
		pCopy := p
		store.posts[p.ID] = &pCopy
		store.posts[p.Slug] = &pCopy
	}

	// Seed Sample Support Inquiries
	store.supportTickets["tkt_sup_01"] = &models.SupportTicket{
		ID:        "tkt_sup_01",
		UserID:    "usr_pro_01",
		UserName:  "Alex Mercer",
		UserEmail: "alex.mercer@example.com",
		Subject:   "Booking code not resolving on MSport",
		Category:  "Slip tracking",
		Priority:  "high",
		Status:    "in_progress",
		Messages: []models.SupportTicketMessage{
			{
				ID:         "msg_01",
				Sender:     "user",
				SenderName: "Alex Mercer",
				Message:    "My MSport code MS-90441 only shows 3 of the 4 legs on my slip.",
				CreatedAt:  time.Now().Add(-2 * time.Hour),
			},
			{
				ID:         "msg_02",
				Sender:     "agent",
				SenderName: "Support",
				Message:    "Thanks Alex - checking the parser logs for that code now.",
				CreatedAt:  time.Now().Add(-1 * time.Hour),
			},
		},
		CreatedAt: time.Now().Add(-2 * time.Hour),
		UpdatedAt: time.Now().Add(-1 * time.Hour),
	}

	store.supportTickets["tkt_sup_02"] = &models.SupportTicket{
		ID:        "tkt_sup_02",
		UserID:    "usr_free_05",
		UserName:  "Brian Otieno",
		UserEmail: "brian.otieno@example.com",
		Subject:   "Refund for a duplicate charge",
		Category:  "Billing",
		Priority:  "medium",
		Status:    "open",
		Messages: []models.SupportTicketMessage{
			{
				ID:         "msg_03",
				Sender:     "user",
				SenderName: "Brian Otieno",
				Message:    "I was charged twice for the monthly plan this week.",
				CreatedAt:  time.Now().Add(-24 * time.Hour),
			},
			{
				ID:         "msg_04",
				Sender:     "agent",
				SenderName: "Support",
				Message:    "Thanks for flagging - raising the refund with the gateway now.",
				CreatedAt:  time.Now().Add(-23 * time.Hour),
			},
		},
		CreatedAt: time.Now().Add(-24 * time.Hour),
		UpdatedAt: time.Now().Add(-23 * time.Hour),
	}

	// Seed in-memory store
	for _, m := range GetInitialMatches() {
		matchCopy := m
		store.matches[m.ID] = &matchCopy
		if len(m.Events) > 0 {
			store.events[m.ID] = append([]models.MatchEvent{}, m.Events...)
		}
		if m.Odds != nil {
			store.odds[m.ID] = m.Odds
		}
	}

	// Seed the accounts, payments and scanned slips the admin console reads.
	// This supersedes the two-user / one-slip fixture that used to live here.
	store.seedAdminPopulation()

	return store
}


// Matches
func (s *Store) GetAllMatches(sport models.SportType, status models.MatchStatus) []models.Match {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]models.Match, 0)
	for _, m := range s.matches {
		if sport != "" && m.Sport != sport {
			continue
		}
		if status != "" && m.Status != status {
			continue
		}
		matchCopy := *m
		// Attach latest events and odds
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
	if !ok {
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
}

func (s *Store) AddMatchEvent(event models.MatchEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.events[event.MatchID] = append(s.events[event.MatchID], event)

	if m, ok := s.matches[event.MatchID]; ok {
		m.Events = append(m.Events, event)
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
}

func (s *Store) GetBetSlip(idOrCode string) (*models.BetSlip, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	slip, ok := s.betSlips[idOrCode]
	if !ok {
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
		if !seen[slip.ID] {
			seen[slip.ID] = true
			result = append(result, slip)
		}
	}
	return result
}

// Users & Subscriptions
func (s *Store) GetUser(id string) (*models.User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	u, ok := s.users[id]
	return u, ok
}

func (s *Store) UpgradeUserToPro(id string, durationDays int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	expiry := time.Now().Add(time.Duration(durationDays) * 24 * time.Hour)
	if u, ok := s.users[id]; ok {
		u.Plan = models.PlanPro
		u.PlanExpiry = &expiry
		return nil
	}

	// Create user if not exists
	s.users[id] = &models.User{
		ID:         id,
		Email:      fmt.Sprintf("%s@user.livescores.io", id),
		Name:       fmt.Sprintf("Pro Subscriber (%s)", id),
		Plan:       models.PlanPro,
		PlanExpiry: &expiry,
		CreatedAt:  time.Now(),
	}
	return nil
}

func (s *Store) RecordTransaction(tx *models.PaymentTransaction) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.payments[tx.ID] = tx
	s.payments[tx.Reference] = tx
}

func (s *Store) LogWebhook(log *models.WebhookLog) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.webhookLogs = append([]*models.WebhookLog{log}, s.webhookLogs...)
	if len(s.webhookLogs) > 100 {
		s.webhookLogs = s.webhookLogs[:100]
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
		if u.Plan == models.PlanPro {
			proUsers++
		}
	}

	seen := make(map[string]bool)
	recent := make([]models.PaymentTransaction, 0)
	for _, tx := range s.payments {
		if !seen[tx.ID] {
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

	// No padded baselines here. These used to add a few thousand dollars and
	// a few thousand users to make the dashboard look busy, which meant the
	// finance tab and the overview KPIs reported different totals for the
	// same data. Everything is now derived from the transactions above.
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
	if !ok {
		return nil, false
	}

	p.Views++ // Auto-increment view count
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
}

func (s *Store) LikeBlogPost(slugOrID string) (int, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	p, ok := s.posts[slugOrID]
	if !ok {
		return 0, false
	}
	p.Likes++
	return p.Likes, true
}

func (s *Store) DeleteBlogPost(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	p, ok := s.posts[id]
	if !ok {
		return false
	}
	delete(s.posts, p.ID)
	delete(s.posts, p.Slug)
	return true
}

// Customer Support & Helpdesk
func (s *Store) GetSupportTickets(status string) []*models.SupportTicket {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]*models.SupportTicket, 0)
	for _, t := range s.supportTickets {
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
	if !ok {
		return nil, false
	}
	tCopy := *t
	return &tCopy, true
}

func (s *Store) CreateSupportTicket(ticket *models.SupportTicket) {
	s.mu.Lock()
	defer s.mu.Unlock()

	tCopy := *ticket
	s.supportTickets[ticket.ID] = &tCopy
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
	return &tCopy, true
}


