package parser

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

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
			Timeout: 15 * time.Second,
		},
	}
}

// SportyBet / MSport Share API Response Structs
type SportyShareOutcome struct {
	EventID           string   `json:"eventId"`
	GameID            string   `json:"gameId"`
	EstimateStartTime int64    `json:"estimateStartTime"`
	MatchStatus       string   `json:"matchStatus"`
	PlayedSeconds     string   `json:"playedSeconds"`
	SetScore          string   `json:"setScore"`
	GameScore         []string `json:"gameScore"`
	HomeTeamName      string   `json:"homeTeamName"`
	AwayTeamName      string   `json:"awayTeamName"`
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

	reqBookmaker := strings.ToLower(strings.TrimSpace(bookmaker))
	var slip *models.BetSlip
	var err error

	// If a specific bookmaker was requested
	switch reqBookmaker {
	case "sportybet":
		slip, err = p.fetchSportyBetLive(cleanCode)
	case "msport":
		slip, err = p.fetchMSportLive(cleanCode)
	case "bet9ja":
		slip, err = p.fetchBet9jaLive(cleanCode)
	case "betking":
		slip, err = p.fetchBetKingLive(cleanCode)
	case "1xbet":
		slip, err = p.fetch1xBetLive(cleanCode)
	case "22bet", "melbet", "mozzartbet", "betway", "bangbet", "parimatch":
		slip, err = p.fetchScraperGeneric(reqBookmaker, cleanCode)
	default:
		// Auto mode: probe supported sportsbook networks in sequence
		for _, bm := range []string{"sportybet", "msport", "bet9ja", "betking", "1xbet", "22bet", "melbet", "mozzartbet", "betway", "bangbet", "parimatch"} {
			switch bm {
			case "sportybet":
				slip, err = p.fetchSportyBetLive(cleanCode)
			case "msport":
				slip, err = p.fetchMSportLive(cleanCode)
			case "bet9ja":
				slip, err = p.fetchBet9jaLive(cleanCode)
			case "betking":
				slip, err = p.fetchBetKingLive(cleanCode)
			case "1xbet":
				slip, err = p.fetch1xBetLive(cleanCode)
			default:
				slip, err = p.fetchScraperGeneric(bm, cleanCode)
			}
			if err == nil && slip != nil {
				break
			}
		}
	}

	if err == nil && slip != nil {
		if userID != "" {
			slip.UserID = userID
			slip.ID = fmt.Sprintf("slip-%s-%s", userID, cleanCode)
		}
		p.store.SaveBetSlip(slip)
		return slip, nil
	}

	// Fallback to check if already stored in memory
	if existing, ok := p.store.GetBetSlip(cleanCode); ok {
		return existing, nil
	}

	if reqBookmaker != "" && reqBookmaker != "auto" {
		return nil, fmt.Errorf("booking code '%s' could not be resolved on %s (code expired, invalid, or blocked by bookmaker anti-bot protection)", cleanCode, strings.ToUpper(bookmaker))
	}
	return nil, fmt.Errorf("booking code '%s' could not be found on SportyBet, MSport, Bet9ja, or partner networks. Please verify the code on your slip", cleanCode)
}

// fetchSportyBetLive queries SportyBet's live sharing endpoints across Nigeria, Ghana, Kenya, and Uganda
func (p *BetSlipParser) fetchSportyBetLive(code string) (*models.BetSlip, error) {
	endpoints := []string{
		"https://www.sportybet.com/api/ng/orders/share/" + code,
		"https://www.sportybet.com/api/gh/orders/share/" + code,
		"https://www.sportybet.com/api/ke/orders/share/" + code,
		"https://www.sportybet.com/api/ug/orders/share/" + code,
		"https://www.sportybet.com/api/tz/orders/share/" + code,
		"https://www.sportybet.com/api/zm/orders/share/" + code,
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
		"https://www.msport.com/api/ug/orders/share/" + code,
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

// fetchBet9jaLive queries Bet9ja's coupon endpoints via Stealth Scraper Sidecar
func (p *BetSlipParser) fetchBet9jaLive(code string) (*models.BetSlip, error) {
	scraperURL := os.Getenv("STEALTH_SCRAPER_URL")
	if scraperURL == "" {
		scraperURL = "http://sports_stealth_scraper:8081"
	}

	reqBody, _ := json.Marshal(map[string]string{"code": code})
	req, err := http.NewRequest("POST", scraperURL+"/api/scrape/bet9ja", bytes.NewBuffer(reqBody))
	if err == nil {
		req.Header.Set("Content-Type", "application/json")
		resp, err := p.httpClient.Do(req)
		if err == nil {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				var scraperResp struct {
					Success bool `json:"success"`
					Data    struct {
						D struct {
							Items []struct {
								EventID      int     `json:"EVENTID"`
								EventName    string  `json:"EVENTNAME"`
								HomeTeam     string  `json:"HOMETEAM"`
								AwayTeam     string  `json:"AWAYTEAM"`
								LeagueName   string  `json:"LEAGUENAME"`
								Country      string  `json:"COUNTRY"`
								EventDate    string  `json:"EVENTDATE"`
								MarketName   string  `json:"MARKETNAME"`
								OutcomeName  string  `json:"OUTCOMENAME"`
								Odds         float64 `json:"ODDS"`
								OddsStr      string  `json:"ODDS_STR"`
								SetScore     string  `json:"SETSCORE"`
								CurrentScore string  `json:"CURRENTSCORE"`
							} `json:"ITEMS"`
						} `json:"D"`
						Data struct {
							Outcomes []SportyShareOutcome `json:"outcomes"`
						} `json:"data"`
					} `json:"data"`
				}
				if err := json.NewDecoder(resp.Body).Decode(&scraperResp); err == nil {
					if len(scraperResp.Data.Data.Outcomes) > 0 {
						return p.convertSportyOutcomesToSlip("bet9ja", code, scraperResp.Data.Data.Outcomes)
					}
					if len(scraperResp.Data.D.Items) > 0 {
						outcomes := make([]SportyShareOutcome, 0, len(scraperResp.Data.D.Items))
						for _, item := range scraperResp.Data.D.Items {
							var so SportyShareOutcome
							so.EventID = fmt.Sprintf("%d", item.EventID)
							so.HomeTeamName = item.HomeTeam
							so.AwayTeamName = item.AwayTeam
							if so.HomeTeamName == "" && strings.Contains(item.EventName, " - ") {
								parts := strings.Split(item.EventName, " - ")
								so.HomeTeamName = strings.TrimSpace(parts[0])
								if len(parts) > 1 {
									so.AwayTeamName = strings.TrimSpace(parts[1])
								}
							}
							so.Sport.Category.Tournament.Name = item.LeagueName
							so.Sport.Category.Name = item.Country
							so.SetScore = item.SetScore
							if so.SetScore == "" {
								so.SetScore = item.CurrentScore
							}
							oddsStr := fmt.Sprintf("%.2f", item.Odds)
							if item.Odds <= 0 && item.OddsStr != "" {
								oddsStr = item.OddsStr
							}
							so.Markets = []struct {
								ID       string `json:"id"`
								Desc     string `json:"desc"`
								Outcomes []struct {
									ID   string `json:"id"`
									Odds string `json:"odds"`
									Desc string `json:"desc"`
								} `json:"outcomes"`
							}{
								{
									Desc: item.MarketName,
									Outcomes: []struct {
										ID   string `json:"id"`
										Odds string `json:"odds"`
										Desc string `json:"desc"`
									}{
										{
											Desc: item.OutcomeName,
											Odds: oddsStr,
										},
									},
								},
							}
							outcomes = append(outcomes, so)
						}
						return p.convertSportyOutcomesToSlip("bet9ja", code, outcomes)
					}
				}
			}
		}
	}

	return nil, fmt.Errorf("code not found or invalid on bet9ja")
}

// fetchBetKingLive queries BetKing's coupon endpoints via Stealth Scraper Sidecar
func (p *BetSlipParser) fetchBetKingLive(code string) (*models.BetSlip, error) {
	scraperURL := os.Getenv("STEALTH_SCRAPER_URL")
	if scraperURL == "" {
		scraperURL = "http://sports_stealth_scraper:8081"
	}

	reqBody, _ := json.Marshal(map[string]string{"code": code})
	req, err := http.NewRequest("POST", scraperURL+"/api/scrape/betking", bytes.NewBuffer(reqBody))
	if err == nil {
		req.Header.Set("Content-Type", "application/json")
		resp, err := p.httpClient.Do(req)
		if err == nil {
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				var bkResp struct {
					Success bool `json:"success"`
					Data    struct {
						Data struct {
							Outcomes []SportyShareOutcome `json:"outcomes"`
						} `json:"data"`
					} `json:"data"`
				}
				if err := json.NewDecoder(resp.Body).Decode(&bkResp); err == nil && len(bkResp.Data.Data.Outcomes) > 0 {
					return p.convertSportyOutcomesToSlip("betking", code, bkResp.Data.Data.Outcomes)
				}
			}
		}
	}

	return nil, fmt.Errorf("code not found on betking")
}

// fetch1xBetLive queries 1xBet's share endpoints via Stealth Scraper
func (p *BetSlipParser) fetch1xBetLive(code string) (*models.BetSlip, error) {
	return p.fetchScraperGeneric("1xbet", code)
}

// fetchScraperGeneric queries any supported bookmaker via the Stealth Scraper Sidecar
func (p *BetSlipParser) fetchScraperGeneric(bookmaker, code string) (*models.BetSlip, error) {
	scraperURL := os.Getenv("STEALTH_SCRAPER_URL")
	if scraperURL == "" {
		scraperURL = "http://sports_stealth_scraper:8081"
	}

	reqBody, _ := json.Marshal(map[string]string{"code": code})
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/api/scrape/%s", scraperURL, bookmaker), bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var genericResp struct {
			Success bool `json:"success"`
			Data    struct {
				Data struct {
					Outcomes []SportyShareOutcome `json:"outcomes"`
					Items    []struct {
						EventName   string  `json:"eventName"`
						HomeTeam    string  `json:"homeTeam"`
						AwayTeam    string  `json:"awayTeam"`
						Tournament  string  `json:"tournament"`
						Country     string  `json:"country"`
						MarketName  string  `json:"marketName"`
						OutcomeName string  `json:"outcomeName"`
						Odds        float64 `json:"odds"`
						Score       string  `json:"score"`
					} `json:"items"`
				} `json:"data"`
				Outcomes []SportyShareOutcome `json:"outcomes"`
				Items    []struct {
					EventName   string  `json:"eventName"`
					HomeTeam    string  `json:"homeTeam"`
					AwayTeam    string  `json:"awayTeam"`
					Tournament  string  `json:"tournament"`
					Country     string  `json:"country"`
					MarketName  string  `json:"marketName"`
					OutcomeName string  `json:"outcomeName"`
					Odds        float64 `json:"odds"`
					Score       string  `json:"score"`
				} `json:"items"`
			} `json:"data"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&genericResp); err == nil {
			if len(genericResp.Data.Data.Outcomes) > 0 {
				return p.convertSportyOutcomesToSlip(bookmaker, code, genericResp.Data.Data.Outcomes)
			}
			if len(genericResp.Data.Outcomes) > 0 {
				return p.convertSportyOutcomesToSlip(bookmaker, code, genericResp.Data.Outcomes)
			}
			items := genericResp.Data.Items
			if len(items) == 0 {
				items = genericResp.Data.Data.Items
			}
			if len(items) > 0 {
				outcomes := make([]SportyShareOutcome, 0, len(items))
				for i, itm := range items {
					var so SportyShareOutcome
					so.EventID = fmt.Sprintf("%d", i+1)
					so.HomeTeamName = itm.HomeTeam
					so.AwayTeamName = itm.AwayTeam
					if so.HomeTeamName == "" && strings.Contains(itm.EventName, " - ") {
						parts := strings.Split(itm.EventName, " - ")
						so.HomeTeamName = strings.TrimSpace(parts[0])
						if len(parts) > 1 {
							so.AwayTeamName = strings.TrimSpace(parts[1])
						}
					}
					so.Sport.Category.Tournament.Name = itm.Tournament
					so.Sport.Category.Name = itm.Country
					so.SetScore = itm.Score
					oddsVal := itm.Odds
					if oddsVal <= 0 {
						oddsVal = 1.50
					}
					so.Markets = []struct {
						ID       string `json:"id"`
						Desc     string `json:"desc"`
						Outcomes []struct {
							ID   string `json:"id"`
							Odds string `json:"odds"`
							Desc string `json:"desc"`
						} `json:"outcomes"`
					}{
						{
							Desc: itm.MarketName,
							Outcomes: []struct {
								ID   string `json:"id"`
								Odds string `json:"odds"`
								Desc string `json:"desc"`
							}{
								{
									Desc: itm.OutcomeName,
									Odds: fmt.Sprintf("%.2f", oddsVal),
								},
							},
						},
					}
					outcomes = append(outcomes, so)
				}
				return p.convertSportyOutcomesToSlip(bookmaker, code, outcomes)
			}
		}
	}

	return nil, fmt.Errorf("code not found on %s", bookmaker)
}

// findExistingLiveMatch looks for an active matching fixture in the store
func (p *BetSlipParser) findExistingLiveMatch(homeName, awayName string) *models.Match {
	if p.store == nil {
		return nil
	}
	hNorm := strings.ToLower(strings.TrimSpace(homeName))
	aNorm := strings.ToLower(strings.TrimSpace(awayName))

	matches := p.store.GetAllMatches("", "")
	for _, m := range matches {
		mHome := strings.ToLower(m.HomeTeam.Name)
		mAway := strings.ToLower(m.AwayTeam.Name)

		if (strings.Contains(mHome, hNorm) || strings.Contains(hNorm, mHome)) &&
			(strings.Contains(mAway, aNorm) || strings.Contains(aNorm, mAway)) {
			return &m
		}
	}
	return nil
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
			startTime = time.Now()
		}

		// 1. Parse Real Scores directly from bookmaker API (setScore e.g. "1:0", "2:1")
		homeScore := 0
		awayScore := 0
		if outcome.SetScore != "" && strings.Contains(outcome.SetScore, ":") {
			parts := strings.Split(outcome.SetScore, ":")
			if len(parts) == 2 {
				if h, err := strconv.Atoi(strings.TrimSpace(parts[0])); err == nil {
					homeScore = h
				}
				if a, err := strconv.Atoi(strings.TrimSpace(parts[1])); err == nil {
					awayScore = a
				}
			}
		}

		// 2. Parse Match Status & Clock from bookmaker payload
		matchStatus := models.StatusScheduled
		minute := 0
		period := "PRE"
		displayClock := ""

		stUpper := strings.ToUpper(strings.TrimSpace(outcome.MatchStatus))
		switch {
		case stUpper == "ENDED" || stUpper == "FT" || stUpper == "FINISHED":
			matchStatus = models.StatusFinished
			period = "FT"
			minute = 90
			displayClock = "FT"
		case stUpper == "HT" || stUpper == "HALF TIME":
			matchStatus = models.StatusHalfTime
			period = "HT"
			minute = 45
			displayClock = "HT"
		case stUpper == "H1" || stUpper == "1H" || stUpper == "FIRST HALF":
			matchStatus = models.StatusLive
			period = "1H"
			minute = 25
			displayClock = "1H"
		case stUpper == "H2" || stUpper == "2H" || stUpper == "SECOND HALF":
			matchStatus = models.StatusLive
			period = "2H"
			minute = 75
			displayClock = "2H"
		case time.Now().After(startTime):
			diff := time.Since(startTime)
			if diff < 110*time.Minute {
				matchStatus = models.StatusLive
				minute = int(diff.Minutes())
				if minute > 45 && minute < 60 {
					period = "HT"
					displayClock = "HT"
				} else if minute >= 60 {
					period = "2H"
					displayClock = fmt.Sprintf("%d'", minute)
				} else {
					period = "1H"
					displayClock = fmt.Sprintf("%d'", minute)
				}
			} else {
				matchStatus = models.StatusFinished
				period = "FT"
				minute = 90
				displayClock = "FT"
			}
		}

		// Parse playedSeconds e.g. "89:33"
		if outcome.PlayedSeconds != "" {
			secParts := strings.Split(outcome.PlayedSeconds, ":")
			if len(secParts) == 2 {
				if minVal, err := strconv.Atoi(secParts[0]); err == nil {
					minute = minVal
					if matchStatus == models.StatusLive {
						displayClock = fmt.Sprintf("%d'", minVal)
					}
				}
			}
		}

		// 3. Link with existing API-Sports match if already present in live store
		var match models.Match
		if existingMatch := p.findExistingLiveMatch(homeName, awayName); existingMatch != nil {
			match = *existingMatch
			if match.HomeScore > 0 || match.AwayScore > 0 {
				homeScore = match.HomeScore
				awayScore = match.AwayScore
			}
			if match.Minute > 0 {
				minute = match.Minute
			}
			if match.DisplayClock != "" {
				displayClock = match.DisplayClock
			}
			matchStatus = match.Status
		} else {
			cleanEventID := strings.TrimPrefix(outcome.EventID, "sr:match:")
			if cleanEventID == "" {
				cleanEventID = fmt.Sprintf("%d", i+1)
			}
			matchID := fmt.Sprintf("apif-event-%s", cleanEventID)

			periodScores := make([]string, 0)
			if len(outcome.GameScore) > 0 {
				for _, gs := range outcome.GameScore {
					periodScores = append(periodScores, strings.ReplaceAll(gs, ":", "-"))
				}
			}

			match = models.Match{
				ID:    matchID,
				Sport: sportType,
				League: models.League{
					ID:      "apif-league-" + strings.ToLower(strings.ReplaceAll(leagueName, " ", "-")),
					Name:    leagueName,
					Sport:   sportType,
					Country: country,
				},
				HomeTeam: models.Team{
					ID:        "apif-team-" + strings.ToLower(strings.ReplaceAll(homeName, " ", "-")),
					Name:      homeName,
					ShortName: getShortName(homeName),
					Country:   country,
				},
				AwayTeam: models.Team{
					ID:        "apif-team-" + strings.ToLower(strings.ReplaceAll(awayName, " ", "-")),
					Name:      awayName,
					ShortName: getShortName(awayName),
					Country:   country,
				},
				HomeScore:    homeScore,
				AwayScore:    awayScore,
				PeriodScores: periodScores,
				Status:       matchStatus,
				Period:       period,
				Minute:       minute,
				DisplayClock: displayClock,
				StartTime:    startTime,
			}
			p.store.SaveMatch(&match)
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

		// Evaluate leg state
		legStatus := models.LegPending
		if matchStatus == models.StatusLive || matchStatus == models.StatusHalfTime {
			legStatus = models.LegRunning
		} else if matchStatus == models.StatusFinished {
			legStatus = models.LegWon
			// 1X2 evaluation
			selLower := strings.ToLower(selectionDesc)
			if selLower == "home" || selLower == "1" {
				if homeScore > awayScore {
					legStatus = models.LegWon
				} else {
					legStatus = models.LegLost
				}
			} else if selLower == "away" || selLower == "2" {
				if awayScore > homeScore {
					legStatus = models.LegWon
				} else {
					legStatus = models.LegLost
				}
			} else if selLower == "draw" || selLower == "x" {
				if homeScore == awayScore {
					legStatus = models.LegWon
				} else {
					legStatus = models.LegLost
				}
			}
		}

		scoreStr := fmt.Sprintf("%d-%d", homeScore, awayScore)
		if matchStatus == models.StatusScheduled {
			scoreStr = "Upcoming"
		} else if matchStatus == models.StatusHalfTime {
			scoreStr = fmt.Sprintf("%d-%d (HT)", homeScore, awayScore)
		} else if matchStatus == models.StatusLive {
			if displayClock != "" {
				scoreStr = fmt.Sprintf("%d-%d (%s)", homeScore, awayScore, displayClock)
			} else {
				scoreStr = fmt.Sprintf("%d-%d (%d')", homeScore, awayScore, minute)
			}
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
			FulfillmentPct: 80.0,
		}

		legs = append(legs, leg)
		totalOdds *= oddsVal
	}

	totalOdds = math.Round(totalOdds*100) / 100

	slipStatus := models.SlipRunning
	allWon := true
	hasLost := false
	for _, l := range legs {
		if l.Status == models.LegLost {
			hasLost = true
		}
		if l.Status != models.LegWon {
			allWon = false
		}
	}
	if hasLost {
		slipStatus = models.SlipLost
	} else if allWon {
		slipStatus = models.SlipWon
	}

	slip := &models.BetSlip{
		ID:          fmt.Sprintf("slip-%s-%s", bookmaker, code),
		Bookmaker:   bookmaker,
		BookingCode: code,
		TotalOdds:   totalOdds,
		Status:      slipStatus,
		Legs:        legs,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	return slip, nil
}

func getShortName(name string) string {
	parts := strings.Fields(name)
	if len(parts) == 1 {
		if len(name) > 6 {
			return name[:6]
		}
		return name
	}
	if len(parts) >= 2 {
		return parts[0]
	}
	return name
}
