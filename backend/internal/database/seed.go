package database

import (
	"context"
	"time"

	"github.com/sports/livescores/internal/models"
)

var InitialSports = []models.SportType{
	models.SportSoccer,
	models.SportBasketball,
	models.SportTennis,
	models.SportNFL,
	models.SportCricket,
	models.SportBaseball,
	models.SportGolf,
}

var InitialLeagues = []models.League{
	{ID: "premier-league", Name: "Premier League", Sport: models.SportSoccer, Country: "England", Logo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=100&auto=format&fit=crop&q=60"},
	{ID: "champions-league", Name: "UEFA Champions League", Sport: models.SportSoccer, Country: "Europe", Logo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=100&auto=format&fit=crop&q=60"},
	{ID: "la-liga", Name: "La Liga", Sport: models.SportSoccer, Country: "Spain", Logo: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=100&auto=format&fit=crop&q=60"},
	{ID: "nba", Name: "NBA Basketball", Sport: models.SportBasketball, Country: "USA", Logo: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=100&auto=format&fit=crop&q=60"},
	{ID: "atp-masters", Name: "ATP Tour Masters", Sport: models.SportTennis, Country: "Global", Logo: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=100&auto=format&fit=crop&q=60"},
	{ID: "nfl", Name: "NFL Football", Sport: models.SportNFL, Country: "USA", Logo: "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=100&auto=format&fit=crop&q=60"},
	{ID: "ipl", Name: "Indian Premier League", Sport: models.SportCricket, Country: "India", Logo: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=100&auto=format&fit=crop&q=60"},
	{ID: "mlb", Name: "Major League Baseball", Sport: models.SportBaseball, Country: "USA", Logo: "https://images.unsplash.com/photo-1593341646782-e0b495cff86d?w=100&auto=format&fit=crop&q=60"},
	{ID: "pga-tour", Name: "PGA Tour Championship", Sport: models.SportGolf, Country: "USA", Logo: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=100&auto=format&fit=crop&q=60"},
}

func GetInitialMatches() []models.Match {
	return []models.Match{}
}

func GetInitialBetSlips() []models.BetSlip {
	return []models.BetSlip{}
}

func GetInitialBlogPosts() []models.BlogPost {
	now := time.Now()

	return []models.BlogPost{
		{
			ID:          "post-tactics-ars-mci",
			Title:       "Tactical Masterclass: How Arteta Overloaded the Half-Spaces to Dismantle Man City",
			Slug:        "arteta-tactical-masterclass-arsenal-vs-man-city",
			Excerpt:     "An in-depth tactical deconstruction of Arsenal's 3-2-4-1 build-up shape, inverted fullback rotations, and how Martin Ødegaard exploited the space between City's double pivot.",
			ContentHTML: `<h2>The Tactical Chess Match at the Emirates</h2><p>When Mikel Arteta lined up against Pep Guardiola, the tactical battle was won in the transition phases. By instructing his wide players to pin City's fullbacks deep, Arsenal consistently found <strong>Martin Ødegaard</strong> in the right half-space.</p><blockquote>"Our preparation was entirely about controlling the second ball and preventing City from executing their signature cutbacks." — Mikel Arteta</blockquote><h3>Key Performance Indicators:</h3><ul><li><strong>xG Dominance:</strong> Arsenal 1.84 vs 1.52 Manchester City</li><li><strong>Attacking Third Entries:</strong> 34 entries via the right half-space</li><li><strong>High Press Turnovers:</strong> 7 high turnovers forced within 40 meters of City's goal</li></ul><h3>Expected Goals (xG) Shot Map Analysis</h3><p>Bukayo Saka's 19th-minute opener was the direct result of an overload on the opposite wing that isolated Josko Gvardiol in a 1v1 situation. Notice how Kai Havertz's off-the-ball run dragged Ruben Dias out of position, opening a central lane for the low cutback.</p>`,
			CoverImage:  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&auto=format&fit=crop&q=80",
			Category:    "Tactical Analysis",
			Tags:        []string{"Premier League", "Arsenal", "Man City", "Tactics", "xG Analysis"},
			AuthorName:  "Marcus Sterling",
			AuthorRole:  "Senior Tactical Analyst",
			AuthorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
			MatchID:     "match-epl-01",
			ReadTimeMin: 5,
			Views:       1420,
			Likes:       89,
			Status:      "published",
			PublishedAt: now.Add(-3 * time.Hour),
			CreatedAt:   now.Add(-4 * time.Hour),
			UpdatedAt:   now.Add(-1 * time.Hour),
		},
		{
			ID:          "post-ucl-preview-rma-bay",
			Title:       "Champions League Epic: Real Madrid vs Bayern Munich Semifinal Showdown",
			Slug:        "champions-league-preview-real-madrid-vs-bayern-munich",
			Excerpt:     "Two kings of European football collide at the Santiago Bernabéu. Vinicius Junior vs Alphonso Davies speed duels and Harry Kane's predatory box movement evaluated.",
			ContentHTML: `<h2>The Classic of European Football</h2><p>With 20 European Cups between them, <strong>Real Madrid</strong> and <strong>Bayern Munich</strong> deliver the absolute pinnacle of knockout football. Both managers face crucial tactical dilemmas going into the second leg.</p><h3>The Crucial Matchups:</h3><ol><li><strong>Vinícius Jr vs Alphonso Davies:</strong> The fastest wing duel in world football.</li><li><strong>Jude Bellingham vs Thomas Müller:</strong> Space investigators orchestrating the final third.</li><li><strong>Harry Kane vs Antonio Rüdiger:</strong> Aerial dominance and penalty box presence.</li></ol><h3>Market Consensus & Betting Value</h3><p>Sharps on the betting exchanges have taken early positions on <em>Over 2.5 Goals (1.55)</em> due to both sides showcasing defensive vulnerabilities during counter-pressing transitions.</p>`,
			CoverImage:  "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1200&auto=format&fit=crop&q=80",
			Category:    "Match Preview",
			Tags:        []string{"Champions League", "Real Madrid", "Bayern Munich", "Odds Preview"},
			AuthorName:  "Elena Rostova",
			AuthorRole:  "European Football Editor",
			AuthorAvatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80",
			MatchID:     "match-ucl-02",
			ReadTimeMin: 4,
			Views:       2180,
			Likes:       142,
			Status:      "published",
			PublishedAt: now.Add(-6 * time.Hour),
			CreatedAt:   now.Add(-8 * time.Hour),
			UpdatedAt:   now.Add(-2 * time.Hour),
		},
		{
			ID:          "post-nba-spacing-mastery",
			Title:       "NBA Modern Spacing: Why 5-Out Offenses Are Breaking Traditional Defenses",
			Slug:        "nba-modern-spacing-5-out-offense-breakdown",
			Excerpt:     "Analyzing shot quality distributions, pick-and-pop efficiency, and how drive-and-kick shot generation dictates NBA playoff victory margins.",
			ContentHTML: `<h2>The Geometric Revolution on the Hardwood</h2><p>Modern NBA analytics have fundamentally transformed court geography. By positioning all five offensive players beyond the arc, defenses are stripped of their rim-protecting help side anchors.</p><blockquote>"When the floor is stretched 28 feet wide, a single missed rotation guarantees either a clean corner three or an uncontested dunk."</blockquote>`,
			CoverImage:  "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&auto=format&fit=crop&q=80",
			Category:    "Basketball Analytics",
			Tags:        []string{"NBA", "Basketball", "Analytics", "Shot Quality"},
			AuthorName:  "David 'Coach D' Miller",
			AuthorRole:  "Lead Basketball Strategist",
			AuthorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
			MatchID:     "match-nba-01",
			ReadTimeMin: 6,
			Views:       980,
			Likes:       67,
			Status:      "published",
			PublishedAt: now.Add(-12 * time.Hour),
			CreatedAt:   now.Add(-14 * time.Hour),
			UpdatedAt:   now.Add(-5 * time.Hour),
		},
	}
}

func (db *DB) SeedInitialData(ctx context.Context) error {
	if db.Pool == nil {
		return nil
	}

	// Insert sports
	for _, s := range InitialSports {
		_, _ = db.Pool.Exec(ctx, `INSERT INTO sports (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, string(s), string(s))
	}

	// Insert leagues
	for _, l := range InitialLeagues {
		_, _ = db.Pool.Exec(ctx, `INSERT INTO leagues (id, name, sport_id, country, logo) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
			l.ID, l.Name, string(l.Sport), l.Country, l.Logo)
	}

	// Seed initial blog posts
	for _, p := range GetInitialBlogPosts() {
		_, _ = db.Pool.Exec(ctx, `
			INSERT INTO blog_posts (id, title, slug, excerpt, content_html, cover_image, category, author_name, author_role, author_avatar, match_id, read_time_min, views, likes, status, is_deleted, published_at, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, FALSE, $16, $17, $18)
			ON CONFLICT (id) DO NOTHING;
		`, p.ID, p.Title, p.Slug, p.Excerpt, p.ContentHTML, p.CoverImage, p.Category, p.AuthorName, p.AuthorRole, p.AuthorAvatar, p.MatchID, p.ReadTimeMin, p.Views, p.Likes, p.Status, p.PublishedAt, p.CreatedAt, p.UpdatedAt)
	}

	return nil
}
