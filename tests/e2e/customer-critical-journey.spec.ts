import { expect, test, type Page } from "playwright/test";

const customer = { email: "e2e.customer@example.test", password: "e2e-customer-password-393" };
const e2eCitrusProductPath = "/product/39300000-0000-4000-8000-000000000108";
const e2eOrderId = "39300000-0000-4000-8000-000000000112";
const e2eShipmentId = "39300000-0000-4000-8000-000000000113";

async function customerLogin(page: Page, next: string): Promise<void> {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(customer.email);
  await page.getByLabel("Password").fill(customer.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(next);
}

test("catalogue, cart, checkout boundary, and owned tracking work through the browser", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Sign in to continue" })).toBeVisible();

  await customerLogin(page, "/catalogue");
  await expect(page.getByRole("heading", { name: "E2E Citrus" }).first()).toBeVisible();
  await page
    .getByRole("region", { name: "Unisex fragrances" })
    .getByRole("link", { name: "View E2E Citrus" })
    .click();
  await expect(page).toHaveURL(new RegExp(`${e2eCitrusProductPath}$`));
  await expect(page.getByRole("heading", { name: "E2E Citrus" })).toBeVisible();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByText("E2E Citrus").first()).toBeVisible();
  const checkoutLink = page.getByRole("link", { name: /Proceed to checkout/ });
  await expect(checkoutLink).toBeVisible();
  await checkoutLink.click();
  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page.getByRole("button", { name: /Continue to payment/ })).toBeVisible();

  await page.goto("/orders");
  await expect(page.getByText("E2E-393")).toBeVisible();
  const orderResponse = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === "/api/orders/detail"
      && url.searchParams.get("id") === e2eOrderId;
  });
  const trackingResponse = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === "/api/tracking" && url.searchParams.get("orderId") === e2eOrderId;
  });
  await page.getByRole("button", { name: /E2E Citrus.*reference E2E-393/ }).click();
  const orderJson: unknown = await (await orderResponse).json();
  expect(orderJson).toMatchObject({ ok: true, data: { id: e2eOrderId, shipmentId: e2eShipmentId } });
  const tracking = await trackingResponse;
  expect(tracking.status()).toBe(200);
  const trackingJson: unknown = await tracking.json();
  expect(trackingJson).toMatchObject({
    ok: true,
    data: {
      shipmentId: e2eShipmentId,
      orderId: e2eOrderId,
      trackingReference: "E2E-TRACK-393",
      events: [{ description: "E2E deterministic transit event." }],
    },
  });
  await expect(page.getByText("Tracking reference E2E-TRACK-393")).toBeVisible();
  await expect(page.getByText("E2E deterministic transit event.")).toBeVisible();
});

test("support uses the real public and customer support boundaries", async ({ page }) => {
  await page.goto("/support");
  await expect(page.getByRole("heading", { name: "Ask the fragrance concierge", exact: true })).toBeVisible();
  await expect(page.getByText(/cannot issue refunds, take payments, change orders/)).toBeVisible();
  await expect(page.getByText("Public support")).toBeVisible();
  await page.getByLabel("Your message").fill("Please explain fragrance concentration.");
  await page.getByRole("button", { name: "Ask the concierge" }).click();
  await expect(page.getByRole("heading", { name: "The concierge could not respond", exact: true })).toBeVisible();

  await customerLogin(page, "/support");
  await expect(page.getByText("Customer session")).toBeVisible();
  await page.getByRole("radio", { name: /Delivery help/ }).check();
  await expect(page.getByLabel("Related order (optional)")).toBeVisible();
  await page.getByLabel("Related order (optional)").selectOption({ label: "E2E-393 · CONFIRMED" });
  await page.getByLabel("Your message").fill("Where is my delivery?");
  await page.getByRole("button", { name: "Ask the concierge" }).press("Enter");
  await expect(page.getByRole("heading", { name: "The concierge could not respond", exact: true })).toBeVisible();
});
