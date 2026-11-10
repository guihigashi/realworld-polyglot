package hub_test

import (
	"testing"
	"time"
	"uuid"

	"github.com/guihigashi/conduit/events-hub/internal/hub"
)

func TestHub_RegisterAndBroadcast(t *testing.T) {
	ctx := t.Context()

	h := hub.NewHub()
	go h.Run(ctx)

	client := hub.NewClient("test-client-1", uuid.Nil(), "")
	h.Register(client)

	if total := h.TotalClients(); total != 1 {
		t.Fatalf("expected 1 client, got %d", total)
	}

	event := hub.InvalidationEvent{
		Type:      "READ_ARTICLE-CREATED",
		Resource:  "articles",
		Slug:      "test-article",
		Timestamp: time.Now(),
	}

	if err := h.BroadcastEvent(event); err != nil {
		t.Fatalf("failed to broadcast event: %v", err)
	}

	select {
	case msg := <-client.Send:
		if len(msg) == 0 {
			t.Fatal("expected non-empty message")
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("timed out waiting for event on client channel")
	}

	h.Unregister(client)
	if total := h.TotalClients(); total != 0 {
		t.Fatalf("expected 0 clients, got %d", total)
	}
}
