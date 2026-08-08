GATEWAY_DIR := ./apps/gateway
GRPC_PHP_PLUGIN := $(shell which grpc_php_plugin)

generate-php:
	protoc \
		--proto_path=./apps/social-graph/src/main/protobuf \
		--php_out=$(GATEWAY_DIR) \
		--grpc_out=$(GATEWAY_DIR) \
		--plugin=protoc-gen-grpc=$(GRPC_PHP_PLUGIN) \
		./apps/social-graph/src/main/protobuf/*.proto