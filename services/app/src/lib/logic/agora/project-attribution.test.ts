import { describe, expect, test } from "vitest";

import {
  createProjectAttributionDraft,
  getProjectAttributionInput,
  projectAttributionRoleSchema,
  projectAttributionSchema,
} from "./project-attribution.js";
import { createProjectInputSchema } from "./project-creation.js";

describe("public project credits", () => {
  test.each(projectAttributionRoleSchema.options)(
    "preserves canonical role %s without assigning administrative ownership",
    (role) => {
      expect(
        projectAttributionSchema.parse({
          source: "organization",
          organizationSlug: "riverside-trust",
          role,
        }),
      ).toEqual({
        source: "organization",
        organizationSlug: "riverside-trust",
        role,
      });
    },
  );

  test("represents external organisations without fabricating an account or slug", () => {
    expect(
      projectAttributionSchema.parse(
        getProjectAttributionInput({
          ...createProjectAttributionDraft(1),
          source: "external",
          role: "sponsor",
          defaultLanguageCode: "fr",
          displayName: " Green Foundation ",
          description: " Local support ",
          websiteUrl: " https://example.org ",
          imagePath: " https://example.org/logo.png ",
        }),
      ),
    ).toEqual({
      source: "external",
      role: "sponsor",
      defaultLanguageCode: "fr",
      displayName: "Green Foundation",
      description: "Local support",
      websiteUrl: "https://example.org",
      imagePath: "https://example.org/logo.png",
      isFullImagePath: true,
      additionalLocalizations: [],
    });
  });

  test("keeps empty added rows invalid rather than silently discarding them", () => {
    expect(
      projectAttributionSchema.safeParse(
        getProjectAttributionInput(createProjectAttributionDraft(1)),
      ).success,
    ).toBe(false);
  });

  test("rejects external translations until the form can edit and display them", () => {
    expect(
      projectAttributionSchema.safeParse({
        source: "external",
        role: "sponsor",
        defaultLanguageCode: "en",
        displayName: "Foundation",
        additionalLocalizations: [
          {
            languageCode: "fr",
            displayName: "Fondation",
            description: "",
          },
        ],
      }).success,
    ).toBe(false);
  });

  test.each([
    { source: "organization", role: "admin", organizationSlug: "agora" },
    { source: "organization", role: "partner", organizationSlug: "" },
    {
      source: "external",
      role: "sponsor",
      defaultLanguageCode: "en",
      displayName: "Foundation",
      websiteUrl: "http://example.org",
    },
    {
      source: "external",
      role: "sponsor",
      defaultLanguageCode: "en",
      displayName: "Foundation",
      imagePath: "data:image/svg+xml,<svg/>",
    },
  ])("rejects invalid credit data: %j", (credit) => {
    expect(projectAttributionSchema.safeParse(credit).success).toBe(false);
  });

  test("rejects repeated organisation-role pairs but allows distinct roles", () => {
    const project = {
      projectSlug: "riverside",
      projectTitle: "Riverside",
      body: "",
      ownerOrganizationSlugs: ["agora"],
      authentication: "guest",
      emailUpdates: "off",
      languageSettings: {
        targetLanguageCodes: [],
        dynamicTranslationEnabled: false,
      },
      contentLocalizations: [],
    };
    const credit = projectAttributionSchema.parse({
      source: "organization",
      role: "sponsor",
      organizationSlug: "riverside-trust",
    });
    expect(
      createProjectInputSchema.safeParse({
        ...project,
        attributions: [credit, credit],
      }).success,
    ).toBe(false);
    const parsed = createProjectInputSchema.parse({
      ...project,
      attributions: [credit, { ...credit, role: "partner" }],
    });
    expect(parsed.ownerOrganizationSlugs).toEqual(["agora"]);
    expect(parsed.attributions).toHaveLength(2);
  });
});
