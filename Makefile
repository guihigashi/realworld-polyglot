GATEWAY_DIR := ./apps/gateway
FEED_INTERNAL_DIR := ./apps/feed-aggregator/internal
GRPC_PHP_PLUGIN := $(shell which grpc_php_plugin)

PROTO_INCLUDES := \
	--proto_path=./apps/social-graph/src/main/protobuf \
	--proto_path=./apps/feed-aggregator/protobuf \
	--proto_path=./apps/article-service/src/main/proto

generate-php:
	@rm -rf $(GATEWAY_DIR)/Generated/Grpc
	@mkdir -p $(GATEWAY_DIR)/Generated/Grpc
	protoc $(PROTO_INCLUDES) \
		--php_out=$(GATEWAY_DIR) \
		--grpc_out=$(GATEWAY_DIR) \
		--plugin=protoc-gen-grpc=$(GRPC_PHP_PLUGIN) \
		./apps/social-graph/src/main/protobuf/*.proto \
		./apps/feed-aggregator/protobuf/*.proto \
		./apps/article-service/src/main/proto/*.proto

generate-go:
	@rm -rf $(FEED_INTERNAL_DIR)/pbsocial $(FEED_INTERNAL_DIR)/pbfeed $(FEED_INTERNAL_DIR)/pbarticle
	@mkdir -p $(FEED_INTERNAL_DIR)/pbsocial $(FEED_INTERNAL_DIR)/pbfeed $(FEED_INTERNAL_DIR)/pbarticle

	# Generate Social Graph
	protoc $(PROTO_INCLUDES) \
		--go_out=$(FEED_INTERNAL_DIR)/pbsocial --go_opt=paths=source_relative \
		--go-grpc_out=$(FEED_INTERNAL_DIR)/pbsocial --go-grpc_opt=paths=source_relative \
		social_graph.proto

	# Generate Feed Aggregator
	protoc $(PROTO_INCLUDES) \
		--go_out=$(FEED_INTERNAL_DIR)/pbfeed --go_opt=paths=source_relative \
		--go-grpc_out=$(FEED_INTERNAL_DIR)/pbfeed --go-grpc_opt=paths=source_relative \
		feed.proto

	# Generate Article Service
	protoc $(PROTO_INCLUDES) \
		--go_out=$(FEED_INTERNAL_DIR)/pbarticle --go_opt=paths=source_relative \
		--go-grpc_out=$(FEED_INTERNAL_DIR)/pbarticle --go-grpc_opt=paths=source_relative \
		article.proto