<template>
  <div class="control-bar">
    <UserAvatar :user-identity="postAsDisplayName" :size="35" />

    <div @click="showAsDialog()">
      <ControlBarButton
        :label="`As ${postAsDisplayName}`"
        :icon="
          showPostAsDialogVisible ? 'pi pi-chevron-up' : 'pi pi-chevron-down'
        "
      />
    </div>

    <div @click="toggleVisibility()">
      <ControlBarButton
        :label="postDraft.isPrivatePost ? 'Private' : 'Public'"
        :icon="showVisibilityDialog ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
      />
    </div>

    <div>
      <ControlBarButton
        :label="
          postDraft.isLoginRequiredToParticipate
            ? 'Requires login'
            : 'Guest participation'
        "
        :icon="
          showRequireLoginDialog ? 'pi pi-chevron-up' : 'pi pi-chevron-down'
        "
      />
    </div>

    <div>
      <ControlBarButton
        :label="
          postDraft.autoConvertDate
            ? 'Make public: after xxx'
            : 'Make public: Never'
        "
        :icon="showMakePublicDialog ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
      />
    </div>

    <div @click="togglePolling()">
      <ControlBarButton
        :label="postDraft.enablePolling ? 'Remove poll' : 'Add poll'"
        :icon="postDraft.enablePolling ? 'pi pi-minus' : 'pi pi-plus'"
      />
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
</script>

<style scoped lang="scss">
.control-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
</style>
