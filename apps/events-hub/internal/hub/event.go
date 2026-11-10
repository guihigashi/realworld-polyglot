package hub

import (
	"time"
	"uuid"
)

type InvalidationEvent struct {
	Type        string    `json:"type"`
	Resource    string    `json:"resource"`
	Slug        string    `json:"slug,omitempty"`
	RecipientId uuid.UUID `json:"recipientId,omitzero"`
	Timestamp   time.Time `json:"timestamp"`
}
