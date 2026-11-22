import { expect, test } from "@playwright/test";

for (const route of ["/", "/projects"]) {
  test(`${route} serves the local variable font and loads real italics on demand`, async ({
    page,
  }) => {
    const fonts: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "font") fonts.push(request.url());
    });
    await page.goto(route);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(page.locator("body")).toHaveCSS("font-synthesis", "none");
    await expect(page.locator("body")).toHaveCSS(
      "font-family",
      /"Albert Sans"/,
    );

    const preload = page.locator('link[rel="preload"][as="font"]');
    await expect(preload).toHaveCount(1);
    await expect(preload).toHaveAttribute(
      "href",
      /AlbertSans-Variable[.-].*\.woff2$/,
    );
    await expect(preload).toHaveAttribute("crossorigin");
    expect(fonts).toHaveLength(1);
    expect(fonts.at(0)).toMatch(/AlbertSans-Variable[.-].*\.woff2$/);

    const faces = await page.evaluate(() =>
      Array.from(document.fonts, (face) => ({
        family: face.family,
        weight: face.weight,
        style: face.style,
      })),
    );
    expect(faces).toEqual(
      expect.arrayContaining([
        { family: "Albert Sans", weight: "100 900", style: "normal" },
        { family: "Albert Sans", weight: "100 900", style: "italic" },
      ]),
    );

    await page.evaluate(async () => {
      const text = document.createElement("em");
      text.textContent = "A real italic Albert Sans face";
      text.style.fontFamily = '"Albert Sans"';
      text.style.fontWeight = "500";
      document.body.append(text);
      await document.fonts.load(
        'italic 500 16px "Albert Sans"',
        text.textContent,
      );
      await document.fonts.ready;
    });
    expect(fonts).toHaveLength(2);
    expect(fonts.at(1)).toMatch(/AlbertSans-Italic-Variable[.-].*\.woff2$/);
    for (const font of fonts) {
      expect(new URL(font).origin).toBe(new URL(page.url()).origin);
      expect(font).toContain("/_app/immutable/assets/");
    }
  });
}
