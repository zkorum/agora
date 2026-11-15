import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { CanceledError } from "axios";
import { createPinia } from "pinia";
import type {
  ConversationOnboardingPreferenceSaveRequest,
  ConversationOnboardingPreferenceSaveResponse,
  ConversationParticipationStatus,
} from "src/shared/types/dto";
import { useAuthenticationStore } from "src/stores/authentication";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import type { useBackendAuthApi } from "src/utils/api/auth";
import {
  participationRejectionFixture,
  savedSurveyFixture,
} from "src/utils/api/participation/participationTestFixtures";
import { useSaveOnboardingPreference } from "src/utils/api/participation/useSaveOnboardingPreference";
import type { useBackendSurveyApi } from "src/utils/api/survey/survey";
import { useSurveyAnswerSaveMutation } from "src/utils/api/survey/useSurveyQueries";
import {
  getSurveyFormQueryKey,
  getSurveyStatusQueryKey,
} from "src/utils/query/conversationQueryKeys";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, nextTick, ref } from "vue";

const mocks = vi.hoisted(() => ({
  getStatus:
    vi.fn<
      (request: {
        conversationSlugId: string;
        skipEmailUpdateConsent?: boolean;
      }) => Promise<{ data: unknown }>
    >(),
  sign: vi.fn<() => Promise<string>>(),
  navigate: vi.fn<() => Promise<void>>(),
  notify: vi.fn(),
  saveSurvey:
    vi.fn<ReturnType<typeof useBackendSurveyApi>["saveSurveyAnswer"]>(),
  ensureAuth: vi.fn<() => Promise<void>>(),
  updateAuth: vi.fn<ReturnType<typeof useBackendAuthApi>["updateAuthState"]>(),
  savePreference:
    vi.fn<
      (
        request: ConversationOnboardingPreferenceSaveRequest
      ) => Promise<{ data: unknown }>
    >(),
}));
const route = {
  name: "/project/[projectSlug]/conversation/[postSlugId]/analysis",
  params: { projectSlug: "test", postSlugId: "example" },
  fullPath: "/project/test/conversation/example/analysis?opinion=statement",
};

vi.mock("src/api", () => ({
  DefaultApiAxiosParamCreator: () => ({
    apiV1ConversationOnboardingPreferenceSavePost: () =>
      Promise.resolve({
        url: "/api/v1/conversation/onboarding/preference/save",
        options: { method: "POST" },
      }),
    apiV1ConversationParticipationStatusPost: () =>
      Promise.resolve({
        url: "/api/v1/conversation/participation/status",
        options: { method: "POST" },
      }),
  }),
  DefaultApiFactory: () => ({
    apiV1ConversationOnboardingPreferenceSavePost: mocks.savePreference,
    apiV1ConversationParticipationStatusPost: async (
      request: { conversationSlugId: string; skipEmailUpdateConsent?: boolean },
      config: { signal?: AbortSignal }
    ) => {
      if (config.signal?.aborted) throw new CanceledError();
      return await mocks.getStatus(request);
    },
  }),
}));
vi.mock("src/utils/api/common", () => ({
  useCommonApi: () => ({
    buildEncodedUcan: mocks.sign,
    createRawAxiosRequestConfig: (config: object) => config,
  }),
}));
vi.mock("src/utils/api/survey/survey", () => ({
  useBackendSurveyApi: () => ({ saveSurveyAnswer: mocks.saveSurvey }),
}));
vi.mock("src/utils/api/auth", () => ({
  useBackendAuthApi: () => ({
    ensureParticipationAuthState: mocks.ensureAuth,
    updateAuthState: mocks.updateAuth,
  }),
}));
vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage: mocks.notify }),
}));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("src/stores/language", async () => {
  const { defineStore } = await import("pinia");
  return {
    useLanguageStore: defineStore("test-language", () => ({
      displayLanguage: ref("en"),
      spokenLanguages: ref<string[]>([]),
    })),
  };
});
vi.mock("src/composables/conversation/useSurveyNavigation", () => ({
  useSurveyNavigation: () => ({ navigateToSurveyRoot: mocks.navigate }),
}));
vi.mock("vue-router", () => ({ useRoute: () => route }));

import { useParticipationGate } from "./useParticipationGate";

const cleanups: Array<() => void> = [];
beforeEach(() => {
  mocks.getStatus.mockResolvedValue({ data: { status: "ready" } });
  mocks.sign.mockResolvedValue("signed-request");
  mocks.navigate.mockResolvedValue(undefined);
  mocks.ensureAuth.mockResolvedValue(undefined);
  route.name = "/project/[projectSlug]/conversation/[postSlugId]/analysis";
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  vi.resetAllMocks();
});

function mountGate({
  count = 1,
  initialized = true,
  withSurveySave = false,
  withPreferenceSave = false,
}: {
  count?: number;
  initialized?: boolean;
  withSurveySave?: boolean;
  withPreferenceSave?: boolean;
} = {}) {
  const pinia = createPinia();
  const auth = useAuthenticationStore(pinia);
  auth.isAuthInitialized = initialized;
  const queryClient = new QueryClient();
  const gates: Array<ReturnType<typeof useParticipationGate>> = [];
  let saveSurvey: ReturnType<typeof useSurveyAnswerSaveMutation> | undefined;
  let preference: ReturnType<typeof useSaveOnboardingPreference> | undefined;
  const app: App = createApp(
    defineComponent(() => {
      for (let index = 0; index < count; index++)
        gates.push(useParticipationGate("example"));
      if (withSurveySave)
        saveSurvey = useSurveyAnswerSaveMutation({
          conversationSlugId: "example",
        });
      if (withPreferenceSave) preference = useSaveOnboardingPreference();
      return () => null;
    })
  );
  app.use(pinia);
  app.use(VueQueryPlugin, { queryClient });
  app.mount(document.createElement("div"));
  cleanups.push(() => {
    app.unmount();
    queryClient.clear();
  });
  const gate = gates[0];
  if (gate === undefined) throw new Error("Gate was not mounted");
  return {
    gate,
    gates,
    auth,
    queryClient,
    saveSurvey,
    preference,
    onboarding: useConversationOnboardingStore(pinia),
  };
}

describe("preloaded backend participation status", () => {
  it("does not let a vote rejection from before onboarding rewind a completed session", async () => {
    const { gate, auth, preference, onboarding } = mountGate({
      initialized: false,
      withPreferenceSave: true,
    });
    if (preference === undefined)
      throw new Error("Preference saving was not mounted");
    auth.setLoginStatus({ isKnown: true, isLoggedIn: true, userId: "viewer" });
    auth.isAuthInitialized = true;
    await vi.waitFor(() =>
      expect(gate.participationStatus.value.status).toBe("ready")
    );
    const earlierVote = gate.captureParticipationAction();
    await gate.openParticipationOnboarding();
    mocks.savePreference.mockResolvedValue({
      data: {
        success: true,
        result: {
          operation: "set_conversation_preference",
          globalResumed: false,
          conversationPreferences: [
            {
              conversationSlugId: "example",
              state: "enabled",
              resolvedEnabled: true,
            },
          ],
        },
        participationStatus: { status: "ready" },
      },
    });
    await preference.savePreference({
      operation: "set_conversation_preference",
      conversationSlugId: "example",
      enabled: true,
    });
    onboarding.clearForConversation({ conversationSlugId: "example" });
    await earlierVote.handleBlockedReason(
      participationRejectionFixture("survey_required")
    );
    expect(gate.participationStatus.value).toEqual({ status: "ready" });
    expect(mocks.navigate).toHaveBeenCalledOnce();
    expect(mocks.notify).not.toHaveBeenCalled();
  });
  it("carries the saved snapshot into a newly created guest's cache without another status HTTP request", async () => {
    const { gate, auth, saveSurvey, queryClient } = mountGate({
      withSurveySave: true,
    });
    if (saveSurvey === undefined)
      throw new Error("Survey saving was not mounted");
    await vi.waitFor(() =>
      expect(gate.participationStatus.value.status).toBe("ready")
    );
    mocks.saveSurvey.mockResolvedValue({
      status: "success",
      data: {
        ...savedSurveyFixture,
        recovery: {
          kind: "survey",
          form: {
            success: true,
            surveyConfigId: 1,
            currentRevision: 1,
            surveyGate: savedSurveyFixture.surveyGate,
            questions: [savedSurveyFixture.savedQuestion],
          },
          routeResolution: savedSurveyFixture.routeResolution,
        },
      },
    });
    mocks.ensureAuth.mockImplementationOnce(() => {
      auth.setLoginStatus({
        isKnown: true,
        userId: "new-guest",
        isRegistered: false,
        isLoggedIn: false,
      });
      return Promise.resolve();
    });
    await saveSurvey.mutateAsync({
      questionSlugId: "question",
      expectedQuestionSemanticVersion: 1,
      knownSurveyRevision: 1,
      answer: null,
    });
    expect(auth.isGuest).toBe(true);
    const viewerScope = { kind: "viewer", userId: "new-guest" } as const;
    expect(
      queryClient.getQueryData(
        getSurveyFormQueryKey({
          conversationSlugId: "example",
          displayLanguage: "en",
          spokenLanguages: [],
          viewerScope,
        })
      )
    ).toMatchObject({
      currentRevision: 1,
      questions: [savedSurveyFixture.savedQuestion],
    });
    expect(
      queryClient.getQueryData(
        getSurveyStatusQueryKey({ conversationSlugId: "example", viewerScope })
      )
    ).toEqual({
      surveyGate: savedSurveyFixture.surveyGate,
      routeResolution: savedSurveyFixture.routeResolution,
    });
    expect(gate.participationStatus.value).toEqual({ status: "ready" });
    expect(mocks.getStatus).toHaveBeenCalledOnce();
  });
  it("uses the write rejection even if the reactive read snapshot still says blocked", async () => {
    mocks.getStatus.mockResolvedValue({
      data: { status: "blocked", reason: "conversation_closed" },
    });
    const { gate } = mountGate();
    await vi.waitFor(() =>
      expect(gate.participationStatus.value.status).toBe("blocked")
    );
    await gate
      .captureParticipationAction()
      .handleBlockedReason(participationRejectionFixture("account_required"));
    expect(mocks.navigate).toHaveBeenCalledOnce();
    expect(mocks.notify).toHaveBeenCalledExactlyOnceWith(
      "participationNeedsOnboarding"
    );
  });
  it("uses the preference write's next step without rereading the status endpoint", async () => {
    const { gate, auth, preference } = mountGate({
      initialized: false,
      withPreferenceSave: true,
    });
    if (preference === undefined)
      throw new Error("Preference saving was not mounted");
    auth.setLoginStatus({ isKnown: true, isLoggedIn: true, userId: "viewer" });
    auth.isAuthInitialized = true;
    await vi.waitFor(() =>
      expect(gate.participationStatus.value.status).toBe("ready")
    );
    const response: ConversationOnboardingPreferenceSaveResponse = {
      success: true,
      result: {
        operation: "set_project_preference",
        projectSlug: "project",
        state: "enabled",
        globalResumed: false,
      },
      participationStatus:
        participationRejectionFixture("survey_required").participationStatus,
    };
    mocks.savePreference.mockResolvedValue({ data: response });
    await expect(
      preference.savePreference({
        operation: "set_project_preference",
        projectSlug: "project",
        conversationSlugId: "example",
        enabled: true,
      })
    ).resolves.toEqual(response);
    expect(gate.participationStatus.value).toEqual(
      response.participationStatus
    );
    expect(mocks.getStatus).toHaveBeenCalledOnce();
    expect(mocks.savePreference).toHaveBeenCalledOnce();
  });

  it("returns expected cancellation without sending an obsolete signed preference request", async () => {
    const { gate, auth, preference } = mountGate({
      initialized: false,
      withPreferenceSave: true,
    });
    if (preference === undefined)
      throw new Error("Preference saving was not mounted");
    auth.setLoginStatus({ isKnown: true, isLoggedIn: true, userId: "viewer" });
    auth.isAuthInitialized = true;
    await vi.waitFor(() =>
      expect(gate.participationStatus.value.status).toBe("ready")
    );
    const signing = Promise.withResolvers<string>();
    mocks.sign.mockReturnValueOnce(signing.promise);
    const saving = preference.savePreference({
      operation: "set_conversation_preference",
      conversationSlugId: "example",
      enabled: false,
    });
    await vi.waitFor(() => expect(mocks.sign).toHaveBeenCalledTimes(2));
    auth.setLoginStatus({ isKnown: true, isLoggedIn: true, userId: "another" });
    signing.resolve("obsolete-signature");
    await expect(saving).resolves.toBeUndefined();
    expect(mocks.savePreference).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("ignores a late preference failure after an account switch instead of reporting it to the new viewer", async () => {
    const { gate, auth, preference } = mountGate({
      initialized: false,
      withPreferenceSave: true,
    });
    if (preference === undefined)
      throw new Error("Preference saving was not mounted");
    auth.setLoginStatus({ isKnown: true, isLoggedIn: true, userId: "viewer" });
    auth.isAuthInitialized = true;
    await vi.waitFor(() =>
      expect(gate.participationStatus.value.status).toBe("ready")
    );
    const pending = Promise.withResolvers<{ data: unknown }>();
    mocks.savePreference.mockReturnValue(pending.promise);
    const saving = preference.savePreference({
      operation: "set_conversation_preference",
      conversationSlugId: "example",
      enabled: true,
    });
    await vi.waitFor(() => expect(mocks.savePreference).toHaveBeenCalledOnce());
    auth.setLoginStatus({ isKnown: true, isLoggedIn: true, userId: "another" });
    pending.reject(new Error("old request failed"));
    await expect(saving).resolves.toBeUndefined();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("uses survey write eligibility without another HTTP request or a late replica overwrite", async () => {
    const oldRead = Promise.withResolvers<{
      data: ConversationParticipationStatus;
    }>();
    mocks.getStatus.mockReturnValue(oldRead.promise);
    mocks.saveSurvey.mockResolvedValue({
      status: "success",
      data: {
        ...savedSurveyFixture,
        success: true,
        surveyGate: {
          hasSurvey: true,
          isOptional: false,
          canParticipate: true,
          status: "complete_valid",
        },
        justCompleted: true,
        participationStatus: { status: "ready" },
      },
    });
    const { gate, saveSurvey } = mountGate({ withSurveySave: true });
    if (saveSurvey === undefined)
      throw new Error("Survey saving was not mounted");
    await vi.waitFor(() => expect(mocks.getStatus).toHaveBeenCalledOnce());
    await saveSurvey.mutateAsync({
      questionSlugId: "question",
      expectedQuestionSemanticVersion: 1,
      knownSurveyRevision: 1,
      answer: null,
    });
    expect(gate.participationStatus.value).toEqual({ status: "ready" });
    oldRead.resolve({
      data: participationRejectionFixture("survey_required")
        .participationStatus,
    });
    await nextTick();
    expect(gate.participationStatus.value).toEqual({ status: "ready" });
    expect(mocks.getStatus).toHaveBeenCalledOnce();
  });

  it("does not seed a new account with the old account's survey write result", async () => {
    const write =
      Promise.withResolvers<
        Awaited<
          ReturnType<ReturnType<typeof useBackendSurveyApi>["saveSurveyAnswer"]>
        >
      >();
    mocks.saveSurvey.mockReturnValue(write.promise);
    const { gate, auth, saveSurvey } = mountGate({ withSurveySave: true });
    if (saveSurvey === undefined)
      throw new Error("Survey saving was not mounted");
    await vi.waitFor(() =>
      expect(gate.participationStatus.value.status).toBe("ready")
    );
    const saving = saveSurvey.mutateAsync({
      questionSlugId: "question",
      expectedQuestionSemanticVersion: 1,
      knownSurveyRevision: 1,
      answer: null,
    });
    await vi.waitFor(() => expect(mocks.saveSurvey).toHaveBeenCalledOnce());
    mocks.getStatus.mockResolvedValue({
      data: participationRejectionFixture("account_required")
        .participationStatus,
    });
    auth.setLoginStatus({
      isKnown: true,
      userId: "other-account",
      isLoggedIn: true,
    });
    await vi.waitFor(() =>
      expect(gate.participationStatus.value.status).toBe("onboarding_required")
    );
    write.resolve({
      status: "success",
      data: {
        ...savedSurveyFixture,
        success: true,
        surveyGate: {
          hasSurvey: true,
          isOptional: false,
          canParticipate: true,
          status: "complete_valid",
        },
        justCompleted: true,
        participationStatus: { status: "ready" },
      },
    });
    await saving;
    expect(gate.participationStatus.value).toEqual(
      participationRejectionFixture("account_required").participationStatus
    );
  });

  it("opens Welcome while the first request is pending and preserves the return context", async () => {
    const pending = Promise.withResolvers<{
      data: ConversationParticipationStatus;
    }>();
    mocks.getStatus.mockReturnValue(pending.promise);
    const { gate, onboarding } = mountGate();
    expect(gate.participationStatus.value.status).toBe("checking");
    await gate.openParticipationOnboarding();
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith({
      conversationSlugId: "example",
    });
    expect(onboarding.returnTarget).toBe(route.fullPath);
    expect(onboarding.routeContext).toEqual({
      kind: "project",
      projectSlug: "test",
    });
    pending.resolve({ data: { status: "ready" } });
    await vi.waitFor(() =>
      expect(gate.participationStatus.value.status).toBe("ready")
    );
  });

  it("shares one HTTP request across 50 statement gates", async () => {
    const { gates } = mountGate({ count: 50 });
    await vi.waitFor(() =>
      expect(
        gates.every((gate) => gate.participationStatus.value.status === "ready")
      ).toBe(true)
    );
    expect(mocks.getStatus).toHaveBeenCalledTimes(1);
    expect(mocks.getStatus.mock.calls[0]?.[0]).toEqual({
      conversationSlugId: "example",
      skipEmailUpdateConsent: false,
    });
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it("waits for authentication initialization before preloading", async () => {
    const { gate, auth } = mountGate({ initialized: false });
    await nextTick();
    expect(mocks.getStatus).not.toHaveBeenCalled();
    expect(gate.participationStatus.value.status).toBe("checking");
    auth.isAuthInitialized = true;
    await vi.waitFor(() =>
      expect(gate.participationStatus.value.status).toBe("ready")
    );
  });

  it.each([
    "survey_required",
    "survey_outdated",
    "account_required",
    "strong_verification_required",
    "email_verification_required",
  ] as const)(
    "records a %s rejection and cancels a stale ready read before opening",
    async (reason) => {
      const pending = Promise.withResolvers<{
        data: ConversationParticipationStatus;
      }>();
      mocks.getStatus.mockReturnValue(pending.promise);
      const { gate, queryClient } = mountGate();
      await vi.waitFor(() => expect(mocks.getStatus).toHaveBeenCalledOnce());
      const rejection = participationRejectionFixture(reason);
      await gate.captureParticipationAction().handleBlockedReason(rejection);
      expect(gate.participationStatus.value).toEqual(
        rejection.participationStatus
      );
      expect(mocks.notify).toHaveBeenCalledExactlyOnceWith(
        "participationNeedsOnboarding"
      );
      expect(mocks.navigate).toHaveBeenCalledOnce();
      pending.resolve({ data: { status: "ready" } });
      await nextTick();
      await queryClient.cancelQueries();
      expect(gate.participationStatus.value).toEqual(
        rejection.participationStatus
      );
    }
  );

  it("does not let the old account's delayed response update the new account's status", async () => {
    const previous = Promise.withResolvers<{
      data: ConversationParticipationStatus;
    }>();
    mocks.getStatus.mockReturnValueOnce(previous.promise).mockResolvedValue({
      data: participationRejectionFixture("account_required")
        .participationStatus,
    });
    const { gate, auth } = mountGate();
    await vi.waitFor(() => expect(mocks.getStatus).toHaveBeenCalledOnce());
    auth.setLoginStatus({
      isKnown: true,
      userId: "new-account",
      isLoggedIn: true,
    });
    await vi.waitFor(() =>
      expect(gate.participationStatus.value.status).toBe("onboarding_required")
    );
    previous.resolve({ data: { status: "ready" } });
    await nextTick();
    expect(gate.needsAuth.value).toBe(true);
    expect(mocks.sign).toHaveBeenCalledOnce();
  });

  it("does not send a request signed for an account that changed during signing", async () => {
    const signing = Promise.withResolvers<string>();
    const { auth, gate } = mountGate({ initialized: false });
    auth.setLoginStatus({ isKnown: true, userId: "first", isLoggedIn: true });
    mocks.sign
      .mockReturnValueOnce(signing.promise)
      .mockResolvedValue("second-account");
    auth.isAuthInitialized = true;
    await vi.waitFor(() => expect(mocks.sign).toHaveBeenCalledOnce());
    auth.setLoginStatus({ isKnown: true, userId: "second", isLoggedIn: true });
    await vi.waitFor(() =>
      expect(gate.participationStatus.value.status).toBe("ready")
    );
    signing.resolve("first-account");
    await nextTick();
    expect(mocks.getStatus).toHaveBeenCalledOnce();
  });

  it("keeps a skipped optional consent scoped to the conversation and account", async () => {
    const { gate, auth, onboarding } = mountGate();
    await vi.waitFor(() =>
      expect(gate.participationStatus.value.status).toBe("ready")
    );
    onboarding.startResumeEntry({ conversationSlugId: "example" });
    onboarding.markEmailUpdateConsentSkipped();
    onboarding.clearForConversation({ conversationSlugId: "example" });
    await vi.waitFor(() => expect(mocks.getStatus).toHaveBeenCalledTimes(2));
    expect(mocks.getStatus.mock.calls[1]?.[0].skipEmailUpdateConsent).toBe(
      true
    );
    expect(onboarding.hasSkippedEmailUpdateConsent("another")).toBe(false);
    auth.setLoginStatus({ isKnown: true, userId: "other", isLoggedIn: true });
    await vi.waitFor(() => expect(mocks.getStatus).toHaveBeenCalledTimes(3));
    expect(mocks.getStatus.mock.calls[2]?.[0].skipEmailUpdateConsent).toBe(
      false
    );
  });

  it.each(["conversation_closed", "conversation_locked"] as const)(
    "does not open onboarding for %s",
    async (reason) => {
      mocks.getStatus.mockResolvedValue({
        data: { status: "blocked", reason },
      });
      const { gate } = mountGate();
      await vi.waitFor(() =>
        expect(gate.participationStatus.value.status).toBe("blocked")
      );
      await gate.openParticipationOnboarding();
      expect(mocks.navigate).not.toHaveBeenCalled();
      expect(mocks.notify).toHaveBeenCalledExactlyOnceWith(
        "participationUnavailable"
      );
    }
  );

  it("does not replace the return target when another rejection arrives inside onboarding", async () => {
    const { gate, onboarding } = mountGate();
    await gate.openParticipationOnboarding();
    const originalTarget = onboarding.returnTarget;
    route.name = "/conversation/[postSlugId].onboarding/verify";
    await gate
      .captureParticipationAction()
      .handleBlockedReason(participationRejectionFixture("survey_required"));
    expect(mocks.navigate).toHaveBeenCalledOnce();
    expect(onboarding.returnTarget).toBe(originalTarget);
  });

  it("rejects malformed or oversized status responses at the boundary", async () => {
    mocks.getStatus.mockResolvedValue({
      data: { status: "ready", userId: "unexpected-private-data" },
    });
    const { gate } = mountGate();
    await vi.waitFor(() =>
      expect(gate.participationStatus.value.status).toBe("unavailable")
    );
  });
});
