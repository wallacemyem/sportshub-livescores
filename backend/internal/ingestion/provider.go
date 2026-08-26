package ingestion

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/sports/livescores/internal/models"
)

// ScoreProvider is a source of live fixtures.
//
// Two implementations exist: the free ESPN scoreboard (no key, no quota, but
// undocumented and liable to be blocked without notice) and API-Football,
// which is paid above a very small free allowance but is a supported product
// with a published contract.
type ScoreProvider interface {
	// Name identifies the provider in logs and telemetry.
	Name() string

	// FetchLive returns the current fixture list.
	FetchLive(ctx context.Context) ([]*models.Match, error)

	// Healthy reports whether the last attempt succeeded.
	Healthy() bool

	// Budget reports remaining request allowance, or -1 when unmetered.
	Budget() int
}

// ProviderChain tries providers in order and falls back on failure.
//
// The order matches how the plans are sold: the paid provider is only
// consulted when a key is configured (an Elite deployment), and any failure or
// exhausted quota falls back to the free provider rather than leaving the
// board empty. A deployment with no paid key runs on the free provider
// forever, which is the default.
type ProviderChain struct {
	mu        sync.RWMutex
	primary   ScoreProvider // paid, optional
	fallback  ScoreProvider // free, always present
	lastUsed  string
	lastError string
}

func NewProviderChain(primary, fallback ScoreProvider) *ProviderChain {
	return &ProviderChain{primary: primary, fallback: fallback}
}

// FetchLive returns fixtures from the first provider that can serve them.
func (c *ProviderChain) FetchLive(ctx context.Context) ([]*models.Match, error) {
	c.mu.RLock()
	primary := c.primary
	fallback := c.fallback
	c.mu.RUnlock()

	if primary != nil {
		if primary.Budget() == 0 {
			log.Printf("[PROVIDER] %s quota exhausted, using %s", primary.Name(), fallback.Name())
			c.note(fallback.Name(), "primary quota exhausted")
		} else {
			matches, err := primary.FetchLive(ctx)
			if err == nil {
				c.note(primary.Name(), "")
				return matches, nil
			}
			log.Printf("[PROVIDER] %s failed (%v), falling back to %s",
				primary.Name(), err, fallback.Name())
			c.note(fallback.Name(), err.Error())
		}
	}

	matches, err := fallback.FetchLive(ctx)
	if err != nil {
		c.note(fallback.Name(), err.Error())
		return nil, err
	}
	c.note(fallback.Name(), "")
	return matches, nil
}

func (c *ProviderChain) note(used, errMsg string) {
	c.mu.Lock()
	c.lastUsed = used
	c.lastError = errMsg
	c.mu.Unlock()
}

// ActiveProvider names whichever provider last served a request.
func (c *ProviderChain) ActiveProvider() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.lastUsed
}

func (c *ProviderChain) LastError() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.lastError
}

// ---------------------------------------------------------------------------
// ESPN provider (free, and the default for every deployment)
// ---------------------------------------------------------------------------

type espnProvider struct {
	client  *ESPNClient
	mu      sync.RWMutex
	healthy bool
}

func NewESPNProvider(client *ESPNClient) ScoreProvider {
	return &espnProvider{client: client, healthy: true}
}

func (p *espnProvider) Name() string { return "espn" }

// Budget is unmetered: ESPN publishes no quota for this endpoint.
func (p *espnProvider) Budget() int { return -1 }

func (p *espnProvider) Healthy() bool {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.healthy
}

func (p *espnProvider) FetchLive(ctx context.Context) ([]*models.Match, error) {
	var out []*models.Match
	var lastErr error
	ok := 0

	for _, l := range ActiveESPNLeagues {
		resp, err := p.client.FetchScoreboard(ctx, l.SportPath, l.LeaguePath)
		if err != nil {
			lastErr = err
			continue
		}
		ok++
		for _, evt := range resp.Events {
			if m := ConvertESPNToMatch(evt, l); m != nil {
				out = append(out, m)
			}
		}
	}

	p.mu.Lock()
	p.healthy = ok > 0
	p.mu.Unlock()

	// Only a total wipeout is an error; one dead league should not blank the
	// whole board.
	if ok == 0 && lastErr != nil {
		return nil, lastErr
	}
	return out, nil
}

// ---------------------------------------------------------------------------
// API-Football provider (paid, used when an Elite key is configured)
// ---------------------------------------------------------------------------

// apiFootballProvider talks to API-Sports' football API (v3).
//
// Their free allowance is 100 requests/day, which cannot sustain a live poll
// (a 10-second cycle is 8,640 requests/day), so this provider is only worth
// enabling on a paid plan. It self-limits against the configured daily budget
// and reports exhaustion so the chain falls back to ESPN rather than hammering
// a spent quota.
type apiFootballProvider struct {
	apiKey   string
	baseURL  string
	dailyCap int

	mu       sync.RWMutex
	used     int
	windowAt time.Time
	healthy  bool
}

func NewAPIFootballProvider(apiKey, baseURL string, dailyCap int) ScoreProvider {
	if baseURL == "" {
		baseURL = "https://v3.football.api-sports.io"
	}
	if dailyCap <= 0 {
		dailyCap = 7500 // the Pro plan's daily allowance
	}
	return &apiFootballProvider{
		apiKey:   apiKey,
		baseURL:  strings.TrimRight(baseURL, "/"),
		dailyCap: dailyCap,
		windowAt: time.Now().UTC().Truncate(24 * time.Hour),
		healthy:  true,
	}
}

func (p *apiFootballProvider) Name() string { return "api-football" }

func (p *apiFootballProvider) Healthy() bool {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.healthy
}

// Budget returns requests left in the current UTC day, or 0 when spent.
func (p *apiFootballProvider) Budget() int {
	p.mu.Lock()
	defer p.mu.Unlock()

	// API-Sports resets the daily counter at 00:00 UTC.
	today := time.Now().UTC().Truncate(24 * time.Hour)
	if today.After(p.windowAt) {
		p.windowAt = today
		p.used = 0
	}

	if remaining := p.dailyCap - p.used; remaining > 0 {
		return remaining
	}
	return 0
}

func (p *apiFootballProvider) setHealthy(v bool) {
	p.mu.Lock()
	p.healthy = v
	p.mu.Unlock()
}

type apiFootballTeam struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Logo string `json:"logo"`
}

// apiFootballFixture is one element of the v3 /fixtures response.
type apiFootballFixture struct {
	Fixture struct {
		ID    int    `json:"id"`
		Date  string `json:"date"`
		Venue struct {
			Name string `json:"name"`
		} `json:"venue"`
		Status struct {
			Long    string `json:"long"`
			Short   string `json:"short"`
			Elapsed int    `json:"elapsed"`
		} `json:"status"`
	} `json:"fixture"`
	League struct {
		ID      int    `json:"id"`
		Name    string `json:"name"`
		Country string `json:"country"`
		Logo    string `json:"logo"`
		Round   string `json:"round"`
	} `json:"league"`
	Teams struct {
		Home apiFootballTeam `json:"home"`
		Away apiFootballTeam `json:"away"`
	} `json:"teams"`
	Goals struct {
		Home *int `json:"home"`
		Away *int `json:"away"`
	} `json:"goals"`
}

type apiFootballResponse struct {
	Errors   interface{}          `json:"errors"`
	Response []apiFootballFixture `json:"response"`
}

// FetchLive pulls every in-play fixture in one request.
//
// "?live=all" returns all live fixtures across every league the plan covers,
// which keeps this at one request per poll rather than one per league. That is
// the difference between fitting inside a daily quota and burning through it.
func (p *apiFootballProvider) FetchLive(ctx context.Context) ([]*models.Match, error) {
	if p.apiKey == "" {
		return nil, fmt.Errorf("api-football: no key configured")
	}
	if p.Budget() <= 0 {
		return nil, fmt.Errorf("api-football: daily quota exhausted")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.baseURL+"/fixtures?live=all", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-apisports-key", p.apiKey)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)

	p.mu.Lock()
	p.used++
	p.mu.Unlock()

	if err != nil {
		p.setHealthy(false)
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		p.setHealthy(false)
		snippet, _ := io.ReadAll(io.LimitReader(resp.Body, 200))
		return nil, fmt.Errorf("api-football status %d: %s",
			resp.StatusCode, strings.TrimSpace(string(snippet)))
	}

	var data apiFootballResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		p.setHealthy(false)
		return nil, err
	}

	out := make([]*models.Match, 0, len(data.Response))
	for _, f := range data.Response {
		out = append(out, convertAPIFootball(f))
	}

	p.setHealthy(true)
	return out, nil
}

// convertAPIFootball maps one fixture onto the internal model, following the
// same clock convention as the ESPN path: soccer counts up, so Elapsed goes
// into Minute and the display clock carries stoppage time.
func convertAPIFootball(f apiFootballFixture) *models.Match {
	startTime, err := time.Parse(time.RFC3339, f.Fixture.Date)
	if err != nil {
		startTime = time.Now()
	}

	// API-Football status codes: 1H/2H/ET/P are in play, HT is half time,
	// FT/AET/PEN are finished, NS is not started.
	var status models.MatchStatus
	switch f.Fixture.Status.Short {
	case "1H", "2H", "ET", "P", "BT", "LIVE":
		status = models.StatusLive
	case "HT":
		status = models.StatusHalfTime
	case "FT", "AET", "PEN":
		status = models.StatusFinished
	case "PST":
		status = models.StatusPostponed
	case "CANC", "ABD":
		status = models.StatusCancelled
	default:
		status = models.StatusScheduled
	}

	periodNumber := 1
	period := "1H"
	switch f.Fixture.Status.Short {
	case "2H":
		periodNumber, period = 2, "2H"
	case "HT":
		period = "HT"
	case "ET":
		periodNumber, period = 3, "ET"
	}

	elapsed := f.Fixture.Status.Elapsed
	displayClock := ""
	if status == models.StatusLive && elapsed > 0 {
		// Show stoppage the way the sport does: 45+n and 90+n.
		switch {
		case periodNumber == 1 && elapsed > 45:
			displayClock = fmt.Sprintf("45+%d", elapsed-45)
		case periodNumber >= 2 && elapsed > 90:
			displayClock = fmt.Sprintf("90+%d", elapsed-90)
		default:
			displayClock = fmt.Sprintf("%d'", elapsed)
		}
	}

	homeScore, awayScore := 0, 0
	if f.Goals.Home != nil {
		homeScore = *f.Goals.Home
	}
	if f.Goals.Away != nil {
		awayScore = *f.Goals.Away
	}

	return &models.Match{
		ID:    fmt.Sprintf("apif-%d", f.Fixture.ID),
		Sport: models.SportSoccer,
		League: models.League{
			ID:      fmt.Sprintf("apif-league-%d", f.League.ID),
			Name:    f.League.Name,
			Sport:   models.SportSoccer,
			Country: f.League.Country,
			Logo:    f.League.Logo,
		},
		HomeTeam: models.Team{
			ID:        fmt.Sprintf("apif-team-%d", f.Teams.Home.ID),
			Name:      f.Teams.Home.Name,
			ShortName: shortenTeamName(f.Teams.Home.Name),
			Logo:      f.Teams.Home.Logo,
			Country:   f.League.Country,
		},
		AwayTeam: models.Team{
			ID:        fmt.Sprintf("apif-team-%d", f.Teams.Away.ID),
			Name:      f.Teams.Away.Name,
			ShortName: shortenTeamName(f.Teams.Away.Name),
			Logo:      f.Teams.Away.Logo,
			Country:   f.League.Country,
		},
		HomeScore:    homeScore,
		AwayScore:    awayScore,
		Status:       status,
		Period:       period,
		PeriodNumber: periodNumber,
		Minute:       elapsed,
		DisplayClock: displayClock,
		StartTime:    startTime,
		Venue:        f.Fixture.Venue.Name,
	}
}

// shortenTeamName produces a short code when the provider does not send one.
func shortenTeamName(name string) string {
	fields := strings.Fields(name)
	if len(fields) == 0 {
		return "???"
	}
	if len(fields) == 1 {
		if len(fields[0]) >= 3 {
			return strings.ToUpper(fields[0][:3])
		}
		return strings.ToUpper(fields[0])
	}

	code := ""
	for _, field := range fields {
		if field == "" {
			continue
		}
		code += strings.ToUpper(field[:1])
		if len(code) == 3 {
			break
		}
	}
	return code
}
