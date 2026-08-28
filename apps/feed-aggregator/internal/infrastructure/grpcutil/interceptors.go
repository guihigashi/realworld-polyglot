package grpcutil

import (
	"context"
	"uuid"

	"github.com/guihigashi/conduit/feed/internal/appctx"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

const RequestorIdHeader = "x-requestor-id"

func RequestorIdServerInterceptor() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (resp any, err error) {
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			return nil, status.Error(codes.Unauthenticated, "metadata is not provided")
		}

		values := md.Get(RequestorIdHeader)
		if len(values) == 0 {
			return nil, status.Errorf(codes.Unauthenticated, "%s is missing", RequestorIdHeader)
		}

		requestorId, err := uuid.Parse(values[0])
		if err != nil {
			return nil, status.Errorf(codes.Unauthenticated, "%s is not a valid UUID", RequestorIdHeader)
		}

		newCtx := appctx.WithRequestorId(ctx, requestorId)

		return handler(newCtx, req)
	}
}

func RequestorIDClientInterceptor() grpc.UnaryClientInterceptor {
	return func(ctx context.Context, method string, req, reply any, cc *grpc.ClientConn, invoker grpc.UnaryInvoker, opts ...grpc.CallOption) error {
		if id, ok := appctx.RequestorIdFromContext(ctx); ok {
			ctx = metadata.AppendToOutgoingContext(ctx, RequestorIdHeader, id.String())
		}
		return invoker(ctx, method, req, reply, cc, opts...)
	}
}
