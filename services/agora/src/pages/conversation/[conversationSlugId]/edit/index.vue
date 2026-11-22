<template>
  <EditConversationLayout
    ref="editLayout"
    :conversation-slug-id="conversationSlugId"
    :is-loading="!hasLoadedSession"
    :has-unsaved-changes="hasUnsavedChanges || editStore.hasUnsavedChanges"
    :navigation-pending="editStore.isSaving"
    :fallback-route="conversationReturnPath"
  >
    <template #actions>
      <PrimeButton
        v-if="isNextButtonDisabled"
        :label="seedT('nextButton')"
        disabled
      />
      <SpaLink v-else :to="seedRoute" deferred @click="onNext">
        <PrimeButton as="span" :label="seedT('nextButton')" />
      </SpaLink>
    </template>

    <div class="container">
      <NewConversationControlBar
        v-model:is-private="isPrivate"
        v-model:import-settings="importSettings"
        v-model:external-source-config="externalSourceConfig"
        v-model:title="title"
        v-model:content="content"
        v-model:multilingual-setting="multilingualSetting"
        v-model:conversation-type-config="conversationTypeConfig"
        v-model:ai-labeling-enabled="aiLabelingEnabled"
        v-model:preferred-opinion-group-count="preferredOpinionGroupCount"
        :post-as="postAs"
        :allowed-post-as="allowedPostAs"
        :participation-mode="participationMode"
        :is-edit-mode="true"
        :can-use-analysis-variants-preference="canUseAnalysisVariantsPreference"
        :can-use-dynamic-translation="canUseDynamicTranslation"
        :hide-language-setting="currentProjectLanguageProject !== undefined"
        :detected-language-code="visibleDetectedLanguageCode"
        :detected-source-language-code="visibleDetectedSourceLanguageCode"
        :detected-raw-language-code="visibleDetectedRawLanguageCode"
        :auto-detection-status="visibleAutoDetectionStatus"
        @update:participation-mode="updateParticipationModeWithReachWarning"
        @update:post-as="updatePostAs"
      >
        <template #extra-controls>
          <ConversationProjectSelect
            v-if="
              projectTarget !== undefined && projectSelectOptions.length > 0
            "
            :options="projectSelectOptions"
            :model-value="projectTarget"
            :fallback-label="currentProjectLanguageProject?.projectTitle"
            @update:model-value="selectProject"
          />
          <ConversationProjectLanguageSettings
            v-if="currentProjectLanguageProject !== undefined"
            v-model:inherit-project-languages="inheritProjectLanguages"
            v-model:override-multilingual-setting="multilingualSetting"
            :project="currentProjectLanguageProject"
            :can-use-dynamic-translation="canUseDynamicTranslation"
            :detected-language-code="visibleDetectedLanguageCode"
          />
          <CreateConversationUpdatesSettings
            :model-value="conversationUpdatesOverride"
            :scope-kind="
              projectTarget?.kind === 'project' ? 'project' : 'no-project'
            "
            :project-title="currentProjectLanguageProject?.projectTitle"
            :scope-default-enabled="conversationUpdatesScopeDefault"
            :access="
              selectedEmailUpdatesConfiguration?.canConfigure === true
                ? 'configure'
                : hasProjectChange
                  ? 'disable_only'
                  : 'none'
            "
            :has-participant-contact-email="
              selectedEmailUpdatesConfiguration?.hasParticipantContactEmail ===
              true
            "
            mode="edit"
            @update:model-value="updateEmailUpdatesWithReachWarning"
          />
        </template>
      </NewConversationControlBar>

      <ConversationUpdatesPartialEmailReachDialog
        v-model="partialEmailReachWarningMode"
        @action="handlePartialEmailReachAction"
      />

      <div class="contentFlexStyle">
        <div v-if="isSurveyFeatureAllowed" class="surveyActionRow">
          <q-btn
            flat
            no-caps
            color="primary"
            :label="responseSurveyButtonLabel"
            @click="openSurveyEditor"
          />
        </div>

        <div ref="titleInputRef">
          <div v-if="validationState.title.showError" class="titleErrorMessage">
            <q-icon name="mdi-alert-circle" class="titleErrorIcon" />
            {{ validationState.title.error }}
          </div>

          <Editor
            v-if="editPermissions?.canEditConversationContent === true"
            v-model="title"
            outlined
            :placeholder="t('titlePlaceholder')"
            :show-toolbar="false"
            :single-line="true"
            :disabled="!canEditConversationContent"
            :max-length="MAX_LENGTH_CONVERSATION_TITLE"
            :show-character-count="true"
            min-height="auto"
            @update:model-value="updateTitle"
            @update:is-over-limit="(v: boolean) => (isTitleOverLimit = v)"
          />
          <ZKHtmlContent
            v-else-if="hasLoadedSession"
            :html-body="title"
            :compact-mode="false"
            :enable-links="false"
            content-role="title"
            :collapsible="false"
          />
        </div>

        <div>
          <div class="editor-style">
            <Editor
              v-if="editPermissions?.canEditConversationContent === true"
              v-model="content"
              outlined
              :placeholder="t('bodyPlaceholder')"
              min-height="5rem"
              :show-toolbar="true"
              :single-line="false"
              :disabled="!canEditConversationContent"
              :max-length="MAX_LENGTH_CONVERSATION_BODY"
              :show-character-count="true"
              @update:model-value="updateContent"
              @update:is-over-limit="(v: boolean) => (isBodyOverLimit = v)"
            />
            <ZKHtmlContent
              v-else-if="hasLoadedSession"
              :html-body="content"
              :compact-mode="false"
              :enable-links="true"
              :collapsible="false"
            />
          </div>
        </div>
      </div>
    </div>
  </EditConversationLayout>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import Editor from "src/components/editor/Editor.vue";
import {
  type ConversationProjectEditTranslations,
  conversationProjectEditTranslations,
} from "src/components/newConversation/conversationProjectEdit.i18n";
import { getProjectLanguageOverride } from "src/components/newConversation/conversationProjectLanguage";
import ConversationProjectLanguageSettings from "src/components/newConversation/ConversationProjectLanguageSettings.vue";
import ConversationProjectSelect from "src/components/newConversation/ConversationProjectSelect.vue";
import ConversationUpdatesPartialEmailReachDialog from "src/components/newConversation/ConversationUpdatesPartialEmailReachDialog.vue";
import {
  areConversationUpdatesReachStatesEqual,
  type ConversationUpdatesReachState,
  getPartialEmailReachWarning,
  getUnacknowledgedPartialEmailReachWarning,
  type PartialEmailReachAction,
  type PartialEmailReachParticipationMode,
  resolvePartialEmailReachAction,
} from "src/components/newConversation/conversationUpdatesPartialEmailReachLogic";
import CreateConversationUpdatesSettings from "src/components/newConversation/CreateConversationUpdatesSettings.vue";
import EditConversationLayout from "src/components/newConversation/EditConversationLayout.vue";
import {
  getEditConversationPostAsOptions,
  getEditConversationProjectSelectOptions,
} from "src/components/newConversation/editConversationProjectOptions";
import NewConversationControlBar from "src/components/newConversation/NewConversationControlBar.vue";
import { seedOpinionsTranslations } from "src/components/newConversation/SeedOpinions.i18n";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import {
  type PostAsSettings,
  useConversationDraft,
  type ValidationErrorField,
} from "src/composables/conversation/draft";
import {
  type EditConversationLoadContext,
  type EditConversationLoadFailure,
  useEditConversationLoader,
} from "src/composables/conversation/useEditConversationLoader";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  MAX_LENGTH_CONVERSATION_BODY,
  MAX_LENGTH_CONVERSATION_TITLE,
} from "src/shared/shared";
import type {
  ConversationProjectTarget,
  ParticipationMode,
} from "src/shared/types/zod";
import { getConversationProjectTargetKey } from "src/shared/utils/conversationProject";
import {
  type ConversationUpdatesConfiguration,
  createEditConversationForm,
  type EditableConversation,
  type EditConversationDetails,
  hasEditConversationDetailsChanges,
  useEditConversationStore,
} from "src/stores/editConversation";
import { useBackendConversationEmailUpdatesApi } from "src/utils/api/conversationUpdates/conversationEmailUpdates";
import { useBackendPostEditApi } from "src/utils/api/post/postEdit";
import { getSingleRouteParam } from "src/utils/router/params";
import { useNotify } from "src/utils/ui/notify";
import { computed, nextTick, ref } from "vue";
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRoute,
  useRouter,
} from "vue-router";

import {
  type EditConversationTranslations,
  editConversationTranslations,
} from "./index.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

const { t } = useComponentI18n<EditConversationTranslations>(
  editConversationTranslations
);
const { t: tProjectEdit } =
  useComponentI18n<ConversationProjectEditTranslations>(
    conversationProjectEditTranslations
  );
const { showNotifyMessage } = useNotify();

const route = useRoute();
const router = useRouter();
const { getConversationForEdit } = useBackendPostEditApi();
const editStore = useEditConversationStore();
const { t: seedT } = useComponentI18n(seedOpinionsTranslations);

const conversationSlugId = computed(() =>
  getSingleRouteParam(route.params.conversationSlugId)
);

const seedRoute = computed(() => ({
  name: "/conversation/[conversationSlugId]/edit/seed/" as const,
  params: { conversationSlugId: conversationSlugId.value },
  query: route.query,
}));
const isTitleOverLimit = ref(false);
const isBodyOverLimit = ref(false);
const editLayout = ref<InstanceType<typeof EditConversationLayout>>();
const loadedConversation = ref<EditableConversation>();
const projectTarget = ref<ConversationProjectTarget>();
const allowedPostAs = computed(() =>
  loadedConversation.value === undefined
    ? []
    : getEditConversationPostAsOptions(loadedConversation.value)
);
const hasProjectChange = computed(
  () =>
    projectTarget.value !== undefined &&
    loadedConversation.value !== undefined &&
    getConversationProjectTargetKey(projectTarget.value) !==
      getConversationProjectTargetKey(loadedConversation.value.projectTarget)
);
const projectSelectOptions = computed(() => {
  const conversation = loadedConversation.value;
  if (conversation === undefined) return [];
  return getEditConversationProjectSelectOptions({
    conversation,
    postAs: postAs.value,
  });
});
const editPermissions = computed(
  () => loadedConversation.value?.editPermissions
);
const hasLoadedSession = computed(
  () =>
    !isLoading.value &&
    editStore.session?.original.conversationSlugId === conversationSlugId.value
);
const titleInputRef = ref<HTMLDivElement>();

const responseSurveyButtonLabel = computed(() => {
  return loadedConversation.value?.surveyConfig == null
    ? t("createSurveyButton")
    : t("editSurveyButton");
});
const isSurveyFeatureAllowed = computed(() => {
  return (
    editPermissions.value?.canEditSurvey === true ||
    (loadedConversation.value?.surveyConfig != null &&
      editPermissions.value?.canDeleteSurvey === true)
  );
});
const canEditConversationContent = computed(() => {
  return (
    !editStore.isSaving &&
    editPermissions.value?.canEditConversationContent === true
  );
});
const canUseAnalysisVariantsPreference = computed(() => {
  if (hasProjectChange.value)
    return (
      selectedProjectOption.value?.premiumFeatures.includes(
        "analysis_variants"
      ) ?? false
    );
  return editPermissions.value?.canUseAnalysisVariantsPreference ?? false;
});
const canUseDynamicTranslation = computed(() => {
  if (hasProjectChange.value)
    return (
      selectedProjectOption.value?.premiumFeatures.includes(
        "dynamic_translation"
      ) ?? false
    );
  return editPermissions.value?.canUseDynamicTranslation ?? false;
});

const hasUnsavedChanges = computed(() => {
  const details = getLiveDetails();
  return (
    hasLoadedSession.value &&
    details !== undefined &&
    hasEditConversationDetailsChanges(details)
  );
});

// Use conversation draft composable (no store sync for edit page)
const {
  title,
  content,
  multilingualSetting,
  selectedProjectSlug,
  inheritProjectLanguages,
  isPrivate,
  participationMode,
  aiLabelingEnabled,
  preferredOpinionGroupCount,
  postAs,
  importSettings,
  externalSourceConfig,
  conversationTypeConfig,
  validationState,
  validateTitle,
  validateBody,
  updateTitle,
  updateContent,
  initializeFromData,
  getDraftSnapshot,
  surveyConfig,
} = useConversationDraft({ syncToStore: false });
const conversationEmailUpdatesApi = useBackendConversationEmailUpdatesApi();
const conversationUpdatesConfiguration = ref<
  ConversationUpdatesConfiguration | undefined
>(undefined);
const conversationUpdatesOverride = ref<boolean | undefined>(undefined);
const originalConversationUpdatesOverride = ref<boolean | undefined>(undefined);
const selectedProjectOption = computed(() =>
  loadedConversation.value?.projectOptions.find(
    (option) =>
      projectTarget.value !== undefined &&
      getConversationProjectTargetKey(option.target) ===
        getConversationProjectTargetKey(projectTarget.value)
  )
);
const selectedEmailUpdatesConfiguration = computed(() => {
  if (hasProjectChange.value) return selectedProjectOption.value?.emailUpdates;
  const configuration = conversationUpdatesConfiguration.value;
  return configuration === undefined
    ? undefined
    : {
        canConfigure: configuration.canConfigure,
        hasParticipantContactEmail:
          configuration.participantContactEmail !== undefined,
        scopeDefaultEnabled: configuration.scopeDefaultEnabled,
      };
});
const conversationUpdatesScopeDefault = computed(
  () => selectedEmailUpdatesConfiguration.value?.scopeDefaultEnabled ?? false
);
const partialEmailReachWarningMode = ref<
  PartialEmailReachParticipationMode | undefined
>(undefined);
const acknowledgedPartialEmailReachState = ref<
  ConversationUpdatesReachState | undefined
>(undefined);

function getEditConversationUpdatesReachState({
  mode,
  override,
}: {
  mode: ParticipationMode;
  override: boolean | undefined;
}): ConversationUpdatesReachState {
  const configuration = selectedEmailUpdatesConfiguration.value;
  return {
    participationMode: mode,
    effectiveEmailUpdatesEnabled:
      configuration !== undefined &&
      configuration.hasParticipantContactEmail &&
      (override ?? configuration.scopeDefaultEnabled),
  };
}

function showReachWarningForTransition({
  previous,
  next,
}: {
  previous: ConversationUpdatesReachState;
  next: ConversationUpdatesReachState;
}): void {
  if (
    !areConversationUpdatesReachStatesEqual({ left: previous, right: next })
  ) {
    acknowledgedPartialEmailReachState.value = undefined;
  }
  const warningMode = getPartialEmailReachWarning({
    previous,
    next,
  });
  if (warningMode !== undefined) {
    partialEmailReachWarningMode.value = warningMode;
  }
}

function updateParticipationModeWithReachWarning(
  mode: ParticipationMode
): void {
  const previous = getEditConversationUpdatesReachState({
    mode: participationMode.value,
    override: conversationUpdatesOverride.value,
  });
  participationMode.value = mode;
  showReachWarningForTransition({
    previous,
    next: getEditConversationUpdatesReachState({
      mode,
      override: conversationUpdatesOverride.value,
    }),
  });
}

function updateEmailUpdatesWithReachWarning(
  override: boolean | undefined
): void {
  const previous = getEditConversationUpdatesReachState({
    mode: participationMode.value,
    override: conversationUpdatesOverride.value,
  });
  conversationUpdatesOverride.value = override;
  showReachWarningForTransition({
    previous,
    next: getEditConversationUpdatesReachState({
      mode: participationMode.value,
      override,
    }),
  });
}

function handlePartialEmailReachAction(action: PartialEmailReachAction): void {
  const resolution = resolvePartialEmailReachAction({
    action,
    participationMode: participationMode.value,
    conversationEmailUpdateEnabledOverride: conversationUpdatesOverride.value,
  });
  participationMode.value = resolution.participationMode;
  conversationUpdatesOverride.value =
    resolution.conversationEmailUpdateEnabledOverride;
  acknowledgedPartialEmailReachState.value =
    action === "keep_updates_on"
      ? getEditConversationUpdatesReachState({
          mode: participationMode.value,
          override: conversationUpdatesOverride.value,
        })
      : undefined;
  partialEmailReachWarningMode.value = undefined;
}

const currentProjectLanguageProject = computed<
  EditableConversation["projectLanguageProject"]
>(() => {
  if (!hasProjectChange.value)
    return loadedConversation.value?.projectLanguageProject;
  const option = selectedProjectOption.value;
  if (option === undefined || !("languageSettings" in option)) return undefined;
  return {
    projectSlug: option.target.projectSlug,
    projectTitle: option.title,
    participationMode: option.participationMode,
    defaultLanguageCode: option.defaultLanguageCode,
    languageSettings: option.languageSettings,
  };
});

function updatePostAs(selection: PostAsSettings): void {
  if (
    selection.postAsOrganization === postAs.value.postAsOrganization &&
    selection.organizationName === postAs.value.organizationName
  )
    return;
  const conversation = loadedConversation.value;
  if (conversation === undefined) return;
  const options = getEditConversationProjectSelectOptions({
    conversation,
    postAs: selection,
  });
  const target =
    options.find((option) => option.target.kind === "no_project") ??
    options.at(0);
  if (target === undefined) {
    showNotifyMessage(tProjectEdit("projectPermissionError"));
    return;
  }
  if (applyProjectTarget(target.target)) postAs.value = selection;
}

function selectProject(target: ConversationProjectTarget): void {
  const option = projectSelectOptions.value.find(
    (option) =>
      getConversationProjectTargetKey(option.target) ===
      getConversationProjectTargetKey(target)
  );
  if (option !== undefined) applyProjectTarget(option.target);
}

function applyProjectTarget(target: ConversationProjectTarget): boolean {
  if (
    projectTarget.value !== undefined &&
    getConversationProjectTargetKey(projectTarget.value) ===
      getConversationProjectTargetKey(target)
  )
    return true;
  const previous = getEditConversationUpdatesReachState({
    mode: participationMode.value,
    override: conversationUpdatesOverride.value,
  });
  if (
    target.kind === "no_project" &&
    inheritProjectLanguages.value &&
    currentProjectLanguageProject.value !== undefined
  ) {
    const override = getProjectLanguageOverride({
      project: currentProjectLanguageProject.value,
      detectedLanguageCode: visibleDetectedLanguageCode.value,
      canUseDynamicTranslation:
        loadedConversation.value?.projectOptions
          .find(
            (option) =>
              getConversationProjectTargetKey(option.target) ===
              getConversationProjectTargetKey(target)
          )
          ?.premiumFeatures.includes("dynamic_translation") ?? false,
    });
    if (!override.success) {
      showNotifyMessage(tProjectEdit("detachLanguagesError"));
      return false;
    }
    multilingualSetting.value = override.data;
  }
  projectTarget.value = target;
  selectedProjectSlug.value =
    target.kind === "project" ? target.projectSlug : undefined;
  if (target.kind === "no_project") inheritProjectLanguages.value = false;
  showReachWarningForTransition({
    previous,
    next: getEditConversationUpdatesReachState({
      mode: participationMode.value,
      override: conversationUpdatesOverride.value,
    }),
  });
  return true;
}

const canShowStoredAutoDetection = computed(() => {
  const original = loadedConversation.value;
  return (
    original !== undefined &&
    title.value === original.conversationTitle &&
    content.value === (original.conversationBody ?? "")
  );
});

const visibleDetectedLanguageCode = computed(() =>
  canShowStoredAutoDetection.value
    ? loadedConversation.value?.contentLanguageMetadata
        .detectedDisplayLanguageCode
    : undefined
);
const visibleDetectedSourceLanguageCode = computed(() =>
  canShowStoredAutoDetection.value
    ? loadedConversation.value?.contentLanguageMetadata
        .detectedSourceLanguageCode
    : undefined
);
const visibleDetectedRawLanguageCode = computed(() =>
  canShowStoredAutoDetection.value
    ? loadedConversation.value?.contentLanguageMetadata.detectedRawLanguageCode
    : undefined
);
const visibleAutoDetectionStatus = computed(() =>
  canShowStoredAutoDetection.value
    ? loadedConversation.value?.contentLanguageMetadata.autoDetectionStatus
    : undefined
);

const isNextButtonDisabled = computed(() => {
  return (
    !hasLoadedSession.value ||
    editStore.isSaving ||
    isTitleOverLimit.value ||
    isBodyOverLimit.value
  );
});

async function scrollToTitleInput() {
  await nextTick();
  titleInputRef.value?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

async function handleValidationError(
  errorField: ValidationErrorField
): Promise<void> {
  switch (errorField) {
    case "title":
      validateTitle();
      await scrollToTitleInput();
      break;
    case "body":
      validateBody();
      break;
    case "polisUrl":
      // Not applicable for edit page
      break;
  }
}

function validateSubmission(): {
  isValid: boolean;
  errorField?: ValidationErrorField;
} {
  // Validate title
  if (!validateTitle().success) {
    return { isValid: false, errorField: "title" };
  }

  // Validate body
  if (!validateBody().success) {
    return { isValid: false, errorField: "body" };
  }

  return { isValid: true };
}

function getLiveDetails(): EditConversationDetails | undefined {
  const original = loadedConversation.value;
  const target = projectTarget.value;
  if (original === undefined || target === undefined) return undefined;
  return {
    original,
    projectTarget: target,
    form: {
      participantStatements: original.participantStatements,
      title: title.value,
      content: content.value,
      multilingualSetting: multilingualSetting.value,
      selectedProjectSlug: selectedProjectSlug.value,
      inheritProjectLanguages: inheritProjectLanguages.value,
      isPrivate: isPrivate.value,
      participationMode: participationMode.value,
      conversationTypeConfig: conversationTypeConfig.value,
      aiLabelingEnabled: aiLabelingEnabled.value,
      preferredOpinionGroupCount: preferredOpinionGroupCount.value,
      surveyConfig: surveyConfig.value,
    },
    emailConfiguration: conversationUpdatesConfiguration.value,
    emailOverride: conversationUpdatesOverride.value,
    originalEmailOverride: originalConversationUpdatesOverride.value,
  };
}

async function onNext(event: MouseEvent): Promise<void> {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  if (isNextButtonDisabled.value) return;
  const validation = validateSubmission();
  if (!validation.isValid) {
    if (validation.errorField) {
      await handleValidationError(validation.errorField);
    }
    return;
  }

  const reachState = getEditConversationUpdatesReachState({
    mode: participationMode.value,
    override: conversationUpdatesOverride.value,
  });
  const warningMode = getUnacknowledgedPartialEmailReachWarning({
    state: reachState,
    acknowledgedState: acknowledgedPartialEmailReachState.value,
  });
  if (warningMode !== undefined) {
    partialEmailReachWarningMode.value = warningMode;
    return;
  }

  await router.push(seedRoute.value);
}

function persistDetails(): void {
  const details = getLiveDetails();
  const session = editStore.session;
  if (!hasLoadedSession.value || details === undefined || session === undefined)
    return;
  session.form = getDraftSnapshot();
  session.postAs = postAs.value;
  session.projectTarget = details.projectTarget;
  session.emailConfiguration = details.emailConfiguration;
  session.emailOverride = details.emailOverride;
}
onBeforeRouteLeave(persistDetails);
onBeforeRouteUpdate(persistDetails);

async function openSurveyEditor(): Promise<void> {
  await router.push({
    name: "/conversation/[conversationSlugId]/edit/survey/",
    params: { conversationSlugId: conversationSlugId.value },
    query: route.query,
  });
}

function applyConversationUpdatesConfiguration(
  configuration: ConversationUpdatesConfiguration
): void {
  conversationUpdatesConfiguration.value = configuration;
  if (configuration.setting === "inherit") {
    conversationUpdatesOverride.value = undefined;
    return;
  }
  conversationUpdatesOverride.value = configuration.setting === "enabled";
}

async function loadConversationUpdatesConfiguration(
  slug: string
): Promise<ConversationUpdatesConfiguration | undefined> {
  try {
    const response = await conversationEmailUpdatesApi.getConfiguration({
      target: "conversation",
      conversationSlugId: slug,
    });
    if (!response.success || response.configuration.target !== "conversation") {
      return undefined;
    }
    return response.configuration;
  } catch {
    console.error("Failed to load conversation Email Update configuration");
    return undefined;
  }
}

function resetLoadedConversation(): void {
  loadedConversation.value = undefined;
  projectTarget.value = undefined;
  isTitleOverLimit.value = false;
  isBodyOverLimit.value = false;
  conversationUpdatesConfiguration.value = undefined;
  conversationUpdatesOverride.value = undefined;
  originalConversationUpdatesOverride.value = undefined;
  partialEmailReachWarningMode.value = undefined;
  acknowledgedPartialEmailReachState.value = undefined;
}

function getSavedSession(slug: string) {
  return editStore.session?.original.conversationSlugId === slug
    ? editStore.session
    : undefined;
}

async function initializeConversation({
  conversation,
  isCurrent,
}: EditConversationLoadContext): Promise<void> {
  const savedSession = getSavedSession(conversation.conversationSlugId);
  loadedConversation.value = conversation;
  projectTarget.value =
    savedSession?.projectTarget ?? conversation.projectTarget;
  postAs.value = savedSession?.postAs ?? {
    postAsOrganization: conversation.postAsOrganizationSlug !== undefined,
    organizationName: conversation.postAsOrganizationSlug ?? "",
  };
  initializeFromData(
    savedSession?.form ?? createEditConversationForm(conversation)
  );
  externalSourceConfig.value = conversation.externalSourceConfig;

  if (savedSession !== undefined) {
    conversationUpdatesConfiguration.value = savedSession.emailConfiguration;
    conversationUpdatesOverride.value = savedSession.emailOverride;
    originalConversationUpdatesOverride.value =
      savedSession.originalEmailOverride;
  } else {
    const configuration = await loadConversationUpdatesConfiguration(
      conversation.conversationSlugId
    );
    if (!isCurrent()) return;
    if (configuration !== undefined)
      applyConversationUpdatesConfiguration(configuration);
    originalConversationUpdatesOverride.value =
      conversationUpdatesOverride.value;
    editStore.start({
      original: conversation,
      form: getDraftSnapshot(),
      postAs: postAs.value,
      projectTarget: conversation.projectTarget,
      isSaving: false,
      newSeedOpinions: [],
      emailConfiguration: conversationUpdatesConfiguration.value,
      emailOverride: conversationUpdatesOverride.value,
      originalEmailOverride: originalConversationUpdatesOverride.value,
    });
  }
  acknowledgedPartialEmailReachState.value =
    getEditConversationUpdatesReachState({
      mode: participationMode.value,
      override: conversationUpdatesOverride.value,
    });
}

const loadFailureMessageKeys = {
  not_found: "notFoundError",
  not_author: "notAuthorError",
  locked: "conversationLockedError",
  load_failed: "loadingErrorMessage",
} satisfies Record<
  EditConversationLoadFailure,
  keyof EditConversationTranslations
>;

const { isLoading, conversationReturnPath } = useEditConversationLoader({
  conversationSlugId,
  getConversation: (slug) =>
    getSavedSession(slug)?.original ?? getConversationForEdit(slug),
  onReset: resetLoadedConversation,
  onLoaded: initializeConversation,
  onReady: async () => {
    if (route.query.editStep !== "seed") return;
    const query = { ...route.query };
    delete query.editStep;
    await router.replace({ ...seedRoute.value, query });
  },
  onError: async (failure) => {
    editLayout.value?.unlockRoute();
    editStore.clear();
    showNotifyMessage({
      message: t(loadFailureMessageKeys[failure]),
      force: true,
    });
    await router.replace(conversationReturnPath.value);
  },
});
</script>

<style scoped lang="scss">
.editor-style {
  margin-bottom: 2rem;
  font-size: 1rem;
}

.contentFlexStyle {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.premium-restricted-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: $color-text-weak;
}

.premium-restricted-icon {
  color: $warning;
  font-size: 1.25rem;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding-top: 2rem;
  padding-bottom: 8rem;
}

.titleErrorMessage {
  display: flex;
  align-items: center;
  color: $negative;
  font-size: 0.9rem;
}

.titleErrorIcon {
  font-size: 1rem;
  margin-right: 0.5rem;
}
</style>
