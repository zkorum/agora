<template>
  <div class="control-bar">
    <UserAvatar :user-identity="postAsDisplayName" :size="35" />

    <div @click="showAsDialog()">
      <FollowButton
        :label="`As ${postAsDisplayName}`"
        :variant="''"
        :is-following="true"
        :icon="'pi pi-chevron-down'"
      />
    </div>

    <div @click="toggleVisibility()">
      <FollowButton
        :label="postDraft.isPrivatePost ? 'Private' : 'Public'"
        :variant="''"
        :is-following="true"
        :icon="showVisibilityDialog ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
      />
    </div>

    <div @click="togglePolling()">
      <FollowButton
        :label="postDraft.enablePolling ? 'Remove poll' : 'Add poll'"
        :variant="''"
        :is-following="true"
        :icon="postDraft.enablePolling ? 'pi pi-minus' : 'pi pi-plus'"
      />
    </div>
  </div>

  <PostAsAccountDialog v-model="showAsDialogVisible" />

  <VisibilityOptionsDialog v-model:show-dialog="showVisibilityDialog" />
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useUserStore } from "src/stores/user";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import UserAvatar from "src/components/account/UserAvatar.vue";
import FollowButton from "src/components/ui-library/buttons/FollowButton.vue";
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

const showAsDialogVisible = ref(false);
const showVisibilityDialog = ref(false);

const showAsDialog = () => {
  showAsDialogVisible.value = true;
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
