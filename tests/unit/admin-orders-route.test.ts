import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthFault } from "../../src/lib/auth/errors";

const boundary = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
}));

vi.mock("@/lib/auth/runtime", () => ({
  getIdentityService: () => ({ requirePermission: boundary.requirePermission }),
}));
vi.mock("@/modules/administration/orders-runtime", () => ({
  getAdminOrdersService: () => ({ list: boundary.list, get: boundary.get }),
}));

import { GET as listOrders } from "../../src/app/api/admin/orders/route";
import { GET as getOrder } from "../../src/app/api/admin/orders/[id]/route";

const origin = "https://palermo.example.test";
const administrator = { user: { id: "admin-1", role: "ADMIN", email: "admin@example.test", displayName: "Administrator" }, permissions: ["orders:read"] };

describe("administrator orders API boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    boundary.requirePermission.mockRejectedValue(new AuthFault("UNAUTHENTICATED", "Sign in required."));
  });

  it("rejects unauthenticated and missing-permission callers before order reads", async () => {
    const request = new Request(`${origin}/api/admin/orders?page=1&pageSize=20`);
    expect((await listOrders(request)).status).toBe(401);
    expect(boundary.list).not.toHaveBeenCalled();

    boundary.requirePermission.mockRejectedValue(new AuthFault("FORBIDDEN", "Missing permission."));
    expect((await getOrder(new Request(`${origin}/api/admin/orders/order-1`), { params: Promise.resolve({ id: "order-1" }) })).status).toBe(403);
    expect(boundary.get).not.toHaveBeenCalled();
  });

  it("requires orders:read and forwards only validated route inputs to read services", async () => {
    boundary.requirePermission.mockResolvedValue(administrator);
    boundary.list.mockResolvedValue({ ok: true, data: { items: [], page: 2, pageSize: 5, hasMore: false } });
    boundary.get.mockResolvedValue({ ok: true, data: { id: "order-1" } });

    const listResponse = await listOrders(new Request(`${origin}/api/admin/orders?page=2&pageSize=5`));
    expect(listResponse.status).toBe(200);
    expect(listResponse.headers.get("cache-control")).toBe("no-store");
    expect(boundary.requirePermission).toHaveBeenCalledWith(undefined, "orders:read");
    expect(boundary.list).toHaveBeenCalledWith({ page: 2, pageSize: 5 });

    const detailResponse = await getOrder(new Request(`${origin}/api/admin/orders/order-1`), { params: Promise.resolve({ id: "order-1" }) });
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.headers.get("cache-control")).toBe("no-store");
    expect(boundary.get).toHaveBeenCalledWith("order-1");
  });
});
