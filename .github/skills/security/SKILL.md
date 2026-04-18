---
name: security
description: 'Use for cybersecurity-related review, implementation, hardening, and incident response. Triggers: ciberseguridad, seguridad, security, secure coding, security review, auth, MFA, authorization, sessions, secrets, OWASP, NIST, MITRE, CISA, threat modeling, vulnerabilities, breach, brecha, incident, incidente, containment, contencion, incident response, recovery, production hardening.'
argument-hint: 'Describe the feature, risk, code path, or system to secure or improve.'
user-invocable: true
disable-model-invocation: false
---

# Security

Use this skill only for tasks where cybersecurity is part of the request or clearly part of the risk. The goal is to produce code and recommendations that are secure by default, logically correct, aligned with current platform documentation, maintainable over the long term, and useful during both prevention and incident handling.

Do not use this skill for generic code quality, refactoring, optimization, or product work unless security is explicitly involved.

## When To Use

- Harden authentication, authorization, session handling, MFA, secrets, encryption, rate limiting, audit logging, or admin flows.
- Review code or architecture against trusted guidance such as NIST, OWASP, MITRE, CISA, framework vendor documentation, and language/runtime best practices.
- Implement or harden features that must be safe in production and maintainable over time.
- Assess common and non-obvious failure modes, abuse cases, trust boundaries, and regression risks before editing code.
- Respond to suspected incidents, breaches, credential exposure, misuse, abuse, or suspicious activity with concrete containment and recovery guidance.
- Modernize legacy logic to current documentation and platform guidance when security or resilience is part of the task.

## Non-Goals

- Do not expand into a full security review if the user is asking for a normal feature with no security angle.
- Do not flood the user with security theory when a short, targeted recommendation is enough.
- Do not force extra remediation work unrelated to the requested surface unless there is a serious adjacent risk.

## Operating Principles

- Prefer authoritative and current sources over generic blog advice.
- Use the latest date available in the active conversation as the recency anchor.
- When web access is available, actively consult current official documentation and trusted security guidance instead of relying only on prior knowledge.
- Stay scoped to the user's ask and be proactive only where it materially reduces risk or improves recovery.
- Distinguish clearly between:
  - codebase-verified facts
  - source-backed best practices
  - assumptions that still need validation
- Fix root causes instead of layering superficial guards.
- For weak designs in authentication, session management, privilege boundaries, recovery flows, or secret handling, prefer the safer design even if it introduces a justified breaking change.
- Keep solutions simple enough to maintain, but strong enough to survive real operational use.

## Modes

### 1. Secure Review

- Inspect code, configuration, and architecture.
- Prioritize findings by exploitability, impact, and systemic reach.
- Lead with concrete risks, then open questions, then remediation.

### 2. Secure Implementation

- Fix the root cause.
- Enforce secure defaults for new or changed flows.
- Keep the design maintainable, explicit, and proportional.

### 3. Incident Response And Containment

- Use when the prompt mentions a breach, incident, suspicious activity, compromise, leak, abuse, or urgent exposure.
- Prioritize immediate containment, blast-radius reduction, evidence preservation, recovery, and post-incident hardening.
- Distinguish between:
  - immediate containment actions
  - short-term remediation
  - long-term preventive changes

## Source Priority

Use the following source order whenever external guidance is needed:

1. Current official documentation for the exact framework, runtime, library, database, or infrastructure component in use.
2. NIST publications, especially for control families, identity, cryptography, risk treatment, and secure lifecycle guidance.
3. OWASP guidance, including ASVS, Top 10, Cheat Sheets, API Security, and session/authentication guidance.
4. MITRE resources such as ATT&CK, CWE, CAPEC, D3FEND, and relevant CVE intelligence when threat mapping helps.
5. CISA and vendor security advisories for active risks, misconfiguration patterns, and operational hardening.
6. High-quality implementation references only when they do not conflict with the above.

See [source selection guidance](./references/source-priority.md).

## Workflow

### 1. Establish the Real Context

- Identify the entry points, trust boundaries, privileged actions, data sensitivity, and failure impact.
- Inspect the existing codebase before proposing changes.
- Determine the actual stack, versions, and runtime assumptions from repository files instead of guessing.
- When the environment allows it, fetch current documentation or security guidance for the exact technology and risk area in scope.
- If the task mentions security posture, identify whether the problem is in prevention, detection, response, or recovery.

### 2. Choose The Right Security Mode

- Use secure review for code/architecture assessment.
- Use secure implementation for changes and hardening.
- Use incident response and containment when the situation is active, urgent, or post-breach.

### 3. Model Risks Before Editing

- Enumerate likely abuse cases, not just happy-path bugs.
- Check for both common issues and less obvious ones:
  - broken authorization
  - insecure defaults
  - secret leakage
  - weak recovery flows
  - privilege escalation
  - insecure direct object reference
  - stale dependencies or unsafe transitive assumptions
  - replay windows, race conditions, and session fixation
  - insufficient logging or excessive sensitive logging
  - operational gaps such as weak rate limits or absent monitoring
- Map meaningful findings to OWASP, CWE, or MITRE patterns when it clarifies severity or mitigations.

### 4. Choose the Smallest Correct Fix

- Prefer architectural fixes over scattered checks.
- Enforce secure defaults for new paths.
- Make invalid or unsafe states hard to represent.
- Centralize policy where possible, especially for auth, authorization, validation, and audit rules.
- Avoid adding complexity unless it materially improves resilience, correctness, or maintainability.

### 5. Implement With Long-Term Maintainability

- Keep naming, control flow, and data boundaries explicit.
- Follow the current style and conventions of the repository.
- Update or add tests that prove the fix and protect against regression.
- Add concise comments only where the code would otherwise be difficult to reason about.
- Prefer stable, well-maintained libraries when they reduce security or correctness risk.

### 6. Handle Incidents Pragmatically

- For live or recent incidents, recommend the smallest sequence that protects the system first:
  - contain access or ongoing abuse
  - preserve useful evidence
  - assess blast radius
  - rotate or revoke affected credentials, tokens, sessions, and secrets when relevant
  - patch or disable the exploited path
  - verify recovery state
- Avoid destructive cleanup steps that would erase investigation value unless containment demands it.

### 7. Validate Like a Reviewer

- Check the changed paths for lint, type, and build issues.
- Verify failure modes, not only success cases.
- Confirm logs, errors, and user-visible behavior do not leak sensitive information.
- Confirm access control decisions are enforced server-side.
- Confirm configuration, environment variables, and deployment implications are documented when relevant.

Use [the delivery checklist](./references/delivery-checklist.md) before finishing.

## Decision Rules

- If current best practice conflicts with existing behavior, prefer the safer design and call out the behavioral change.
- If the existing design is weak in auth, sessions, privilege boundaries, or secret lifecycle handling, do not preserve it for compatibility alone.
- If a claim depends on live external guidance and web access is unavailable, state that the recommendation is based on the latest repository-verified documentation and established standards already known, and avoid pretending to have live confirmation.
- If the codebase already has a security mechanism, extend and enforce it instead of rebuilding it from scratch unless the current mechanism is fundamentally unsound.
- If the user asks for a review, lead with concrete findings ordered by severity, then list open questions, then a short change summary.
- If the task involves credentials, secrets, or identity, never assume recoverability of plaintext secrets from stored hashes.
- If the task is not meaningfully security-related, stay out of the way and do not load this workflow into the response.
- If an incident is suspected, include containment and evidence-preservation guidance before deeper refactoring ideas.

## Quality Bar

The final result should be:

- Secure by default for new flows.
- Consistent with current official documentation and trusted security guidance.
- Logically coherent under edge cases and adversarial use.
- Minimal in surface area and unnecessary complexity.
- Maintainable and scalable for future contributors.
- Clear about residual risks, tradeoffs, and any unverified assumptions.
- Proactive where useful, but not invasive outside the security scope.

## Deliverable Shape

When using this skill, produce outputs that usually include:

1. A short statement of the verified context and affected surface.
2. The main risks or failure modes that matter.
3. The implementation, review, or containment outcome.
4. Validation performed and any remaining gaps.
5. Natural next steps only when they add real value.
