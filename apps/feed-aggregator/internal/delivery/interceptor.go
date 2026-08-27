package delivery

import (
	"context"
	"uuid"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

type requestorIdKey struct{}

func WithRequestorId(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, requestorIdKey{}, id)
}

func RequestorIdFromContext(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(requestorIdKey{}).(uuid.UUID)
	return id, ok
}

func RequestorIdInterceptor() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (resp any, err error) {
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			return nil, status.Error(codes.Unauthenticated, "metadata is not provided")
		}

		values := md.Get("x-requestor-id")
		if len(values) == 0 {
			return nil, status.Error(codes.Unauthenticated, "x-requestor-id is missing")
		}

		requestorId, err := uuid.Parse(values[0])
		if err != nil {
			return nil, status.Error(codes.Unauthenticated, "x-requestor-id is not a valid UUID")
		}

		newCtx := WithRequestorId(ctx, requestorId)

		return handler(newCtx, req)
	}
}
