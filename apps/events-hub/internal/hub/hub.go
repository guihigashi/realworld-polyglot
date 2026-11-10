package hub

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"uuid"
)

type Hub struct {
	mu      sync.RWMutex
	clients map[*Client]bool
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[*Client]bool),
	}
}

func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	h.clients[c] = true
	count := len(h.clients)
	h.mu.Unlock()

	slog.Debug("client registered", slog.String("client_id", c.ID), slog.Int("total_clients", count))
}

func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	if _, ok := h.clients[c]; ok {
		delete(h.clients, c)
		close(c.Send)
	}
	count := len(h.clients)
	h.mu.Unlock()

	slog.Debug("client unregistered", slog.String("client_id", c.ID), slog.Int("total_clients", count))
}

func (h *Hub) BroadcastEvent(event InvalidationEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return err
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		// If event is targeted to a specific user, only send if recipient matches
		if event.RecipientId != uuid.Nil() && client.UserId != event.RecipientId {
			continue
		}

		select {
		case client.Send <- data:
		default:
			slog.Warn("client buffer full, dropping event", slog.String("client_id", client.ID))
		}
	}
	return nil
}

func (h *Hub) BroadcastRaw(data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		select {
		case client.Send <- data:
		default:
			slog.Warn("client buffer full, dropping event", slog.String("client_id", client.ID))
		}
	}
}

func (h *Hub) TotalClients() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

func (h *Hub) Close() {
	h.mu.Lock()
	defer h.mu.Unlock()

	slog.Info("hub closing, disconnecting all clients", slog.Int("total_clients", len(h.clients)))
	for client := range h.clients {
		close(client.Send)
		delete(h.clients, client)
	}
}

// Run blocks until the context is canceled, then cleanly closes all connections.
func (h *Hub) Run(ctx context.Context) {
	slog.Info("hub started")
	<-ctx.Done()
	h.Close()
	slog.Info("hub stopped")
}
