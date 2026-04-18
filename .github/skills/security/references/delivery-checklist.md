# Delivery Checklist

Use this checklist before finishing a task under this skill.

## Security

- Authentication and authorization checks are enforced in the correct server-side layer.
- Inputs are validated at the boundary and encoded or normalized where needed.
- Secrets, tokens, and sensitive data are not exposed in logs, errors, or client responses.
- Rate limiting, anti-abuse, or idempotency concerns were considered where relevant.
- Auditability and incident investigation needs were considered for privileged or sensitive actions.
- For incidents or breaches, containment, blast radius, credential rotation, and evidence preservation were considered in the right order.

## Engineering Quality

- The change addresses the root cause.
- The solution is consistent with repository conventions.
- Complexity stayed proportional to the problem.
- Tests or validation cover the risky path.
- Documentation or operator notes were updated when behavior or setup changed.
- The response stayed scoped to the requested security surface and did not sprawl into unrelated work.

## Final Review

- Verified facts are separated from assumptions.
- Residual risks and tradeoffs are called out.
- The final response is concise and actionable.
