<template>
  <div>
    <DialogContainer
      v-model="showDialog"
      :title="getTitle()"
      :message="getMessage()"
      :show-cancel-dialog="true"
      :ok-callback="okButtonClicked"
      :cancel-callback="() => {}"
      :label-ok="getLabelOk()"
      :label-cancel="t('labelCancel')"
      :ok-loading="isVerifyingZupass"
    >
      <template #body>
        <div v-if="subMessage" class="shadowBoxStyle">
          <div class="iconAlignment">
            <q-icon name="mdi-information" size="1.2rem" />
          </div>
          <div>
            {{ subMessage }}
          </div>
        </div>
      </template>
    </DialogContainer>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useZupassVerification } from "src/composables/zupass/useZupassVerification";
import type { EventSlug } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import type { PossibleIntentions } from "src/stores/loginIntention";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { ref } from "vue";
import { useRouter } from "vue-router";

import DialogContainer from "./DialogContainer.vue";
import {
  type PreLoginIntentionDialogTranslations,
  preLoginIntentionDialogTranslations,
} from "./PreLoginIntentionDialog.i18n";

const props = defineProps<{
  okCallback: () => void;
  activeIntention: PossibleIntentions;
  requiresZupassEventSlug?: EventSlug;
  loginRequiredToParticipate?: boolean;
}>();

const showDialog = defineModel<boolean>({ required: true });

const { t } = useComponentI18n<PreLoginIntentionDialogTranslations>(
  preLoginIntentionDialogTranslations
);

const authStore = useAuthenticationStore();
const { isLoggedIn } = storeToRefs(authStore);

const { composeLoginIntentionDialogMessage, setActiveUserIntention } =
  useLoginIntentionStore();

const { isVerifying: isVerifyingZupass } = useZupassVerification();

const subMessage = ref(
  composeLoginIntentionDialogMessage(props.activeIntention)
);

const router = useRouter();

function getTitle(): string {
  const hasZupassRequirement = props.requiresZupassEventSlug !== undefined;
  const needsLogin = props.loginRequiredToParticipate === true && !isLoggedIn.value;

  console.log('[PreLoginIntentionDialog] getTitle()', {
    loginRequiredToParticipate: props.loginRequiredToParticipate,
    requiresZupassEventSlug: props.requiresZupassEventSlug,
    isLoggedIn: isLoggedIn.value,
    hasZupassRequirement,
    needsLogin,
  });

  if (hasZupassRequirement && !needsLogin) {
    return t("titleZupassOnly");
  } else {
    return t("title");
  }
}

function getMessage(): string {
  const hasZupassRequirement = props.requiresZupassEventSlug !== undefined;
  const needsLogin = props.loginRequiredToParticipate === true && !isLoggedIn.value;

  console.log('[PreLoginIntentionDialog] getMessage()', {
    loginRequiredToParticipate: props.loginRequiredToParticipate,
    requiresZupassEventSlug: props.requiresZupassEventSlug,
    isLoggedIn: isLoggedIn.value,
    hasZupassRequirement,
    needsLogin,
  });

  if (hasZupassRequirement && needsLogin) {
    return t("messageBothRequired");
  } else if (hasZupassRequirement && !needsLogin) {
    return t("messageZupassOnly");
  } else {
    return t("message");
  }
}

function getLabelOk(): string {
  const hasZupassRequirement = props.requiresZupassEventSlug !== undefined;
  const needsLogin = props.loginRequiredToParticipate === true && !isLoggedIn.value;

  if (hasZupassRequirement && !needsLogin) {
    return t("labelOkZupass");
  } else {
    return t("labelOk");
  }
}

async function okButtonClicked() {
  const hasZupassRequirement = props.requiresZupassEventSlug !== undefined;
  const needsLogin = props.loginRequiredToParticipate === true && !isLoggedIn.value;

  console.log('[PreLoginIntentionDialog] okButtonClicked()', {
    loginRequiredToParticipate: props.loginRequiredToParticipate,
    requiresZupassEventSlug: props.requiresZupassEventSlug,
    isLoggedIn: isLoggedIn.value,
    hasZupassRequirement,
    needsLogin,
    willRouteToWelcome: needsLogin,
    willTriggerInlineVerification: !needsLogin && hasZupassRequirement,
  });

  if (needsLogin) {
    // Need to login first - use existing login flow
    console.log('[PreLoginIntentionDialog] Routing to /welcome/ for login');
    props.okCallback();
    setActiveUserIntention(props.activeIntention);
    await router.push({ name: "/welcome/" });
  } else if (hasZupassRequirement) {
    // Zupass verification needed (either logged in or guest)
    // Trigger the verification flow inline via callback
    console.log('[PreLoginIntentionDialog] Triggering inline Zupass verification');
    props.okCallback();
  } else {
    // Standard login-only flow (no Zupass required)
    console.log('[PreLoginIntentionDialog] Standard login flow');
    props.okCallback();
    setActiveUserIntention(props.activeIntention);
    await router.push({ name: "/welcome/" });
  }
}
</script>

<style scoped lang="scss">
.shadowBoxStyle {
  display: grid;
  grid-template-columns: auto auto;
  grid-template-rows: 1fr;
  gap: 0px 1rem;
  grid-template-areas: ". .";
  padding: 0.5rem;
  color: $primary;
}

.iconAlignment {
  margin: auto;
}
</style>
