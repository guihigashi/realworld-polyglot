GATEWAY_DIR := ./apps/gateway
GRPC_PHP_PLUGIN := $(shell which grpc_php_plugin)

generate-php:
	protoc \
		--proto_path=./apps/social-graph/src/main/protobuf \
		--proto_path=./apps/feed-aggregator/api/v1 \
		--proto_path=./apps/article-service/src/main/proto \
		--php_out=$(GATEWAY_DIR) \
		--grpc_out=$(GATEWAY_DIR) \
		--plugin=protoc-gen-grpc=$(GRPC_PHP_PLUGIN) \
		./apps/social-graph/src/main/protobuf/*.proto \
		./apps/feed-aggregator/api/v1/*.proto \
		./apps/article-service/src/main/proto/*.proto
generate-go:
	@mkdir -p apps/feed-aggregator/internal/protov1
	protoc \
		--proto_path=./apps/feed-aggregator/api/v1 \
		--go_out=./apps/feed-aggregator/internal/protov1 --go_opt=paths=source_relative \
		--go-grpc_out=./apps/feed-aggregator/internal/protov1 --go-grpc_opt=paths=source_relative \
		feed.proto