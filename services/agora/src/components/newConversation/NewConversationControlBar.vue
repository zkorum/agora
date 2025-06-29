<template>
  <div class="control-bar">
    <UserAvatar :user-identity="postAsDisplayName" :size="35" />

    <div
      v-for="button in visibleControlButtons"
      :key="button.id"
      :class="{ 'cursor-pointer': button.clickable }"
      @click="button.clickHandler"
    >
      <ControlBarButton :label="button.label" :icon="button.icon" />
    </div>
  </div>

  <PostAsAccountDialog v-model="showPostAsDialogVisible" />

  <VisibilityOptionsDialog v-model:show-dialog="showVisibilityDialog" />
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useUserStore } from "src/stores/user";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import UserAvatar from "src/components/account/UserAvatar.vue";
import ControlBarButton from "src/components/newConversation/dialog/ControlBarButton.vue";
import PostAsAccountDialog from "src/components/newConversation/dialog/PostAsAccountDialog.vue";
import VisibilityOptionsDialog from "src/components/newConversation/dialog/VisibilityOptionsDialog.vue";

interface ControlButton {
  id: string;
  label: string;
  icon: string;
  isVisible: boolean;
  clickHandler: () => void;
  clickable: boolean;
}

const { profileData } = storeToRefs(useUserStore());
const { postDraft } = storeToRefs(useNewPostDraftsStore());

const postAsDisplayName = computed(() => {
  if (postDraft.value.postAsOrganization) {
    if (postDraft.value.selectedOrganization) {
      return postDraft.value.selectedOrganization;
    } else {
      return "UNKNOWN ORGANIZATION";
    }
  } else {
    return profileData.value.userName;
  }
});

const showPostAsDialogVisible = ref(false);
const showVisibilityDialog = ref(false);
const showRequireLoginDialog = ref(false);
const showMakePublicDialog = ref(false);

const showAsDialog = () => {
  showPostAsDialogVisible.value = true;
};

const togglePolling = () => {
  postDraft.value.enablePolling = !postDraft.value.enablePolling;
};

const toggleVisibility = () => {
  showVisibilityDialog.value = true;
};

const controlButtons = computed((): ControlButton[] => [
  {
    id: "post-as",
    label: `As ${postAsDisplayName.value}`,
    icon: showPostAsDialogVisible.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: true,
    clickHandler: showAsDialog,
    clickable: true,
  },
  {
    id: "visibility",
    label: postDraft.value.isPrivatePost ? "Private" : "Public",
    icon: showVisibilityDialog.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: true,
    clickHandler: toggleVisibility,
    clickable: true,
  },
  {
    id: "login-requirement",
    label: postDraft.value.isLoginRequiredToParticipate
      ? "Requires login"
      : "Guest participation",
    icon: showRequireLoginDialog.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: postDraft.value.isPrivatePost,
    clickHandler: () => {
      // TODO: Implement login requirement dialog toggle
    },
    clickable: false,
  },
  {
    id: "make-public",
    label: postDraft.value.autoConvertDate
      ? "Make public: after xxx"
      : "Make public: Never",
    icon: showMakePublicDialog.value
      ? "pi pi-chevron-up"
      : "pi pi-chevron-down",
    isVisible: postDraft.value.isPrivatePost,
    clickHandler: () => {
      // TODO: Implement make public dialog toggle
    },
    clickable: false,
  },
  {
    id: "polling",
    label: postDraft.value.enablePolling ? "Remove poll" : "Add poll",
    icon: postDraft.value.enablePolling ? "pi pi-minus" : "pi pi-plus",
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
