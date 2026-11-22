import { expect, test } from "@playwright/test";

test("narrow RTL workspace tabs follow the reading direction without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(
    "/iframe.html?id=agora-conversation-workspace--mobile-rtl&viewMode=story",
  );
  await page.getByRole("tab", { name: "Setup" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("tabpanel", { name: "Moderation" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("method cards allow changing the selected method but not an unavailable one", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=agora-conversation-method-panel--prioritizing-with-unavailable-method&viewMode=story",
  );
  const bws = page.getByRole("radio", { name: "Best – Worst" });
  await expect(bws).toBeChecked();
  await page.getByText("Pairwise", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "Pairwise" })).toBeChecked();
  await expect(bws).not.toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Quadratic voting" }),
  ).toBeDisabled();
});
