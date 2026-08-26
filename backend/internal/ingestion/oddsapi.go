package ingestion

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"
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

func (c *OddsAPIClient) FetchOdds(ctx context.Context, sportKey string) ([]OddsAPIMatch, error) {
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
