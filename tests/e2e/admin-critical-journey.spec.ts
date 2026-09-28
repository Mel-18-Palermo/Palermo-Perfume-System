import { expect, test } from "playwright/test";

const admin = { email: "e2e.admin@example.test", password: "e2e-admin-password-393" };
const customer = { email: "e2e.customer@example.test", password: "e2e-customer-password-393" };

test("admin routes reject anonymous access and allow the fixed administrator fixture", async ({ page }) => {
  await page.goto("/admin/catalogue?view=active");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fcatalogue%3Fview%3Dactive$/);
  await expect(page.getByText("Operational console")).toHaveCount(0);

  await page.getByLabel("Email").fill(admin.email);
  await page.getByLabel("Password").fill(admin.password);
  await page.getByRole("button", { name: "Sign in to administration" }).click();

  await expect(page).toHaveURL(/\/admin\/catalogue\?view=active$/);
  await expect(page.getByText("Operational console", { exact: true })).toBeVisible();
  const administration = page.getByRole("navigation", { name: "Administration" });
  await expect(administration.getByRole("link", { name: "Orders", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Catalogue", exact: true })).toBeVisible();
  await expect(page.getByText("E2E Citrus").last()).toBeVisible();

  await page.goto("/admin/orders");
  await expect(page.getByText("Operational console", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Orders", exact: true })).toBeVisible();
  await expect(administration.getByRole("link", { name: "Orders", exact: true })).toHaveAttribute("aria-current", "page");

  await page.goto("/admin/inventory");
  await expect(page.getByRole("heading", { name: "Inventory", exact: true })).toBeVisible();
  await expect(page.getByRole("row", { name: /E2E-CITRUS-50/ })).toBeVisible();
});

test("customer sessions are redirected from protected admin deep links without an admin shell", async ({ page }) => {
  await page.goto("/login?next=/catalogue");
  await page.getByLabel("Email").fill(customer.email);
  await page.getByLabel("Password").fill(customer.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/catalogue$/);

  await page.goto("/admin/inventory?tab=low-stock");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Finventory%3Ftab%3Dlow-stock$/);
  await expect(page.getByRole("heading", { name: "Administrator sign in" })).toBeVisible();
  await expect(page.getByText("Operational console")).toHaveCount(0);
});

test("administrator uses real reporting, moderation and promotion boundaries", async ({ page }) => {
  await page.goto("/admin/login?next=/admin/reporting");
  await page.getByLabel("Email").fill(admin.email);
  await page.getByLabel("Password").fill(admin.password);
  await page.getByRole("button", { name: "Sign in to administration" }).click();
  await expect(page).toHaveURL(/\/admin\/reporting$/);

  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByText("Paid-order sales")).toBeVisible();
  await expect(page.getByText("Low-stock variants")).toBeVisible();

  await page.goto("/admin/reviews");
  await expect(page.getByRole("heading", { name: "Review moderation", exact: true })).toBeVisible();
  await expect(page.getByText("Persisted E2E moderation review.")).toBeVisible();
  const approve = page.getByRole("button", { name: "Approve" });
  await approve.focus();
  await expect(approve).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Approved").first()).toBeVisible();

  await page.goto("/admin/promotions");
  await expect(page.getByRole("heading", { name: "Promotions and content", exact: true })).toBeVisible();
  await page.getByLabel("Code").first().fill("E2E279");
  await page.getByLabel("Discount value").first().fill("1500");
  await page.getByRole("button", { name: "Create promotion" }).click();
  await expect(page.getByLabel("Code").last()).toHaveValue("E2E279");

  await page.getByLabel("Title").fill("E2E provider state");
  await page.getByLabel("Brief").fill("Verify the real unavailable provider state.");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText("E2E provider state")).toBeVisible();
  await page.getByRole("button", { name: "Generate preview" }).click();
  await expect(page.getByText(/Generation failed: PROVIDER_UNAVAILABLE/)).toBeVisible();
});
