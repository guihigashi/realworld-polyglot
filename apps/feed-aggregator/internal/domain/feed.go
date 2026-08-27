package domain

import "time"

type Feed struct {
	Articles      []Article
	ArticlesCount int
}

type Article struct {
	Slug           string
	Title          string
	Description    string
	TagList        []string
	CreatedAt      time.Time
	UpdatedAt      time.Time
	Favorited      bool
	FavoritesCount int
	Author         *Author
}

type Author struct {
	Username  string
	Bio       string
	Image     string
	Following bool
}
