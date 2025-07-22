<template>
  <div class="control-bar">
    <DynamicProfileImage
      :user-identity="postAsDisplayName"
      :size="35"
      :organization-image-url="selectedOrganizationImageUrl"
    />

    <ZKButton2
      v-for="button in visibleControlButtons"
      :key="button.id"
      :label="button.label"
      :icon="button.icon"
      :class="{ 'cursor-pointer': button.clickable }"
      :aria-label="button.label"
      @click="button.clickHandler"
    />
  </div>

  <PostAsAccountDialog v-model="showPostAsDialogVisible" />

  <PostTypeDialog v-model="showPostTypeDialog" />

  <VisibilityOptionsDialog v-model:show-dialog="showVisibilityDialog" />

  <LoginRequirementDialog v-model:show-dialog="showLoginRequirementDialog" />

  <MakePublicTimerDialog v-model:show-dialog="showMakePublicDialog" />
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useUserStore } from "src/stores/user";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import DynamicProfileImage from "src/components/account/DynamicProfileImage.vue";
import ZKButton2 from "src/components/ui-library/ZKButton2.vue";
import PostAsAccountDialog from "src/components/newConversation/dialog/PostAsAccountDialog.vue";
import PostTypeDialog from "src/components/newConversation/dialog/PostTypeDialog.vue";
import VisibilityOptionsDialog from "src/components/newConversation/dialog/VisibilityOptionsDialog.vue";
import LoginRequirementDialog from "src/components/newConversation/dialog/LoginRequirementDialog.vue";
import MakePublicTimerDialog from "src/components/newConversation/dialog/MakePublicTimerDialog.vue";
import { useAuthenticationStore } from "src/stores/authentication";

interface ControlButton {
  id: string;
  label: string;
  icon: string;
  isVisible: boolean;
  clickHandler: () => void;
  clickable: boolean;
}

const { isLoggedIn } = storeToRefs(useAuthenticationStore());
const { profileData } = storeToRefs(useUserStore());
const { resetPoll } = useNewPostDraftsStore();
const { conversationDraft } = storeToRefs(useNewPostDraftsStore());

const postAsDisplayName = computed(() => {
  if (conversationDraft.value.postAs.postAsOrganization) {
    return conversationDraft.value.postAs.organizationName;
  } else {
    return profileData.value.userName;
  }
});

const selectedOrganizationImageUrl = computed(() => {
  if (conversationDraft.value.postAs.postAsOrganization) {
    const selectedOrg = profileData.value.organizationList.find(
      (org) => org.name === conversationDraft.value.postAs.organizationName
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

const showAsDialog = () => {
  showPostAsDialogVisible.value = true;
};

const togglePostTypeDialog = () => {
  showPostTypeDialog.value = !showPostTypeDialog.value;
};

const togglePolling = () => {
  if (conversationDraft.value.poll.enabled) {
    resetPoll();
  } else {
    conversationDraft.value.poll.enabled = true;
  }
};

const toggleVisibility = () => {
  showVisibilityDialog.value = true;
};

const toggleLoginRequirement = () => {
  showLoginRequirementDialog.value = true;
};

const toggleMakePublicTimer = () => {
  showMakePublicDialog.value = true;
};

const getMakePublicLabel = () => {
  if (
    !conversationDraft.value.privateConversationSettings.hasScheduledConversion
  ) {
    return "Make public: Never";
  }

  const targetDate =
    conversationDraft.value.privateConversationSettings.conversionDate;

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const formattedDate = formatter.format(targetDate);

  return `Make public: ${formattedDate}`;
};

const controlButtons = computed((): ControlButton[] => [
  {
    id: "post-as",
    label: `As ${postAsDisplayName.value}`,
    icon: showPostAsDialogVisible.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: isLoggedIn.value,
    clickHandler: showAsDialog,
    clickable: true,
  },
  {
    id: "post-type",
    label: conversationDraft.value.importSettings.isImportMode
      ? "Import from Polis"
      : "Regular post",
    icon: showPostTypeDialog.value ? "pi pi-chevron-up" : "pi pi-chevron-down",
    isVisible: conversationDraft.value.postAs.postAsOrganization,
    clickHandler: togglePostTypeDialog,
    clickable: true,
  },
  {
    id: "visibility",
    label: conversationDraft.value.isPrivate ? "Private" : "Public",
    icon: showVisibilityDialog.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: true,
    clickHandler: toggleVisibility,
    clickable: true,
  },
  {
    id: "login-requirement",
    label: conversationDraft.value.privateConversationSettings.requiresLogin
      ? "Requires login"
      : "Guest participation",
    icon: showLoginRequirementDialog.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: conversationDraft.value.isPrivate,
    clickHandler: toggleLoginRequirement,
    clickable: true,
  },
  {
    id: "make-public-timer",
    label: getMakePublicLabel(),
    icon: showMakePublicDialog.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: conversationDraft.value.isPrivate,
    clickHandler: toggleMakePublicTimer,
    clickable: true,
  },
  {
    id: "polling",
    label: conversationDraft.value.poll.enabled ? "Remove poll" : "Add poll",
    icon: conversationDraft.value.poll.enabled ? "pi pi-minus" : "pi pi-plus",
    isVisible: true,
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
