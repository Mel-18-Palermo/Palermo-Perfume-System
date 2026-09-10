import { describe, expect, it, vi } from "vitest";
import { createAuthHttpClient } from "../../src/lib/auth/client";

describe("authentication HTTP adapter", () => {
  it("uses credentialed same-origin requests and the canonical session DTO", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true, data: { user: null } }));
    expect(await createAuthHttpClient(fetcher).getSession()).toEqual({ ok: true, data: { user: null } });
    expect(fetcher).toHaveBeenCalledWith("/api/auth/session", { method: "GET", credentials: "same-origin", cache: "no-store" });
  });
  it("rejects malformed successful payloads at the network boundary", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ok: true, data: { user: { role: "SUPER_ADMIN" } } }));
    expect(await createAuthHttpClient(fetcher).getSession()).toMatchObject({ ok: false, error: { code: "INTEGRATION_ERROR" } });
  });
  it("retains safe server errors and normalizes network failures", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ ok: false, error: { code: "UNAUTHENTICATED", message: "Invalid credentials." } }, { status: 401 })).mockRejectedValueOnce(new Error("private connection detail"));
    const api = createAuthHttpClient(fetcher);
    expect(await api.login({ email: "synthetic@example.test", password: "synthetic-password" })).toEqual({ ok: false, error: { code: "UNAUTHENTICATED", message: "Invalid credentials." } });
    expect(await api.getSession()).toEqual({ ok: false, error: { code: "TEMPORARILY_UNAVAILABLE", message: "Authentication is temporarily unavailable." } });
  });
});
