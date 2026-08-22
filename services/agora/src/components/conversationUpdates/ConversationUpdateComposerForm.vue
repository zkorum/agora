<template>
  <q-card flat bordered class="composer-form">
    <q-card-section class="composer-form__heading">
      <div>
        <p>Compose update</p>
        <h2>Write once, deliver with each participant's context</h2>
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
      />

      <q-input :model-value="replyTo" outlined readonly label="Reply to" />

      <ZKInfoBanner
        v-if="emailReachWarning !== undefined"
        :message="emailReachWarning"
      />

      <ZKInfoBanner
        message="Keep this update strictly about the selected conversations. Advertising, fundraising, political campaigning, and unrelated promotion are not allowed."
        variant="warning"
      />

      <q-input
        :model-value="subject"
        outlined
        label="Subject"
        :hint="`Maximum ${String(CONVERSATION_EMAIL_UPDATE_SUBJECT_MAX_LENGTH)} Unicode characters`"
        @update:model-value="updateSubject"
      />

      <div class="composer-form__editor">
        <label>Message</label>
        <Editor
          v-model="bodyHtml"
          v-model:plain-text="bodyPlainText"
          :show-toolbar="true"
          placeholder="Share what happened, what was learned, and what comes next..."
          min-height="12rem"
          :disabled="false"
          :single-line="false"
          :max-length="CONVERSATION_EMAIL_UPDATE_PLAIN_TEXT_MAX_LENGTH"
        />
      </div>

      <ZKCheckbox
        v-model="contentConfirmed"
        label="I confirm this update follows the Email Update content rules"
        :description="undefined"
        :required="true"
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
        label="Review and send"
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
import { validateRichTextInput } from "src/shared/richText";
import {
  CONVERSATION_EMAIL_UPDATE_PLAIN_TEXT_MAX_LENGTH,
  CONVERSATION_EMAIL_UPDATE_SUBJECT_MAX_LENGTH,
  zodConversationEmailUpdateSubject,
} from "src/shared/types/dto";
import { computed, watch } from "vue";

const props = defineProps<{
  scopes: readonly ConversationUpdateScopeSummary[];
  updatesDisabledConversationIds: readonly string[];
  testPending: boolean;
  notice: string | undefined;
  hasSuccessfulTest: boolean;
  audienceEstimateAvailable: boolean;
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
const canTest = computed(
  () =>
    !props.testPending &&
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
    props.hasSuccessfulTest &&
    props.audienceEstimateAvailable &&
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
const emailReachWarning = computed<string | undefined>(() => {
  const hasNonEmailRequirement = selectedConversations.value.some(
    (conversation) =>
      hasConversationUpdatesPartialEmailReach(conversation.participationMode)
  );
  return hasNonEmailRequirement
    ? "These conversations do not require email. The estimate only includes participants who voluntarily verified an email in Settings and opted in."
    : undefined;
});
const ownerCopyMessage = computed(() => {
  const count = props.relatedConversationOwnerCount;
  const ownerLabel = count === 1 ? "owner" : "owners";
  return `The real update will also be sent to ${String(count)} related conversation ${ownerLabel}. These required copies are sent before participant delivery.`;
});
const testRequirementMessage = computed(() =>
  props.hasSuccessfulTest
    ? "This exact email version passed its test. Changing the scope, Reply-To, subject, or message requires another successful test."
    : "Send a successful test email for this exact version before reviewing the real send."
);
const testButtonLabel = computed(() =>
  props.hasSuccessfulTest ? "Send another test email" : "Send test email"
);

watch([selectedScopeId, selectedConversationIds, subject, bodyHtml], () => {
  contentConfirmed.value = false;
});

function updateSubject(value: string | number | null): void {
  subject.value = value === null ? "" : String(value);
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
