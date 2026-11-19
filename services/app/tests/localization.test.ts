import { expect, test } from "@playwright/test";

import { locales } from "../src/lib/paraglide/runtime.js";

for (const locale of locales) {
  test(`${locale}: localized FAQ and case study work on mobile`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const prefix = locale === "en" ? "" : `/${locale}`;
    await page.goto(`${prefix}/`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute(
      "dir",
      ["ar", "fa", "he"].includes(locale) ? "rtl" : "ltr",
    );

    const comparison = page.locator("#faq details details").filter({
      has: page.locator("table"),
    });
    await page
      .locator("#faq > div > div > details")
      .filter({
        has: page.locator("table"),
      })
      .locator(":scope > summary")
      .click();
    await comparison.locator(":scope > summary").click();
    const table = comparison.getByRole("table");
    await expect(
      table.getByRole("columnheader", { name: "Agora", exact: true }),
    ).toBeVisible();
    await expect(
      table.getByRole("columnheader", { name: "Pol.is", exact: true }),
    ).toBeVisible();
    expect(
      await table.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);

    const card = page.locator(
      `#resources a[href="${prefix}/resources/ai-charter-workshop"]`,
    );
    await expect(card.locator("picture source").first()).toHaveAttribute(
      "srcset",
      /.+/,
    );
    await card.click();
    await expect(page).toHaveURL(
      new RegExp(`${prefix}/resources/ai-charter-workshop/?$`),
    );
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("article img").first()).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
  });
}

test("explicit locale links override a different saved preference", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("displayLanguage", "en");
  });
  await page.goto("/fr/resources/ai-charter-workshop");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "règles d’IA",
  );
});

test("retired resource bookmarks redirect to the localized resources index", async ({
  request,
}) => {
  const response = await request.get(
    "/ar/resources/broadcasting-to-broadlistening?source=bookmark",
    { maxRedirects: 0 },
  );

  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("/ar/resources?source=bookmark");
});

test("initial homepage visits use the saved language preference", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("displayLanguage", "fr");
  });
  await page.goto("/?source=review#faq");
  await expect(page).toHaveURL(/\/fr\?source=review#faq$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});

test("unprefixed English resource links override a saved French preference", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("displayLanguage", "fr");
  });
  await page.goto("/resources/ai-charter-workshop");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "AI Rules",
  );
});

test("language switching preserves the current resource, query and anchor", async ({
  page,
}) => {
  await page.goto("/resources/ai-charter-workshop?source=review#details");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("option")).toHaveCount(locales.length);
  await page.getByRole("option", { name: "Français", exact: true }).click();
  await expect(page).toHaveURL(
    /\/fr\/resources\/ai-charter-workshop\?source=review#details$/,
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("RTL pages retain their direction", async ({ page }) => {
    await page.goto("/ar/resources/ai-charter-workshop");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
