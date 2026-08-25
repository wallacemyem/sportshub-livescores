package ingestion

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/sports/livescores/internal/cache"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/models"
)

type Simulator struct {
	store *database.Store
	redis *cache.RedisService
	rnd   *rand.Rand
}

func NewSimulator(store *database.Store, redis *cache.RedisService) *Simulator {
	return &Simulator{
		store: store,
		redis: redis,
		rnd:   rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// TickLiveMatches performs one simulation step across all LIVE matches
func (s *Simulator) TickLiveMatches(ctx context.Context) {
	liveMatches := s.store.GetAllMatches("", models.StatusLive)

	for _, m := range liveMatches {
		matchCopy := m

		// Advance clock
		matchCopy.Minute++
		if matchCopy.Minute > 90 && matchCopy.Sport == models.SportSoccer {
			if matchCopy.Minute > 95 {
				matchCopy.Status = models.StatusFinished
				matchCopy.Period = "FT"
			}
		}

		// Update 2D pitch / court ball position
		matchCopy.Stats.BallPositionX = float64(s.rnd.Intn(90) + 5)
		matchCopy.Stats.BallPositionY = float64(s.rnd.Intn(80) + 10)

		if matchCopy.Stats.BallPositionX > 60 {
			matchCopy.Stats.AttackingPressure = "HOME"
		} else if matchCopy.Stats.BallPositionX < 40 {
			matchCopy.Stats.AttackingPressure = "AWAY"
		} else {
			matchCopy.Stats.AttackingPressure = "NEUTRAL"
		}

		// Random chance of goal / point / card
		eventRoll := s.rnd.Intn(100)
		var newEvent *models.MatchEvent

		if matchCopy.Sport == models.SportSoccer {
			if eventRoll < 4 { // ~4% chance of goal per tick
				side := "HOME"
				player := matchCopy.HomeTeam.Name + " Forward"
				assist := matchCopy.HomeTeam.Name + " Playmaker"
				if s.rnd.Intn(2) == 1 {
					side = "AWAY"
					player = matchCopy.AwayTeam.Name + " Striker"
					assist = matchCopy.AwayTeam.Name + " Winger"
					matchCopy.AwayScore++
				} else {
					matchCopy.HomeScore++
				}

				newEvent = &models.MatchEvent{
					ID:         "ev-" + uuid.New().String()[:8],
					MatchID:    matchCopy.ID,
					Type:       models.EventGoal,
					Minute:     matchCopy.Minute,
					TeamSide:   side,
					PlayerName: player,
					AssistName: assist,
					Detail:     "Clinical finish from inside the box!",
					CreatedAt:  time.Now(),
				}
				s.store.AddMatchEvent(*newEvent)
			} else if eventRoll == 15 || eventRoll == 16 {
				// Yellow card
				side := "HOME"
				if s.rnd.Intn(2) == 1 {
					side = "AWAY"
				}
				newEvent = &models.MatchEvent{
					ID:         "ev-" + uuid.New().String()[:8],
					MatchID:    matchCopy.ID,
					Type:       models.EventYellowCard,
					Minute:     matchCopy.Minute,
					TeamSide:   side,
					PlayerName: "Defender",
					Detail:     "Tactical foul to break up counter",
					CreatedAt:  time.Now(),
				}
				s.store.AddMatchEvent(*newEvent)
			}
		} else if matchCopy.Sport == models.SportBasketball {
			// Basketball score increment
			if eventRoll < 60 {
				pts := 2
				if s.rnd.Intn(3) == 0 {
					pts = 3
				}
				if s.rnd.Intn(2) == 0 {
					matchCopy.HomeScore += pts
				} else {
					matchCopy.AwayScore += pts
				}
			}
		}

		// Save updated match state
		s.store.SaveMatch(&matchCopy)
		_ = s.redis.SetLiveMatchState(ctx, &matchCopy)

		// Publish delta
		min := matchCopy.Minute
		delta := &models.LiveDelta{
			Type:      models.DeltaClockTick,
			MatchID:   matchCopy.ID,
			Sport:     matchCopy.Sport,
			HomeScore: &matchCopy.HomeScore,
			AwayScore: &matchCopy.AwayScore,
			Period:    matchCopy.Period,
			Minute:    &min,
			Status:    matchCopy.Status,
			Stats:     &matchCopy.Stats,
			Event:     newEvent,
			Timestamp: time.Now().UnixMilli(),
		}

		if newEvent != nil && newEvent.Type == models.EventGoal {
			delta.Type = models.DeltaScoreUpdate
		}

		_ = s.redis.PublishDelta(ctx, matchCopy.ID, matchCopy.League.ID, delta)
	}
}

// TriggerSimulatedGoal manually triggers a goal on a specific match from the Admin Panel
func (s *Simulator) TriggerSimulatedGoal(ctx context.Context, matchID, teamSide, player string) (*models.Match, *models.MatchEvent, error) {
	match, ok := s.store.GetMatchByID(matchID)
	if !ok {
		return nil, nil, fmt.Errorf("match not found: %s", matchID)
	}

	if teamSide == "HOME" {
		match.HomeScore++
		if player == "" {
			player = match.HomeTeam.Name + " Star Player"
		}
	} else {
		match.AwayScore++
		if player == "" {
			player = match.AwayTeam.Name + " Star Player"
		}
	}

	event := models.MatchEvent{
		ID:         "ev-manual-" + uuid.New().String()[:8],
		MatchID:    match.ID,
		Type:       models.EventGoal,
		Minute:     match.Minute,
		TeamSide:   teamSide,
		PlayerName: player,
		Detail:     "Stunning top corner goal! (Admin Triggered)",
		CreatedAt:  time.Now(),
	}

	s.store.AddMatchEvent(event)
	s.store.SaveMatch(match)
	_ = s.redis.SetLiveMatchState(ctx, match)

	min := match.Minute
	delta := &models.LiveDelta{
		Type:      models.DeltaScoreUpdate,
		MatchID:   match.ID,
		Sport:     match.Sport,
		HomeScore: &match.HomeScore,
		AwayScore: &match.AwayScore,
		Period:    match.Period,
		Minute:    &min,
		Status:    match.Status,
		Event:     &event,
		Stats:     &match.Stats,
		Timestamp: time.Now().UnixMilli(),
	}

	_ = s.redis.PublishDelta(ctx, match.ID, match.League.ID, delta)
	return match, &event, nil
}
