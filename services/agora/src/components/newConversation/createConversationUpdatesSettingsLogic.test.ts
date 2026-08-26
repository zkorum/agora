import { describe, expect, it } from "vitest";

import {
  canSelectConversationUpdatesSetting,
  getConversationUpdatesOverrideUpdate,
  hasConversationUpdatesSettingChanged,
  shouldShowConversationUpdatesSettings,
} from "./createConversationUpdatesSettingsLogic";

const visibilityCases: Array<{
  mode: "create" | "edit";
  canConfigure: boolean;
  hasParticipantContactEmail: boolean;
  expected: boolean;
}> = [
  {
    mode: "create",
    canConfigure: true,
    hasParticipantContactEmail: true,
    expected: true,
  },
  {
    mode: "create",
    canConfigure: true,
    hasParticipantContactEmail: false,
    expected: false,
  },
  {
    mode: "create",
    canConfigure: false,
    hasParticipantContactEmail: true,
    expected: false,
  },
  {
    mode: "edit",
    canConfigure: true,
    hasParticipantContactEmail: false,
    expected: true,
  },
  {
    mode: "edit",
    canConfigure: false,
    hasParticipantContactEmail: true,
    expected: false,
  },
];

describe("shouldShowConversationUpdatesSettings", () => {
  it.each(visibilityCases)(
    "returns $expected for mode=$mode capability=$canConfigure contact=$hasParticipantContactEmail",
    ({ mode, canConfigure, hasParticipantContactEmail, expected }) => {
      expect(
        shouldShowConversationUpdatesSettings({
          canConfigure,
          hasParticipantContactEmail,
          mode,
        })
      ).toBe(expected);
    }
  );
});

describe("canSelectConversationUpdatesSetting", () => {
  it("allows only corrective disabled settings when contact is missing", () => {
    expect(
      canSelectConversationUpdatesSetting({
        hasParticipantContactEmail: false,
        scopeDefaultEnabled: true,
        value: false,
      })
    ).toBe(true);
    expect(
      canSelectConversationUpdatesSetting({
        hasParticipantContactEmail: false,
        scopeDefaultEnabled: false,
        value: undefined,
      })
    ).toBe(true);
    expect(
      canSelectConversationUpdatesSetting({
        hasParticipantContactEmail: false,
        scopeDefaultEnabled: true,
        value: undefined,
      })
    ).toBe(false);
    expect(
      canSelectConversationUpdatesSetting({
        hasParticipantContactEmail: false,
        scopeDefaultEnabled: false,
        value: true,
      })
    ).toBe(false);
  });
});

describe("hasConversationUpdatesSettingChanged", () => {
  it.each([
    [undefined, undefined, false],
    [true, true, false],
    [false, false, false],
    [undefined, true, true],
    [undefined, false, true],
    [true, false, true],
  ])(
    "compares current override %s with original override %s",
    (currentOverride, originalOverride, expected) => {
      expect(
        hasConversationUpdatesSettingChanged({
          currentOverride,
          originalOverride,
        })
      ).toBe(expected);
    }
  );
});

describe("getConversationUpdatesOverrideUpdate", () => {
  it.each([
    [undefined, undefined, undefined],
    [true, true, undefined],
    [false, false, undefined],
    [true, undefined, true],
    [false, undefined, false],
    [undefined, true, null],
    [undefined, false, null],
  ] as const)(
    "maps current=%s original=%s to %s",
    (currentOverride, originalOverride, expected) => {
      expect(
        getConversationUpdatesOverrideUpdate({
          currentOverride,
          originalOverride,
        })
      ).toBe(expected);
    }
  );
});
