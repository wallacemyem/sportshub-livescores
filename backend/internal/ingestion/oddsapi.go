package ingestion

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/sports/livescores/internal/models"
)

type OddsAPIClient struct {
	apiKey         string
	baseURL        string
	httpClient     *http.Client
	mu             sync.RWMutex
	quotaRemaining int
	quotaUsed      int
}

func NewOddsAPIClient(baseURL, apiKey string) *OddsAPIClient {
	return &OddsAPIClient{
		apiKey:         apiKey,
		baseURL:        baseURL,
		httpClient:     &http.Client{Timeout: 8 * time.Second},
		quotaRemaining: 485,
		quotaUsed:      15,
	}
}

type OddsAPIMatch struct {
	ID           string    `json:"id"`
	SportKey     string    `json:"sport_key"`
	SportTitle   string    `json:"sport_title"`
	CommenceTime time.Time `json:"commence_time"`
	HomeTeam     string    `json:"home_team"`
	AwayTeam     string    `json:"away_team"`
	Bookmakers   []struct {
		Key        string    `json:"key"`
		Title      string    `json:"title"`
		LastUpdate time.Time `json:"last_update"`
		Markets    []struct {
			Key      string `json:"key"` // "h2h", "spreads", "totals"
			Outcomes []struct {
				Name  string  `json:"name"`
				Price float64 `json:"price"`
				Point float64 `json:"point,omitempty"`
			} `json:"outcomes"`
		} `json:"markets"`
	} `json:"bookmakers"`
}

var ActiveOddsSports = []string{
	"soccer_epl",
	"soccer_spain_la_liga",
	"soccer_uefa_champs_league",
	"soccer_italy_serie_a",
	"soccer_germany_bundesliga",
	"basketball_nba",
	"americanfootball_nfl",
	"baseball_mlb",
}

func (c *OddsAPIClient) FetchOdds(ctx context.Context, sportKey string) ([]OddsAPIMatch, error) {
	if c.apiKey == "" || c.apiKey == "demo_pro_key_sports_18443" {
		return nil, nil
	}

	url := fmt.Sprintf("%s/sports/%s/odds/?apiKey=%s&regions=us,uk,eu&markets=h2h,totals,spreads", c.baseURL, sportKey, c.apiKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	c.mu.Lock()
	if remainingStr := resp.Header.Get("x-requests-remaining"); remainingStr != "" {
		if val, err := strconv.Atoi(remainingStr); err == nil {
			c.quotaRemaining = val
		}
	}
	if usedStr := resp.Header.Get("x-requests-used"); usedStr != "" {
		if val, err := strconv.Atoi(usedStr); err == nil {
			c.quotaUsed = val
		}
	}
	c.mu.Unlock()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("odds api returned status: %d", resp.StatusCode)
	}

	var matches []OddsAPIMatch
	if err := json.NewDecoder(resp.Body).Decode(&matches); err != nil {
		return nil, err
	}
	return matches, nil
}

func (c *OddsAPIClient) GetQuotaInfo() (int, int) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.quotaUsed, c.quotaRemaining + c.quotaUsed
}

func ConvertOddsAPIToMatchOdds(oddsMatch OddsAPIMatch) *models.MatchOdds {
	matchOdds := &models.MatchOdds{
		MatchID:     oddsMatch.ID,
		Bookmakers:  make([]models.BookmakerOdds, 0),
		LastUpdated: time.Now(),
	}

	var sumHome, sumDraw, sumAway, sumOver, sumUnder float64
	var countH2H, countTotals int

	for _, bm := range oddsMatch.Bookmakers {
		bmOdds := models.BookmakerOdds{
			BookmakerKey:   bm.Key,
			BookmakerTitle: bm.Title,
			LastUpdate:     bm.LastUpdate,
		}

		for _, mkt := range bm.Markets {
			if mkt.Key == "h2h" {
				for _, out := range mkt.Outcomes {
					if strings.EqualFold(out.Name, oddsMatch.HomeTeam) {
						bmOdds.HomeWin = out.Price
					} else if strings.EqualFold(out.Name, oddsMatch.AwayTeam) {
						bmOdds.AwayWin = out.Price
					} else if strings.EqualFold(out.Name, "Draw") {
						bmOdds.Draw = out.Price
					}
				}
				if bmOdds.HomeWin > 0 && bmOdds.AwayWin > 0 {
					sumHome += bmOdds.HomeWin
					sumAway += bmOdds.AwayWin
					if bmOdds.Draw > 0 {
						sumDraw += bmOdds.Draw
					}
					countH2H++
				}
			} else if mkt.Key == "totals" {
				for _, out := range mkt.Outcomes {
					if strings.EqualFold(out.Name, "Over") {
						bmOdds.Over25 = out.Price
					} else if strings.EqualFold(out.Name, "Under") {
						bmOdds.Under25 = out.Price
					}
				}
				if bmOdds.Over25 > 0 && bmOdds.Under25 > 0 {
					sumOver += bmOdds.Over25
					sumUnder += bmOdds.Under25
					countTotals++
				}
			} else if mkt.Key == "spreads" {
				for _, out := range mkt.Outcomes {
					if strings.EqualFold(out.Name, oddsMatch.HomeTeam) {
						bmOdds.SpreadHome = out.Point
					} else if strings.EqualFold(out.Name, oddsMatch.AwayTeam) {
						bmOdds.SpreadAway = out.Point
					}
				}
			}
		}
		matchOdds.Bookmakers = append(matchOdds.Bookmakers, bmOdds)
	}

	consensus := models.BookmakerOdds{
		BookmakerKey:   "consensus",
		BookmakerTitle: "Market Consensus",
		LastUpdate:     time.Now(),
	}
	if countH2H > 0 {
		consensus.HomeWin = math.Round((sumHome/float64(countH2H))*100) / 100
		consensus.AwayWin = math.Round((sumAway/float64(countH2H))*100) / 100
		if sumDraw > 0 {
			consensus.Draw = math.Round((sumDraw/float64(countH2H))*100) / 100
		}
	}
	if countTotals > 0 {
		consensus.Over25 = math.Round((sumOver/float64(countTotals))*100) / 100
		consensus.Under25 = math.Round((sumUnder/float64(countTotals))*100) / 100
	}
	matchOdds.Consensus = consensus

	return matchOdds
}
