<template>
  <div
    class="container"
    :style="{ backgroundImage: 'url(' + welcomeBackgroundImagePath + ')' }"
  >
    <img :src="brandImagePath" class="welcomeImage" />
    <div v-if="!isLoggedIn" class="buttonFlex">
      <ZKGradientButton label="Sign Up" @click="gotoNextRoute(false)" />

      <ZKGradientButton
        label="Log In"
        gradient-background="#ffffff"
        label-color="#6b4eff"
        @click="gotoNextRoute(true)"
      />

      <ZKGradientButton
        label="Skip Authentication"
        gradient-background="#f1eeff"
        label-color="#000000"
        @click="skipAuthentication()"
      />
    </div>

    <div v-if="isLoggedIn" class="buttonFlex">
      <ZKGradientButton label="Launch App" @click="skipAuthentication()" />

      <ZKGradientButton
        label="Log Out"
        gradient-background="#80cbc4"
        label-color="#000000"
        @click="logoutRequested(true)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ZKGradientButton from "src/components/ui-library/ZKGradientButton.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useAuthSetup } from "src/utils/auth/setup";
import { useRouter } from "vue-router";

const router = useRouter();

const brandImagePath =
  process.env.VITE_PUBLIC_DIR + "/images/onboarding/brand.webp";

const welcomeBackgroundImagePath =
  process.env.VITE_PUBLIC_DIR + "/images/onboarding/background.webp";

const { onboardingMode } = storeToRefs(onboardingFlowStore());

const { isLoggedIn } = storeToRefs(useAuthenticationStore());

const { logoutRequested } = useAuthSetup();

const loginIntentionStore = useLoginIntentionStore();

async function skipAuthentication() {
  // Check if user came from an embed view and should be returned there
  const hasEmbedIntention = checkForActiveEmbedIntention();

  if (hasEmbedIntention.hasIntention && hasEmbedIntention.conversationSlugId) {
    await router.push({
      name: "/conversation/[postSlugId].embed",
      params: { postSlugId: hasEmbedIntention.conversationSlugId },
      ...(hasEmbedIntention.opinionSlugId && {
        query: { opinion: hasEmbedIntention.opinionSlugId },
      }),
    });
  } else {
    await router.push({ name: "/" });
  }
}

function checkForActiveEmbedIntention(): {
  hasIntention: boolean;
  conversationSlugId?: string;
  opinionSlugId?: string;
} {
  // Check voting intention
  const votingIntention = loginIntentionStore.getCurrentVotingIntention();
  if (votingIntention.enabled && votingIntention.isEmbedView) {
    return {
      hasIntention: true,
      conversationSlugId: votingIntention.conversationSlugId,
    };
  }

  // Check opinion agreement intention
  const agreementIntention =
    loginIntentionStore.getCurrentOpinionAgreementIntention();
  if (agreementIntention.enabled && agreementIntention.isEmbedView) {
    return {
      hasIntention: true,
      conversationSlugId: agreementIntention.conversationSlugId,
      opinionSlugId: agreementIntention.opinionSlugId,
    };
  }

  // Check report user content intention
  const reportIntention =
    loginIntentionStore.getCurrentReportUserContentIntention();
  if (reportIntention.enabled && reportIntention.isEmbedView) {
    return {
      hasIntention: true,
      conversationSlugId: reportIntention.conversationSlugId,
      opinionSlugId: reportIntention.opinionSlugId,
    };
  }

  return { hasIntention: false };
}

async function gotoNextRoute(isLogin: boolean) {
  if (isLogin) {
    onboardingMode.value = "LOGIN";
    await router.push({ name: "/onboarding/step1-login/" });
  } else {
    onboardingMode.value = "SIGNUP";
    await router.push({ name: "/onboarding/step1-signup/" });
  }
}
</script>

<style scoped>
.buttonFlex {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: min(15rem, 100%);
}

.welcomeImage {
  width: min(15rem, 100%);
}

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3rem;
  height: 100dvh;
  background-size: cover;
}
</style>
