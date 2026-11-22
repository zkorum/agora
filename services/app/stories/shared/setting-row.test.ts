import { expect, test } from "@playwright/test";

test("the whole setting is one named, keyboard-operable switch", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=shared-setting-row--off&viewMode=story");
  const setting = page.getByRole("switch", {
    name: "Guest participation",
    exact: true,
  });
  const changes = page.getByLabel("Setting changes");
  await expect(setting).toHaveAccessibleDescription(
    "People can take part without verifying their identity.",
  );
  // The far edge of the card is outside the text, icon and visual track.
  await setting.click({ position: { x: 80, y: 5 } });
  await expect(setting).toBeChecked();
  await expect(changes).toHaveText("1");
  await page
    .getByText("People can take part without verifying their identity.")
    .click();
  await expect(setting).not.toBeChecked();
  await expect(changes).toHaveText("2");
  await setting.press("Space");
  await expect(setting).toBeFocused();
  await expect(setting).toBeChecked();
  await expect(changes).toHaveText("3");
});

test("disabled setting cards ignore clicks anywhere on the row", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=shared-setting-row--disabled&viewMode=story",
  );
  const setting = page.getByRole("switch", {
    name: "Guest participation",
    exact: true,
  });
  await expect(setting).toBeDisabled();
  await setting.click({ force: true, position: { x: 80, y: 5 } });
  await page
    .getByText("Guest participation", { exact: true })
    .click({ force: true });
  await expect(setting).not.toBeChecked();
  await expect(page.getByLabel("Setting changes")).toHaveText("0");
});
