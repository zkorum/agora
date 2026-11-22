import { expect, test } from "@playwright/test";

test("project creation is unavailable without an explicitly enabled adapter", async ({
  page,
}) => {
  await page.goto("/projects");
  await expect(
    page.getByRole("heading", { level: 1, name: "Your Projects", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const create = page.getByRole("button", { name: "New project", exact: true });
  await expect(create.first()).toBeVisible();
  for (const button of await create.all()) {
    await expect(button).toBeDisabled();
  }
  await expect(
    page.getByText("Civic Tomorrow Collective", { exact: true }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
});

test("visitors can open general settings from mobile navigation before login", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/projects");
  const navigation = page.getByRole("button", { name: "Open navigation menu" });
  await navigation.click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();

  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await expect(settings).toBeVisible();
  for (const name of [
    "Privacy policy",
    "Terms of service",
    "Community guidelines",
  ]) {
    await settings.getByRole("button", { name, exact: true }).click();
    await expect(
      settings.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  }
  await expect(
    settings.getByText("Delete account", { exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(settings).not.toBeVisible();
});

test("visitors can switch display language from the collapsed workspace sidebar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/projects?source=invite");
  await page.getByRole("button", { name: "Collapse navigation" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await settings
    .getByRole("button", { name: "Display language", exact: true })
    .click();
  await page.getByRole("option", { name: "Français", exact: true }).click();
  await expect(page).toHaveURL(/\/fr\/projects\?source=invite$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});

test.describe("project SSR", () => {
  test.use({ javaScriptEnabled: false });

  test("renders the project shell before browser mock data is available", async ({
    page,
  }) => {
    await page.goto("/projects");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Your Projects",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(
      page.getByText("Civic Tomorrow Collective", { exact: true }),
    ).toHaveCount(0);
  });
});
