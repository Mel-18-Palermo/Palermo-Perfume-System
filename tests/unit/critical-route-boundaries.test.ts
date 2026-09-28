import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthFault } from "../../src/lib/auth/errors";

const boundary = vi.hoisted(() => ({
  principal: vi.fn(),
  requirePermission: vi.fn(),
  tracking: vi.fn(),
  catalogueReferences: vi.fn(),
  inventory: vi.fn(),
  recommend: vi.fn(),
}));

vi.mock("@/lib/auth/runtime", () => ({
  getIdentityService: () => ({
    principal: boundary.principal,
    requirePermission: boundary.requirePermission,
  }),
}));
vi.mock("@/modules/delivery/runtime", () => ({
  getDeliveryService: () => ({ get: boundary.tracking }),
}));
vi.mock("@/modules/catalogue/admin-runtime", () => ({
  getAdminCatalogueService: () => ({ references: boundary.catalogueReferences }),
}));
vi.mock("@/modules/administration/reporting-runtime", () => ({
  getAdminReportingService: () => ({ dashboard: vi.fn() }),
}));
vi.mock("@/modules/inventory/runtime", () => ({
  getInventoryService: () => ({ listInventory: boundary.inventory }),
}));
vi.mock("@/integrations/ai/runtime", () => ({
  getAiRecommendationService: () => ({ recommend: boundary.recommend }),
}));
vi.mock("@/modules/discovery/runtime", () => ({
  getDiscoveryService: () => ({ getQuiz: vi.fn() }),
}));

import { GET as trackingGet } from "../../src/app/api/tracking/route";
import { GET as catalogueGet } from "../../src/app/api/admin/catalogue/[operation]/route";
import { GET as inventoryGet } from "../../src/app/api/admin/inventory/[operation]/route";
import { POST as recommendationsPost } from "../../src/app/api/recommendations/[operation]/route";

const origin = "https://palermo.example.test";
const customer = { user: { id: "customer-1", role: "CUSTOMER", email: "customer@example.test", displayName: "Customer" } };
const administrator = { user: { id: "admin-1", role: "ADMIN", email: "admin@example.test", displayName: "Administrator" }, permissions: ["catalogue:manage", "inventory:manage"] };

describe("critical public route boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    boundary.principal.mockResolvedValue(null);
    boundary.requirePermission.mockRejectedValue(new AuthFault("UNAUTHENTICATED", "Sign in required."));
  });

  it("requires a customer session before returning owned shipment tracking", async () => {
    const request = new Request(`${origin}/api/tracking?orderId=order-1`);
    expect((await trackingGet(request)).status).toBe(401);
    expect(boundary.tracking).not.toHaveBeenCalled();

    boundary.principal.mockResolvedValue(customer);
    boundary.tracking.mockResolvedValue({ ok: true, data: { orderId: "order-1", status: "IN_TRANSIT" } });
    const response = await trackingGet(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ ok: true, data: { orderId: "order-1" } });
    expect(boundary.tracking).toHaveBeenCalledWith({ kind: "CUSTOMER", customerId: "customer-1" }, "order-1");
  });

  it("keeps catalogue administration behind its permission boundary", async () => {
    boundary.requirePermission.mockRejectedValue(new AuthFault("FORBIDDEN", "Missing permission."));
    const denied = await catalogueGet(new Request(`${origin}/api/admin/catalogue/references`), { params: Promise.resolve({ operation: "references" }) });
    expect(denied.status).toBe(403);
    expect(boundary.catalogueReferences).not.toHaveBeenCalled();

    boundary.requirePermission.mockResolvedValue(administrator);
    boundary.catalogueReferences.mockResolvedValue({ ok: true, data: { families: [] } });
    const allowed = await catalogueGet(new Request(`${origin}/api/admin/catalogue/references`), { params: Promise.resolve({ operation: "references" }) });
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toMatchObject({ ok: true, data: { families: [] } });
    expect(boundary.requirePermission).toHaveBeenLastCalledWith(undefined, "catalogue:manage");
  });

  it("returns inventory only through the inventory administration permission boundary", async () => {
    boundary.requirePermission.mockRejectedValue(new AuthFault("FORBIDDEN", "Missing permission."));
    const denied = await inventoryGet(new Request(`${origin}/api/admin/inventory/inventory?page=1&pageSize=20`), { params: Promise.resolve({ operation: "inventory" }) });
    expect(denied.status).toBe(403);
    expect(boundary.inventory).not.toHaveBeenCalled();

    boundary.requirePermission.mockResolvedValue(administrator);
    boundary.inventory.mockResolvedValue({ ok: true, data: { items: [], page: 1, pageSize: 20, hasMore: false } });
    const response = await inventoryGet(new Request(`${origin}/api/admin/inventory/inventory?page=1&pageSize=20`), { params: Promise.resolve({ operation: "inventory" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, data: { items: [] } });
    expect(boundary.inventory).toHaveBeenCalledWith({ adminId: "admin-1", permissions: ["catalogue:manage", "inventory:manage"] }, { page: 1, pageSize: 20 });
  });

  it("returns the isolated deterministic recommendation fallback through the public contract", async () => {
    boundary.recommend.mockResolvedValue({ ok: true, data: { provider: "DETERMINISTIC", result: { fallback: true, items: [] } } });
    const response = await recommendationsPost(new Request(`${origin}/api/recommendations/generate`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ quizId: "quiz-1" }),
    }), { params: Promise.resolve({ operation: "generate" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true, data: { fallback: true, items: [] } });
    expect(boundary.recommend).toHaveBeenCalledWith({ quizId: "quiz-1" });
  });
});
