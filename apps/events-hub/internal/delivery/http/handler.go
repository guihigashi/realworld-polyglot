package http

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/guihigashi/conduit/events-hub/internal/hub"
	"github.com/guihigashi/conduit/events-hub/internal/infrastructure/auth"
	"go.jetify.com/sse"
)

type Server struct {
	hub       *hub.Hub
	validator *auth.Validator
	router    *chi.Mux
}

func NewServer(h *hub.Hub, v *auth.Validator) *Server {
	if v == nil {
		panic("auth validator cannot be nil")
	}

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.ClientIPFromHeader("CF-Connecting-IP"))
	r.Use(middleware.Recoverer)

	s := &Server{
		hub:       h,
		validator: v,
		router:    r,
	}

	r.Get("/events", s.handleEvents)
	r.Get("/health", s.handleHealth)

	return s
}

func (s *Server) Router() http.Handler {
	return s.router
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"status":  "ok",
		"clients": s.hub.TotalClients(),
	})
}

func (s *Server) handleEvents(w http.ResponseWriter, r *http.Request) {
	conn, err := sse.Upgrade(r.Context(), w,
		sse.WithHeartbeatInterval(20*time.Second),
		sse.WithHeartbeatComment("ping"),
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	// Optional authentication via query param ?token=
	var claims auth.Claims
	if tokenStr := r.URL.Query().Get("token"); tokenStr != "" {
		if c, err := s.validator.ParseAndValidate(tokenStr); err == nil {
			claims = *c
		}
	}

	clientID := generateID()
	client := hub.NewClient(clientID, claims.Subject, claims.Username)
	s.hub.Register(client)
	defer s.hub.Unregister(client)

	// Send initial connection confirmation
	connData := map[string]any{
		"status":   "connected",
		"clientId": clientID,
	}
	if client.IsAuthenticated() {
		connData["userId"] = client.UserId.String()
		connData["username"] = client.Username
	}

	if err := conn.SendEvent(r.Context(), &sse.Event{
		Event: "connected",
		Data:  connData,
	}); err != nil {
		return
	}

	slog.Info("sse client connected",
		slog.String("client_id", clientID),
		slog.String("user_id", client.UserId.String()),
		slog.String("username", client.Username),
		slog.String("remote_addr", r.RemoteAddr),
	)

	for {
		select {
		case <-r.Context().Done():
			slog.Info("sse client disconnected", slog.String("client_id", clientID))
			return

		case msg, ok := <-client.Send:
			if !ok {
				return
			}
			if err := conn.SendEvent(r.Context(), &sse.Event{
				Event: "invalidation",
				Data:  sse.Raw(msg),
			}); err != nil {
				return
			}
		}
	}
}

func generateID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
