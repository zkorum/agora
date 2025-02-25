<template>
  <TopMenuWrapper :reveal="true">
    <div class="minContainerSize">
      <BackButton v-if="hasBackButton" />
      <CloseButton v-if="hasCloseButton" />
      <slot name="left"></slot>
    </div>
    <div class="minContainerSize">
      <slot name="middle"></slot>
    </div>
    <div class="minContainerSize">
      <RouterLink
        v-if="hasLoginButton && !isAuthenticated && showAuthButton"
        :to="{ name: '/welcome/' }"
      >
        <ZKButton label="Log in" text-color="white" color="primary" />
      </RouterLink>

      <slot name="right"></slot>
    </div>
  </TopMenuWrapper>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import BackButton from "../buttons/BackButton.vue";
import { type DefaultMenuBarProps } from "src/utils/model/props";
import TopMenuWrapper from "../TopMenuWrapper.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { onMounted, ref } from "vue";
import CloseButton from "../buttons/CloseButton.vue";
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
.minContainerSize {
  min-width: 5rem;
}
</style>
