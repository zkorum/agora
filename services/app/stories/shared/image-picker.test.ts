import { expect, test } from "@playwright/test";

const png = {
  name: "profile.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP9sAAAAASUVORK5CYII=",
    "base64",
  ),
};

test("local images can be selected, replaced and cleared without uploads", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=shared-image-picker--default&viewMode=story",
  );
  const uploads: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") uploads.push(request.method());
  });
  const input = page.getByLabel("Profile image", { exact: true });
  await expect(input).toHaveAccessibleDescription(
    "Local preview only. This image is not uploaded or saved.",
  );
  await input.focus();
  await expect(input).toBeFocused();
  await input.setInputFiles(png);
  const preview = page.getByRole("img", {
    name: "Profile image preview",
    exact: true,
  });
  await expect(preview).toHaveJSProperty("naturalWidth", 1);
  await expect(page.getByText("Replace image", { exact: true })).toBeVisible();
  const original = await preview.getAttribute("src");
  expect(original).toMatch(/^blob:/);
  await input.setInputFiles({ ...png, name: "replacement.png" });
  await expect(
    page.getByText("replacement.png", { exact: true }),
  ).toBeVisible();
  await expect(preview).not.toHaveAttribute("src", original ?? "");
  if (original) {
    expect(
      await page.evaluate(async (url) => {
        try {
          await fetch(url);
          return true;
        } catch {
          return false;
        }
      }, original),
    ).toBe(false);
  }
  await page
    .getByRole("button", { name: "Remove Profile image", exact: true })
    .click();
  await expect(preview).toHaveCount(0);
  await expect(input).toBeFocused();
  await expect(page.getByText("Choose image", { exact: true })).toBeVisible();
  await input.setInputFiles(png);
  await expect(preview).toHaveJSProperty("naturalWidth", 1);
  await page
    .getByRole("button", { name: "Clear externally", exact: true })
    .click();
  await expect(preview).toHaveCount(0);
  expect(uploads).toEqual([]);
});

test("invalid image selections report accessible errors without replacing the current preview", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=shared-image-picker--default&viewMode=story",
  );
  const input = page.getByLabel("Profile image", { exact: true });
  await input.setInputFiles(png);
  const preview = page.getByRole("img", {
    name: "Profile image preview",
    exact: true,
  });
  await expect(preview).toHaveJSProperty("naturalWidth", 1);
  const original = await preview.getAttribute("src");
  for (const file of [
    {
      name: "text.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    },
    {
      name: "oversized.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
    },
  ]) {
    await input.setInputFiles(file);
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("alert")).toContainText("up to 5 MB");
    await expect(preview).toHaveAttribute("src", original ?? "");
  }
  await input.setInputFiles({
    name: "broken.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.getByRole("alert")).toContainText("could not be displayed");
  await expect(preview).toHaveAttribute("src", original ?? "");
  await expect(page.getByText("broken.png")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Clear externally", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Restore externally", exact: true })
    .click();
  await expect(preview).toHaveJSProperty("naturalWidth", 1);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Set corrupt image externally" })
    .click();
  await expect(page.getByRole("alert")).toContainText("could not be displayed");
  await expect(preview).toHaveCount(0);
  await input.setInputFiles(png);
  await expect(preview).toHaveJSProperty("naturalWidth", 1);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("disabled image controls cannot be selected", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=shared-image-picker--disabled&viewMode=story",
  );
  await expect(
    page.getByLabel("Profile image", { exact: true }),
  ).toBeDisabled();
});

test("a newer invalid selection cancels an older pending candidate", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=shared-image-picker--default&viewMode=story",
  );
  const input = page.getByLabel("Profile image", { exact: true });
  await input.evaluate((element, base64) => {
    if (!(element instanceof HTMLInputElement))
      throw new Error("Missing picker");
    // Dispatch both changes in the same task so no image decode can finish
    // between them, regardless of browser or machine speed.
    for (const file of [
      new File(
        [Uint8Array.from(atob(base64), (byte) => byte.charCodeAt(0))],
        "candidate.png",
        { type: "image/png" },
      ),
      new File(["not an image"], "rejected.txt", { type: "text/plain" }),
    ]) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      element.files = transfer.files;
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, png.buffer.toString("base64"));
  await expect(page.getByRole("alert")).toContainText("up to 5 MB");
  await expect(
    page.getByRole("img", { name: "Profile image preview" }),
  ).toHaveCount(0);
});
