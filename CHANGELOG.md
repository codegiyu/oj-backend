# Changelog — oj-backend

All notable API changes are documented here. The public API is versioned under `/api/v1`.

## Versioning policy

- **v1** is the current stable surface. Breaking changes require a new major prefix (`/api/v2`) or a deprecation window documented here.
- Deprecations: announce in this file, keep behaviour for at least one release cycle, log warnings when deprecated routes are hit.
- Sunset: remove deprecated routes only after frontend and admin clients migrate.

## [Unreleased]

### Added

- Split API and BullMQ worker processes (`start:worker`, `RUN_WORKER` dev flag)
- Atlas Search rollout flag (`USE_ATLAS_SEARCH`)
- Upload extension allowlist per intent
- Separate `COOKIE_SECRET` from JWT signing

### Changed

- Default `PORT` is `4400`
- Database seed runs via `npm run seed`, not on API boot
- Multi-stage production Docker image

### Removed

- Deprecated `POST /auth/google-login` (use `POST /auth/google`)
