# Source Selection Guidance

Use this reference to keep security and engineering recommendations grounded.

## Preferred Sources

1. Official product and framework documentation for the exact technology in the repository.
2. NIST standards and special publications.
3. OWASP ASVS, Cheat Sheets, Top 10, API Security, MASVS when applicable.
4. MITRE ATT&CK, CWE, CAPEC, D3FEND, CVE mappings when threat or weakness classification helps.
5. CISA advisories and secure configuration guidance.
6. Vendor hardening guides for infrastructure components in use.

## Rules

- Prefer the most specific source for the exact component being changed.
- When web access is available, actively fetch current official documentation and trusted security guidance instead of relying only on prior model knowledge.
- Prefer newer official guidance over older secondary summaries.
- Treat blogs and forum posts as non-authoritative unless they point back to official docs.
- When multiple trusted sources differ, prefer the one that is most specific to the deployed technology and threat model.
- Separate normative guidance from implementation convenience.

## Useful Question Set

- What exact product, version, and deployment model are in use?
- What is the trust boundary and who can cross it?
- What is the most damaging realistic failure?
- What secure default does the official documentation recommend?
- What logging, monitoring, and recovery requirement follows from this change?
