import {
  containsEmailUpdateRecipientActionPath,
  getEmailUpdateRecipientActionPurpose,
  isEmailUpdateRecipientActionPath,
  redactEmailUpdateRecipientActionPaths,
  shouldReloadForEmailUpdateRecipientAction,
} from "src/utils/privacy/emailUpdateRecipientPath";
import { describe, expect, it } from "vitest";

describe("Email Update recipient action paths", () => {
  it.each(["unsubscribe", "preferences", "report"] as const)(
    "recognizes an exact %s token path",
    (purpose) => {
      const path = `/email-updates/${purpose}/secret-token`;
      expect(getEmailUpdateRecipientActionPurpose(path)).toBe(purpose);
      expect(isEmailUpdateRecipientActionPath(`${path}/`)).toBe(true);
    }
  );

  it.each([
    "/email-updates/",
    "/email-updates/preferences/",
    "/email-updates/preferences/token/extra",
    "/email-updates/unknown/token",
    "/email-updates/preferences/token?query=1",
  ])("rejects a non-recipient path: %s", (path) => {
    expect(isEmailUpdateRecipientActionPath(path)).toBe(false);
  });

  it("finds nested action URLs and redacts tokens to a fixed path", () => {
    const value = {
      event: {
        from: "https://agoracitizen.network/email-updates/preferences/secret-token?source=email",
      },
    };

    expect(containsEmailUpdateRecipientActionPath(value)).toBe(true);
    expect(redactEmailUpdateRecipientActionPaths(value.event.from)).toBe(
      "/email-updates/preferences/[redacted]"
    );
  });

  it("handles cyclic values without exposing or throwing", () => {
    const value: { self?: unknown; path: string } = { path: "/safe" };
    value.self = value;
    expect(containsEmailUpdateRecipientActionPath(value)).toBe(false);
  });

  it("does not invoke accessors while inspecting telemetry values", () => {
    const value = Object.defineProperty({}, "url", {
      enumerable: true,
      get: () => {
        throw new Error("must not run");
      },
    });

    expect(containsEmailUpdateRecipientActionPath(value)).toBe(true);
  });

  it("requires a document reload when crossing the action-route boundary", () => {
    expect(
      shouldReloadForEmailUpdateRecipientAction({
        currentPathname: "/conversation/example",
        targetPathname: "/email-updates/preferences/secret-token",
      })
    ).toBe(true);
    expect(
      shouldReloadForEmailUpdateRecipientAction({
        currentPathname: "/email-updates/preferences/secret-token",
        targetPathname: "/",
      })
    ).toBe(true);
    expect(
      shouldReloadForEmailUpdateRecipientAction({
        currentPathname: "/email-updates/preferences/secret-token",
        targetPathname: "/email-updates/report/another-token",
      })
    ).toBe(false);
    expect(
      shouldReloadForEmailUpdateRecipientAction({
        currentPathname: "/conversation/example",
        targetPathname: "/settings/account/email-updates/",
      })
    ).toBe(false);
  });
});
