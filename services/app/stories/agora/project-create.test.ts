import { expect, test } from "@playwright/test";

test("Ask reveals one required public contact email and keeps it while toggling", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=agora-project-creation--default&viewMode=story",
  );
  const dialog = page.getByRole("dialog", { name: "New project", exact: true });
  const askEmail = dialog.getByLabel("Contact email", { exact: true });
  const choice = dialog.getByLabel("Email updates", { exact: true });
  await expect(askEmail).toHaveCount(0);
  await choice.click();
  await page
    .getByRole("option", { name: "Ask participants", exact: true })
    .click();
  await expect(choice).toBeFocused();
  await expect(askEmail).toBeVisible();
  await expect(askEmail).toHaveAttribute("required", "");
  await expect(askEmail).toHaveAccessibleDescription(
    "This email address will be shown publicly on the project page.",
  );
  await askEmail.fill("team@example.org");
  await expect(askEmail).toBeFocused();
  await choice.click();
  await page.getByRole("option", { name: "Don’t ask", exact: true }).click();
  await expect(askEmail).toHaveCount(0);
  await choice.click();
  await page
    .getByRole("option", { name: "Ask participants", exact: true })
    .click();
  await expect(askEmail).toHaveValue("team@example.org");
});

test("project language search uses the full field width inside the creation dialog", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto(
    "/iframe.html?id=agora-project-creation--default&viewMode=story",
  );
  const dialog = page.getByRole("dialog", { name: "New project", exact: true });
  await dialog
    .getByRole("navigation")
    .getByRole("button", {
      name: "Languages",
      exact: true,
    })
    .click();
  const input = dialog.getByRole("combobox", {
    name: "Additional languages",
    exact: true,
  });
  await input.click();
  const list = page.getByRole("listbox");
  await expect(list).toBeVisible();
  const field = await dialog
    .locator('[data-section="languages"]')
    .boundingBox();
  const menu = await list.boundingBox();
  expect(field).not.toBeNull();
  expect(menu).not.toBeNull();
  if (field && menu) {
    expect(Math.abs(field.width - menu.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(field.x - menu.x)).toBeLessThanOrEqual(1);
  }
  await input.pressSequentially("French");
  await page.getByRole("option", { name: "Français", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Remove Français", exact: true }),
  ).toBeVisible();
  await input.fill("not a supported language");
  await expect(
    page.getByText("No matching options", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(input).toHaveValue("");
  await expect(
    dialog.getByRole("button", { name: "Remove Français", exact: true }),
  ).toBeVisible();
  await expect(input).toBeFocused();
});

test("manual section scrolling updates navigation without moving the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(
    "/iframe.html?id=agora-project-creation--default&viewMode=story",
  );
  const dialog = page.getByRole("dialog", { name: "New project", exact: true });
  const section = dialog.getByRole("navigation").getByRole("button", {
    name: "Languages",
    exact: true,
  });
  await dialog.locator("fieldset").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(section).toHaveAttribute("aria-current", "location");
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await dialog
    .getByRole("navigation")
    .getByRole("button", {
      name: "Project details",
      exact: true,
    })
    .click();
  await expect(
    dialog.getByRole("navigation").getByRole("button", {
      name: "Project details",
      exact: true,
    }),
  ).toHaveAttribute("aria-current", "location");
  await expect(
    dialog.getByLabel("Project name", { exact: true }),
  ).toBeInViewport();
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("API failures retain the form instead of reporting a successful creation", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=agora-project-creation--creation-error&viewMode=story",
  );
  const dialog = page.getByRole("dialog", { name: "New project", exact: true });
  const name = dialog.getByLabel("Project name", { exact: true });
  await name.fill("Retain my input");
  await dialog
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Could not create the project",
  );
  await expect(name).toHaveValue("Retain my input");
  await expect(
    dialog.getByRole("button", { name: "Create project", exact: true }),
  ).toBeEnabled();
});

test("a pending mutation cannot be submitted again or dismissed accidentally", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=agora-project-creation--pending-submission&viewMode=story",
  );
  const dialog = page.getByRole("dialog", { name: "New project", exact: true });
  await dialog
    .getByLabel("Project name", { exact: true })
    .fill("Pending project");
  await dialog
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Creating...", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
});

test("missing organization permission disables project creation", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=agora-project-creation--no-organisations&viewMode=story",
  );
  const dialog = page.getByRole("dialog", { name: "New project", exact: true });
  await expect(dialog.getByRole("status")).toContainText(
    "No organisations are available",
  );
  await expect(
    dialog.getByRole("button", { name: "Create project", exact: true }),
  ).toBeDisabled();
});

test("organization loading failures provide a retry without enabling submit", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=agora-project-creation--organisation-loading-error&viewMode=story",
  );
  const dialog = page.getByRole("dialog", { name: "New project", exact: true });
  await expect(dialog.getByRole("alert")).toContainText(
    "Could not load organisations",
  );
  await expect(
    dialog.getByRole("button", { name: "Create project", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
});

test("creation uses local Figma artwork without stretching its geometry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1157 });
  await page.goto(
    "/iframe.html?id=agora-project-creation--default&viewMode=story",
  );
  const dialog = page.getByRole("dialog", { name: "New project", exact: true });
  expect((await dialog.boundingBox())?.width).toBe(1024);
  expect((await dialog.boundingBox())?.height).toBe(800);
  const images = dialog.locator("img");
  expect(await images.count()).toBeGreaterThanOrEqual(7);
  for (const image of await images.all()) {
    await expect(image).toHaveJSProperty("complete", true);
    await expect(image).not.toHaveJSProperty("naturalWidth", 0);
    const geometry = await image.evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      src: element.getAttribute("src"),
    }));
    expect(geometry.src).not.toContain("localhost:3845");
    const widths = [16, 20, 21.1094];
    expect(
      widths.some((width) => Math.abs(width - geometry.width) < 0.05),
    ).toBe(true);
    const heights = [16, 20, 10.8325];
    expect(
      heights.some((height) => Math.abs(height - geometry.height) < 0.05),
    ).toBe(true);
  }
});

test("creation leaves ownership and public credits for project settings", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=agora-project-creation--default&viewMode=story",
  );
  const dialog = page.getByRole("dialog", { name: "New project", exact: true });
  await expect(
    dialog.getByLabel("Managing organisation 1", { exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Add public credit", exact: true }),
  ).toHaveCount(0);
});
