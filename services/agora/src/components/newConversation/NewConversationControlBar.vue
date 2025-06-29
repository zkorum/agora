<template>
  <div class="control-bar">
    <UserAvatar
      :key="profileData.userName"
      :user-identity="profileData.userName"
      :size="35"
    />

    <div @click="showAsDialog()">
      <FollowButton
        :label="'As ABC'"
        :variant="''"
        :is-following="true"
        :icon="'pi pi-chevron-down'"
      />
    </div>

    <div @click="toggleVisibility()">
      <FollowButton
        :label="isPrivatePost ? 'Private' : 'Public'"
        :variant="''"
        :is-following="true"
        :icon="showVisibilityDialog ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
      />
    </div>

    <div @click="togglePolling()">
      <FollowButton
        :label="enablePolling ? 'Remove poll' : 'Add poll'"
        :variant="''"
        :is-following="true"
        :icon="enablePolling ? 'pi pi-minus' : 'pi pi-plus'"
      />
    </div>
  </div>

  <q-dialog v-model="showAsDialogVisible" position="bottom">
    <ZKBottomDialogContainer>
      <div class="title-style">Post As:</div>
    </ZKBottomDialogContainer>
  </q-dialog>

  <VisibilityOptionsDialog
    v-model="showVisibilityDialog"
    :is-private-post="isPrivatePost"
    @update:is-private-post="isPrivatePost = $event"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useUserStore } from "src/stores/user";
import UserAvatar from "src/components/account/UserAvatar.vue";
import FollowButton from "src/components/ui-library/buttons/FollowButton.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import VisibilityOptionsDialog from "src/components/newConversation/dialog/VisibilityOptionsDialog.vue";

const enablePolling = defineModel<boolean>("enablePolling", { required: true });
const isPrivatePost = defineModel<boolean>("isPrivatePost", { required: true });

const emit = defineEmits<{
  togglePolling: [];
}>();

const { profileData } = storeToRefs(useUserStore());

const showAsDialogVisible = ref(false);
const showVisibilityDialog = ref(false);

const showAsDialog = () => {
  showAsDialogVisible.value = true;
};

const togglePolling = () => {
  enablePolling.value = !enablePolling.value;
  emit("togglePolling");
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

.title-style {
  font-size: 1.1rem;
  font-weight: 600;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}
</style>
