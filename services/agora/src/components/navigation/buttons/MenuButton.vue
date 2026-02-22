<template>
  <div v-if="shouldShowMenuButton">
    <UserAvatar
      v-if="isGuestOrLoggedIn"
      class="menu-button-hover"
      :size="40"
      :user-identity="profileData.userName"
      @click="toggleMobileDrawer"
    />
    <ZKIconButton
      v-else
      icon="mdi-menu"
      icon-color="black"
      @click="toggleMobileDrawer"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import UserAvatar from "src/components/account/UserAvatar.vue";
import ZKIconButton from "src/components/ui-library/ZKIconButton.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNavigationStore } from "src/stores/navigation";
import { useUserStore } from "src/stores/user";
import { computed } from "vue";

const { profileData } = storeToRefs(useUserStore());
const { showMobileDrawer, drawerBehavior } = storeToRefs(useNavigationStore());
const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());

const shouldShowMenuButton = computed(() => {
  return drawerBehavior.value === "mobile";
});

function toggleMobileDrawer(): void {
  showMobileDrawer.value = !showMobileDrawer.value;
}
</script>

<style scoped lang="scss">
.menu-button-hover:hover {
  cursor: pointer;
}
</style>
