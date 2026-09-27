import { describe, expect, it, vi } from "vitest";

const boundary = vi.hoisted(() => ({
  cookies: vi.fn(),
  headers: vi.fn(),
  principal: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: boundary.cookies, headers: boundary.headers }));
vi.mock("next/navigation", () => ({ redirect: boundary.redirect }));
vi.mock("@/lib/auth/runtime", () => ({ getIdentityService: () => ({ principal: boundary.principal }) }));

import { NextRequest } from "next/server";
import ProtectedAdminLayout from "../../src/app/admin/(protected)/layout";
import { proxy } from "../../src/proxy";
import { SESSION_COOKIE } from "../../src/lib/auth/session-cookie";
import { ADMIN_NEXT_HEADER } from "../../src/modules/administration/ui/admin-auth-routing";

const origin = "https://palermo.example.test";
const administrator = { user: { id: "admin-1", role: "ADMIN", email: "admin@example.test", displayName: "Administrator" } };
const customer = { user: { id: "customer-1", role: "CUSTOMER", email: "customer@example.test", displayName: "Customer" } };

function request(path: string, session?: string): NextRequest {
  return session
    ? new NextRequest(`${origin}${path}`, { headers: { cookie: `${SESSION_COOKIE}=${session}` } })
    : new NextRequest(`${origin}${path}`);
}

function redirecting(): void {
  boundary.redirect.mockImplementation((location: string) => { throw new Error(`redirect:${location}`); });
}

describe("admin proxy and protected layout", () => {
  it("redirects anonymous admin deep links with their query intact", () => {
    const response = proxy(request("/admin/inventory?tab=low-stock"));
    expect(response.headers.get("location")).toBe(`${origin}/admin/login?next=%2Fadmin%2Finventory%3Ftab%3Dlow-stock`);
  });

  it("forwards a sanitized original destination for cookie-bearing requests", () => {
    const response = proxy(request("/admin/catalogue?view=active", "invalid"));
    expect(response.headers.get("x-middleware-request-x-palermo-admin-next")).toBe("/admin/catalogue?view=active");
    expect(response.headers.get("x-middleware-override-headers")).toContain(ADMIN_NEXT_HEADER);
  });

  it("redirects an invalid session through the authoritative layout", async () => {
    boundary.cookies.mockResolvedValue({ get: vi.fn().mockReturnValue({ value: "invalid" }) });
    boundary.headers.mockResolvedValue(new Headers([[ADMIN_NEXT_HEADER, "/admin/catalogue?view=active"]]));
    boundary.principal.mockResolvedValue(null);
    redirecting();

    await expect(ProtectedAdminLayout({ children: "protected" })).rejects.toThrow(
      "redirect:/admin/login?next=%2Fadmin%2Fcatalogue%3Fview%3Dactive",
    );
  });

  it("rejects CUSTOMER sessions and re-sanitizes the internal destination", async () => {
    boundary.cookies.mockResolvedValue({ get: vi.fn().mockReturnValue({ value: "customer" }) });
    boundary.headers.mockResolvedValue(new Headers([[ADMIN_NEXT_HEADER, "https://attacker.invalid/admin"]]));
    boundary.principal.mockResolvedValue(customer);
    redirecting();

    await expect(ProtectedAdminLayout({ children: "protected" })).rejects.toThrow("redirect:/admin/login?next=%2Fadmin");
  });

  it("allows ADMIN sessions to render the protected shell", async () => {
    boundary.cookies.mockResolvedValue({ get: vi.fn().mockReturnValue({ value: "admin" }) });
    boundary.headers.mockResolvedValue(new Headers([[ADMIN_NEXT_HEADER, "/admin/orders?state=paid"]]));
    boundary.principal.mockResolvedValue(administrator);
    boundary.redirect.mockReset();

    const layout = await ProtectedAdminLayout({ children: "protected" });
    expect(layout).toBeDefined();
    expect(boundary.redirect).not.toHaveBeenCalled();
  });
});
