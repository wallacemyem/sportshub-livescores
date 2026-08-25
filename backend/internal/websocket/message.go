package websocket

type ClientAction string

const (
	ActionSubscribe   ClientAction = "SUBSCRIBE"
	ActionUnsubscribe ClientAction = "UNSUBSCRIBE"
	ActionPing        ClientAction = "PING"
)

type ClientMessage struct {
	Action  ClientAction `json:"action"`
	Topic   string       `json:"topic"` // e.g. "match:match-epl-01", "league:premier-league", "all_live"
	MatchID string       `json:"match_id,omitempty"`
}

type ServerMessage struct {
	Type      string      `json:"type"` // "CONNECTED", "PONG", "DELTA", "ERROR"
	Topic     string      `json:"topic,omitempty"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp int64       `json:"timestamp"`
}
