import { expect, test } from "@playwright/test";

test("facilitators can cancel from either opener and move a statement with its reason to history", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=agora-opinion-moderation-feed--facilitator&viewMode=story",
  );
  const article = page
    .getByRole("article")
    .filter({ hasText: "Create safer crossings" });
  const moderate = article.getByRole("button", {
    name: "Moderate",
    exact: true,
  });
  const overflow = article.getByRole("button", { name: "Statement actions" });
  const dialog = page.getByRole("dialog", { name: "Moderate statement" });
  const move = dialog.getByRole("button", { name: "Move", exact: true });
  await expect(article).toContainText("Participant statement");
  await expect(
    article.getByRole("list", { name: "Vote breakdown" }),
  ).toContainText("80 (62.5%)");
  await moderate.press("Enter");
  await expect(dialog).toContainText("Create safer crossings");
  await expect(dialog).toContainText(
    "can still read the statement and your reason",
  );
  await expect(move).toBeDisabled();
  await dialog.getByLabel("Explanation (optional)").fill("Discard this");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(moderate).toBeFocused();
  await overflow.press("Enter");
  await page
    .getByRole("menuitem", { name: "Moderate statement" })
    .press("Enter");
  await expect(dialog.getByLabel("Explanation (optional)")).toHaveValue("");
  await page.keyboard.press("Escape");
  await expect(overflow).toBeFocused();
  await moderate.click();
  await dialog.getByRole("button", { name: "Reason" }).click();
  await page.getByRole("option", { name: "Off-topic" }).click();
  await dialog.getByLabel("Explanation (optional)").fill("Already discussed.");
  await move.click();
  await expect(article).toHaveCount(0);
  await expect(page.getByRole("searchbox")).toBeFocused();
  await page.getByRole("radio", { name: /^Moderation History/ }).click();
  await expect(article).toContainText("Off-topic");
  await expect(article).toContainText("Already discussed.");
  await expect(article).toContainText("Participant statement");
  await expect(moderate).toHaveCount(0);
  await overflow.click();
  await expect(page.getByRole("menuitem")).toHaveCount(1);
  await expect(
    page.getByRole("menuitem", { name: "Copy statement" }),
  ).toBeVisible();
});

test("without moderation permission the overflow still copies the statement, not its badge or votes", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(
    "/iframe.html?id=agora-opinion-moderation-feed--read-only&viewMode=story",
  );
  const article = page
    .getByRole("article")
    .filter({ hasText: "Plant more trees" });
  await expect(article).toContainText("Seed statement");
  await expect(
    article.getByRole("button", { name: "Moderate", exact: true }),
  ).toHaveCount(0);
  await article.getByRole("button", { name: "Statement actions" }).click();
  await expect(page.getByRole("menuitem")).toHaveCount(1);
  await page.getByRole("menuitem", { name: "Copy statement" }).click();
  await expect(article.getByRole("status")).toHaveText("Statement copied");
  await expect
    .poll(
      async () =>
        await page.evaluate(async () => await navigator.clipboard.readText()),
    )
    .toBe("Plant more trees");
});

test("format edits save only the ordered backend fields; presets and manual limits edit the same value", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=agora-gathering-response-format-editor--editable-format&viewMode=story",
  );
  const launch = page.getByRole("button", { name: "Edit response format" });
  await launch.click();
  const field = page.getByRole("region", { name: "Field 1", exact: true });
  await field.getByRole("button", { name: "Answer format" }).click();
  await page.getByRole("option", { name: "Long answer" }).click();
  await expect(field.getByRole("spinbutton")).toHaveValue("2000");
  await field.getByRole("spinbutton").fill("777");
  await expect(
    field.getByRole("button", { name: "Answer format" }),
  ).toContainText("Custom limit");
  await field.getByLabel("Required").uncheck();
  await field.getByRole("button", { name: "Move Field 1 down" }).click();
  await page.getByRole("button", { name: "Save format" }).click();
  const saved: unknown = JSON.parse(
    await page.getByLabel("Saved format").innerText(),
  );
  expect(saved).toEqual([
    {
      fieldId: "00000000-0000-4000-a000-000000000002",
      label: "Body",
      required: true,
      characterLimit: 2000,
    },
    {
      fieldId: "00000000-0000-4000-a000-000000000001",
      label: "Title",
      required: false,
      characterLimit: 777,
    },
  ]);
  await launch.click();
  await page.getByRole("button", { name: "Add another field" }).click();
  await page.getByRole("button", { name: "Field 3", exact: true }).click();
  await page.getByRole("button", { name: "Save format" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  const invalidName = page
    .getByRole("region", { name: "Field 3" })
    .getByRole("textbox", { name: "Field name" });
  await expect(invalidName).toHaveAttribute("aria-invalid", "true");
  await expect(invalidName).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(launch).toBeFocused();
  await launch.click();
  await expect(page.getByRole("region", { name: /Field/ })).toHaveCount(2);
});

test("the format editor keeps at least one field and rejects empty or out-of-range character limits", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=agora-gathering-response-format-editor--editable-format&viewMode=story",
  );
  await page.getByRole("button", { name: "Edit response format" }).click();
  await page.getByRole("button", { name: "Remove Field 2" }).click();
  await expect(
    page.getByRole("button", { name: "Remove Field 1" }),
  ).toBeDisabled();
  const limit = page.getByRole("spinbutton");
  const save = page.getByRole("button", { name: "Save format" });
  for (const invalid of ["", "0", "20001", "1.5"]) {
    await limit.fill(invalid);
    await save.click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
  }
  await limit.fill("20000");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await limit.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Edit response format" }).click();
  await expect(limit).toHaveValue("20000");
  const add = page.getByRole("button", { name: "Add another field" });
  for (let i = 1; i < 6; i++) await add.click();
  await expect(add).toBeDisabled();
  await expect(page.getByRole("region", { name: /Field/ })).toHaveCount(6);
});
