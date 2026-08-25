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
	now := time.Now()

	return []models.Match{
		// 1. Premier League Live Match (Arsenal vs Man City)
		{
			ID:    "match-epl-01",
			Sport: models.SportSoccer,
			League: models.League{
				ID: "premier-league", Name: "Premier League", Sport: models.SportSoccer, Country: "England",
			},
			HomeTeam: models.Team{ID: "ars", Name: "Arsenal", ShortName: "ARS", Logo: "ARS", Country: "England"},
			AwayTeam: models.Team{ID: "mci", Name: "Manchester City", ShortName: "MCI", Logo: "MCI", Country: "England"},
			HomeScore: 2,
			AwayScore: 1,
			Status:    models.StatusLive,
			Period:    "2H",
			Minute:    68,
			StartTime: now.Add(-68 * time.Minute),
			Venue:     "Emirates Stadium, London",
			Referee:   "Michael Oliver",
			HasLiveAudio: true,
			Stats: models.MatchStats{
				PossessionHome: 48, PossessionAway: 52,
				ShotsHome: 12, ShotsAway: 14,
				ShotsOnTargetHome: 6, ShotsOnTargetAway: 5,
				CornersHome: 5, CornersAway: 7,
				FoulsHome: 9, FoulsAway: 11,
				YellowCardsHome: 1, YellowCardsAway: 2,
				RedCardsHome: 0, RedCardsAway: 0,
				XGHome: 1.84, XGAway: 1.52,
				AttackingPressure: "HOME",
				BallPositionX: 68.5,
				BallPositionY: 44.2,
			},
			Events: []models.MatchEvent{
				{ID: "ev-1", MatchID: "match-epl-01", Type: models.EventGoal, Minute: 19, TeamSide: "HOME", PlayerName: "Bukayo Saka", AssistName: "Martin Ødegaard", Detail: "Curled into top-left corner", CreatedAt: now.Add(-50 * time.Minute)},
				{ID: "ev-2", MatchID: "match-epl-01", Type: models.EventYellowCard, Minute: 34, TeamSide: "AWAY", PlayerName: "Rodri", Detail: "Tactical foul", CreatedAt: now.Add(-35 * time.Minute)},
				{ID: "ev-3", MatchID: "match-epl-01", Type: models.EventGoal, Minute: 42, TeamSide: "AWAY", PlayerName: "Erling Haaland", AssistName: "Kevin De Bruyne", Detail: "Header from 6 yards", CreatedAt: now.Add(-27 * time.Minute)},
				{ID: "ev-4", MatchID: "match-epl-01", Type: models.EventGoal, Minute: 57, TeamSide: "HOME", PlayerName: "Kai Havertz", AssistName: "Declan Rice", Detail: "Low drive into bottom-right", CreatedAt: now.Add(-12 * time.Minute)},
			},
			Odds: &models.MatchOdds{
				MatchID: "match-epl-01",
				Consensus: models.BookmakerOdds{
					BookmakerKey: "consensus", BookmakerTitle: "Market Consensus", LastUpdate: now,
					HomeWin: 1.45, Draw: 3.80, AwayWin: 5.60, Over25: 1.30, Under25: 3.20,
				},
				Bookmakers: []models.BookmakerOdds{
					{BookmakerKey: "bet365", BookmakerTitle: "Bet365", LastUpdate: now, HomeWin: 1.44, Draw: 3.90, AwayWin: 5.75, Over25: 1.28, Under25: 3.30},
					{BookmakerKey: "pinnacle", BookmakerTitle: "Pinnacle", LastUpdate: now, HomeWin: 1.48, Draw: 3.75, AwayWin: 5.50, Over25: 1.31, Under25: 3.15},
					{BookmakerKey: "1xbet", BookmakerTitle: "1xBet", LastUpdate: now, HomeWin: 1.46, Draw: 3.85, AwayWin: 5.80, Over25: 1.29, Under25: 3.25},
				},
			},
		},
		// 2. Champions League Live Match (Real Madrid vs Bayern Munich)
		{
			ID:    "match-ucl-02",
			Sport: models.SportSoccer,
			League: models.League{
				ID: "champions-league", Name: "UEFA Champions League", Sport: models.SportSoccer, Country: "Europe",
			},
			HomeTeam: models.Team{ID: "rma", Name: "Real Madrid", ShortName: "RMA", Logo: "RMA", Country: "Spain"},
			AwayTeam: models.Team{ID: "bay", Name: "Bayern Munich", ShortName: "BAY", Logo: "BAY", Country: "Germany"},
			HomeScore: 1,
			AwayScore: 1,
			Status:    models.StatusLive,
			Period:    "1H",
			Minute:    39,
			StartTime: now.Add(-39 * time.Minute),
			Venue:     "Santiago Bernabéu, Madrid",
			Referee:   "Szymon Marciniak",
			HasLiveAudio: true,
			Stats: models.MatchStats{
				PossessionHome: 55, PossessionAway: 45,
				ShotsHome: 7, ShotsAway: 6,
				ShotsOnTargetHome: 4, ShotsOnTargetAway: 3,
				CornersHome: 4, CornersAway: 2,
				FoulsHome: 4, FoulsAway: 6,
				YellowCardsHome: 0, YellowCardsAway: 1,
				RedCardsHome: 0, RedCardsAway: 0,
				XGHome: 1.12, XGAway: 0.94,
				AttackingPressure: "AWAY",
				BallPositionX: 38.0,
				BallPositionY: 56.4,
			},
			Events: []models.MatchEvent{
				{ID: "ev-ucl-1", MatchID: "match-ucl-02", Type: models.EventGoal, Minute: 14, TeamSide: "HOME", PlayerName: "Vinícius Júnior", AssistName: "Jude Bellingham", Detail: "Solo run and chip", CreatedAt: now.Add(-25 * time.Minute)},
				{ID: "ev-ucl-2", MatchID: "match-ucl-02", Type: models.EventGoal, Minute: 28, TeamSide: "AWAY", PlayerName: "Harry Kane", AssistName: "Leroy Sané", Detail: "Penalty converted", CreatedAt: now.Add(-11 * time.Minute)},
			},
			Odds: &models.MatchOdds{
				MatchID: "match-ucl-02",
				Consensus: models.BookmakerOdds{
					BookmakerKey: "consensus", BookmakerTitle: "Market Consensus", LastUpdate: now,
					HomeWin: 2.15, Draw: 3.10, AwayWin: 3.40, Over25: 1.55, Under25: 2.35,
				},
				Bookmakers: []models.BookmakerOdds{
					{BookmakerKey: "bet365", BookmakerTitle: "Bet365", LastUpdate: now, HomeWin: 2.10, Draw: 3.20, AwayWin: 3.45, Over25: 1.53, Under25: 2.40},
					{BookmakerKey: "pinnacle", BookmakerTitle: "Pinnacle", LastUpdate: now, HomeWin: 2.20, Draw: 3.05, AwayWin: 3.35, Over25: 1.57, Under25: 2.30},
				},
			},
		},
		// 3. NBA Basketball Live Match (Lakers vs Celtics)
		{
			ID:    "match-nba-01",
			Sport: models.SportBasketball,
			League: models.League{
				ID: "nba", Name: "NBA Basketball", Sport: models.SportBasketball, Country: "USA",
			},
			HomeTeam: models.Team{ID: "lal", Name: "Los Angeles Lakers", ShortName: "LAL", Logo: "LAL", Country: "USA"},
			AwayTeam: models.Team{ID: "bos", Name: "Boston Celtics", ShortName: "BOS", Logo: "BOS", Country: "USA"},
			HomeScore: 89,
			AwayScore: 94,
			PeriodScores: []string{"28-26", "24-31", "27-24", "10-13"},
			Status:    models.StatusLive,
			Period:    "Q4",
			Minute:    8,
			StartTime: now.Add(-85 * time.Minute),
			Venue:     "Crypto.com Arena, Los Angeles",
			Referee:   "Scott Foster",
			HasLiveAudio: true,
			Stats: models.MatchStats{
				PossessionHome: 50, PossessionAway: 50,
				ShotsHome: 68, ShotsAway: 72,
				ShotsOnTargetHome: 32, ShotsOnTargetAway: 36,
				FoulsHome: 16, FoulsAway: 14,
				AttackingPressure: "HOME",
				BallPositionX: 74.0,
				BallPositionY: 50.0,
			},
			Events: []models.MatchEvent{
				{ID: "ev-nba-1", MatchID: "match-nba-01", Type: models.EventPoint, Minute: 40, TeamSide: "HOME", PlayerName: "LeBron James", Detail: "3-pt Stepback Jumper", CreatedAt: now.Add(-4 * time.Minute)},
				{ID: "ev-nba-2", MatchID: "match-nba-01", Type: models.EventPoint, Minute: 41, TeamSide: "AWAY", PlayerName: "Jayson Tatum", Detail: "Driving Slam Dunk + Foul", CreatedAt: now.Add(-2 * time.Minute)},
			},
			Odds: &models.MatchOdds{
				MatchID: "match-nba-01",
				Consensus: models.BookmakerOdds{
					BookmakerKey: "consensus", BookmakerTitle: "Market Consensus", LastUpdate: now,
					HomeWin: 2.85, AwayWin: 1.42, SpreadHome: 1.90, SpreadAway: 1.90,
				},
				Bookmakers: []models.BookmakerOdds{
					{BookmakerKey: "draftkings", BookmakerTitle: "DraftKings", LastUpdate: now, HomeWin: 2.90, AwayWin: 1.40, SpreadHome: 1.91, SpreadAway: 1.89},
				},
			},
		},
		// 4. Tennis Live Match (Alcaraz vs Sinner)
		{
			ID:    "match-tennis-01",
			Sport: models.SportTennis,
			League: models.League{
				ID: "atp-masters", Name: "ATP Tour Masters", Sport: models.SportTennis, Country: "Global",
			},
			HomeTeam: models.Team{ID: "alc", Name: "Carlos Alcaraz", ShortName: "ALC", Logo: "ALC", Country: "Spain"},
			AwayTeam: models.Team{ID: "sin", Name: "Jannik Sinner", ShortName: "SIN", Logo: "SIN", Country: "Italy"},
			HomeScore: 1,
			AwayScore: 1,
			PeriodScores: []string{"6-4", "3-6", "4-3 (30-15)"},
			Status:    models.StatusLive,
			Period:    "SET 3",
			Minute:    115,
			StartTime: now.Add(-115 * time.Minute),
			Venue:     "Center Court",
			Referee:   "Carlos Ramos",
			HasLiveAudio: false,
			Stats: models.MatchStats{
				ShotsHome: 28, ShotsAway: 31,
				FoulsHome: 3, FoulsAway: 2,
				AttackingPressure: "HOME",
			},
			Events: []models.MatchEvent{
				{ID: "ev-ten-1", MatchID: "match-tennis-01", Type: models.EventSetWon, Minute: 45, TeamSide: "HOME", PlayerName: "Carlos Alcaraz", Detail: "Won Set 1 (6-4)", CreatedAt: now.Add(-70 * time.Minute)},
				{ID: "ev-ten-2", MatchID: "match-tennis-01", Type: models.EventSetWon, Minute: 90, TeamSide: "AWAY", PlayerName: "Jannik Sinner", Detail: "Won Set 2 (6-3)", CreatedAt: now.Add(-25 * time.Minute)},
			},
			Odds: &models.MatchOdds{
				MatchID: "match-tennis-01",
				Consensus: models.BookmakerOdds{
					BookmakerKey: "consensus", BookmakerTitle: "Market Consensus", LastUpdate: now,
					HomeWin: 1.72, AwayWin: 2.10,
				},
				Bookmakers: []models.BookmakerOdds{
					{BookmakerKey: "bet365", BookmakerTitle: "Bet365", LastUpdate: now, HomeWin: 1.70, AwayWin: 2.15},
				},
			},
		},
		// 5. NFL Live Match (Chiefs vs 49ers)
		{
			ID:    "match-nfl-01",
			Sport: models.SportNFL,
			League: models.League{
				ID: "nfl", Name: "NFL Football", Sport: models.SportNFL, Country: "USA",
			},
			HomeTeam: models.Team{ID: "kc", Name: "Kansas City Chiefs", ShortName: "KC", Logo: "KC", Country: "USA"},
			AwayTeam: models.Team{ID: "sf", Name: "San Francisco 49ers", ShortName: "SF", Logo: "SF", Country: "USA"},
			HomeScore: 24,
			AwayScore: 20,
			PeriodScores: []string{"7-3", "10-7", "0-10", "7-0"},
			Status:    models.StatusLive,
			Period:    "Q4",
			Minute:    12,
			StartTime: now.Add(-120 * time.Minute),
			Venue:     "Arrowhead Stadium, Kansas City",
			Stats: models.MatchStats{
				PossessionHome: 52, PossessionAway: 48,
				AttackingPressure: "HOME",
			},
			Events: []models.MatchEvent{
				{ID: "ev-nfl-1", MatchID: "match-nfl-01", Type: models.EventTouchdown, Minute: 52, TeamSide: "HOME", PlayerName: "Patrick Mahomes to Travis Kelce", Detail: "18-yd pass TD", CreatedAt: now.Add(-8 * time.Minute)},
			},
			Odds: &models.MatchOdds{
				MatchID: "match-nfl-01",
				Consensus: models.BookmakerOdds{
					BookmakerKey: "consensus", BookmakerTitle: "Consensus", LastUpdate: now,
					HomeWin: 1.35, AwayWin: 3.25, SpreadHome: 1.90, SpreadAway: 1.90,
				},
			},
		},
		// 6. Cricket Live Match (CSK vs MI)
		{
			ID:    "match-ipl-01",
			Sport: models.SportCricket,
			League: models.League{
				ID: "ipl", Name: "Indian Premier League", Sport: models.SportCricket, Country: "India",
			},
			HomeTeam: models.Team{ID: "csk", Name: "Chennai Super Kings", ShortName: "CSK", Logo: "CSK", Country: "India"},
			AwayTeam: models.Team{ID: "mi", Name: "Mumbai Indians", ShortName: "MI", Logo: "MI", Country: "India"},
			HomeScore: 178,
			AwayScore: 162,
			PeriodScores: []string{"CSK: 178/4 (20.0 ov)", "MI: 162/6 (18.2 ov)"},
			Status:    models.StatusLive,
			Period:    "2nd Innings",
			Minute:    18,
			StartTime: now.Add(-140 * time.Minute),
			Venue:     "M. A. Chidambaram Stadium, Chennai",
			Stats: models.MatchStats{
				AttackingPressure: "AWAY",
			},
			Events: []models.MatchEvent{
				{ID: "ev-crick-1", MatchID: "match-ipl-01", Type: models.EventWicket, Minute: 17, TeamSide: "AWAY", PlayerName: "Ravindra Jadeja", Detail: "Bowled Suryakumar Yadav (42 off 22)", CreatedAt: now.Add(-5 * time.Minute)},
			},
			Odds: &models.MatchOdds{
				MatchID: "match-ipl-01",
				Consensus: models.BookmakerOdds{
					BookmakerKey: "consensus", BookmakerTitle: "Consensus", LastUpdate: now,
					HomeWin: 1.25, AwayWin: 3.90,
				},
			},
		},
		// 7. Scheduled Soccer Match (Barcelona vs PSG)
		{
			ID:    "match-ucl-03",
			Sport: models.SportSoccer,
			League: models.League{
				ID: "champions-league", Name: "UEFA Champions League", Sport: models.SportSoccer, Country: "Europe",
			},
			HomeTeam: models.Team{ID: "bar", Name: "Barcelona", ShortName: "BAR", Logo: "BAR", Country: "Spain"},
			AwayTeam: models.Team{ID: "psg", Name: "Paris Saint-Germain", ShortName: "PSG", Logo: "PSG", Country: "France"},
			HomeScore: 0,
			AwayScore: 0,
			Status:    models.StatusScheduled,
			Period:    "PRE",
			Minute:    0,
			StartTime: now.Add(2 * time.Hour),
			Venue:     "Estadi Olímpic Lluís Companys",
			Odds: &models.MatchOdds{
				MatchID: "match-ucl-03",
				Consensus: models.BookmakerOdds{
					BookmakerKey: "consensus", BookmakerTitle: "Market Consensus", LastUpdate: now,
					HomeWin: 2.30, Draw: 3.60, AwayWin: 2.85, Over25: 1.60, Under25: 2.25,
				},
			},
		},
		// 8. Finished Match (Liverpool vs Chelsea)
		{
			ID:    "match-epl-04",
			Sport: models.SportSoccer,
			League: models.League{
				ID: "premier-league", Name: "Premier League", Sport: models.SportSoccer, Country: "England",
			},
			HomeTeam: models.Team{ID: "liv", Name: "Liverpool", ShortName: "LIV", Logo: "LIV", Country: "England"},
			AwayTeam: models.Team{ID: "che", Name: "Chelsea", ShortName: "CHE", Logo: "CHE", Country: "England"},
			HomeScore: 3,
			AwayScore: 1,
			Status:    models.StatusFinished,
			Period:    "FT",
			Minute:    90,
			StartTime: now.Add(-4 * time.Hour),
			Venue:     "Anfield, Liverpool",
			Stats: models.MatchStats{
				PossessionHome: 62, PossessionAway: 38,
				ShotsHome: 19, ShotsAway: 8,
				ShotsOnTargetHome: 9, ShotsOnTargetAway: 3,
				CornersHome: 8, CornersAway: 3,
				XGHome: 2.75, XGAway: 0.88,
			},
			Events: []models.MatchEvent{
				{ID: "ev-fin-1", MatchID: "match-epl-04", Type: models.EventGoal, Minute: 23, TeamSide: "HOME", PlayerName: "Mohamed Salah", Detail: "Top corner finish", CreatedAt: now.Add(-220 * time.Minute)},
				{ID: "ev-fin-2", MatchID: "match-epl-04", Type: models.EventGoal, Minute: 51, TeamSide: "HOME", PlayerName: "Darwin Núñez", Detail: "Header from corner", CreatedAt: now.Add(-190 * time.Minute)},
				{ID: "ev-fin-3", MatchID: "match-epl-04", Type: models.EventGoal, Minute: 72, TeamSide: "AWAY", PlayerName: "Cole Palmer", Detail: "Penalty", CreatedAt: now.Add(-170 * time.Minute)},
				{ID: "ev-fin-4", MatchID: "match-epl-04", Type: models.EventGoal, Minute: 88, TeamSide: "HOME", PlayerName: "Luis Díaz", Detail: "Counter attack volley", CreatedAt: now.Add(-150 * time.Minute)},
			},
		},
		// 9. Live PGA Tour Golf Match (Scottie Scheffler vs Rory McIlroy)
		{
			ID:    "match-pga-01",
			Sport: models.SportGolf,
			League: models.League{
				ID: "pga-tour", Name: "PGA Tour Championship", Sport: models.SportGolf, Country: "USA",
			},
			HomeTeam: models.Team{ID: "sch", Name: "Scottie Scheffler", ShortName: "SCH", Logo: "https://a.espncdn.com/combiner/i?img=/i/headshots/golf/players/full/9478.png&w=350&h=254", Country: "USA"},
			AwayTeam: models.Team{ID: "mci-golf", Name: "Rory McIlroy", ShortName: "RORY", Logo: "https://a.espncdn.com/combiner/i?img=/i/headshots/golf/players/full/3470.png&w=350&h=254", Country: "NIR"},
			HomeScore: 16,
			AwayScore: 14,
			PeriodScores: []string{"SCH: -16 (Thru 16)", "RORY: -14 (Thru 15)"},
			Status:    models.StatusLive,
			Period:    "Final Round",
			Minute:    16,
			StartTime: now.Add(-180 * time.Minute),
			Venue:     "East Lake Golf Club, Atlanta, GA",
			HasLiveAudio: true,
			Stats: models.MatchStats{
				PossessionHome: 52, PossessionAway: 48,
				AttackingPressure: "HOME",
			},
			Events: []models.MatchEvent{
				{ID: "ev-golf-1", MatchID: "match-pga-01", Type: models.EventPoint, Minute: 14, TeamSide: "HOME", PlayerName: "Scottie Scheffler", Detail: "Birdie on Hole 14 (Par 4, 12ft putt)", CreatedAt: now.Add(-25 * time.Minute)},
				{ID: "ev-golf-2", MatchID: "match-pga-01", Type: models.EventPoint, Minute: 15, TeamSide: "AWAY", PlayerName: "Rory McIlroy", Detail: "Eagle on Hole 15 (Par 5, 28ft putt)", CreatedAt: now.Add(-10 * time.Minute)},
			},
			Odds: &models.MatchOdds{
				MatchID: "match-pga-01",
				Consensus: models.BookmakerOdds{
					BookmakerKey: "consensus", BookmakerTitle: "Market Consensus", LastUpdate: now,
					HomeWin: 1.40, AwayWin: 2.95,
				},
			},
		},
		// 10. Scheduled The Masters Golf Matchup (Jon Rahm vs Xander Schauffele)
		{
			ID:    "match-pga-02",
			Sport: models.SportGolf,
			League: models.League{
				ID: "pga-tour", Name: "The Masters Tournament", Sport: models.SportGolf, Country: "USA",
			},
			HomeTeam: models.Team{ID: "rahm", Name: "Jon Rahm", ShortName: "RAHM", Logo: "https://a.espncdn.com/combiner/i?img=/i/headshots/golf/players/full/9780.png&w=350&h=254", Country: "ESP"},
			AwayTeam: models.Team{ID: "scha", Name: "Xander Schauffele", ShortName: "XAN", Logo: "https://a.espncdn.com/combiner/i?img=/i/headshots/golf/players/full/10140.png&w=350&h=254", Country: "USA"},
			HomeScore: 0,
			AwayScore: 0,
			Status:    models.StatusScheduled,
			Period:    "Round 1",
			Minute:    0,
			StartTime: now.Add(4 * time.Hour),
			Venue:     "Augusta National Golf Club, GA",
			Odds: &models.MatchOdds{
				MatchID: "match-pga-02",
				Consensus: models.BookmakerOdds{
					BookmakerKey: "consensus", BookmakerTitle: "Market Consensus", LastUpdate: now,
					HomeWin: 1.95, AwayWin: 1.85,
				},
			},
		},
	}
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
			AuthorAvatar:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
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
			AuthorAvatar:"https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80",
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
			AuthorAvatar:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
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

	return nil
}
