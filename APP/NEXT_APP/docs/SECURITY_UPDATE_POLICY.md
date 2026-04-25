# Security Update Policy

This project favors new stable releases because security fixes usually land in current supported versions first.

## Version Selection

- Use the newest stable/LTS runtime supported by the stack.
- Avoid alpha, beta, rc, canary and nightly releases in production.
- Do not run end-of-life runtimes, base images or package manager lines.
- Prefer major-version GitHub Action tags for maintained official actions when Dependabot tracks updates.
- Pin application dependency resolution through a single lockfile: `pnpm-lock.yaml`.

## Current Baseline

- Node.js: 24 LTS for production, 22 LTS as transition compatibility in CI.
- pnpm: 10.x current stable line.
- GitHub Actions: latest stable major versions for official actions.
- Docker runtime: `node:24-alpine`.

## Vulnerability Response

Patch immediately when any of these sources report exploitable or high-impact risk:

- CISA Known Exploited Vulnerabilities catalog.
- GitHub Security Advisory / Dependabot security alert.
- NVD CVE with practical exploitability.
- Official vendor security advisory.
- OWASP guidance for affected weakness classes.

## Release Gates

Before production deployment:

- `pnpm install --frozen-lockfile`
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm audit --prod --audit-level=high`
- `pnpm run build`
- Playwright security checks for headers, auth redirects and abuse guards.
- CodeQL, Trivy and secret scanning in GitHub Actions.

## Lockfile Rule

When `package.json`, `.npmrc` or the package manager version changes, regenerate the lockfile with the active baseline:

```bash
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm install --lockfile-only
```

Commit `package.json`, `.npmrc` and `pnpm-lock.yaml` together.
