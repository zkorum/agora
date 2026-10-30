import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import type {
  SurveyAnswerSaveResponse,
  SurveyStatusCheckResponse,
} from "src/shared/types/dto";
import type { SurveyGateSummary } from "src/shared/types/zod";
import { participationRejectionFixture } from "src/utils/api/participation/participationTestFixtures";
import type {
  SurveyFormData,
  useSurveyAnswerSaveMutation,
} from "src/utils/api/survey/useSurveyQueries";
import { createDismissalController } from "src/utils/ui/dismissalController";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, reactive, ref } from "vue";

const saveAnswer = vi.hoisted(() =>
  vi.fn<ReturnType<typeof useSurveyAnswerSaveMutation>["mutateAsync"]>()
);
const exitToConversation = vi.hoisted(() => vi.fn());
const showNotifyMessage = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
const handleVueError = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({
  optional: false,
  completed: false,
  hasNextQuestion: false,
  surveyRemoved: false,
  surveyRefreshing: false,
}));
const route = reactive({
  params: { questionSlugId: "question-one" },
  fullPath:
    "/project/project-one/conversation/conversation-one/onboarding/question/question-one",
});

vi.mock("pinia", () => ({ storeToRefs: (store: object) => store }));
vi.mock("src/stores/language", () => ({
  useLanguageStore: () => ({ displayLanguage: ref("en") }),
}));
vi.mock("vue-router", () => ({
  useRouter: () => ({ push, replace }),
}));
vi.mock("src/composables/conversation/useConversationOnboardingRoute", () => ({
  useConversationOnboardingRoute: () => ({
    route,
    routeConversationSlugId: ref("conversation-one"),
    routeContext: ref({ kind: "project", projectSlug: "project-one" }),
  }),
}));
vi.mock("src/composables/conversation/useConversationOnboardingExit", () => ({
  useConversationOnboardingExit: () => ({ exitToConversation }),
}));
vi.mock("src/utils/nav/goBackButton", () => ({
  useGoBackButtonHandler: () => ({ safeNavigateBack: vi.fn() }),
}));
vi.mock("src/utils/query/viewerScope", () => ({
  useViewerQueryScope: () => ref({ userId: "user-one" }),
}));
vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage }),
}));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({
    t: (key: string) =>
      key === "onboardingComplete" ? "You’re all set!" : key,
  }),
}));
vi.mock("src/utils/api/survey/useSurveyQueries", () => ({
  useSurveyAnswerSaveMutation: () => ({
    mutateAsync: saveAnswer,
    isPending: ref(false),
  }),
}));
vi.mock("src/composables/conversation/useConversationSurveyState", () => ({
  useConversationSurveyState: () => ({
    conversationData: ref(undefined),
    conversationDisplayContent: ref(undefined),
    conversationSlugId: ref("conversation-one"),
    surveyStatus: ref<SurveyStatusCheckResponse>({
      surveyGate: createSurveyGate(),
      routeResolution: { kind: "question", questionSlugId: "question-one" },
    }),
    surveyForm: ref<SurveyFormData | undefined>(
      state.surveyRemoved
        ? undefined
        : {
            success: true,
            surveyConfigId: 1,
            currentRevision: 1,
            surveyGate: createSurveyGate(),
            questions: state.hasNextQuestion
              ? [
                  createQuestion(),
                  {
                    ...createQuestion(),
                    questionSlugId: "question-two",
                    displayOrder: 1,
                  },
                ]
              : [createQuestion()],
          }
    ),
    surveyStepTotal: ref(state.hasNextQuestion ? 4 : 3),
    isInitialLoading: ref(false),
    isRefreshingSurvey: ref(state.surveyRefreshing),
    hasLoadError: ref(false),
    refetchAll: vi.fn(),
  }),
}));
vi.mock("src/utils/translation/useSurveyQuestionDisplayContent", () => ({
  useSurveyQuestionDisplayContent: () => ({
    displayedContent: ref({ questionText: "Transport?", options: [] }),
    translationPreview: ref(undefined),
    translationMode: ref("original"),
  }),
}));
vi.mock("src/components/editor/Editor.vue", () => ({
  default: defineComponent(() => () => null),
}));
vi.mock("src/layouts/ConversationOnboardingLayout.vue", () => ({
  default: defineComponent({
    name: "OnboardingLayout",
    props: { closeCallback: { type: Function, required: true } },
    setup(props, { slots }) {
      return () =>
        h("main", [
          h("button", { onClick: props.closeCallback }, "Close"),
          slots.default?.(),
        ]);
    },
  }),
}));
vi.mock("src/components/onboarding/layouts/StepperLayout.vue", () => ({
  default: defineComponent({
    name: "StepperLayout",
    props: { submitCallBack: { type: Function, required: true } },
    setup(props, { slots }) {
      return () =>
        h("section", [
          slots.body?.({ navigationElement: undefined }),
          h("button", { onClick: props.submitCallBack }, "Next"),
        ]);
    },
  }),
}));
vi.mock("src/components/survey/SurveyChoiceInput.vue", () => ({
  default: defineComponent(
    (_props, { emit }) =>
      () =>
        h(
          "button",
          {
            onClick: () => emit("update:selectedSingleOptionSlugId", "bicycle"),
          },
          "Bicycle"
        ),
    { emits: ["update:selectedSingleOptionSlugId"] }
  ),
}));

import SurveyQuestion from "./question.[questionSlugId].vue";

function createQuestion(): Extract<
  SurveyFormData["questions"][number],
  { questionType: "choice" }
> {
  return {
    questionSlugId: "question-one",
    questionType: "choice",
    questionText: "Transport?",
    displayOrder: 0,
    isRequired: !state.optional,
    isPublicAggregateSuppressionEnabled: false,
    choiceDisplay: "list",
    constraints: { type: "choice", minSelections: 1, maxSelections: 1 },
    options: [
      { optionSlugId: "bicycle", optionText: "Bicycle", displayOrder: 0 },
    ],
    isPassed: false,
    isStale: false,
    currentAnswer: state.completed
      ? { questionType: "choice", optionSlugIds: ["bicycle"] }
      : undefined,
    isMissingRequired: !state.optional && !state.completed,
    isCurrentAnswerValid: state.completed,
    currentSemanticVersion: 1,
    displayContent: {
      status: "available",
      mode: "original",
      sourceVersion: "00000000-0000-4000-8000-000000000001",
      content: {
        questionText: "Transport?",
        options: [{ optionSlugId: "bicycle", optionText: "Bicycle" }],
      },
      translationControl: null,
    },
  };
}

function createSurveyGate(): SurveyGateSummary {
  if (state.surveyRemoved)
    return {
      hasSurvey: false,
      isOptional: false,
      canParticipate: true,
      status: "no_survey",
    };
  return {
    hasSurvey: true,
    isOptional: state.optional,
    canParticipate: state.optional || state.completed,
    status: state.completed ? "complete_valid" : "in_progress",
  };
}

function createSaveResponse({
  justCompleted = true,
  status = "complete_valid",
}: {
  justCompleted?: boolean;
  status?: SurveyGateSummary["status"];
} = {}): Extract<SurveyAnswerSaveResponse, { success: true }> {
  return {
    success: true,
    justCompleted,
    surveyConfigId: 1,
    currentRevision: 1,
    savedQuestion: createQuestion(),
    routeResolution: { kind: "summary" },
    participationStatus: { status: "ready" },
    surveyGate: {
      ...createSurveyGate(),
      status,
      canParticipate: status === "complete_valid" || state.optional,
    },
  };
}

const apps: App[] = [];
const clients: QueryClient[] = [];
beforeEach(() => {
  route.fullPath =
    "/project/project-one/conversation/conversation-one/onboarding/question/question-one";
  vi.resetAllMocks();
  state.optional = false;
  state.completed = false;
  state.hasNextQuestion = false;
  state.surveyRemoved = false;
  state.surveyRefreshing = false;
  saveAnswer.mockResolvedValue(createSaveResponse());
  exitToConversation.mockResolvedValue(true);
});
afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  for (const client of clients.splice(0)) client.clear();
  document.body.replaceChildren();
});

function mountQuestion(): HTMLElement {
  const target = document.createElement("div");
  document.body.append(target);
  const app = createApp(SurveyQuestion, {
    sheet: createDismissalController({
      fallbackDismiss: () => Promise.resolve(),
    }),
  });
  app.config.errorHandler = handleVueError;
  const queryClient = new QueryClient();
  clients.push(queryClient);
  app.use(VueQueryPlugin, { queryClient });
  app.component("QChip", (props: { label: string }) => h("span", props.label));
  apps.push(app);
  app.mount(target);
  return target;
}

async function clickButton({
  target,
  label,
}: {
  target: HTMLElement;
  label: string;
}): Promise<void> {
  const button = [...target.querySelectorAll("button")].find(
    (element) => element.textContent === label
  );
  if (button === undefined) throw new Error(`Button ${label} not found`);
  button.click();
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}

describe("questionnaire completion", () => {
  it("recovers directly to the server-selected question when a cached draft is obsolete", async () => {
    const updatedQuestion = {
      ...createQuestion(),
      questionSlugId: "updated-question",
      currentSemanticVersion: 2,
    };
    saveAnswer.mockResolvedValue({
      success: false,
      reason: "survey_changed",
      participationStatus:
        participationRejectionFixture("survey_required").participationStatus,
      recovery: {
        kind: "survey",
        form: {
          success: true,
          surveyConfigId: 1,
          currentRevision: 2,
          surveyGate: createSurveyGate(),
          questions: [updatedQuestion],
        },
        routeResolution: {
          kind: "question",
          questionSlugId: "updated-question",
        },
      },
    });
    const target = mountQuestion();
    await clickButton({ target, label: "Bicycle" });
    await clickButton({ target, label: "Next" });
    expect(replace).toHaveBeenCalledExactlyOnceWith({
      path: "/project/project-one/conversation/conversation-one/onboarding/question/updated-question",
    });
    expect(showNotifyMessage).toHaveBeenCalledExactlyOnceWith(
      "surveyChangedMessage"
    );
    expect(exitToConversation).not.toHaveBeenCalled();
    expect(saveAnswer).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
  });

  it("dismisses a writer-confirmed removed survey without claiming that the rejected draft was saved", async () => {
    saveAnswer.mockResolvedValue({
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
    });
    const target = mountQuestion();
    await clickButton({ target, label: "Bicycle" });
    await clickButton({ target, label: "Next" });
    expect(exitToConversation).toHaveBeenCalledOnce();
    expect(showNotifyMessage).toHaveBeenCalledExactlyOnceWith(
      "surveyChangedMessage"
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("keeps a cached question visible while its background refresh is pending", () => {
    state.surveyRefreshing = true;
    const target = mountQuestion();
    expect(target.textContent).toContain("Bicycle");
    expect(exitToConversation).not.toHaveBeenCalled();
  });

  it("waits for a stale cached no-survey response to refresh before dismissing", async () => {
    state.surveyRemoved = true;
    state.surveyRefreshing = true;
    mountQuestion();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(exitToConversation).not.toHaveBeenCalled();
    expect(saveAnswer).not.toHaveBeenCalled();
  });
  it("dismisses a removed questionnaire without loading its form or claiming completion", async () => {
    state.surveyRemoved = true;
    mountQuestion();
    await vi.waitFor(() => expect(exitToConversation).toHaveBeenCalledOnce());
    expect(saveAnswer).not.toHaveBeenCalled();
    expect(showNotifyMessage).not.toHaveBeenCalled();
  });
  it("does not announce completion or leave a newer question navigation", async () => {
    const pending =
      Promise.withResolvers<Awaited<ReturnType<typeof saveAnswer>>>();
    saveAnswer.mockReturnValue(pending.promise);
    const target = mountQuestion();
    await clickButton({ target, label: "Bicycle" });
    await clickButton({ target, label: "Next" });
    route.fullPath += "?review=1";
    pending.resolve(createSaveResponse());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(exitToConversation).not.toHaveBeenCalled();
    expect(showNotifyMessage).not.toHaveBeenCalled();
  });
  it("silently stops a cancelled participation request", async () => {
    saveAnswer.mockResolvedValue(undefined);
    const target = mountQuestion();
    await clickButton({ target, label: "Bicycle" });
    await clickButton({ target, label: "Next" });
    expect(showNotifyMessage).not.toHaveBeenCalled();
    expect(exitToConversation).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
  it("does not announce completion when the onboarding exit is ignored", async () => {
    exitToConversation.mockResolvedValueOnce(false);
    state.completed = true;
    const target = mountQuestion();
    await clickButton({ target, label: "Next" });
    expect(showNotifyMessage).not.toHaveBeenCalled();
  });

  it("returns directly to the consultation after the final answer is saved", async () => {
    const target = mountQuestion();
    await clickButton({ target, label: "Bicycle" });
    await clickButton({ target, label: "Next" });

    expect(saveAnswer).toHaveBeenCalledWith({
      questionSlugId: "question-one",
      expectedQuestionSemanticVersion: 1,
      knownSurveyRevision: 1,
      answer: { questionType: "choice", optionSlugIds: ["bicycle"] },
    });
    expect(exitToConversation).toHaveBeenCalledWith({
      conversationSlugId: "conversation-one",
      routeContext: { kind: "project", projectSlug: "project-one" },
    });
    expect(exitToConversation).toHaveBeenCalledAfter(saveAnswer);
    expect(showNotifyMessage).toHaveBeenCalledWith({
      message: "You’re all set!",
      icon: "mdi-check-circle-outline",
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("also returns directly when passing the last optional question", async () => {
    state.optional = true;
    const target = mountQuestion();
    await clickButton({ target, label: "Next" });

    expect(saveAnswer).toHaveBeenCalledWith({
      questionSlugId: "question-one",
      expectedQuestionSemanticVersion: 1,
      knownSurveyRevision: 1,
      answer: null,
    });
    expect(exitToConversation).toHaveBeenCalledOnce();
    expect(showNotifyMessage).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
  });

  it("does not announce completion or leave when saving fails", async () => {
    saveAnswer.mockRejectedValue(new Error("Save failed"));
    const target = mountQuestion();
    await clickButton({ target, label: "Bicycle" });
    await clickButton({ target, label: "Next" });

    expect(exitToConversation).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(showNotifyMessage).toHaveBeenCalledExactlyOnceWith(
      "failedToSaveAnswerMessage"
    );
  });

  it("returns from an already saved final answer without another write or summary screen", async () => {
    state.completed = true;
    const target = mountQuestion();
    await clickButton({ target, label: "Next" });

    expect(saveAnswer).not.toHaveBeenCalled();
    expect(exitToConversation).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
  });

  it("uses the saved gate when the response is complete without a new completion transition", async () => {
    saveAnswer.mockResolvedValue(createSaveResponse({ justCompleted: false }));
    const target = mountQuestion();
    await clickButton({ target, label: "Bicycle" });
    await clickButton({ target, label: "Next" });

    expect(exitToConversation).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
  });

  it("continues to the next question when the survey is not complete", async () => {
    state.hasNextQuestion = true;
    saveAnswer.mockResolvedValue(
      createSaveResponse({ justCompleted: false, status: "in_progress" })
    );
    const target = mountQuestion();
    await clickButton({ target, label: "Bicycle" });
    await clickButton({ target, label: "Next" });

    expect(exitToConversation).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledExactlyOnceWith({
      path: "/project/project-one/conversation/conversation-one/onboarding/question/question-two",
    });
    expect(showNotifyMessage).not.toHaveBeenCalled();
  });

  it("keeps a still-incomplete survey on the review path after its last question", async () => {
    saveAnswer.mockResolvedValue(
      createSaveResponse({ justCompleted: false, status: "in_progress" })
    );
    const target = mountQuestion();
    await clickButton({ target, label: "Bicycle" });
    await clickButton({ target, label: "Next" });

    expect(exitToConversation).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledExactlyOnceWith({
      path: "/project/project-one/conversation/conversation-one/onboarding/summary",
    });
    expect(showNotifyMessage).not.toHaveBeenCalled();
  });

  it("routes a backend verification block back to onboarding without announcing completion", async () => {
    saveAnswer.mockResolvedValue(
      participationRejectionFixture("email_verification_required")
    );
    const target = mountQuestion();
    await clickButton({ target, label: "Bicycle" });
    await clickButton({ target, label: "Next" });

    expect(replace).toHaveBeenCalledExactlyOnceWith({
      path: "/project/project-one/conversation/conversation-one/onboarding/verify/email",
    });
    expect(exitToConversation).not.toHaveBeenCalled();
    expect(showNotifyMessage).not.toHaveBeenCalled();
  });

  it("prevents another save or close while a save is in flight", async () => {
    const pendingSave = Promise.withResolvers<SurveyAnswerSaveResponse>();
    saveAnswer.mockReturnValueOnce(pendingSave.promise);
    const target = mountQuestion();
    await clickButton({ target, label: "Bicycle" });
    await clickButton({ target, label: "Next" });
    await clickButton({ target, label: "Next" });
    await clickButton({ target, label: "Close" });

    expect(saveAnswer).toHaveBeenCalledOnce();
    expect(exitToConversation).not.toHaveBeenCalled();
    pendingSave.resolve(createSaveResponse());
    await vi.waitFor(() => expect(exitToConversation).toHaveBeenCalledOnce());
  });

  it("does not report a saved answer as failed when navigation fails", async () => {
    const navigationError = new Error("Navigation failed");
    exitToConversation.mockRejectedValueOnce(navigationError);
    const target = mountQuestion();
    await clickButton({ target, label: "Bicycle" });
    await clickButton({ target, label: "Next" });

    expect(saveAnswer).toHaveBeenCalledOnce();
    expect(handleVueError.mock.calls[0]?.[0]).toBe(navigationError);
    expect(showNotifyMessage).not.toHaveBeenCalled();
  });
});
