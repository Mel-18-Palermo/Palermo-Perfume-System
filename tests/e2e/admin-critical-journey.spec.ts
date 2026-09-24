import { expect, test } from "playwright/test";

const admin = { email: "e2e.admin@example.test", password: "e2e-admin-password-393" };

test("admin routes reject anonymous access and allow the fixed administrator fixture", async ({ page }) => {
  await page.goto("/admin/catalogue");
  await expect(page).toHaveURL(/\/admin\/login\?next=/);

  await page.getByLabel("Email").fill(admin.email);
  await page.getByLabel("Password").fill(admin.password);
  await page.getByRole("button", { name: "Sign in to administration" }).click();

  await expect(page).toHaveURL(/\/admin\/catalogue$/);
  await expect(page.getByRole("heading", { name: "Catalogue", exact: true })).toBeVisible();
  await expect(page.getByText("E2E Citrus").last()).toBeVisible();
  await page.goto("/admin/inventory");
  await expect(page.getByRole("heading", { name: "Inventory", exact: true })).toBeVisible();
  await expect(page.getByRole("row", { name: /E2E-CITRUS-50/ })).toBeVisible();
});
