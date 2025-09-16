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
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNavigationStore } from "src/stores/navigation";
import { useUserStore } from "src/stores/user";
import ZKIconButton from "src/components/ui-library/ZKIconButton.vue";
import UserAvatar from "src/components/account/UserAvatar.vue";

const isCapacitor = process.env.MODE == "capacitor";
const { profileData } = storeToRefs(useUserStore());
const { showMobileDrawer, drawerBehavior } = storeToRefs(useNavigationStore());
const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());

const shouldShowMenuButton = computed(() => {
  return !isCapacitor && drawerBehavior.value === "mobile";
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
