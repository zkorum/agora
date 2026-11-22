import { describe, expect, test } from "vitest";

import { projectParticipantContactSchema } from "./project-contact.js";

describe("project contact boundary", () => {
  test("allows email alone without creating an affiliation", () => {
    const contact = projectParticipantContactSchema.parse({
      email: "  Riverside@Example.org ",
    });
    expect(contact).toMatchObject({ email: "riverside@example.org" });
    expect(contact.organizationSlug).toBeUndefined();
    expect(contact.firstName).toBeUndefined();
  });

  test("normalizes rich contact fields without coupling affiliation to ownership", () => {
    expect(
      projectParticipantContactSchema.parse({
        firstName: " Alex ",
        lastName: " Martin ",
        roleLabel: " Project coordinator ",
        email: " Team@Example.org ",
        websiteUrl: " https://example.org/contact ",
        imagePath: " https://example.org/alex.png ",
        organizationSlug: "riverside-trust",
      }),
    ).toEqual({
      firstName: "Alex",
      lastName: "Martin",
      roleLabel: "Project coordinator",
      email: "team@example.org",
      websiteUrl: "https://example.org/contact",
      imagePath: "https://example.org/alex.png",
      organizationSlug: "riverside-trust",
      isFullImagePath: true,
    });
  });

  test.each([
    { firstName: "Alex" },
    { lastName: "Martin" },
    { organizationSlug: "riverside-trust" },
  ])(
    "requires email even when a website and identity are provided: %j",
    (identity) => {
      expect(
        projectParticipantContactSchema.safeParse({
          ...identity,
          websiteUrl: "https://example.org/contact",
        }).success,
      ).toBe(false);
    },
  );

  test.each([
    {},
    { firstName: "Alex" },
    { websiteUrl: "https://example.org/contact" },
    { email: "team@example.org\r\nBcc: other@example.org" },
    { email: "not-an-email" },
    { email: "team@localhost" },
    { email: `${"a".repeat(244)}@example.org` },
    { email: "team@example.org", imagePath: "javascript:alert(1)" },
    {
      email: "team@example.org",
      imagePath: "https://user:pass@example.org/a.png",
    },
    { email: "team@example.org", websiteUrl: "http://example.org" },
    { email: "team@example.org", firstName: "a".repeat(101) },
    { email: "team@example.org", roleLabel: "a".repeat(151) },
  ])("rejects invalid contact details: %j", (contact) => {
    expect(projectParticipantContactSchema.safeParse(contact).success).toBe(
      false,
    );
  });
});
