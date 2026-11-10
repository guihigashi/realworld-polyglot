package hub

import "uuid"

type Client struct {
	ID       string
	UserId   uuid.UUID
	Username string
	Send     chan []byte
}

func NewClient(id string, userID uuid.UUID, username string) *Client {
	return &Client{
		ID:       id,
		UserId:   userID,
		Username: username,
		Send:     make(chan []byte, 64),
	}
}

func (c *Client) IsAuthenticated() bool {
	return c.UserId != uuid.Nil()
}
