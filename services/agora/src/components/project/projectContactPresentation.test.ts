import { describe, expect, it } from "vitest";

import { getProjectContactPresentation } from "./projectContactPresentation";

describe("project contact presentation", () => {
  it("uses the project email when no name or affiliation is supplied", () => {
    expect(
      getProjectContactPresentation({ email: "riverside@example.com" })
    ).toEqual({
      displayName: "riverside@example.com",
      subtitle: "",
      initials: "R",
    });
  });

  it("promotes an organization-only contact without repeating its name", () => {
    expect(
      getProjectContactPresentation({
        affiliationName: "Agro Toulouse",
        email: "contact@example.com",
      })
    ).toEqual({ displayName: "Agro Toulouse", subtitle: "", initials: "AT" });
  });

  it("keeps a named person's organization and role below their name", () => {
    expect(
      getProjectContactPresentation({
        firstName: "Alex",
        lastName: "Martin",
        affiliationName: "AgroToulouse",
        roleLabel: "Project coordinator",
      })
    ).toEqual({
      displayName: "Alex Martin",
      subtitle: "Project coordinator · AgroToulouse",
      initials: "AM",
    });
  });

  it("keeps an organization-only contact's role as the subtitle", () => {
    expect(
      getProjectContactPresentation({
        affiliationName: "AgroToulouse",
        roleLabel: "Participant support",
      })
    ).toEqual({
      displayName: "AgroToulouse",
      subtitle: "Participant support",
      initials: "A",
    });
  });

  it("supports a person identified by their last name only", () => {
    expect(
      getProjectContactPresentation({
        lastName: "Martin",
        affiliationName: "AgroToulouse",
      })
    ).toEqual({
      displayName: "Martin",
      subtitle: "AgroToulouse",
      initials: "M",
    });
  });
});
