package appctx

import (
	"context"
	"uuid"
)

type requestorIdKey struct{}

func WithRequestorId(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, requestorIdKey{}, id)
}

func RequestorIdFromContext(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(requestorIdKey{}).(uuid.UUID)
	return id, ok
}
