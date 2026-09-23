import { describe, expect, it } from "vitest";
import { createAdminHttpClient } from "../../src/lib/admin/client";

type RecordedCall = Readonly<{
  url: string;
  init: RequestInit | undefined;
}>;

function successResponse(data: unknown): Response {
  return new Response(
    JSON.stringify({
      ok: true,
      data,
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    },
  );
}

describe("administrator HTTP client routing", () => {
  it("uses GET query parameters for inventory and batch reads", async () => {
    const calls: RecordedCall[] = [];

    const fetcher = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      calls.push({
        url: String(input),
        init,
      });

      return successResponse({
        items: [],
        page: 1,
        pageSize: 20,
        hasMore: false,
      });
    };

    const client = createAdminHttpClient(fetcher as typeof fetch);

    await client.listInventory({
      page: 2,
      pageSize: 5,
    });

    await client.listBatches({
      page: 3,
      pageSize: 10,
    });

    expect(calls).toHaveLength(2);

    expect(calls[0]?.url)
      .toBe("/api/admin/inventory/inventory?page=2&pageSize=5");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(calls[0]?.init?.body).toBeUndefined();

    expect(calls[1]?.url)
      .toBe("/api/admin/inventory/batches?page=3&pageSize=10");
    expect(calls[1]?.init?.method).toBe("GET");
    expect(calls[1]?.init?.body).toBeUndefined();
  });

  it("routes batch mutations to the inventory boundary", async () => {
    const calls: RecordedCall[] = [];

    const fetcher = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      calls.push({
        url: String(input),
        init,
      });

      return successResponse({
        id: "24200000-0000-4000-8000-000000000099",
        variantId: "24200000-0000-4000-8000-000000000013",
        batchCode: "TEST-BATCH",
        producedQuantity: 5,
        status: "RECORDED",
        productionDate: "2026-09-07T00:00:00.000Z",
        releasedAt: null,
      });
    };

    const client = createAdminHttpClient(fetcher as typeof fetch);

    await client.createBatch({
      variantId: "24200000-0000-4000-8000-000000000013",
      batchCode: "TEST-BATCH",
      producedQuantity: 5,
      productionDate: "2026-09-07T00:00:00.000Z",
      idempotencyKey: "batch-create-test",
    });

    await client.releaseBatch({
      id: "24200000-0000-4000-8000-000000000099",
      idempotencyKey: "batch-release-test",
    });

    expect(calls[0]?.url)
      .toBe("/api/admin/inventory/batch-create");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.headers)
      .toEqual({ "content-type": "application/json" });

    expect(calls[1]?.url)
      .toBe("/api/admin/inventory/batch-release");
    expect(calls[1]?.init?.method).toBe("POST");
  });

  it("keeps catalogue and reporting reads on the catalogue boundary", async () => {
    const calls: RecordedCall[] = [];

    const fetcher = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      calls.push({
        url: String(input),
        init,
      });

      return successResponse({
        period: {
          from: "2026-09-01T00:00:00.000Z",
          to: "2026-10-01T00:00:00.000Z",
        },
        totalSales: {
          amountMinor: 0,
          currency: "AUD",
        },
        totalOrders: 0,
        bestSelling: [],
        lowStockVariantCount: 0,
      });
    };

    const client = createAdminHttpClient(fetcher as typeof fetch);

    await client.getDashboard({
      from: "2026-09-01T00:00:00.000Z",
      to: "2026-10-01T00:00:00.000Z",
    });

    expect(calls[0]?.url).toBe(
      "/api/admin/catalogue/dashboard?from=2026-09-01T00%3A00%3A00.000Z&to=2026-10-01T00%3A00%3A00.000Z",
    );
    expect(calls[0]?.init?.method).toBe("GET");
  });

  it("reads catalogue references from the administrator boundary", async () => {
    const calls: RecordedCall[] = [];
    const fetcher = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      calls.push({ url: String(input), init });
      return successResponse({ family: [], note: [], intensity: [], suitability: {
        occasion: [], mood: [], weather: [], daypart: [], season: [],
      } });
    };

    await createAdminHttpClient(fetcher as typeof fetch).getCatalogueReferences();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("/api/admin/catalogue/references");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(calls[0]?.init?.body).toBeUndefined();
  });
});
