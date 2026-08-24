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
        v-if="emailReachWarning !== undefined"
        :message="emailReachWarning"
      />

      <ZKInfoBanner
        v-if="testDestinationEmail !== undefined"
        :message="
          t('testEmailNotice', {
            email: testDestinationEmail,
          })
        "
      />

      <ZKInfoBanner
        v-if="audienceEstimateAvailable && audienceEstimate === 0"
        :message="t('zeroAudienceWarning')"
        variant="error"
      />

      <q-input
        :model-value="subject"
        outlined
        :label="t('subjectLabel')"
        :disable="!authoringEnabled"
        :hint="subjectHint"
        @update:model-value="updateSubject"
      />

      <div class="composer-form__editor">
        <label>{{ t("messageLabel") }}</label>
        <Editor
          v-model="bodyHtml"
          v-model:plain-text="bodyPlainText"
          :show-toolbar="true"
          :placeholder="t('editorPlaceholder')"
          min-height="12rem"
          :disabled="!authoringEnabled"
          :single-line="false"
          :max-length="CONVERSATION_EMAIL_UPDATE_PLAIN_TEXT_MAX_LENGTH"
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
        v-if="relatedConversationOwnerCount > 0"
        :message="ownerCopyMessage"
      />

      <ZKInfoBanner
        v-if="canTest"
        :message="testRequirementMessage"
        :variant="hasSuccessfulTest ? 'info' : 'warning'"
      />

      <ZKInfoBanner v-if="notice !== undefined" :message="notice" />
    </q-card-section>

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
        @click="emit('test')"
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
</template>

<script setup lang="ts">
import ConversationUpdateScopeFields from "src/components/conversationUpdates/ConversationUpdateScopeFields.vue";
import type { ConversationUpdateScopeSummary } from "src/components/conversationUpdates/conversationUpdateTypes";
import Editor from "src/components/editor/Editor.vue";
import { hasConversationUpdatesPartialEmailReach } from "src/components/newConversation/conversationUpdatesParticipation";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKCheckbox from "src/components/ui-library/ZKCheckbox.vue";
import ZKInfoBanner from "src/components/ui-library/ZKInfoBanner.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { validateRichTextInput } from "src/shared/richText";
import {
  CONVERSATION_EMAIL_UPDATE_PLAIN_TEXT_MAX_LENGTH,
  CONVERSATION_EMAIL_UPDATE_SUBJECT_MAX_LENGTH,
  zodConversationEmailUpdateSubject,
} from "src/shared/types/dto";
import { computed, watch } from "vue";

import {
  type ConversationUpdateComposerFormTranslations,
  conversationUpdateComposerFormTranslations,
} from "./ConversationUpdateComposerForm.i18n";

const props = defineProps<{
  scopes: readonly ConversationUpdateScopeSummary[];
  updatesDisabledConversationIds: readonly string[];
  testPending: boolean;
  sendPending: boolean;
  notice: string | undefined;
  hasSuccessfulTest: boolean;
  audienceEstimate: number;
  audienceEstimateAvailable: boolean;
  testDestinationEmail: string | undefined;
  relatedConversationOwnerCount: number;
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
const authoringEnabled = computed(
  () => props.testDestinationEmail !== undefined
);
const canTest = computed(
  () =>
    !props.testPending &&
    authoringEnabled.value &&
    props.audienceEstimateAvailable &&
    props.audienceEstimate > 0 &&
    selectedConversationIds.value.length > 0 &&
    selectedConversationIds.value.every(
      (conversationId) =>
        !props.updatesDisabledConversationIds.includes(conversationId)
    ) &&
    zodConversationEmailUpdateSubject.safeParse(subject.value).success &&
    validateRichTextInput({
      htmlString: bodyHtml.value,
      mode: "conversation_email_update",
    }).success
);
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
    props.scopes
      .find((scope) => scope.id === selectedScopeId.value)
      ?.conversations.filter((conversation) =>
        selectedIds.has(conversation.id)
      ) ?? []
  );
});
const replyTo = computed(
  () =>
    props.scopes.find((scope) => scope.id === selectedScopeId.value)
      ?.contactEmail ?? ""
);
const replyToLabel = computed(() => {
  const scope = props.scopes.find(
    (candidate) => candidate.id === selectedScopeId.value
  );
  return scope?.kind === "no-project"
    ? t("replyToConversation")
    : t("replyToProject");
});
const subjectHint = computed(() =>
  t("subjectHint", {
    max: formatNumber(CONVERSATION_EMAIL_UPDATE_SUBJECT_MAX_LENGTH),
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
  const count = props.relatedConversationOwnerCount;
  return t(count === 1 ? "ownerCopySingular" : "ownerCopyPlural", {
    count: formatNumber(count),
  });
});
const testRequirementMessage = computed(() =>
  props.hasSuccessfulTest ? t("testPassed") : t("testRequired")
);
const testButtonLabel = computed(() =>
  props.hasSuccessfulTest ? t("sendAnotherTest") : t("sendTest")
);

watch([selectedScopeId, selectedConversationIds, subject, bodyHtml], () => {
  contentConfirmed.value = false;
});

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
    display: grid;

    :deep(.quasarBtn) {
      width: 100%;
    }
  }
}
</style>
