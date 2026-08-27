package push

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/models"
)

// PushService manages Web Push subscriptions, channel routing, and live broadcast dispatching
type PushService struct {
	store      *database.Store
	vapid      *VAPIDKeys
	mu         sync.RWMutex
	broadcasts []*models.BroadcastLog
}

// NewPushService initializes VAPID keys and creates the push dispatcher
func NewPushService(store *database.Store, envPub, envPriv, envContact string) *PushService {
	var keys *VAPIDKeys
	var err error

	if envPub != "" && envPriv != "" {
		keys, err = LoadVAPIDKeys(envPub, envPriv, envContact)
		if err != nil {
			log.Printf("[PUSH WARNING] Failed to load provided VAPID keys: %v. Generating new ephemeral keys.", err)
		} else {
			log.Printf("[PUSH] Successfully loaded VAPID public key: %s...", envPub[:12])
		}
	}

	if keys == nil {
		// Try to load persisted keys or generate a persistent deterministic pair
		defaultPub := os.Getenv("VAPID_PUBLIC_KEY")
		defaultPriv := os.Getenv("VAPID_PRIVATE_KEY")
		if defaultPub != "" && defaultPriv != "" {
			keys, _ = LoadVAPIDKeys(defaultPub, defaultPriv, envContact)
		}
		if keys == nil {
			keys, err = GenerateVAPIDKeys(envContact)
			if err != nil {
				log.Printf("[PUSH ERROR] Failed to generate VAPID keys: %v", err)
			} else {
				log.Printf("[PUSH] Generated active VAPID Public Key: %s", keys.PublicB64)
			}
		}
	}

	return &PushService{
		store:      store,
		vapid:      keys,
		broadcasts: make([]*models.BroadcastLog, 0),
	}
}

// GetVAPIDPublicKey returns the active public VAPID key in base64url format for clients
func (s *PushService) GetVAPIDPublicKey() string {
	if s.vapid == nil {
		return ""
	}
	return s.vapid.PublicB64
}

// RegisterSubscription stores or updates a device subscription with channels and user binding
func (s *PushService) RegisterSubscription(sub *models.PushSubscription) error {
	if sub.Endpoint == "" || sub.P256dh == "" || sub.Auth == "" {
		return fmt.Errorf("invalid subscription: missing endpoint, p256dh or auth key")
	}

	if sub.ID == "" {
		sub.ID = "sub_" + uuid.New().String()[:12]
	}
	if len(sub.Channels) == 0 {
		sub.Channels = []string{"all", "live_matches", "goal_alerts"}
	}
	if sub.DeviceType == "" {
		sub.DeviceType = "desktop"
	}
	sub.IsActive = true
	now := time.Now()
	if sub.CreatedAt.IsZero() {
		sub.CreatedAt = now
	}
	sub.UpdatedAt = now
	sub.LastSeenAt = now

	s.store.SavePushSubscription(sub)
	log.Printf("[PUSH] Registered subscription %s (%s, channels: %v)", sub.ID, sub.DeviceType, sub.Channels)
	return nil
}

// UnregisterSubscription marks a subscription as deactivated
func (s *PushService) UnregisterSubscription(endpoint string) error {
	if endpoint == "" {
		return fmt.Errorf("empty endpoint")
	}
	s.store.DeactivatePushSubscription(endpoint)
	log.Printf("[PUSH] Deactivated subscription for endpoint: %s", endpoint)
	return nil
}

// SendPush sends a Web Push notification to a single subscriber
func (s *PushService) SendPush(sub *models.PushSubscription, payload *models.PushNotificationPayload) error {
	if !sub.IsActive {
		return nil
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal push payload: %w", err)
	}

	urgency := "high"
	if payload.Silent {
		urgency = "normal"
	}

	err = SendWebPush(sub.Endpoint, sub.P256dh, sub.Auth, payloadBytes, s.vapid, 120, urgency)
	if err != nil {
		if err == ErrSubscriptionExpired {
			log.Printf("[PUSH] Subscription %s expired or unsubscribed on browser. Deactivating.", sub.ID)
			s.store.DeactivatePushSubscription(sub.Endpoint)
		}
		return err
	}

	return nil
}

// BroadcastToChannel sends a push notification to all subscribers of a specified channel
func (s *PushService) BroadcastToChannel(channel string, payload *models.PushNotificationPayload) (int, int, error) {
	if s.vapid == nil {
		return 0, 0, fmt.Errorf("vapid keys not initialized")
	}

	subs := s.store.GetActivePushSubscriptions(channel)
	if len(subs) == 0 {
		return 0, 0, nil
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return 0, 0, fmt.Errorf("marshal payload error: %w", err)
	}

	var sentCount, failedCount int
	var mu sync.Mutex
	var wg sync.WaitGroup

	// Concurrency limiter for push dispatch
	sem := make(chan struct{}, 25)

	for _, sub := range subs {
		wg.Add(1)
		sem <- struct{}{}

		go func(subItem *models.PushSubscription) {
			defer wg.Done()
			defer func() { <-sem }()

			urgency := "high"
			if payload.Silent {
				urgency = "normal"
			}

			pushErr := SendWebPush(subItem.Endpoint, subItem.P256dh, subItem.Auth, payloadBytes, s.vapid, 120, urgency)
			mu.Lock()
			if pushErr != nil {
				failedCount++
				if pushErr == ErrSubscriptionExpired {
					s.store.DeactivatePushSubscription(subItem.Endpoint)
				}
			} else {
				sentCount++
			}
			mu.Unlock()
		}(sub)
	}

	wg.Wait()

	// Log broadcast
	logEntry := &models.BroadcastLog{
		ID:          "bc_" + uuid.New().String()[:12],
		Channel:     channel,
		Title:       payload.Title,
		Body:        payload.Body,
		URL:         payload.URL,
		SentCount:   sentCount,
		FailedCount: failedCount,
		SentAt:      time.Now(),
	}

	s.mu.Lock()
	s.broadcasts = append([]*models.BroadcastLog{logEntry}, s.broadcasts...)
	if len(s.broadcasts) > 50 {
		s.broadcasts = s.broadcasts[:50]
	}
	s.mu.Unlock()

	s.store.SaveBroadcastLog(logEntry)

	log.Printf("[PUSH BROADCAST] Channel '%s' -> Sent: %d, Failed: %d (Title: %s)", channel, sentCount, failedCount, payload.Title)
	return sentCount, failedCount, nil
}

// BroadcastToAll sends to all active subscriptions
func (s *PushService) BroadcastToAll(payload *models.PushNotificationPayload) (int, int, error) {
	return s.BroadcastToChannel("all", payload)
}

// NotifyMatchScore formats and broadcasts a live score change to relevant channels
func (s *PushService) NotifyMatchScore(match *models.Match, scoringSide string, detail string) {
	if match == nil {
		return
	}

	var scorer string
	if scoringSide == "HOME" {
		scorer = match.HomeTeam.Name
	} else if scoringSide == "AWAY" {
		scorer = match.AwayTeam.Name
	} else {
		scorer = "Score Update"
	}

	sportEmoji := "⚽"
	scoreNoun := "GOAL"
	switch strings.ToLower(string(match.Sport)) {
	case "basketball":
		sportEmoji = "🏀"
		scoreNoun = "BASKET"
	case "tennis":
		sportEmoji = "🎾"
		scoreNoun = "POINT"
	case "american-football", "football":
		sportEmoji = "🏈"
		scoreNoun = "TOUCHDOWN"
	case "hockey", "ice-hockey":
		sportEmoji = "🏒"
		scoreNoun = "GOAL"
	case "baseball":
		sportEmoji = "⚾"
		scoreNoun = "RUN"
	case "cricket":
		sportEmoji = "🏏"
		scoreNoun = "WICKET"
	}

	title := fmt.Sprintf("%s %s! %s", sportEmoji, scoreNoun, scorer)
	body := fmt.Sprintf("%s %d - %d %s", match.HomeTeam.Name, match.HomeScore, match.AwayScore, match.AwayTeam.Name)
	if match.Minute > 0 {
		body += fmt.Sprintf(" · %d'", match.Minute)
	}
	if detail != "" {
		body += fmt.Sprintf(" (%s)", detail)
	}

	payload := &models.PushNotificationPayload{
		Title:              title,
		Body:               body,
		Icon:               match.HomeTeam.Logo,
		Badge:              "/icons/badge-72.png",
		Tag:                fmt.Sprintf("sr-live-%s", match.ID),
		URL:                fmt.Sprintf("/match/%s", match.ID),
		MatchID:            match.ID,
		Sport:              string(match.Sport),
		Type:               "goal",
		Silent:             false,
		Renotify:           true,
		RequireInteraction: true,
		Vibrate:            []int{200, 100, 200},
		Data: map[string]interface{}{
			"match_id":   match.ID,
			"sport":      match.Sport,
			"home_score": match.HomeScore,
			"away_score": match.AwayScore,
			"minute":     match.Minute,
			"url":        fmt.Sprintf("/match/%s", match.ID),
		},
	}

	// Dispatch push notification ONLY to subscribers who added this match (via betslip or match channel)
	go func() {
		subs := s.store.GetActiveSubscriptionsForMatch(match.ID)
		if len(subs) == 0 {
			return
		}

		payloadBytes, err := json.Marshal(payload)
		if err != nil {
			return
		}

		for _, subItem := range subs {
			_ = SendWebPush(subItem.Endpoint, subItem.P256dh, subItem.Auth, payloadBytes, s.vapid, 120, "high")
		}
		log.Printf("[PUSH] Dispatched live match alert for match %s (%s) to %d subscriber(s) tracking this game", match.ID, match.HomeTeam.Name+" v "+match.AwayTeam.Name, len(subs))
	}()
}

// GetStats compiles current subscriber channels and telemetry
func (s *PushService) GetStats() *models.NotificationStats {
	stats := s.store.GetPushSubscriptionStats()
	if stats == nil {
		stats = &models.NotificationStats{}
	}

	s.mu.RLock()
	stats.RecentBroadcasts = make([]models.BroadcastLog, len(s.broadcasts))
	for i, bc := range s.broadcasts {
		stats.RecentBroadcasts[i] = *bc
	}
	s.mu.RUnlock()

	return stats
}

// SendTestPush sends a test alert to verify a user's subscription
func (s *PushService) SendTestPush(sub *models.PushSubscription) error {
	payload := &models.PushNotificationPayload{
		Title:              "⚡ SlipRadar Push Connected!",
		Body:               "Live match scores and instant goal alerts are active on this device.",
		Icon:               "/icons/icon-192.png",
		Badge:              "/icons/badge-72.png",
		Tag:                "sr-test-alert",
		URL:                "/live",
		Type:               "test",
		Silent:             false,
		Renotify:           true,
		RequireInteraction: false,
		Vibrate:            []int{100, 50, 100},
		Data: map[string]interface{}{
			"test": true,
			"time": time.Now().Format(time.RFC3339),
		},
	}

	return s.SendPush(sub, payload)
}
