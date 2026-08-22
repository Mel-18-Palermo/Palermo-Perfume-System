# Admin and Derived Modules Use-Case Specifications

## Purpose

This document defines the approved SRS use cases for the Palermo administrative, reporting, inventory, production-batch, review/community, loyalty, subscription, referral, promotion and promotional-content functions included in Issue #166.

Derived requirements remain identified as `DER-*` requirements and are not presented as source-numbered Palermo functional requirements.

## Actors

- Administrator
- Customer
- AI service/API, where applicable as an external supporting system

## Requirement Scope

### Source Functional Requirements

`FR-ADMIN-001` through `FR-ADMIN-013`

### Approved Derived Requirements

- `DER-INVENTORY-001` through `DER-INVENTORY-006`
- `DER-REVIEW-001`
- `DER-COMMUNITY-001`
- `DER-LOYALTY-001`
- `DER-SUBSCRIPTION-001`
- `DER-REFERRAL-001`
- `DER-PROMO-001`
- `DER-SOCIAL-001`
- `DER-SOCIAL-002`

## Use Cases

### UC-ADM-001 — View Administrative Dashboard and Reports

**Primary actor:** Administrator

**Related requirements:** `FR-ADMIN-001` through `FR-ADMIN-009`

**Related decisions:** `D-057`, `D-058`, `D-060`, `D-061`, `D-062`, `D-066`

**Goal:**  
Allow an authorised administrator to view Palermo business and operational reporting information through the administrative dashboard.

**Preconditions:**

- The administrator is authenticated.
- The administrator has the required server-authorised permission to access administrative reporting.
- Authoritative Palermo application data is available for the requested reporting period.

**Trigger:**  
The administrator opens the dashboard or selects an available administrative report.

**Main flow:**

1. The administrator accesses the administrative reporting area.
2. The system verifies that the administrator is authorised to access the requested reporting information.
3. The administrator selects a reporting period where applicable.
4. The system retrieves reporting values from authoritative Palermo application data.
5. The system displays the applicable dashboard or report information, including:
   - total sales;
   - total orders;
   - best-selling perfumes;
   - most popular fragrance notes;
   - customer preference information;
   - fragrance quiz result information;
   - inventory reporting;
   - promotion performance; and
   - AI recommendation performance.
6. Customer preference and fragrance quiz information is presented in aggregated form where individual customer identity is not required.
7. The administrator may change the selected reporting period or move between available reports.
8. The system refreshes the displayed information according to the selected reporting context.

**Alternative and exception flows:**

- If the administrator does not have permission to access the requested report, access is denied.
- If reporting data is unavailable for the selected period, the system indicates that no applicable reporting data is available.
- AI-generated values are not treated as authoritative business metrics.

**Postconditions:**

- The administrator has viewed the requested authorised reporting information.
- No business data is changed as a result of viewing the dashboard or reports.

**Business and scope rules:**

- Reporting interfaces are read-mostly.
- Business-changing actions must use separate authorised administrative workflows rather than report visualisations.
- Reporting metrics use explicit reporting periods and documented definitions.
- Access remains subject to server-enforced, deny-by-default, least-privilege RBAC.
### UC-ADM-002 — Manage Administrative Accounts and Access

**Primary actor:** Administrator

**Related requirements:** `FR-ADMIN-010`, `FR-ADMIN-011`

**Related decisions:** `D-057`, `D-058`, `D-059`, `D-063`

**Goal:**  
Allow an appropriately authorised administrator to manage administrative accounts and their approved role-based access while enforcing least-privilege access control.

**Preconditions:**

- The administrator is authenticated.
- The administrator has the required server-authorised permission to manage administrative accounts or access assignments.
- The applicable administrative account exists when an existing account is being modified.

**Trigger:**  
The administrator opens the administrative account and access-management area and selects an account-management or access-control action.

**Main flow:**

1. The administrator accesses the administrative account and access-management area.
2. The system verifies that the administrator is authorised to perform the requested management action.
3. The system displays the administrative accounts and access information that the administrator is permitted to manage.
4. The administrator selects an approved action, such as:
   - creating an administrative account;
   - deactivating an administrative account; or
   - assigning or updating approved role-based access.
5. The administrator provides or selects the required account or access information.
6. The system validates the requested change against the approved server-enforced RBAC rules.
7. The system applies the authorised account or access change.
8. The system records the privileged action in the audit history with the relevant actor, action, target, time and outcome information.
9. The system confirms the result to the administrator.

**Alternative and exception flows:**

- If the administrator lacks permission for the requested action, the system denies the request.
- If the requested access assignment would violate approved RBAC rules or least-privilege constraints, the system rejects the change.
- If required account information is invalid or incomplete, the system does not apply the change and indicates that correction is required.
- An administrator cannot silently escalate their own access or bypass the approved authorisation rules.

**Postconditions:**

- An authorised administrative account or access change has been completed, or the requested change has been rejected without modifying access.
- Successful privileged changes are represented in the audit history.

**Business and scope rules:**

- Administrative access is server-authorised and deny-by-default.
- Least-privilege RBAC applies to administrative capability.
- Organisational staff job titles or unsupported administrative roles must not be invented.
- Administrative account creation, deactivation and access assignment require appropriate permission.
- This use case defines required behaviour only and does not specify backend security implementation.


### UC-ADM-003 — View and Search Audit History

**Primary actor:** Administrator

**Related requirements:** `FR-ADMIN-012`

**Related decisions:** `D-057`, `D-058`, `D-063`, `D-064`

**Goal:**  
Allow an authorised administrator to view, search and filter approved administrative audit-history information without modifying historical audit records.

**Preconditions:**

- The administrator is authenticated.
- The administrator has the required server-authorised permission to access audit-history information.
- Audit records exist where applicable.

**Trigger:**  
The administrator opens the audit-log management area.

**Main flow:**

1. The administrator accesses the audit-history area.
2. The system verifies that the administrator is authorised to view audit information.
3. The system displays audit records that the administrator is permitted to access.
4. The displayed audit information may include relevant:
   - actor;
   - action;
   - target;
   - time;
   - outcome; and
   - approved correlation or change metadata.
5. The administrator may search or filter the audit history using available criteria.
6. The system applies the selected search or filter criteria.
7. The system displays the matching audit records.
8. The administrator may inspect an authorised audit record in greater detail where permitted.

**Alternative and exception flows:**

- If the administrator does not have permission to access audit history, the system denies access.
- If no audit records match the selected criteria, the system indicates that no matching records are available.
- If invalid search or filter criteria are provided, the system does not apply them and indicates that correction is required.

**Postconditions:**

- The administrator has viewed authorised audit-history information.
- Historical audit-event content has not been changed.

**Business and scope rules:**

- Security-relevant and privileged administrative actions are audit logged.
- Audit information records appropriate actor, action, target, time and outcome information without exposing secrets.
- Audit history supports authorised viewing, searching and filtering.
- Ordinary administrators cannot alter historical audit-event content.
- Audit retention is policy-driven.

### UC-ADM-004 — Manage Data Backup Operations

**Primary actor:** Administrator

**Related requirements:** `FR-ADMIN-013`

**Related decisions:** `D-057`, `D-058`, `D-063`, `D-065`

**Goal:**  
Allow an authorised administrator to invoke an approved data backup operation and view backup status and metadata.

**Preconditions:**

- The administrator is authenticated.
- The administrator has the required server-authorised permission to manage backup operations.
- The approved backup capability is available.

**Trigger:**  
The administrator opens the backup-management area or chooses to create an approved backup.

**Main flow:**

1. The administrator accesses the backup-management area.
2. The system verifies that the administrator is authorised to perform backup operations.
3. The system displays available backup information and permitted backup actions.
4. The administrator chooses to invoke an approved backup operation.
5. The system requests confirmation where required.
6. The administrator confirms the backup request.
7. The system initiates the approved backup operation.
8. The system records the relevant backup status and metadata.
9. The system records the privileged backup action in the audit history.
10. The system displays the current or resulting backup status to the administrator.

**Alternative and exception flows:**

- If the administrator lacks permission to perform backup operations, the system denies the request.
- If the backup operation cannot be started or fails, the system records and displays the applicable failure status.
- If the administrator cancels before confirmation, no backup operation is initiated.

**Postconditions:**

- An approved backup operation has been initiated and its status or metadata recorded, or the request has ended without creating a backup.
- The privileged backup action is represented in the audit history where applicable.

**Business and scope rules:**

- Backup operations are restricted to appropriately authorised administrators.
- Backup invocation and status are auditable.
- Backup management includes approved backup creation, status/metadata visibility and support for a documented restore procedure.
- This use case does not define backup storage architecture, database schema or backend implementation.

## Inventory and Production Batch Use Cases
### UC-INV-001 — View Variant Inventory and Stock Movement Information

**Primary actor:** Administrator

**Requirement provenance:** Approved development-team-derived SRS requirements

**Related requirements:** `DER-INVENTORY-001`, `DER-INVENTORY-002`, `DER-INVENTORY-005`, `DER-INVENTORY-006`

**Related decisions:** `D-057`, `D-058`, `D-067`, `D-068`, `D-071`, `D-072`

**Goal:**  
Allow an authorised administrator to view sellable perfume-variant inventory information, identify low-stock variants and inspect attributable stock-movement information.

**Preconditions:**

- The administrator is authenticated.
- The administrator has the required server-authorised permission to access inventory information.
- Sellable perfume variants exist where applicable.

**Trigger:**  
The administrator opens the inventory-management area or selects a perfume variant to inspect.

**Main flow:**

1. The administrator accesses the inventory area.
2. The system verifies that the administrator is authorised to view inventory information.
3. The system displays inventory at the sellable perfume-variant level.
4. For each permitted variant, the system displays applicable stock information, including:
   - on-hand quantity;
   - reserved or committed quantity;
   - available quantity; and
   - low-stock status where applicable.
5. The administrator selects a perfume variant to inspect.
6. The system displays attributable inventory-movement information associated with the selected variant.
7. The movement information includes the applicable:
   - quantity change;
   - source or reason;
   - reference; and
   - timestamp.
8. The administrator may view variants that are at or below their configured low-stock threshold.
9. The administrator may return to the inventory overview or inspect another variant.

**Alternative and exception flows:**

- If the administrator lacks permission to access inventory information, the system denies access.
- If no movement history exists for the selected variant, the system indicates that no movement records are available.
- If a variant is not at or below its configured low-stock threshold, it is not identified as low stock.

**Postconditions:**

- The administrator has viewed authorised variant-level stock or inventory-movement information.
- Viewing inventory information does not itself change stock quantities.

**Business and scope rules:**

- Inventory is tracked at the sellable perfume-variant level.
- Available stock accounts for reserved or committed quantities.
- Every inventory quantity change must be attributable through an inventory movement.
- Inventory reservation and commitment controls must prevent allocation beyond available stock.
- Failed or expired reservations must be released safely.
- Automatic purchasing, replenishment or production ordering is outside the approved scope.
- This use case does not define database schema, persistence controls, APIs or backend implementation.

### UC-INV-002 — Record and Release Finished-Perfume Production Batch

**Primary actor:** Administrator

**Requirement provenance:** Approved development-team-derived SRS requirements

**Related requirements:** `DER-INVENTORY-003`, `DER-INVENTORY-004`

**Related decisions:** `D-057`, `D-058`, `D-069`, `D-070`

**Goal:**  
Allow an authorised administrator to record a finished-perfume production batch for a sellable variant and release that batch into sellable inventory through the approved workflow.

**Preconditions:**

- The administrator is authenticated.
- The administrator has the required server-authorised permission to manage production batches.
- The applicable sellable perfume variant exists.

**Trigger:**  
The administrator opens the production-batch area and chooses to record a new finished-perfume batch or release an existing recorded batch.

**Main flow:**

1. The administrator accesses the production-batch management area.
2. The system verifies that the administrator is authorised to manage production batches.
3. The administrator selects the applicable sellable perfume variant.
4. The administrator enters the required finished-perfume batch information.
5. The system validates the provided batch information.
6. The system records the production batch without changing sellable inventory.
7. When the batch is ready for release, the administrator selects the authorised release action.
8. The system verifies that the administrator is authorised to release the batch.
9. The system releases the batch into sellable inventory.
10. The corresponding inventory movement is recorded exactly once.
11. The system confirms the release result and updated inventory status.

**Alternative and exception flows:**

- If the administrator lacks permission to record or release a batch, the system denies the requested action.
- If required batch information is invalid or incomplete, the system does not record the batch and indicates that correction is required.
- If a recorded batch has not been released, it does not increase sellable inventory.
- If the batch has already been released, the system must not apply the same inventory movement again.

**Postconditions:**

- A finished-perfume production batch has been recorded, or
- an authorised recorded batch has been released and the corresponding inventory movement has been applied exactly once.

**Business and scope rules:**

- Production-batch management is limited to finished-perfume batches associated with sellable variants.
- Recording a production batch does not itself alter sellable inventory.
- Sellable inventory changes only through the authorised batch-release workflow.
- Raw-material procurement, formulation, manufacturing scheduling and ERP functionality are outside the approved scope.
- This use case does not define database schema, APIs or backend implementation.
## Traceability

_To be completed after the approved use cases are defined._