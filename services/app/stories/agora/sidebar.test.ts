import { expect, test } from "@playwright/test";

test("Storybook uses the same repository-owned font faces as the app", async ({
  page,
}) => {
  const fonts: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font") fonts.push(request.url());
  });
  await page.goto("/iframe.html?id=agora-app-shell--workspace&viewMode=story");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await expect(page.getByRole("main")).toHaveCSS(
    "font-family",
    /"Albert Sans"/,
  );
  expect(fonts).toHaveLength(1);
  expect(fonts.at(0)).toMatch(/AlbertSans-Variable[.-].*\.woff2$/);
  for (const font of fonts) {
    expect(new URL(font).origin).toBe(new URL(page.url()).origin);
  }
  expect(
    await page.evaluate(async () => {
      const faces = await document.fonts.load(
        'italic 600 16px "Albert Sans"',
        "Agora",
      );
      return faces.map((face) => ({
        family: face.family,
        style: face.style,
        status: face.status,
      }));
    }),
  ).toEqual([{ family: "Albert Sans", style: "italic", status: "loaded" }]);
});

test("navigation actions update the controlled selection", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/iframe.html?id=agora-app-shell--workspace&viewMode=story");
  const history = page.getByRole("button", { name: "History", exact: true });
  await history.click();
  await expect(history).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("main")).toContainText(
    "Current navigation item: history.",
  );
  await expect(
    page.getByRole("button", { name: "Projects", exact: true }),
  ).not.toHaveAttribute("aria-current");
});

test("Projects selection does not override the user's disclosure choice", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=agora-app-shell--workspace&viewMode=story");
  const projects = page.getByRole("button", { name: "Projects", exact: true });
  const disclosure = page.getByRole("button", {
    name: "Expand or collapse projects",
    exact: true,
  });
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  await disclosure.click();
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await projects.click();
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await projects.focus();
  await page.keyboard.press("Enter");
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await disclosure.click();
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
});

test("the account menu stays personal and restores keyboard focus", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=agora-account-menu--personal-account&viewMode=story",
  );
  const trigger = page.getByRole("button", {
    name: "Your account: Jamie",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu", { name: "Your account", exact: true });
  await expect(menu).toBeVisible();
  await expect(menu.getByText("Personal", { exact: true })).toBeVisible();
  await expect(menu.getByText("Jamie", { exact: true })).toBeVisible();
  await expect(menu.getByRole("menuitemradio")).toHaveCount(0);
  await expect(
    menu.getByRole("menuitem", { name: "Settings", exact: true }),
  ).toHaveCount(0);
  for (const name of ["Manage organizations", "Log out"]) {
    await expect(
      menu.getByRole("menuitem", { name, exact: true }),
    ).toBeDisabled();
  }
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("account actions are enabled independently", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=agora-account-menu--partial-actions&viewMode=story",
  );
  await page.getByRole("button", { name: "Your account: Jamie" }).click();
  const organizations = page.getByRole("menuitem", {
    name: "Manage organizations",
    exact: true,
  });
  await expect(organizations).toBeEnabled();
  await expect(
    page.getByRole("menuitem", { name: "Log out", exact: true }),
  ).toBeDisabled();
  await organizations.click();
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("user names and initials render as text, not executable markup", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const dialogs: string[] = [];
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });
  await page.goto(
    "/iframe.html?id=agora-account-menu--untrusted-looking-name&viewMode=story",
  );
  const name = "<img src=x onerror=alert(1)>";
  await page.getByRole("button", { name: `Your account: ${name}` }).click();
  const menu = page.getByRole("menu");
  await expect(menu.getByText(name, { exact: true })).toBeVisible();
  await expect(menu.getByText("<J>", { exact: true })).toBeVisible();
  await expect(page.locator("img[onerror]")).toHaveCount(0);
  expect(dialogs).toEqual([]);
  expect(errors).toEqual([]);
});

for (const story of ["workspace", "rtl"]) {
  test(`${story}: responsive changes dispose hidden account menus and drawers`, async ({
    page,
  }) => {
    const mobile = { width: 767, height: 874 };
    const desktop = { width: 768, height: 874 };
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/iframe.html?id=agora-app-shell--${story}&viewMode=story`);
    const trigger = page.getByRole("button", {
      name: "Your account: Jamie",
      exact: true,
    });
    await trigger.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.setViewportSize(mobile);
    await expect(page.getByRole("menu")).toHaveCount(0);
    await trigger.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.setViewportSize(desktop);
    await expect(page.getByRole("menu")).toHaveCount(0);
    await page.setViewportSize(mobile);
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    const drawer = page.getByRole("dialog", {
      name: "Workspace navigation",
      exact: true,
    });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: "Your account: Jamie" }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(drawer).toBeVisible();
    await expect(
      drawer.getByRole("button", { name: "Your account: Jamie" }),
    ).toBeFocused();
    await drawer.getByRole("button", { name: "Your account: Jamie" }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.setViewportSize(desktop);
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(drawer).toHaveCount(0);
    await page.setViewportSize(mobile);
    await expect(
      page.getByRole("button", { name: "Open navigation menu" }),
    ).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(page.getByRole("menu")).toBeVisible();
  });
}

test("sidebar icons load locally with their exported dimensions", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=agora-workspace-sidebar--children-expanded&viewMode=story",
  );
  await expect(
    page.getByRole("button", { name: "Expand or collapse projects" }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("[data-workspace-sidebar]")).toHaveCSS(
    "width",
    "196px",
  );
  const icons = page.locator("img[data-navigation-icon]");
  expect(await icons.count()).toBeGreaterThan(0);
  for (const icon of await icons.all()) {
    await expect(icon).toHaveJSProperty("complete", true);
    await expect(icon).not.toHaveJSProperty("naturalWidth", 0);
    const dimensions = await icon.evaluate((element) => ({
      width: element.getAttribute("width"),
      height: element.getAttribute("height"),
      renderedWidth: element.getBoundingClientRect().width,
      renderedHeight: element.getBoundingClientRect().height,
      src: element.getAttribute("src"),
    }));
    expect(dimensions.renderedWidth).toBe(Number(dimensions.width));
    expect(dimensions.renderedHeight).toBe(Number(dimensions.height));
    expect(dimensions.src).not.toContain("localhost:3845");
  }
});
