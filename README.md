# RealWorld Polyglot Implementation

This repository is a full-stack, polyglot microservices implementation of
the [RealWorld Specification](https://docs.realworld.show/) ("Conduit").

🚀 **Live Demo:** [https://rwa.guihigashi.dev](https://rwa.guihigashi.dev)

🤖 **Companion Studio:** Content generation and persona simulation are managed
via [RealWorld Studio](https://github.com/guihigashi/realworld-studio), an AI-driven publishing and approval dashboard.

## Architecture & Goals

This project showcases a polyglot microservice architecture adhering to Clean Architecture and Domain-Driven Design
principles across diverse runtime ecosystems:

* **API Gateway (`apps/gateway`):** PHP & Laravel Octane (Swoole) handling HTTP REST endpoints, JWT authentication, and
  routing via gRPC.
* **Article Service (`apps/article-service`):** Java 25 & Spring Boot gRPC service managing articles, comments,
  favorites, and tags.
* **Social Graph (`apps/social-graph`):** Scala 3 & ZIO gRPC service managing profiles and follow relationships.
* **Feed Aggregator (`apps/feed-aggregator`):** Go gRPC service aggregating personalized user feeds.
* **Web Client (`apps/web-client`):** Modern React SPA built with TypeScript, Vite, TanStack Router, Redux Toolkit, and
  Markdown support.
* **Infrastructure:** PostgreSQL, Redis cache, and container orchestration via Compose.