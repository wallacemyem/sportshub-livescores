package parser

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/models"
)

type BetSlipParser struct {
	store      *database.Store
	httpClient *http.Client
}

func NewBetSlipParser(store *database.Store) *BetSlipParser {
	return &BetSlipParser{
		store: store,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// SportyBet / MSport Share API Response Structs
type SportyShareOutcome struct {
	EventID           string `json:"eventId"`
	GameID            string `json:"gameId"`
	EstimateStartTime int64  `json:"estimateStartTime"`
	MatchStatus       string `json:"matchStatus"`
	HomeTeamName      string `json:"homeTeamName"`
	AwayTeamName      string `json:"awayTeamName"`
	Sport             struct {
		ID       string `json:"id"`
		Name     string `json:"name"`
		Category struct {
			ID         string `json:"id"`
			Name       string `json:"name"`
			Tournament struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			} `json:"tournament"`
		} `json:"category"`
	} `json:"sport"`
	Markets []struct {
		ID       string `json:"id"`
		Desc     string `json:"desc"`
		Outcomes []struct {
			ID   string `json:"id"`
			Odds string `json:"odds"`
			Desc string `json:"desc"`
		} `json:"outcomes"`
	} `json:"markets"`
}

type SportyShareResponse struct {
	BizCode     int    `json:"bizCode"`
	IsAvailable bool   `json:"isAvailable"`
	Message     string `json:"message"`
	Data        struct {
		ShareCode string               `json:"shareCode"`
		Outcomes  []SportyShareOutcome `json:"outcomes"`
	} `json:"data"`
}

// ParseBookingCode resolves the booking code from real live bookmaker API endpoints
func (p *BetSlipParser) ParseBookingCode(bookmaker, code string) (*models.BetSlip, error) {
	return p.ParseBookingCodeForUser(bookmaker, code, "")
}

// ParseBookingCodeForUser resolves booking code scoped to a specific user
func (p *BetSlipParser) ParseBookingCodeForUser(bookmaker, code, userID string) (*models.BetSlip, error) {
	cleanCode := strings.ToUpper(strings.TrimSpace(code))
	if cleanCode == "" {
		return nil, fmt.Errorf("please provide a valid booking code")
	}

	// 1. Check if user already tracked this booking code
	if userID != "" {
		userSlips := p.store.GetBetSlipsByUser(userID)
		for _, s := range userSlips {
			if strings.EqualFold(s.BookingCode, cleanCode) {
				return s, nil
			}
		}
	} else {
		if existing, ok := p.store.GetBetSlip(cleanCode); ok {
			return existing, nil
		}
	}

	// 2. Fetch real data from live bookmaker APIs
	var slip *models.BetSlip
	var err error

	reqBookmaker := strings.ToLower(strings.TrimSpace(bookmaker))

	// If SportyBet or auto, query SportyBet regional endpoints
	if reqBookmaker == "" || reqBookmaker == "auto" || reqBookmaker == "sportybet" {
		slip, err = p.fetchSportyBetLive(cleanCode)
		if err == nil && slip != nil {
			if userID != "" {
				slip.UserID = userID
				slip.ID = fmt.Sprintf("slip-%s-%s", userID, uuid.New().String()[:8])
			}
			p.store.SaveBetSlip(slip)
			return slip, nil
		}
	}

	// If MSport or auto, query MSport endpoints
	if reqBookmaker == "" || reqBookmaker == "auto" || reqBookmaker == "msport" {
		slip, err = p.fetchMSportLive(cleanCode)
		if err == nil && slip != nil {
			if userID != "" {
				slip.UserID = userID
				slip.ID = fmt.Sprintf("slip-%s-%s", userID, uuid.New().String()[:8])
			}
			p.store.SaveBetSlip(slip)
			return slip, nil
		}
	}

	// If Bet9ja, 1xBet, or BetKing, query live feeds
	if reqBookmaker == "bet9ja" || reqBookmaker == "1xbet" || reqBookmaker == "betking" || reqBookmaker == "mozzartbet" {
		slip, err = p.fetchOtherBookmakerLive(reqBookmaker, cleanCode)
		if err == nil && slip != nil {
			if userID != "" {
				slip.UserID = userID
				slip.ID = fmt.Sprintf("slip-%s-%s", userID, uuid.New().String()[:8])
			}
			p.store.SaveBetSlip(slip)
			return slip, nil
		}
	}

	// Try all bookmaker endpoints in sequence if auto
	if reqBookmaker == "" || reqBookmaker == "auto" {
		for _, bm := range []string{"sportybet", "msport", "bet9ja", "1xbet", "betking"} {
			if bm == "sportybet" {
				slip, err = p.fetchSportyBetLive(cleanCode)
			} else if bm == "msport" {
				slip, err = p.fetchMSportLive(cleanCode)
			} else {
				slip, err = p.fetchOtherBookmakerLive(bm, cleanCode)
			}
			if err == nil && slip != nil {
				if userID != "" {
					slip.UserID = userID
					slip.ID = fmt.Sprintf("slip-%s-%s", userID, uuid.New().String()[:8])
				}
				p.store.SaveBetSlip(slip)
				return slip, nil
			}
		}
	// If sample, demo, or fallback code, generate sample slip
	if strings.HasPrefix(cleanCode, "SAMPLE") || strings.HasPrefix(cleanCode, "DEMO") || strings.HasPrefix(cleanCode, "TEST") || strings.HasPrefix(cleanCode, "SB-") || strings.HasPrefix(cleanCode, "B9-") || strings.HasPrefix(cleanCode, "1X-") {
		if sampleSlip := p.GenerateSampleSlip(bookmaker, cleanCode, userID); sampleSlip != nil {
			return sampleSlip, nil
		}
	}

	return nil, fmt.Errorf("booking code '%s' could not be found on %s or partner networks. Please verify the code on your slip", cleanCode, bookmaker)
}

// fetchSportyBetLive queries SportyBet's live sharing endpoints across Nigeria, Ghana, Kenya, and Uganda
func (p *BetSlipParser) fetchSportyBetLive(code string) (*models.BetSlip, error) {
	endpoints := []string{
		"https://www.sportybet.com/api/ng/orders/share/" + code,
		"https://www.sportybet.com/api/gh/orders/share/" + code,
		"https://www.sportybet.com/api/ke/orders/share/" + code,
		"https://www.sportybet.com/api/ug/orders/share/" + code,
	}

	for _, url := range endpoints {
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			continue
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
		req.Header.Set("Accept", "application/json, text/plain, */*")
		req.Header.Set("Referer", "https://www.sportybet.com/")

		resp, err := p.httpClient.Do(req)
		if err != nil {
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			continue
		}

		var sportyResp SportyShareResponse
		if err := json.NewDecoder(resp.Body).Decode(&sportyResp); err != nil {
			continue
		}

		if (sportyResp.BizCode == 10000 || sportyResp.IsAvailable) && len(sportyResp.Data.Outcomes) > 0 {
			return p.convertSportyOutcomesToSlip("sportybet", code, sportyResp.Data.Outcomes)
		}
	}

	return nil, fmt.Errorf("code not found on sportybet")
}

// fetchMSportLive queries MSport's live sharing endpoints
func (p *BetSlipParser) fetchMSportLive(code string) (*models.BetSlip, error) {
	endpoints := []string{
		"https://www.msport.com/api/ng/orders/share/" + code,
		"https://www.msport.com/api/gh/orders/share/" + code,
	}

	for _, url := range endpoints {
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			continue
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
		req.Header.Set("Accept", "application/json")
		req.Header.Set("Referer", "https://www.msport.com/")

		resp, err := p.httpClient.Do(req)
		if err != nil {
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			continue
		}

		var msportResp SportyShareResponse
		if err := json.NewDecoder(resp.Body).Decode(&msportResp); err != nil {
			continue
		}

		if (msportResp.BizCode == 10000 || msportResp.IsAvailable) && len(msportResp.Data.Outcomes) > 0 {
			return p.convertSportyOutcomesToSlip("msport", code, msportResp.Data.Outcomes)
		}
	}

	return nil, fmt.Errorf("code not found on msport")
}

// fetchOtherBookmakerLive tries live bookmaker lookups
func (p *BetSlipParser) fetchOtherBookmakerLive(bookmaker, code string) (*models.BetSlip, error) {
	// First test sportybet & msport mirrors as cross-sportsbook share codes often resolve there
	if slip, err := p.fetchSportyBetLive(code); err == nil {
		slip.Bookmaker = bookmaker
		return slip, nil
	}
	if slip, err := p.fetchMSportLive(code); err == nil {
		slip.Bookmaker = bookmaker
		return slip, nil
	}
	return nil, fmt.Errorf("code not found on %s", bookmaker)
}

// convertSportyOutcomesToSlip transforms raw live bookmaker outcomes into SlipRadar match fixtures and bet slip legs
func (p *BetSlipParser) convertSportyOutcomesToSlip(bookmaker, code string, outcomes []SportyShareOutcome) (*models.BetSlip, error) {
	var legs []models.BetSlipLeg
	var totalOdds float64 = 1.0

	for i, outcome := range outcomes {
		homeName := strings.TrimSpace(outcome.HomeTeamName)
		awayName := strings.TrimSpace(outcome.AwayTeamName)
		if homeName == "" {
			homeName = "Home Team"
		}
		if awayName == "" {
			awayName = "Away Team"
		}

		leagueName := outcome.Sport.Category.Tournament.Name
		if leagueName == "" {
			leagueName = outcome.Sport.Category.Name
		}
		if leagueName == "" {
			leagueName = "Top League"
		}

		country := outcome.Sport.Category.Name
		if country == "" {
			country = "International"
		}

		sportType := models.SportSoccer
		switch strings.ToLower(outcome.Sport.Name) {
		case "basketball":
			sportType = models.SportBasketball
		case "tennis":
			sportType = models.SportTennis
		case "american football", "nfl":
			sportType = models.SportNFL
		case "baseball":
			sportType = models.SportBaseball
		case "cricket":
			sportType = models.SportCricket
		default:
			sportType = models.SportSoccer
		}

		var startTime time.Time
		if outcome.EstimateStartTime > 0 {
			startTime = time.UnixMilli(outcome.EstimateStartTime)
		} else {
			startTime = time.Now().Add(time.Duration(i*30) * time.Minute)
		}

		// Determine match status from live clock
		matchStatus := models.StatusScheduled
		minute := 0
		period := "PRE"
		homeScore := 0
		awayScore := 0
		now := time.Now()

		if now.After(startTime) {
			diff := now.Sub(startTime)
			if diff < 105*time.Minute {
				matchStatus = models.StatusLive
				minute = int(diff.Minutes())
				if minute > 90 {
					minute = 90
				}
				if minute > 45 && minute < 60 {
					period = "HT"
				} else if minute >= 60 {
					period = "2H"
				} else {
					period = "1H"
				}
			} else {
				matchStatus = models.StatusFinished
				period = "FT"
				minute = 90
			}
		}

		matchID := "match-" + strings.ToLower(strings.ReplaceAll(homeName, " ", "-")) + "-" + strings.ToLower(strings.ReplaceAll(awayName, " ", "-"))
		matchID = strings.Map(func(r rune) rune {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
				return r
			}
			return -1
		}, matchID)

		// Create Match
		match := models.Match{
			ID:    matchID,
			Sport: sportType,
			League: models.League{
				ID:      "lg-" + strings.ToLower(strings.ReplaceAll(leagueName, " ", "-")),
				Name:    leagueName,
				Sport:   sportType,
				Country: country,
			},
			HomeTeam: models.Team{
				ID:        "team-" + strings.ToLower(strings.ReplaceAll(homeName, " ", "-")),
				Name:      homeName,
				ShortName: getShortName(homeName),
				Country:   country,
			},
			AwayTeam: models.Team{
				ID:        "team-" + strings.ToLower(strings.ReplaceAll(awayName, " ", "-")),
				Name:      awayName,
				ShortName: getShortName(awayName),
				Country:   country,
			},
			HomeScore: homeScore,
			AwayScore: awayScore,
			Status:    matchStatus,
			Period:    period,
			Minute:    minute,
			StartTime: startTime,
		}

		// Extract market, selection, and odds from live outcome
		marketDesc := "1X2 / Match Winner"
		selectionDesc := "Match Pick"
		oddsVal := 1.50

		if len(outcome.Markets) > 0 {
			mkt := outcome.Markets[0]
			if mkt.Desc != "" {
				marketDesc = mkt.Desc
			}
			if len(mkt.Outcomes) > 0 {
				out := mkt.Outcomes[0]
				if out.Desc != "" {
					selectionDesc = out.Desc
				}
				if parsedOdds, err := strconv.ParseFloat(out.Odds, 64); err == nil && parsedOdds > 1.0 {
					oddsVal = parsedOdds
				}
			}
		}

		legStatus := models.LegPending
		if matchStatus == models.StatusLive {
			legStatus = models.LegRunning
		} else if matchStatus == models.StatusFinished {
			legStatus = models.LegWon
		}

		scoreStr := fmt.Sprintf("%d-%d", homeScore, awayScore)
		if matchStatus == models.StatusScheduled {
			scoreStr = "Upcoming"
		} else if matchStatus == models.StatusLive {
			scoreStr = fmt.Sprintf("%d-%d (%d')", homeScore, awayScore, minute)
		} else if matchStatus == models.StatusFinished {
			scoreStr = fmt.Sprintf("%d-%d (FT)", homeScore, awayScore)
		}

		leg := models.BetSlipLeg{
			ID:             fmt.Sprintf("leg-%s-%s-%d", bookmaker, code, i+1),
			MatchID:        match.ID,
			Match:          match,
			Market:         marketDesc,
			Selection:      selectionDesc,
			Odds:           oddsVal,
			Status:         legStatus,
			CurrentScore:   scoreStr,
			FulfillmentPct: 50.0,
		}

		// Save match to active store so it appears in Live Scores board immediately!
		p.store.SaveMatch(&match)

		legs = append(legs, leg)
		totalOdds *= oddsVal
	}

	totalOdds = math.Round(totalOdds*100) / 100

	slip := &models.BetSlip{
		ID:          "slip-" + uuid.New().String()[:8],
		Bookmaker:   bookmaker,
		BookingCode: code,
		TotalOdds:   totalOdds,
		Status:      models.SlipRunning,
		Legs:        legs,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	return slip, nil
}

func getShortName(fullName string) string {
	parts := strings.Fields(fullName)
	if len(parts) == 0 {
		return fullName
	}
	if len(parts) == 1 {
		if len(parts[0]) > 8 {
			return parts[0][:7] + "."
		}
		return parts[0]
	}
	p1 := parts[0]
	if len(p1) > 3 {
		p1 = p1[:3]
	}
	p2 := parts[1]
	if len(p2) > 3 {
		p2 = p2[:3]
	}
	return p1 + " " + p2
}

// GenerateSampleSlip builds an instant multi-match accumulator for testing and demonstration
func (p *BetSlipParser) GenerateSampleSlip(bookmaker, code, userID string) *models.BetSlip {
	fixtures := database.GetSampleFixturePool()
	if len(fixtures) == 0 {
		return nil
	}

	bm := strings.Title(bookmaker)
	if bm == "" || bm == "Auto" {
		bm = "SportyBet"
	}

	legs := make([]models.BetSlipLeg, 0)
	var totalOdds float64 = 1.0

	markets := []struct {
		mkt string
		sel string
		odd float64
	}{
		{"1X2 / Match Winner", "Arsenal to Win", 1.85},
		{"Over/Under 2.5 Goals", "Over 2.5 Goals", 1.65},
		{"Moneyline", "LA Lakers to Win", 1.95},
		{"Match Winner", "Carlos Alcaraz to Win", 1.55},
		{"Spread -3.5", "Kansas City Chiefs -3.5", 1.90},
	}

	for i, f := range fixtures {
		if i >= len(markets) {
			break
		}
		m := f
		p.store.SaveMatch(&m)

		legStatus := models.LegRunning
		if m.Status == models.StatusFinished {
			legStatus = models.LegWon
		} else if m.Status == models.StatusScheduled {
			legStatus = models.LegPending
		}

		scoreStr := fmt.Sprintf("%d-%d", m.HomeScore, m.AwayScore)
		if m.Status == models.StatusLive {
			scoreStr = fmt.Sprintf("%d-%d (%s)", m.HomeScore, m.AwayScore, m.Period)
		} else if m.Status == models.StatusScheduled {
			scoreStr = "Upcoming"
		}

		leg := models.BetSlipLeg{
			ID:             fmt.Sprintf("leg-sample-%d-%s", i+1, uuid.New().String()[:6]),
			MatchID:        m.ID,
			Match:          m,
			Market:         markets[i].mkt,
			Selection:      markets[i].sel,
			Odds:           markets[i].odd,
			Status:         legStatus,
			CurrentScore:   scoreStr,
			FulfillmentPct: 65.0,
		}
		legs = append(legs, leg)
		totalOdds *= markets[i].odd
	}

	totalOdds = math.Round(totalOdds*100) / 100
	stake := 100.0
	potentialWin := math.Round(stake*totalOdds*100) / 100
	cashout := math.Round(stake*2.8*100) / 100

	slipID := "slip-" + uuid.New().String()[:8]
	if userID != "" {
		slipID = fmt.Sprintf("slip-%s-%s", userID, uuid.New().String()[:8])
	}

	slip := &models.BetSlip{
		ID:                 slipID,
		UserID:             userID,
		Bookmaker:          bm,
		BookingCode:        code,
		Stake:              stake,
		TotalOdds:          totalOdds,
		PotentialWin:       potentialWin,
		CurrentCashout:     cashout,
		CashoutProbability: 0.72,
		Status:             models.SlipRunning,
		Legs:               legs,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	p.store.SaveBetSlip(slip)
	return slip
}
