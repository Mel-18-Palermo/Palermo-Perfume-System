# AUTH + PROFILE Use-Case Map

## Authentication

| Use case | Actor | Requirements |
|---|---|---|
| `UC-AUTH-001` Register Account | Visitor | `FR-AUTH-001` |
| `UC-AUTH-002` Verify Email | Customer | `FR-AUTH-002`, `FR-AUTH-006` |
| `UC-AUTH-003` Log In | Customer | `FR-AUTH-003` |
| `UC-AUTH-004` Log Out | Customer | `FR-AUTH-004` |
| `UC-AUTH-005` Reset Password | Customer | `FR-AUTH-005` |
| `UC-AUTH-006` Deactivate Account | Customer | `FR-AUTH-007` |

`FR-AUTH-006` is an automatic transition triggered by successful email verification and is not an independent actor-driven use case.

## Customer Profile

| Use case | Actor | Requirements |
|---|---|---|
| `UC-PROFILE-001` Manage Customer Profile | Customer | `FR-PROFILE-001` |
| `UC-PROFILE-002` Manage Delivery Address | Customer | `FR-PROFILE-002` |
| `UC-PROFILE-003` Manage Billing Address | Customer | `FR-PROFILE-003` |
| `UC-PROFILE-004` Manage Fragrance Preferences | Customer | `FR-PROFILE-004`, `FR-PROFILE-005`, `FR-PROFILE-006`, `FR-PROFILE-007` |
| `UC-PROFILE-005` Generate Fragrance Identity | Customer | `FR-PROFILE-008` |

Decision references: `D-008`, `D-009`.
