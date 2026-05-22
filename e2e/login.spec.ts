import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders email and password inputs", async ({ page }) => {
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("renders sign in submit button", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("renders Continue with Google button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
  });

  test("sign up toggle switches the form to sign up mode", async ({ page }) => {
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page.getByText(/Already have an account/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
  });

  test("sign in toggle switches back from sign up mode", async ({ page }) => {
    await page.getByRole("button", { name: "Sign up" }).click();
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/Don't have an account/i)).toBeVisible();
  });
});
