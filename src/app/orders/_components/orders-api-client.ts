import { createApiClient } from "@/lib/api";
import { createMockApi } from "@/lib/api/mocks";

/**
 * Canonical mock composition for order-history/detail/tracking presentation (#259).
 * Real endpoints connect in Sprint 2 without any component redesign; do not add a fetch() fallback here.
 */
export const ordersPresentationApi = createApiClient(createMockApi({ actor: "CUSTOMER" }));
