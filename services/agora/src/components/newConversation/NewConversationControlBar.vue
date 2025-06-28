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

    <div @click="showPublicDialog()">
      <FollowButton
        :label="'Public'"
        :variant="''"
        :is-following="true"
        :icon="'pi pi-chevron-down'"
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
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useUserStore } from "src/stores/user";
import UserAvatar from "src/components/account/UserAvatar.vue";
import FollowButton from "src/components/ui-library/buttons/FollowButton.vue";

defineProps<{
  enablePolling: boolean;
}>();

const emit = defineEmits<{
  showAsDialog: [];
  showPublicDialog: [];
  togglePolling: [];
}>();

const { profileData } = storeToRefs(useUserStore());

const showAsDialog = () => {
  emit("showAsDialog");
};

const showPublicDialog = () => {
  emit("showPublicDialog");
};

const togglePolling = () => {
  emit("togglePolling");
};
</script>

<style scoped lang="scss">
.control-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
</style>
