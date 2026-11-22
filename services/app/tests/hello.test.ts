import { readFile } from "node:fs/promises";

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

test("landing mobile drawer traps focus, restores it and closes at desktop width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto("/");
  const trigger = page.getByRole("button", {
    name: "Open navigation menu",
    exact: true,
  });
  const dialog = page.getByRole("dialog", {
    name: "Navigation menu",
    exact: true,
  });
  await trigger.click();
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole("button", {
    name: "Close navigation menu",
    exact: true,
  });
  await close.focus();
  await page.keyboard.press("Shift+Tab");
  expect(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 874 });
  await expect(dialog).not.toBeVisible();
  await page.setViewportSize({ width: 402, height: 874 });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(dialog).toBeVisible();
  await close.click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("the retired preview route is not an application page", async ({
  request,
}) => {
  const response = await request.get("/dev/design-system");
  expect(response.status()).toBe(404);
});

test("the empty app does not emit unused mock data", async () => {
  for (const output of ["client", "server"]) {
    const manifest: unknown = JSON.parse(
      await readFile(
        new URL(
          `../.svelte-kit/output/${output}/.vite/manifest.json`,
          import.meta.url,
        ),
        "utf8",
      ),
    );
    if (typeof manifest !== "object" || manifest === null) {
      throw new Error("Expected a Vite production manifest object");
    }
    expect(
      Object.keys(manifest).filter((id) => id.includes("/lib/mock-data.")),
    ).toEqual([]);
    expect(
      Object.keys(manifest).filter((id) => id.includes("/api/agora/mock/")),
    ).toEqual([]);
  }
});

test("missing resources retain their not-found status", async ({ request }) => {
  const response = await request.get("/resources/not-a-real-resource");
  expect(response.status()).toBe(404);
});
