<template>
  <q-card flat bordered class="composer-form">
    <q-card-section class="composer-form__heading">
      <div>
        <p>{{ t("composeUpdate") }}</p>
        <h2>{{ t("heading") }}</h2>
      </div>
      <q-icon name="mdi-email-edit-outline" size="1.75rem" />
    </q-card-section>

    <q-separator />

    <q-card-section class="composer-form__fields">
      <ConversationUpdateScopeFields
        v-model:selected-scope-id="selectedScopeId"
        v-model:selected-conversation-ids="selectedConversationIds"
        :scopes="scopes"
        :updates-disabled-conversation-ids="updatesDisabledConversationIds"
        :disabled="!authoringEnabled"
      />

      <q-input :model-value="replyTo" outlined readonly :label="replyToLabel" />

      <ZKInfoBanner
        v-if="readyAudienceEstimate?.eligibleParticipantCount === 0"
        :message="zeroAudienceWarning"
        variant="error"
      />

      <ZKInfoBanner
        v-if="emailReachWarning !== undefined"
        :message="emailReachWarning"
      />

      <q-input
        :model-value="subject"
        outlined
        label-slot
        v-bind="requiredControlAttributes"
        :disable="!authoringEnabled"
        :hint="subjectHint"
        :error="subjectInvalid"
        @update:model-value="updateSubject"
      >
        <template #label>
          <ZKFieldLabel
            :label="t('subjectLabel')"
            required
            :required-text="undefined"
          />
        </template>
      </q-input>

      <div class="composer-form__editor">
        <label :id="messageLabelId">
          <ZKFieldLabel
            :label="t('messageLabel')"
            required
            :required-text="undefined"
          />
        </label>
        <Editor
          v-model="bodyHtml"
          v-model:plain-text="bodyPlainText"
          :show-toolbar="true"
          :placeholder="t('editorPlaceholder')"
          min-height="var(--conversation-update-editor-min-height, 12rem)"
          :disabled="!authoringEnabled"
          :single-line="false"
          :max-length="CONVERSATION_EMAIL_UPDATE_PLAIN_TEXT_MAX_LENGTH"
          :aria-labelledby="messageLabelId"
          :aria-invalid="messageInvalid"
          required
        />
      </div>

      <ZKInfoBanner :message="t('policyWarning')" variant="warning" />

      <ZKCheckbox
        v-model="contentConfirmed"
        :label="t('contentConfirmation')"
        :description="undefined"
        :required="true"
        :disabled="!authoringEnabled"
      />

      <ZKInfoBanner
        v-if="
          readyAudienceEstimate !== undefined &&
          readyAudienceEstimate.ownerCopyCount > 0 &&
          readyAudienceEstimate.eligibleParticipantCount > 0
        "
        :message="ownerCopyMessage"
      />

      <ZKInfoBanner
        v-if="testGuidance !== undefined"
        :message="testGuidance.message"
        :variant="testGuidance.variant"
      />
      <ZKLiveRegion :message="liveStatusMessage" politeness="polite" />
    </q-card-section>

    <slot name="preview" />

    <q-separator />

    <q-card-actions align="right" class="composer-form__actions">
      <ZKButton
        button-type="standardButton"
        outline
        color="primary"
        icon="mdi-email-fast-outline"
        :label="testButtonLabel"
        :loading="testPending"
        :disable="!canTest"
        @click="showTestSendDialog = true"
      />
      <ZKButton
        button-type="standardButton"
        color="primary"
        icon-right="mdi-arrow-right"
        :label="t('reviewAndSend')"
        :loading="sendPending"
        :disable="!canSend"
        @click="emit('send')"
      />
    </q-card-actions>
  </q-card>

  <ZKConfirmDialog
    v-if="testDestinationEmail !== undefined"
    v-model="showTestSendDialog"
    :title="t('testDialogTitle')"
    :confirm-text="t('sendTest')"
    :cancel-text="t('cancel')"
    @confirm="emit('test')"
  >
    <p>
      {{ t("testEmailNotice", { email: testDestinationEmail }) }}
    </p>
  </ZKConfirmDialog>
</template>

<script setup lang="ts">
import ConversationUpdateScopeFields from "src/components/conversationUpdates/ConversationUpdateScopeFields.vue";
import type {
  ConversationUpdateAudienceEstimateState,
  ConversationUpdateScopeSummary,
} from "src/components/conversationUpdates/conversationUpdateTypes";
import Editor from "src/components/editor/Editor.vue";
import { hasConversationUpdatesPartialEmailReach } from "src/components/newConversation/conversationUpdatesParticipation";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKCheckbox from "src/components/ui-library/ZKCheckbox.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import ZKFieldLabel from "src/components/ui-library/ZKFieldLabel.vue";
import ZKInfoBanner from "src/components/ui-library/ZKInfoBanner.vue";
import ZKLiveRegion from "src/components/ui-library/ZKLiveRegion.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { validateRichTextInput } from "src/shared/richText";
import {
  CONVERSATION_EMAIL_UPDATE_PLAIN_TEXT_MAX_LENGTH,
  CONVERSATION_EMAIL_UPDATE_SUBJECT_MAX_LENGTH,
  zodConversationEmailUpdateSubject,
} from "src/shared/types/dto";
import { computed, ref, useId, watch } from "vue";

import {
  type ConversationUpdateComposerFormTranslations,
  conversationUpdateComposerFormTranslations,
} from "./ConversationUpdateComposerForm.i18n";

type TestReadiness =
  | { readonly kind: "authoring-disabled" }
  | { readonly kind: "checking-recipients" }
  | { readonly kind: "estimate-error" }
  | { readonly kind: "incomplete-draft" }
  | { readonly kind: "invalid-draft" }
  | { readonly kind: "no-recipients" }
  | { readonly kind: "pending" }
  | { readonly kind: "ready" };

interface TestGuidance {
  readonly message: string;
  readonly variant: "info" | "warning";
}

const props = defineProps<{
  scopes: readonly ConversationUpdateScopeSummary[];
  updatesDisabledConversationIds: readonly string[];
  testPending: boolean;
  sendPending: boolean;
  hasSuccessfulTest: boolean;
  audienceEstimateState: ConversationUpdateAudienceEstimateState;
  testDestinationEmail: string | undefined;
}>();

const emit = defineEmits<{
  test: [];
  send: [];
}>();

const selectedScopeId = defineModel<string>("selectedScopeId", {
  required: true,
});
const selectedConversationIds = defineModel<readonly string[]>(
  "selectedConversationIds",
  { required: true }
);
const subject = defineModel<string>("subject", { required: true });
const bodyHtml = defineModel<string>("bodyHtml", { required: true });
const bodyPlainText = defineModel<string>("bodyPlainText", { required: true });
const contentConfirmed = defineModel<boolean>("contentConfirmed", {
  required: true,
});
const { locale, t } =
  useComponentI18n<ConversationUpdateComposerFormTranslations>(
    conversationUpdateComposerFormTranslations
  );
const showTestSendDialog = ref(false);
const messageLabelId = `conversation-update-message-${useId()}`;
const requiredControlAttributes = { "aria-required": "true" };
const authoringEnabled = computed(
  () => props.testDestinationEmail !== undefined && !props.sendPending
);
const selectedScope = computed(() =>
  props.scopes.find((scope) => scope.id === selectedScopeId.value)
);
const selectionReady = computed(() => {
  const scope = selectedScope.value;
  if (scope === undefined || selectedConversationIds.value.length === 0) {
    return false;
  }
  if (
    scope.kind === "no-project" &&
    selectedConversationIds.value.length !== 1
  ) {
    return false;
  }
  const availableConversationIds = new Set(
    scope.conversations
      .filter(
        (conversation) =>
          !props.updatesDisabledConversationIds.includes(conversation.id)
      )
      .map((conversation) => conversation.id)
  );
  return selectedConversationIds.value.every((conversationId) =>
    availableConversationIds.has(conversationId)
  );
});
const subjectMissing = computed(() => subject.value.trim() === "");
const messageMissing = computed(() => bodyPlainText.value.trim() === "");
const subjectValid = computed(
  () => zodConversationEmailUpdateSubject.safeParse(subject.value).success
);
const messageValid = computed(
  () =>
    validateRichTextInput({
      htmlString: bodyHtml.value,
      mode: "conversation_email_update",
    }).success
);
const subjectInvalid = computed(
  () => !subjectMissing.value && !subjectValid.value
);
const messageInvalid = computed(
  () => !messageMissing.value && !messageValid.value
);
const testReadiness = computed<TestReadiness>(() => {
  if (!authoringEnabled.value) {
    return { kind: "authoring-disabled" };
  }
  if (props.testPending) {
    return { kind: "pending" };
  }
  if (!selectionReady.value || subjectMissing.value || messageMissing.value) {
    return { kind: "incomplete-draft" };
  }
  if (subjectInvalid.value || messageInvalid.value) {
    return { kind: "invalid-draft" };
  }
  const audienceEstimateState = props.audienceEstimateState;
  switch (audienceEstimateState.kind) {
    case "error":
      return { kind: "estimate-error" };
    case "loading":
      return { kind: "checking-recipients" };
    case "ready":
      return audienceEstimateState.eligibleParticipantCount === 0
        ? { kind: "no-recipients" }
        : { kind: "ready" };
  }
  const unhandledState: never = audienceEstimateState;
  return unhandledState;
});
const canTest = computed(() => testReadiness.value.kind === "ready");
const canSend = computed(
  () =>
    canTest.value &&
    !props.sendPending &&
    props.hasSuccessfulTest &&
    contentConfirmed.value
);
const selectedConversations = computed(() => {
  const selectedIds = new Set(selectedConversationIds.value);
  return (
    selectedScope.value?.conversations.filter((conversation) =>
      selectedIds.has(conversation.id)
    ) ?? []
  );
});
const replyTo = computed(() => selectedScope.value?.contactEmail ?? "");
const replyToLabel = computed(() => {
  const scope = selectedScope.value;
  return scope?.kind === "no-project"
    ? t("replyToConversation")
    : t("replyToProject");
});
const subjectHint = computed(() =>
  t("subjectHint", {
    max: formatNumber(CONVERSATION_EMAIL_UPDATE_SUBJECT_MAX_LENGTH),
  })
);
const readyAudienceEstimate = computed(() =>
  props.audienceEstimateState.kind === "ready"
    ? props.audienceEstimateState
    : undefined
);
const zeroAudienceWarning = computed(() =>
  (readyAudienceEstimate.value?.ownerCopyCount ?? 0) === 0
    ? t("zeroAudienceWarning")
    : t("zeroAudienceOwnerCopyWarning", {
        count: formatNumber(readyAudienceEstimate.value?.ownerCopyCount ?? 0),
      })
);
const emailReachWarning = computed<string | undefined>(() => {
  const optionalEmailConversationCount = selectedConversations.value.filter(
    (conversation) =>
      hasConversationUpdatesPartialEmailReach(conversation.participationMode)
  ).length;
  if (optionalEmailConversationCount === 0) {
    return undefined;
  }
  return optionalEmailConversationCount === selectedConversations.value.length
    ? t("optionalEmailAllWarning")
    : t("optionalEmailSomeWarning");
});
const ownerCopyMessage = computed(() => {
  const estimate = readyAudienceEstimate.value;
  return t("ownerCopySummary", {
    participantCount: formatNumber(estimate?.eligibleParticipantCount ?? 0),
    managerCount: formatNumber(estimate?.ownerCopyCount ?? 0),
  });
});
const testGuidance = computed<TestGuidance | undefined>(() => {
  const readiness = testReadiness.value;
  switch (readiness.kind) {
    case "incomplete-draft":
      return { message: t("completeRequiredFields"), variant: "warning" };
    case "invalid-draft":
      return { message: t("fixInvalidFields"), variant: "warning" };
    case "checking-recipients":
      return { message: t("checkingRecipients"), variant: "warning" };
    case "ready":
      return props.hasSuccessfulTest
        ? { message: t("testPassed"), variant: "info" }
        : { message: t("testRequired"), variant: "warning" };
    case "authoring-disabled":
    case "estimate-error":
    case "no-recipients":
    case "pending":
      return undefined;
  }
  const unhandledReadiness: never = readiness;
  return unhandledReadiness;
});
const liveStatusMessage = computed(() =>
  readyAudienceEstimate.value?.eligibleParticipantCount === 0
    ? zeroAudienceWarning.value
    : (testGuidance.value?.message ?? "")
);
const testButtonLabel = computed(() =>
  props.testPending
    ? t("sendingTest")
    : props.hasSuccessfulTest
      ? t("sendAnotherTest")
      : t("sendTest")
);

watch([selectedScopeId, selectedConversationIds, subject, bodyHtml], () => {
  contentConfirmed.value = false;
  showTestSendDialog.value = false;
});

watch(
  () => props.testDestinationEmail,
  () => {
    showTestSendDialog.value = false;
  }
);

function updateSubject(value: string | number | null): void {
  subject.value = value === null ? "" : String(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(locale.value).format(value);
}
</script>

<style scoped lang="scss">
.composer-form {
  overflow: hidden;
  border-radius: 1rem;

  &__heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;

    p {
      margin: 0;
      color: $primary;
      font-size: 0.78rem;
      font-weight: var(--font-weight-semibold);
    }

    h2 {
      margin: 0.25rem 0 0;
      color: $color-text-strong;
      font-size: 1.15rem;
      line-height: 1.35;
    }

    .q-icon {
      color: $primary;
    }
  }

  &__fields {
    display: grid;
    gap: 1.5rem;
  }

  &__editor {
    display: grid;
    gap: 0.5rem;

    label {
      color: $color-text-strong;
      font-size: 0.85rem;
      font-weight: var(--font-weight-medium);
    }
  }

  &__actions {
    gap: 0.75rem;
    padding: 1rem;
  }
}

@media (max-width: $breakpoint-xs-max) {
  .composer-form__actions {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.75rem;

    :deep(.quasarBtn) {
      flex: 1 1 9rem;
      min-width: 0;
    }
  }
}

@media (min-width: $breakpoint-md-min) {
  .composer-form__editor {
    --conversation-update-editor-min-height: 26rem;

    :deep(.ProseMirror) {
      max-height: 65vh;
    }
  }
}
</style>
