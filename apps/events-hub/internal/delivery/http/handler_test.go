package http_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	deliveryHttp "github.com/guihigashi/conduit/events-hub/internal/delivery/http"
	"github.com/guihigashi/conduit/events-hub/internal/hub"
	"github.com/guihigashi/conduit/events-hub/internal/infrastructure/auth"
	"go.jetify.com/sse"
)

func TestServer_NilValidatorPanics(t *testing.T) {
	h := hub.NewHub()
	defer func() {
		if r := recover(); r == nil {
			t.Fatal("expected NewServer to panic when validator is nil")
		}
	}()
	deliveryHttp.NewServer(h, nil)
}

func TestServer_HealthEndpoint(t *testing.T) {
	h := hub.NewHub()
	v := auth.NewValidator("test-secret")
	srv := deliveryHttp.NewServer(h, v)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
}

func TestServer_EventsConnectAndReceive(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	h := hub.NewHub()
	go h.Run(ctx)

	v := auth.NewValidator("test-secret")
	srv := deliveryHttp.NewServer(h, v)
	server := httptest.NewServer(srv.Router())
	defer server.Close()

	clientReq, err := http.NewRequestWithContext(ctx, http.MethodGet, server.URL+"/events", nil)
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}

	resp, err := http.DefaultClient.Do(clientReq)
	if err != nil {
		t.Fatalf("failed to connect: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	contentType := resp.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "text/event-stream") {
		t.Fatalf("expected text/event-stream prefix, got %q", contentType)
	}

	decoder := sse.NewDecoder(resp.Body)

	// Verify initial 'connected' event
	var connectedEvent sse.Event
	if err := decoder.Decode(&connectedEvent); err != nil {
		t.Fatalf("failed to decode connected event: %v", err)
	}
	if connectedEvent.Event != "connected" {
		t.Fatalf("expected event type 'connected', got %q", connectedEvent.Event)
	}

	// Broadcast an invalidation event through the hub
	_ = h.BroadcastEvent(hub.InvalidationEvent{
		Type:      "article.created",
		Resource:  "articles",
		Slug:      "test-slug",
		Timestamp: time.Now(),
	})

	// Verify receiving 'invalidation' event
	var invalidationEvent sse.Event
	if err := decoder.Decode(&invalidationEvent); err != nil {
		t.Fatalf("failed to decode invalidation event: %v", err)
	}
	if invalidationEvent.Event != "invalidation" {
		t.Fatalf("expected event type 'invalidation', got %q", invalidationEvent.Event)
	}
	dataMap, ok := invalidationEvent.Data.(map[string]any)
	if !ok {
		t.Fatalf("expected map[string]any data payload, got %T", invalidationEvent.Data)
	}
	if dataMap["slug"] != "test-slug" {
		t.Fatalf("expected slug 'test-slug', got %v", dataMap["slug"])
	}
}
