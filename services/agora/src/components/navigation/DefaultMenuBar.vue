<template>
  <TopMenuWrapper :reveal="true">
    <div class="menuButtons">
      <ZKButton
        v-if="!hasCloseButton"
        icon="mdi-menu"
        color="black"
        flat
        @click="menuButtonClicked()"
      />

      <BackButton v-if="hasBackButton" />

      <CloseButton v-if="hasCloseButton" />
    </div>

    <div class="menuButtons">
      <RouterLink
        v-if="hasLoginButton && !isAuthenticated && showAuthButton"
        :to="{ name: '/welcome/' }"
      >
        <ZKButton label="Log in" text-color="white" color="warning" />
      </RouterLink>
    </div>
  </TopMenuWrapper>
</template>

<script setup lang="ts">
import ZKButton from "../ui-library/ZKButton.vue";
import BackButton from "./buttons/BackButton.vue";
import { type DefaultMenuBarProps } from "src/utils/model/props";
import TopMenuWrapper from "./TopMenuWrapper.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { onMounted, ref } from "vue";
import CloseButton from "./buttons/CloseButton.vue";
import { storeToRefs } from "pinia";
import { useNavigationStore } from "src/stores/navigation";

const { showDrawer } = storeToRefs(useNavigationStore());

defineProps<DefaultMenuBarProps>();

const { isAuthenticated } = storeToRefs(useAuthenticationStore());

const showAuthButton = ref(false);

onMounted(() => {
  setTimeout(function () {
    showAuthButton.value = true;
  }, 50);
});

function menuButtonClicked() {
  showDrawer.value = !showDrawer.value;
}
</script>

<style scoped style="scss">
.menuButtons {
  display: flex;
  gap: 0.8rem;
}
</style>
