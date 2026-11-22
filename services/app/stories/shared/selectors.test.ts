import { expect, test } from "@playwright/test";

test("toolbar selectors reuse compact chrome without increasing row height", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(
    "/iframe.html?id=shared-collection-toolbar--grid&viewMode=story",
  );
  for (const name of ["Sort by", "Filter collection"]) {
    const control = page.getByRole("button", { name, exact: true });
    await expect(control).toBeDisabled();
    expect((await control.boundingBox())?.height).toBe(42);
  }
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(
    page.getByRole("button", { name: "Sort by", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sort by: Recent", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("field Select anchors a readable full-width menu and skips disabled options", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=shared-select--default&viewMode=story");
  const control = page.getByLabel("Fruit", { exact: true });
  await control.click();
  const list = page.getByRole("listbox");
  await expect(list).toBeVisible();
  const trigger = await control.boundingBox();
  const menu = await list.boundingBox();
  expect(trigger).not.toBeNull();
  expect(menu).not.toBeNull();
  if (trigger && menu) {
    const viewportWidth = await page.evaluate(() => innerWidth);
    const start = Math.max(
      12,
      Math.min(trigger.x, viewportWidth - 12 - menu.width),
    );
    expect(Math.abs(menu.width - trigger.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(menu.x - start)).toBeLessThanOrEqual(1);
  }
  const disabled = page.getByRole("option", { name: "Date", exact: true });
  await expect(disabled).toHaveAttribute("aria-disabled", "true");
  expect(
    (
      await page
        .getByRole("option", { name: "Apple", exact: true })
        .boundingBox()
    )?.height,
  ).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(list).toHaveCount(0);
  await expect(control).toContainText("Cherry");
  await expect(page.getByLabel("Selected values", { exact: true })).toHaveText(
    "cherry",
  );
  await control.click();
  await page.keyboard.press("Escape");
  await expect(control).toBeFocused();
  await page
    .getByRole("button", { name: "Choose Cherry", exact: true })
    .click();
  await expect(control).toContainText("Cherry");
});

test("multiple Select toggles independently and stays open", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=shared-select--multiple&viewMode=story");
  await page.getByLabel("Fruits", { exact: true }).click();
  const list = page.getByRole("listbox");
  await expect(list).toHaveAttribute("aria-multiselectable", "true");
  await page.getByRole("option", { name: "Banana", exact: true }).click();
  await expect(list).toBeVisible();
  await expect(
    page.getByRole("option", { name: "Apple", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("option", { name: "Banana", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("option", { name: "Apple", exact: true }).click();
  await expect(list).toBeVisible();
  await expect(page.getByLabel("Selected values", { exact: true })).toHaveText(
    "banana",
  );
});

test("compact Select keeps a small trigger and a readable menu", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/iframe.html?id=shared-select--compact&viewMode=story");
  const control = page.getByLabel("Fruit", { exact: true });
  await control.click();
  const trigger = await control.boundingBox();
  const menu = await page.getByRole("listbox").boundingBox();
  expect(trigger?.width).toBeLessThan(240);
  expect(menu?.width).toBeGreaterThanOrEqual(180);
  expect(menu?.width).toBeLessThan(400);
});

test("Combobox query does not replace selection until an option is chosen", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=shared-combobox--default&viewMode=story");
  const input = page.getByRole("combobox", { name: "Fruit", exact: true });
  await expect(input).toHaveValue("Apple");
  await input.click();
  await input.pressSequentially("ban");
  await expect(
    page.getByRole("option", { name: "Banana", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: "Apple", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Selected values", { exact: true })).toHaveText(
    "apple",
  );
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(input).toHaveValue("Banana");
  await page
    .getByRole("button", { name: "Choose Cherry", exact: true })
    .click();
  await expect(input).toHaveValue("Cherry");
  await input.fill("not a fruit");
  await expect(
    page.getByText("No matching options", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(input).toHaveValue("Cherry");
  await expect(input).toBeFocused();
});

test("keyboard users can start a fresh Combobox search without selecting the old label manually", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=shared-combobox--default&viewMode=story");
  const input = page.getByRole("combobox", { name: "Fruit", exact: true });
  await page
    .getByRole("button", { name: "Choose Cherry", exact: true })
    .focus();
  await page.keyboard.press("Shift+Tab");
  await expect(input).toBeFocused();
  await input.pressSequentially("ban");
  await expect(input).toHaveValue("ban");
  await expect(
    page.getByRole("option", { name: "Banana", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Selected values", { exact: true })).toHaveText(
    "apple",
  );
});

test("Combobox supports aliases and accent-insensitive matching", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=shared-combobox--search-aliases&viewMode=story",
  );
  const input = page.getByRole("combobox");
  await input.fill("French");
  await expect(page.getByRole("option", { name: /^Français/ })).toBeVisible();
  await input.fill("francais");
  await page.getByRole("option", { name: /^Français/ }).click();
  await expect(input).toHaveValue("Français");
  await expect(page.getByLabel("Selected values", { exact: true })).toHaveText(
    "fr",
  );
});

test("multiple Combobox keeps selected values when filtering", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=shared-combobox--multiple&viewMode=story");
  const input = page.getByRole("combobox", { name: "Fruits", exact: true });
  await input.fill("ban");
  await page.getByRole("option", { name: "Banana", exact: true }).click();
  await expect(page.getByRole("listbox")).toBeVisible();
  const values = page.getByLabel("Selected values", { exact: true });
  await expect(values).toContainText("apple");
  await expect(values).toContainText("banana");
  await input.fill("cher");
  await page.getByRole("option", { name: "Cherry", exact: true }).click();
  await expect(values).toContainText("apple");
  await expect(values).toContainText("banana");
  await expect(values).toContainText("cherry");
});

test("Combobox invalidates stale queries after in-place values and external open changes", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=shared-combobox--multiple&viewMode=story");
  const input = page.getByRole("combobox", { name: "Fruits", exact: true });
  await input.fill("ban");
  await expect(
    page.getByRole("option", { name: "Apple", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Mutate selection", exact: true })
    .dispatchEvent("click");
  await expect(page.getByLabel("Selected values", { exact: true })).toHaveText(
    "cherry",
  );
  await expect(input).toHaveValue("");
  await expect(
    page.getByRole("option", { name: "Apple", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mutate selection back", exact: true })
    .dispatchEvent("click");
  await expect(page.getByLabel("Selected values", { exact: true })).toHaveText(
    "apple",
  );
  await expect(input).toHaveValue("");
  await expect(
    page.getByRole("option", { name: "Apple", exact: true }),
  ).toBeVisible();
  await input.fill("ban");
  await page
    .getByRole("button", { name: "Toggle popup", exact: true })
    .dispatchEvent("click");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Toggle popup", exact: true })
    .dispatchEvent("click");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(input).toHaveValue("");
  await expect(
    page.getByRole("option", { name: "Apple", exact: true }),
  ).toBeVisible();
});

for (const component of ["select", "combobox"]) {
  test(`${component} treats option labels and descriptions as text`, async ({
    page,
  }) => {
    const dialogs: string[] = [];
    page.on("dialog", async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });
    await page.goto(
      `/iframe.html?id=shared-${component}--untrusted-text&viewMode=story`,
    );
    await page.getByLabel("Fruit", { exact: true }).click();
    await expect(
      page.getByRole("option", { name: /<img src=x onerror=alert\(1\)>/ }),
    ).toBeVisible();
    await expect(
      page.getByText("<script>alert(1)</script>", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("listbox").locator("script,img[onerror]"),
    ).toHaveCount(0);
    await expect(page.locator("img[onerror]")).toHaveCount(0);
    expect(dialogs).toEqual([]);
  });

  test(`${component} cannot select a disabled option by hovering then pressing Enter`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=shared-${component}--default&viewMode=story`,
    );
    const control = page.getByLabel("Fruit", { exact: true });
    await control.click();
    await page.getByRole("option", { name: "Date", exact: true }).hover();
    await page.keyboard.press("Enter");
    await expect(
      page.getByLabel("Selected values", { exact: true }),
    ).toHaveText("apple");
    if (component === "combobox") await expect(control).toHaveValue("Apple");
    else await expect(control).toContainText("Apple");
  });

  test(`${component} disabled rows cannot add values in multiple mode`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=shared-${component}--multiple&viewMode=story`,
    );
    await page.getByLabel("Fruits", { exact: true }).click();
    await page.getByRole("option", { name: "Date", exact: true }).hover();
    await page.keyboard.press("Enter");
    await expect(
      page.getByLabel("Selected values", { exact: true }),
    ).toHaveText("apple");
  });

  test(`${component} retains disabled selections during row interactions but permits explicit removal`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=shared-${component}--disabled-selected&viewMode=story`,
    );
    await page.getByLabel("Fruits", { exact: true }).click();
    await page.getByRole("option", { name: "Banana", exact: true }).click();
    const values = page.getByLabel("Selected values", { exact: true });
    await expect(values).toContainText("date");
    await page.getByRole("option", { name: "Date", exact: true }).hover();
    await page.keyboard.press("Enter");
    await expect(values).toContainText("date");
    await expect(values).toContainText("banana");
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Remove Date", exact: true })
      .click();
    await expect(values).not.toContainText("date");
    await expect(values).toContainText("banana");
  });

  test(`${component} keyboard navigation scrolls long option lists`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 720 });
    await page.goto(
      `/iframe.html?id=shared-${component}--long-options&viewMode=story`,
    );
    const control = page.getByLabel("Fruit", { exact: true });
    await control.click();
    await page.keyboard.press("End");
    await expect(
      page.getByRole("option", { name: /^Option\s?39$/ }),
    ).toBeInViewport({ ratio: 1 });
    await page.keyboard.press("Home");
    await expect(
      page.getByRole("option", { name: /^Option\s?0$/ }),
    ).toBeInViewport({ ratio: 1 });
  });

  for (const mode of ["single", "multiple"]) {
    test(`${component} ${mode} submits IDs and validates required selection`, async ({
      page,
    }) => {
      await page.goto(
        `/iframe.html?id=shared-${component}--required-form-${mode}&viewMode=story`,
      );
      const form = page.getByRole("form", {
        name: "Selection form",
        exact: true,
      });
      const valid = async () =>
        form.evaluate(
          (element) =>
            element instanceof HTMLFormElement && element.checkValidity(),
        );
      const values = async () =>
        form.evaluate((element) =>
          element instanceof HTMLFormElement
            ? new FormData(element).getAll("fruit")
            : [],
        );
      expect(await valid()).toBe(false);
      const control = form.getByLabel(mode === "single" ? "Fruit" : "Fruits", {
        exact: true,
      });
      await control.click();
      if (component === "combobox") {
        await control.fill("Apple");
        expect(await valid()).toBe(false);
      }
      await page.getByRole("option", { name: "Apple", exact: true }).click();
      expect(await valid()).toBe(true);
      expect(await values()).toEqual(["apple"]);
      if (mode === "multiple") {
        if (component === "combobox") await control.fill("Banana");
        await page.getByRole("option", { name: "Banana", exact: true }).click();
        expect(await values()).toEqual(["apple", "banana"]);
        await page.keyboard.press("Escape");
        await page
          .getByRole("button", { name: "Remove Apple", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Remove Banana", exact: true })
          .click();
        expect(await valid()).toBe(false);
      }
    });
  }

  test(`${component} can clear optional selection and restores control focus`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=shared-${component}--clearable&viewMode=story`,
    );
    const control = page.getByLabel("Fruit", { exact: true });
    await page
      .getByRole("button", { name: "Clear selection", exact: true })
      .click();
    await expect(
      page.getByLabel("Selected values", { exact: true }),
    ).toHaveText("");
    await expect(control).toBeFocused();
  });

  test(`${component} chip removal keeps the remaining UI keyboard-accessible`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=shared-${component}--multiple&viewMode=story`,
    );
    const control = page.getByLabel("Fruits", { exact: true });
    await page
      .getByRole("button", { name: "Remove Apple", exact: true })
      .click();
    await expect(
      page.getByLabel("Selected values", { exact: true }),
    ).toHaveText("");
    await expect(control).toBeFocused();
  });

  test(`${component} loading cannot select hidden cached options`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=shared-${component}--loading-cached-options&viewMode=story`,
    );
    const control = page.getByLabel("Fruit", { exact: true });
    await control.focus();
    await page.keyboard.press("b");
    await expect(
      page.getByLabel("Selected values", { exact: true }),
    ).toHaveText("apple");
    await control.click();
    await expect(
      page.getByText("Loading options…", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("option")).toHaveCount(0);
  });

  test(`${component} respects disabling an already open control`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=shared-${component}--disabled-while-open&viewMode=story`,
    );
    await expect(page.getByRole("listbox")).toBeVisible();
    // Model an external state change without first dismissing the popup.
    await page
      .getByRole("button", { name: "Disable control", exact: true })
      .dispatchEvent("click");
    const control = page.getByLabel("Fruit", { exact: true });
    await expect(control).toBeDisabled();
    const options = page.getByRole("option");
    for (const option of await options.all()) {
      await expect(option).toHaveAttribute("aria-disabled", "true");
    }
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await expect(
      page.getByLabel("Selected values", { exact: true }),
    ).toHaveText("apple");
    await page
      .getByRole("button", { name: "Choose Cherry", exact: true })
      .dispatchEvent("click");
    await expect(
      page.getByLabel("Selected values", { exact: true }),
    ).toHaveText("cherry");
    if (component === "combobox") await expect(control).toHaveValue("Cherry");
    else await expect(control).toContainText("Cherry");
  });

  test(`${component} remains within a short mobile viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 400 });
    await page.goto(
      `/iframe.html?id=shared-${component}--default&viewMode=story`,
    );
    const control = page.getByLabel("Fruit", { exact: true });
    await control.click();
    const list = page.getByRole("listbox");
    await expect(list).toBeVisible();
    const box = await list.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(8);
      expect(box.x + box.width).toBeLessThanOrEqual(368);
      expect(box.y).toBeGreaterThanOrEqual(8);
      expect(box.y + box.height).toBeLessThanOrEqual(393);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(control).toBeFocused();
  });

  test(`${component} passes explicit direction to its portalled popup`, async ({
    page,
  }) => {
    await page.goto(`/iframe.html?id=shared-${component}--rtl&viewMode=story`);
    await page.getByLabel("Fruit", { exact: true }).click();
    await expect(page.getByRole("listbox")).toHaveCSS("direction", "rtl");
    await expect(
      page.getByRole("option", { name: "Banana", exact: true }),
    ).toBeVisible();
    await page.getByRole("option", { name: "Banana", exact: true }).click();
    await expect(
      page.getByLabel("Selected values", { exact: true }),
    ).toHaveText("banana");
  });

  test(`${component} disabled and empty states are distinct`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=shared-${component}--disabled&viewMode=story`,
    );
    await expect(page.getByLabel("Fruit", { exact: true })).toBeDisabled();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await page.goto(
      `/iframe.html?id=shared-${component}--empty&viewMode=story`,
    );
    await page.getByLabel("Fruit", { exact: true }).click();
    await expect(
      page.getByText("No options available", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("option")).toHaveCount(0);
  });

  test(`${component} popup dismisses before its parent dialog`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=shared-${component}--inside-dialog&viewMode=story`,
    );
    const dialog = page.getByRole("dialog", {
      name: "Selection dialog",
      exact: true,
    });
    const control = dialog.getByLabel("Fruit", { exact: true });
    await control.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(control).toBeFocused();
    await control.click();
    await page.getByRole("option", { name: "Banana", exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(
      page.getByLabel("Selected values", { exact: true }),
    ).toHaveText("banana");
  });
}
