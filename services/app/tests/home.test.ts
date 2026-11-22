import { expect, test } from "@playwright/test";

test("home redirects to the canonical projects route without authentication", async ({
  request,
}) => {
  const response = await request.get("/home", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("/projects");
});

test.describe("home server rendering", () => {
  test.use({ javaScriptEnabled: false });

  test("home content is available before hydration", async ({ page }) => {
    await page.goto("/home");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Your Projects",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("mobile home resolves to projects without the removed About action", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 402, height: 874 });
    await page.goto("/home");
    await expect(
      page.getByRole("link", { name: "About Agora", exact: true }),
    ).toHaveCount(0);
    await expect(page).toHaveURL("/projects");
    await expect(
      page.getByRole("banner").getByRole("button", {
        name: "Open navigation menu",
        exact: true,
      }),
    ).toBeVisible();
  });

  test("mobile detail renders its back navigation before hydration", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 402, height: 874 });
    await page.goto("/project/missing");
    const back = page
      .getByRole("banner")
      .getByRole("link", { name: "Back to projects", exact: true });
    await expect(back).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to projects", exact: true }),
    ).toHaveCount(1);
    await back.click();
    await expect(page).toHaveURL("/projects");
  });
});

test("home navigation uses a real route", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/home");
  const homeLink = page.getByRole("link", { name: "Home", exact: true });
  await expect(homeLink).toHaveAttribute("href", "/home");
  await expect(
    page.getByRole("link", { name: "Projects", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Your Projects", exact: true }),
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
      page.getByRole("heading", {
        level: 1,
        name: "Your Projects",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page).toHaveURL("/projects");
    await expect(page.getByText("A Greener Riverside")).toHaveCount(0);
    await expect(page.getByText("Jamie", { exact: true })).toHaveCount(0);
    for (const button of await page
      .getByRole("button", { name: "New project", exact: true })
      .all()) {
      await expect(button).toBeDisabled();
    }
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
  await expect(page).toHaveURL("/projects");
  await expect(page.getByRole("complementary")).toHaveJSProperty(
    "clientWidth",
    69,
  );
  await expect(
    page.getByRole("complementary").getByRole("button", {
      name: "Log in",
      exact: true,
    }),
  ).toBeVisible();
  await expand.click();
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
});

test("future product navigation stays disabled", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/home");
  await expect(
    page.getByRole("link", { name: "Projects", exact: true }),
  ).toHaveAttribute("href", "/projects");
  for (const name of ["History", "Explore", "Notifications"]) {
    await expect(
      page.getByRole("button", { name, exact: true }),
    ).toBeDisabled();
  }
});

test("sidebar follows the Figma groups without adding account identities", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/home");
  const sidebar = page.getByRole("complementary");
  await expect(
    sidebar.getByRole("heading", { name: "Facilitate", exact: true }),
  ).toBeVisible();
  await expect(
    sidebar.getByRole("heading", { name: "Participate", exact: true }),
  ).toBeVisible();
  await expect(sidebar.getByRole("button", { name: "Log in" })).toBeDisabled();
  await expect(sidebar.getByText("Workspace", { exact: true })).toHaveCount(0);
  await expect(sidebar.getByText("Jamie", { exact: true })).toHaveCount(0);
  await expect(sidebar.getByText(/Civic Tomorrow|Civic Tech/)).toHaveCount(0);
  await expect(
    sidebar.getByRole("button", { name: "Your account" }),
  ).toHaveCount(0);
  await expect(sidebar).toHaveJSProperty("clientWidth", 196);
  const disclosure = sidebar.getByRole("button", {
    name: "Expand or collapse projects",
  });
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  await expect(
    sidebar.getByRole("button", { name: "New project", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("main")).toContainText("Your Projects");
  await disclosure.click();
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await expect(
    sidebar.getByRole("button", { name: "New project", exact: true }),
  ).not.toBeVisible();
});

test("project disclosure survives collapse, drawer dismissal and breakpoint changes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/home");
  const disclosure = page.getByRole("button", {
    name: "Expand or collapse projects",
    exact: true,
  });
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Collapse navigation" }).click();
  await page.getByRole("button", { name: "Expand navigation" }).click();
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");

  await page.setViewportSize({ width: 402, height: 874 });
  const trigger = page.getByRole("button", {
    name: "Open navigation menu",
    exact: true,
  });
  const drawer = page.getByRole("dialog", {
    name: "Workspace navigation",
    exact: true,
  });
  await trigger.click();
  await expect(drawer).toBeVisible();
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  await disclosure.click();
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(drawer).toBeVisible();
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");

  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(drawer).toHaveCount(0);
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await page.setViewportSize({ width: 402, height: 874 });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(drawer).toHaveCount(0);
  await trigger.click();
  await expect(drawer).toBeVisible();
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 402, height: 874 },
]) {
  test(`Projects navigation preserves the disclosure choice at ${String(viewport.width)}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const mobile = viewport.width <= 760;
    await page.goto(mobile ? "/projects" : "/project/missing");
    const menu = page.getByRole("button", {
      name: "Open navigation menu",
      exact: true,
    });
    if (mobile) await menu.click();
    const navigation = mobile
      ? page.getByRole("dialog", { name: "Workspace navigation", exact: true })
      : page.getByRole("complementary");
    const projects = navigation.getByRole("link", {
      name: "Projects",
      exact: true,
    });
    const disclosure = page.getByRole("button", {
      name: "Expand or collapse projects",
      exact: true,
    });
    await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    await disclosure.click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");
    const documents: string[] = [];
    page.on("request", (request) => {
      if (request.isNavigationRequest()) documents.push(request.url());
    });

    // The row's padded area must behave like its label, not just the text.
    await projects.click({ position: { x: 8, y: 8 } });
    await expect(page).toHaveURL("/projects");
    if (mobile) await menu.click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");

    await projects.click();
    if (mobile) await menu.click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");
    await expect(page).toHaveURL("/projects");

    await projects.focus();
    await page.keyboard.press("Enter");
    if (mobile) await menu.click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");
    await disclosure.click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(documents).toEqual([]);
  });
}

test("the collapsed Projects icon navigates without changing sidebar expansion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/projects");
  await page
    .getByRole("button", { name: "Collapse navigation", exact: true })
    .click();
  await expect(page.getByRole("complementary")).toHaveJSProperty(
    "clientWidth",
    69,
  );
  await page.getByRole("link", { name: "Projects", exact: true }).click();
  await expect(page.getByRole("complementary")).toHaveJSProperty(
    "clientWidth",
    69,
  );
  await page
    .getByRole("button", { name: "Expand navigation", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Expand or collapse projects",
      exact: true,
    }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(page).toHaveURL("/projects");
});

test("home alias uses client-side routing without adding a duplicate overview", async ({
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
  await expect(
    page.getByRole("link", { name: "About Agora", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL("/projects");
  await expect(
    page.getByRole("heading", { name: "Your Projects", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
  expect(navigations).toEqual([]);
});

test("home navigation preserves the selected language", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/fr/home");
  await expect(
    page.getByRole("link", { name: "Accueil", exact: true }),
  ).toHaveAttribute("href", "/fr/home");
  await expect(page.locator('a[href="/fr/"]')).toHaveCount(0);
  await expect(page.locator('a[href="/fr/projects"]')).toHaveCount(1);
  await expect(page).toHaveURL("/fr/projects");
  await expect(page.getByRole("main")).toContainText("Vos projets");
});

test("RTL home places the sidebar on the right without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/fa/home");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page).toHaveURL("/fa/projects");
  await expect(page.getByRole("main")).toContainText("پروژه‌های شما");
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
