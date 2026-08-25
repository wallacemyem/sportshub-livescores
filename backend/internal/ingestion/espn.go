package ingestion

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/sports/livescores/internal/models"
)

type ESPNClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewESPNClient(baseURL string) *ESPNClient {
	return &ESPNClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 8 * time.Second,
		},
	}
}

// ESPN Scoreboard Response DTOs
type ESPNEventsResponse struct {
	Events []struct {
		ID        string `json:"id"`
		Name      string `json:"name"`
		ShortName string `json:"shortName"`
		Date      string `json:"date"`
		Status    struct {
			Clock        float64 `json:"clock"`
			DisplayClock string  `json:"displayClock"`
			Period       int     `json:"period"`
			Type         struct {
				Name        string `json:"name"`
				State       string `json:"state"`
				Completed   bool   `json:"completed"`
				Description string `json:"description"`
				Detail      string `json:"detail"`
			} `json:"type"`
		} `json:"status"`
		Competitions []struct {
			ID          string `json:"id"`
			Competitors []struct {
				ID       string `json:"id"`
				HomeAway string `json:"homeAway"`
				Score    string `json:"score"`
				Team     struct {
					ID           string `json:"id"`
					Name         string `json:"name"`
					Abbreviation string `json:"abbreviation"`
					DisplayName  string `json:"displayName"`
					Logo         string `json:"logo"`
				} `json:"team"`
			} `json:"competitors"`
		} `json:"competitions"`
	} `json:"events"`
}

func (c *ESPNClient) FetchScoreboard(ctx context.Context, sport string, league string) (*ESPNEventsResponse, error) {
	// e.g. https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard
	url := fmt.Sprintf("%s/%s/%s/scoreboard", c.baseURL, sport, league)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SportsIngestion/1.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("espn api returned status: %d", resp.StatusCode)
	}

	var data ESPNEventsResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}
	return &data, nil
}

// ConvertESPNToMatch transforms ESPN DTO into standard internal Match model
func ConvertESPNToMatch(event interface{}, sport models.SportType) *models.Match {
	// Standardized mapper
	return nil
}
