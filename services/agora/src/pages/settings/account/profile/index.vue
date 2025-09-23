<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: true,
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
      reducedWidth: true,
    }"
  >
    <template #header>
      <StandardMenuBar :title="t('pageTitle')" :center-content="true" />
    </template>

    <div class="container">
      <ZKCard padding="1rem" class="cardBackground">
        <div class="titleStyle">{{ t("changeUsernameTitle") }}</div>

        <UsernameChange v-if="isAuthInitialized" :show-submit-button="true" />
      </ZKCard>
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import UsernameChange from "src/components/account/UsernameChange.vue";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import {
  profileSettingsTranslations,
  type ProfileSettingsTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<ProfileSettingsTranslations>(
  profileSettingsTranslations
);

const { isAuthInitialized } = storeToRefs(useAuthenticationStore());
</script>

<style scoped lang="scss">
.titleStyle {
  font-size: 1.1rem;
  font-weight: var(--font-weight-medium);
  padding-bottom: 1rem;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 2rem;
}

.cardBackground {
  background-color: white;
}
</style>
