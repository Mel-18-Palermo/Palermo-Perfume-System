# AUTH + PROFILE Decision Log

| ID | Decision |
|---|---|
| D-001 | Email verification automatically activates an eligible `PENDING_VERIFICATION` account. No normal administrator approval step. |
| D-002 | Customers may self-deactivate `ACTIVE` accounts. Sessions are invalidated; deactivation is not deletion; reactivation is not currently in scope. |
| D-003 | Registration requires name, email, and password only. Email is the unique login identifier; customer records use an opaque internal ID. |
| D-004 | One current delivery and one current billing address per customer. Billing may reuse delivery. Orders store immutable address snapshots. |
| D-005 | Preference profile contains favourite notes, preferred intensity, and optional non-medical sensitivity/avoidance data. Identity is generated output. |
| D-006 | Sensitivity means non-medical fragrance avoidance/preference data; medical/health information is excluded. |
| D-007 | Fragrance Identity is deterministic and rule-based, requires at least one positive preference input, and is explicitly regenerated after relevant profile changes. |
