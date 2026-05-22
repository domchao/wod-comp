import { test, expect } from "@playwright/test";

test("unauthenticated /dashboard redirects to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/");
  await expect(page.getByLabel("Email")).toBeVisible();
});

test("unauthenticated /group/:id redirects to login", async ({ page }) => {
  await page.goto("/group/00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL("/");
  await expect(page.getByLabel("Email")).toBeVisible();
});
