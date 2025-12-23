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
import { storeToRefs } from "pinia";
import {
  type DefaultMenuBarTranslations,
  defaultMenuBarTranslations,
} from "src/components/navigation/header/DefaultMenuBar.i18n";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useAuthenticationStore } from "src/stores/authentication";
import { computed } from "vue";

const { isLoggedIn, isAuthInitialized } = storeToRefs(useAuthenticationStore());
const { t } = useComponentI18n<DefaultMenuBarTranslations>(
  defaultMenuBarTranslations
);

const shouldShowLogin = computed(() => {
  return isAuthInitialized.value && !isLoggedIn.value;
});
</script>
