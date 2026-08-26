package ingestion

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
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

// ESPN Event DTO structures
type ESPNEvent struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	ShortName string `json:"shortName"`
	Date      string `json:"date"`
	Status    struct {
		Clock        float64 `json:"clock"`
		DisplayClock string  `json:"displayClock"`
		Period       int     `json:"period"`
		Type         struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			State       string `json:"state"` // "pre", "in", "post"
			Completed   bool   `json:"completed"`
			Description string `json:"description"`
			Detail      string `json:"detail"`
			ShortDetail string `json:"shortDetail"`
		} `json:"type"`
	} `json:"status"`
	Competitions []struct {
		ID         string `json:"id"`
		Attendance int    `json:"attendance"`
		Venue      struct {
			DisplayName string `json:"displayName"`
		} `json:"venue"`
		Competitors []struct {
			ID       string `json:"id"`
			HomeAway string `json:"homeAway"` // "home" or "away"
			Score    string `json:"score"`
			Linescores []struct {
				Value        float64 `json:"value"`
				DisplayValue string  `json:"displayValue"`
				Period       int     `json:"period"`
			} `json:"linescores"`
			Team struct {
				ID           string `json:"id"`
				Name         string `json:"name"`
				Abbreviation string `json:"abbreviation"`
				DisplayName  string `json:"displayName"`
				Logo         string `json:"logo"`
				Location     string `json:"location"`
			} `json:"team"`
		} `json:"competitors"`
		Odds []struct {
			Provider struct {
				Name string `json:"name"`
			} `json:"provider"`
			Details   string  `json:"details"`
			OverUnder float64 `json:"overUnder"`
			Spread    float64 `json:"spread"`
			AwayTeamOdds struct {
				MoneyLine int `json:"moneyLine"`
			} `json:"awayTeamOdds"`
			HomeTeamOdds struct {
				MoneyLine int `json:"moneyLine"`
			} `json:"homeTeamOdds"`
		} `json:"odds"`
	} `json:"competitions"`
}

type ESPNEventsResponse struct {
	Leagues []struct {
		ID           string `json:"id"`
		Name         string `json:"name"`
		Abbreviation string `json:"abbreviation"`
		Slug         string `json:"slug"`
	} `json:"leagues"`
	Events []ESPNEvent `json:"events"`
}

type ESPNLeagueConfig struct {
	Sport       models.SportType
	SportPath   string
	LeaguePath  string
	LeagueID    string
	LeagueName  string
	Country     string
	DefaultLogo string
}

var ActiveESPNLeagues = []ESPNLeagueConfig{
	{
		Sport:       models.SportSoccer,
		SportPath:   "soccer",
		LeaguePath:  "eng.1",
		LeagueID:    "premier-league",
		LeagueName:  "Premier League",
		Country:     "England",
		DefaultLogo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=100&auto=format&fit=crop&q=60",
	},
	{
		Sport:       models.SportSoccer,
		SportPath:   "soccer",
		LeaguePath:  "esp.1",
		LeagueID:    "la-liga",
		LeagueName:  "La Liga",
		Country:     "Spain",
		DefaultLogo: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=100&auto=format&fit=crop&q=60",
	},
	{
		Sport:       models.SportSoccer,
		SportPath:   "soccer",
		LeaguePath:  "uefa.champions",
		LeagueID:    "champions-league",
		LeagueName:  "UEFA Champions League",
		Country:     "Europe",
		DefaultLogo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=100&auto=format&fit=crop&q=60",
	},
	{
		Sport:       models.SportSoccer,
		SportPath:   "soccer",
		LeaguePath:  "ita.1",
		LeagueID:    "serie-a",
		LeagueName:  "Serie A",
		Country:     "Italy",
		DefaultLogo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=100&auto=format&fit=crop&q=60",
	},
	{
		Sport:       models.SportSoccer,
		SportPath:   "soccer",
		LeaguePath:  "ger.1",
		LeagueID:    "bundesliga",
		LeagueName:  "Bundesliga",
		Country:     "Germany",
		DefaultLogo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=100&auto=format&fit=crop&q=60",
	},
	{
		Sport:       models.SportBasketball,
		SportPath:   "basketball",
		LeaguePath:  "nba",
		LeagueID:    "nba",
		LeagueName:  "NBA Basketball",
		Country:     "USA",
		DefaultLogo: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=100&auto=format&fit=crop&q=60",
	},
	{
		Sport:       models.SportNFL,
		SportPath:   "football",
		LeaguePath:  "nfl",
		LeagueID:    "nfl",
		LeagueName:  "NFL Football",
		Country:     "USA",
		DefaultLogo: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=100&auto=format&fit=crop&q=60",
	},
	{
		Sport:       models.SportBaseball,
		SportPath:   "baseball",
		LeaguePath:  "mlb",
		LeagueID:    "mlb",
		LeagueName:  "Major League Baseball",
		Country:     "USA",
		DefaultLogo: "https://images.unsplash.com/photo-1593341646782-e0b495cff86d?w=100&auto=format&fit=crop&q=60",
	},
}

func (c *ESPNClient) FetchScoreboard(ctx context.Context, sport string, league string) (*ESPNEventsResponse, error) {
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

// ConvertESPNToMatch transforms an ESPN event DTO into standard internal Match model
func ConvertESPNToMatch(event ESPNEvent, cfg ESPNLeagueConfig) *models.Match {
	startTime, err := time.Parse(time.RFC3339, event.Date)
	if err != nil {
		startTime = time.Now()
	}

	// Status resolution
	var status models.MatchStatus
	switch event.Status.Type.State {
	case "in":
		if event.Status.Type.Name == "STATUS_HALFTIME" {
			status = models.StatusHalfTime
		} else {
			status = models.StatusLive
		}
	case "post":
		status = models.StatusFinished
	case "pre":
		status = models.StatusScheduled
	default:
		if event.Status.Type.Completed {
			status = models.StatusFinished
		} else {
			status = models.StatusScheduled
		}
	}

	if strings.Contains(event.Status.Type.Name, "POSTPONED") {
		status = models.StatusPostponed
	} else if strings.Contains(event.Status.Type.Name, "CANCEL") {
		status = models.StatusCancelled
	}

	// Competitors (Home vs Away)
	homeTeam := models.Team{
		ID:        "team-home-" + event.ID,
		Name:      "Home Team",
		ShortName: "HOM",
		Country:   cfg.Country,
	}
	awayTeam := models.Team{
		ID:        "team-away-" + event.ID,
		Name:      "Away Team",
		ShortName: "AWY",
		Country:   cfg.Country,
	}

	homeScore := 0
	awayScore := 0
	var periodScores []string
	venue := ""

	if len(event.Competitions) > 0 {
		comp := event.Competitions[0]
		venue = comp.Venue.DisplayName

		var homeComp, awayComp *struct {
			ID       string `json:"id"`
			HomeAway string `json:"homeAway"`
			Score    string `json:"score"`
			Linescores []struct {
				Value        float64 `json:"value"`
				DisplayValue string  `json:"displayValue"`
				Period       int     `json:"period"`
			} `json:"linescores"`
			Team struct {
				ID           string `json:"id"`
				Name         string `json:"name"`
				Abbreviation string `json:"abbreviation"`
				DisplayName  string `json:"displayName"`
				Logo         string `json:"logo"`
				Location     string `json:"location"`
			} `json:"team"`
		}

		for i := range comp.Competitors {
			c := &comp.Competitors[i]
			if c.HomeAway == "home" {
				homeComp = c
			} else {
				awayComp = c
			}
		}

		if homeComp != nil {
			homeTeam.ID = homeComp.Team.ID
			if homeComp.Team.DisplayName != "" {
				homeTeam.Name = homeComp.Team.DisplayName
			} else {
				homeTeam.Name = homeComp.Team.Name
			}
			homeTeam.ShortName = homeComp.Team.Abbreviation
			homeTeam.Logo = homeComp.Team.Logo
			if s, err := strconv.Atoi(homeComp.Score); err == nil {
				homeScore = s
			}
		}

		if awayComp != nil {
			awayTeam.ID = awayComp.Team.ID
			if awayComp.Team.DisplayName != "" {
				awayTeam.Name = awayComp.Team.DisplayName
			} else {
				awayTeam.Name = awayComp.Team.Name
			}
			awayTeam.ShortName = awayComp.Team.Abbreviation
			awayTeam.Logo = awayComp.Team.Logo
			if s, err := strconv.Atoi(awayComp.Score); err == nil {
				awayScore = s
			}
		}

		// Build period scores if linescores exist
		if homeComp != nil && awayComp != nil && len(homeComp.Linescores) > 0 && len(awayComp.Linescores) > 0 {
			count := len(homeComp.Linescores)
			if len(awayComp.Linescores) < count {
				count = len(awayComp.Linescores)
			}
			for i := 0; i < count; i++ {
				hVal := int(homeComp.Linescores[i].Value)
				aVal := int(awayComp.Linescores[i].Value)
				periodScores = append(periodScores, fmt.Sprintf("%d-%d", hVal, aVal))
			}
		}
	}

	period := event.Status.Type.ShortDetail
	if period == "" {
		period = event.Status.Type.Description
	}
	minute := int(event.Status.Clock)
	if minute == 0 && event.Status.DisplayClock != "" {
		var m int
		cleanClock := strings.TrimSuffix(event.Status.DisplayClock, "'")
		if val, err := strconv.Atoi(cleanClock); err == nil {
			minute = val
		} else if _, err := fmt.Sscanf(event.Status.DisplayClock, "%d'", &m); err == nil {
			minute = m
		}
	}

	leagueObj := models.League{
		ID:      cfg.LeagueID,
		Name:    cfg.LeagueName,
		Sport:   cfg.Sport,
		Country: cfg.Country,
		Logo:    cfg.DefaultLogo,
	}

	matchID := fmt.Sprintf("espn-%s", event.ID)

	// Build odds if provided by ESPN
	var matchOdds *models.MatchOdds
	if len(event.Competitions) > 0 && len(event.Competitions[0].Odds) > 0 {
		o := event.Competitions[0].Odds[0]
		provName := o.Provider.Name
		if provName == "" {
			provName = "DraftKings"
		}

		homeWin := 1.90
		awayWin := 1.90
		draw := 3.20

		if o.HomeTeamOdds.MoneyLine != 0 {
			homeWin = moneyLineToDecimal(o.HomeTeamOdds.MoneyLine)
		}
		if o.AwayTeamOdds.MoneyLine != 0 {
			awayWin = moneyLineToDecimal(o.AwayTeamOdds.MoneyLine)
		}

		matchOdds = &models.MatchOdds{
			MatchID: matchID,
			Consensus: models.BookmakerOdds{
				BookmakerKey:   "espn-consensus",
				BookmakerTitle: provName,
				LastUpdate:     time.Now(),
				HomeWin:        homeWin,
				Draw:           draw,
				AwayWin:        awayWin,
				Over25:         1.85,
				Under25:        1.95,
				SpreadHome:     o.Spread,
			},
			Bookmakers: []models.BookmakerOdds{
				{
					BookmakerKey:   strings.ToLower(provName),
					BookmakerTitle: provName,
					LastUpdate:     time.Now(),
					HomeWin:        homeWin,
					Draw:           draw,
					AwayWin:        awayWin,
					Over25:         1.85,
					Under25:        1.95,
					SpreadHome:     o.Spread,
				},
			},
			LastUpdated: time.Now(),
		}
	}

	return &models.Match{
		ID:           matchID,
		Sport:        cfg.Sport,
		League:       leagueObj,
		HomeTeam:     homeTeam,
		AwayTeam:     awayTeam,
		HomeScore:    homeScore,
		AwayScore:    awayScore,
		PeriodScores: periodScores,
		Status:       status,
		Period:       period,
		Minute:       minute,
		StartTime:    startTime,
		Venue:        venue,
		HasLiveAudio: false,
		Odds:         matchOdds,
		Stats: models.MatchStats{
			PossessionHome:    50,
			PossessionAway:    50,
			ShotsHome:         homeScore * 4,
			ShotsAway:         awayScore * 4,
			ShotsOnTargetHome: homeScore * 2,
			ShotsOnTargetAway: awayScore * 2,
			AttackingPressure: "NEUTRAL",
			BallPositionX:     50.0,
			BallPositionY:     50.0,
		},
		Events: make([]models.MatchEvent, 0),
	}
}

func moneyLineToDecimal(ml int) float64 {
	if ml > 0 {
		return float64(ml)/100.0 + 1.0
	} else if ml < 0 {
		return 100.0/float64(-ml) + 1.0
	}
	return 2.00
}
