import { defineStore } from "pinia";
import { uid } from "quasar";
import { getConversationUpdatesOverrideUpdate } from "src/components/newConversation/createConversationUpdatesSettingsLogic";
import type {
  ConversationFormState,
  PostAsSettings,
  QvStatementDraft,
} from "src/composables/conversation/draft/conversationDraft.types";
import type {
  ConversationEmailUpdateConfigurationResponse,
  GetConversationForEditResponse,
  UpdateConversationRequest,
} from "src/shared/types/dto";
import type { ConversationProjectTarget } from "src/shared/types/zod";
import { getConversationProjectTargetKey } from "src/shared/utils/conversationProject";
import {
  areConversationTypeConfigsEqual,
  projectConversationTypeConfig,
} from "src/shared/utils/conversationTypeConfig";
import { useAuthenticationStore } from "src/stores/authentication";
import { computed, ref, watch } from "vue";

export type EditableConversation = Extract<
  GetConversationForEditResponse,
  { success: true }
>;
export type ConversationUpdatesConfiguration = Extract<
  Extract<
    ConversationEmailUpdateConfigurationResponse,
    { success: true }
  >["configuration"],
  { target: "conversation" }
>;

export interface EditConversationDetails {
  original: EditableConversation;
  form: ConversationFormState;
  projectTarget: ConversationProjectTarget;
  emailConfiguration: ConversationUpdatesConfiguration | undefined;
  emailOverride: boolean | undefined;
  originalEmailOverride: boolean | undefined;
}

export interface EditConversationSession extends EditConversationDetails {
  aiSuggestionDraftId: string;
  postAs: PostAsSettings;
  newSeedOpinions: string[];
  existingSeedOpinions: ExistingSeedOpinionDraft[];
  qvStatements: QvStatementDraft[];
  qvStatementsNeedRefresh: boolean;
  participantPolicyNeedsRefresh: boolean;
  isSaving: boolean;
}

export interface ExistingSeedOpinionDraft {
  slugId: string;
  sourceVersion: string;
  originalContent: string;
  content: string;
  deleted: boolean;
  editing: EditableConversation["seedOpinions"][number]["editing"];
}

function hasExistingSeedOpinionChanges(
  session: EditConversationSession
): boolean {
  return session.existingSeedOpinions.some(
    (opinion) => opinion.deleted || opinion.content !== opinion.originalContent
  );
}

export function buildSeedOpinionChanges(
  session: EditConversationSession
): NonNullable<UpdateConversationRequest["seedOpinionChanges"]> {
  return session.existingSeedOpinions.flatMap<
    NonNullable<UpdateConversationRequest["seedOpinionChanges"]>[number]
  >((opinion) => {
    const identity = {
      slugId: opinion.slugId,
      sourceVersion: opinion.sourceVersion,
    };
    if (opinion.deleted) return [{ ...identity, action: "delete" }];
    if (opinion.content !== opinion.originalContent)
      return [{ ...identity, action: "edit", content: opinion.content }];
    return [];
  });
}

export function buildQvStatementUpdate(
  session: EditConversationSession
): UpdateConversationRequest["qvStatementUpdate"] {
  const original = session.original.qvStatements;
  if (original === undefined) return undefined;
  const current = new Map(
    session.qvStatements.map((item) => [item.localKey, item])
  );
  const changes: NonNullable<
    UpdateConversationRequest["qvStatementUpdate"]
  >["changes"] = [];
  for (const item of original.items) {
    const draft = current.get(item.slugId);
    if (draft === undefined)
      changes.push({
        action: "delete",
        slugId: item.slugId,
        sourceVersion: item.sourceVersion,
      });
    else if (
      draft.title !== item.title ||
      draft.description !== (item.description ?? "")
    )
      changes.push({
        action: "edit",
        slugId: item.slugId,
        sourceVersion: item.sourceVersion,
        content: {
          title: draft.title,
          description:
            draft.description.trim() === "" ? undefined : draft.description,
        },
      });
  }
  const order = session.qvStatements.map((item) => item.localKey);
  if (
    changes.length === 0 &&
    JSON.stringify(order) ===
      JSON.stringify(original.items.map((item) => item.slugId))
  )
    return undefined;
  return { expectedRevision: original.revision, changes, order };
}

export function createEditConversationForm(
  original: EditableConversation
): ConversationFormState {
  return {
    participantStatements: { ...original.participantStatements },
    title: original.conversationTitle,
    content: original.conversationBody ?? "",
    conversationTypeConfig: original.conversationTypeConfig,
    multilingualSetting: original.multilingualSetting,
    selectedProjectSlug: original.projectLanguageProject?.projectSlug,
    inheritProjectLanguages:
      original.languageSettingsSource === "project_inherited" &&
      original.projectLanguageProject !== undefined,
    isPrivate: !original.isIndexed,
    participationMode: original.participationMode,
    aiLabelingEnabled: original.aiLabelingEnabled,
    preferredOpinionGroupCount: original.preferredOpinionGroupCount,
    surveyConfig: original.surveyConfig ?? null,
  };
}

export function buildEditConversationRequest(
  details: EditConversationDetails
): UpdateConversationRequest {
  const {
    original,
    form,
    projectTarget,
    emailOverride,
    originalEmailOverride,
  } = details;
  return {
    conversationSlugId: original.conversationSlugId,
    participantStatementsChange:
      original.participantStatements.supported &&
      form.participantStatements.supported &&
      original.participantStatements.enabled !==
        form.participantStatements.enabled
        ? {
            expectedEnabled: original.participantStatements.enabled,
            enabled: form.participantStatements.enabled,
          }
        : undefined,
    projectChange:
      getConversationProjectTargetKey(projectTarget) ===
      getConversationProjectTargetKey(original.projectTarget)
        ? undefined
        : {
            expectedProjectSlug: original.currentProjectSlug,
            target: projectTarget,
          },
    conversationTitle: form.title,
    // A seed-only update must preserve an absent body rather than create a content revision.
    conversationBody:
      form.content === "" && original.conversationBody === undefined
        ? undefined
        : form.content,
    isIndexed: !form.isPrivate,
    participationMode: form.participationMode,
    multilingualSetting: {
      dynamicTranslationEnabled:
        form.multilingualSetting.dynamicTranslationEnabled,
      additionalLanguageCodes: [
        ...form.multilingualSetting.additionalLanguageCodes,
      ].sort(),
    },
    languageSettingsSource:
      projectTarget.kind === "project" && form.inheritProjectLanguages
        ? "project_inherited"
        : "conversation_override",
    conversationTypeConfig:
      form.conversationTypeConfig.conversationType === "polis"
        ? {
            conversationType: "polis",
            votingPresentation: form.conversationTypeConfig.votingPresentation,
            aiLabelingEnabled: form.aiLabelingEnabled,
            preferredOpinionGroupCount: form.preferredOpinionGroupCount,
          }
        : form.conversationTypeConfig,
    expectedConversationTypeConfig: areConversationTypeConfigsEqual({
      left: original.conversationTypeConfig,
      right: form.conversationTypeConfig,
    })
      ? undefined
      : projectConversationTypeConfig(original.conversationTypeConfig),
    conversationEmailUpdateEnabledOverride:
      getConversationUpdatesOverrideUpdate({
        currentOverride: emailOverride,
        originalOverride: originalEmailOverride,
      }),
  };
}

export function hasEditConversationDetailsChanges(
  details: EditConversationDetails
): boolean {
  const baseline = buildEditConversationRequest({
    ...details,
    form: createEditConversationForm(details.original),
    projectTarget: details.original.projectTarget,
    emailOverride: details.originalEmailOverride,
  });
  return (
    JSON.stringify(buildEditConversationRequest(details)) !==
    JSON.stringify(baseline)
  );
}

export const useEditConversationStore = defineStore("editConversation", () => {
  const auth = useAuthenticationStore();
  const session = ref<EditConversationSession>();
  const isSaving = computed(() => session.value?.isSaving ?? false);
  const hasUnsavedChanges = computed(
    () =>
      session.value !== undefined &&
      (session.value.newSeedOpinions.length > 0 ||
        hasExistingSeedOpinionChanges(session.value) ||
        buildQvStatementUpdate(session.value) !== undefined ||
        hasEditConversationDetailsChanges(session.value))
  );

  function start(
    value: Omit<
      EditConversationSession,
      | "existingSeedOpinions"
      | "aiSuggestionDraftId"
      | "qvStatements"
      | "qvStatementsNeedRefresh"
      | "participantPolicyNeedsRefresh"
    >
  ): void {
    session.value = {
      ...value,
      aiSuggestionDraftId: uid(),
      qvStatementsNeedRefresh: false,
      participantPolicyNeedsRefresh: false,
      qvStatements:
        value.original.qvStatements?.items.map((item) => ({
          localKey: item.slugId,
          title: item.title,
          description: item.description ?? "",
        })) ?? [],
      existingSeedOpinions: value.original.seedOpinions.map((opinion) => ({
        slugId: opinion.slugId,
        sourceVersion: opinion.sourceVersion,
        originalContent: opinion.content,
        content: opinion.content,
        deleted: false,
        editing: opinion.editing,
      })),
    };
  }
  function clear(): void {
    session.value = undefined;
  }

  watch([() => auth.userId, () => auth.isLoggedIn], clear, { flush: "sync" });

  return { session, isSaving, hasUnsavedChanges, start, clear };
});
