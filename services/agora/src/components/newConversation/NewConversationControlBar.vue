<template>
  <div class="control-bar">
    <DynamicProfileImage
      v-if="showPostAsImage"
      :user-identity="postAsDisplayName"
      :size="35"
      :organization-image-url="selectedOrganizationImageUrl"
    />

    <ConversationControlButton
      v-for="button in visibleControlButtonsBeforeExtra"
      :key="button.id"
      :label="button.label"
      :icon="button.icon"
      :disabled="!button.clickable"
      :class="{ 'cursor-pointer': button.clickable }"
      :aria-label="button.label"
      @click="button.clickHandler"
    />
    <slot name="extra-controls" />
    <ConversationControlButton
      v-for="button in visibleControlButtonsAfterExtra"
      :key="button.id"
      :label="button.label"
      :icon="button.icon"
      :disabled="!button.clickable"
      :class="{ 'cursor-pointer': button.clickable }"
      :aria-label="button.label"
      @click="button.clickHandler"
    />
  </div>

  <PostAsAccountDialog
    v-model="showPostAsDialogVisible"
    v-model:post-as="postAs"
    :allowed-post-as="props.allowedPostAs"
  />

  <PostTypeDialog
    v-if="!props.isEditMode"
    v-model="showPostTypeDialog"
    v-model:import-settings="importSettings"
    v-model:conversation-type-config="conversationTypeConfig"
    :is-prioritizing-allowed="true"
    :is-import-allowed="isImportAllowed"
    @mode-change-requested="handleModeChangeRequest"
  />

  <VotingPresentationDialog
    v-if="supportsOpinionGroupAnalysis && importSettings.importType === null"
    v-model:show-dialog="showVotingPresentationDialog"
    v-model:voting-presentation="votingPresentation"
  />

  <ComparisonSourceDialog
    v-model="showComparisonSourceDialog"
    :current-config="externalSourceConfig"
    :on-source-selected="handleSourceSelected"
  />

  <ModeChangeConfirmationDialog
    v-model="showImportModeChangeConfirmation"
    :has-title="hasTitle"
    :has-body="hasBody"
    @confirm="handleModeChangeConfirm"
    @cancel="handleModeChangeCancel"
  />

  <VisibilityOptionsDialog
    v-model:show-dialog="showVisibilityDialog"
    v-model:is-private="isPrivate"
  />

  <AiLabelingOptionsDialog
    v-if="supportsOpinionGroupAnalysis"
    v-model:show-dialog="showAiLabelingDialog"
    v-model:ai-labeling-enabled="aiLabelingEnabled"
  />

  <AnalysisPreferenceDialog
    v-if="supportsOpinionGroupAnalysis"
    v-model:show-dialog="showAnalysisPreferenceDialog"
    v-model:preferred-opinion-group-count="preferredOpinionGroupCount"
    :can-use-analysis-variants-preference="canUseAnalysisVariantsPreference"
  />

  <ConversationLanguageSettingDialog
    v-model:show-dialog="showLanguageSettingDialog"
    v-model:multilingual-setting="multilingualSetting"
    :can-use-dynamic-translation="canUseDynamicTranslation"
    :detected-language-code="props.detectedLanguageCode"
    :detected-source-language-code="props.detectedSourceLanguageCode"
    :detected-raw-language-code="props.detectedRawLanguageCode"
    :auto-detection-status="props.autoDetectionStatus"
  />

  <LoginRequirementDialog
    v-model:show-dialog="showLoginRequirementDialog"
    v-model:participation-mode="participationMode"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import DynamicProfileImage from "src/components/account/DynamicProfileImage.vue";
import ConversationControlButton from "src/components/newConversation/ConversationControlButton.vue";
import AiLabelingOptionsDialog from "src/components/newConversation/dialog/AiLabelingOptionsDialog.vue";
import AnalysisPreferenceDialog from "src/components/newConversation/dialog/AnalysisPreferenceDialog.vue";
import ConversationLanguageSettingDialog from "src/components/newConversation/dialog/ConversationLanguageSettingDialog.vue";
import LoginRequirementDialog from "src/components/newConversation/dialog/LoginRequirementDialog.vue";
import ModeChangeConfirmationDialog from "src/components/newConversation/dialog/ModeChangeConfirmationDialog.vue";
import PostAsAccountDialog from "src/components/newConversation/dialog/PostAsAccountDialog.vue";
import VisibilityOptionsDialog from "src/components/newConversation/dialog/VisibilityOptionsDialog.vue";
import {
  type ConversationImportSettings,
  hasContentThatWouldBeCleared,
  type PostAsSettings,
} from "src/composables/conversation/draft";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type SupportedDisplayLanguageCodes,
  type SupportedSpokenLanguageCodes,
} from "src/shared/languages";
import type {
  AutoLanguageDetectionStatus,
  ConversationMultilingualSetting,
  ConversationTypeConfig,
  ExternalSourceConfig,
  ParticipationMode,
  PreferredOpinionGroupCount,
} from "src/shared/types/zod";
import {
  checkFeatureAccess,
  DEFAULT_FEATURE_ALLOWED_ORGS,
  DEFAULT_FEATURE_ALLOWED_USERS,
} from "src/shared-app-api/featureAccess";
import { useAuthenticationStore } from "src/stores/authentication";
import { useUserStore } from "src/stores/user";
import { usePremiumFeatureApi } from "src/utils/api/premiumFeature";
import { processEnv } from "src/utils/processEnv";
import { computed, ref, watch } from "vue";

import { formatLanguageControlLabel } from "./conversationLanguageControlLabel";
import ComparisonSourceDialog from "./dialog/ComparisonSourceDialog.vue";
import { getLanguageLabel } from "./dialog/conversationLanguageSettings.utils";
import PostTypeDialog from "./dialog/PostTypeDialog.vue";
import {
  type VotingPresentationTranslations,
  votingPresentationTranslations,
} from "./dialog/VotingPresentationDialog.i18n";
import VotingPresentationDialog from "./dialog/VotingPresentationDialog.vue";
import {
  type NewConversationControlBarTranslations,
  newConversationControlBarTranslations,
} from "./NewConversationControlBar.i18n";
import { qvItemsTranslations } from "./QvItems.i18n";

interface ControlButton {
  id: string;
  label: string;
  icon: string;
  isVisible: boolean;
  clickHandler: () => void;
  clickable: boolean;
}

interface Props {
  allowedPostAs: readonly PostAsSettings[] | undefined;
  isEditMode: boolean;
  canUseAnalysisVariantsPreference?: boolean;
  canUseDynamicTranslation?: boolean;
  detectedLanguageCode?: SupportedDisplayLanguageCodes | null;
  detectedSourceLanguageCode?: SupportedSpokenLanguageCodes | null;
  detectedRawLanguageCode?: string | null;
  autoDetectionStatus?: AutoLanguageDetectionStatus;
  hideLanguageSetting?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  canUseAnalysisVariantsPreference: false,
  canUseDynamicTranslation: false,
  detectedLanguageCode: undefined,
  detectedSourceLanguageCode: undefined,
  detectedRawLanguageCode: undefined,
  autoDetectionStatus: undefined,
  hideLanguageSetting: false,
});

const { t, locale } = useComponentI18n<NewConversationControlBarTranslations>(
  newConversationControlBarTranslations
);
const { t: typeT } = useComponentI18n(qvItemsTranslations);
const { t: tVotingPresentation } =
  useComponentI18n<VotingPresentationTranslations>(
    votingPresentationTranslations
  );

const { isLoggedIn, userId } = storeToRefs(useAuthenticationStore());
const { profileData } = storeToRefs(useUserStore());

// Define models for two-way binding
const isPrivate = defineModel<boolean>("isPrivate", { required: true });
const participationMode = defineModel<ParticipationMode>("participationMode", {
  required: true,
});
const postAs = defineModel<PostAsSettings>("postAs", { required: true });
const conversationTypeConfig = defineModel<ConversationTypeConfig>(
  "conversationTypeConfig",
  { required: true }
);
const votingPresentation = computed({
  get: () =>
    conversationTypeConfig.value.conversationType === "polis"
      ? conversationTypeConfig.value.votingPresentation
      : "list",
  set: (value: "list" | "one_at_a_time") => {
    if (conversationTypeConfig.value.conversationType === "polis") {
      conversationTypeConfig.value = {
        conversationType: "polis",
        votingPresentation: value,
      };
    }
  },
});
const conversationType = computed(
  () => conversationTypeConfig.value.conversationType
);
const comparisonMethod = computed(() =>
  conversationTypeConfig.value.conversationType === "prioritizing" &&
  conversationTypeConfig.value.prioritizationType === "comparisons"
    ? conversationTypeConfig.value.comparisonMethod
    : undefined
);
const supportsOpinionGroupAnalysis = computed(
  () => conversationTypeConfig.value.conversationType === "polis"
);
const importSettings = defineModel<ConversationImportSettings>(
  "importSettings",
  { required: true }
);
const externalSourceConfig = defineModel<ExternalSourceConfig | null>(
  "externalSourceConfig",
  { required: true }
);
const aiLabelingEnabled = defineModel<boolean>("aiLabelingEnabled", {
  required: true,
});
const preferredOpinionGroupCount = defineModel<PreferredOpinionGroupCount>(
  "preferredOpinionGroupCount",
  { required: true }
);
const multilingualSetting = defineModel<ConversationMultilingualSetting>(
  "multilingualSetting",
  { required: true }
);

// For checking if there's content that would be cleared (parent needs to provide these)
const title = defineModel<string>("title", { required: true });
const content = defineModel<string>("content", { required: true });

const selectedOrganization = computed(() => {
  if (!postAs.value.postAsOrganization) {
    return undefined;
  }

  return profileData.value.organizationList.find(
    (organization) => organization.slug === postAs.value.organizationName
  );
});

const postAsDisplayName = computed(() => {
  if (!postAs.value.postAsOrganization) {
    return profileData.value.userName;
  }

  return selectedOrganization.value?.name ?? postAs.value.organizationName;
});

const selectedOrganizationImageUrl = computed(() => {
  return selectedOrganization.value?.imageUrl ?? "";
});

const showPostAsImage = computed(() => {
  return true;
});

const showPostAsDialogVisible = ref(false);
const showPostTypeDialog = ref(false);
const showVotingPresentationDialog = ref(false);
const showVisibilityDialog = ref(false);
const showAiLabelingDialog = ref(false);
const showAnalysisPreferenceDialog = ref(false);
const showLanguageSettingDialog = ref(false);
const showLoginRequirementDialog = ref(false);

watch(supportsOpinionGroupAnalysis, (isSupported) => {
  if (!isSupported) {
    showVotingPresentationDialog.value = false;
    showAiLabelingDialog.value = false;
    showAnalysisPreferenceDialog.value = false;
  }
});

const showImportModeChangeConfirmation = ref(false);

const showAsDialog = (): void => {
  if (!canChangePostAs.value) return;
  showPostAsDialogVisible.value = true;
};

const canChangePostAs = computed(
  () => props.allowedPostAs === undefined || props.allowedPostAs.length > 1
);

// Computed properties to determine what content would be cleared
const hasTitle = computed(() => title.value.trim() !== "");
const hasBody = computed(() => content.value.trim() !== "");

/**
 * Checks if switching import type would clear content
 * Uses shared utility function with current form values
 */
function checkHasContentThatWouldBeCleared(): boolean {
  return hasContentThatWouldBeCleared(title.value, content.value);
}

interface ModeChangeConfig {
  importType: "polis-url" | "csv-import" | null;
  conversationTypeConfig: ConversationTypeConfig;
}

const pendingModeChangeConfig = ref<ModeChangeConfig>();

const handleModeChangeRequest = (config: ModeChangeConfig): void => {
  if (props.isEditMode) return;
  const currentType = importSettings.value.importType;
  if (
    currentType === null &&
    config.importType !== null &&
    checkHasContentThatWouldBeCleared()
  ) {
    pendingModeChangeConfig.value = config;
    showImportModeChangeConfirmation.value = true;
  } else {
    applyModeChange(config);
  }
};

function applyModeChange(config: ModeChangeConfig): void {
  conversationTypeConfig.value = config.conversationTypeConfig;

  if (
    config.conversationTypeConfig.conversationType === "prioritizing" &&
    config.conversationTypeConfig.prioritizationType === "comparisons"
  ) {
    // Auto-open source dialog if GitHub is allowed
    if (isComparisonGitHubAllowed.value) {
      showComparisonSourceDialog.value = true;
    }
  } else {
    // Clear external source config when switching away from comparisons.
    externalSourceConfig.value = null;
  }

  setImportTypeWithClearing(config.importType);
}

const handleModeChangeConfirm = (): void => {
  if (pendingModeChangeConfig.value) {
    applyModeChange(pendingModeChangeConfig.value);
    pendingModeChangeConfig.value = undefined;
  }
  showImportModeChangeConfirmation.value = false;
};

const handleModeChangeCancel = (): void => {
  pendingModeChangeConfig.value = undefined;
  showImportModeChangeConfirmation.value = false;
};

/**
 * Sets import type and clears relevant data
 */
function setImportTypeWithClearing(
  newType: "polis-url" | "csv-import" | null
): void {
  importSettings.value = {
    ...importSettings.value,
    importType: newType,
    polisUrl: newType === "polis-url" ? importSettings.value.polisUrl : "",
    csvFileMetadata:
      newType === "csv-import"
        ? importSettings.value.csvFileMetadata
        : {
            summary: null,
            comments: null,
            votes: null,
          },
  };
}

const togglePostTypeDialog = (): void => {
  showPostTypeDialog.value = !showPostTypeDialog.value;
};

const toggleVisibility = (): void => {
  showVisibilityDialog.value = true;
};

const toggleAiLabeling = (): void => {
  showAiLabelingDialog.value = true;
};

const toggleAnalysisPreference = (): void => {
  showAnalysisPreferenceDialog.value = true;
};

const toggleLanguageSetting = (): void => {
  showLanguageSettingDialog.value = true;
};

const toggleLoginRequirement = (): void => {
  showLoginRequirementDialog.value = true;
};

const isImportAllowed = computed(() => {
  const result = checkFeatureAccess({
    featureEnabled: true,
    isOrgOnly: processEnv.VITE_IS_ORG_IMPORT_ONLY === "true",
    allowedOrgs:
      processEnv.VITE_IMPORT_ALLOWED_ORGS ?? DEFAULT_FEATURE_ALLOWED_ORGS,
    allowedUsers:
      processEnv.VITE_IMPORT_ALLOWED_USERS ?? DEFAULT_FEATURE_ALLOWED_USERS,
    postAsOrganization: postAs.value.postAsOrganization,
    organizationName: postAs.value.organizationName,
    userId: userId.value ?? "",
  });
  return result.allowed;
});

const isComparisonGitHubAllowed = computed(() => {
  const result = checkFeatureAccess({
    featureEnabled: true,
    isOrgOnly: processEnv.VITE_IS_MAXDIFF_GITHUB_ORG_ONLY === "true",
    allowedOrgs:
      processEnv.VITE_MAXDIFF_GITHUB_ALLOWED_ORGS ??
      DEFAULT_FEATURE_ALLOWED_ORGS,
    allowedUsers:
      processEnv.VITE_MAXDIFF_GITHUB_ALLOWED_USERS ??
      DEFAULT_FEATURE_ALLOWED_USERS,
    postAsOrganization: postAs.value.postAsOrganization,
    organizationName: postAs.value.organizationName,
    userId: userId.value ?? "",
  });
  return result.allowed;
});

const { checkPremiumFeatureAccess } = usePremiumFeatureApi();
const createModeCanUseAnalysisVariantsPreference = ref<boolean | null>(null);
const createModeCanUseDynamicTranslation = ref<boolean | null>(null);
let createModePremiumAccessRequestId = 0;

const canUseAnalysisVariantsPreference = computed(() => {
  return props.isEditMode
    ? props.canUseAnalysisVariantsPreference
    : createModeCanUseAnalysisVariantsPreference.value === true;
});

const canUseDynamicTranslation = computed(() => {
  return props.isEditMode
    ? props.canUseDynamicTranslation
    : createModeCanUseDynamicTranslation.value === true;
});

watch(
  () => ({
    isEditMode: props.isEditMode,
    isLoggedIn: isLoggedIn.value,
    postAsOrganization: postAs.value.postAsOrganization,
    organizationName: postAs.value.organizationName,
    userId: userId.value,
  }),
  async () => {
    const requestId = ++createModePremiumAccessRequestId;

    if (props.isEditMode) {
      return;
    }

    if (!isLoggedIn.value) {
      createModeCanUseAnalysisVariantsPreference.value = null;
      createModeCanUseDynamicTranslation.value = null;
      return;
    }

    createModeCanUseAnalysisVariantsPreference.value = null;
    createModeCanUseDynamicTranslation.value = null;

    try {
      const postAsOrganization = postAs.value.postAsOrganization
        ? postAs.value.organizationName
        : undefined;
      const [analysisVariantsAccess, dynamicTranslationAccess] =
        await Promise.all([
          checkPremiumFeatureAccess({
            feature: "analysis_variants",
            postAsOrganization,
          }),
          checkPremiumFeatureAccess({
            feature: "dynamic_translation",
            postAsOrganization,
          }),
        ]);

      if (requestId !== createModePremiumAccessRequestId) {
        return;
      }

      createModeCanUseAnalysisVariantsPreference.value =
        analysisVariantsAccess.hasAccess;
      createModeCanUseDynamicTranslation.value =
        dynamicTranslationAccess.hasAccess;
    } catch {
      if (requestId !== createModePremiumAccessRequestId) {
        return;
      }

      createModeCanUseAnalysisVariantsPreference.value = false;
      createModeCanUseDynamicTranslation.value = false;
    }
  },
  { immediate: true }
);

watch(
  () =>
    !props.isEditMode &&
    createModeCanUseAnalysisVariantsPreference.value === false,
  (shouldReset) => {
    if (shouldReset) {
      preferredOpinionGroupCount.value = null;
    }
  },
  { immediate: true }
);

watch(
  () => !props.isEditMode && createModeCanUseDynamicTranslation.value === false,
  (shouldReset) => {
    if (shouldReset) {
      multilingualSetting.value = {
        dynamicTranslationEnabled: false,
        additionalLanguageCodes: [],
      };
    }
  },
  { immediate: true }
);

const showComparisonSourceDialog = ref(false);

function handleSourceSelected(config: ExternalSourceConfig | null): void {
  externalSourceConfig.value = config;
}

const analysisPreferenceLabel = computed(() => {
  return preferredOpinionGroupCount.value === null
    ? t("recommendedDefault")
    : t("groupsLabel", { count: String(preferredOpinionGroupCount.value) });
});

const languageSettingLabel = computed(() => {
  const detectedLanguage =
    props.detectedLanguageCode === null ||
    props.detectedLanguageCode === undefined
      ? t("languagePrimaryAuto")
      : getLanguageLabel({
          languageCode: props.detectedLanguageCode,
          locale: locale.value,
        });

  return formatLanguageControlLabel({
    languagesLabel: t("languagesLabel"),
    primaryLanguage: detectedLanguage,
    multilingualSetting: multilingualSetting.value,
    canUseDynamicTranslation: canUseDynamicTranslation.value,
    languageTranslateSuffix: t("languageTranslateSuffix"),
  });
});

const controlButtons = computed((): ControlButton[] => [
  {
    id: "post-as",
    label: t("asLabel").replace("{name}", postAsDisplayName.value),
    icon: showPostAsDialogVisible.value
      ? "pi pi-chevron-up"
      : canChangePostAs.value
        ? "pi pi-chevron-down"
        : "",
    isVisible: isLoggedIn.value,
    clickHandler: showAsDialog,
    clickable: canChangePostAs.value,
  },
  {
    id: "post-type",
    label:
      conversationType.value === "prioritizing"
        ? `${t("typePrioritizing")} · ${comparisonMethod.value === undefined ? "QV" : comparisonMethod.value === "bws" ? "BWS" : typeT("pairwise")}`
        : importSettings.value.importType === "polis-url"
          ? t("importFromPolisUrl")
          : importSettings.value.importType === "csv-import"
            ? t("importFromCsv")
            : t("newConversation"),
    icon: props.isEditMode
      ? ""
      : showPostTypeDialog.value
        ? "pi pi-chevron-up"
        : "pi pi-chevron-down",
    isVisible: true,
    clickHandler: togglePostTypeDialog,
    clickable: !props.isEditMode,
  },
  {
    id: "visibility",
    label: isPrivate.value ? t("private") : t("public"),
    icon: showVisibilityDialog.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: true,
    clickHandler: toggleVisibility,
    clickable: true,
  },
  {
    id: "voting-presentation",
    label: tVotingPresentation(
      votingPresentation.value === "list" ? "list" : "oneAtATime"
    ),
    icon: showVotingPresentationDialog.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible:
      supportsOpinionGroupAnalysis.value &&
      importSettings.value.importType === null,
    clickHandler: () => {
      showVotingPresentationDialog.value = true;
    },
    clickable: true,
  },
  {
    id: "ai-labeling",
    label: aiLabelingEnabled.value ? t("aiOn") : t("aiOff"),
    icon: showAiLabelingDialog.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: supportsOpinionGroupAnalysis.value,
    clickHandler: toggleAiLabeling,
    clickable: true,
  },
  {
    id: "analysis-preference",
    label: analysisPreferenceLabel.value,
    icon: showAnalysisPreferenceDialog.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: supportsOpinionGroupAnalysis.value,
    clickHandler: toggleAnalysisPreference,
    clickable: true,
  },
  {
    id: "login-requirement",
    label:
      participationMode.value === "account_required"
        ? t("requiresAccount")
        : participationMode.value === "strong_verification"
          ? t("requiresLogin")
          : participationMode.value === "email_verification"
            ? t("requiresEmailVerification")
            : t("guestParticipation"),
    icon: showLoginRequirementDialog.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: true,
    clickHandler: toggleLoginRequirement,
    clickable: true,
  },
  {
    id: "language-setting",
    label: languageSettingLabel.value,
    icon: showLanguageSettingDialog.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: !props.hideLanguageSetting,
    clickHandler: toggleLanguageSetting,
    clickable: true,
  },
]);

const visibleControlButtons = computed(() =>
  controlButtons.value.filter((button) => button.isVisible && button.clickable)
);

const extraControlsInsertionIndex = computed(() => {
  const loginRequirementIndex = visibleControlButtons.value.findIndex(
    (button) => button.id === "login-requirement"
  );
  return loginRequirementIndex === -1
    ? visibleControlButtons.value.length
    : loginRequirementIndex + 1;
});

const visibleControlButtonsBeforeExtra = computed(() =>
  visibleControlButtons.value.slice(0, extraControlsInsertionIndex.value)
);

const visibleControlButtonsAfterExtra = computed(() =>
  visibleControlButtons.value.slice(extraControlsInsertionIndex.value)
);
</script>

<style scoped lang="scss">
.control-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
</style>
