# Admin and Derived Modules UI Requirements

## Purpose

This document defines the UI requirements corresponding to the approved administrative and derived-module use cases included in Issue #166.

The UI requirements describe user-visible behaviour and interaction only. They do not define database schemas, APIs, backend security implementation or application code.

## Applicable Actors

- Administrator
- Customer

## UI Scope

The UI scope includes:

- Administrative dashboard and reporting
- Administrative account and RBAC workflows
- Audit-log viewing
- Backup invocation and status
- Variant-level inventory visibility
- Production-batch recording and release
- Review submission and moderation
- Loyalty points
- Subscription opt-in/out
- Referral code/link
- Promotion management
- Promotional-content management
- AI promotional-video generation, preview and approval/rejection

## UI Requirements

### UI-ADM-001 — Administrative Dashboard and Reporting

**Related use case:** `UC-ADM-001`

**Related requirements:** `FR-ADMIN-001` through `FR-ADMIN-009`

**Related decisions:** `D-057`, `D-058`, `D-060`, `D-061`, `D-062`, `D-066`

**Primary user:** Administrator

#### Purpose

Provide an authorised administrator with a read-mostly interface for viewing approved Palermo business and operational reporting information.

#### Required UI elements

The administrative dashboard shall provide access to approved reporting information for:

* total sales;
* total orders;
* best-selling perfumes;
* most popular fragrance notes;
* customer preference information;
* fragrance quiz result information;
* inventory reporting;
* promotion performance; and
* AI recommendation performance.

Where applicable, the interface shall provide:

* a reporting-period selector;
* clear identification of the currently selected reporting period;
* navigation between available reports;
* summary values or appropriate report visualisations;
* an empty state when no applicable reporting data is available; and
* an access-denied state when the administrator is not authorised to view the requested information.

#### Interaction requirements

1. The administrator shall be able to open the administrative dashboard after successful authentication and authorisation.
2. The administrator shall be able to select an available reporting period where applicable.
3. Selecting a different reporting period shall refresh the displayed reporting information.
4. The administrator shall be able to move between the approved reporting categories.
5. Customer preference and fragrance quiz information shall be presented in aggregated form where individual customer identity is unnecessary.
6. The reporting interface shall not provide direct business-changing actions from report visualisations.
7. If reporting information is unavailable for the selected context, the interface shall clearly indicate that no applicable data is available.

#### Access and security requirements

* Dashboard access shall be available only to an authenticated and appropriately authorised Administrator.
* Administrative access shall follow server-enforced, deny-by-default, least-privilege RBAC.
* The interface shall not imply that client-side visibility alone grants administrative permission.
* AI-generated values shall not be presented as authoritative Palermo business metrics.

#### Scope constraints

* Dashboard and reporting interfaces are read-mostly.
* Business mutations shall occur through separate authorised administrative workflows.
* Reporting shall use explicit reporting periods and approved metric definitions.
* This UI specification does not define database queries, APIs, backend authorisation implementation or application code.
### UI-ADM-002 — Administrative Account and RBAC Management

**Related use case:** `UC-ADM-002`

**Related requirements:** `FR-ADMIN-010`, `FR-ADMIN-011`

**Related decisions:** `D-057`, `D-058`, `D-059`, `D-063`

**Primary user:** Administrator

#### Purpose

Provide an appropriately authorised administrator with an interface for managing administrative accounts and approved role-based access while respecting least-privilege and deny-by-default access rules.

#### Required UI elements

The administrative account-management interface shall provide, where authorised:

* a list of administrative accounts;
* account-status information;
* an action for creating an administrative account;
* an action for deactivating an administrative account;
* controls for viewing and assigning approved role-based access;
* confirmation for security-sensitive account or access changes;
* validation feedback for incomplete or invalid information;
* a success state when an authorised change is completed; and
* an access-denied state when the current administrator lacks the required permission.

#### Interaction requirements

1. The administrator shall be able to open the administrative account-management area only when appropriately authorised.
2. The interface shall display only account and access-management actions that the administrator is permitted to request.
3. The administrator shall be able to select an administrative account for permitted management actions.
4. When creating an administrative account, the interface shall collect the required approved account information.
5. When changing access, the interface shall allow selection only from approved role-based access options.
6. Security-sensitive changes shall require confirmation where appropriate.
7. If the requested account or access change is invalid, the interface shall display a clear validation message and shall not indicate that the change succeeded.
8. After a successful authorised change, the interface shall display the updated account or access state.
9. The interface shall not provide a workflow that allows an administrator to silently increase their own permissions or bypass approved authorisation rules.

#### Access and security requirements

* Administrative account and access-management capability shall require authenticated administrator identity and appropriate server-authorised permission.
* Administrative authorisation shall follow server-enforced, deny-by-default, least-privilege RBAC.
* UI visibility or disabled controls shall not be treated as the security boundary.
* Administrative account creation, deactivation and access-assignment actions shall be auditable.
* The UI shall not expose secrets or sensitive security information in audit or confirmation messages.

#### Scope constraints

* The UI shall use the approved `Administrator` actor rather than inventing unsupported staff job titles or organisational roles.
* Only approved role-based access options may be presented.
* This UI specification does not define backend authorisation logic, database schema, APIs or application code.
### UI-ADM-003 — Audit Log Viewing and Filtering

**Related use case:** `UC-ADM-003`

**Related requirements:** `FR-ADMIN-012`

**Related decisions:** `D-057`, `D-058`, `D-063`, `D-064`

**Primary user:** Administrator

#### Purpose

Provide an authorised administrator with a read-only interface for viewing, searching and filtering approved audit-history information.

#### Required UI elements

The audit-log interface shall provide:

* a list of authorised audit records;
* applicable actor information;
* action information;
* target information;
* date and time information;
* outcome information;
* approved correlation or change metadata where applicable;
* search controls;
* filter controls;
* an audit-record detail view where permitted;
* an empty state when no records match the selected criteria; and
* an access-denied state when the administrator lacks permission.

#### Interaction requirements

1. The administrator shall be able to open the audit-history interface only when appropriately authorised.
2. The administrator shall be able to search and filter permitted audit records.
3. Applying search or filter criteria shall refresh the displayed results.
4. Selecting an authorised audit record shall display its permitted details.
5. If no records match the selected criteria, the interface shall clearly display a no-results state.
6. Invalid search or filter input shall not alter audit data.
7. The interface shall not provide ordinary administrators with controls for modifying historical audit-event content.

#### Access and security requirements

* Audit-history access shall require authenticated administrator identity and appropriate server-authorised permission.
* Audit information shall not expose secrets or sensitive credentials.
* Historical audit-event content shall be read-only for ordinary administrative users.
* Security-relevant and privileged actions shall remain auditable.

#### Scope constraints

* The UI supports authorised viewing, searching and filtering only.
* Audit retention is policy-driven and is not configured through this UI unless separately approved.
* This specification does not define logging architecture, database schema, APIs or application code.
### UI-ADM-004 — Backup Management

**Related use case:** `UC-ADM-004`

**Related requirements:** `FR-ADMIN-013`

**Related decisions:** `D-057`, `D-058`, `D-063`, `D-065`

**Primary user:** Administrator

#### Purpose

Provide an authorised administrator with an interface for invoking an approved backup operation and viewing backup status and metadata.

#### Required UI elements

The backup-management interface shall provide, where authorised:

* backup status information;
* approved backup metadata;
* an action for invoking an approved backup;
* a confirmation step before initiating a backup where applicable;
* current or resulting backup-status feedback;
* an error or failure state when a backup cannot be completed; and
* an access-denied state when the administrator lacks the required permission.

#### Interaction requirements

1. The administrator shall be able to open the backup-management area only when appropriately authorised.
2. The interface shall display permitted backup information and available actions.
3. The administrator shall be able to request an approved backup operation.
4. The interface shall request confirmation where appropriate before the backup operation is initiated.
5. After confirmation, the interface shall show that the request has been submitted or initiated.
6. The interface shall display applicable backup status and metadata.
7. If the backup fails or cannot be initiated, the interface shall clearly display the applicable failure state.
8. Cancelling before confirmation shall leave the backup state unchanged.

#### Access and security requirements

* Backup operations shall require authenticated administrator identity and appropriate server-authorised permission.
* Backup actions shall be auditable.
* The interface shall not expose backup secrets, credentials or sensitive implementation details.
* UI visibility shall not be treated as the authorisation boundary.

#### Scope constraints

* The interface covers approved backup invocation and status/metadata visibility.
* A documented restore procedure may be supported, but this specification does not define restore architecture.
* This UI specification does not define storage architecture, database schema, APIs or backend implementation.
