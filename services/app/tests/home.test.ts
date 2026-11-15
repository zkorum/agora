import { expect, test } from "@playwright/test";

test("home is a real production route without an authentication redirect", async ({
  request,
}) => {
  const response = await request.get("/home", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers().location).toBeUndefined();
});

test.describe("home server rendering", () => {
  test.use({ javaScriptEnabled: false });

  test("home content is available before hydration", async ({ page }) => {
    await page.goto("/home");
    await expect(
      page.getByRole("heading", { level: 1, name: "Home", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  });
});

test("home navigation uses a real route", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/home");
  const homeLink = page.getByRole("link", { name: "Home", exact: true });
  await expect(homeLink).toHaveAttribute("href", "/home");
  await expect(homeLink).toHaveAttribute("aria-current", "page");
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Home", exact: true }),
  ).toBeVisible();
});

test("home mobile navigation dismisses and restores keyboard focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto("/home");
  const trigger = page.getByRole("button", {
    name: "Open navigation menu",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Workspace navigation",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Home", exact: true }),
  ).toHaveAttribute("href", "/home");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 402, height: 874 },
]) {
  test(`home layout fits ${String(viewport.width)}px without marketing chrome`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize(viewport);
    await page.goto("/home");
    await expect(
      page.getByRole("heading", { level: 1, name: "Home", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveText("Home");
    await expect(page.getByText("A Greener Riverside")).toHaveCount(0);
    await expect(page.getByText("Jamie", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "New project", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText(
        "Agora helps people overcome disagreement and find consensus",
      ),
    ).toHaveCount(0);
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .getByRole("main")
        .evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
    ).toBe(true);
    expect(errors).toEqual([]);
    await testInfo.attach(`home-${String(viewport.width)}.png`, {
      body: await page.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
  });
}

test("home sidebar collapses without changing the route", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/home");
  const collapse = page.getByRole("button", {
    name: "Collapse navigation",
    exact: true,
  });
  await collapse.click();
  const expand = page.getByRole("button", {
    name: "Expand navigation",
    exact: true,
  });
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(page).toHaveURL("/home");
  await expect(
    page.getByRole("link", { name: "Home", exact: true }),
  ).toBeVisible();
  await expand.click();
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
});

test("future product navigation stays disabled", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/home");
  for (const name of [
    "Projects",
    "Participation history",
    "Explore",
    "Notifications",
  ]) {
    await expect(
      page.getByRole("button", { name, exact: true }),
    ).toBeDisabled();
  }
});

test("the landing link and browser back use client-side routing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/home");
  const navigations: string[] = [];
  page.on("request", (request) => {
    if (request.isNavigationRequest()) {
      navigations.push(request.url());
    }
  });
  await page.getByRole("link", { name: "About Agora", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL("/home");
  await expect(page.getByRole("main")).toHaveText("Home");
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
  expect(navigations).toEqual([]);
});

test("home navigation preserves the selected language", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/fr/home");
  await expect(
    page.getByRole("link", { name: "Accueil", exact: true }),
  ).toHaveAttribute("href", "/fr/home");
  await expect(page.locator('a[href="/fr/"]')).toHaveCount(1);
  await expect(page.getByRole("main")).toHaveText("Accueil");
});

test("RTL home places the sidebar on the right without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/fa/home");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("main")).toHaveText("خانه");
  const sidebar = await page.getByRole("complementary").boundingBox();
  const content = await page.getByRole("main").boundingBox();
  expect(sidebar).not.toBeNull();
  expect(content).not.toBeNull();
  if (sidebar !== null && content !== null) {
    expect(sidebar.x).toBeGreaterThanOrEqual(content.x + content.width);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("the root stays the landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/");
  await expect(
    page.getByText(
      "Agora helps people overcome disagreement and find consensus",
    ),
  ).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
});
