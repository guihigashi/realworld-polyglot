# gateway-node

NestJS 12 API gateway (`@nestjs/platform-node`, ESM, TypeScript, Zod, Drizzle ORM, gRPC) implementing the RealWorld Conduit API ([`reference/realworld-spec/specs/api/openapi.yml`](../../reference/realworld-spec/specs/api/openapi.yml)).

## Setup

```bash
yarn install
```

Regenerate `.proto` copies and TypeScript gRPC interfaces from the upstream services (run from repo root):

```bash
make generate-node
```

## Scripts

```bash
yarn start:dev      # Development watch mode
yarn build          # Build to dist/
yarn typecheck      # TypeScript check (tsc --noEmit)
yarn lint           # Lint with oxlint (--type-aware)
yarn format:check   # Check formatting with oxfmt
yarn test           # Unit tests (Vitest)
yarn test:e2e       # End-to-end tests (Vitest)
```
