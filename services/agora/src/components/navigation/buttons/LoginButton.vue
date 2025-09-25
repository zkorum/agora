<template>
  <RouterLink v-if="shouldShowLogin" :to="{ name: '/welcome/' }">
    <ZKButton
      button-type="largeButton"
      :label="t('logIn')"
      text-color="white"
      color="primary"
    />
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  defaultMenuBarTranslations,
  type DefaultMenuBarTranslations,
} from "src/components/navigation/header/DefaultMenuBar.i18n";

const { isLoggedIn, isAuthInitialized } = storeToRefs(useAuthenticationStore());
const { t } = useComponentI18n<DefaultMenuBarTranslations>(
  defaultMenuBarTranslations
);

const shouldShowLogin = computed(() => {
  return isAuthInitialized.value && !isLoggedIn.value;
});
</script>
