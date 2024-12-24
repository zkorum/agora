<template>
  <TopMenuWrapper :reveal="true">
    <div class="menuButtons">
      <BackButton v-if="hasBackButton" />

      <CloseButton v-if="hasCloseButton" />
    </div>

    <div class="menuButtons">
      <RouterLink
        v-if="hasLoginButton && !isAuthenticated && showAuthButton"
        :to="{ name: 'welcome' }"
      >
        <ZKButton label="Log in" text-color="white" color="warning" />
      </RouterLink>

      <HelpButton />
      <RouterLink :to="{ name: 'settings-page' }">
        <ZKButton
          v-if="hasSettingsButton"
          icon="mdi-cog"
          text-color="color-text-strong"
          flat
        />
      </RouterLink>
    </div>
  </TopMenuWrapper>
</template>

<script setup lang="ts">
import ZKButton from "../ui-library/ZKButton.vue";
import HelpButton from "./buttons/HelpButton.vue";
import BackButton from "./buttons/BackButton.vue";
import { type DefaultMenuBarProps } from "src/utils/model/props";
import TopMenuWrapper from "./TopMenuWrapper.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { onMounted, ref } from "vue";
import CloseButton from "./buttons/CloseButton.vue";
import { storeToRefs } from "pinia";

defineProps<DefaultMenuBarProps>();

const { isAuthenticated } = storeToRefs(useAuthenticationStore());

const showAuthButton = ref(false);

onMounted(() => {
  setTimeout(function () {
    showAuthButton.value = true;
  }, 50);
});
</script>

<style scoped style="scss">
.menuButtons {
  display: flex;
  gap: 0.8rem;
}
</style>
