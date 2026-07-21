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
      :class="{ 'cursor-pointer': button.clickable }"
      :aria-label="button.label"
      @click="button.clickHandler"
    />
  </div>

  <PostAsAccountDialog
    v-model="showPostAsDialogVisible"
    v-model:post-as="postAs"
  />

  <PostTypeDialog
    v-model="showPostTypeDialog"
    v-model:import-settings="importSettings"
    v-model:conversation-type-config="conversationTypeConfig"
    :is-max-diff-allowed="isMaxDiffAllowed"
    :is-import-allowed="isImportAllowed"
    @mode-change-requested="handleModeChangeRequest"
  />

  <MaxDiffSourceDialog
    v-model="showMaxDiffSourceDialog"
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
    v-model:show-dialog="showAiLabelingDialog"
    v-model:ai-labeling-enabled="aiLabelingEnabled"
  />

  <AnalysisPreferenceDialog
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

  <EventTicketRequirementDialog
    v-model:show-dialog="showEventTicketRequirementDialog"
    v-model:requires-event-ticket="requiresEventTicket"
    :can-add-event-ticket="canAddEventTicket"
    :can-change-event-ticket="canChangeEventTicket"
    :can-remove-event-ticket="canRemoveEventTicket"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import DynamicProfileImage from "src/components/account/DynamicProfileImage.vue";
import ConversationControlButton from "src/components/newConversation/ConversationControlButton.vue";
import AiLabelingOptionsDialog from "src/components/newConversation/dialog/AiLabelingOptionsDialog.vue";
import AnalysisPreferenceDialog from "src/components/newConversation/dialog/AnalysisPreferenceDialog.vue";
import ConversationLanguageSettingDialog from "src/components/newConversation/dialog/ConversationLanguageSettingDialog.vue";
import EventTicketRequirementDialog from "src/components/newConversation/dialog/EventTicketRequirementDialog.vue";
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
  EventSlug,
  ExternalSourceConfig,
  ParticipationMode,
  PreferredOpinionGroupCount,
} from "src/shared/types/zod";
import {
  checkFeatureAccess,
  DEFAULT_FEATURE_ALLOWED_ORGS,
  DEFAULT_FEATURE_ALLOWED_USERS,
} from "src/shared-app-api/featureAccess";
import {
  DEFAULT_MAXDIFF_GITHUB_ALLOWED_ORGS,
  DEFAULT_MAXDIFF_GITHUB_ALLOWED_USERS,
} from "src/shared-app-api/maxdiffLogic";
import { useAuthenticationStore } from "src/stores/authentication";
import { useUserStore } from "src/stores/user";
import { usePremiumFeatureApi } from "src/utils/api/premiumFeature";
import { processEnv } from "src/utils/processEnv";
import { computed, ref, watch } from "vue";

import { formatLanguageControlLabel } from "./conversationLanguageControlLabel";
import { getLanguageLabel } from "./dialog/conversationLanguageSettings.utils";
import MaxDiffSourceDialog from "./dialog/MaxDiffSourceDialog.vue";
import PostTypeDialog from "./dialog/PostTypeDialog.vue";
import {
  type NewConversationControlBarTranslations,
  newConversationControlBarTranslations,
} from "./NewConversationControlBar.i18n";

interface ControlButton {
  id: string;
  label: string;
  icon: string;
  isVisible: boolean;
  clickHandler: () => void;
  clickable: boolean;
}

interface Props {
  isEditMode?: boolean;
  canAddEventTicket?: boolean;
  canChangeEventTicket?: boolean;
  canRemoveEventTicket?: boolean;
  canUseAnalysisVariantsPreference?: boolean;
  canUseDynamicTranslation?: boolean;
  detectedLanguageCode?: SupportedDisplayLanguageCodes | null;
  detectedSourceLanguageCode?: SupportedSpokenLanguageCodes | null;
  detectedRawLanguageCode?: string | null;
  autoDetectionStatus?: AutoLanguageDetectionStatus;
  hideLanguageSetting?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  canAddEventTicket: true,
  canChangeEventTicket: true,
  canRemoveEventTicket: true,
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

const { isLoggedIn, userId } = storeToRefs(useAuthenticationStore());
const { profileData } = storeToRefs(useUserStore());

// Define models for two-way binding
const isPrivate = defineModel<boolean>("isPrivate", { required: true });
const participationMode = defineModel<ParticipationMode>("participationMode", {
  required: true,
});
const requiresEventTicket = defineModel<EventSlug | undefined>(
  "requiresEventTicket",
  { required: true }
);
const postAs = defineModel<PostAsSettings>("postAs", { required: true });
const conversationTypeConfig = defineModel<ConversationTypeConfig>(
  "conversationTypeConfig",
  { required: true }
);
const conversationType = computed(
  () => conversationTypeConfig.value.conversationType
);
const rankingMode = computed(() =>
  conversationTypeConfig.value.conversationType === "ranking"
    ? conversationTypeConfig.value.rankingMode
    : undefined
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
  return !postAs.value.postAsOrganization || selectedOrganizationImageUrl.value !== "";
});

const showPostAsDialogVisible = ref(false);
const showPostTypeDialog = ref(false);
const showVisibilityDialog = ref(false);
const showAiLabelingDialog = ref(false);
const showAnalysisPreferenceDialog = ref(false);
const showLanguageSettingDialog = ref(false);
const showLoginRequirementDialog = ref(false);
const showEventTicketRequirementDialog = ref(false);

const showImportModeChangeConfirmation = ref(false);

const showAsDialog = (): void => {
  showPostAsDialogVisible.value = true;
};

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

const pendingModeChangeConfig = ref<ModeChangeConfig | null>(null);

const handleModeChangeRequest = (config: ModeChangeConfig): void => {
  conversationTypeConfig.value = config.conversationTypeConfig;

  if (
    config.conversationTypeConfig.conversationType === "ranking" &&
    config.conversationTypeConfig.rankingMode === "bws"
  ) {
    // Auto-open source dialog if GitHub is allowed
    if (isMaxDiffGitHubAllowed.value) {
      showMaxDiffSourceDialog.value = true;
    }
  } else {
    // Clear external source config when switching away from maxdiff
    externalSourceConfig.value = null;
  }

  const currentType = importSettings.value.importType;

  // If switching from manual to import type and might have content, show confirmation
  if (
    currentType === null &&
    config.importType !== null &&
    checkHasContentThatWouldBeCleared()
  ) {
    pendingModeChangeConfig.value = config;
    showImportModeChangeConfirmation.value = true;
  } else {
    // Directly apply the change
    setImportTypeWithClearing(config.importType);
  }
};

const handleModeChangeConfirm = (): void => {
  if (pendingModeChangeConfig.value) {
    setImportTypeWithClearing(pendingModeChangeConfig.value.importType);
    pendingModeChangeConfig.value = null;
  }
  showImportModeChangeConfirmation.value = false;
};

const handleModeChangeCancel = (): void => {
  pendingModeChangeConfig.value = null;
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

const toggleEventTicketRequirement = (): void => {
  if (!canOpenEventTicketRequirementDialog.value) {
    return;
  }

  showEventTicketRequirementDialog.value = true;
};

const isMaxDiffAllowed = computed(() => true);

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

const isMaxDiffGitHubAllowed = computed(() => {
  const result = checkFeatureAccess({
    featureEnabled: true,
    isOrgOnly: processEnv.VITE_IS_MAXDIFF_GITHUB_ORG_ONLY === "true",
    allowedOrgs:
      processEnv.VITE_MAXDIFF_GITHUB_ALLOWED_ORGS ??
      DEFAULT_MAXDIFF_GITHUB_ALLOWED_ORGS,
    allowedUsers:
      processEnv.VITE_MAXDIFF_GITHUB_ALLOWED_USERS ??
      DEFAULT_MAXDIFF_GITHUB_ALLOWED_USERS,
    postAsOrganization: postAs.value.postAsOrganization,
    organizationName: postAs.value.organizationName,
    userId: userId.value ?? "",
  });
  return result.allowed;
});

const { checkPremiumFeatureAccess } = usePremiumFeatureApi();
const createModeCanUseAnalysisVariantsPreference = ref<boolean | null>(null);
const createModeCanAddEventTicket = ref<boolean | null>(null);
const createModeCanUseDynamicTranslation = ref<boolean | null>(null);
let createModePremiumAccessRequestId = 0;

const canUseAnalysisVariantsPreference = computed(() => {
  return props.isEditMode
    ? props.canUseAnalysisVariantsPreference
    : createModeCanUseAnalysisVariantsPreference.value === true;
});

const canAddEventTicket = computed(() => {
  return props.isEditMode
    ? props.canAddEventTicket
    : createModeCanAddEventTicket.value === true;
});

const canUseDynamicTranslation = computed(() => {
  return props.isEditMode
    ? props.canUseDynamicTranslation
    : createModeCanUseDynamicTranslation.value === true;
});

const isAnalysisVariantsPreferenceDenied = computed(() => {
  return props.isEditMode
    ? !props.canUseAnalysisVariantsPreference
    : createModeCanUseAnalysisVariantsPreference.value === false;
});

const isDynamicTranslationDenied = computed(() => {
  return props.isEditMode
    ? !props.canUseDynamicTranslation
    : createModeCanUseDynamicTranslation.value === false;
});

const canChangeEventTicket = computed(() => {
  return props.isEditMode
    ? props.canChangeEventTicket
    : canAddEventTicket.value;
});

const canRemoveEventTicket = computed(() => {
  return props.isEditMode ? props.canRemoveEventTicket : true;
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
      createModeCanAddEventTicket.value = false;
      createModeCanUseAnalysisVariantsPreference.value = null;
      createModeCanUseDynamicTranslation.value = null;
      return;
    }

    createModeCanAddEventTicket.value = null;
    createModeCanUseAnalysisVariantsPreference.value = null;
    createModeCanUseDynamicTranslation.value = null;

    try {
      const postAsOrganization = postAs.value.postAsOrganization
        ? postAs.value.organizationName
        : undefined;
      const [
        eventTicketAccess,
        analysisVariantsAccess,
        dynamicTranslationAccess,
      ] = await Promise.all([
        checkPremiumFeatureAccess({
          feature: "event_ticket",
          postAsOrganization,
        }),
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

      createModeCanAddEventTicket.value = eventTicketAccess.hasAccess;
      createModeCanUseAnalysisVariantsPreference.value =
        analysisVariantsAccess.hasAccess;
      createModeCanUseDynamicTranslation.value =
        dynamicTranslationAccess.hasAccess;
    } catch {
      if (requestId !== createModePremiumAccessRequestId) {
        return;
      }

      createModeCanAddEventTicket.value = false;
      createModeCanUseAnalysisVariantsPreference.value = false;
      createModeCanUseDynamicTranslation.value = false;
    }
  },
  { immediate: true }
);

watch(
  () => ({
    isEditMode: props.isEditMode,
    canAddEventTicket: createModeCanAddEventTicket.value,
  }),
  ({ isEditMode, canAddEventTicket }) => {
    if (!isEditMode && canAddEventTicket === false) {
      requiresEventTicket.value = undefined;
    }
  }
);

watch(isAnalysisVariantsPreferenceDenied, (isDenied) => {
  if (isDenied) {
    preferredOpinionGroupCount.value = null;
  }
}, { immediate: true });

watch(isDynamicTranslationDenied, (isDenied) => {
  if (isDenied) {
    multilingualSetting.value = {
      dynamicTranslationEnabled: false,
      additionalLanguageCodes: [],
    };
  }
}, { immediate: true });

const canOpenEventTicketRequirementDialog = computed(() => {
  if (requiresEventTicket.value === undefined) {
    return canAddEventTicket.value;
  }

  return canChangeEventTicket.value || canRemoveEventTicket.value;
});

const showMaxDiffSourceDialog = ref(false);

function handleSourceSelected(config: ExternalSourceConfig | null): void {
  externalSourceConfig.value = config;
}

const getEventTicketLabel = (): string => {
  const eventSlug = requiresEventTicket.value;

  if (eventSlug === undefined) {
    return t("noVerification");
  }

  switch (eventSlug) {
    case "devconnect-2025":
      return t("devconnect2025");
  }
};

const analysisPreferenceLabel = computed(() => {
  return preferredOpinionGroupCount.value === null
    ? t("recommendedDefault")
    : t("groupsLabel", { count: String(preferredOpinionGroupCount.value) });
});

const languageSettingLabel = computed(() => {
  const detectedLanguage =
    props.detectedLanguageCode === null || props.detectedLanguageCode === undefined
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
      : "pi pi-chevron-down",
    isVisible: isLoggedIn.value && !props.isEditMode,
    clickHandler: showAsDialog,
    clickable: true,
  },
  {
    id: "post-type",
    label:
      conversationType.value === "ranking" && rankingMode.value === "bws"
        ? t("typeMaxDiff")
        : importSettings.value.importType === "polis-url"
          ? t("importFromPolisUrl")
          : importSettings.value.importType === "csv-import"
            ? t("importFromCsv")
            : t("newConversation"),
    icon: showPostTypeDialog.value ? "pi pi-chevron-up" : "pi pi-chevron-down",
    isVisible: !props.isEditMode,
    clickHandler: togglePostTypeDialog,
    clickable: true,
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
    id: "ai-labeling",
    label: aiLabelingEnabled.value ? t("aiOn") : t("aiOff"),
    icon: showAiLabelingDialog.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: true,
    clickHandler: toggleAiLabeling,
    clickable: true,
  },
  {
    id: "analysis-preference",
    label: analysisPreferenceLabel.value,
    icon: showAnalysisPreferenceDialog.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: conversationType.value === "polis",
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
  {
    id: "event-ticket-requirement",
    label: getEventTicketLabel(),
    icon: showEventTicketRequirementDialog.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: props.isEditMode
      ? requiresEventTicket.value !== undefined
      : canAddEventTicket.value,
    clickHandler: toggleEventTicketRequirement,
    clickable: canOpenEventTicketRequirementDialog.value,
  },
]);

const visibleControlButtons = computed(() =>
  controlButtons.value.filter((button) => button.isVisible)
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
