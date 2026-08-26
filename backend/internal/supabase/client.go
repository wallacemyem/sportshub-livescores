package supabase

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/sports/livescores/internal/models"
)

type Client struct {
	baseURL    string
	serviceKey string
	httpClient *http.Client
}

func NewClient(baseURL, serviceKey string) *Client {
	return &Client{
		baseURL:    baseURL,
		serviceKey: serviceKey,
		httpClient: &http.Client{Timeout: 5 * time.Second},
	}
}

func (c *Client) IsConfigured() bool {
	return c != nil && c.baseURL != "" && c.serviceKey != ""
}

func (c *Client) postgrestUpsert(table string, payload any) error {
	if !c.IsConfigured() {
		return nil
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	url := fmt.Sprintf("%s/rest/v1/%s", c.baseURL, table)
	req, err := http.NewRequest("POST", url, bytes.NewReader(bodyBytes))
	if err != nil {
		return err
	}

	req.Header.Set("apikey", c.serviceKey)
	req.Header.Set("Authorization", "Bearer "+c.serviceKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "resolution=merge-duplicates")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("supabase upsert error on %s: status %d", table, resp.StatusCode)
	}

	return nil
}

// SyncBetSlip upserts a betslip and its legs into Supabase
func (c *Client) SyncBetSlip(slip *models.BetSlip) {
	if !c.IsConfigured() || slip == nil {
		return
	}

	go func(s models.BetSlip) {
		payload := []map[string]any{
			{
				"id":                  s.ID,
				"user_id":             s.UserID,
				"bookmaker":           s.Bookmaker,
				"booking_code":        s.BookingCode,
				"stake":               10.00,
				"total_odds":          s.TotalOdds,
				"potential_win":       s.TotalOdds * 10.00,
				"current_cashout":     0.00,
				"cashout_probability": 0.500,
				"status":              string(s.Status),
				"legs_json":           s.Legs,
			},
		}
		if err := c.postgrestUpsert("bet_slips", payload); err != nil {
			log.Printf("[SUPABASE SYNC WARNING] Failed to sync bet_slip %s: %v", s.BookingCode, err)
		} else {
			log.Printf("[SUPABASE SYNC] Successfully synced bet_slip %s to Supabase", s.BookingCode)
		}
	}(*slip)
}

// SyncMatch upserts a match, its league, and both teams into Supabase
func (c *Client) SyncMatch(m *models.Match) {
	if !c.IsConfigured() || m == nil {
		return
	}

	go func(match models.Match) {
		// 1. Sync League
		if match.League.ID != "" {
			_ = c.postgrestUpsert("leagues", []map[string]any{
				{
					"id":       match.League.ID,
					"name":     match.League.Name,
					"sport_id": string(match.Sport),
					"country":  match.League.Country,
					"logo":     match.League.Logo,
				},
			})
		}

		// 2. Sync Home Team
		if match.HomeTeam.ID != "" {
			_ = c.postgrestUpsert("teams", []map[string]any{
				{
					"id":         match.HomeTeam.ID,
					"name":       match.HomeTeam.Name,
					"short_name": match.HomeTeam.ShortName,
					"logo":       match.HomeTeam.Logo,
					"country":    match.HomeTeam.Country,
				},
			})
		}

		// 3. Sync Away Team
		if match.AwayTeam.ID != "" {
			_ = c.postgrestUpsert("teams", []map[string]any{
				{
					"id":         match.AwayTeam.ID,
					"name":       match.AwayTeam.Name,
					"short_name": match.AwayTeam.ShortName,
					"logo":       match.AwayTeam.Logo,
					"country":    match.AwayTeam.Country,
				},
			})
		}

		// 4. Sync Match
		matchPayload := []map[string]any{
			{
				"id":           match.ID,
				"sport_id":     string(match.Sport),
				"league_id":    match.League.ID,
				"home_team_id": match.HomeTeam.ID,
				"away_team_id": match.AwayTeam.ID,
				"home_score":   match.HomeScore,
				"away_score":   match.AwayScore,
				"status":       string(match.Status),
				"period":       match.Period,
				"minute":       match.Minute,
				"start_time":   match.StartTime.Format(time.RFC3339),
				"venue":        match.Venue,
				"referee":      match.Referee,
				"stats_json":   match.Stats,
			},
		}

		if err := c.postgrestUpsert("matches", matchPayload); err != nil {
			log.Printf("[SUPABASE SYNC WARNING] Failed to sync match %s: %v", match.ID, err)
		}
	}(*m)
}

// SyncUser upserts user to Supabase
func (c *Client) SyncUser(u *models.User) {
	if !c.IsConfigured() || u == nil {
		return
	}

	go func(user models.User) {
		payload := []map[string]any{
			{
				"id":            user.ID,
				"email":         user.Email,
				"name":          user.Name,
				"password_hash": user.PasswordHash,
				"role":          user.Role,
				"is_admin":      user.IsAdmin,
				"plan":          string(user.Plan),
				"plan_expiry":   user.PlanExpiry,
				"status":        string(user.Status),
				"country":       user.Country,
				"signup_source": user.SignupSource,
				"last_seen_at":  user.LastSeenAt.Format(time.RFC3339),
			},
		}
		if err := c.postgrestUpsert("users", payload); err != nil {
			log.Printf("[SUPABASE SYNC WARNING] Failed to sync user %s: %v", user.Email, err)
		}
	}(*u)
}

// SyncBlogPost upserts blog post to Supabase
func (c *Client) SyncBlogPost(p *models.BlogPost) {
	if !c.IsConfigured() || p == nil {
		return
	}

	go func(post models.BlogPost) {
		payload := []map[string]any{
			{
				"id":            post.ID,
				"title":         post.Title,
				"slug":          post.Slug,
				"excerpt":       post.Excerpt,
				"content_html":  post.ContentHTML,
				"cover_image":   post.CoverImage,
				"category":      post.Category,
				"tags":          post.Tags,
				"author_name":   post.AuthorName,
				"author_role":   post.AuthorRole,
				"author_avatar": post.AuthorAvatar,
				"match_id":      post.MatchID,
				"read_time_min": post.ReadTimeMin,
				"views":         post.Views,
				"likes":         post.Likes,
				"status":        post.Status,
				"published_at":  post.PublishedAt.Format(time.RFC3339),
			},
		}
		if err := c.postgrestUpsert("blog_posts", payload); err != nil {
			log.Printf("[SUPABASE SYNC WARNING] Failed to sync blog post %s: %v", post.Slug, err)
		}
	}(*p)
}

// SyncSupportTicket upserts support ticket to Supabase
func (c *Client) SyncSupportTicket(t *models.SupportTicket) {
	if !c.IsConfigured() || t == nil {
		return
	}

	go func(ticket models.SupportTicket) {
		payload := []map[string]any{
			{
				"id":         ticket.ID,
				"user_id":    ticket.UserID,
				"user_name":  ticket.UserName,
				"user_email": ticket.UserEmail,
				"subject":    ticket.Subject,
				"category":   ticket.Category,
				"priority":   ticket.Priority,
				"status":     ticket.Status,
				"messages":   ticket.Messages,
			},
		}
		if err := c.postgrestUpsert("support_tickets", payload); err != nil {
			log.Printf("[SUPABASE SYNC WARNING] Failed to sync support ticket %s: %v", ticket.ID, err)
		}
	}(*t)
}
