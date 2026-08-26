package database

import (
	"fmt"
	"math"
	"time"

	"github.com/sports/livescores/internal/models"
)

// seedAdminPopulation fills the store with a population large enough that the
// admin console's tables, filters and pagination are exercised: accounts on
// both plans, a suspended account, payments across both gateways including
// failures and refunds, and scanned slips attributed to real accounts.
//
// Everything here is demo data. It is seeded in one place so it can be deleted
// in one place once a real datastore is wired in behind Store.
func (s *Store) seedAdminPopulation() {
	now := time.Now()

	type seedUser struct {
		id      string
		name    string
		email   string
		plan    models.UserPlan
		status  models.UserStatus
		country string
		source  string
		ageDays int
		seenMin int
	}

	people := []seedUser{
		{"usr_pro_01", "Alex Mercer", "alex.mercer@example.com", models.PlanPro, models.UserActive, "NG", "organic", 128, 4},
		{"usr_free_01", "Jordan Smith", "jordan.smith@example.com", models.PlanFree, models.UserActive, "GH", "organic", 96, 22},
		{"usr_pro_02", "Chidera Okafor", "chidera.okafor@example.com", models.PlanPro, models.UserActive, "NG", "referral", 74, 11},
		{"usr_pro_03", "Amara Nwosu", "amara.nwosu@example.com", models.PlanPro, models.UserActive, "NG", "paid_social", 61, 2},
		{"usr_free_02", "Tunde Bakare", "tunde.bakare@example.com", models.PlanFree, models.UserActive, "NG", "organic", 54, 190},
		{"usr_free_03", "Kwame Mensah", "kwame.mensah@example.com", models.PlanFree, models.UserActive, "GH", "referral", 47, 66},
		{"usr_pro_04", "Sipho Dlamini", "sipho.dlamini@example.com", models.PlanPro, models.UserActive, "ZA", "organic", 39, 8},
		{"usr_free_04", "Grace Adeyemi", "grace.adeyemi@example.com", models.PlanFree, models.UserActive, "NG", "paid_search", 33, 41},
		{"usr_free_05", "Brian Otieno", "brian.otieno@example.com", models.PlanFree, models.UserSuspended, "KE", "organic", 28, 1440},
		{"usr_pro_05", "Fatima Bello", "fatima.bello@example.com", models.PlanPro, models.UserActive, "NG", "referral", 21, 17},
		{"usr_free_06", "Daniel Mwangi", "daniel.mwangi@example.com", models.PlanFree, models.UserActive, "KE", "organic", 16, 130},
		{"usr_free_07", "Zanele Khumalo", "zanele.khumalo@example.com", models.PlanFree, models.UserActive, "ZA", "paid_social", 11, 75},
		{"usr_pro_06", "Emeka Eze", "emeka.eze@example.com", models.PlanPro, models.UserActive, "NG", "organic", 6, 3},
		{"usr_free_08", "Aisha Sani", "aisha.sani@example.com", models.PlanFree, models.UserActive, "NG", "organic", 2, 34},
	}

	for _, p := range people {
		u := &models.User{
			ID:           p.id,
			Email:        p.email,
			Name:         p.name,
			Plan:         p.plan,
			Status:       p.status,
			Country:      p.country,
			SignupSource: p.source,
			CreatedAt:    now.Add(-time.Duration(p.ageDays) * 24 * time.Hour),
			LastSeenAt:   now.Add(-time.Duration(p.seenMin) * time.Minute),
		}
		if p.plan == models.PlanPro {
			expiry := now.Add(time.Duration(30-(p.ageDays%28)) * 24 * time.Hour)
			u.PlanExpiry = &expiry
		}
		s.users[u.ID] = u
	}

	// ---------------------------------------------------------------------
	// Payments. Amounts follow the published plans: Pro $9/mo or $86/yr,
	// Elite $29/mo or $279/yr.
	// ---------------------------------------------------------------------
	type seedTx struct {
		userID  string
		gateway models.PaymentGateway
		method  string
		amount  float64
		status  string
		cycle   string
		hoursAgo int
	}

	payments := []seedTx{
		{"usr_pro_01", models.GatewayCryptomus, "USDT (TRC20)", 86, "successful", "annual", 3},
		{"usr_pro_03", models.GatewayFlutterwave, "Visa •••• 4417", 9, "successful", "monthly", 9},
		{"usr_pro_06", models.GatewayFlutterwave, "Bank transfer", 9, "successful", "monthly", 20},
		{"usr_pro_05", models.GatewayCryptomus, "BTC", 279, "successful", "annual", 31},
		{"usr_free_02", models.GatewayFlutterwave, "Mastercard •••• 8802", 9, "failed", "monthly", 44},
		{"usr_pro_02", models.GatewayCryptomus, "USDT (ERC20)", 86, "successful", "annual", 52},
		{"usr_pro_04", models.GatewayFlutterwave, "Visa •••• 1190", 29, "successful", "monthly", 68},
		{"usr_free_05", models.GatewayFlutterwave, "Visa •••• 3321", 9, "refunded", "monthly", 96},
		{"usr_pro_01", models.GatewayCryptomus, "USDT (TRC20)", 9, "successful", "monthly", 120},
		{"usr_free_04", models.GatewayFlutterwave, "USSD", 9, "failed", "monthly", 141},
		{"usr_pro_03", models.GatewayFlutterwave, "Visa •••• 4417", 9, "successful", "monthly", 168},
		{"usr_pro_02", models.GatewayCryptomus, "ETH", 29, "pending", "monthly", 2},
		{"usr_pro_05", models.GatewayFlutterwave, "Bank transfer", 86, "successful", "annual", 210},
		{"usr_pro_04", models.GatewayCryptomus, "SOL", 29, "successful", "monthly", 252},
		{"usr_free_06", models.GatewayFlutterwave, "Visa •••• 7734", 9, "failed", "monthly", 15},
		{"usr_pro_06", models.GatewayCryptomus, "USDT (Polygon)", 279, "successful", "annual", 300},
	}

	for i, p := range payments {
		plan := models.PlanPro
		id := fmt.Sprintf("txn_%03d", i+1)
		tx := &models.PaymentTransaction{
			ID:        id,
			UserID:    p.userID,
			Gateway:   p.gateway,
			Reference: fmt.Sprintf("%s-%s", refPrefix(p.gateway), id),
			Amount:    p.amount,
			Currency:  "USD",
			Status:    p.status,
			Plan:      plan,
			CreatedAt: now.Add(-time.Duration(p.hoursAgo) * time.Hour),
		}
		s.payments[tx.ID] = tx
		s.txMethods[tx.ID] = p.method
		s.txCycles[tx.ID] = p.cycle
	}

	// ---------------------------------------------------------------------
	// Scanned slips, attributed to accounts. Legs are built from whichever
	// seeded matches exist so this stays valid if the fixture list changes.
	// ---------------------------------------------------------------------
	matchIDs := []string{
		"match-epl-01", "match-ucl-02", "match-nba-01", "match-tennis-01",
		"match-nfl-01", "match-ipl-01", "match-ucl-03", "match-epl-04",
	}
	available := make([]*models.Match, 0, len(matchIDs))
	for _, id := range matchIDs {
		if m, ok := s.matches[id]; ok {
			available = append(available, m)
		}
	}
	if len(available) == 0 {
		return
	}

	type seedSlip struct {
		code      string
		bookmaker string
		userID    string
		legs      int
		stake     float64
		status    models.BetSlipStatus
		minsAgo   int
		parseMs   int
	}

	slips := []seedSlip{
		{"BC99214", "sportybet", "usr_pro_01", 3, 50, models.SlipRunning, 122, 214},
		{"B9JA-44912", "bet9ja", "usr_pro_03", 4, 25, models.SlipRunning, 96, 309},
		{"1X-88231", "1xbet", "usr_free_01", 2, 10, models.SlipWon, 240, 188},
		{"BK-10294", "betking", "usr_pro_02", 5, 100, models.SlipLost, 355, 402},
		{"BC77410", "sportybet", "usr_pro_04", 3, 30, models.SlipRunning, 41, 176},
		{"MS-55120", "msport", "usr_free_03", 2, 5, models.SlipRunning, 28, 231},
		{"B9JA-90233", "bet9ja", "usr_pro_05", 6, 75, models.SlipCashedOut, 480, 517},
		{"MZ-31877", "mozzartbet", "usr_free_04", 3, 15, models.SlipLost, 640, 268},
		{"1X-45019", "1xbet", "usr_pro_06", 4, 40, models.SlipRunning, 17, 199},
		{"BC30188", "sportybet", "usr_free_06", 2, 8, models.SlipRunning, 12, 163},
		{"BK-77620", "betking", "usr_pro_01", 3, 60, models.SlipWon, 1500, 244},
		{"B9JA-11784", "bet9ja", "usr_free_07", 3, 12, models.SlipRunning, 8, 287},
		{"MS-90441", "msport", "usr_pro_02", 4, 45, models.SlipRunning, 5, 205},
		{"BC61903", "sportybet", "usr_free_08", 2, 20, models.SlipPending, 3, 151},
	}

	for _, sl := range slips {
		slip := s.buildSeedSlip(sl.code, sl.bookmaker, sl.userID, sl.legs, sl.stake,
			sl.status, now.Add(-time.Duration(sl.minsAgo)*time.Minute), available)
		s.betSlips[slip.ID] = slip
		s.betSlips[slip.BookingCode] = slip
		s.slipParseMs[slip.ID] = sl.parseMs
	}
}

func refPrefix(g models.PaymentGateway) string {
	if g == models.GatewayCryptomus {
		return "CRYP"
	}
	return "FLW"
}

// buildSeedSlip assembles one slip from the available fixtures, deriving odds
// and payouts so the numbers in the table are internally consistent.
func (s *Store) buildSeedSlip(
	code, bookmaker, userID string,
	legCount int,
	stake float64,
	status models.BetSlipStatus,
	created time.Time,
	available []*models.Match,
) *models.BetSlip {
	markets := []struct{ market, selection string }{
		{"1X2", "Home"},
		{"Over/Under 2.5", "Over 2.5 Goals"},
		{"Both Teams To Score", "Yes"},
		{"Moneyline", "Away"},
		{"Double Chance", "1X"},
		{"Handicap", "Home -1.5"},
	}

	legs := make([]models.BetSlipLeg, 0, legCount)
	totalOdds := 1.0

	for i := 0; i < legCount; i++ {
		m := available[(i+len(code))%len(available)]
		mk := markets[(i+len(bookmaker))%len(markets)]
		odds := 1.35 + float64((i*17+len(code)*7)%95)/100.0
		totalOdds *= odds

		legStatus := models.LegRunning
		switch status {
		case models.SlipWon:
			legStatus = models.LegWon
		case models.SlipLost:
			// A lost slip has at least one losing leg; the rest landed.
			if i == legCount-1 {
				legStatus = models.LegLost
			} else {
				legStatus = models.LegWon
			}
		case models.SlipPending:
			legStatus = models.LegPending
		}

		legs = append(legs, models.BetSlipLeg{
			ID:             fmt.Sprintf("%s-leg-%d", code, i+1),
			MatchID:        m.ID,
			Match:          *m,
			Market:         mk.market,
			Selection:      mk.selection,
			Odds:           roundTo(odds, 2),
			Status:         legStatus,
			CurrentScore:   fmt.Sprintf("%d-%d", m.HomeScore, m.AwayScore),
			FulfillmentPct: float64(45 + (i*13+len(code)*3)%50),
		})
	}

	totalOdds = roundTo(totalOdds, 2)
	potential := roundTo(stake*totalOdds, 2)

	// Cash-out tracks how much of the slip has landed; a settled slip has none.
	probability := 0.0
	cashout := 0.0
	switch status {
	case models.SlipRunning, models.SlipPending:
		probability = roundTo(0.35+float64(len(code)%40)/100.0, 2)
		cashout = roundTo(potential*probability*0.78, 2)
	case models.SlipWon:
		probability = 1
		cashout = potential
	case models.SlipCashedOut:
		probability = roundTo(0.5+float64(len(code)%30)/100.0, 2)
		cashout = roundTo(potential*probability*0.7, 2)
	}

	return &models.BetSlip{
		ID:                 "slip-" + code,
		UserID:             userID,
		Bookmaker:          bookmaker,
		BookingCode:        code,
		Stake:              stake,
		TotalOdds:          totalOdds,
		PotentialWin:       potential,
		CurrentCashout:     cashout,
		CashoutProbability: probability,
		Status:             status,
		Legs:               legs,
		CreatedAt:          created,
		UpdatedAt:          created.Add(20 * time.Minute),
	}
}

func roundTo(v float64, places int) float64 {
	shift := math.Pow(10, float64(places))
	return math.Round(v*shift) / shift
}
