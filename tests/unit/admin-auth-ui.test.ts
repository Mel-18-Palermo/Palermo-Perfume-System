import { describe, expect, it } from "vitest";
import type { Session } from "../../src/contracts/auth";
import { createMockApi } from "../../src/lib/api/mocks";
import { adminLoginHref, adminSessionDestination } from "../../src/modules/administration/ui/admin-auth-routing";
import { safeNextPath } from "../../src/modules/identity/ui/safe-next-path";
import { adminSections } from "../../src/modules/administration/ui/admin-sections";

const administrator: Session = {
  user: { id: "admin-1", role: "ADMIN", email: "admin@example.test", displayName: "Administrator" },
};
const customer: Session = {
  user: { id: "customer-1", role: "CUSTOMER", email: "customer@example.test", displayName: "Customer" },
};

describe("administrator authentication UI behaviour", () => {
  it("creates an ADMIN session through the dedicated login operation", async () => {
    const api = createMockApi({ actor: "ADMIN" });
    const result = await api.auth.adminLogin({ email: "admin@example.test", password: "synthetic-only" });
    expect(result).toMatchObject({ ok: true, data: { user: { role: "ADMIN" } } });
  });

  it("surfaces a failed administrator login without creating authority", async () => {
    const api = createMockApi();
    expect(await api.auth.adminLogin({ email: "admin@example.test", password: "synthetic-only" }))
      .toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    expect((await api.auth.getSession())).toEqual({ ok: true, data: { user: null } });
  });

  it("redirects an existing ADMIN session away from login, but never a customer session", () => {
    expect(adminSessionDestination(administrator, "/admin/inventory")).toBe("/admin/inventory");
    expect(adminSessionDestination(customer, "/admin/inventory")).toBeNull();
  });

  it("sends an anonymous admin route to administrator sign-in", () => {
    expect(adminLoginHref("/admin/reporting")).toBe("/admin/login?next=%2Fadmin%2Freporting");
  });

  it("includes a dedicated Security destination in administrator navigation", () => {
    expect(adminSections.security).toMatchObject({ href: "/admin/security", title: "Security" });
  });

  it("rejects external next paths", () => {
    expect(safeNextPath("https://attacker.invalid", "/admin")).toBe("/admin");
    expect(safeNextPath("//attacker.invalid", "/admin")).toBe("/admin");
    expect(safeNextPath("/admin/inventory?tab=stock", "/admin")).toBe("/admin/inventory?tab=stock");
  });

  it("clears the session after administrator logout", async () => {
    const api = createMockApi({ actor: "ADMIN" });
    await api.auth.logout();
    expect(await api.auth.getSession()).toEqual({ ok: true, data: { user: null } });
  });
});
