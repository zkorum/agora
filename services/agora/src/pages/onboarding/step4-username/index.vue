<template>
  <div>
    <StepperLayout
      :submit-call-back="goToNextRoute"
      :current-step="4"
      :total-steps="5"
      :enable-next-button="isValidUsername"
      :show-next-button="true"
    >
      <template #header>
        <InfoHeader
          title="Choose your username"
          description=""
          icon-name="mdi-account-circle"
        />
      </template>

      <template #body>
        <div class="container">
          <div>How do you want to appear in Agora?</div>

          <UsernameChange
            :show-submit-button="false"
            @is-valid-username="(value) => (isValidUsername = value)"
            @user-name="(value) => (userName = value)"
          />
        </div>
      </template>
    </StepperLayout>
  </div>
</template>

<script setup lang="ts">
import StepperLayout from "src/components/onboarding/StepperLayout.vue";
import InfoHeader from "src/components/onboarding/InfoHeader.vue";
import { useRouter } from "vue-router";
import { useBackendAccountApi } from "src/utils/api/account";
import UsernameChange from "src/components/account/UsernameChange.vue";
import { ref } from "vue";
import { useUserStore } from "src/stores/user";
import { storeToRefs } from "pinia";

const { submitUsernameChange } = useBackendAccountApi();

const isValidUsername = ref(true);
const userName = ref("");

const router = useRouter();

const { profileData } = storeToRefs(useUserStore());

async function goToNextRoute() {
  const isSuccessful = await submitUsernameChange(
    userName.value,
    profileData.value.userName
  );
  if (isSuccessful) {
    router.push({ name: "onboarding-step5-preferences" });
  }
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
