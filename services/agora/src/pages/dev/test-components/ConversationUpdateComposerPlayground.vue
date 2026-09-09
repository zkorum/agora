<template>
  <section class="composer-playground">
    <div class="composer-playground__controls">
      <div>
        <h2>Compose component</h2>
        <p>
          Write an example with the production composer, then preview the
          server-rendered email.
        </p>
      </div>
      <q-select
        v-model="scenario"
        label="Composer state"
        :options="scenarios"
        emit-value
        map-options
        outlined
        :disable="loading"
      />
    </div>
    <div class="composer-playground__settings">
      <ConversationEmailExampleFields v-model="example" :disabled="loading" />
      <p v-if="example.fixture === 'project'">
        {{ conversationEmailExampleConversations.length }} sample conversations
        available. Open Included conversations and use Select all to preview the
        full list.
      </p>
      <q-select
        v-model="language"
        label="Preview language"
        :options="ZodSupportedDisplayLanguageCodes.options"
        outlined
        :disable="loading"
      />
    </div>
    <ConversationUpdateComposerForm
      v-model:selected-scope-id="selectedScopeId"
      v-model:selected-conversation-ids="selectedConversationIds"
      v-model:subject="subject"
      v-model:body-html="bodyHtml"
      v-model:body-plain-text="bodyPlainText"
      :scopes="scopes"
      :updates-disabled-conversation-ids="[]"
      :prepare-pending="loading || scenario === 'preparing'"
      :audience-estimate-state="audienceEstimateState"
      :test-destination-email="
        scenario === 'unverified' ? undefined : 'facilitator@example.org'
      "
    >
      <template #review-guidance>
        <p class="composer-playground__note">
          Preview only · sample participants and organizations.
        </p>
      </template>
      <template #actions="{ canReview }">
        <PrimeButton
          label="Preview email"
          icon="pi pi-eye"
          :loading="loading"
          :disabled="!canReview || loading"
          @click="renderPreview"
        />
      </template>
    </ConversationUpdateComposerForm>
    <ErrorRetryBlock
      v-if="error"
      :title="error"
      retry-label="Retry preview"
      @retry="renderPreview"
    />
    <section v-if="previews" class="composer-playground__preview">
      <div class="composer-playground__variants" aria-label="Email copy">
        <PrimeButton
          label="Participant copy"
          :outlined="variant !== 'participant'"
          :aria-pressed="variant === 'participant'"
          @click="variant = 'participant'"
        />
        <PrimeButton
          label="Admin / owner copy"
          :outlined="variant !== 'ownerCopy'"
          :aria-pressed="variant === 'ownerCopy'"
          @click="variant = 'ownerCopy'"
        />
      </div>
      <h2>{{ previews[variant].subject }}</h2>
      <ConversationEmailViewer
        :email="previews[variant]"
        :language="language"
        title="Example email preview"
      />
    </section>
  </section>
</template>

<script setup lang="ts">
import PrimeButton from "primevue/button";
import ConversationEmailViewer from "src/components/conversationUpdates/ConversationEmailViewer.vue";
import ConversationUpdateComposerForm from "src/components/conversationUpdates/ConversationUpdateComposerForm.vue";
import type {
  ConversationUpdateAudienceEstimateState,
  ConversationUpdateScopeSummary,
} from "src/components/conversationUpdates/conversationUpdateTypes";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import {
  type ConversationEmailExample,
  conversationEmailExampleConversations,
  conversationEmailExampleNames,
} from "src/shared/branding/emailExamples";
import {
  type SupportedDisplayLanguageCodes,
  ZodSupportedDisplayLanguageCodes,
} from "src/shared/languages";
import { Dto } from "src/shared/types/dto";
import { useBackendConversationEmailUpdatesApi } from "src/utils/api/conversationUpdates/conversationEmailUpdates";
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";

import ConversationEmailExampleFields from "./ConversationEmailExampleFields.vue";

type Scenario =
  | "ready"
  | "empty"
  | "loading"
  | "error"
  | "unverified"
  | "preparing";
const scenario = ref<Scenario>("ready");
const scenarios = [
  { label: "Ready to preview", value: "ready" },
  { label: "No eligible participants", value: "empty" },
  { label: "Checking recipients", value: "loading" },
  { label: "Recipient estimate failed", value: "error" },
  { label: "Email verification required", value: "unverified" },
  { label: "Preparing preview", value: "preparing" },
] satisfies { label: string; value: Scenario }[];
const example = ref<ConversationEmailExample>({
  fixture: "project",
  backgroundPicture: false,
  attributions: [],
  attributionLogos: false,
});
const language = ref<SupportedDisplayLanguageCodes>("en");
const selectedScopeId = ref("example-project");
const selectedConversationIds = ref<readonly string[]>([
  "demo0001",
  "demo0002",
]);
const scopes = computed<readonly ConversationUpdateScopeSummary[]>(() => [
  {
    id:
      example.value.fixture === "project"
        ? "example-project"
        : "example-conversation",
    kind: example.value.fixture === "project" ? "project" : "no-project",
    unsubscribeScope:
      example.value.fixture === "project" ? "project" : "conversation",
    label: conversationEmailExampleNames[example.value.fixture],
    contactEmail: "facilitator@example.org",
    conversations: conversationEmailExampleConversations
      .filter(
        (conversation) =>
          example.value.fixture === "project" || conversation.id === "demo0001"
      )
      .map((conversation) => ({
        ...conversation,
        href: "/dev/project-conversation-layout",
        eligibleParticipantCount: 12,
        participationMode: "account_required",
      })),
  },
]);
watch(
  () => example.value.fixture,
  (fixture) => {
    selectedScopeId.value =
      fixture === "project" ? "example-project" : "example-conversation";
    selectedConversationIds.value =
      fixture === "project" ? ["demo0001", "demo0002"] : ["demo0001"];
  }
);
const subject = ref("What we heard and what happens next");
const bodyPlainText = ref(
  "Thank you for taking part. Your priorities are shaping the next steps."
);
const bodyHtml = ref(`<p>${bodyPlainText.value}</p>`);
const audienceEstimateState = computed<ConversationUpdateAudienceEstimateState>(
  () => {
    if (scenario.value === "loading" || scenario.value === "error")
      return { kind: scenario.value };
    return {
      kind: "ready",
      eligibleParticipantCount:
        scenario.value === "empty"
          ? 0
          : selectedConversationIds.value.length * 12,
      ownerCopyCount: 1,
    };
  }
);
type Email = ReturnType<typeof Dto.conversationEmailUpdatePreview.parse>;
const previews = shallowRef<{ participant: Email; ownerCopy: Email }>();
const variant = ref<"participant" | "ownerCopy">("participant");
const loading = ref(false);
const error = ref<string>();
const api = useBackendConversationEmailUpdatesApi();
let generation = 0;
function invalidatePreview(): void {
  generation += 1;
  previews.value = undefined;
  loading.value = false;
  error.value = undefined;
}
watch(
  [example, language, subject, bodyHtml, selectedConversationIds],
  invalidatePreview,
  { deep: true, flush: "sync" }
);
onBeforeUnmount(invalidatePreview);
async function renderPreview(): Promise<void> {
  if (loading.value) return;
  const input = {
    ...example.value,
    language: language.value,
    content: {
      subject: subject.value,
      bodyHtml: bodyHtml.value,
      conversationSlugIds: selectedConversationIds.value,
    },
  };
  const participantRequest =
    Dto.conversationEmailUpdateDevPreviewRequest.safeParse({
      ...input,
      variant: "participant",
    });
  const ownerRequest = Dto.conversationEmailUpdateDevPreviewRequest.safeParse({
    ...input,
    variant: "owner_copy",
  });
  if (!participantRequest.success || !ownerRequest.success) return;
  const token = ++generation;
  loading.value = true;
  error.value = undefined;
  try {
    const [participant, ownerCopy] = await Promise.all([
      api.getDevPreview(participantRequest.data),
      api.getDevPreview(ownerRequest.data),
    ]);
    if (token !== generation) return;
    if (!participant.success || !ownerCopy.success) {
      error.value = "The example could not be rendered.";
      return;
    }
    previews.value = {
      participant: participant.preview,
      ownerCopy: ownerCopy.preview,
    };
  } catch {
    if (token === generation)
      error.value =
        "Could not render the email. Check that the development API is available and retry.";
  } finally {
    if (token === generation) loading.value = false;
  }
}
</script>

<style scoped lang="scss">
.composer-playground {
  display: grid;
  gap: 1.5rem;
  width: min(100%, 60rem);
  margin-inline: auto;
  &__controls,
  &__settings,
  &__preview {
    display: grid;
    gap: 1rem;
    min-width: 0;
  }
  &__settings,
  &__preview {
    padding: 1.25rem;
    background: $color-background-default;
    border: 1px solid $grey-4;
    border-radius: 1rem;
  }
  &__variants {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1.2rem;
  }
  p {
    margin: 0;
    color: $color-text-weak;
  }
}
@media (min-width: 800px) {
  .composer-playground__controls {
    grid-template-columns: minmax(0, 1fr) 16rem;
    align-items: center;
  }
}
</style>
