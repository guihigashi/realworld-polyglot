package domain

import (
	"time"
	"uuid"
)

type Article struct {
	Id             uuid.UUID
	Slug           string
	Title          string
	Description    string
	TagList        []string
	CreatedAt      time.Time
	UpdatedAt      time.Time
	Favorited      bool
	FavoritesCount int
	AuthorId       uuid.UUID
}

type Profile struct {
	Id        uuid.UUID
	Username  string
	Bio       string
	Image     string
	Following bool
}
