# Palermo Perfume System

Palermo Perfume System is a capstone e-commerce application for fragrance discovery and purchasing.
The open project issues cover customer accounts and scent profiles, an interactive fragrance quiz,
catalog search and note filtering, cart and checkout, sandbox payments and invoices, AI-assisted
support, administration, privacy/security controls, testing, and assessment documentation.

This repository is currently an **application foundation**, not a finished product or production
deployment. Feature behaviour must be implemented through the linked issues and reviewed pull
requests.

## Initial stack

- PHP 8.2 or later
- Composer 2
- MySQL 8.0
- PDO with native prepared statements and `utf8mb4`
- PHPUnit 11 for automated tests
- PHPStan for static analysis
- GitHub Actions for CI

The foundation is framework-neutral because no existing code or approved hosting constraint was
present. The PHP/MySQL target and application areas come directly from the project request and open
issues. Payment, AI, hosting, and deployment providers are intentionally undecided.

## Quick start

### Prerequisites

- PHP 8.2+ with JSON, PDO, and PDO MySQL extensions
- Composer 2
- MySQL 8.0

### Setup

```bash
git clone https://github.com/Mel-18-Palermo/Palermo-Perfume-System.git
cd Palermo-Perfume-System
cp .env.example .env
composer install
```

Create a local MySQL database and a least-privilege application user, then update only your local
`.env`. Do not commit that file.

Run the development server:

```bash
php -S 127.0.0.1:8080 -t public
```

Open `http://127.0.0.1:8080`. A machine-readable health endpoint is available at `/health`.

## Configuration

| Variable | Purpose | Initial default |
| --- | --- | --- |
| `APP_NAME` | Display/service name | `Palermo Perfume System` |
| `APP_ENV` | Runtime environment | `local` |
| `APP_DEBUG` | Detailed local errors; disable elsewhere | `true` |
| `APP_URL` | Local application URL | `http://127.0.0.1:8080` |
| `DB_HOST`, `DB_PORT` | MySQL endpoint | `127.0.0.1:3306` |
| `DB_DATABASE` | MySQL database | `palermo_perfume` |
| `DB_USERNAME`, `DB_PASSWORD` | Local database credentials | no usable password provided |
| `SESSION_SECURE_COOKIE` | Require HTTPS for session cookies | `false` locally |
| `SESSION_SAME_SITE` | Session cookie cross-site policy | `Lax` |
| `OPENAI_API_KEY` | Future AI sandbox credential | blank |
| `PAYMENT_PROVIDER` | Future approved sandbox provider | blank |
| `PAYMENT_SANDBOX_API_KEY` | Future payment sandbox credential | blank |

## Quality checks

```bash
composer validate --strict
composer lint
composer analyse
composer test
composer ci
```

The integration test runs when `DB_HOST` is present. CI supplies an isolated MySQL 8.0 service and
runs the complete suite. The branch-protection status check to require is **`CI / PHP CI`**.

## Project structure

```text
public/                 Web entry point; configure a future web server to expose only this directory
src/                    PHP application code (`Palermo\\` PSR-4 namespace)
  Config/               Environment configuration
  Database/             PDO connection creation
  Http/                 HTTP response primitives
database/
  migrations/           Versioned MySQL schema changes
  seeders/              Synthetic development and test fixtures
tests/
  Unit/                 Fast isolated tests
  Integration/          MySQL-backed tests
docs/
  architecture/         Technical decisions and diagrams
  deployment/           Hosting decision and release procedure when approved
  diagrams/             DFD, ERD, domain, and UI-flow sources/exports
  project-management/   Sprints, meetings, feedback, and contribution evidence
  requirements/         Requirements, use cases, and traceability
  testing/              Test plans, cases, UAT, defects, and results
.github/                 CI, issue forms, and pull-request template
```

See [the architecture baseline](docs/architecture/README.md) and
[issue responsibility map](docs/TEAM_RESPONSIBILITIES.md).

## Team workflow

`main` is the reviewed integration branch. Each change starts with an issue and uses a short-lived
`feature/`, `fix/`, `docs/`, or `test/` branch. Pull requests must link the issue, explain validation,
pass CI, and resolve review comments. There is no shared `develop` branch.

Detailed instructions are in [CONTRIBUTING.md](CONTRIBUTING.md). Security reporting and development
expectations are in [SECURITY.md](SECURITY.md). The exact repository rule is documented in
[the branch-protection checklist](docs/BRANCH_PROTECTION.md).

## Deployment status

Continuous deployment is intentionally not configured. Issue #101 must confirm the hosting model and
runtime constraints before a deployment workflow is designed. See
[the deployment decision record](docs/deployment/README.md) for the required decisions.
