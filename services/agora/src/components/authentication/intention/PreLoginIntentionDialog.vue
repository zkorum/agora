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
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useZupassVerification } from "src/composables/zupass/useZupassVerification";
import type { EventSlug, ParticipationMode } from "src/shared/types/zod";
import type { PossibleIntentions } from "src/stores/loginIntention";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
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
  needsAuth?: boolean;
  participationMode?: ParticipationMode;
}>();

const showDialog = defineModel<boolean>({ required: true });

const { t } = useComponentI18n<PreLoginIntentionDialogTranslations>(
  preLoginIntentionDialogTranslations
);

const { setActiveUserIntention } = useLoginIntentionStore();

const flowStore = onboardingFlowStore();

const { isVerifying: isVerifyingZupass } = useZupassVerification();

function getSubMessage(): string {
  switch (props.activeIntention) {
    case "none":
      return "";
    case "newOpinion":
      return t("subMessageStatementDraft");
    case "newConversation":
      return t("subMessageConversationDraft");
    case "agreement":
      return t("subMessageReturnToStatement");
    case "reportUserContent":
      return t("subMessageReportRequired");
    case "voting":
      return t("subMessageReturnToConversation");
    case "settings":
      return "";
    default:
      return "";
  }
}

const subMessage = ref(getSubMessage());

const router = useRouter();

function hasCredentialUpgradeMode(): boolean {
  return (
    props.needsAuth === true &&
    props.participationMode !== undefined &&
    props.participationMode !== "guest"
  );
}

function getTitle(): string {
  const hasZupassRequirement = props.requiresZupassEventSlug !== undefined;

  if (hasCredentialUpgradeMode()) {
    if (props.participationMode === "account_required") {
      return t("titleAccountRequired");
    }
    if (props.participationMode === "email_verification") {
      return t("titleEmailRequired");
    }
    return t("titleStrongRequired");
  }

  if (hasZupassRequirement && !props.needsAuth) {
    return t("titleZupassOnly");
  }

  return t("title");
}

function getMessage(): string {
  const hasZupassRequirement = props.requiresZupassEventSlug !== undefined;

  if (hasCredentialUpgradeMode()) {
    if (props.participationMode === "account_required") {
      return t("messageAccountRequired");
    }
    if (props.participationMode === "email_verification") {
      return t("messageEmailRequired");
    }
    return t("messageStrongRequired");
  }

  if (hasZupassRequirement && props.needsAuth) {
    return t("messageBothRequired");
  } else if (hasZupassRequirement && !props.needsAuth) {
    return t("messageZupassOnly");
  }

  return t("message");
}

function getLabelOk(): string {
  const hasZupassRequirement = props.requiresZupassEventSlug !== undefined;

  if (hasCredentialUpgradeMode()) {
    if (props.participationMode === "account_required") {
      return t("labelOkAccount");
    }
    if (props.participationMode === "email_verification") {
      return t("labelOkEmail");
    }
    return t("labelOkStrong");
  }

  if (hasZupassRequirement && !props.needsAuth) {
    return t("labelOkZupass");
  }

  return t("labelOk");
}

async function okButtonClicked() {
  const hasZupassRequirement = props.requiresZupassEventSlug !== undefined;

  if (props.needsAuth) {
    props.okCallback();
    setActiveUserIntention(props.activeIntention);

    if (props.participationMode === "account_required") {
      flowStore.credentialUpgradeTarget = "any";
      flowStore.onboardingMode = "LOGIN";
      await router.push({ name: "/verify/any/" });
    } else if (props.participationMode === "email_verification") {
      flowStore.credentialUpgradeTarget = "email";
      flowStore.onboardingMode = "LOGIN";
      await router.push({ name: "/verify/email/" });
    } else if (props.participationMode === "strong_verification") {
      flowStore.credentialUpgradeTarget = "strong";
      flowStore.onboardingMode = "LOGIN";
      await router.push({ name: "/verify/identity/" });
    } else {
      await router.push({ name: "/welcome/" });
    }
  } else if (hasZupassRequirement) {
    props.okCallback();
  } else {
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
