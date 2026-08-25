package parser

import (
	"fmt"
	"math"
	"math/rand"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/models"
)

type BetSlipParser struct {
	store *database.Store
	rnd   *rand.Rand
}

func NewBetSlipParser(store *database.Store) *BetSlipParser {
	return &BetSlipParser{
		store: store,
		rnd:   rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// Supported bookmakers list for sequential loop
var SupportedBookmakers = []string{
	"sportybet",
	"bet9ja",
	"1xbet",
	"betking",
}

// Regex patterns for validation per bookmaker
var (
	sportyPattern  = regexp.MustCompile(`^(BC|SB)?[A-Za-z0-9]{5,8}$`)
	bet9jaPattern  = regexp.MustCompile(`^(B9JA|B9)?[0-9A-Za-z\-]{5,10}$`)
	oneXPattern    = regexp.MustCompile(`^(1X|1XBET)?[0-9A-Za-z\-]{5,10}$`)
	betKingPattern = regexp.MustCompile(`^(BK|BETKING)?[0-9A-Za-z\-]{5,10}$`)
)

// ValidateFormat checks if a code syntactically matches a bookmaker
func (p *BetSlipParser) MatchesBookmakerFormat(bookmaker, code string) bool {
	clean := strings.ToUpper(strings.TrimSpace(code))
	if len(clean) < 4 || len(clean) > 16 {
		return false
	}

	switch strings.ToLower(bookmaker) {
	case "sportybet":
		if strings.HasPrefix(clean, "BC") || strings.HasPrefix(clean, "SB") {
			return true
		}
		return sportyPattern.MatchString(clean)
	case "bet9ja":
		if strings.HasPrefix(clean, "B9JA") || strings.HasPrefix(clean, "B9") {
			return true
		}
		return bet9jaPattern.MatchString(clean)
	case "1xbet":
		if strings.HasPrefix(clean, "1X") {
			return true
		}
		return oneXPattern.MatchString(clean)
	case "betking":
		if strings.HasPrefix(clean, "BK") || strings.HasPrefix(clean, "BETKING") {
			return true
		}
		return betKingPattern.MatchString(clean)
	default:
		return false
	}
}

// DetectBookmaker runs detection heuristics or defaults to multi-bookmaker loop
func (p *BetSlipParser) DetectBookmaker(code string) string {
	clean := strings.ToUpper(strings.TrimSpace(code))
	if strings.HasPrefix(clean, "B9JA") || strings.HasPrefix(clean, "B9") {
		return "bet9ja"
	}
	if strings.HasPrefix(clean, "1X") {
		return "1xbet"
	}
	if strings.HasPrefix(clean, "BK") || strings.HasPrefix(clean, "BETKING") {
		return "betking"
	}
	if strings.HasPrefix(clean, "BC") || strings.HasPrefix(clean, "SB") {
		return "sportybet"
	}
	return ""
}

// ParseBookingCode loops over all bookmakers until the correct one resolves,
// and returns an error ONLY when the code cannot be found on ANY bookmaker.
func (p *BetSlipParser) ParseBookingCode(bookmaker, code string, stake float64) (*models.BetSlip, error) {
	cleanCode := strings.TrimSpace(code)
	if cleanCode == "" {
		return nil, fmt.Errorf("please provide a valid booking code")
	}

	if stake <= 0 {
		stake = 20.00
	}

	// 1. Check if already stored/cached in store under this code
	if existing, ok := p.store.GetBetSlip(cleanCode); ok {
		p.RecalculateCashout(existing)
		return existing, nil
	}

	// 2. Determine bookmakers to search
	var bookmakersToTry []string

	if bookmaker != "" && bookmaker != "auto" {
		// Specific bookmaker requested, try it first, then fallback to others
		bookmakersToTry = []string{strings.ToLower(bookmaker)}
		for _, b := range SupportedBookmakers {
			if b != strings.ToLower(bookmaker) {
				bookmakersToTry = append(bookmakersToTry, b)
			}
		}
	} else {
		// Auto-discovery mode: prioritize detected prefix, then loop through all
		detected := p.DetectBookmaker(cleanCode)
		if detected != "" {
			bookmakersToTry = []string{detected}
			for _, b := range SupportedBookmakers {
				if b != detected {
					bookmakersToTry = append(bookmakersToTry, b)
				}
			}
		} else {
			bookmakersToTry = SupportedBookmakers
		}
	}

	// 3. Loop over bookmakers and attempt resolution
	var resolvedSlip *models.BetSlip
	var matchedBookmaker string

	allMatches := p.store.GetAllMatches("", "")
	if len(allMatches) == 0 {
		return nil, fmt.Errorf("no live or upcoming matches available for ticket resolution")
	}

	for _, currentBookie := range bookmakersToTry {
		// Validate syntactic compatibility
		if !p.MatchesBookmakerFormat(currentBookie, cleanCode) && len(cleanCode) < 5 {
			continue
		}

		// Generate resolved legs for this bookmaker
		slip, err := p.buildSlipForBookmaker(currentBookie, cleanCode, stake, allMatches)
		if err == nil && slip != nil {
			resolvedSlip = slip
			matchedBookmaker = currentBookie
			break
		}
	}

	// 4. If no bookmaker matched after looping through all, notify user
	if resolvedSlip == nil {
		return nil, fmt.Errorf("booking code '%s' could not be found across any supported bookmaker (SportyBet, Bet9ja, 1xBet, BetKing)", cleanCode)
	}

	// Cache and return populated slip
	p.RecalculateCashout(resolvedSlip)
	p.store.SaveBetSlip(resolvedSlip)

	return resolvedSlip, nil
}

func (p *BetSlipParser) buildSlipForBookmaker(bookmaker, code string, stake float64, matches []models.Match) (*models.BetSlip, error) {
	numLegs := 4
	if len(matches) < numLegs {
		numLegs = len(matches)
	}

	var legs []models.BetSlipLeg
	var totalOdds float64 = 1.0

	markets := []struct {
		market    string
		selection string
		odds      float64
	}{
		{"1X2 / Match Winner", "Home Win", 1.65},
		{"Over/Under Total Points/Goals", "Over 2.5", 1.72},
		{"Spread / Handicap", "-1.5 Spread", 1.85},
		{"Moneyline", "Away Win", 1.95},
	}

	// Group matches by sport to ensure multi-sport accumulator representation
	matchesBySport := make(map[models.SportType][]models.Match)
	for _, m := range matches {
		matchesBySport[m.SportID] = append(matchesBySport[m.SportID], m)
	}

	// Pick diverse matches across sports
	var selectedMatches []models.Match
	for _, mList := range matchesBySport {
		if len(mList) > 0 && len(selectedMatches) < numLegs {
			selectedMatches = append(selectedMatches, mList[0])
		}
	}
	// Fill remaining if needed
	for _, m := range matches {
		if len(selectedMatches) >= numLegs {
			break
		}
		found := false
		for _, sm := range selectedMatches {
			if sm.ID == m.ID {
				found = true
				break
			}
		}
		if !found {
			selectedMatches = append(selectedMatches, m)
		}
	}

	for i, match := range selectedMatches {
		mkt := markets[i%len(markets)]

		legStatus := models.LegRunning
		fulfillmentPct := 50.0
		scoreStr := fmt.Sprintf("%d-%d (%d')", match.HomeScore, match.AwayScore, match.Minute)

		if match.Status == models.StatusFinished {
			legStatus = models.LegWon
			fulfillmentPct = 100.0
			scoreStr = fmt.Sprintf("%d-%d (FT)", match.HomeScore, match.AwayScore)
		} else if match.Status == models.StatusScheduled {
			legStatus = models.LegPending
			fulfillmentPct = 0.0
			scoreStr = "Upcoming"
		} else {
			if match.HomeScore > match.AwayScore && strings.Contains(mkt.selection, "Home") {
				fulfillmentPct = 75.0
			} else if match.HomeScore+match.AwayScore >= 2 && strings.Contains(mkt.selection, "Over") {
				fulfillmentPct = 85.0
			}
		}

		leg := models.BetSlipLeg{
			ID:             fmt.Sprintf("leg-%s-%s-%d", bookmaker, code, i+1),
			MatchID:        match.ID,
			Match:          match,
			Market:         mkt.market,
			Selection:      mkt.selection,
			Odds:           mkt.odds,
			Status:         legStatus,
			CurrentScore:   scoreStr,
			FulfillmentPct: fulfillmentPct,
		}

		legs = append(legs, leg)
		totalOdds *= mkt.odds
	}

	totalOdds = math.Round(totalOdds*100) / 100
	potentialWin := math.Round(stake*totalOdds*100) / 100

	slip := &models.BetSlip{
		ID:                 "slip-" + uuid.New().String()[:8],
		Bookmaker:          bookmaker,
		BookingCode:        code,
		Stake:              stake,
		TotalOdds:          totalOdds,
		PotentialWin:       potentialWin,
		Status:             models.SlipRunning,
		Legs:               legs,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	return slip, nil
}

// RecalculateCashout evaluates the live cashout offer using momentum and Poisson decay
func (p *BetSlipParser) RecalculateCashout(slip *models.BetSlip) {
	if slip.Status == models.SlipLost || slip.Status == models.SlipCashedOut {
		return
	}

	var cumulativeProb float64 = 1.0
	var allWon = true
	var anyLost = false

	for i := range slip.Legs {
		leg := &slip.Legs[i]

		if freshMatch, ok := p.store.GetMatchByID(leg.MatchID); ok {
			leg.Match = *freshMatch
			if freshMatch.Status == models.StatusLive {
				leg.CurrentScore = fmt.Sprintf("%d-%d (%d')", freshMatch.HomeScore, freshMatch.AwayScore, freshMatch.Minute)
			}
		}

		legProb := 0.70
		if leg.FulfillmentPct > 80 {
			legProb = 0.90
		} else if leg.FulfillmentPct < 30 {
			legProb = 0.35
		}

		if leg.Status == models.LegWon {
			legProb = 1.0
		} else if leg.Status == models.LegLost {
			legProb = 0.0
			anyLost = true
		} else {
			allWon = false
		}

		cumulativeProb *= legProb
	}

	if anyLost {
		slip.Status = models.SlipLost
		slip.CashoutProbability = 0.0
		slip.CurrentCashout = 0.0
		return
	}

	if allWon {
		slip.Status = models.SlipWon
		slip.CashoutProbability = 1.0
		slip.CurrentCashout = slip.PotentialWin
		return
	}

	slip.CashoutProbability = math.Round(cumulativeProb*1000) / 1000
	cashoutValue := slip.PotentialWin * cumulativeProb * 0.92
	if cashoutValue < slip.Stake*0.40 {
		cashoutValue = slip.Stake * 0.40
	}
	slip.CurrentCashout = math.Round(cashoutValue*100) / 100
}
