# ADR-003: Atlas Search migration path

**Status:** Accepted (phase 1 — feature flag)  
**Date:** 2026-06-09

## Context

Public search fans out across many MongoDB collections with in-memory merge/pagination (PERF-01). Phase 17 added per-collection text indexes and `$text` queries. At scale, a federated search layer (MongoDB Atlas Search or self-hosted OpenSearch) reduces fan-out and improves relevance ranking.

## Decision

1. **Short term (shipped):** Keep parallel collection queries; honour text indexes when queries qualify (`shouldUseTextSearch`).
2. **Rollout gate:** `USE_ATLAS_SEARCH=true` routes search through `atlasSearch.service.ts`, forcing text-index-only queries (no regex fallback) to validate index coverage before Atlas indexes exist.
3. **Long term:** Provision Atlas Search indexes (or OpenSearch) with a single federated index keyed by `type`. Replace `runPublicSearch` fan-out with `$search` aggregation against that index. Deprecate regex path after shadow comparison in staging.

## Alternatives considered

| Option | Pros | Cons |
|--------|------|------|
| Atlas Search | Managed, MongoDB-native, good relevance | Atlas tier cost, index design effort |
| Self-hosted OpenSearch | Full control, portable | Ops burden, sync pipeline |
| Status quo regex + text | No infra change | Poor scale, misleading totals |

## Consequences

- Default `USE_ATLAS_SEARCH=false` — no behaviour change in production until indexes are ready.
- Short queries (&lt;3 char tokens) return empty when flag is on — document in API/release notes before enabling.
- Next phase: define index mappings per content type and add integration tests against Atlas staging cluster.
