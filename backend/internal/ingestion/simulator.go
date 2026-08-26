package ingestion

import (
	"context"
	"fmt"
	"math/rand"
	"strconv"
	"strings"
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

		// Advance the clock in the convention of the sport. A single
		// `Minute++` for everything is what used to push basketball past 48
		// and tennis past 112 as if both were 90-minute soccer matches.
		advanceClock(&matchCopy)

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
			Period:       matchCopy.Period,
			Minute:       &min,
			DisplayClock: matchCopy.DisplayClock,
			PeriodNumber: &matchCopy.PeriodNumber,
			ClockSeconds: &matchCopy.ClockSeconds,
			Status:       matchCopy.Status,
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
		Period:       match.Period,
		Minute:       &min,
		DisplayClock: match.DisplayClock,
		PeriodNumber: &match.PeriodNumber,
		ClockSeconds: &match.ClockSeconds,
		Status:       match.Status,
		Event:     &event,
		Stats:     &match.Stats,
		Timestamp: time.Now().UnixMilli(),
	}

	_ = s.redis.PublishDelta(ctx, match.ID, match.League.ID, delta)
	return match, &event, nil
}

// Regulation shape of each timed sport, used by the simulator's clock.
const (
	soccerHalfMinutes    = 45
	basketballQuarterSec = 12 * 60
	nflQuarterSec        = 15 * 60
	basketballQuarters   = 4
	nflQuarters          = 4
	tennisMaxSets        = 5
	baseballInnings      = 9
	cricketOversPerInns  = 20
)

// advanceClock moves one match forward by a single simulation tick, following
// the timing convention of its sport:
//
//	soccer      minute counts UP through two 45-minute halves plus stoppage
//	basketball  seconds count DOWN through four 12-minute quarters
//	nfl         seconds count DOWN through four 15-minute quarters
//	tennis      no clock; progress is sets
//	cricket     no clock; progress is overs, rendered as "12.3"
//	baseball    no clock; progress is innings, alternating top and bottom
//	golf        no clock; progress is rounds
func advanceClock(m *models.Match) {
	switch m.Sport {

	case models.SportSoccer:
		m.Minute++
		m.ClockSeconds = 0
		if m.Minute <= soccerHalfMinutes {
			m.PeriodNumber = 1
			m.Period = "1H"
			m.DisplayClock = fmt.Sprintf("%d'", m.Minute)
		} else if m.Minute <= soccerHalfMinutes*2 {
			m.PeriodNumber = 2
			m.Period = "2H"
			m.DisplayClock = fmt.Sprintf("%d'", m.Minute)
		} else {
			// Past 90: show stoppage as 90+n, and end the match a few on.
			extra := m.Minute - soccerHalfMinutes*2
			m.PeriodNumber = 2
			m.Period = "2H"
			m.DisplayClock = fmt.Sprintf("90+%d", extra)
			if extra > 5 {
				m.Status = models.StatusFinished
				m.Period = "FT"
				m.DisplayClock = ""
			}
		}

	case models.SportBasketball, models.SportNFL:
		quarterSec := basketballQuarterSec
		quarters := basketballQuarters
		if m.Sport == models.SportNFL {
			quarterSec = nflQuarterSec
			quarters = nflQuarters
		}
		if m.PeriodNumber == 0 {
			m.PeriodNumber = 1
		}
		if m.ClockSeconds <= 0 {
			m.ClockSeconds = quarterSec
		}

		// One tick burns a slice of game clock rather than a whole minute.
		m.ClockSeconds -= 24
		if m.ClockSeconds <= 0 {
			if m.PeriodNumber >= quarters {
				m.Status = models.StatusFinished
				m.Period = "Final"
				m.ClockSeconds = 0
				m.DisplayClock = ""
				m.Minute = 0
				return
			}
			m.PeriodNumber++
			m.ClockSeconds = quarterSec
		}

		m.Period = fmt.Sprintf("Q%d", m.PeriodNumber)
		m.DisplayClock = fmt.Sprintf("%d:%02d", m.ClockSeconds/60, m.ClockSeconds%60)
		m.Minute = 0 // no elapsed-minute reading for a countdown sport

	case models.SportTennis:
		m.Minute = 0
		m.ClockSeconds = 0
		m.DisplayClock = ""
		if m.PeriodNumber == 0 {
			m.PeriodNumber = 1
		}
		// A set changes hands when the set score moves; the score updates
		// elsewhere, so only clamp the ceiling here.
		if m.PeriodNumber > tennisMaxSets {
			m.PeriodNumber = tennisMaxSets
		}
		m.Period = fmt.Sprintf("Set %d", m.PeriodNumber)

	case models.SportCricket:
		m.Minute = 0
		m.ClockSeconds = 0
		if m.PeriodNumber == 0 {
			m.PeriodNumber = 1
		}
		// Overs are "o.b": six balls to an over.
		overs, balls := parseOvers(m.DisplayClock)
		balls++
		if balls > 5 {
			balls = 0
			overs++
		}
		if overs >= cricketOversPerInns {
			if m.PeriodNumber >= 2 {
				m.Status = models.StatusFinished
				m.Period = "Result"
				m.DisplayClock = ""
				return
			}
			m.PeriodNumber++
			overs, balls = 0, 0
		}
		m.DisplayClock = fmt.Sprintf("%d.%d", overs, balls)
		m.Period = fmt.Sprintf("Innings %d", m.PeriodNumber)

	case models.SportBaseball:
		m.Minute = 0
		m.ClockSeconds = 0
		m.DisplayClock = ""
		if m.PeriodNumber == 0 {
			m.PeriodNumber = 1
			m.Period = "Top 1"
			return
		}
		// Alternate top and bottom, advancing the innings after the bottom.
		if strings.HasPrefix(strings.ToLower(m.Period), "top") {
			m.Period = fmt.Sprintf("Bot %d", m.PeriodNumber)
		} else {
			if m.PeriodNumber >= baseballInnings {
				m.Status = models.StatusFinished
				m.Period = "Final"
				return
			}
			m.PeriodNumber++
			m.Period = fmt.Sprintf("Top %d", m.PeriodNumber)
		}

	case models.SportGolf:
		m.Minute = 0
		m.ClockSeconds = 0
		m.DisplayClock = ""
		if m.PeriodNumber == 0 {
			m.PeriodNumber = 1
		}
		m.Period = fmt.Sprintf("Round %d", m.PeriodNumber)

	default:
		m.Minute++
	}
}

// parseOvers reads "12.3" into (12, 3). Anything unparseable starts at 0.0.
func parseOvers(display string) (int, int) {
	parts := strings.SplitN(strings.TrimSpace(display), ".", 2)
	if len(parts) == 0 || parts[0] == "" {
		return 0, 0
	}
	overs, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0
	}
	balls := 0
	if len(parts) == 2 {
		if b, err := strconv.Atoi(parts[1]); err == nil {
			balls = b
		}
	}
	return overs, balls
}
