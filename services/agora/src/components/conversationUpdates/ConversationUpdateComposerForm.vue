<template>
  <q-card flat bordered class="composer-form">
    <q-card-section class="composer-form__heading">
      <h2>{{ t("composeUpdate") }}</h2>
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

      <ZKInfoBanner
        v-if="
          readyAudienceEstimate !== undefined &&
          readyAudienceEstimate.ownerCopyCount > 0 &&
          readyAudienceEstimate.eligibleParticipantCount > 0
        "
        :message="ownerCopyMessage"
      />

      <slot name="review-guidance">
        <ZKInfoBanner
          v-if="reviewGuidance !== undefined"
          :message="reviewGuidance.message"
          :variant="reviewGuidance.variant"
        />
        <ZKLiveRegion :message="liveStatusMessage" politeness="polite" />
      </slot>
    </q-card-section>

    <q-separator />

    <q-card-actions align="right" class="composer-form__actions">
      <slot name="actions" :can-review="canReview">
        <PrimeButton
          severity="primary"
          icon="pi pi-envelope"
          :label="tReview('review')"
          :loading="preparePending"
          :disabled="!canReview || preparePending"
          @click="emit('review')"
        />
      </slot>
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import PrimeButton from "primevue/button";
import ConversationUpdateScopeFields from "src/components/conversationUpdates/ConversationUpdateScopeFields.vue";
import type {
  ConversationUpdateAudienceEstimateState,
  ConversationUpdateScopeSummary,
} from "src/components/conversationUpdates/conversationUpdateTypes";
import Editor from "src/components/editor/Editor.vue";
import { hasConversationUpdatesPartialEmailReach } from "src/components/newConversation/conversationUpdatesParticipation";
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
import { computed, useId } from "vue";

import {
  type ConversationUpdateComposerFormTranslations,
  conversationUpdateComposerFormTranslations,
} from "./ConversationUpdateComposerForm.i18n";
import { conversationUpdateReviewTranslations } from "./ConversationUpdateReview.i18n";

type ReviewReadiness =
  | { readonly kind: "authoring-disabled" }
  | { readonly kind: "checking-recipients" }
  | { readonly kind: "estimate-error" }
  | { readonly kind: "incomplete-draft" }
  | { readonly kind: "invalid-draft" }
  | { readonly kind: "no-recipients" }
  | { readonly kind: "ready" };

interface ReviewGuidance {
  readonly message: string;
  readonly variant: "info" | "warning";
}

const props = defineProps<{
  scopes: readonly ConversationUpdateScopeSummary[];
  updatesDisabledConversationIds: readonly string[];
  preparePending: boolean;
  audienceEstimateState: ConversationUpdateAudienceEstimateState;
  testDestinationEmail: string | undefined;
}>();

const emit = defineEmits<{
  review: [];
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
const { locale, t } =
  useComponentI18n<ConversationUpdateComposerFormTranslations>(
    conversationUpdateComposerFormTranslations
  );
const { t: tReview } = useComponentI18n(conversationUpdateReviewTranslations);
const messageLabelId = `conversation-update-message-${useId()}`;
const requiredControlAttributes = { "aria-required": "true" };
const authoringEnabled = computed(
  () => props.testDestinationEmail !== undefined && !props.preparePending
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
const reviewReadiness = computed<ReviewReadiness>(() => {
  if (!authoringEnabled.value) {
    return { kind: "authoring-disabled" };
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
const canReview = computed(() => reviewReadiness.value.kind === "ready");
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
const reviewGuidance = computed<ReviewGuidance | undefined>(() => {
  const readiness = reviewReadiness.value;
  switch (readiness.kind) {
    case "incomplete-draft":
      return { message: tReview("completeRequiredFields"), variant: "warning" };
    case "invalid-draft":
      return { message: tReview("fixInvalidFields"), variant: "warning" };
    case "checking-recipients":
      return { message: t("checkingRecipients"), variant: "warning" };
    case "ready":
      return { message: tReview("locked"), variant: "info" };
    case "authoring-disabled":
    case "estimate-error":
    case "no-recipients":
      return undefined;
  }
  const unhandledReadiness: never = readiness;
  return unhandledReadiness;
});
const liveStatusMessage = computed(() =>
  readyAudienceEstimate.value?.eligibleParticipantCount === 0
    ? zeroAudienceWarning.value
    : (reviewGuidance.value?.message ?? "")
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

    h2 {
      margin: 0;
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
    grid-template-columns: minmax(0, 1fr);
    gap: 1.5rem;
  }

  &__editor {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
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

    :deep(.p-button) {
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
