import { describe, expect, test } from "vitest";

import {
  createProjectInputSchema,
  createProjectSlug,
  getProjectEmailUpdateDefaultEnabled,
  projectAuthenticationSchema,
  projectLanguageSettingsSchema,
  projectOrganizationSchema,
  projectSlugSchema,
  projectTargetLanguageLimit,
} from "./project-creation.js";

const input = {
  projectSlug: "riverside",
  projectTitle: "A Greener Riverside",
  body: "",
  ownerOrganizationSlugs: ["civic-tomorrow"],
  authentication: "guest",
  emailUpdates: "off",
  languageSettings: {
    targetLanguageCodes: [],
    dynamicTranslationEnabled: false,
  },
  contentLocalizations: [],
};

describe("project creation input", () => {
  test("parses and trims form input", () => {
    const parsed = createProjectInputSchema.parse({
      ...input,
      projectTitle: "  Riverside  ",
      body: "  Some context  ",
    });
    expect(parsed.projectTitle).toBe("Riverside");
    expect(parsed.body).toBe("Some context");
  });

  test("counts visible description text separately from HTML bytes", () => {
    const body = `<p><strong>${"a".repeat(5000)}</strong></p>`;
    expect(createProjectInputSchema.parse({ ...input, body }).body).toBe(body);
    expect(
      createProjectInputSchema.safeParse({
        ...input,
        body: `<p>${"<strong>a</strong>".repeat(4000)}</p>`,
      }).success,
    ).toBe(false);
  });

  test.each([
    { projectTitle: " " },
    { projectTitle: "a".repeat(151) },
    { body: "a".repeat(5001) },
    { ownerOrganizationSlugs: [] },
    { ownerOrganizationSlugs: ["civic-tomorrow", ""] },
    { ownerOrganizationSlugs: ["civic-tomorrow", "civic-tomorrow"] },
    { projectSlug: "../unsafe" },
    { authentication: "organization" },
    { authentication: "account" },
    { authentication: "email" },
    { authentication: "strong" },
    {
      languageSettings: {
        targetLanguageCodes: ["invented"],
        dynamicTranslationEnabled: true,
      },
    },
    { language: "fr" },
    { unexpected: true },
  ])("rejects invalid input %j", (invalid) => {
    expect(
      createProjectInputSchema.safeParse({ ...input, ...invalid }).success,
    ).toBe(false);
  });

  test.each(projectAuthenticationSchema.options)(
    "represents %s as a participant requirement, not an account identity",
    (authentication) => {
      expect(
        createProjectInputSchema.safeParse({ ...input, authentication })
          .success,
      ).toBe(true);
    },
  );
});

describe("project email defaults", () => {
  test("maps the organizer's prompt choice to the existing enabled default", () => {
    expect(getProjectEmailUpdateDefaultEnabled("ask")).toBe(true);
    expect(getProjectEmailUpdateDefaultEnabled("off")).toBe(false);
  });

  test.each(projectAuthenticationSchema.options)(
    "allows updates with %s participation without changing authentication",
    (authentication) => {
      const parsed = createProjectInputSchema.parse({
        ...input,
        authentication,
        emailUpdates: "ask",
        contact: {
          email: "  CONTACT@Example.org  ",
        },
      });
      expect(parsed.authentication).toBe(authentication);
      expect(parsed.contact).toEqual({
        email: "contact@example.org",
        isFullImagePath: true,
      });
    },
  );

  test("requires an organizer contact, not an assumed participant credential", () => {
    expect(
      createProjectInputSchema.safeParse({
        ...input,
        authentication: "email_verification",
        emailUpdates: "ask",
      }).success,
    ).toBe(false);
    expect(
      createProjectInputSchema.safeParse({
        ...input,
        emailUpdates: "ask",
        contact: {
          firstName: "Alex",
          websiteUrl: "https://example.org/contact",
        },
      }).success,
    ).toBe(false);
    expect(
      createProjectInputSchema.safeParse({
        ...input,
        contact: {
          organizationSlug: "civic-tomorrow",
          email: "not-an-email",
        },
      }).success,
    ).toBe(false);
  });

  test("keeps optional contact affiliation independent of administrative owners", () => {
    expect(
      createProjectInputSchema.safeParse({
        ...input,
        contact: {
          organizationSlug: "unselected-owner",
          email: "contact@example.org",
        },
      }).success,
    ).toBe(true);
  });

  test.each([
    "contact@example.org\r\nBcc: other@example.org",
    "contact@example.org\nReply-To: other@example.org",
    "not-an-email",
    "a".repeat(255) + "@example.org",
  ])("rejects invalid or header-injected contact addresses: %j", (email) => {
    expect(
      createProjectInputSchema.safeParse({
        ...input,
        contact: { organizationSlug: "civic-tomorrow", email },
      }).success,
    ).toBe(false);
  });
});

describe("project content language policy", () => {
  test("uses the existing two-additional-language limit", () => {
    expect(projectTargetLanguageLimit).toBe(2);
    expect(
      projectLanguageSettingsSchema.safeParse({
        dynamicTranslationEnabled: true,
        targetLanguageCodes: ["en", "fr", "es"],
      }).success,
    ).toBe(false);
  });

  test("uses backend language codes, not interface locale spellings or Auto", () => {
    const parsed = createProjectInputSchema.parse({
      ...input,
      languageSettings: {
        targetLanguageCodes: ["zh-Hans", "zh-Hant"],
        dynamicTranslationEnabled: true,
      },
    });
    expect(parsed.languageSettings.targetLanguageCodes).toEqual([
      "zh-Hans",
      "zh-Hant",
    ]);
    for (const codes of [["auto"], ["zh-hans"], ["fr", "fr"]]) {
      expect(
        projectLanguageSettingsSchema.safeParse({
          dynamicTranslationEnabled: true,
          targetLanguageCodes: codes,
        }).success,
      ).toBe(false);
    }
  });

  test("requires manual project content when automatic translation is off", () => {
    const manual = {
      ...input,
      body: "Original description",
      languageSettings: {
        targetLanguageCodes: ["fr"],
        dynamicTranslationEnabled: false,
      },
    };
    expect(createProjectInputSchema.safeParse(manual).success).toBe(false);
    expect(
      createProjectInputSchema.safeParse({
        ...manual,
        contentLocalizations: [
          { languageCode: "fr", projectTitle: "Projet", body: "" },
        ],
      }).success,
    ).toBe(false);
    expect(
      createProjectInputSchema.parse({
        ...manual,
        contentLocalizations: [
          {
            languageCode: "fr",
            projectTitle: "  Projet  ",
            body: "  Description traduite  ",
          },
        ],
      }).contentLocalizations,
    ).toEqual([
      {
        languageCode: "fr",
        projectTitle: "Projet",
        body: "Description traduite",
      },
    ]);
  });

  test("allows automatic translation without fabricating localized content", () => {
    expect(
      createProjectInputSchema.parse({
        ...input,
        languageSettings: {
          targetLanguageCodes: ["fr"],
          dynamicTranslationEnabled: true,
        },
      }).contentLocalizations,
    ).toEqual([]);
  });

  test("does not accept duplicate, inactive or incomplete manual translations", () => {
    const automatic = {
      ...input,
      body: "Original description",
      languageSettings: {
        targetLanguageCodes: ["fr"],
        dynamicTranslationEnabled: true,
      },
    };
    for (const contentLocalizations of [
      [{ languageCode: "es", projectTitle: "Proyecto", body: "Descripción" }],
      [{ languageCode: "fr", projectTitle: "Projet", body: "" }],
      [
        {
          languageCode: "fr",
          projectTitle: "Projet",
          body: "<ol><li><p></p></li></ol>",
        },
      ],
      [{ languageCode: "fr", projectTitle: "", body: "Description" }],
      [
        { languageCode: "fr", projectTitle: "Projet", body: "Description" },
        { languageCode: "fr", projectTitle: "Projet", body: "Description" },
      ],
    ]) {
      expect(
        createProjectInputSchema.safeParse({
          ...automatic,
          contentLocalizations,
        }).success,
      ).toBe(false);
    }
  });
});

describe("project logo boundary", () => {
  test.each([
    "/assets/logo.svg",
    "https://example.org/logo.png",
    "data:image/svg+xml,%3Csvg%3E%3C/svg%3E",
    "data:image/png;base64,aW1hZ2U=",
  ])("accepts supported image sources: %s", (src) => {
    expect(
      projectOrganizationSchema.safeParse({
        organizationSlug: "example",
        name: "Example",
        initials: "E",
        logo: { src, tone: "primary" },
      }).success,
    ).toBe(true);
  });

  test.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///private/logo.png",
    "http://example.org/logo.png",
    "//example.org/logo.png",
    "//agora.invalid/logo.png",
    "/\n/agora.invalid/logo.png",
    "/\\example.org/logo.png",
    "https://user:secret@example.org/logo.png",
  ])("rejects unsafe image sources: %s", (src) => {
    expect(
      projectOrganizationSchema.safeParse({
        organizationSlug: "example",
        name: "Example",
        initials: "E",
        logo: { src, tone: "primary" },
      }).success,
    ).toBe(false);
  });

  test("validates compact artwork independently", () => {
    expect(
      projectOrganizationSchema.safeParse({
        organizationSlug: "example",
        name: "Example",
        initials: "E",
        logo: {
          src: "/assets/logo.svg",
          compactSrc: "javascript:alert(1)",
          tone: "primary",
        },
      }).success,
    ).toBe(false);
  });
});

describe("project URLs", () => {
  test.each([
    "A Greener Riverside",
    "École & quartier",
    "مشروع جديد",
    "新しい計画",
    "  ",
  ])("generates a safe slug for %s", (title) => {
    const slug = createProjectSlug({
      title,
      uniquePart: "A1B2C3D4-0000-1111-2222-333333333333",
    });
    expect(projectSlugSchema.safeParse(slug).success).toBe(true);
    expect(slug).toMatch(/-a1b2c3d40000$/);
  });
  test("respects the canonical slug limit for long names", () => {
    expect(
      createProjectSlug({ title: "a".repeat(150), uniquePart: "123456789abc" }),
    ).toHaveLength(65);
  });
});
