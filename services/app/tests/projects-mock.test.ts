import { expect, type Locator, type Page, test } from "@playwright/test";

const storageKey = "agora:mock-projects:v3";

async function seedMappingDraft(page: Page) {
  const project = savedProject(0);
  const draft = {
    id: "00000000-0000-4000-a000-000000000000",
    conversationType: "polis",
    projectSlug: project.projectSlug,
    createdAt: project.createdAt,
  };
  await page.addInitScript(
    ({ key, project, draft }) => {
      sessionStorage.setItem(
        key,
        JSON.stringify({ version: 3, projects: [project], drafts: [draft] }),
      );
    },
    { key: storageKey, project, draft },
  );
  return `/project/${project.projectSlug}/draft/${draft.id}`;
}

test("Mapping's deck keeps all three full vote labels in one keyboard-accessible row", async ({
  page,
}) => {
  const path = await seedMappingDraft(page);
  for (const view of [
    {
      width: 320,
      locale: "fa",
      help: "راهنمای انتخاب",
      deck: "یکی‌یکی",
      labels: ["مخالفم", "مطمئن نیستم", "موافقم"],
      rtl: true,
    },
    {
      width: 375,
      locale: "fr",
      help: "Aidez-moi à choisir",
      deck: "Une à la fois",
      labels: ["Pas d’accord", "Sans avis", "D’accord"],
      rtl: false,
    },
    {
      width: 960,
      locale: "fr",
      help: "Aidez-moi à choisir",
      deck: "Une à la fois",
      labels: ["Pas d’accord", "Sans avis", "D’accord"],
      rtl: false,
    },
  ]) {
    await page.setViewportSize({ width: view.width, height: 800 });
    await page.goto(`/${view.locale}${path}`);
    await page.getByRole("button", { name: view.help }).click();
    const deck = page
      .getByRole("dialog")
      .getByRole("region", { name: view.deck });
    const choices = deck.getByRole("article").getByRole("radio");
    await expect(choices).toHaveText(view.labels);
    const boxes = await choices.evaluateAll((buttons) =>
      buttons.map((button) => {
        const { x, y, width, height } = button.getBoundingClientRect();
        return {
          x,
          y,
          width,
          height,
          fits:
            button.scrollWidth <= button.clientWidth + 1 &&
            button.scrollHeight <= button.clientHeight + 1,
        };
      }),
    );
    for (const [i, box] of boxes.entries()) {
      expect(box.y).toBe(boxes[0].y);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.fits).toBe(true);
      if (i > 0)
        expect(view.rtl ? box.x < boxes[i - 1].x : box.x > boxes[i - 1].x).toBe(
          true,
        );
    }
    await choices.first().click();
    await choices.first().press(view.rtl ? "ArrowLeft" : "ArrowRight");
    await expect(choices.nth(1)).toBeFocused();
    await expect(choices.nth(1)).toBeChecked();
  }
});

test("a Mapping deck advances once per response, restores focus, and ends without wrapping", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const path = await seedMappingDraft(page);
  await page.goto(path);
  const trigger = page.getByRole("button", { name: "Help me choose" });
  await trigger.press("Enter");
  const guide = page.getByRole("dialog", { name: "How participants respond" });
  const deck = guide.getByRole("region", { name: "One at a time" });
  const list = guide.getByRole("region", { name: "All at once" });
  const agree = deck.getByRole("radio", { name: "Agree", exact: true });
  const previous = deck.getByRole("button", { name: "Previous" });
  const next = deck.getByRole("button", { name: "Next" });
  const position = deck.locator('[aria-live="polite"]');
  await expect(list.getByRole("radiogroup")).toHaveCount(3);
  const saved = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    storageKey,
  );
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:10Z"));
  await list
    .getByRole("radio", { name: "Agree", exact: true })
    .first()
    .press("Space");
  await agree.press("Space");
  await expect(agree).toBeChecked();
  await expect(position).toContainText("Next in 1s");
  await page.clock.runFor(650);
  await agree.press("ArrowLeft");
  await expect(deck.getByRole("radio", { name: "Unsure" })).toBeChecked();
  await page.clock.runFor(400);
  await expect(position).toContainText("1 of 3");
  await page.clock.runFor(600);
  await expect(position).toHaveText("2 of 3");
  await expect(
    deck.getByRole("group", { name: /^More frequent buses/ }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    deck.getByRole("radio", { name: "Disagree", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Space");
  await previous.press("Enter");
  await page.clock.runFor(1500);
  await expect(position).toHaveText("1 of 3");
  await expect(deck.getByRole("radio", { name: "Unsure" })).toBeChecked();
  await next.press("Enter");
  await agree.press("Space");
  await page.clock.runFor(1000);
  await expect(position).toHaveText("3 of 3");
  await agree.press("Space");
  await page.clock.runFor(1000);
  await expect(position).toHaveText("End of statements");
  await expect(next).toBeDisabled();
  await expect(deck.getByRole("radiogroup")).toHaveCount(0);
  await expect(list.getByRole("radiogroup")).toHaveCount(3);
  await expect(
    list.getByRole("radio", { name: "Agree", exact: true }).first(),
  ).toBeChecked();
  await previous.press("Enter");
  await expect(agree).toBeChecked();
  await deck.getByRole("radio", { name: "Unsure" }).press("Space");
  await page.keyboard.press("Escape");
  await trigger.press("Enter");
  await page.clock.runFor(1500);
  await expect(position).toHaveText("1 of 3");
  await expect(guide.getByRole("radio", { checked: true })).toHaveCount(0);
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), storageKey),
  ).toBe(saved);
});

test("reopening a draft during publication keeps the submitted setup; a failed display edit restores its radio", async ({
  page,
}) => {
  const path = await seedMappingDraft(page);
  await page.goto("/project/project-0");
  await page.getByRole("link", { name: /Mapping.*Untitled activity/ }).click();
  const deck = page.getByRole("radio", { name: "One at a time" });
  const feed = page.getByRole("radio", { name: "All at once" });
  await deck.check();
  const quick = page.getByRole("textbox", { name: "Statement", exact: true });
  await quick.fill("Safer junctions");
  await quick.press("Enter");
  const seed = page.getByRole("button", {
    name: "Safer junctions",
    exact: true,
  });
  await expect(seed).toBeVisible();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Create activity" })
    .click();
  const submit = page
    .getByRole("dialog")
    .getByRole("button", { name: "Create activity" });
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:05Z"));
  await submit.press("Enter");
  await expect(submit).toBeDisabled();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Project 0", exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(feed).toBeChecked();
  await page.clock.resume();
  await expect(
    page.getByRole("banner").getByRole("button", { name: "Share" }),
  ).toBeVisible();
  await expect(deck).toBeChecked();
  await expect(seed).toBeVisible();

  await page.evaluate((key) => {
    sessionStorage.setItem(key, "{");
  }, storageKey);
  await feed.check();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(deck).toBeChecked();
});

function selectedCardAppearance(radio: Locator) {
  return radio.evaluate((input) => {
    const label = input.closest("label");
    if (!label) throw new Error("The radio must be inside its card label");
    const card = getComputedStyle(label);
    const indicator = getComputedStyle(input);
    return {
      surface: card.backgroundColor,
      border: card.borderColor,
      shadow: card.boxShadow,
      accent: indicator.accentColor,
      indicatorWidth: indicator.width,
      indicatorHeight: indicator.height,
    };
  });
}

async function openProjectCreation(page: Page) {
  await page.goto("/projects");
  await page
    .getByRole("button", { name: "New project", exact: true })
    .first()
    .click();
  return page.getByRole("dialog", { name: "New project", exact: true });
}

async function openSettingsForNewProject({
  page,
  name,
}: {
  page: Page;
  name: string;
}) {
  const creation = await openProjectCreation(page);
  await creation.getByLabel("Project name", { exact: true }).fill(name);
  await creation
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(page).toHaveURL(/\/project\//);
  await page
    .getByRole("button", { name: "Project settings", exact: true })
    .click();
  return page.getByRole("dialog", { name: "Project settings", exact: true });
}

test("a facilitator can create and reopen a saved activity draft", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const creation = await openProjectCreation(page);
  await creation
    .getByLabel("Project name", { exact: true })
    .fill("Draft workspace");
  await creation
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(page).toHaveURL(/\/project\/[^/]+$/);
  await expect(
    page.getByText("Add your first activity", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "New activity", exact: true }).click();
  const picker = page.getByRole("dialog", {
    name: "New activity",
    exact: true,
  });
  const createDraft = picker.getByRole("button", {
    name: "Create draft",
    exact: true,
  });
  await expect(createDraft).toBeDisabled();
  const gathering = picker.getByRole("radio", {
    name: "Gathering",
    exact: true,
  });
  const mapping = picker.getByRole("radio", { name: "Mapping", exact: true });
  await picker.getByText("Gathering", { exact: true }).click();
  await expect(gathering).toBeChecked();
  await gathering.press("ArrowRight");
  await expect(mapping).toBeChecked();
  await expect(mapping).toBeFocused();
  await expect(gathering).not.toBeChecked();
  const pickerAppearance = await selectedCardAppearance(mapping);
  await createDraft.click();
  await expect(page).toHaveURL(/\/project\/[^/]+\/draft\/[^/]+$/);
  const draftUrl = page.url();
  const header = page.getByRole("banner");
  const back = header.getByRole("link", { name: "Back to project" });
  const icon = header.getByRole("img", { name: "Mapping", exact: true });
  const name = header.getByText("Untitled activity", { exact: true });
  await expect(icon).toBeVisible();
  await expect(name).toBeVisible();
  const desktop = await Promise.all([
    back.boundingBox(),
    icon.boundingBox(),
    name.boundingBox(),
  ]);
  const [backBox, iconBox, nameBox] = desktop;
  expect(
    backBox &&
      iconBox &&
      nameBox &&
      backBox.x + backBox.width <= iconBox.x &&
      iconBox.x + iconBox.width <= nameBox.x,
  ).toBe(true);
  await expect(page.getByRole("tablist")).not.toContainText(
    "Untitled activity",
  );
  const beforePreview = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    storageKey,
  );
  await page.getByText("One at a time", { exact: true }).click();
  const deck = page.getByRole("radio", { name: "One at a time" });
  await expect(deck).toBeChecked();
  await expect
    .poll(() => selectedCardAppearance(deck))
    .toEqual(pickerAppearance);
  await page.getByRole("tab", { name: "Moderation" }).click();
  const demo = page.getByRole("region", {
    name: "Moderation example",
    exact: true,
  });
  await expect(demo.getByText("Seed statement", { exact: true })).toBeVisible();
  await expect(
    demo.getByText("Participant statement", { exact: true }).first(),
  ).toBeVisible();
  const seed = demo
    .getByRole("article")
    .filter({ hasText: "Plant more trees" });
  await seed.getByRole("button", { name: "Moderate", exact: true }).click();
  const moderate = page.getByRole("dialog", { name: "Moderate statement" });
  await moderate.getByRole("button", { name: "Reason" }).click();
  await page.getByRole("option", { name: "Off-topic" }).click();
  await moderate.getByRole("button", { name: "Move", exact: true }).click();
  await expect(seed).toHaveCount(0);
  await demo.getByRole("radio", { name: /^Moderation History/ }).click();
  await expect(seed.getByText("Seed statement", { exact: true })).toBeVisible();
  await expect(seed).toContainText("Off-topic");
  await page.getByRole("tab", { name: "Analysis" }).click();
  await expect(
    page.getByText("Analysis data is unavailable for this draft."),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), storageKey),
  ).toBe(beforePreview);
  await page
    .getByRole("link", { name: "Back to project", exact: true })
    .click();
  await expect(page).toHaveURL(/\/project\/[^/]+$/);
  await page.reload();
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Untitled activity/ }).click();
  await expect(page).toHaveURL(draftUrl);
  await expect(
    page.getByRole("radio", { name: "One at a time" }),
  ).not.toBeChecked();
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(`/fa${new URL(draftUrl).pathname}`);
  const localizedBack = header.getByRole("link", {
    name: "بازگشت به پروژه",
    exact: true,
  });
  const localizedIcon = header.getByRole("img", {
    name: "نقشه‌برداری",
    exact: true,
  });
  const localizedName = header.getByText("فعالیت بدون عنوان", { exact: true });
  await expect(localizedIcon).toBeVisible();
  const [rtlBack, rtlIcon, rtlName] = await Promise.all([
    localizedBack.boundingBox(),
    localizedIcon.boundingBox(),
    localizedName.boundingBox(),
  ]);
  expect(
    rtlBack &&
      rtlIcon &&
      rtlName &&
      rtlIcon.x + rtlIcon.width <= rtlBack.x &&
      rtlName.x + rtlName.width <= rtlIcon.x,
  ).toBe(true);
  await expect(page.getByRole("tablist")).not.toContainText(
    "فعالیت بدون عنوان",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await localizedBack.click();
  await expect(page).toHaveURL(/\/fa\/project\/[^/]+$/);
});

test("activity settings apply only to the open draft, and cancel restores the opener without leaking edits", async ({
  page,
}) => {
  const project = savedProject(0);
  await page.addInitScript(
    ({ key, project }) => {
      if (!sessionStorage.getItem(key))
        sessionStorage.setItem(
          key,
          JSON.stringify({
            version: 3,
            projects: [project],
            drafts: ["polis", "gathering", "prioritizing"].map(
              (conversationType, index) => ({
                projectSlug: project.projectSlug,
                id: `00000000-0000-4000-a000-00000000000${String(index)}`,
                conversationType,
                createdAt: project.createdAt,
              }),
            ),
          }),
        );
    },
    { key: storageKey, project },
  );
  await page.goto(
    "/project/project-0/draft/00000000-0000-4000-a000-000000000000",
  );
  const header = page.getByRole("banner");
  const settings = header.getByRole("button", {
    name: "Activity settings",
    exact: true,
  });
  const dialog = page.getByRole("dialog", { name: "Activity settings" });
  const name = dialog.getByRole("textbox", { name: "Activity name" });
  const description = dialog.getByRole("textbox", {
    name: "Description (optional)",
  });
  await expect(settings).toBeVisible();
  const before = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    storageKey,
  );
  const summaryName = page.getByRole("button", {
    name: "Edit activity name",
    exact: true,
  });
  await summaryName.press("Enter");
  await expect(name).toBeFocused();
  await name.fill("Discard this");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(summaryName).toBeFocused();
  const summaryDescription = page.getByRole("button", {
    name: "Add a description…",
  });
  await summaryDescription.click();
  await expect(description).toBeFocused();
  await expect(name).toHaveValue("Untitled activity");
  await name.fill("  River crossing  ");
  await description.fill("Tell us which route needs attention.");
  await dialog
    .getByRole("switch", { name: "Allow participants to add statements" })
    .click();
  await dialog
    .getByRole("button", { name: "How participants respond" })
    .click();
  await page.getByRole("option", { name: "One at a time" }).click();
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(
    header.getByRole("button", { name: "River crossing" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "River crossing" }),
  ).toBeVisible();
  const bodyText = page.getByText("Tell us which route needs attention.", {
    exact: true,
  });
  await expect(bodyText).toBeVisible();
  const editDescription = page.getByRole("button", {
    name: "Edit activity description",
    exact: true,
  });
  await expect(editDescription).toBeFocused();
  // Wait for the closing dialog to release the pointer, then click the displayed
  // words. The overlay, not the text node itself, must receive the real click.
  await editDescription.click({ trial: true });
  await bodyText.click({ force: true });
  await expect(description).toBeFocused();
  await expect(description).toHaveValue("Tell us which route needs attention.");
  await page.keyboard.press("Escape");
  await expect(editDescription).toBeFocused();
  await expect(
    page.getByRole("radio", { name: "One at a time" }),
  ).toBeChecked();
  await page.getByRole("tab", { name: "Analysis" }).click();
  await settings.click();
  await expect(name).toBeFocused();
  await expect(name).toHaveValue("River crossing");
  await expect(
    dialog.getByRole("switch", {
      name: "Allow participants to add statements",
    }),
  ).not.toBeChecked();
  await dialog.getByRole("button", { name: "Project defaults" }).click();
  await expect(
    dialog.getByText("Guest participation", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(settings).toBeFocused();
  await header.getByRole("button", { name: "River crossing" }).click();
  await expect(name).toBeFocused();
  await name.fill("   ");
  await expect(
    dialog.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), storageKey),
  ).toBe(before);
  await page.reload();
  await expect(
    header.getByRole("button", { name: "Untitled activity" }),
  ).toBeVisible();
  await header.getByRole("link", { name: "Back to project" }).click();
  await page
    .getByRole("link", { name: /Gathering.*Untitled activity/ })
    .click();
  await page.setViewportSize({ width: 390, height: 640 });
  await settings.click();
  await expect(description).toHaveValue("");
  await expect(
    dialog.getByRole("switch", {
      name: "Allow participants to submit responses",
    }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Who can see responses?" }).click();
  await page.getByRole("option", { name: "Facilitators only" }).click();
  await name.fill("Gathering settings only");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await settings.click();
  await expect(
    dialog.getByRole("button", { name: "Who can see responses?" }),
  ).toContainText("Facilitators only");
  await page.keyboard.press("Escape");
  await header.getByRole("link", { name: "Back to project" }).click();
  await page
    .getByRole("link", { name: /Prioritizing.*Untitled activity/ })
    .click();
  await settings.click();
  await expect(name).toHaveValue("Untitled activity");
  await dialog.getByRole("button", { name: "Prioritizing method" }).click();
  await page.getByRole("option", { name: "Pairwise" }).click();
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("radio", { name: "Pairwise" })).toBeChecked();
});

test("activity cards stay available and open drafts without flashing the updated list", async ({
  page,
}) => {
  const project = savedProject(0);
  await page.addInitScript(
    ({ key, project }) => {
      if (!sessionStorage.getItem(key))
        sessionStorage.setItem(
          key,
          JSON.stringify({ version: 3, projects: [project] }),
        );
    },
    { key: storageKey, project },
  );
  await page.goto(`/project/${project.projectSlug}`);
  const activities = page.getByRole("region", {
    name: "Activities",
    exact: true,
  });
  const handoff = await activities.evaluateHandle((section) => {
    const heading = section.querySelector("h2");
    const initialTitle = heading?.textContent;
    let listUpdatedBeforeLeaving = false;
    const observer = new MutationObserver(() => {
      if (section.isConnected && heading?.textContent !== initialTitle) {
        listUpdatedBeforeLeaving = true;
      }
    });
    observer.observe(section, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return {
      finish() {
        observer.disconnect();
        return listUpdatedBeforeLeaving;
      },
    };
  });

  await page.getByRole("button", { name: /^Prioritizing/ }).click();
  await expect(
    page.getByRole("dialog", { name: "New activity", exact: true }),
  ).toHaveCount(0);
  await expect(page).toHaveURL(/\/project\/[^/]+\/draft\/[^/]+$/);
  await expect(
    page.getByRole("heading", { name: "Prioritizing method" }),
  ).toBeVisible();
  await page.getByText("Pairwise", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "Pairwise" })).toBeChecked();
  await expect(page.getByRole("tab", { name: "Moderation" })).toHaveCount(0);
  expect(await handoff.evaluate((probe) => probe.finish())).toBe(false);

  await page
    .getByRole("link", { name: "Back to project", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Activities (1)" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Gathering/ }).click();
  const editFormat = page.getByRole("button", { name: "Edit response format" });
  await editFormat.click();
  const dialog = page.getByRole("dialog", { name: "Edit response format" });
  await dialog.getByRole("button", { name: "Add another field" }).click();
  await dialog
    .getByRole("region", { name: "Field 3" })
    .getByRole("textbox", { name: "Field name" })
    .fill("Local question");
  await dialog.getByRole("button", { name: "Save format" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Local question" }),
  ).toBeVisible();
  await page.reload();
  await editFormat.click();
  await expect(dialog.getByRole("textbox", { name: "Field name" })).toHaveCount(
    2,
  );
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("link", { name: "Back to project", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Activities (2)" }),
  ).toBeVisible();
});

for (const kind of [
  "Mapping",
  "Pairwise",
  "Best – Worst",
  "Quadratic voting",
  "Gathering",
] as const) {
  test(`${kind}: authored content is promoted once and respects published editing rules`, async ({
    page,
  }) => {
    const project = savedProject(0);
    await page.addInitScript(
      ({ project, key }) => {
        if (!sessionStorage.getItem(key))
          sessionStorage.setItem(
            key,
            JSON.stringify({ version: 3, projects: [project] }),
          );
      },
      { project, key: storageKey },
    );
    await page.goto(`/project/${project.projectSlug}`);
    const type =
      kind === "Mapping" || kind === "Gathering" ? kind : "Prioritizing";
    const card = page.getByRole("button", { name: type, exact: true });
    await card.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/draft\//);
    const original = page.url();
    const header = page.getByRole("banner");
    await header.getByRole("button", { name: "Untitled activity" }).click();
    const setting = page.getByRole("dialog", { name: "Activity settings" });
    await setting
      .getByLabel("Activity name", { exact: true })
      .fill(`${kind} local`);
    await setting.getByRole("button", { name: "Save changes" }).click();
    if (kind === "Mapping" || kind === "Gathering") {
      const trigger = page.getByRole("button", { name: "Help me choose" });
      await trigger.press("Enter");
      const guide = page.getByRole("dialog");
      if (kind === "Mapping") {
        await expect(
          guide
            .getByRole("region", { name: "All at once" })
            .getByRole("radiogroup"),
        ).toHaveCount(3);
        const deck = guide.getByRole("region", { name: "One at a time" });
        await expect(deck.getByRole("radiogroup")).toHaveCount(1);
        await deck.getByRole("radio", { name: "Agree", exact: true }).click();
        await deck.getByRole("button", { name: "Next" }).press("Enter");
        await expect(
          deck.getByRole("radiogroup", {
            name: /^More frequent buses in the evening/,
          }),
        ).toBeVisible();
        await deck.getByRole("button", { name: "Previous" }).press("Enter");
        await expect(
          deck.getByRole("radio", { name: "Agree", exact: true }),
        ).toBeChecked();
      } else {
        await guide
          .getByRole("textbox", { name: "Title" })
          .fill("Examples are local");
        await expect(
          guide.getByText("Examples are local", { exact: true }),
        ).toBeVisible();
        const amendment = guide.getByRole("region", {
          name: "Amend existing responses",
        });
        await expect(
          amendment.getByText("Plant more trees", { exact: true }),
        ).toBeVisible();
        await amendment
          .getByRole("textbox", { name: "Revised response" })
          .fill("Plant native shade trees");
        await expect(
          amendment.getByText("Plant more trees", { exact: true }),
        ).toBeVisible();
      }
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      if (kind === "Gathering") {
        await trigger.press("Enter");
        await expect(
          guide.getByRole("textbox", { name: "Revised response" }),
        ).not.toHaveValue("Plant native shade trees");
        await page.keyboard.press("Escape");
      }
      await expect(
        page.getByRole("main").getByText("Examples are local", { exact: true }),
      ).toHaveCount(0);
    }
    if (type === "Prioritizing") {
      await page.getByText(kind, { exact: true }).click();
      if (kind === "Quadratic voting") {
        await page.getByRole("button", { name: "Help me choose" }).click();
        const guide = page.getByRole("dialog", {
          name: "Prioritizing methods explained",
        });
        const pair = guide
          .getByRole("region", { name: "Pairwise" })
          .getByRole("radio", { name: "Plant more trees", exact: true });
        await pair.check();
        await expect(pair).toBeChecked();
        await guide
          .getByRole("button", { name: "Plant more trees +" })
          .click({ clickCount: 2 });
        await expect(guide.getByRole("status")).toContainText("96 of 100");
        await guide
          .getByRole("radio", { name: "Most: Improve bus services" })
          .click();
        await guide
          .getByRole("radio", { name: "Least: Improve bus services" })
          .click();
        await expect(
          guide.getByRole("radio", { name: "Most: Improve bus services" }),
        ).not.toBeChecked();
        await guide.getByRole("button", { name: "Close dialog" }).click();
        await header.getByRole("button", { name: "Create activity" }).click();
        const confirm = page.getByRole("dialog", { name: "Create activity" });
        await expect(
          confirm.getByRole("button", { name: "Create activity" }),
        ).toBeDisabled();
        await confirm.getByRole("button", { name: "Cancel" }).click();
      }
    }
    const add = type === "Gathering" ? "Add response" : "Add statement";
    await page.getByRole("button", { name: add, exact: true }).click();
    const editor = page.getByRole("dialog", { name: add });
    const text =
      kind === "Quadratic voting" || kind === "Gathering"
        ? "Title"
        : "Statement";
    await editor
      .getByRole("textbox", { name: text, exact: true })
      .fill("Safer streets");
    if (type === "Gathering")
      await editor
        .getByRole("textbox", { name: "Description", exact: true })
        .fill("More crossings.");
    if (kind === "Quadratic voting")
      await editor
        .getByRole("textbox", { name: "Description (optional)", exact: true })
        .fill("More crossings.");
    await editor.getByRole("button", { name: "Done", exact: true }).click();
    if (kind === "Gathering") {
      const fresh = page.getByRole("radio", {
        name: "Gather new responses",
        exact: true,
      });
      const amend = page.getByRole("radio", {
        name: "Amend existing responses",
        exact: true,
      });
      await expect(fresh).toBeChecked();
      const editFormat = page.getByRole("button", {
        name: "Edit response format",
      });
      await editFormat.click();
      const format = page.getByRole("dialog", { name: "Edit response format" });
      await format
        .getByRole("textbox", { name: "Field name" })
        .last()
        .fill("Crossing details");
      await format.getByRole("button", { name: "Save format" }).click();
      const saved = await page.evaluate(
        (key) => sessionStorage.getItem(key),
        storageKey,
      );
      await fresh.press("ArrowRight");
      await expect(amend).toBeFocused();
      await expect(amend).toBeChecked();
      await expect(
        page.getByRole("heading", { name: "Responses to amend (0)" }),
      ).toBeVisible();
      await expect(editFormat).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: /^Safer streets/ }),
      ).toHaveCount(0);
      await expect(
        header.getByRole("button", { name: "Participant preview" }),
      ).toBeDisabled();
      await expect(
        header.getByRole("button", { name: "Create activity" }),
      ).toBeDisabled();
      await page.setViewportSize({ width: 360, height: 740 });
      await header
        .getByRole("button", { name: "More activity options" })
        .click();
      const more = page.getByRole("dialog");
      await expect(
        more.getByRole("button", { name: "Participant preview" }),
      ).toBeDisabled();
      await expect(
        more.getByRole("button", { name: "Create activity" }),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const cards = page
        .getByRole("group", { name: "Choose gathering format" })
        .locator("label");
      const [first, second] = await Promise.all([
        cards.first().boundingBox(),
        cards.last().boundingBox(),
      ]);
      expect(
        first && second && first.y + first.height <= second.y,
      ).toBeTruthy();
      await amend.press("ArrowLeft");
      await expect(fresh).toBeChecked();
      await expect(fresh).toBeFocused();
      await expect(
        page.getByText("Crossing details", { exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate((key) => sessionStorage.getItem(key), storageKey),
      ).toBe(saved);
      await page.setViewportSize({ width: 1280, height: 800 });
      await expect(
        header.getByRole("button", { name: "Participant preview" }),
      ).toBeEnabled();
    }
    await page.getByRole("button", { name: /^Safer streets/ }).click();
    const edit = page.getByRole("dialog", {
      name: type === "Gathering" ? "Edit response" : "Edit statement",
    });
    await edit
      .getByRole("textbox", { name: text, exact: true })
      .fill("Safe crossings");
    await edit.getByRole("button", { name: "Done", exact: true }).click();
    if (kind === "Mapping")
      await page.getByRole("radio", { name: "One at a time" }).check();
    await header.getByRole("button", { name: "Participant preview" }).click();
    const preview = page.getByRole("dialog", { name: "Participant preview" });
    await expect(preview.getByText(/Safe crossings/).first()).toBeVisible();
    if (kind === "Mapping") {
      const seed = preview
        .getByRole("article")
        .filter({ hasText: "Safe crossings" });
      await expect(
        seed.getByRole("radiogroup", { name: "Safe crossings" }),
      ).toBeVisible();
      await expect(seed.locator("header")).toHaveCount(0);
      await seed
        .getByRole("radio", { name: "Agree", exact: true })
        .press("Space");
      await expect(preview.getByText("Next in 1s")).toBeVisible();
      await expect(preview.getByText("End of statements")).toBeVisible();
    }
    await preview.getByRole("button", { name: "Close dialog" }).click();
    await header.getByRole("button", { name: "Create activity" }).click();
    const submit = page
      .getByRole("dialog", { name: "Create activity" })
      .getByRole("button", { name: "Create activity" });
    if (kind === "Mapping") {
      // Simulate a failed read of the tab's mock store, then retry with the original draft.
      const originalStore = await page.evaluate((key) => {
        const saved = sessionStorage.getItem(key);
        sessionStorage.setItem(key, "{");
        return saved;
      }, storageKey);
      await submit.click();
      await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
      if (originalStore === null) throw new Error("Missing mock draft");
      await page.evaluate(
        ({ key, value }) => {
          sessionStorage.setItem(key, value);
        },
        { key: storageKey, value: originalStore },
      );
    }
    await submit.click({ clickCount: 2 });
    const share = page.getByRole("dialog", { name: "Share", exact: true });
    const accepting = share.getByRole("switch", {
      name: "Accepting new responses",
    });
    await expect(accepting).toBeChecked();
    for (const label of [
      "Copy link",
      "Show QR code",
      "Share via…",
      "View live page",
    ])
      await expect(
        share.getByRole("button", { name: label, exact: true }),
      ).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("heading", { name: `${kind} local`, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit activity name", exact: true }),
    ).toBeVisible();
    await expect(
      header.getByRole("button", { name: "Create activity" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: add, exact: true }),
    ).toBeEnabled();
    if (kind === "Mapping") {
      await page.getByRole("tab", { name: "Moderation" }).click();
      const actual = page.getByRole("region", {
        name: "Seed statements in this activity",
      });
      await expect(actual.getByRole("article")).toContainText("Safe crossings");
      await expect(
        actual.getByText("Seed statement", { exact: true }),
      ).toBeVisible();
      await expect(
        actual.getByRole("list", { name: "Vote breakdown" }),
      ).toHaveCount(0);
      await actual
        .getByRole("button", { name: "Moderate", exact: true })
        .click();
      const moderation = page.getByRole("dialog", {
        name: "Moderate statement",
      });
      await expect(moderation).toContainText("Safe crossings");
      await moderation.getByRole("button", { name: "Reason" }).click();
      await page.getByRole("option", { name: "Off-topic" }).click();
      await moderation
        .getByRole("button", { name: "Move", exact: true })
        .click();
      await expect(actual.getByRole("article")).toHaveCount(0);
      await header.getByRole("button", { name: "Participant preview" }).click();
      await expect(preview).toContainText("End of statements");
      await expect(preview.getByRole("radiogroup")).toHaveCount(0);
      await page.keyboard.press("Escape");
      await page.getByRole("tab", { name: "Setup" }).click();
      // The demo moves its own "Improve bus services"; identity, not text,
      // determines which authored statements can receive a preview vote.
      const quick = page.getByRole("textbox", {
        name: "Statement",
        exact: true,
      });
      await quick.fill("Improve bus services");
      await quick.press("Enter");
      await expect(
        page.getByRole("button", { name: "Improve bus services", exact: true }),
      ).toBeVisible();
      await header.getByRole("button", { name: "Participant preview" }).click();
      await expect(
        preview.getByRole("radiogroup", { name: "Improve bus services" }),
      ).toBeVisible();
      await expect(preview).toContainText("1 of 1");
      await page.keyboard.press("Escape");
      await page.getByRole("tab", { name: "Moderation" }).click();
      await actual.getByRole("radio", { name: /^Moderation History/ }).click();
      await expect(actual.getByRole("article")).toContainText("Safe crossings");
      await expect(actual.getByRole("article")).toContainText("Off-topic");
      await expect(
        actual.getByText("Seed statement", { exact: true }),
      ).toBeVisible();
      const sample = page.getByRole("region", { name: "Moderation example" });
      await expect(
        sample.getByText("Participant statement", { exact: true }).first(),
      ).toBeVisible();
      await expect(
        sample.getByText("Safe crossings", { exact: true }),
      ).toHaveCount(0);
      await page.getByRole("tab", { name: "Analysis" }).click();
      await expect(
        page.getByText("Participants", { exact: true }),
      ).toBeVisible();
    }
    await header.getByRole("link", { name: "Back to project" }).click();
    await expect(
      page.getByRole("heading", { name: "Activities (1)" }),
    ).toBeVisible();
    const created = page.getByRole("link", {
      name: new RegExp(`${kind} local`),
    });
    await expect(created).toContainText("Open");
    await created.click();
    await expect(page).toHaveURL(original);
    await page.reload();
    await expect(header.getByRole("button", { name: "Share" })).toBeVisible();
    if (kind === "Pairwise") {
      await page.getByRole("tab", { name: "Setup" }).press("ArrowRight");
      await expect(
        page.getByRole("tabpanel", { name: "Analysis" }),
      ).toBeVisible();
      await page.getByRole("tab", { name: "Analysis" }).press("ArrowLeft");
      await expect(page.getByRole("tabpanel", { name: "Setup" })).toBeVisible();
    }
    if (kind === "Gathering") {
      await expect(
        page.getByRole("radio", { name: "Gather new responses" }),
      ).toBeChecked();
      await expect(
        page.getByRole("radio", { name: "Amend existing responses" }),
      ).toBeDisabled();
    }
    await header.getByRole("button", { name: "Activity settings" }).click();
    await setting
      .getByLabel("Activity name", { exact: true })
      .fill(`${kind} updated`);
    await setting
      .getByLabel("Description (optional)")
      .fill("Changed after creation");
    if (type === "Gathering")
      await expect(
        setting.getByRole("button", { name: "Who can see responses?" }),
      ).toBeDisabled();
    if (type === "Prioritizing")
      await expect(
        setting.getByRole("button", { name: "Prioritizing method" }),
      ).toBeDisabled();
    await setting.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.getByRole("heading", { name: `${kind} updated` }),
    ).toBeVisible();
    if (kind === "Mapping")
      await page.getByRole("radio", { name: "All at once" }).check();
    const switchLabel =
      type === "Gathering"
        ? "Allow participants to submit responses"
        : "Allow participants to add statements";
    const contribution = page.getByRole("switch", {
      name: switchLabel,
      exact: true,
    });
    let nextPolicy = false;
    if (kind !== "Quadratic voting") {
      await expect(contribution).toBeEnabled();
      nextPolicy = !(await contribution.isChecked());
      await contribution.press("Space");
      await expect(contribution).toBeChecked({ checked: nextPolicy });
    } else
      await expect(
        page.getByRole("switch", { name: "Allow votes against a statement" }),
      ).toBeDisabled();
    const existing = page.getByRole("button", { name: /^Safe crossings/ });
    await existing.click();
    await edit
      .getByRole("textbox", { name: text, exact: true })
      .fill("After publication");
    if (kind === "Quadratic voting")
      await edit
        .getByRole("textbox", { name: "Description (optional)" })
        .fill("Revised credit item details");
    await edit.getByRole("button", { name: "Done", exact: true }).click();
    const revised = page.getByRole("button", { name: /^After publication/ });
    await expect(revised).toBeFocused();
    await page.getByRole("button", { name: add, exact: true }).click();
    if (kind === "Mapping") {
      await editor
        .getByRole("textbox", { name: text, exact: true })
        .fill("After publication");
      await editor.getByRole("button", { name: "Done", exact: true }).click();
      await expect(editor.getByRole("alert")).toContainText(
        "already in the activity",
      );
      await expect(editor.getByRole("textbox", { name: text })).toHaveValue(
        "After publication",
      );
    }
    await editor
      .getByRole("textbox", { name: text, exact: true })
      .fill("Second seed");
    if (type === "Gathering")
      await editor
        .getByRole("textbox", { name: "Crossing details" })
        .fill("Another crossing");
    await editor.getByRole("button", { name: "Done", exact: true }).click();
    await page.getByRole("button", { name: /^Second seed/ }).waitFor();
    await header.getByRole("button", { name: "More activity options" }).click();
    await page
      .getByRole("dialog", { name: "More activity options" })
      .getByRole("button", { name: "Share" })
      .click();
    await accepting.press("Space");
    await expect(accepting).not.toBeChecked();
    await share.getByRole("button", { name: "Visibility settings" }).click();
    await expect(
      setting.getByRole("heading", { name: "Project defaults" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.reload();
    await expect(page.getByText("Closed", { exact: true })).toBeVisible();
    await expect(revised).toBeVisible();
    await expect(
      page.getByRole("heading", { name: `${kind} updated` }),
    ).toBeVisible();
    await expect(
      page.getByText("Changed after creation", { exact: true }),
    ).toBeVisible();
    if (kind !== "Quadratic voting")
      await expect(contribution).toBeChecked({ checked: nextPolicy });
    const deleteSecond = page.getByRole("button", {
      name: /^Remove Second seed/,
    });
    if (type === "Gathering" || kind === "Quadratic voting") {
      await expect(
        page.getByRole("button", { name: add, exact: true }),
      ).toHaveCount(0);
      await revised.click();
      await expect(
        page
          .getByRole("dialog")
          .getByRole("textbox", { name: text, exact: true }),
      ).not.toBeEditable();
      await page.keyboard.press("Escape");
    } else {
      await expect(
        page.getByRole("button", { name: add, exact: true }),
      ).toBeEnabled();
    }
    if (kind === "Quadratic voting") await expect(deleteSecond).toHaveCount(0);
    else {
      await deleteSecond.click();
      await expect(deleteSecond).toHaveCount(0);
    }
    await header.getByRole("link", { name: "Back to project" }).click();
    const link = page.getByRole("link", {
      name: new RegExp(`${kind} updated`),
    });
    await expect(link).toContainText("Closed");
    await link.click();
    await header.getByRole("button", { name: "Share" }).click();
    await expect(accepting).toBeEnabled();
    await accepting.press("Space");
    await expect(accepting).toBeChecked();
    await page.keyboard.press("Escape");
    if (kind === "Quadratic voting") {
      await deleteSecond.click();
      await expect(
        page.getByRole("button", { name: /^Remove After publication/ }),
      ).toHaveCount(0);
    }
    await page.reload();
    await expect(page.getByText("Open", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^Second seed/ }),
    ).toHaveCount(0);
  });
}

test("closing a comparison activity does not impose the creation seed cap or freeze its contribution policy", async ({
  page,
}) => {
  const project = savedProject(0);
  const id = "00000000-0000-4000-a000-000000000001";
  await page.addInitScript(
    ({ project, id, key }) => {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(
        key,
        JSON.stringify({
          version: 3,
          projects: [project],
          conversations: [
            {
              id,
              projectSlug: project.projectSlug,
              createdAt: project.createdAt,
              status: "closed",
              revision: 0,
              setup: {
                title: "Street priorities",
                description: "",
                conversationType: "prioritizing",
                prioritizationType: "comparisons",
                comparisonMethod: "pairwise",
                allowParticipantStatements: false,
                seedOpinions: Array.from(
                  { length: 50 },
                  (_, i) => `Seed ${String(i + 1)}`,
                ),
              },
            },
          ],
        }),
      );
    },
    { project, id, key: storageKey },
  );
  await page.goto(`/project/${project.projectSlug}/draft/${id}`);
  const policy = page.getByRole("switch", {
    name: "Allow participants to add statements",
  });
  await policy.press("Space");
  await expect(policy).toBeChecked();
  await page
    .getByRole("textbox", { name: "Statement", exact: true })
    .fill("Seed 51");
  await page
    .getByRole("button", { name: "Add statement", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Seed 51", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Closed", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Seed 51", exact: true }),
  ).toBeVisible();
  await expect(policy).toBeChecked();
  // A failed status write must leave both the persisted status and the switch unchanged.
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Share", exact: true })
    .click();
  const share = page.getByRole("dialog", { name: "Share", exact: true });
  const accepting = share.getByRole("switch", {
    name: "Accepting new responses",
  });
  const original = await page.evaluate((key) => {
    const saved = sessionStorage.getItem(key);
    sessionStorage.setItem(key, "{");
    return saved;
  }, storageKey);
  if (original === null) throw new Error("Missing published comparison");
  await accepting.press("Space");
  await expect(share.getByRole("alert")).toBeVisible();
  await expect(accepting).not.toBeChecked();
  await page.evaluate(
    ({ key, value }) => {
      sessionStorage.setItem(key, value);
    },
    { key: storageKey, value: original },
  );
  await accepting.press("Space");
  await expect(accepting).toBeChecked();
  await expect(share.getByRole("alert")).toHaveCount(0);
});

test("authentication help keeps its dismissal action visible and preserves the unsaved form", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 430 });
  const form = await openSettingsForNewProject({
    page,
    name: "Email help",
  });
  const name = form.getByLabel("Project name", { exact: true });
  await name.fill("An unsaved name");
  const trigger = form.getByRole("button", {
    name: "Help me choose",
    exact: true,
  });
  await trigger.click();
  const comparison = page.getByRole("dialog", {
    name: "Help me choose",
    exact: true,
  });
  await expect(
    comparison.getByText(/participants can opt in with the same address/),
  ).toBeVisible();
  const done = comparison.getByRole("button", {
    name: "Got it, thanks!",
    exact: true,
  });
  await expect(done).toBeInViewport({ ratio: 1 });
  const strongVerification = comparison.getByText(/phone number or passport/);
  await strongVerification.scrollIntoViewIfNeeded();
  await expect(strongVerification).toBeInViewport();
  await expect(done).toBeInViewport({ ratio: 1 });
  await done.click();
  await expect(comparison).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(name).toHaveValue("An unsaved name");

  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(comparison).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(name).toHaveValue("An unsaved name");
});

test("Share separates unavailable participant links from the mock Explore listing", async ({
  page,
}) => {
  const form = await openSettingsForNewProject({
    page,
    name: "Explore listing",
  });
  await form.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(form).toHaveCount(0);
  const share = page.getByRole("button", { name: "Share", exact: true });
  const panel = page.getByRole("dialog", {
    name: "Share project",
    exact: true,
  });
  const horizontalBounds = async () =>
    await panel.evaluate((element) => {
      const { left, right } = element.getBoundingClientRect();
      return { left: Math.round(left), right: Math.round(right) };
    });
  const shareTab = panel.getByRole("tab", { name: "Share", exact: true });
  const publishTab = panel.getByRole("tab", { name: "Publish", exact: true });
  const copy = panel.getByRole("button", { name: "Copy link", exact: true });
  const list = panel.getByRole("button", {
    name: "Publish project",
    exact: true,
  });
  const unlist = panel.getByRole("button", { name: "Unpublish", exact: true });
  await expect(
    page.getByRole("button", { name: "Publish project", exact: true }),
  ).toHaveCount(0);
  await share.click();
  await expect(shareTab).toHaveAttribute("aria-selected", "true");
  for (const name of [
    "Copy link",
    "Show QR code",
    "Share via…",
    "View live page",
  ]) {
    await expect(
      panel.getByRole("button", { name, exact: true }),
    ).toBeDisabled();
  }
  await expect(panel.getByRole("link")).toHaveCount(0);
  await expect(panel).toContainText(
    "The participant link isn’t available in this preview.",
  );
  const desktopBounds = await horizontalBounds();
  await shareTab.press("ArrowRight");
  await expect(publishTab).toBeFocused();
  await publishTab.press("Enter");
  await expect(publishTab).toHaveAttribute("aria-selected", "true");
  await expect(panel).toContainText(
    "Unlisted projects don’t appear in Explore.",
  );
  await expect.poll(horizontalBounds).toEqual(desktopBounds);
  await list.press("Enter");
  await expect(unlist).toBeVisible();
  await expect(unlist).toBeFocused();
  await expect(panel).toContainText("No public Explore entry is created.");
  await expect(panel.getByRole("link")).toHaveCount(0);
  await expect.poll(horizontalBounds).toEqual(desktopBounds);
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(share).toBeFocused();

  const mobileWidth = 320;
  await page.setViewportSize({ width: mobileWidth, height: 720 });
  await page.reload();
  await share.click();
  await expect(copy).toBeDisabled();
  const mobileBounds = await horizontalBounds();
  expect(mobileBounds.left).toBeGreaterThanOrEqual(0);
  expect(mobileBounds.right).toBeLessThanOrEqual(mobileWidth);
  await publishTab.click();
  await expect.poll(horizontalBounds).toEqual(mobileBounds);
  await unlist.click();
  await expect(list).toBeVisible();
  await expect.poll(horizontalBounds).toEqual(mobileBounds);
});

test("the project summary opens settings and edits details without changing its URL", async ({
  page,
}) => {
  const form = await openSettingsForNewProject({ page, name: "Summary entry" });
  await form.getByRole("button", { name: "Cancel", exact: true }).click();
  const url = page.url();
  await page
    .getByRole("button", { name: "Edit project name", exact: true })
    .click();
  const title = form.getByLabel("Project name", { exact: true });
  await expect(title).toBeFocused();
  await title.fill("Updated summary");
  await form
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Updated summary", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(url);

  await page
    .getByRole("button", { name: "Add a project description", exact: true })
    .click();
  await form
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("A new description");
  await form
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(page.getByRole("main")).toContainText("A new description");
  await expect(page).toHaveURL(url);
});

test("settings give feedback for a save not visible on the project page", async ({
  page,
}) => {
  const form = await openSettingsForNewProject({
    page,
    name: "Settings feedback",
  });
  await form
    .getByRole("switch", { name: "Dynamic translation", exact: true })
    .click();
  await form
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(form).toHaveCount(0);
  const toast = page.locator("[data-sonner-toast]").filter({
    hasText: "Project settings saved",
  });
  const dismiss = toast.getByRole("button", { name: "Dismiss notification" });
  await expect(dismiss).toBeVisible();
  await dismiss.hover();
  await expect(dismiss).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await dismiss.click();
  await expect(toast).toHaveCount(0);
});

test("a project header background can be uploaded, kept across settings edits, and reset", async ({
  page,
}) => {
  const form = await openSettingsForNewProject({
    page,
    name: "Participant background",
  });
  const openSettings = page.getByRole("button", {
    name: "Project settings",
    exact: true,
  });
  const save = form.getByRole("button", { name: "Save settings", exact: true });
  const reset = form.getByRole("button", { name: "Use default background" });
  const picker = form.locator('input[type="file"]');
  // A synthetic one-pixel PNG, with no network or fixture dependency.
  const image =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP9sAAAAASUVORK5CYII=";
  const savedImage = form.locator(`img[src="data:image/png;base64,${image}"]`);

  await expect(picker).toHaveAccessibleDescription(/PNG.*up to 1 MB/);
  await picker.setInputFiles({
    name: "header.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"),
  });
  await expect(picker).toHaveAttribute("aria-invalid", "true");
  await picker.setInputFiles({
    name: "header.png",
    mimeType: "image/png",
    buffer: Buffer.from(image, "base64"),
  });
  await expect(form.locator('img[src^="blob:"]')).toBeVisible();
  await expect(
    form.getByRole("region", { name: "Project details" }).getByRole("status"),
  ).toHaveText("header.png");
  await save.click();
  await expect(form).toHaveCount(0);
  await expect(
    page.locator(`img[src="data:image/png;base64,${image}"]`),
  ).toHaveCount(0);

  await page.reload();
  await openSettings.click();
  await expect(savedImage).toBeVisible();
  await form.getByLabel("Project name", { exact: true }).fill("Renamed");
  await save.click();
  await expect(form).toHaveCount(0);
  await openSettings.click();
  await expect(savedImage).toBeVisible();
  await reset.click();
  await save.click();
  await expect(form).toHaveCount(0);

  await page.reload();
  await openSettings.click();
  await expect(
    form.getByRole("img", { name: "Header background preview", exact: true }),
  ).toBeVisible();
  await expect(savedImage).toHaveCount(0);
});

test.describe("touch selector integration", () => {
  test.use({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
  });

  test("language search works in an RTL creation dialog without accidental dismissal", async ({
    page,
  }) => {
    await page.goto("/fa/projects");
    await page.getByRole("button", { name: "پروژه جدید", exact: true }).tap();
    const dialog = page.getByRole("dialog", {
      name: "پروژه جدید",
      exact: true,
    });
    const language = dialog.getByRole("combobox", {
      name: "زبان‌های اضافی",
      exact: true,
    });
    await language.tap();
    const list = page.getByRole("listbox");
    await expect(list).toBeVisible();
    await expect(list).toHaveCSS("direction", "rtl");
    const menu = await list.boundingBox();
    if (menu) {
      expect(menu.x).toBeGreaterThanOrEqual(8);
      expect(menu.x + menu.width).toBeLessThanOrEqual(367);
    }
    await language.pressSequentially("French");
    await page.getByRole("option", { name: "Français", exact: true }).tap();
    await expect(
      dialog.getByRole("list").filter({ hasText: "Français" }),
    ).toBeVisible();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(list).toHaveCount(0);
    await expect(
      dialog.getByRole("button", { name: "ایجاد پروژه", exact: true }),
    ).toBeEnabled();
  });
});

test("asking for email updates switches authentication, and choosing another method turns the prompt off", async ({
  page,
}) => {
  await page.goto("/projects");
  await page
    .getByRole("button", { name: "New project", exact: true })
    .first()
    .click();
  const form = page.getByRole("dialog", { name: "New project" });
  await form
    .getByLabel("Project name", { exact: true })
    .fill("Optional updates");
  await expect(form).toContainText(
    "Choose whether participants are asked to receive email updates. Activities use this setting unless changed individually. Updates are sent only to participants who opt in.",
  );
  await expect(form.getByLabel("Contact email", { exact: true })).toHaveCount(
    0,
  );
  await form.getByLabel("Email updates", { exact: true }).click();
  await page
    .getByRole("option", { name: "Ask participants", exact: true })
    .click();
  await expect(
    form.getByLabel("Contact email", { exact: true }),
  ).toHaveAccessibleDescription(
    "This email address will be shown publicly on the project page.",
  );
  const authentication = form.getByLabel("Authentication", { exact: true });
  const updates = form.getByLabel("Email updates", { exact: true });
  await expect(authentication).toContainText("Email verification");
  await expect(
    page.getByText(
      "Authentication switched to Email verification for email updates.",
    ),
  ).toBeVisible();
  await authentication.click();
  await page
    .getByRole("option", { name: "Strong verification", exact: true })
    .click();
  await expect(updates).toContainText("Don’t ask");
  await expect(form.getByLabel("Contact email", { exact: true })).toHaveCount(
    0,
  );
  await updates.click();
  await page
    .getByRole("option", { name: "Ask participants", exact: true })
    .click();
  await form
    .getByLabel("Contact email", { exact: true })
    .last()
    .fill("  TEAM@Example.ORG  ");
  await form
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(page).toHaveURL(/\/project\//);
  const saved = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    storageKey,
  );
  expect(saved).toContain('"authentication":"email_verification"');
  expect(saved).toContain('"email":"team@example.org"');
});

test("email verification does not replace the organizer contact prerequisite", async ({
  page,
}) => {
  await page.goto("/projects");
  await page
    .getByRole("button", { name: "New project", exact: true })
    .first()
    .click();
  const form = page.getByRole("dialog", { name: "New project" });
  const before = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    storageKey,
  );
  await form.getByLabel("Project name", { exact: true }).fill("Contact needed");
  await form.getByLabel("Authentication", { exact: true }).click();
  await page
    .getByRole("option", { name: "Email verification", exact: true })
    .click();
  await form.getByLabel("Email updates", { exact: true }).click();
  await page
    .getByRole("option", { name: "Ask participants", exact: true })
    .click();
  await form
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(form).toBeVisible();
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), storageKey),
  ).toBe(before);
  await form.getByLabel("Contact email", { exact: true }).last().fill("   ");
  await form
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(form).toBeVisible();
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), storageKey),
  ).toBe(before);
  await form
    .getByLabel("Contact email", { exact: true })
    .last()
    .fill("not-an-email");
  await form
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  expect(
    await form
      .getByLabel("Contact email", { exact: true })
      .last()
      .evaluate(
        (input) => input instanceof HTMLInputElement && input.validity.valid,
      ),
  ).toBe(false);
});

test("manual translations follow backend completeness rules and retain drafts across toggles", async ({
  page,
}) => {
  await page.goto("/projects");
  await page
    .getByRole("button", { name: "New project", exact: true })
    .first()
    .click();
  const form = page.getByRole("dialog", { name: "New project" });
  await form
    .getByLabel("Project name", { exact: true })
    .fill("English project");
  await form
    .getByLabel("Description", { exact: true })
    .fill("English description");
  const dynamic = form.getByRole("switch", {
    name: "Dynamic translation",
    exact: true,
  });
  await expect(dynamic).not.toBeChecked();
  const languages = form.getByRole("combobox", {
    name: "Additional languages",
    exact: true,
  });
  await languages.click();
  await page.getByRole("option", { name: "Français", exact: true }).click();
  await page.getByRole("option", { name: "Español", exact: true }).click();
  await expect(
    page.getByRole("option", { name: "English", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  const frenchName = form.getByLabel("Project name (Français)", {
    exact: true,
  });
  await frenchName.fill("Projet français");
  await form
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(form).toBeVisible();
  await form
    .getByLabel("Description (Français)", { exact: true })
    .fill("Description française");
  await form
    .getByLabel("Project name (Español)", { exact: true })
    .fill("Proyecto español");
  await form
    .getByLabel("Description (Español)", { exact: true })
    .fill("Descripción española");
  await dynamic.click();
  await dynamic.click();
  await expect(frenchName).toHaveValue("Projet français");
  await form
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(page).toHaveURL(/\/project\//);
  const saved = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    storageKey,
  );
  expect(saved).toContain('"dynamicTranslationEnabled":false');
  expect(saved).toContain('"projectTitle":"Projet français"');
  expect(saved).toContain('"body":"<p>Description française</p>"');
  expect(saved).toContain('"languageCode":"es"');
});

function savedProject(index: number) {
  return {
    projectId: index + 1,
    projectSlug: `project-${String(index)}`,
    projectTitle: `Project ${String(index)}`,
    body: "A project description.",
    ownerOrganizationSlugs: ["example"],
    ownerOrganizations: [
      {
        organizationSlug: "example",
        name: "Example organization",
        initials: "E",
      },
    ],
    authentication: "guest",
    emailUpdates: "off",
    languageSettings: {
      targetLanguageCodes: [],
      dynamicTranslationEnabled: false,
    },
    contentLocalizations: [],
    createdAt: "2026-11-17T12:00:00.000Z",
  };
}

test("the workspace keeps separate sidebar preferences in its two desktop layouts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.addInitScript(
    ({ key, project }) => {
      sessionStorage.setItem(
        key,
        JSON.stringify({ version: 3, projects: [project] }),
      );
    },
    { key: storageKey, project: savedProject(0) },
  );
  await page.goto("/projects");

  const sidebar = page.getByRole("complementary", {
    name: "Workspace navigation",
  });
  const expand = sidebar.getByRole("button", { name: "Expand navigation" });
  const collapse = sidebar.getByRole("button", { name: "Collapse navigation" });
  const openDrawer = page.getByRole("button", { name: "Open navigation menu" });
  const createInContent = page
    .getByRole("main")
    .getByRole("button", { name: "New project", exact: true });

  await expect(collapse).toBeVisible();
  await page.setViewportSize({ width: 1023, height: 800 });
  await expect(expand).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(collapse).toBeVisible();
  await collapse.click();
  await expect(expand).toBeVisible();

  await page.setViewportSize({ width: 768, height: 800 });
  await expect(expand).toBeVisible();
  await expand.click();
  await expect(collapse).toBeVisible();

  await page.setViewportSize({ width: 767, height: 800 });
  await expect(sidebar).toBeHidden();
  await expect(openDrawer).toBeVisible();
  await openDrawer.click();
  const drawer = page.getByRole("dialog", { name: "Workspace navigation" });
  await expect(drawer).toBeVisible();

  await page.setViewportSize({ width: 768, height: 800 });
  await expect(drawer).toBeHidden();
  await expect(collapse).toBeVisible();
  await expect(createInContent).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(expand).toBeVisible();
});

test("New activity moves to the bottom on mobile without changing its style", async ({
  page,
}) => {
  const project = savedProject(0);
  const height = 800;
  const bottomZoneStart = height - 100;
  await page.setViewportSize({ width: 768, height });
  await page.addInitScript(
    ({ key, project }) => {
      sessionStorage.setItem(
        key,
        JSON.stringify({ version: 3, projects: [project] }),
      );
    },
    { key: storageKey, project },
  );
  await page.goto(`/project/${project.projectSlug}`);

  const newActivity = page.getByRole("button", {
    name: "New activity",
    exact: true,
  });
  await expect(newActivity).toBeVisible();
  const { backgroundColor, backgroundImage, borderRadius } =
    await newActivity.evaluate((button) => {
      const style = getComputedStyle(button);
      return {
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        borderRadius: style.borderRadius,
      };
    });
  const inline = await newActivity.boundingBox();
  expect(inline?.y).toBeLessThan(bottomZoneStart);
  for (const width of [767, 390]) {
    await page.setViewportSize({ width, height });
    await expect(newActivity).toHaveCount(1);
    await expect(newActivity).toBeInViewport({ ratio: 1 });
    await expect
      .poll(async () => (await newActivity.boundingBox())?.y)
      .toBeGreaterThan(bottomZoneStart);
    await expect(newActivity).toHaveCSS("background-color", backgroundColor);
    await expect(newActivity).toHaveCSS("background-image", backgroundImage);
    await expect(newActivity).toHaveCSS("border-radius", borderRadius);
  }
  await newActivity.click();

  const picker = page.getByRole("dialog", {
    name: "New activity",
    exact: true,
  });
  await expect(picker).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(picker).toBeHidden();
  await expect(newActivity).toBeFocused();
});

test("very short mobile drawers keep all navigation reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 400 });
  await page.addInitScript(
    ({ key, projects }) => {
      sessionStorage.setItem(key, JSON.stringify({ version: 3, projects }));
    },
    {
      key: storageKey,
      projects: Array.from({ length: 50 }, (_, index) => savedProject(index)),
    },
  );
  await page.goto("/projects");
  await page
    .getByRole("button", { name: "Open navigation menu", exact: true })
    .click();
  const drawer = page.getByRole("dialog", {
    name: "Workspace navigation",
    exact: true,
  });
  const login = drawer.getByRole("button", { name: "Log in", exact: true });
  await expect(login).toBeInViewport({ ratio: 1 });
  for (const name of ["History", "Explore", "Notifications"]) {
    const control = drawer.getByRole("button", { name, exact: true });
    await control.scrollIntoViewIfNeeded();
    await expect(control).toBeInViewport({ ratio: 1 });
    await expect(login).toBeInViewport({ ratio: 1 });
  }
});

for (const scenario of [
  { width: 1440, height: 600, locale: "en" },
  { width: 375, height: 667, locale: "en" },
  { width: 402, height: 874, locale: "fa" },
]) {
  test(`project list scrolls independently at ${String(scenario.width)}px (${scenario.locale})`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: scenario.width,
      height: scenario.height,
    });
    await page.addInitScript(
      ({ key, projects }) => {
        sessionStorage.setItem(key, JSON.stringify({ version: 3, projects }));
      },
      {
        key: storageKey,
        projects: Array.from({ length: 50 }, (_, index) => savedProject(index)),
      },
    );
    const rtl = scenario.locale === "fa";
    const mobile = scenario.width <= 760;
    await page.goto(`${rtl ? "/fa" : ""}/projects`);
    if (mobile) {
      await page
        .getByRole("button", {
          name: rtl ? "باز کردن منوی پیمایش" : "Open navigation menu",
          exact: true,
        })
        .click();
    }
    const sidebar = page.getByRole(mobile ? "dialog" : "complementary", {
      name: rtl ? "پیمایش فضای کاری" : "Workspace navigation",
      exact: true,
    });
    const list = sidebar.getByRole("region", {
      name: rtl ? "پروژه‌ها" : "Projects",
      exact: true,
    });
    const parent = sidebar.getByRole("link", {
      name: rtl ? "پروژه‌ها" : "Projects",
      exact: true,
    });
    const first = list.getByRole("link").first();
    const last = list.getByRole("link", { name: "Project 49", exact: true });
    await expect(first).toBeInViewport({ ratio: 1 });
    const lowerControls = [
      sidebar.getByRole("heading", {
        name: rtl ? "مشارکت" : "Participate",
        exact: true,
      }),
      ...[
        rtl ? "سابقه مشارکت" : "History",
        rtl ? "کاوش" : "Explore",
        rtl ? "اعلان‌ها" : "Notifications",
        rtl ? "ورود" : "Log in",
      ].map((name) => sidebar.getByRole("button", { name, exact: true })),
    ];
    const controlsWithPositions = [];
    for (const control of lowerControls) {
      await expect(control).toBeInViewport({ ratio: 1 });
      controlsWithPositions.push({ control, box: await control.boundingBox() });
    }
    if (mobile) {
      const projectRow = await parent.boundingBox();
      const childRow = await first.boundingBox();
      expect(childRow?.height).toBeGreaterThanOrEqual(44);
      if (projectRow && childRow) {
        expect(
          childRow.y - projectRow.y - projectRow.height,
        ).toBeGreaterThanOrEqual(8);
      }
    }
    expect(
      await list.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    ).toBe(true);
    await list.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(last).toBeInViewport({ ratio: 1 });
    await expect(parent).toBeInViewport({ ratio: 1 });
    for (const { control, box } of controlsWithPositions) {
      await expect(control).toBeInViewport({ ratio: 1 });
      expect(await control.boundingBox()).toEqual(box);
    }
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await expect(
      sidebar.getByRole("button", {
        name: rtl ? "پروژه جدید" : "New project",
        exact: true,
      }),
    ).toBeInViewport({ ratio: 1 });
    await first.focus();
    await expect(first).toBeInViewport({ ratio: 1 });
    await last.focus();
    await expect(last).toBeInViewport({ ratio: 1 });
    await last.click();
    await expect(page).toHaveURL(`${rtl ? "/fa" : ""}/project/project-49`);
  });
}

test("the mock default project appears as a normal project and survives reload", async ({
  page,
}) => {
  await page.goto("/home");
  await expect(page).toHaveURL("/projects");
  const main = page.getByRole("main");
  const project = main.getByRole("link", { name: /My project/ });
  await expect(project).toHaveCount(1);
  const href = await project.getAttribute("href");
  await page.reload();
  await expect(project).toHaveCount(1);
  await expect(project).toHaveAttribute("href", href ?? "");
  await project.click();
  await expect(
    main.getByRole("heading", { name: "My project", exact: true }),
  ).toBeVisible();
  await expect(
    main.getByRole("button", { name: "Edit project organisations" }),
  ).toContainText("Personal organisation");
});

for (const locale of ["en", "fa"]) {
  test(`populated desktop ${locale} overview uses a compact heading action, not a project-sized tile`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.addInitScript(
      ({ key, project }) => {
        sessionStorage.setItem(
          key,
          JSON.stringify({ version: 3, projects: [project] }),
        );
      },
      { key: storageKey, project: savedProject(0) },
    );
    await page.goto(`${locale === "fa" ? "/fa" : ""}/projects`);
    const main = page.getByRole("main");
    const title = locale === "fa" ? "پروژه جدید" : "New project";
    const create = main.getByRole("button", { name: title, exact: true });
    await expect(create).toHaveCount(1);
    await expect(create).toBeInViewport({ ratio: 1 });
    const action = await create.boundingBox();
    const heading = await main.getByRole("heading", { level: 1 }).boundingBox();
    expect(action).not.toBeNull();
    expect(heading).not.toBeNull();
    if (action && heading) {
      expect(action.height).toBeLessThanOrEqual(56);
      expect(action.width).toBeLessThan(240);
      expect(
        Math.abs(action.y + action.height / 2 - heading.y - heading.height / 2),
      ).toBeLessThanOrEqual(4);
      if (locale === "fa") {
        expect(action.x + action.width).toBeLessThan(heading.x);
      } else {
        expect(action.x).toBeGreaterThan(heading.x + heading.width);
      }
    }
    await create.click();
    await expect(
      page.getByRole("dialog", { name: title, exact: true }),
    ).toBeVisible();
  });
}

test("detail uses a fixed header back anchor, not a content pill or browser history", async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, project }) => {
      sessionStorage.setItem(
        key,
        JSON.stringify({ version: 3, projects: [project] }),
      );
    },
    { key: storageKey, project: savedProject(0) },
  );
  await page.goto("/project/project-0");
  await expect(
    page.getByRole("heading", { name: "Project 0", exact: true }),
  ).toBeVisible();
  const back = page.getByRole("link", {
    name: "Back to projects",
    exact: true,
  });
  await expect(back).toHaveAttribute("href", "/projects");
  await expect(
    page.getByRole("main").getByRole("link", { name: "Back to projects" }),
  ).toHaveCount(0);
  const box = await back.boundingBox();
  expect(box?.width).toBe(38);
  expect(box?.height).toBe(38);
  await expect(page.getByRole("link", { name: "About Agora" })).toHaveCount(0);
  await expect(
    page.getByRole("banner").getByRole("button", {
      name: "New project",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Project settings", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Share project", exact: true }),
  ).toHaveCount(0);
  const documents: string[] = [];
  page.on("request", (request) => {
    if (request.isNavigationRequest()) documents.push(request.url());
  });
  await back.click();
  await expect(page).toHaveURL("/projects");
  await expect(page.getByRole("main")).toContainText("Project 0");
  expect(documents).toEqual([]);
});

test("nested content scroll resets on navigation and restores on browser back", async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, projects }) => {
      sessionStorage.setItem(key, JSON.stringify({ version: 3, projects }));
    },
    {
      key: storageKey,
      projects: Array.from({ length: 30 }, (_, index) => savedProject(index)),
    },
  );
  await page.goto("/projects");
  const main = page.getByRole("main");
  const project = main.getByRole("link", { name: "Project 29", exact: true });
  await project.scrollIntoViewIfNeeded();
  const scroll = await main.evaluate((element) => element.scrollTop);
  expect(scroll).toBeGreaterThan(0);
  await project.click();
  await expect(page).toHaveURL("/project/project-29");
  await expect
    .poll(async () => main.evaluate((element) => element.scrollTop))
    .toBe(0);
  await main.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(
    page.getByRole("link", { name: "Back to projects", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL("/projects");
  await expect
    .poll(async () => main.evaluate((element) => element.scrollTop))
    .toBe(scroll);
});

test("localized mobile detail keeps the back anchor RTL-aware", async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.addInitScript(
    ({ key, project }) => {
      sessionStorage.setItem(
        key,
        JSON.stringify({ version: 3, projects: [project] }),
      );
    },
    { key: storageKey, project: savedProject(0) },
  );
  await page.goto("/fa/project/project-0");
  const back = page.getByRole("link", {
    name: "بازگشت به پروژه‌ها",
    exact: true,
  });
  await expect(back).toHaveAttribute("href", "/fa/projects");
  await expect(
    page.getByRole("heading", { name: "Project 0", exact: true }),
  ).toBeVisible();
  await expect(back.locator("img")).toHaveCSS(
    "transform",
    "matrix(-1, 0, 0, 1, 0, 0)",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await back.click();
  await expect(page).toHaveURL("/fa/projects");
});

test("mobile project detail has only the compact back/actions header", async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.addInitScript(
    ({ key, project }) => {
      sessionStorage.setItem(
        key,
        JSON.stringify({ version: 3, projects: [project] }),
      );
    },
    { key: storageKey, project: savedProject(0) },
  );
  await page.goto("/project/project-0");
  await expect(
    page.getByRole("heading", { name: "Project 0", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open navigation menu", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Log in", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("banner").getByRole("img", { name: "Agora", exact: true }),
  ).toHaveCount(0);
  const header = await page.getByRole("banner").boundingBox();
  const back = await page
    .getByRole("link", { name: "Back to projects", exact: true })
    .boundingBox();
  const settings = await page
    .getByRole("button", { name: "Project settings", exact: true })
    .boundingBox();
  expect(header?.height).toBeLessThanOrEqual(62);
  expect(back?.y).toBe(settings?.y);
  await page
    .getByRole("link", { name: "Back to projects", exact: true })
    .click();
  await expect(page).toHaveURL("/projects");
  await expect(
    page.getByRole("button", { name: "Open navigation menu", exact: true }),
  ).toBeVisible();
});

for (const locale of ["en", "fa"]) {
  test(`mobile ${locale} project creation stays reachable while the list scrolls`, async ({
    page,
  }) => {
    const viewport = { width: locale === "fa" ? 320 : 402, height: 874 };
    await page.setViewportSize(viewport);
    await page.addInitScript(
      ({ key, projects }) => {
        sessionStorage.setItem(key, JSON.stringify({ version: 3, projects }));
      },
      {
        key: storageKey,
        projects: Array.from({ length: 12 }, (_, index) => savedProject(index)),
      },
    );
    const prefix = locale === "en" ? "" : "/fa";
    await page.goto(`${prefix}/projects`);
    const title = locale === "en" ? "New project" : "پروژه جدید";
    const main = page.getByRole("main");
    const createProject = page.getByRole("button", {
      name: title,
      exact: true,
    });
    await expect(createProject).toHaveCount(1);
    await expect(createProject).toBeEnabled();
    await expect(createProject).toBeInViewport({ ratio: 1 });
    const header = page.getByRole("banner");
    await expect(
      header.getByRole("button", { name: title, exact: true }),
    ).toHaveCount(0);
    expect((await header.boundingBox())?.height).toBe(56);
    const initialPosition = await createProject.boundingBox();
    if (initialPosition === null) throw new Error("Missing creation button");
    expect(initialPosition.y).toBeGreaterThan(viewport.height - 100);
    const buttonCenter = initialPosition.x + initialPosition.width / 2;
    if (locale === "en") {
      expect(buttonCenter).toBeGreaterThan(viewport.width / 2);
    } else {
      expect(buttonCenter).toBeLessThan(viewport.width / 2);
    }
    const lastCard = main.getByRole("article").filter({
      has: page.getByRole("link", { name: "Project 11", exact: true }),
    });
    await main.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(lastCard).toBeInViewport({ ratio: 1 });
    const lastPosition = await lastCard.boundingBox();
    if (lastPosition === null) throw new Error("Missing last project card");
    expect(lastPosition.y + lastPosition.height).toBeLessThanOrEqual(
      initialPosition.y,
    );
    expect(await createProject.boundingBox()).toEqual(initialPosition);
    await createProject.click();
    const dialog = page.getByRole("dialog", { name: title, exact: true });
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("button", {
        name: locale === "en" ? "Cancel" : "انصراف",
        exact: true,
      })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(createProject).toBeFocused();
  });
}

test("search misses are not presented as having no projects", async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, project }) => {
      sessionStorage.setItem(
        key,
        JSON.stringify({ version: 3, projects: [project] }),
      );
    },
    { key: storageKey, project: savedProject(0) },
  );
  await page.goto("/projects");
  const main = page.getByRole("main");
  await expect(main).toContainText("Project 0");
  await main
    .getByRole("searchbox", { name: "Search projects...", exact: true })
    .fill("not a matching project");
  await expect(
    main.getByText("No projects match your search.", { exact: true }),
  ).toBeVisible();
  await expect(main.getByText("No projects yet", { exact: true })).toHaveCount(
    0,
  );
  await main
    .getByRole("searchbox", { name: "Search projects...", exact: true })
    .clear();
  await expect(main).toContainText("Project 0");
});

test("creates a project through the shared form and preserves it on refresh", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") writes.push(request.url());
  });
  await page.goto("/projects");
  await page
    .getByRole("button", { name: "New project", exact: true })
    .first()
    .click();
  const form = page.getByRole("dialog", { name: "New project", exact: true });
  await expect(form).toBeVisible();
  await form
    .getByLabel("Project name", { exact: true })
    .fill("Our new project");
  await form
    .getByLabel("Description", { exact: true })
    .fill("Created in this tab, not on the backend.");
  await form
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(form).toHaveCount(0);
  await expect(page).toHaveURL(/\/project\/our-new-project-[a-z0-9]+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Our new project" }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText(
    "Created in this tab, not on the backend.",
  );
  const url = page.url();
  await page.reload();
  await expect(page).toHaveURL(url);
  await expect(
    page.getByRole("heading", { level: 1, name: "Our new project" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Expand or collapse projects" }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    page
      .getByRole("complementary")
      .getByRole("link", { name: "Our new project", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("complementary")
    .getByRole("link", { name: "Projects", exact: true })
    .click();
  await expect(page).toHaveURL("/projects");
  await expect(page.getByRole("main")).toContainText("Our new project");
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test("cancel and required-field validation never create a project", async ({
  page,
}) => {
  await page.goto("/projects");
  const open = page
    .getByRole("button", { name: "New project", exact: true })
    .first();
  await open.click();
  const form = page.getByRole("dialog", { name: "New project" });
  const before = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    storageKey,
  );
  await form
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(form).toBeVisible();
  await expect(page).toHaveURL("/projects");
  await form.getByLabel("Project name", { exact: true }).fill("Not saved");
  await form.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(form).toHaveCount(0);
  await expect(open).toBeFocused();
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), storageKey),
  ).toBe(before);
});

test("browser-only projects do not leak between independently opened tabs", async ({
  page,
  context,
}) => {
  await page.goto("/projects");
  await page
    .getByRole("button", { name: "New project", exact: true })
    .first()
    .click();
  const form = page.getByRole("dialog", { name: "New project" });
  await form.getByLabel("Project name", { exact: true }).fill("Only this tab");
  await form
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(page).toHaveURL(/\/project\//);
  const second = await context.newPage();
  await second.goto("/projects");
  await expect(
    second.getByRole("heading", { name: /Your Projects/, level: 1 }),
  ).toBeVisible();
  await expect(second.getByRole("main")).not.toContainText("Only this tab");
  await expect(
    second.getByRole("main").getByRole("link", { name: /My project/ }),
  ).toHaveCount(1);
});

test("the mobile form stays usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto("/projects");
  await page
    .getByRole("button", { name: "New project", exact: true })
    .first()
    .click();
  const form = page.getByRole("dialog", { name: "New project" });
  await form.getByLabel("Project name", { exact: true }).fill("Mobile project");
  expect(
    await form.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await form
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Mobile project" }),
  ).toBeVisible();
});

test("mock project text is escaped, not interpreted as HTML", async ({
  page,
}) => {
  await page.goto("/projects");
  await page
    .getByRole("button", { name: "New project", exact: true })
    .first()
    .click();
  const form = page.getByRole("dialog", { name: "New project" });
  const text = "<img src=x onerror=alert(1)>";
  await form.getByLabel("Project name", { exact: true }).fill(text);
  await form.getByLabel("Description", { exact: true }).fill(text);
  await form
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: text, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("paragraph").filter({ hasText: text }),
  ).toBeVisible();
  await expect(page.locator("img[onerror]")).toHaveCount(0);
});

test("project descriptions keep over-limit pastes editable and preserve formatting after reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const form = await openProjectCreation(page);
  await form.getByLabel("Project name", { exact: true }).fill("Formatting");
  const description = form.getByRole("textbox", {
    name: "Description",
    exact: true,
  });
  await description.focus();
  const longPaste = "x".repeat(5001);
  await description.evaluate((element, text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", text);
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );
  }, longPaste);
  await expect(description).toHaveText(longPaste);
  await expect(
    form.getByText("Shorten the description before saving."),
  ).toBeVisible();

  const submit = form.getByRole("button", {
    name: "Create project",
    exact: true,
  });
  await submit.click();
  await expect(form).toBeVisible();
  await expect(description).toBeFocused();

  await description.fill("Read https://example.org");
  await description.press("ControlOrMeta+a");
  await form.getByRole("button", { name: "Bold", exact: true }).click();
  await submit.click();
  const renderedLink = page.getByRole("link", { name: "https://example.org" });
  await expect(renderedLink).toBeVisible();
  // The settings hit target must not intercept interaction with rich-text links.
  await renderedLink.click({ trial: true });
  await page.reload();
  await expect(renderedLink).toHaveAttribute("href", "https://example.org");
  await expect(
    page.locator("strong").filter({ has: renderedLink }),
  ).toBeVisible();
});

test("compact descriptions can start a list and format a selection without an inline toolbar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 720 });
  const form = await openProjectCreation(page);
  const description = form.getByRole("textbox", {
    name: "Description",
    exact: true,
  });
  const bold = form.getByRole("button", { name: "Bold", exact: true });
  await description.click();
  await expect(bold).toBeHidden();
  await description.pressSequentially("- First item");
  await expect(description.getByRole("listitem")).toHaveText("First item");
  await description.press("ControlOrMeta+a");
  await expect(bold).toBeVisible();
  await bold.click();
  await expect(description.locator("strong")).toHaveText("First item");
});

test("reset clears mock projects without clearing other session data", async ({
  page,
}) => {
  await page.goto("/projects");
  await page.evaluate(() => {
    sessionStorage.setItem("unrelated-setting", "keep");
  });
  await page
    .getByRole("button", { name: "New project", exact: true })
    .first()
    .click();
  const form = page.getByRole("dialog", { name: "New project" });
  await form
    .getByLabel("Project name", { exact: true })
    .fill("Reset this project");
  await form
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(page).toHaveURL(/\/project\//);
  await page.getByRole("button", { name: /reset/i }).click();
  await expect(page).toHaveURL("/projects");
  await expect(page.getByRole("main")).not.toContainText("Reset this project");
  await expect(
    page.getByRole("main").getByRole("link", { name: /My project/ }),
  ).toHaveCount(1);
  expect(
    await page.evaluate(() => sessionStorage.getItem("unrelated-setting")),
  ).toBe("keep");
});

test("corrupt saved mock data is visible and recoverable through reset", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    sessionStorage.setItem(key, "{not valid json");
  }, storageKey);
  await page.goto("/projects");
  await expect(page.getByRole("alert").first()).toBeVisible();
  await page.getByRole("button", { name: /reset/i }).click();
  await expect(
    page.getByRole("button", { name: "New project", exact: true }).first(),
  ).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("uses the workspace owner and saves participation defaults during creation", async ({
  page,
}) => {
  await page.goto("/projects");
  await page
    .getByRole("button", { name: "New project", exact: true })
    .first()
    .click();
  const form = page.getByRole("dialog", { name: "New project" });
  await form
    .getByLabel("Project name", { exact: true })
    .fill("Selected defaults");
  await expect(
    form.getByRole("button", {
      name: "Add managing organisation",
      exact: true,
    }),
  ).toHaveCount(0);
  await form.getByLabel("Authentication", { exact: true }).click();
  await page
    .getByRole("option", { name: "Email verification", exact: true })
    .click();
  await form.getByLabel("Email updates", { exact: true }).click();
  await page
    .getByRole("option", { name: "Ask participants", exact: true })
    .click();
  await form
    .getByLabel("Contact email", { exact: true })
    .last()
    .fill("contact@example.org");
  await form
    .getByRole("switch", { name: "Dynamic translation", exact: true })
    .click();
  await form.getByLabel("Additional languages", { exact: true }).click();
  await page.getByRole("option", { name: "Français", exact: true }).click();
  await page.keyboard.press("Escape");
  await form
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(page).toHaveURL(/\/project\//);
  const saved = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    storageKey,
  );
  expect(saved).toContain('"ownerOrganizationSlugs":["personal-organization"]');
  expect(saved).toContain('"authentication":"email_verification"');
  expect(saved).toContain('"emailUpdates":"ask"');
  expect(saved).toContain('"email":"contact@example.org"');
  expect(saved).not.toContain(
    '"organizationSlug":"personal-organization","email"',
  );
  expect(saved).toContain('"targetLanguageCodes":["fr"]');
  expect(saved).toContain('"dynamicTranslationEnabled":true');
});

test("the organisation summary opens settings and saves credits separately from ownership", async ({
  page,
}) => {
  const form = await openSettingsForNewProject({ page, name: "Rich project" });
  await form.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit project organisations", exact: true })
    .click();
  await form
    .getByRole("button", { name: "Add public credit", exact: true })
    .click();
  const first = form.getByRole("group", {
    name: "Public credit 1",
    exact: true,
  });
  await first.getByLabel("Organisation type", { exact: true }).click();
  await page
    .getByRole("option", { name: "Existing organisation", exact: true })
    .click();
  await first.getByLabel("Existing organisation", { exact: true }).click();
  await page
    .getByRole("option", { name: "Riverside Trust", exact: true })
    .click();
  await first.getByLabel("Public role", { exact: true }).click();
  await page
    .getByRole("option", { name: "Project Owner", exact: true })
    .click();

  await form
    .getByRole("button", { name: "Add public credit", exact: true })
    .click();
  const second = form.getByRole("group", {
    name: "Public credit 2",
    exact: true,
  });
  await second
    .getByLabel("Organisation name", { exact: true })
    .fill("Green Foundation");
  await second
    .getByText("Additional organisation details", { exact: true })
    .click();
  await second
    .getByLabel("Organisation description", { exact: true })
    .fill("Local project funding");
  await second
    .getByLabel("Organisation website", { exact: true })
    .fill("https://example.org/foundation");
  await second.getByLabel("Public role", { exact: true }).click();
  await page.getByRole("option", { name: "Sponsor", exact: true }).click();
  await form
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(form).toHaveCount(0);
  const saved = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    storageKey,
  );
  expect(saved).toContain('"ownerOrganizationSlugs":["personal-organization"]');
  expect(saved).toContain(
    '"source":"organization","role":"project_owner","organizationSlug":"riverside-trust"',
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Edit project organisations", exact: true })
    .click();
  await expect(
    form.getByLabel("Organisation name", { exact: true }),
  ).toHaveValue("Green Foundation");
});

test("email settings reuse the saved project contact", async ({ page }) => {
  const form = await openSettingsForNewProject({
    page,
    name: "Project contact",
  });
  const email = form.getByLabel("Contact email", { exact: true });
  await expect(email).toHaveCount(0);
  await form.getByLabel("Email updates", { exact: true }).click();
  await page
    .getByRole("option", { name: "Ask participants", exact: true })
    .click();
  await expect(email).toHaveAttribute("required", "");
  await expect(
    form.getByLabel("Authentication", { exact: true }),
  ).toContainText("Email verification");
  await email.fill("team@example.org");
  await form
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(form).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("main")).toContainText("team@example.org");
  await page
    .getByRole("button", { name: "Project settings", exact: true })
    .click();
  await expect(email).toHaveValue("team@example.org");
});

test("localized RTL creation preserves SPA navigation and layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto("/fa/projects");
  const navigations: string[] = [];
  page.on("request", (request) => {
    if (request.isNavigationRequest()) navigations.push(request.url());
  });
  await page
    .getByRole("button", { name: "پروژه جدید", exact: true })
    .first()
    .click();
  const form = page.getByRole("dialog", { name: "پروژه جدید" });
  await expect(form).toHaveAttribute("dir", "rtl");
  await form.getByLabel("نام پروژه", { exact: true }).fill("پروژه محله");
  await form.getByRole("button", { name: "ایجاد پروژه", exact: true }).click();
  await expect(page).toHaveURL(/\/fa\/project\/project-[a-z0-9]+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "پروژه محله" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(navigations).toEqual([]);
});
