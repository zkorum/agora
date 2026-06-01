import { expect, test } from "@playwright/test";

test("landing page renders hero", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByText(
      "Agora helps people overcome disagreement and find consensus",
    ),
  ).toBeVisible();
});

test("hero calls to action link to landing sections", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Create a conversation" }).first(),
  ).toHaveAttribute("href", "#facilitators");
  await expect(
    page.getByRole("link", { name: "Explore conversations" }).first(),
  ).toHaveAttribute("href", "#citizens");
});
