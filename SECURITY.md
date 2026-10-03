# Proteus Security Audit and Hardening

## Scope

This audit covers the React/TanStack application, server routes, session layer, Whop webhook handler, MySQL migrations, build/deployment wrapper, dependencies, and tracked files against the requested 19-point pre-launch checklist.

## Control matrix

| # | Requirement | Status | Evidence / action |
|---:|---|---|---|
| 1 | Admin route protection | Implemented | `/api/admin/subscriptions` requires a verified Google identity, the exact owner email allowlist, and a linked `googleSub`; the client guard is treated as UX only. |
| 2 | Server-side access control | Implemented | Profile, subscription, checkout, session, and admin APIs resolve the opaque server session and enforce ownership/role checks on the backend. |
| 3 | Database RLS | Compensating control | The managed database is MySQL-compatible and does not expose PostgreSQL-style RLS. Every private query is scoped by the authenticated customer ID, and admin reads require the owner authorization check. A separate tenant/RLS policy is not technically available on this platform. |
| 4 | Email verification | Implemented; provider-gated | Google ID tokens require Google's verified-email claim. Password accounts now receive a single-use, hashed, 30-minute verification token and cannot receive a session until verified. Production signup returns a safe configuration error until `RESEND_API_KEY`, `VERIFICATION_FROM_EMAIL`, and `PUBLIC_APP_ORIGIN` are configured. |
| 5 | Password hashing | Implemented | Passwords use Node `scryptSync` with a random salt, high-cost parameters, bounded memory, and constant-time comparison. |
| 6 | Token handling | Implemented | Browser sessions use HttpOnly, Secure/Partitioned cookies where HTTPS is detected; only SHA-256 session hashes are stored in MySQL; plan data in localStorage contains no auth token. |
| 7 | Server-side secrets | Implemented | Google and Whop secrets are read only in server routes; responses expose readiness booleans and public Google client configuration, never secret values. |
| 8 | Sensitive files out of Git | Implemented | `.gitignore` excludes `.env*`, private keys, certificates, credentials, and secret directories; tracked-file scan found no sensitive candidates. |
| 9 | Sensitive logging | Implemented | Server error logs no longer print exception objects or request data; provider failures return generic messages. |
| 10 | Parameterized SQL | Implemented | Drizzle predicates and prepared `execute` parameters are used for application values; migrations are static repository SQL. |
| 11 | Input validation | Implemented / ongoing | API enums, ranges, email/password lengths, content-length limits, webhook payload normalization, and request-origin checks are enforced server-side; forms retain native constraints. |
| 12 | XSS | Implemented | React output is escaped; no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or user-controlled HTML rendering was found. Security headers are added by the production server. |
| 13 | File uploads | Not applicable | No upload route, file parser, or user file storage exists in the current application. Any future upload must use an allowlist, byte limit, content sniffing, non-executable storage, and generated names. |
| 14 | Webhook signatures | Implemented | Whop v1 signatures verify the exact raw body with HMAC-SHA256, constant-time comparison, timestamp freshness, secret prefix validation, idempotency ledger, and monotonic provider-event handling. |
| 15 | Rate limiting | Implemented | Sensitive auth, admin, billing, subscription, profile, and webhook routes use bounded per-process limits with `Retry-After`. Production should add an edge/managed limiter for multi-instance enforcement. |
| 16 | CORS | Implemented | No permissive CORS headers are emitted. Browser API requests reject cross-site fetch metadata/origins; same-origin mutation routes require an origin match. |
| 17 | Production errors/debug | Implemented | Production server returns generic 500 responses with `no-store` and no stack traces; logs are sanitized. |
| 18 | Dependencies | Implemented | TanStack Start and related packages were upgraded; `pnpm audit --prod --audit-level=moderate` reports no known vulnerabilities. |
| 19 | Final scan | Passed with one configuration gate | Typecheck, production build, migration, dependency audit, tracked-secret scan, unsafe-render scan, production-header probe, invalid-token probe, and unauthenticated API probes passed. Transactional email provider configuration remains a production release gate. |

## Release gates

- Configure a real transactional email provider and verification sender before enabling password registrations in production.
- Upgrade the TanStack Start dependency family until `pnpm audit --prod --audit-level=moderate` is clean or an accepted upstream exception is documented.
- Run the final build, audit, and unauthenticated access probes after the last migration.
