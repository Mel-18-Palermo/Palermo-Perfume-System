# Security policy

## Reporting a vulnerability

Do not open a public issue containing vulnerability details, credentials, personal information, or
payment data. Use the repository's private security-reporting option if enabled; otherwise contact the
project lead through the team's agreed private channel. Include a safe reproduction, likely impact,
and suggested mitigation without using real customer data.

## Development baseline

- Keep secrets in environment variables and out of Git.
- Use prepared PDO statements; emulated prepares are disabled by default.
- Escape output for its destination and validate input at trust boundaries.
- Apply CSRF protection to state-changing browser requests.
- Enforce authorization server-side for every protected action.
- Store passwords only through PHP's password hashing API.
- Minimize collected personal data and use synthetic test data.
- Do not log credentials, session identifiers, payment data, or sensitive scent-profile details.
- Keep `APP_DEBUG=false` outside local development.
- Run dependency, static-analysis, and test checks before merge.

Encryption at rest, TLS configuration, backups, payment compliance, retention, and deployment access
controls depend on the selected hosting and service providers. They must be verified before release;
the repository does not claim those controls are active merely because they appear in requirements.

The current role and permission rules are documented in
[the RBAC specification](docs/security/rbac.md).

Input validation, XSS, CSRF, and SQL injection controls are documented in
[the web security specification](docs/security/web-controls.md).

Personal-information flows, privacy risks, and pre-release actions are documented in
[the privacy impact assessment](docs/security/privacy-impact-assessment.md).

The required AES-256, TLS 1.3, and key-management boundaries are documented in
[the data encryption architecture](docs/security/encryption-architecture.md).
