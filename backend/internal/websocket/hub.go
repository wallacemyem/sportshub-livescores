package websocket

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/sports/livescores/internal/cache"
	"github.com/sports/livescores/internal/models"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for dev/docker non-standard ports
	},
}

type ClientInfo struct {
	IP          string    `json:"ip"`
	ConnectedAt time.Time `json:"connected_at"`
	Topics      []string  `json:"topics"`
}

type Hub struct {
	clients    map[*Client]bool
	rooms      map[string]map[*Client]bool
	Broadcast  chan []byte
	Register   chan *Client
	Unregister chan *Client
	redis      *cache.RedisService
	mu         sync.RWMutex
}

func NewHub(redis *cache.RedisService) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		rooms:      make(map[string]map[*Client]bool),
		Broadcast:  make(chan []byte, 1024),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		redis:      redis,
	}
}

func (h *Hub) Run(ctx context.Context) {
	log.Printf("[WS HUB] Centralized WebSocket Hub running on port 18443")

	// Subscribe to in-memory/redis all_live channel
	go h.listenRedisPubSub(ctx)

	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

			// Send connected welcome packet
			welcome, _ := json.Marshal(ServerMessage{
				Type:      "CONNECTED",
				Data:      map[string]string{"status": "online", "gateway": "go-websocket-18443"},
				Timestamp: time.Now().UnixMilli(),
			})
			client.Send <- welcome

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
				for topic := range client.Topics {
					if h.rooms[topic] != nil {
						delete(h.rooms[topic], client)
						if len(h.rooms[topic]) == 0 {
							delete(h.rooms, topic)
						}
					}
				}
			}
			h.mu.Unlock()

		case message := <-h.Broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()

		case <-ctx.Done():
			return
		}
	}
}

func (h *Hub) listenRedisPubSub(ctx context.Context) {
	ch := h.redis.SubscribeInMem("channel:all_live")
	for {
		select {
		case payload, ok := <-ch:
			if !ok {
				return
			}
			var delta models.LiveDelta
			if err := json.Unmarshal(payload, &delta); err == nil {
				h.BroadcastDelta(&delta)
			}
		case <-ctx.Done():
			return
		}
	}
}

func (h *Hub) Subscribe(c *Client, topic string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	c.mu.Lock()
	if c.Topics == nil {
		c.Topics = make(map[string]bool)
	}
	c.Topics[topic] = true
	c.mu.Unlock()

	if h.rooms[topic] == nil {
		h.rooms[topic] = make(map[*Client]bool)
	}
	h.rooms[topic][c] = true

	log.Printf("[WS] Client %s subscribed to topic: %s", c.IP, topic)
}

func (h *Hub) Unsubscribe(c *Client, topic string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	c.mu.Lock()
	if c.Topics != nil {
		delete(c.Topics, topic)
	}
	c.mu.Unlock()

	if h.rooms[topic] != nil {
		delete(h.rooms[topic], c)
	}
}

func (h *Hub) BroadcastDelta(delta *models.LiveDelta) {
	msg := ServerMessage{
		Type:      "DELTA",
		Topic:     "match:" + delta.MatchID,
		Data:      delta,
		Timestamp: delta.Timestamp,
	}

	payload, err := json.Marshal(msg)
	if err != nil {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	// Broadcast to clients in specific match room or all_live room
	matchTopic := "match:" + delta.MatchID
	allTopic := "all_live"

	targetClients := make(map[*Client]bool)
	if room := h.rooms[matchTopic]; room != nil {
		for c := range room {
			targetClients[c] = true
		}
	}
	if room := h.rooms[allTopic]; room != nil {
		for c := range room {
			targetClients[c] = true
		}
	}

	for c := range targetClients {
		select {
		case c.Send <- payload:
		default:
		}
	}
}

func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS] Upgrade error: %v", err)
		return
	}

	client := &Client{
		Hub:         h,
		Conn:        conn,
		Send:        make(chan []byte, 256),
		Topics:      make(map[string]bool),
		IP:          r.RemoteAddr,
		ConnectedAt: time.Now(),
	}

	// Auto-subscribe to all_live
	client.Topics["all_live"] = true

	h.Register <- client
	h.Subscribe(client, "all_live")

	go client.WritePump()
	go client.ReadPump()
}

func (h *Hub) GetConnectedCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

func (h *Hub) GetClientList() []ClientInfo {
	h.mu.RLock()
	defer h.mu.RUnlock()

	list := make([]ClientInfo, 0, len(h.clients))
	for c := range h.clients {
		c.mu.RLock()
		topics := make([]string, 0, len(c.Topics))
		for t := range c.Topics {
			topics = append(topics, t)
		}
		c.mu.RUnlock()

		list = append(list, ClientInfo{
			IP:          c.IP,
			ConnectedAt: c.ConnectedAt,
			Topics:      topics,
		})
	}
	return list
}
