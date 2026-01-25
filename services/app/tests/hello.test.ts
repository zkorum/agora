import { expect, test } from "@playwright/test";

test("landing page renders greeting", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("Agora");
  await expect(page.locator("p")).toHaveText("Hello, world!");
});

test("button click updates greeting", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Click me" }).click();
  await expect(page.locator("p")).toHaveText("Hello! You've clicked 1 time.");
});
