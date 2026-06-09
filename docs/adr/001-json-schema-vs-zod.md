# ADR-001: Fastify JSON Schema for request validation

**Status:** Accepted  
**Date:** 2026-06-09

## Context

The backend could validate requests with Zod (popular in the TypeScript ecosystem) or Fastify's built-in JSON Schema via route `schema` options. The frontend (oj-multimedia) uses Zod for forms; duplicating schemas in Zod on the API would create two sources of truth.

## Decision

Use **Fastify JSON Schema** on route definitions for request validation. Document response envelopes in `src/schemas/response.envelope.ts` and enforce runtime shape via `sendResponse` / `AppError`.

Zod is **not** adopted on the API layer to avoid dual validation stacks and serializer mismatch.

## Consequences

- Route files carry `schema` objects (querystring, body, params).
- Success envelope documentation uses `withSuccessEnvelope()` incrementally on public routes.
- Shared types remain in TypeScript; JSON Schema covers wire validation only.
