<template>
  <div class="control-bar">
    <DynamicProfileImage
      :user-identity="postAsDisplayName"
      :size="35"
      :organization-image-url="selectedOrganizationImageUrl"
    />

    <ConversationControlButton
      v-for="button in visibleControlButtons"
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
    @mode-change-requested="handleImportModeChangeRequest"
  />

  <ModeChangeConfirmationDialog
    v-model="showImportModeChangeConfirmation"
    :has-title="hasTitle"
    :has-body="hasBody"
    :has-poll="hasPoll"
    @confirm="handleModeChangeConfirm"
    @cancel="handleModeChangeCancel"
  />

  <VisibilityOptionsDialog
    v-model:show-dialog="showVisibilityDialog"
    v-model:is-private="isPrivate"
    v-model:requires-login="requiresLogin"
    v-model:requires-event-ticket="requiresEventTicket"
  />

  <LoginRequirementDialog
    v-model:show-dialog="showLoginRequirementDialog"
    v-model:requires-login="requiresLogin"
    v-model:is-private="isPrivate"
    v-model:requires-event-ticket="requiresEventTicket"
  />

  <MakePublicTimerDialog
    v-model:show-dialog="showMakePublicDialog"
    v-model:private-conversation-settings="privateConversationSettings"
  />

  <EventTicketRequirementDialog
    v-model:show-dialog="showEventTicketRequirementDialog"
    v-model:requires-event-ticket="requiresEventTicket"
    v-model:requires-login="requiresLogin"
    v-model:is-private="isPrivate"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import DynamicProfileImage from "src/components/account/DynamicProfileImage.vue";
import ConversationControlButton from "src/components/newConversation/ConversationControlButton.vue";
import EventTicketRequirementDialog from "src/components/newConversation/dialog/EventTicketRequirementDialog.vue";
import LoginRequirementDialog from "src/components/newConversation/dialog/LoginRequirementDialog.vue";
import MakePublicTimerDialog from "src/components/newConversation/dialog/MakePublicTimerDialog.vue";
import ModeChangeConfirmationDialog from "src/components/newConversation/dialog/ModeChangeConfirmationDialog.vue";
import PostAsAccountDialog from "src/components/newConversation/dialog/PostAsAccountDialog.vue";
import VisibilityOptionsDialog from "src/components/newConversation/dialog/VisibilityOptionsDialog.vue";
import {
  type ConversationImportSettings,
  hasContentThatWouldBeCleared,
  type PostAsSettings,
  type PrivateConversationSettings,
} from "src/composables/conversation/draft";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { EventSlug } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useUserStore } from "src/stores/user";
import { processEnv } from "src/utils/processEnv";
import { computed, ref } from "vue";

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
}

const props = defineProps<Props>();

const { t } = useComponentI18n<NewConversationControlBarTranslations>(
  newConversationControlBarTranslations
);

const { isLoggedIn } = storeToRefs(useAuthenticationStore());
const { profileData } = storeToRefs(useUserStore());

// Define models for two-way binding
const pollEnabled = defineModel<boolean>("pollEnabled", { required: true });
const isPrivate = defineModel<boolean>("isPrivate", { required: true });
const requiresLogin = defineModel<boolean>("requiresLogin", { required: true });
const requiresEventTicket = defineModel<EventSlug | undefined>(
  "requiresEventTicket",
  { required: true }
);
const privateConversationSettings = defineModel<PrivateConversationSettings>(
  "privateConversationSettings",
  {
    required: true,
  }
);
const postAs = defineModel<PostAsSettings>("postAs", { required: true });
const importSettings = defineModel<ConversationImportSettings>(
  "importSettings",
  { required: true }
);

// For checking if there's content that would be cleared (parent needs to provide these)
const title = defineModel<string>("title", { required: true });
const content = defineModel<string>("content", { required: true });
const pollOptions = defineModel<string[]>("pollOptions", { required: true });

const postAsDisplayName = computed(() => {
  if (postAs.value.postAsOrganization) {
    return postAs.value.organizationName;
  } else {
    return profileData.value.userName;
  }
});

const selectedOrganizationImageUrl = computed(() => {
  if (postAs.value.postAsOrganization) {
    const selectedOrg = profileData.value.organizationList.find(
      (org) => org.name === postAs.value.organizationName
    );
    return selectedOrg?.imageUrl || "";
  }
  return "";
});

const showPostAsDialogVisible = ref(false);
const showPostTypeDialog = ref(false);
const showVisibilityDialog = ref(false);
const showMakePublicDialog = ref(false);
const showLoginRequirementDialog = ref(false);
const showEventTicketRequirementDialog = ref(false);

const showImportModeChangeConfirmation = ref(false);
const hasPendingImportModeChange = ref<"polis-url" | "csv-import" | null>(null);

const showAsDialog = (): void => {
  showPostAsDialogVisible.value = true;
};

// Computed properties to determine what content would be cleared
const hasTitle = computed(() => title.value.trim() !== "");
const hasBody = computed(() => content.value.trim() !== "");
const hasPoll = computed(
  () => pollEnabled.value && pollOptions.value.some((opt) => opt.trim() !== "")
);

/**
 * Checks if switching import type would clear content
 * Uses shared utility function with current form values
 */
function checkHasContentThatWouldBeCleared(): boolean {
  return hasContentThatWouldBeCleared(
    title.value,
    content.value,
    pollEnabled.value,
    pollOptions.value
  );
}

const handleImportModeChangeRequest = (
  newImportType: "polis-url" | "csv-import" | null
): void => {
  const currentType = importSettings.value.importType;

  // If switching from manual to import type and might have content, show confirmation
  if (
    currentType === null &&
    newImportType !== null &&
    checkHasContentThatWouldBeCleared()
  ) {
    hasPendingImportModeChange.value = newImportType;
    showImportModeChangeConfirmation.value = true;
  } else {
    // Directly apply the change
    setImportTypeWithClearing(newImportType);
  }
};

const handleModeChangeConfirm = (): void => {
  setImportTypeWithClearing(hasPendingImportModeChange.value);
  showImportModeChangeConfirmation.value = false;
};

const handleModeChangeCancel = (): void => {
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

const togglePolling = (): void => {
  pollEnabled.value = !pollEnabled.value;
};

const toggleVisibility = (): void => {
  showVisibilityDialog.value = true;
};

const toggleLoginRequirement = (): void => {
  showLoginRequirementDialog.value = true;
};

const toggleMakePublicTimer = (): void => {
  showMakePublicDialog.value = true;
};

const toggleEventTicketRequirement = (): void => {
  showEventTicketRequirementDialog.value = true;
};

const getMakePublicLabel = (): string => {
  if (!privateConversationSettings.value.hasScheduledConversion) {
    return t("makePublicNever");
  }

  const targetDate = privateConversationSettings.value.conversionDate;

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const formattedDate = formatter.format(targetDate);

  return t("makePublic").replace("{date}", formattedDate);
};

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
      importSettings.value.importType === "polis-url"
        ? t("importFromPolisUrl")
        : importSettings.value.importType === "csv-import"
          ? t("importFromCsv")
          : t("newConversation"),
    icon: showPostTypeDialog.value ? "pi pi-chevron-up" : "pi pi-chevron-down",
    isVisible:
      !props.isEditMode &&
      (processEnv.VITE_IS_ORG_IMPORT_ONLY === "true"
        ? postAs.value.postAsOrganization
        : true),
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
    id: "login-requirement",
    label: requiresLogin.value ? t("requiresLogin") : t("guestParticipation"),
    icon: showLoginRequirementDialog.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: true,
    clickHandler: toggleLoginRequirement,
    clickable: true,
  },
  {
    id: "make-public-timer",
    label: getMakePublicLabel(),
    icon: showMakePublicDialog.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: isPrivate.value,
    clickHandler: toggleMakePublicTimer,
    clickable: true,
  },
  {
    id: "event-ticket-requirement",
    label: getEventTicketLabel(),
    icon: showEventTicketRequirementDialog.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: true,
    clickHandler: toggleEventTicketRequirement,
    clickable: true,
  },
  {
    id: "polling",
    label: pollEnabled.value ? t("removePoll") : t("addPoll"),
    icon: pollEnabled.value ? "pi pi-minus" : "pi pi-plus",
    isVisible: importSettings.value.importType === null,
    clickHandler: togglePolling,
    clickable: true,
  },
]);

const visibleControlButtons = computed(() =>
  controlButtons.value.filter((button) => button.isVisible)
);
</script>

<style scoped lang="scss">
.control-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
</style>
