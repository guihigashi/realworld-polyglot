package usecase

import (
	"context"
	"uuid"

	"github.com/guihigashi/conduit/feed/internal/domain"
)

type Social interface {
	GetFollowing()
}
type Articles interface {
	ListArticles()
}

type GenerateFeed struct {
	Social   Social
	Articles Articles
}

func (f *GenerateFeed) Execute(ctx context.Context, userID uuid.UUID, offset, limit int) (*domain.Feed, error) {
	panic("implement me")
}
