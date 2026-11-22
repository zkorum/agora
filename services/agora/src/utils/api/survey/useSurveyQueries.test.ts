import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import type {
  SurveyResponseWithdrawResponse,
  SurveyStatusCheckResponse,
} from "src/shared/types/dto";
import { Dto } from "src/shared/types/dto";
import type { SurveyGateSummary } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import {
  participationRejectionFixture,
  savedSurveyFixture,
} from "src/utils/api/participation/participationTestFixtures";
import {
  getSurveyFormQueryKey,
  getSurveyStatusQueryKey,
} from "src/utils/query/conversationQueryKeys";
import type {
  useViewerQueryScope,
  ViewerQueryScope,
} from "src/utils/query/viewerScope";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type App,
  computed,
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
} from "vue";

import type { useBackendSurveyApi } from "./survey";
import { refreshSurveyConfigQueries } from "./surveyConfigQuery";

const api = vi.hoisted(() => ({
  saveSurveyAnswer:
    vi.fn<ReturnType<typeof useBackendSurveyApi>["saveSurveyAnswer"]>(),
  fetchSurveyForm:
    vi.fn<ReturnType<typeof useBackendSurveyApi>["fetchSurveyForm"]>(),
  checkSurveyStatus:
    vi.fn<ReturnType<typeof useBackendSurveyApi>["checkSurveyStatus"]>(),
  withdrawSurveyResponse:
    vi.fn<ReturnType<typeof useBackendSurveyApi>["withdrawSurveyResponse"]>(),
}));
const viewerScopeMock = vi.hoisted(() => vi.fn<typeof useViewerQueryScope>());
const notify = vi.hoisted(() => vi.fn());
vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage: notify }),
}));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("src/stores/language", async () => {
  const { defineStore } = await import("pinia");
  const { ref } = await import("vue");
  return {
    useLanguageStore: defineStore("test-language", () => ({
      displayLanguage: ref("en"),
      spokenLanguages: ref<string[]>([]),
    })),
  };
});
vi.mock("./survey", () => ({ useBackendSurveyApi: () => api }));
vi.mock("src/utils/api/auth", () => ({
  useBackendAuthApi: () => ({
    ensureParticipationAuthState: () => Promise.resolve(undefined),
  }),
}));
vi.mock(import("src/utils/query/viewerScope"), async (importOriginal) => ({
  ...(await importOriginal()),
  useViewerQueryScope: viewerScopeMock,
}));
vi.mock("src/utils/api/post/useConversationQuery", () => ({
  updateConversationQueryCache: vi.fn(),
}));

import {
  type SurveyFormData,
  useSurveyAnswerSaveMutation,
  useSurveyFormQuery,
  useSurveyPrefetch,
  useSurveyStatusQuery,
  useSurveyWithdrawMutation,
} from "./useSurveyQueries";

const conversationSlugId = "conversation-one";
const viewerScope = {
  kind: "viewer",
  userId: "viewer-one",
} satisfies ViewerQueryScope;
const statusKey = getSurveyStatusQueryKey({ conversationSlugId, viewerScope });
const formKey = getSurveyFormQueryKey({
  conversationSlugId,
  viewerScope,
  displayLanguage: "en",
  spokenLanguages: [],
});
const completedGate: SurveyGateSummary = {
  hasSurvey: true,
  isOptional: false,
  canParticipate: true,
  status: "complete_valid",
};
const withdrawnGate: SurveyGateSummary = {
  ...completedGate,
  canParticipate: false,
  status: "not_started",
};
const completedStatus: SurveyStatusCheckResponse = {
  surveyGate: completedGate,
  routeResolution: { kind: "summary" },
};
const completedForm = {
  success: true,
  surveyConfigId: 1,
  currentRevision: 1,
  surveyGate: completedGate,
  questions: [
    {
      questionSlugId: "question-one",
      questionType: "choice",
      questionText: "How do you travel?",
      displayOrder: 0,
      isRequired: true,
      isPublicAggregateSuppressionEnabled: false,
      choiceDisplay: "list",
      constraints: { type: "choice", minSelections: 1, maxSelections: 1 },
      options: [
        { optionSlugId: "bicycle", optionText: "Bicycle", displayOrder: 0 },
      ],
      currentAnswer: { questionType: "choice", optionSlugIds: ["bicycle"] },
      isPassed: false,
      isStale: false,
      isMissingRequired: false,
      isCurrentAnswerValid: true,
      currentSemanticVersion: 1,
      answeredQuestionSemanticVersion: 1,
      displayContent: {
        status: "available",
        mode: "original",
        sourceVersion: "00000000-0000-4000-8000-000000000001",
        content: {
          questionText: "How do you travel?",
          options: [{ optionSlugId: "bicycle", optionText: "Bicycle" }],
        },
        translationControl: null,
      },
    },
  ],
} satisfies SurveyFormData;

const apps: App[] = [];
const clients: QueryClient[] = [];
afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  for (const client of clients.splice(0)) client.clear();
  vi.resetAllMocks();
});

function withdrawnResponse({
  form = completedForm,
  gate = withdrawnGate,
  routeResolution = { kind: "question", questionSlugId: "question-one" },
}: {
  form?: SurveyFormData;
  gate?: SurveyGateSummary;
  routeResolution?: SurveyStatusCheckResponse["routeResolution"];
} = {}): Extract<SurveyResponseWithdrawResponse, { success: true }> {
  return {
    success: true,
    participationStatus: gate.canParticipate
      ? { status: "ready" }
      : {
          status: "onboarding_required",
          nextStep: { kind: "survey", routeResolution },
        },
    recovery: {
      kind: "survey",
      form: {
        ...form,
        surveyGate: gate,
        questions: form.questions.map((question) => ({
          ...question,
          isRequired: !gate.isOptional && question.isRequired,
          currentAnswer: undefined,
          isPassed: false,
          isMissingRequired: !gate.isOptional && question.isRequired,
          isStale: false,
          isCurrentAnswerValid: false,
          answeredQuestionSemanticVersion: undefined,
        })),
      },
      routeResolution,
    },
  };
}

function mountWithdrawal({
  cache = true,
  prefetch = false,
}: { cache?: boolean; prefetch?: boolean } = {}) {
  const queryClient = new QueryClient();
  clients.push(queryClient);
  if (cache) {
    queryClient.setQueryData(statusKey, completedStatus);
    queryClient.setQueryData(formKey, completedForm);
  }
  const pinia = createPinia();
  const auth = useAuthenticationStore(pinia);
  auth.setLoginStatus({
    isKnown: true,
    isLoggedIn: true,
    userId: "viewer-one",
  });
  auth.isAuthInitialized = true;
  const prefetchEnabled = ref(prefetch);
  const activeConversationSlugId = ref(conversationSlugId);
  const activeViewerScope = ref<ViewerQueryScope>(viewerScope);
  viewerScopeMock.mockReturnValue(computed(() => activeViewerScope.value));
  let withdraw:
    | (() => Promise<SurveyResponseWithdrawResponse | undefined>)
    | undefined;
  let save:
    | ReturnType<typeof useSurveyAnswerSaveMutation>["mutateAsync"]
    | undefined;
  const app = createApp(
    defineComponent({
      setup() {
        const mutation = useSurveyWithdrawMutation({
          conversationSlugId: activeConversationSlugId,
        });
        withdraw = () =>
          mutation.mutateAsync({
            surveyConfigId: completedForm.surveyConfigId,
            currentRevision: completedForm.currentRevision,
          });
        save = useSurveyAnswerSaveMutation({
          conversationSlugId: activeConversationSlugId,
        }).mutateAsync;
        if (prefetch)
          useSurveyPrefetch({
            conversationSlugId: activeConversationSlugId,
            enabled: prefetchEnabled,
          });
        return () => h("div");
      },
    })
  );
  app.use(VueQueryPlugin, { queryClient });
  app.use(pinia);
  app.mount(document.createElement("div"));
  apps.push(app);
  api.withdrawSurveyResponse.mockResolvedValue({
    status: "success",
    data: withdrawnResponse(),
  });
  if (withdraw === undefined || save === undefined)
    throw new Error("Survey mutations were not mounted");
  return {
    queryClient,
    withdraw,
    save,
    app,
    prefetchEnabled,
    auth,
    onboarding: useConversationOnboardingStore(pinia),
    activeConversationSlugId,
    activeViewerScope,
  };
}

function mountReads(queryClient: QueryClient) {
  let form: ReturnType<typeof useSurveyFormQuery> | undefined;
  const app = createApp({
    setup() {
      useSurveyStatusQuery({ conversationSlugId });
      form = useSurveyFormQuery({ conversationSlugId });
      return () => h("div");
    },
  });
  app.use(createPinia());
  app.use(VueQueryPlugin, { queryClient });
  app.mount(document.createElement("div"));
  apps.push(app);
  if (form === undefined) throw new Error("Survey reads were not mounted");
  return form;
}

describe("survey lookahead and writer recovery", () => {
  it("does not store a late prefetched answer after the viewer changes", async () => {
    const pending =
      Promise.withResolvers<Awaited<ReturnType<typeof api.fetchSurveyForm>>>();
    api.fetchSurveyForm.mockReturnValue(pending.promise);
    api.checkSurveyStatus.mockResolvedValue({
      status: "success",
      data: completedStatus,
    });
    const { queryClient, activeViewerScope, prefetchEnabled } = mountWithdrawal(
      { cache: false, prefetch: true }
    );
    await vi.waitFor(() => expect(api.fetchSurveyForm).toHaveBeenCalledOnce());
    prefetchEnabled.value = false;
    activeViewerScope.value = { kind: "viewer", userId: "another-viewer" };
    pending.resolve({ status: "success", data: completedForm });
    await vi.waitFor(() =>
      expect(queryClient.getQueryState(formKey)?.fetchStatus).toBe("idle")
    );
    expect(queryClient.getQueryData(formKey)).toBeUndefined();
  });

  it("does not stamp stale language caches with a revision that an answer delta cannot reconstruct", async () => {
    const { queryClient, save } = mountWithdrawal();
    queryClient.setQueryData(formKey, { ...completedForm, currentRevision: 2 });
    const frenchKey = getSurveyFormQueryKey({
      conversationSlugId,
      viewerScope,
      displayLanguage: "fr",
      spokenLanguages: [],
    });
    queryClient.setQueryData(frenchKey, completedForm);
    const question = completedForm.questions[0];
    if (question === undefined) throw new Error("Missing question fixture");
    api.saveSurveyAnswer.mockResolvedValue({
      status: "success",
      data: {
        ...savedSurveyFixture,
        currentRevision: 2,
        savedQuestion: question,
      },
    });
    await save({
      questionSlugId: question.questionSlugId,
      expectedQuestionSemanticVersion: 1,
      knownSurveyRevision: 2,
      answer: null,
    });
    expect(
      queryClient.getQueryData<SurveyFormData>(frenchKey)?.currentRevision
    ).toBe(1);
    expect(queryClient.getQueryState(frenchKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(formKey)?.isInvalidated).toBe(false);
  });

  it("orders a new answer after an in-flight withdrawal", async () => {
    const { queryClient, withdraw, save } = mountWithdrawal();
    const pending =
      Promise.withResolvers<
        Awaited<ReturnType<typeof api.withdrawSurveyResponse>>
      >();
    api.withdrawSurveyResponse.mockReturnValue(pending.promise);
    const question = completedForm.questions[0];
    if (question === undefined) throw new Error("Missing question fixture");
    api.saveSurveyAnswer.mockResolvedValue({
      status: "success",
      data: { ...savedSurveyFixture, savedQuestion: question },
    });
    const withdrawal = withdraw();
    await vi.waitFor(() =>
      expect(api.withdrawSurveyResponse).toHaveBeenCalledOnce()
    );
    const saving = save({
      questionSlugId: question.questionSlugId,
      expectedQuestionSemanticVersion: 1,
      knownSurveyRevision: 1,
      answer: question.currentAnswer,
    });
    await nextTick();
    expect(api.saveSurveyAnswer).not.toHaveBeenCalled();
    pending.resolve({ status: "success", data: withdrawnResponse() });
    await Promise.all([withdrawal, saving]);
    expect(
      queryClient.getQueryData<SurveyFormData>(formKey)?.questions[0]
        ?.currentAnswer
    ).toEqual(question.currentAnswer);
  });

  it("keeps the original write queue alive when the same component changes conversations", async () => {
    const { withdraw, save, activeConversationSlugId } = mountWithdrawal();
    const pending =
      Promise.withResolvers<
        Awaited<ReturnType<typeof api.withdrawSurveyResponse>>
      >();
    api.withdrawSurveyResponse.mockReturnValue(pending.promise);
    const question = completedForm.questions[0];
    if (question === undefined) throw new Error("Missing question fixture");
    api.saveSurveyAnswer.mockResolvedValue({
      status: "success",
      data: { ...savedSurveyFixture, savedQuestion: question },
    });
    const withdrawal = withdraw();
    await vi.waitFor(() =>
      expect(api.withdrawSurveyResponse).toHaveBeenCalledOnce()
    );
    const answer = {
      questionSlugId: question.questionSlugId,
      expectedQuestionSemanticVersion: 1,
      knownSurveyRevision: 1,
      answer: question.currentAnswer,
    };
    const firstConversationSave = save(answer);
    await nextTick();
    activeConversationSlugId.value = "conversation-two";
    await nextTick();
    try {
      await save(answer);
      expect(api.saveSurveyAnswer).toHaveBeenCalledOnce();
      expect(api.saveSurveyAnswer).toHaveBeenCalledWith(
        expect.objectContaining({ conversationSlugId: "conversation-two" })
      );
    } finally {
      pending.resolve({ status: "success", data: withdrawnResponse() });
    }
    await Promise.all([withdrawal, firstConversationSave]);
    expect(api.saveSurveyAnswer).toHaveBeenCalledTimes(2);
    expect(api.saveSurveyAnswer).toHaveBeenLastCalledWith(
      expect.objectContaining({ conversationSlugId })
    );
  });

  it("repairs the owner's caches after unmounting without reviving the old screen", async () => {
    const { queryClient, app, withdraw } = mountWithdrawal();
    const pending =
      Promise.withResolvers<
        Awaited<ReturnType<typeof api.withdrawSurveyResponse>>
      >();
    api.withdrawSurveyResponse.mockReturnValue(pending.promise);
    const withdrawal = withdraw();
    await vi.waitFor(() =>
      expect(api.withdrawSurveyResponse).toHaveBeenCalledOnce()
    );
    app.unmount();
    apps.splice(apps.indexOf(app), 1);
    pending.resolve({ status: "success", data: withdrawnResponse() });
    await expect(withdrawal).resolves.toBeUndefined();
    expect(
      queryClient.getQueryData<SurveyFormData>(formKey)?.questions[0]
        ?.currentAnswer
    ).toBeUndefined();
  });

  it("does not recreate private caches cleared during an account switch", async () => {
    const { queryClient, auth, withdraw } = mountWithdrawal();
    const pending =
      Promise.withResolvers<
        Awaited<ReturnType<typeof api.withdrawSurveyResponse>>
      >();
    api.withdrawSurveyResponse.mockReturnValue(pending.promise);
    const withdrawal = withdraw();
    await vi.waitFor(() =>
      expect(api.withdrawSurveyResponse).toHaveBeenCalledOnce()
    );
    auth.setLoginStatus({
      isKnown: true,
      isLoggedIn: true,
      userId: "another-viewer",
    });
    queryClient.clear();
    pending.resolve({ status: "success", data: withdrawnResponse() });
    await expect(withdrawal).resolves.toBeUndefined();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("settles discarded queued writes when logout clears caches before auth changes", async () => {
    const { queryClient, withdraw, save } = mountWithdrawal();
    const pending =
      Promise.withResolvers<
        Awaited<ReturnType<typeof api.withdrawSurveyResponse>>
      >();
    api.withdrawSurveyResponse.mockReturnValue(pending.promise);
    const withdrawal = withdraw();
    await vi.waitFor(() =>
      expect(api.withdrawSurveyResponse).toHaveBeenCalledOnce()
    );
    const saving = save({
      questionSlugId: "question-one",
      expectedQuestionSemanticVersion: 1,
      knownSurveyRevision: 1,
      answer: null,
    });
    await nextTick();
    queryClient.clear();
    pending.resolve({ status: "success", data: withdrawnResponse() });
    await expect(withdrawal).resolves.toBeUndefined();
    await expect(saving).resolves.toBeUndefined();
    expect(api.saveSurveyAnswer).not.toHaveBeenCalled();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("repairs caches without returning an old write to a new onboarding session", async () => {
    const { queryClient, save, onboarding } = mountWithdrawal();
    const pending =
      Promise.withResolvers<Awaited<ReturnType<typeof api.saveSurveyAnswer>>>();
    api.saveSurveyAnswer.mockReturnValue(pending.promise);
    const question = completedForm.questions[0];
    if (question === undefined) throw new Error("Missing question fixture");
    const saving = save({
      questionSlugId: question.questionSlugId,
      expectedQuestionSemanticVersion: 1,
      knownSurveyRevision: 1,
      answer: null,
    });
    await vi.waitFor(() => expect(api.saveSurveyAnswer).toHaveBeenCalledOnce());
    onboarding.startManualEntry({ conversationSlugId });
    pending.resolve({
      status: "success",
      data: {
        ...savedSurveyFixture,
        savedQuestion: {
          ...question,
          currentAnswer: undefined,
          isPassed: true,
        },
      },
    });
    await expect(saving).resolves.toBeUndefined();
    expect(
      queryClient.getQueryData<SurveyFormData>(formKey)?.questions[0]
        ?.currentAnswer
    ).toBeUndefined();
  });

  it("loads status and form together and shares the pending request with the next screen", async () => {
    const status =
      Promise.withResolvers<
        Awaited<ReturnType<typeof api.checkSurveyStatus>>
      >();
    const form =
      Promise.withResolvers<Awaited<ReturnType<typeof api.fetchSurveyForm>>>();
    api.checkSurveyStatus.mockReturnValue(status.promise);
    api.fetchSurveyForm.mockReturnValue(form.promise);
    const { queryClient, app } = mountWithdrawal({
      cache: false,
      prefetch: true,
    });
    await vi.waitFor(() => {
      expect(api.checkSurveyStatus).toHaveBeenCalledOnce();
      expect(api.fetchSurveyForm).toHaveBeenCalledOnce();
    });
    app.unmount();
    apps.splice(apps.indexOf(app), 1);
    const reads = mountReads(queryClient);
    status.resolve({ status: "success", data: completedStatus });
    form.resolve({ status: "success", data: completedForm });
    await vi.waitFor(() => expect(reads.data.value).toEqual(completedForm));
    expect(api.fetchSurveyForm).toHaveBeenCalledOnce();
    expect(api.checkSurveyStatus).toHaveBeenCalledOnce();
  });

  it("cancels a first prefetch on a config edit so a late old response cannot revive it", async () => {
    const oldForm =
      Promise.withResolvers<Awaited<ReturnType<typeof api.fetchSurveyForm>>>();
    const aborted = vi.fn();
    api.fetchSurveyForm.mockImplementationOnce(({ signal }) => {
      signal?.addEventListener("abort", aborted);
      return oldForm.promise;
    });
    api.checkSurveyStatus.mockResolvedValue({
      status: "success",
      data: completedStatus,
    });
    const { queryClient } = mountWithdrawal({ cache: false, prefetch: true });
    await vi.waitFor(() => expect(api.fetchSurveyForm).toHaveBeenCalledOnce());
    await refreshSurveyConfigQueries({ queryClient, conversationSlugId });
    expect(aborted).toHaveBeenCalledOnce();
    oldForm.resolve({ status: "success", data: completedForm });
    await nextTick();
    expect(queryClient.getQueryData(formKey)).toBeUndefined();
    const updated = { ...completedForm, currentRevision: 2 };
    api.fetchSurveyForm.mockResolvedValue({ status: "success", data: updated });
    const reads = mountReads(queryClient);
    await vi.waitFor(() => expect(reads.data.value?.currentRevision).toBe(2));
    expect(api.fetchSurveyForm).toHaveBeenCalledTimes(2);
  });

  it("does not let a cancelled old read abort the fresh read that replaced it", async () => {
    const old =
      Promise.withResolvers<Awaited<ReturnType<typeof api.fetchSurveyForm>>>();
    const fresh =
      Promise.withResolvers<Awaited<ReturnType<typeof api.fetchSurveyForm>>>();
    api.fetchSurveyForm
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(fresh.promise);
    api.checkSurveyStatus.mockResolvedValue({
      status: "success",
      data: completedStatus,
    });
    const { queryClient } = mountWithdrawal({ cache: false, prefetch: true });
    await vi.waitFor(() => expect(api.fetchSurveyForm).toHaveBeenCalledOnce());
    await refreshSurveyConfigQueries({ queryClient, conversationSlugId });
    const reads = mountReads(queryClient);
    await vi.waitFor(() =>
      expect(api.fetchSurveyForm).toHaveBeenCalledTimes(2)
    );
    old.resolve({ status: "success", data: completedForm });
    await nextTick();
    expect(queryClient.getQueryState(formKey)?.fetchStatus).toBe("fetching");
    fresh.resolve({
      status: "success",
      data: { ...completedForm, currentRevision: 2 },
    });
    await vi.waitFor(() => expect(reads.data.value?.currentRevision).toBe(2));
  });

  it("keeps a speculative failure silent and retries when the screen opens", async () => {
    api.checkSurveyStatus.mockResolvedValue({
      status: "success",
      data: completedStatus,
    });
    api.fetchSurveyForm.mockResolvedValueOnce({
      status: "success",
      data: { success: false, reason: "content_not_found" },
    });
    const { queryClient } = mountWithdrawal({ cache: false, prefetch: true });
    await vi.waitFor(() =>
      expect(queryClient.getQueryState(formKey)?.status).toBe("error")
    );
    expect(notify).not.toHaveBeenCalled();
    api.fetchSurveyForm.mockResolvedValue({
      status: "success",
      data: completedForm,
    });
    const reads = mountReads(queryClient);
    await vi.waitFor(() => expect(reads.data.value).toEqual(completedForm));
  });

  it("installs a conflict snapshot from the writer without rereading and protects it from older reads", async () => {
    const { queryClient, save } = mountWithdrawal();
    const oldRead = Promise.withResolvers<SurveyFormData>();
    const read = queryClient.prefetchQuery({
      queryKey: formKey,
      queryFn: ({ signal }) => {
        signal.addEventListener("abort", () => {});
        return oldRead.promise;
      },
    });
    const updated: SurveyFormData = {
      ...completedForm,
      currentRevision: 2,
      surveyGate: withdrawnGate,
      questions: completedForm.questions.map((question) => ({
        ...question,
        questionText: "Updated meaning",
        currentSemanticVersion: 2,
        currentAnswer: undefined,
        isCurrentAnswerValid: false,
        isMissingRequired: true,
        displayContent: undefined,
      })),
    };
    api.saveSurveyAnswer.mockResolvedValue({
      status: "success",
      data: {
        success: false,
        reason: "survey_changed",
        participationStatus:
          participationRejectionFixture("survey_required").participationStatus,
        recovery: {
          kind: "survey",
          form: updated,
          routeResolution: { kind: "question", questionSlugId: "question-one" },
        },
      },
    });
    await save({
      questionSlugId: "question-one",
      expectedQuestionSemanticVersion: 1,
      knownSurveyRevision: 1,
      answer: { questionType: "choice", optionSlugIds: ["bicycle"] },
    });
    oldRead.resolve(completedForm);
    await read;
    expect(queryClient.getQueryData(formKey)).toEqual(updated);
    expect(queryClient.getQueryData(statusKey)).toEqual({
      surveyGate: withdrawnGate,
      routeResolution: { kind: "question", questionSlugId: "question-one" },
    });
    expect(queryClient.getQueryState(formKey)?.isInvalidated).toBe(false);
    expect(api.fetchSurveyForm).not.toHaveBeenCalled();
    expect(api.checkSurveyStatus).not.toHaveBeenCalled();
  });

  it("uses the canonical saved answer and keeps it fresh for immediate navigation", async () => {
    const { queryClient, save } = mountWithdrawal();
    const question = completedForm.questions[0];
    if (question === undefined) throw new Error("Missing fixture question");
    const canonical = {
      questionType: "choice",
      optionSlugIds: ["bicycle"],
      optionTextValues: { bicycle: { textValueHtml: "<p>Bike</p>" } },
    } satisfies NonNullable<
      SurveyFormData["questions"][number]["currentAnswer"]
    >;
    api.saveSurveyAnswer.mockResolvedValue({
      status: "success",
      data: {
        ...savedSurveyFixture,
        savedQuestion: { ...question, currentAnswer: canonical },
      },
    });
    await save({
      questionSlugId: "question-one",
      expectedQuestionSemanticVersion: 1,
      knownSurveyRevision: 1,
      answer: {
        ...canonical,
        optionTextValues: { bicycle: { textValueHtml: "<p>  Bike  </p>" } },
      },
    });
    expect(
      queryClient.getQueryData<SurveyFormData>(formKey)?.questions[0]
        ?.currentAnswer
    ).toEqual(canonical);
    expect(queryClient.getQueryState(formKey)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(statusKey)?.isInvalidated).toBe(false);
  });

  it("clears the cached answer when an acknowledged pass omits the answer on the wire", async () => {
    const { queryClient, save } = mountWithdrawal();
    const question = savedSurveyFixture.savedQuestion;
    queryClient.setQueryData(formKey, {
      ...completedForm,
      questions: [question],
    });
    const data = Dto.surveyAnswerSaveResponse.parse(
      JSON.parse(
        JSON.stringify({
          ...savedSurveyFixture,
          savedQuestion: {
            ...question,
            options: [
              {
                optionSlugId: "bicycle",
                optionText: "Bicycle",
                displayOrder: 0,
              },
              { optionSlugId: "other", optionText: "Other", displayOrder: 1 },
            ],
            currentAnswer: undefined,
            isRequired: false,
            isPassed: true,
            isCurrentAnswerValid: false,
          },
        })
      )
    );
    api.saveSurveyAnswer.mockResolvedValue({ status: "success", data });
    await save({
      questionSlugId: "question",
      expectedQuestionSemanticVersion: 1,
      knownSurveyRevision: 1,
      answer: null,
    });
    expect(
      queryClient.getQueryData<SurveyFormData>(formKey)?.questions[0]
        ?.currentAnswer
    ).toBeUndefined();
    expect(
      queryClient.getQueryData<SurveyFormData>(formKey)?.questions[0]?.isPassed
    ).toBe(true);
  });

  it("does not replace a newer cached questionnaire with a late older save acknowledgement", async () => {
    const { queryClient, save } = mountWithdrawal();
    const pending =
      Promise.withResolvers<Awaited<ReturnType<typeof api.saveSurveyAnswer>>>();
    api.saveSurveyAnswer.mockReturnValue(pending.promise);
    const saving = save({
      questionSlugId: "question-one",
      expectedQuestionSemanticVersion: 1,
      knownSurveyRevision: 1,
      answer: null,
    });
    await vi.waitFor(() => expect(api.saveSurveyAnswer).toHaveBeenCalledOnce());
    const newer = { ...completedForm, currentRevision: 2 };
    queryClient.setQueryData(formKey, newer);
    pending.resolve({ status: "success", data: savedSurveyFixture });
    await expect(saving).resolves.toBeUndefined();
    expect(queryClient.getQueryData(formKey)).toEqual(newer);
  });

  it("accepts a recreated questionnaire with a newer instance ID and lower revision", async () => {
    const { queryClient, save } = mountWithdrawal();
    queryClient.setQueryData(formKey, { ...completedForm, currentRevision: 5 });
    const recreated: SurveyFormData = {
      ...completedForm,
      surveyConfigId: 2,
      currentRevision: 1,
    };
    api.saveSurveyAnswer.mockResolvedValue({
      status: "success",
      data: {
        success: false,
        reason: "survey_changed",
        participationStatus:
          participationRejectionFixture("survey_required").participationStatus,
        recovery: {
          kind: "survey",
          form: recreated,
          routeResolution: { kind: "question", questionSlugId: "question-one" },
        },
      },
    });
    await expect(
      save({
        questionSlugId: "question-one",
        expectedQuestionSemanticVersion: 1,
        knownSurveyRevision: 5,
        answer: null,
      })
    ).resolves.toMatchObject({ reason: "survey_changed" });
    expect(queryClient.getQueryData(formKey)).toEqual(recreated);
  });

  it("ignores a late removed-survey result after a new questionnaire is already cached", async () => {
    const { queryClient, save } = mountWithdrawal();
    const pending =
      Promise.withResolvers<Awaited<ReturnType<typeof api.saveSurveyAnswer>>>();
    api.saveSurveyAnswer.mockReturnValue(pending.promise);
    const saving = save({
      questionSlugId: "question-one",
      expectedQuestionSemanticVersion: 1,
      knownSurveyRevision: 1,
      answer: null,
    });
    await vi.waitFor(() => expect(api.saveSurveyAnswer).toHaveBeenCalledOnce());
    const recreated = { ...completedForm, surveyConfigId: 2 };
    queryClient.setQueryData(formKey, recreated);
    pending.resolve({
      status: "success",
      data: {
        success: false,
        reason: "survey_changed",
        participationStatus: { status: "ready" },
        recovery: {
          kind: "no_survey",
          surveyGate: {
            hasSurvey: false,
            isOptional: false,
            canParticipate: true,
            status: "no_survey",
          },
          routeResolution: { kind: "none" },
        },
      },
    });
    await expect(saving).resolves.toBeUndefined();
    expect(queryClient.getQueryData(formKey)).toEqual(recreated);
    expect(queryClient.getQueryData(statusKey)).toEqual(completedStatus);
  });
});

describe("survey withdrawal cache", () => {
  it("keeps the cleared survey fresh when navigating from welcome", async () => {
    const { queryClient, withdraw } = mountWithdrawal();

    await withdraw();

    // fetchQuery, like mounting the next onboarding step, reuses fresh data.
    const staleStatusRead = vi.fn(() => Promise.resolve(completedStatus));
    const staleFormRead = vi.fn(() => Promise.resolve(completedForm));
    const status = await queryClient.fetchQuery({
      queryKey: statusKey,
      queryFn: staleStatusRead,
      staleTime: 30_000,
    });
    const form = await queryClient.fetchQuery({
      queryKey: formKey,
      queryFn: staleFormRead,
      staleTime: 30_000,
    });

    expect(status).toEqual({
      surveyGate: withdrawnGate,
      routeResolution: { kind: "question", questionSlugId: "question-one" },
    });
    expect(form.questions[0]).toMatchObject({
      currentAnswer: undefined,
      isPassed: false,
      isCurrentAnswerValid: false,
      isMissingRequired: true,
      answeredQuestionSemanticVersion: undefined,
    });
    expect(staleStatusRead).not.toHaveBeenCalled();
    expect(staleFormRead).not.toHaveBeenCalled();
  });

  it("prevents pre-withdrawal reads from restoring answers and summary navigation", async () => {
    const { queryClient, withdraw } = mountWithdrawal();
    const statusRead = Promise.withResolvers<SurveyStatusCheckResponse>();
    const formRead = Promise.withResolvers<SurveyFormData>();
    const statusAborted = vi.fn();
    const formAborted = vi.fn();
    const pendingStatus = queryClient.fetchQuery({
      queryKey: statusKey,
      queryFn: ({ signal }) => {
        signal.addEventListener("abort", statusAborted);
        return statusRead.promise;
      },
    });
    const pendingForm = queryClient.fetchQuery({
      queryKey: formKey,
      queryFn: ({ signal }) => {
        signal.addEventListener("abort", formAborted);
        return formRead.promise;
      },
    });
    const readsSettled = Promise.allSettled([pendingStatus, pendingForm]);

    await withdraw();
    statusRead.resolve(completedStatus);
    formRead.resolve(completedForm);
    await readsSettled;
    await nextTick();

    expect(statusAborted).toHaveBeenCalledOnce();
    expect(formAborted).toHaveBeenCalledOnce();
    expect(
      queryClient.getQueryData<SurveyStatusCheckResponse>(statusKey)
    ).toEqual({
      surveyGate: withdrawnGate,
      routeResolution: { kind: "question", questionSlugId: "question-one" },
    });
    expect(
      queryClient.getQueryData<SurveyFormData>(formKey)?.questions[0]
        ?.currentAnswer
    ).toBeUndefined();
  });

  it("discards the completed route even when the form is no longer cached", async () => {
    const { queryClient, withdraw } = mountWithdrawal();
    queryClient.removeQueries({ queryKey: formKey, exact: true });

    await withdraw();

    expect(
      queryClient.getQueryData<SurveyStatusCheckResponse>(statusKey)
    ).toEqual({
      surveyGate: withdrawnGate,
      routeResolution: { kind: "question", questionSlugId: "question-one" },
    });
    expect(
      queryClient.getQueryData<SurveyFormData>(formKey)?.questions[0]
        ?.currentAnswer
    ).toBeUndefined();
    expect(queryClient.getQueryData(formKey)).toBeDefined();
  });

  it("uses the backend route even when cached questions suggest a different destination", async () => {
    const { queryClient, withdraw } = mountWithdrawal();
    api.withdrawSurveyResponse.mockResolvedValue({
      status: "success",
      data: withdrawnResponse({
        routeResolution: {
          kind: "question",
          questionSlugId: "server-question",
        },
      }),
    });

    await withdraw();

    expect(
      queryClient.getQueryData<SurveyStatusCheckResponse>(statusKey)
    ).toEqual({
      surveyGate: withdrawnGate,
      routeResolution: { kind: "question", questionSlugId: "server-question" },
    });
  });

  it("updates the request's conversation and viewer if navigation or identity changes", async () => {
    const {
      queryClient,
      withdraw,
      activeConversationSlugId,
      activeViewerScope,
    } = mountWithdrawal();
    const response = Promise.withResolvers<{
      status: "success";
      data: SurveyResponseWithdrawResponse;
    }>();
    api.withdrawSurveyResponse.mockReturnValue(response.promise);
    const otherViewer = {
      kind: "viewer",
      userId: "viewer-two",
    } satisfies ViewerQueryScope;
    const otherViewerStatusKey = getSurveyStatusQueryKey({
      conversationSlugId,
      viewerScope: otherViewer,
    });
    const otherConversationStatusKey = getSurveyStatusQueryKey({
      conversationSlugId: "conversation-two",
      viewerScope: otherViewer,
    });
    queryClient.setQueryData(otherViewerStatusKey, completedStatus);
    queryClient.setQueryData(otherConversationStatusKey, completedStatus);

    const pending = withdraw();
    await vi.waitFor(() =>
      expect(api.withdrawSurveyResponse).toHaveBeenCalledOnce()
    );
    activeConversationSlugId.value = "conversation-two";
    activeViewerScope.value = otherViewer;
    response.resolve({
      status: "success",
      data: withdrawnResponse(),
    });
    await pending;

    expect(api.withdrawSurveyResponse).toHaveBeenCalledWith({
      conversationSlugId,
      expectedForm: {
        surveyConfigId: completedForm.surveyConfigId,
        currentRevision: completedForm.currentRevision,
      },
      skipEmailUpdateConsent: false,
      isCurrent: expect.any(Function),
    });
    expect(
      queryClient.getQueryData<SurveyStatusCheckResponse>(statusKey)?.surveyGate
    ).toEqual(withdrawnGate);
    expect(queryClient.getQueryData(otherViewerStatusKey)).toEqual(
      completedStatus
    );
    expect(queryClient.getQueryData(otherConversationStatusKey)).toEqual(
      completedStatus
    );
    expect(queryClient.getQueryState(otherViewerStatusKey)?.isInvalidated).toBe(
      false
    );
  });

  it("clears passed optional questions in every cached language for this viewer only", async () => {
    const { queryClient, withdraw } = mountWithdrawal();
    const translatedKey = getSurveyFormQueryKey({
      conversationSlugId,
      viewerScope,
      displayLanguage: "fr",
      spokenLanguages: [],
    });
    const otherViewerKey = getSurveyFormQueryKey({
      conversationSlugId,
      viewerScope: { kind: "viewer", userId: "viewer-two" },
      displayLanguage: "en",
      spokenLanguages: [],
    });
    const optionalGate: SurveyGateSummary = {
      ...completedGate,
      isOptional: true,
    };
    const optionalWithdrawnGate: SurveyGateSummary = {
      ...optionalGate,
      status: "not_started",
    };
    const passedForm: SurveyFormData = {
      ...completedForm,
      surveyGate: optionalGate,
      questions: completedForm.questions.map((question) => ({
        ...question,
        isRequired: false,
        currentAnswer: undefined,
        isPassed: true,
        isCurrentAnswerValid: false,
      })),
    };
    queryClient.setQueryData(formKey, passedForm);
    queryClient.setQueryData(translatedKey, passedForm);
    queryClient.setQueryData(otherViewerKey, completedForm);
    queryClient.setQueryData<SurveyStatusCheckResponse>(statusKey, {
      surveyGate: optionalGate,
      routeResolution: { kind: "summary" },
    });
    api.withdrawSurveyResponse.mockResolvedValue({
      status: "success",
      data: withdrawnResponse({
        form: passedForm,
        gate: optionalWithdrawnGate,
      }),
    });

    await withdraw();

    expect(
      queryClient.getQueryData<SurveyStatusCheckResponse>(statusKey)
    ).toEqual({
      surveyGate: optionalWithdrawnGate,
      routeResolution: { kind: "question", questionSlugId: "question-one" },
    });
    expect(
      queryClient.getQueryData<SurveyFormData>(translatedKey)?.questions[0]
    ).toMatchObject({
      currentAnswer: undefined,
      isPassed: false,
      isCurrentAnswerValid: false,
      isMissingRequired: false,
      answeredQuestionSemanticVersion: undefined,
    });
    expect(
      queryClient.getQueryData<SurveyFormData>(formKey)?.questions[0]
        ?.currentAnswer
    ).toBeUndefined();
    expect(queryClient.getQueryData(otherViewerKey)).toEqual(completedForm);
    expect(queryClient.getQueryState(otherViewerKey)?.isInvalidated).toBe(
      false
    );
  });

  it("invalidates live results and counts while preserving checkpoint caches", async () => {
    const { queryClient, withdraw } = mountWithdrawal();
    const feedKey = ["feed", viewerScope];
    const countsKey = ["survey-completion-counts", conversationSlugId];
    const liveResultsKey = [
      "survey-results-aggregated",
      conversationSlugId,
      undefined,
      undefined,
      "en",
      [],
    ];
    const checkpointKey = [
      "survey-results-aggregated",
      conversationSlugId,
      undefined,
      42,
      "en",
      [],
    ];
    const otherConversationKey = [
      "survey-completion-counts",
      "conversation-two",
    ];
    for (const key of [
      feedKey,
      countsKey,
      liveResultsKey,
      checkpointKey,
      otherConversationKey,
    ]) {
      queryClient.setQueryData(key, {});
    }

    await withdraw();

    for (const key of [feedKey, countsKey, liveResultsKey]) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
    for (const key of [checkpointKey, otherConversationKey]) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(false);
    }
  });

  it("keeps answers when the server refuses withdrawal", async () => {
    const { queryClient, withdraw } = mountWithdrawal();
    api.withdrawSurveyResponse.mockResolvedValue({
      status: "success",
      data: participationRejectionFixture("conversation_closed"),
    });

    await expect(withdraw()).resolves.toEqual(
      participationRejectionFixture("conversation_closed")
    );

    expect(queryClient.getQueryData(statusKey)).toEqual(completedStatus);
    expect(queryClient.getQueryData(formKey)).toEqual(completedForm);
    expect(queryClient.getQueryState(statusKey)?.isInvalidated).toBe(false);
  });

  it("keeps answers when the withdrawal request fails", async () => {
    const { queryClient, withdraw } = mountWithdrawal();
    api.withdrawSurveyResponse.mockRejectedValue(
      new Error("Network unavailable")
    );

    await expect(withdraw()).rejects.toThrow("Network unavailable");

    expect(queryClient.getQueryData(statusKey)).toEqual(completedStatus);
    expect(queryClient.getQueryData(formKey)).toEqual(completedForm);
  });
});
