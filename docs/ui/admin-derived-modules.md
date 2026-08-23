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

## Inventory and Production Batch UI Requirements

### UI-INV-001 — Variant Inventory and Stock Movement

**Related use case:** `UC-INV-001`

**Related requirements:** `DER-INVENTORY-001`, `DER-INVENTORY-002`, `DER-INVENTORY-005`, `DER-INVENTORY-006`

**Related decisions:** `D-057`, `D-058`, `D-067`, `D-068`, `D-071`, `D-072`

**Primary user:** Administrator

#### Purpose

Provide an authorised administrator with an interface for viewing sellable perfume-variant stock, identifying low-stock variants and inspecting attributable inventory movements.

#### Required UI elements

The inventory interface shall provide:

* a list of sellable perfume variants;
* on-hand quantity;
* reserved or committed quantity;
* available quantity;
* low-stock status where applicable;
* an action for viewing a selected variant;
* inventory-movement history for the selected variant;
* movement quantity change;
* source or reason;
* reference information;
* timestamp information;
* an empty state when no movement records exist; and
* an access-denied state when the administrator lacks permission.

#### Interaction requirements

1. The administrator shall be able to open the inventory interface only when appropriately authorised.
2. The interface shall present stock at the sellable perfume-variant level.
3. The administrator shall be able to select a variant to inspect its stock and movement information.
4. The interface shall clearly distinguish on-hand, reserved or committed, and available quantities.
5. Variants at or below the configured low-stock threshold shall be visibly identified.
6. Selecting a variant shall display attributable inventory movements where available.
7. If no movement records exist, the interface shall display an appropriate empty state.
8. Viewing inventory information shall not directly modify stock quantities.

#### Access and security requirements

* Inventory information shall require authenticated administrator identity and appropriate server-authorised permission.
* UI visibility shall not be treated as the authorisation boundary.
* Inventory-management actions shall remain subject to approved access controls.

#### Scope constraints

* Inventory is tracked at sellable perfume-variant level.
* Available stock accounts for reserved or committed quantities.
* Automatic purchasing, replenishment or production ordering is outside the approved scope.
* This specification does not define inventory persistence, database schema, APIs or backend reservation controls.

### UI-INV-002 — Production Batch Recording and Release

**Related use case:** `UC-INV-002`

**Related requirements:** `DER-INVENTORY-003`, `DER-INVENTORY-004`

**Related decisions:** `D-057`, `D-058`, `D-069`, `D-070`

**Primary user:** Administrator

#### Purpose

Provide an authorised administrator with an interface for recording finished-perfume production batches and releasing approved batches into sellable inventory.

#### Required UI elements

The production-batch interface shall provide, where authorised:

* a list or view of recorded finished-perfume batches;
* selection of the applicable sellable perfume variant;
* fields for required finished-perfume batch information;
* an action for recording a batch;
* clear recorded and released status indicators;
* an authorised batch-release action;
* confirmation for batch release where appropriate;
* validation feedback for incomplete or invalid batch information;
* success feedback after recording or releasing a batch;
* an error state when the requested action cannot be completed; and
* an access-denied state when permission is missing.

#### Interaction requirements

1. The administrator shall be able to open the production-batch interface only when appropriately authorised.
2. The administrator shall be able to select a sellable perfume variant when recording a batch.
3. Required batch information shall be validated before the interface indicates successful recording.
4. Recording a batch shall not display an increase in sellable inventory.
5. A separately authorised release action shall be required before the batch affects sellable inventory.
6. The interface shall clearly distinguish a recorded batch from a released batch.
7. Before release, the interface shall request confirmation where appropriate.
8. After successful release, the interface shall display the resulting release status and updated inventory information.
9. A previously released batch shall not be presented as eligible for release again.
10. If the requested action fails, the interface shall clearly indicate that the inventory change was not completed.

#### Access and security requirements

* Production-batch recording and release shall require authenticated administrator identity and appropriate server-authorised permission.
* Batch release shall remain an authorised business-changing workflow.
* UI controls alone shall not determine whether release is permitted.

#### Scope constraints

* Production-batch UI is limited to finished-perfume batches linked to sellable variants.
* Raw-material procurement, formulation, manufacturing scheduling and ERP interfaces are outside scope.
* This specification does not define database schema, APIs, transaction handling or backend inventory implementation.

## Reviews and Fragrance Community UI Requirements

### UI-REV-001 — Customer Review Submission and Public Review Space

**Related use case:** `UC-REV-001`

**Related requirements:** `DER-REVIEW-001`, `DER-COMMUNITY-001`

**Related decisions:** `D-073`, `D-074`

**Primary user:** Customer

#### Purpose

Provide an authenticated customer with an interface for submitting one rating and short text review for an eligible purchased perfume, while supporting the approved shared public review space.

#### Required UI elements

The review interface shall provide, where applicable:

* an indication that the perfume is eligible for review;
* a rating input;
* a short-text review input;
* a review-submission action;
* validation feedback for missing or invalid review information;
* a message when the customer is not eligible to submit a review;
* a message when the customer has already submitted a review for the purchased perfume;
* public display of approved or currently visible reviews; and
* an empty state when no public reviews are available.

#### Interaction requirements

1. The customer shall be able to access the review-submission interface only for an eligible purchased perfume.
2. The interface shall allow one rating and one short text review to be submitted.
3. The interface shall validate required review information before indicating successful submission.
4. If the customer has not purchased the perfume, review submission shall not be available.
5. If the customer has already submitted a review for that purchased perfume, the interface shall not provide a second submission workflow.
6. After a successful submission, the interface shall confirm that the review has been received.
7. Publicly available reviews shall be presented as part of the shared Palermo fragrance-review space.
8. Reviews that have been hidden or removed through authorised moderation shall no longer be presented as publicly visible.

#### Access and scope requirements

* Review submission shall require authenticated customer identity and confirmed purchase eligibility.
* Public review viewing may be available to Customers and Visitors where permitted.
* The community interface shall be limited to the shared public review capability.
* Replies, likes, follows, direct messages and community feeds shall not be presented.
* The UI shall not introduce a separate social-network experience.

#### Scope constraints

* One rating and short text review is supported per purchased perfume.
* Review visibility remains subject to authorised moderation.
* This specification does not define review persistence, moderation algorithms, database schema or APIs.

### UI-REV-002 — Administrative Review Moderation

**Related use case:** `UC-REV-002`

**Related requirements:** `DER-REVIEW-001`

**Related decisions:** `D-057`, `D-058`, `D-063`, `D-073`

**Primary user:** Administrator

#### Purpose

Provide an authorised administrator with an interface for inspecting and moderating customer perfume reviews.

#### Required UI elements

The review-moderation interface shall provide:

* a list of reviews available for authorised moderation;
* the applicable perfume;
* customer rating;
* short text review;
* current review visibility or moderation state where applicable;
* an action to leave the review visible;
* an action to hide the review;
* an action to remove the review;
* confirmation for destructive moderation actions where appropriate;
* moderation-result feedback; and
* an access-denied state when the administrator lacks permission.

#### Interaction requirements

1. The administrator shall be able to access the review-moderation interface only when appropriately authorised.
2. The administrator shall be able to select a review for inspection.
3. The interface shall display the permitted review information required for moderation.
4. The administrator shall be able to choose an approved moderation action.
5. Hiding or removing a review shall require confirmation where appropriate.
6. After a successful moderation action, the interface shall display the updated review state.
7. If the selected review is no longer available, the interface shall indicate that moderation cannot be completed.
8. The interface shall not provide unsupported community-management controls.

#### Access and security requirements

* Review moderation shall require authenticated administrator identity and appropriate server-authorised permission.
* Moderation actions shall be auditable where applicable.
* UI controls shall not be treated as the authorisation boundary.

#### Scope constraints

* Moderation is limited to the approved public-review capability.
* Replies, likes, follows, direct messages and community-feed moderation are outside scope.
* This specification does not define backend moderation implementation, database schema or APIs.
## Loyalty, Subscription and Referral UI Requirements

### UI-LOY-001 — Loyalty Points and Redemption

**Related use case:** `UC-LOY-001`

**Related requirements:** `DER-LOYALTY-001`

**Related decisions:** `D-075`

**Primary user:** Customer

#### Purpose

Provide an authenticated customer with an interface for viewing available loyalty points and requesting redemption according to approved loyalty rules.

#### Required UI elements

The loyalty interface shall provide:

* the customer's current loyalty-point balance;
* applicable redemption information;
* available redemption actions where eligible;
* validation feedback when a redemption cannot be applied;
* confirmation after a successful redemption; and
* an appropriate state when no loyalty points are available.

#### Interaction requirements

1. The customer shall be able to open the loyalty area after authentication.
2. The interface shall display the customer's current loyalty-point balance.
3. The interface shall display applicable redemption information according to configured rules.
4. The customer shall be able to request redemption when sufficient eligible points are available.
5. The interface shall not indicate successful redemption until the request has been validated.
6. If the customer does not have sufficient points or does not meet the configured rules, the interface shall clearly indicate that redemption is unavailable.
7. After a successful redemption, the interface shall display the updated loyalty balance.

#### Scope constraints

* Loyalty is limited to simple points earned from qualifying completed orders.
* Loyalty tiers, VIP levels and membership-status systems shall not be presented.
* This specification does not define loyalty calculation, database schema, APIs or backend implementation.

### UI-SUB-001 — Subscription Opt-In and Opt-Out

**Related use case:** `UC-SUB-001`

**Related requirements:** `DER-SUBSCRIPTION-001`

**Related decisions:** `D-076`

**Primary user:** Customer

#### Purpose

Provide an authenticated customer with an interface for viewing and changing their basic Palermo subscription status.

#### Required UI elements

The subscription interface shall provide:

* the customer's current subscription status;
* an opt-in action when the customer is not subscribed;
* an opt-out action when the customer is subscribed;
* confirmation where appropriate before changing subscription status;
* success feedback after a completed change; and
* an error state when the requested change cannot be completed.

#### Interaction requirements

1. The customer shall be able to view their current subscription status.
2. The customer shall be able to request opt-in or opt-out according to their current status.
3. The interface shall request confirmation where appropriate.
4. After a successful change, the interface shall display the updated status.
5. If the requested status is already active, the interface shall indicate that no change is required.
6. If the request fails, the previous subscription status shall remain displayed.

#### Scope constraints

* Subscription capability is limited to a basic opt-in/opt-out record.
* Recurring billing shall not be presented.
* Automatic recurring perfume orders or deliveries shall not be presented.
* This specification does not define payment processing, recurring-order logic, database schema or APIs.

### UI-REF-001 — Referral Code, Link and Reward Status

**Related use case:** `UC-REF-001`

**Related requirements:** `DER-REFERRAL-001`

**Related decisions:** `D-077`

**Primary user:** Customer

#### Purpose

Provide an authenticated customer with an interface for viewing and using their unique referral code or link and viewing applicable referral-reward status.

#### Required UI elements

The referral interface shall provide:

* the customer's unique referral code or link;
* an action for copying the referral code or link;
* an available sharing action where supported;
* referral-status information where applicable;
* qualifying reward information; and
* feedback when a referral is invalid, ineligible or has already been rewarded.

#### Interaction requirements

1. The customer shall be able to open the referral area after authentication.
2. The interface shall display the customer's unique referral code or link.
3. The customer shall be able to copy the referral code or link.
4. Where a sharing option is provided, it shall share the referral information without introducing a Palermo social-network feature.
5. The interface may display whether a referral has satisfied the configured qualifying conditions.
6. Where a qualifying referral results in a loyalty reward, the interface shall display the applicable resulting status.
7. The interface shall not indicate duplicate rewards for the same qualifying referral.

#### Scope constraints

* Referral functionality is limited to a unique customer referral code or link and an approved qualifying reward.
* Referral rewards are limited to configured loyalty rewards.
* Multi-level referral systems and affiliate-programme functionality are outside scope.
* This specification does not define referral persistence, reward-processing implementation, APIs or database schema.
