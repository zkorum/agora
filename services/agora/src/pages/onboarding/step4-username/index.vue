<template>
  <OnboardingLayout>
    <template #body><DefaultImageExample /> </template>

    <template #footer>
      <StepperLayout
        :submit-call-back="goToNextRoute"
        :current-step="4"
        :total-steps="5"
        :enable-next-button="isValidUsername"
        :show-next-button="true"
        :show-loading-button="isSubmitButtonLoading"
      >
        <template #header>
          <InfoHeader
            :title="t('title')"
            description=""
            icon-name="mdi-account-circle"
          />
        </template>

        <template #body>
          <div class="container">
            <div>{{ t("howToAppear") }}</div>

            <UsernameChange
              :show-submit-button="false"
              @is-valid-username="(value: boolean) => (isValidUsername = value)"
              @user-name="(value: string) => (userName = value)"
            />
          </div>
        </template>
      </StepperLayout>
    </template>
  </OnboardingLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import UsernameChange from "src/components/account/UsernameChange.vue";
import DefaultImageExample from "src/components/onboarding/backgrounds/DefaultImageExample.vue";
import StepperLayout from "src/components/onboarding/layouts/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/ui/InfoHeader.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import OnboardingLayout from "src/layouts/OnboardingLayout.vue";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useUserStore } from "src/stores/user";
import { useBackendAccountApi } from "src/utils/api/account";
import { useNotify } from "src/utils/ui/notify";
import { ref } from "vue";

import {
  type Step4UsernameTranslations,
  step4UsernameTranslations,
} from "./index.i18n";

const { t } = useComponentI18n<Step4UsernameTranslations>(
  step4UsernameTranslations
);

const { submitUsernameChange } = useBackendAccountApi();
const { routeUserAfterLogin } = useLoginIntentionStore();

const isValidUsername = ref(true);
const userName = ref("");

const { profileData } = storeToRefs(useUserStore());

const { showNotifyMessage } = useNotify();

const isSubmitButtonLoading = ref(false);

async function goToNextRoute() {
  isSubmitButtonLoading.value = true;
  const response = await submitUsernameChange(
    userName.value,
    profileData.value.userName
  );
  if (response.status == "success") {
    await routeUserAfterLogin();
  } else {
    showNotifyMessage(t("usernameInUse"));
  }
  isSubmitButtonLoading.value = false;
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
