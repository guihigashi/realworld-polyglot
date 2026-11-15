GATEWAY_DIR := ./apps/gateway
GATEWAY_NODE_DIR := ./apps/gateway-node
FEED_INTERNAL_DIR := ./apps/feed-aggregator/internal/generated
GRPC_PHP_PLUGIN := $(shell which grpc_php_plugin)
TS_PROTO_PLUGIN := $(GATEWAY_NODE_DIR)/node_modules/.bin/protoc-gen-ts_proto

PROTO_INCLUDES := \
	--proto_path=./apps/social-graph/src/main/protobuf \
	--proto_path=./apps/feed-aggregator/protobuf \
	--proto_path=./apps/article-service/src/main/proto

.PHONY: all generate-go generate-php generate-node build-images

all: generate-php generate-go generate-node

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

generate-node:
	@rm -rf $(GATEWAY_NODE_DIR)/src/proto $(GATEWAY_NODE_DIR)/src/generated/grpc
	@mkdir -p $(GATEWAY_NODE_DIR)/src/proto $(GATEWAY_NODE_DIR)/src/generated/grpc
	@cp ./apps/social-graph/src/main/protobuf/*.proto \
		./apps/feed-aggregator/protobuf/*.proto \
		./apps/article-service/src/main/proto/*.proto \
		$(GATEWAY_NODE_DIR)/src/proto/
	protoc $(PROTO_INCLUDES) \
		--plugin=protoc-gen-ts_proto=$(TS_PROTO_PLUGIN) \
		--ts_proto_out=$(GATEWAY_NODE_DIR)/src/generated/grpc \
		--ts_proto_opt=nestJs=true,addGrpcMetadata=true,importSuffix=.js,useOptionals=messages,forceLong=number \
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

build-images:
	cd ./apps/social-graph && sbt 'Docker / publishLocal'
	podman compose build
