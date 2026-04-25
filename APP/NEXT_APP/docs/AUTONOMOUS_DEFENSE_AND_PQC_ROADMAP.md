# Autonomous Defense and Post-Quantum Readiness Roadmap

This roadmap converts the high-level security vision into deployable controls for this project.

## Operating Principles

- Fail closed for identity, admin, superadmin, rate limiting and secrets.
- Automate only reversible mitigations by default.
- Require human approval for irreversible infrastructure or account actions.
- Store every autonomous decision with evidence, rule version, actor, timestamp and rollback path.
- Prefer provider-backed, standards-based post-quantum migration over custom cryptography.
- Follow `docs/SECURITY_UPDATE_POLICY.md`: newest stable/LTS versions, no EOL runtimes, single lockfile.

## Phase 1: Signal Quality

Before autonomous response, security events must be normalized and trustworthy.

- Normalize event names for auth failures, MFA failures, rate limits, blocked origins, blocked payloads, honeypots, superadmin actions, SSH commands and public share abuse.
- Persist risk signals by user, IP hash, session token, endpoint and command id.
- Add severity, confidence, source and recommended response to each incident.
- Add dashboards for unresolved incidents, repeated offenders, privileged actions and false positives.
- Add regression tests for headers, CSP, API abuse, permission checks and IDOR/BOLA.

## Phase 2: SOAR-Lite Rule Engine

Start in dry-run mode, then enable reversible actions.

Current implementation:

- `AUTONOMOUS_DEFENSE_MODE=off|dry-run|active`.
- `AUTONOMOUS_DEFENSE_AUDIT=true|false`.
- Default is `dry-run`.
- The evaluator lives in `src/lib/autonomous-defense.ts`.
- `src/lib/security-logger.ts` evaluates decisions for every structured security event.
- Phase 1 logs decisions and persists them as `AuditLog` entries with `security` category.
- Admin reads are available at `/api/admin/security/autonomous-defense`.
- Enforcement modules must be added behind action-specific approval gates.

Allowed automatic actions:

- Lower per-IP and per-session rate limits temporarily.
- Revoke a suspicious session.
- Require fresh MFA for admin and superadmin routes.
- Disable abused public share codes temporarily.
- Cool down expensive endpoints such as OCR, AI generation, scraping and quotation chat.
- Block suspicious IP/fingerprint for a short TTL.

Human-approval actions:

- Permanent firewall changes.
- Secret/key rotation.
- User suspension.
- File deletion or modification through superadmin tooling.
- Production infrastructure changes.

Minimum rule fields:

- `id`, `version`, `enabled`, `dryRun`, `severity`, `confidenceThreshold`, `conditions`, `actions`, `ttlSeconds`, `rollback`, `createdBy`.

## Phase 3: Post-Quantum Readiness

Do not implement custom PQC inside application code. Prepare the system so migration is controlled when providers and runtimes support stable hybrid/PQC modes.

Inventory now:

- TLS certificates and terminating proxy/CDN.
- SSH host keys and user keys.
- Auth.js session secrets and JWT/JWE configuration.
- AES-256-GCM encrypted database fields.
- Argon2id password hashes and recovery codes.
- Web Push VAPID keys.
- API keys for AI, webhooks and external services.
- Backups, deployment archives and signing keys.

Immediate posture:

- Keep AES-256-GCM for application encryption.
- Keep Argon2id for password hashing.
- Prefer Ed25519 or modern SSH keys now; migrate to hybrid/PQC SSH when OpenSSH and the host OS provide stable support.
- Prefer TLS 1.3 through the edge/CDN; enable hybrid/PQC TLS only through a provider-supported feature flag.
- Add key age, owner and rotation date metadata for all long-lived secrets.

Migration gates:

- Provider support is generally available.
- Rollback path exists.
- Canary endpoint verifies handshake compatibility.
- Monitoring distinguishes crypto failures from app failures.
- Backups and recovery material are re-encrypted or re-wrapped safely.

## Priority Backlog

1. Add normalized security event schema and rule outcome table.
2. Move middleware and API rate limits to Redis-backed counters where still in-memory.
3. Add dry-run rule evaluator for incident streams.
4. Add privileged action approval records for superadmin operations.
5. Add crypto inventory command/report.
6. Add secret rotation playbooks.
7. Evaluate provider-supported hybrid TLS and OpenSSH PQC support quarterly.
