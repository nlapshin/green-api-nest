# GREEN-API Integration Gateway

Production-minded **integration gateway** for [GREEN-API](https://green-api.com): a NestJS service that keeps **WhatsApp credentials on the wire only** (per request), validates payloads with **Zod**, calls GREEN-API from the server via **undici**, and serves a small **server-rendered** control UI.

This is intentionally **not** a toy CRUD demo: boundaries are explicit (HTTP → application → outbound adapter), errors are normalized, and logs are structured. **Rate limiting is intentionally omitted** in this revision to keep the codebase smaller; see [Next steps (TODO)](#next-steps-todo) to add it back.

## Why this stack

| Piece | Role here |
|--------|-------------|
| **NestJS** | Application composition, modules, DI, lifecycle (incl. graceful shutdown). |
| **Fastify (platform adapter)** | Lower overhead than Express for an API-ish service; good fit when you mostly move JSON and want tight HTTP control. |
| **Zod (not class-validator)** | **Schema-first** contracts at integration boundaries: one source of truth for runtime validation and TypeScript types (`z.infer`), rich `refine` / `superRefine` for sanitization, `.strict()` to reject unknown fields—without maintaining parallel DTO classes and decorators. |
| **undici (not axios / ad-hoc fetch)** | First-class **timeouts**, `AbortController`, **connection pooling** via `Agent`, and explicit handling of transport vs upstream failures—less “helpful” abstraction noise than typical HTTP wrappers. |
| **Pino** | Fast **structured JSON** logging in production; optional pretty output in development. |
| **envalid** | **Fail-fast** typed configuration: invalid `.env` stops the process with a clear message instead of failing mysteriously at runtime. |

### Zod vs class-validator at integration boundaries

For external HTTP APIs you care about **payload contracts** and **normalization** (trim, reject control characters, strict object shapes). Zod gives:

- **Runtime validation + inferred types** from the same schema.
- **Strict objects** and **custom refinements** without reflection or decorator ordering surprises.
- Fewer moving parts than DTO classes + `class-validator` + `class-transformer` for non-CRUD gateways.

### undici vs axios / thin fetch wrappers

For a backend integration layer you usually want:

- Predictable **timeouts** on connect / headers / body.
- **Shared `Agent`** for keep-alive toward the same upstream host.
- Clear distinction between **DNS/TLS/reset** (transport) and **HTTP status** (upstream semantics).

undici stays close to those mechanics; axios stacks extra layers and defaults that are harder to reason about in edge cases.

## Architecture

```
Browser (vanilla JS) ──POST JSON──► Nest (Fastify) ──Zod──► GreenApiService
                                                      │
                                                      └─► GreenApiClient (undici) ──► GREEN-API
```

- **`UiModule`**: SSR shell (`views/index.hbs`) + static assets (`public/`). Calls JSON API under `/api/v1/green-api/*`.
- **`GreenApiModule`**: Controller (HTTP boundary), service (orchestration), client (undici adapter), Zod schemas, mapper (e.g. `fileUrl` → upstream `urlFile`).
- **`ConfigModule`**: Typed `APP_CONFIG` from validated env.
- **Common layer**: global exception filter (envelope), Zod pipe, logging module.

**Security defaults**

- `apiTokenInstance` is **never logged in full** (masked in outbound URL logs).
- Tokens are **not stored**; each request carries credentials from the client.
- **Helmet**, **@fastify/compress** (gzip/brotli), **64 KiB** JSON body limit, **strict** Zod schemas.
- Upstream error responses are **not echoed** verbatim to clients (status surfaced as structured metadata; details are conservative).

## Environment

Validated with **envalid** in `src/config/env.ts` (fail-fast). See `.env.example`.

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` \| `test` \| `production` |
| `PORT` | Listen port |
| `HOST` | Bind address (default `0.0.0.0`) |
| `DEFAULT_API_URL` | GREEN-API base (default `https://api.greenapi.com`) |
| `LOG_LEVEL` | Pino level |
| `REQUEST_TIMEOUT_MS` | Outbound timeout |
| `TRUST_PROXY` | When behind a reverse proxy, set `true` so Fastify trusts `X-Forwarded-*` (needed for correct client IP in logs if you add rate limiting later) |

## HTTP API

Base path: **`/api/v1/green-api`**

All endpoints are **`POST`** with JSON body (envelope responses).

### `POST /api/v1/green-api/get-settings`

Body: `idInstance`, `apiTokenInstance` (see Zod rules in `green-api.schemas.ts`).

### `POST /api/v1/green-api/get-state-instance`

Same body shape as get-settings.

### `POST /api/v1/green-api/send-message`

Adds `chatId`, `message`.

### `POST /api/v1/green-api/send-file-by-url`

Adds `chatId`, `fileUrl`, optional `fileName`, `caption`. Gateway maps `fileUrl` → GREEN-API `urlFile`.

### Success envelope

```json
{
  "success": true,
  "data": {
    "upstreamStatusCode": 200,
    "contentType": "application/json; charset=utf-8",
    "body": { }
  },
  "meta": { "requestId": "…" }
}
```

### Error envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [ { "path": "idInstance", "message": "…", "code": "invalid_string" } ]
  },
  "meta": { "requestId": "…" }
}
```

## `chatId` format (validated)

`^\d{7,15}@(c|g)\.us$`

Examples:

- Personal: `79001234567@c.us`
- Group: `1234567890123@g.us`

## Operational endpoints

- **`GET /healthz`** — liveness (+ `version` from `package.json`).
- **`GET /readyz`** — readiness (process up; no external dependencies in this design).

Graceful shutdown: Nest `enableShutdownHooks()` on `SIGTERM` / `SIGINT`.

## Next steps (TODO)

Planned hardening and ops features (not implemented in this slim version):

1. **Inbound rate limiting** — register `@fastify/rate-limit` in `main.ts` (per-IP, skip `/healthz`, `/readyz`, `/`, `/static/*`), map **429** to the existing `INBOUND_RATE_LIMIT` code in the global filter / `errorResponseBuilder`.
2. **Outbound throttling toward GREEN-API** — reintroduce a small per-`idInstance` limiter (in-memory sliding window or queue) in front of `GreenApiClient`, with env e.g. `GREEN_API_RPS_LIMIT`, structured logs on throttle, and **429** + `OUTBOUND_THROTTLED` (restore error code in `error-codes.ts` / `green-api-client.errors.ts` if desired).
3. **Distributed limits** — if you run multiple replicas, replace in-memory limiters with Redis (or similar) for shared counters.
4. **Observability** — OpenTelemetry, propagate `requestId` to outbound headers.
5. **Contract tests** — recorded fixtures against GREEN-API sandbox.

## Logging

- **Request**: `nestjs-pino` / `pino-http` (JSON in production, pretty in development).
- **Outbound**: `GreenApiClient` logs start/end with **masked** URL, `idInstance`, `statusCode`, `durationMs`—not the raw token.

## Local development

```bash
cp .env.example .env
make install   # or: npm ci
make dev       # or: npm run start:dev
```

Open `http://localhost:3000/`.

## Docker

```bash
cp .env.example .env
# optional: docker compose --env-file .env up --build
make docker-up
```

Image: multi-stage build, **non-root** `nestjs` user, ships `dist/`, `views/`, `public/`, and production `node_modules`.

## Tests

```bash
make test      # unit
make test-e2e  # integration-style (Fastify inject + mocked upstream layer)
```

Unit coverage highlights:

- Zod schemas (chatId, token, file URL, fileName traversal, strict objects).
- `GreenApiClient` against **undici `MockAgent`** (2xx JSON, 4xx/5xx, non-JSON body, transport failure).
- Transport guard helpers used for timeout/abort classification.

E2E uses a slim `test/e2e-app.module.ts` (no Handlebars/static plugins) and `fastify.inject()` to avoid pino-http + supertest edge cases.

## Limitations & assumptions

- No **rate limiting** on the gateway or toward GREEN-API in this revision (see [Next steps (TODO)](#next-steps-todo)).
- GREEN-API **method paths** follow the documented pattern  
  `{base}/waInstance{idInstance}/{method}/{apiTokenInstance}`.
- UI is **desktop-first**; mobile layout stacks panels.

## Possible improvements

- Idempotency keys / deduplication for send operations.
- Stricter CSP nonces if inline assets are added later.

## License

MIT
