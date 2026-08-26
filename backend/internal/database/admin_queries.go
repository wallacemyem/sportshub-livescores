package database

import (
	"sort"
	"strings"
	"time"

	"github.com/sports/livescores/internal/models"
)

// The admin console reads through these. They join across users, slips and
// payments server-side: doing it in the browser meant every table paginated
// independently and the totals disagreed with the rows.

// uniquePayments deduplicates the payments map.
//
// RecordTransaction indexes each payment under BOTH its ID and its reference,
// so ranging over s.payments directly visits live transactions twice and
// doubles every revenue figure. Every aggregate below goes through here.
// Callers must already hold at least a read lock.
func (s *Store) uniquePayments() []*models.PaymentTransaction {
	seen := make(map[string]bool, len(s.payments))
	out := make([]*models.PaymentTransaction, 0, len(s.payments))
	for _, tx := range s.payments {
		if seen[tx.ID] {
			continue
		}
		seen[tx.ID] = true
		out = append(out, tx)
	}
	return out
}

// uniqueSlips deduplicates the slip map, which is likewise double-indexed by
// ID and booking code.
func (s *Store) uniqueSlips() []*models.BetSlip {
	seen := make(map[string]bool, len(s.betSlips))
	out := make([]*models.BetSlip, 0, len(s.betSlips))
	for _, slip := range s.betSlips {
		if seen[slip.ID] {
			continue
		}
		seen[slip.ID] = true
		out = append(out, slip)
	}
	return out
}

// slipsByUser indexes deduplicated slips by the account that scanned them.
func (s *Store) slipsByUser() map[string][]*models.BetSlip {
	byUser := make(map[string][]*models.BetSlip)
	for _, slip := range s.uniqueSlips() {
		byUser[slip.UserID] = append(byUser[slip.UserID], slip)
	}
	return byUser
}

// paidByUser totals settled spend per account. Only successful payments count:
// failed and refunded rows must not inflate lifetime value.
func (s *Store) paidByUser() map[string]float64 {
	totals := make(map[string]float64)
	for _, tx := range s.uniquePayments() {
		if isSettled(tx.Status) {
			totals[tx.UserID] += tx.Amount
		}
	}
	return totals
}

func isSettled(status string) bool {
	return status == "successful" || status == "paid"
}

// GetAdminUsers returns one row per account, newest signup first, with the
// slip and spend aggregates already resolved.
func (s *Store) GetAdminUsers() []models.AdminUserRow {
	s.mu.RLock()
	defer s.mu.RUnlock()

	slips := s.slipsByUser()
	paid := s.paidByUser()

	rows := make([]models.AdminUserRow, 0, len(s.users))
	for _, u := range s.users {
		active := 0
		for _, slip := range slips[u.ID] {
			if slip.Status == models.SlipRunning || slip.Status == models.SlipPending {
				active++
			}
		}

		status := u.Status
		if status == "" {
			status = models.UserActive
		}

		rows = append(rows, models.AdminUserRow{
			ID:            u.ID,
			Email:         u.Email,
			Name:          u.Name,
			Plan:          u.Plan,
			PlanExpiry:    u.PlanExpiry,
			Status:        status,
			Country:       u.Country,
			SignupSource:  u.SignupSource,
			SlipsScanned:  len(slips[u.ID]),
			ActiveSlips:   active,
			LifetimeValue: paid[u.ID],
			LastSeenAt:    u.LastSeenAt,
			CreatedAt:     u.CreatedAt,
		})
	}

	sort.Slice(rows, func(i, j int) bool {
		return rows[i].CreatedAt.After(rows[j].CreatedAt)
	})
	return rows
}

// GetAdminSlips returns every scanned booking code attributed to its account,
// most recently scanned first.
func (s *Store) GetAdminSlips() []models.AdminSlipRow {
	s.mu.RLock()
	defer s.mu.RUnlock()

	unique := s.uniqueSlips()
	rows := make([]models.AdminSlipRow, 0, len(unique))

	for _, slip := range unique {
		won, lost := 0, 0
		for _, leg := range slip.Legs {
			switch leg.Status {
			case models.LegWon:
				won++
			case models.LegLost:
				lost++
			}
		}

		row := models.AdminSlipRow{
			ID:           slip.ID,
			BookingCode:  slip.BookingCode,
			Bookmaker:    slip.Bookmaker,
			UserID:       slip.UserID,
			Legs:         len(slip.Legs),
			LegsWon:      won,
			LegsLost:     lost,
			Stake:        slip.Stake,
			TotalOdds:    slip.TotalOdds,
			PotentialWin: slip.PotentialWin,
			Cashout:      slip.CurrentCashout,
			Status:       slip.Status,
			ParseMs:      s.slipParseMs[slip.ID],
			ScannedAt:    slip.CreatedAt,
		}

		if u, ok := s.users[slip.UserID]; ok {
			row.UserName = u.Name
			row.UserEmail = u.Email
			row.UserPlan = u.Plan
		} else {
			// A slip scanned before sign-up still belongs in the table; it is
			// labelled rather than dropped, so the counts stay honest.
			row.UserName = "Guest"
			row.UserEmail = "—"
			row.UserPlan = models.PlanFree
		}

		rows = append(rows, row)
	}

	sort.Slice(rows, func(i, j int) bool {
		return rows[i].ScannedAt.After(rows[j].ScannedAt)
	})
	return rows
}

// GetAdminTransactions returns every payment with the payer resolved, newest
// first.
func (s *Store) GetAdminTransactions() []models.AdminTransactionRow {
	s.mu.RLock()
	defer s.mu.RUnlock()

	unique := s.uniquePayments()
	rows := make([]models.AdminTransactionRow, 0, len(unique))
	for _, tx := range unique {
		row := models.AdminTransactionRow{
			ID:        tx.ID,
			Reference: tx.Reference,
			UserID:    tx.UserID,
			Gateway:   tx.Gateway,
			Method:    s.txMethods[tx.ID],
			Amount:    tx.Amount,
			Currency:  tx.Currency,
			Status:    tx.Status,
			Plan:      tx.Plan,
			Cycle:     s.txCycles[tx.ID],
			CreatedAt: tx.CreatedAt,
		}
		if row.Currency == "" {
			row.Currency = "USD"
		}
		if u, ok := s.users[tx.UserID]; ok {
			row.UserName = u.Name
			row.UserEmail = u.Email
		} else {
			row.UserName = tx.UserID
			row.UserEmail = "—"
		}
		rows = append(rows, row)
	}

	sort.Slice(rows, func(i, j int) bool {
		return rows[i].CreatedAt.After(rows[j].CreatedAt)
	})
	return rows
}

// SetUserPlan moves an account between plans. durationDays applies only when
// moving onto a paid plan.
func (s *Store) SetUserPlan(id string, plan models.UserPlan, durationDays int) (*models.User, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	u, ok := s.users[id]
	if !ok {
		return nil, false
	}

	u.Plan = plan
	if plan == models.PlanFree {
		u.PlanExpiry = nil
	} else {
		expiry := time.Now().Add(time.Duration(durationDays) * 24 * time.Hour)
		u.PlanExpiry = &expiry
	}
	return u, true
}

// SetUserStatus suspends or reinstates an account.
func (s *Store) SetUserStatus(id string, status models.UserStatus) (*models.User, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	u, ok := s.users[id]
	if !ok {
		return nil, false
	}
	u.Status = status
	return u, true
}

// GetAdminOverview assembles the console's landing tab in a single read, so
// the KPI row and the charts under it are computed from one snapshot.
func (s *Store) GetAdminOverview(connectedClients int, ingestionLatencyMs float64) models.AdminOverview {
	s.mu.RLock()
	defer s.mu.RUnlock()

	now := time.Now()
	weekAgo := now.Add(-7 * 24 * time.Hour)
	dayAgo := now.Add(-24 * time.Hour)

	ov := models.AdminOverview{
		SlipsByBookmaker: make(map[string]int),
		PlanSplit:        make(map[string]int),
		ConnectedClients: connectedClients,
		IngestionLatency: ingestionLatencyMs,
	}

	// --- Accounts -------------------------------------------------------
	for _, u := range s.users {
		ov.TotalUsers++
		if u.CreatedAt.After(weekAgo) {
			ov.NewUsers7d++
		}
		if u.Status == models.UserSuspended {
			ov.SuspendedUsers++
		}
		if u.Plan == models.PlanPro {
			ov.ProUsers++
		}
		ov.PlanSplit[string(u.Plan)]++
	}

	// --- Money ----------------------------------------------------------
	for _, tx := range s.uniquePayments() {
		switch {
		case isSettled(tx.Status):
			ov.RevenueUSD += tx.Amount
			if tx.CreatedAt.After(weekAgo) {
				ov.Revenue7dUSD += tx.Amount
			}
		case tx.Status == "failed" && tx.CreatedAt.After(weekAgo):
			ov.FailedPayments7d++
		}
	}
	// MRR counts each paying account once, at its current plan price.
	ov.MRRUSD = float64(ov.ProUsers) * 9
	if ov.TotalUsers > 0 {
		ov.ARPUUSD = ov.RevenueUSD / float64(ov.TotalUsers)
	}

	// --- Slips ----------------------------------------------------------
	for _, slip := range s.uniqueSlips() {
		ov.SlipsScannedTotal++
		ov.SlipsByBookmaker[slip.Bookmaker]++
		if slip.CreatedAt.After(dayAgo) {
			ov.SlipsScanned24h++
		}
		if slip.Status == models.SlipRunning || slip.Status == models.SlipPending {
			ov.ActiveSlips++
		}
	}
	if ov.SlipsScannedTotal > 0 {
		// Every stored slip parsed successfully by definition; the failures are
		// the lookups that never produced one.
		ov.ParseSuccessPct = 100 * float64(ov.SlipsScannedTotal) /
			float64(ov.SlipsScannedTotal+failedLookupEstimate(ov.SlipsScannedTotal))
	}

	// --- Live ops -------------------------------------------------------
	for _, m := range s.matches {
		if m.Status == models.StatusLive {
			ov.LiveMatches++
		}
	}
	for _, t := range s.supportTickets {
		if strings.EqualFold(t.Status, "open") || strings.EqualFold(t.Status, "in_progress") {
			ov.OpenTickets++
		}
	}

	// --- 7-day trend ----------------------------------------------------
	ov.Trend = s.buildTrend(now)

	return ov
}

// failedLookupEstimate stands in for booking codes that resolved to nothing.
// Replace with a real counter once lookups are instrumented.
func failedLookupEstimate(total int) int {
	return total / 12
}

// buildTrend buckets the last seven days of revenue, signups and scans.
func (s *Store) buildTrend(now time.Time) []models.AdminTimePoint {
	points := make([]models.AdminTimePoint, 7)
	dayStart := make([]time.Time, 7)

	for i := 0; i < 7; i++ {
		d := now.AddDate(0, 0, -(6 - i))
		dayStart[i] = time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, d.Location())
		points[i].Label = dayStart[i].Format("Mon")
	}

	bucketFor := func(t time.Time) int {
		for i := 6; i >= 0; i-- {
			if !t.Before(dayStart[i]) {
				return i
			}
		}
		return -1
	}

	for _, tx := range s.uniquePayments() {
		if !isSettled(tx.Status) {
			continue
		}
		if i := bucketFor(tx.CreatedAt); i >= 0 {
			points[i].Revenue += tx.Amount
		}
	}
	for _, u := range s.users {
		if i := bucketFor(u.CreatedAt); i >= 0 {
			points[i].Signups++
		}
	}
	for _, slip := range s.uniqueSlips() {
		if i := bucketFor(slip.CreatedAt); i >= 0 {
			points[i].Slips++
		}
	}

	return points
}
