<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar
      title="Email Updates playground"
      :center-content="true"
      fallback-route="/dev/component-testing"
    />
  </Teleport>
  <main class="email-dev">
    <header class="email-dev__header">
      <div>
        <h1>Email Updates playground</h1>
        <p>Test the compose component and compare rendered emails.</p>
      </div>
      <SpaLink
        class="email-dev__workspace-link"
        to="/email-updates/?tab=compose"
      >
        <q-icon name="mdi-email-edit-outline" size="1.2rem" />
        Open real workspace
      </SpaLink>
    </header>
    <nav class="email-dev__tabs" aria-label="Email testing tools">
      <PrimeButton
        label="Compose component"
        :outlined="tool !== 'compose'"
        :aria-pressed="tool === 'compose'"
        @click="tool = 'compose'"
      />
      <PrimeButton
        label="Email comparison"
        :outlined="tool !== 'comparison'"
        :aria-pressed="tool === 'comparison'"
        @click="tool = 'comparison'"
      />
    </nav>
    <ConversationUpdateComposerPlayground v-show="tool === 'compose'" />
    <div v-show="tool === 'comparison'" class="email-dev__comparison">
      <section class="email-dev__panel">
        <div class="email-dev__section-heading">
          <h2>Email comparison</h2>
          <p>
            Server-rendered previews using workspace data or fictional examples.
          </p>
        </div>
        <q-select
          v-model="source"
          label="Preview source"
          :options="sources"
          emit-value
          map-options
          outlined
        />

        <section v-if="source === 'real'" class="email-dev__authoring">
          <h2>Real workspace data</h2>
          <p>
            Load projects and conversations you are authorized to manage, then
            write draft content below. Sender identity and reply-to details come
            from the server, not example values.
          </p>
          <PrimeButton
            class="email-dev__load"
            outlined
            icon="pi pi-refresh"
            label="Load authorized workspace"
            :loading="workspace.kind === 'loading'"
            :disabled="busy"
            @click="loadWorkspace"
          />
          <ErrorRetryBlock
            v-if="workspace.kind === 'error'"
            :title="workspace.message"
            retry-label="Retry workspace load"
            compact
            @retry="loadWorkspace"
          />
          <template v-if="workspace.kind === 'ready'">
            <p v-if="workspace.scopes.length === 0">
              No authorized Email Updates scopes are available for this account.
              Check your project or conversation management permissions.
            </p>
            <ConversationUpdateScopeFields
              v-model:selected-scope-id="selectedScopeId"
              v-model:selected-conversation-ids="selectedConversationIds"
              :scopes="workspace.scopes"
              :updates-disabled-conversation-ids="[]"
              :disabled="busy"
            />
            <q-input
              :model-value="subject"
              label="Subject"
              outlined
              :disable="busy"
              :hint="`Maximum ${CONVERSATION_EMAIL_UPDATE_SUBJECT_MAX_LENGTH} Unicode characters`"
              @update:model-value="updateSubject"
            />
            <div>
              <label :id="messageLabelId">Message</label>
              <Editor
                v-model="bodyHtml"
                v-model:plain-text="bodyPlainText"
                :show-toolbar="true"
                placeholder="Write the update to compare"
                min-height="12rem"
                :disabled="busy"
                :single-line="false"
                :max-length="CONVERSATION_EMAIL_UPDATE_PLAIN_TEXT_MAX_LENGTH"
                :aria-labelledby="messageLabelId"
                required
              />
            </div>
            <q-toggle
              v-model="simulateSubset"
              label="Simulate a participant conversation subset"
              :disable="busy"
            />
            <p>
              This is an illustrative subset of the selected conversations, not
              actual recipient data. No recipient lookup or recipient list is
              used. The admin copy includes all selected conversations.
            </p>
            <q-select
              v-if="simulateSubset"
              v-model="participantConversationSlugIds"
              label="Illustrative participant conversations (at least one)"
              :options="participantOptions"
              multiple
              emit-value
              map-options
              outlined
              :disable="busy"
            />
          </template>
        </section>
        <section v-else class="email-dev__authoring">
          <h2>Examples only</h2>
          <p>
            Fictional, bounded server fixtures. These are not your workspace or
            real recipient data. No sign-in is required for examples.
          </p>
          <ConversationEmailExampleFields v-model="example" :disabled="busy" />
        </section>

        <div class="email-dev__controls">
          <q-select
            v-model="language"
            label="Email language"
            :options="ZodSupportedDisplayLanguageCodes.options"
            outlined
            :disable="busy"
          />
          <q-toggle v-model="narrow" label="Narrow preview (320px)" />
          <PrimeButton
            icon="pi pi-eye"
            label="Render comparison"
            :loading="renderState.kind === 'loading'"
            :disabled="!canRender"
            @click="renderComparison"
          />
        </div>
        <p v-if="source === 'real' && !request.success">
          Select authorized conversations and enter a valid subject and message.
          A simulated subset must contain at least one selected conversation.
        </p>
        <p v-if="renderState.kind === 'loading'" role="status">
          Rendering both copies on the server...
        </p>
        <p v-if="renderState.kind === 'error'" role="alert">
          {{ renderState.message }}
        </p>
      </section>

      <section v-if="snapshot" class="email-dev__results">
        <p v-if="stale" role="status">Previous preview; render to update</p>
        <h2>
          {{
            snapshot.source === "real"
              ? "Real-data comparison"
              : "Example comparison (fictional)"
          }}
        </h2>
        <dl v-if="snapshot.source === 'real'" class="email-dev__metadata">
          <dt>Sender</dt>
          <dd>{{ snapshot.metadata.senderName }}</dd>
          <dt>Reply-to name</dt>
          <dd>{{ snapshot.metadata.replyToName }}</dd>
          <dt>Reply-to email</dt>
          <dd>{{ snapshot.metadata.replyToEmail }}</dd>
          <dt>Branding</dt>
          <dd>
            {{ snapshot.metadata.branding.name }} ({{
              snapshot.metadata.branding.palette
            }})
          </dd>
          <dt>Brand image</dt>
          <dd>{{ snapshot.metadata.branding.imageUrl ?? "None" }}</dd>
          <dt>Brand banner</dt>
          <dd>{{ snapshot.metadata.branding.bannerImageUrl ?? "None" }}</dd>
          <dt>Unsubscribe scope</dt>
          <dd>{{ snapshot.metadata.unsubscribeScope }}</dd>
          <dt>Sending enabled</dt>
          <dd>
            {{
              snapshot.metadata.sendingEnabled
                ? "Yes"
                : "No (read-only preview)"
            }}
          </dd>
        </dl>
        <p>Rendered language: {{ snapshot.language }}</p>
        <p v-if="snapshot.source === 'examples'">
          Example branding: {{ snapshot.fixture }}
        </p>
        <div
          class="email-dev__pair"
          :class="{ 'email-dev__pair--narrow': narrow }"
        >
          <article>
            <h3>Admin / owner copy</h3>
            <h4>{{ snapshot.previews.ownerCopy.subject }}</h4>
            <ConversationEmailViewer
              :email="snapshot.previews.ownerCopy"
              :language="snapshot.language"
              title="Admin / owner email preview"
            />
          </article>
          <article>
            <h3>Participant copy (illustrative)</h3>
            <h4>{{ snapshot.previews.participant.subject }}</h4>
            <ConversationEmailViewer
              :email="snapshot.previews.participant"
              :language="snapshot.language"
              title="Participant email preview"
            />
          </article>
        </div>
        <details
          v-if="snapshot.source === 'real'"
          @toggle="updateTestDisclosure"
        >
          <summary>Test copy (preview only, not sent)</summary>
          <h4>{{ snapshot.previews.test.subject }}</h4>
          <ConversationEmailViewer
            v-if="showTest"
            :email="snapshot.previews.test"
            :language="snapshot.language"
            title="Test email preview"
          />
        </details>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import PrimeButton from "primevue/button";
import ConversationEmailViewer from "src/components/conversationUpdates/ConversationEmailViewer.vue";
import {
  createConversationEmailUpdateSelection,
  mapConversationEmailUpdateScopes,
} from "src/components/conversationUpdates/conversationUpdateLogic";
import ConversationUpdateScopeFields from "src/components/conversationUpdates/ConversationUpdateScopeFields.vue";
import type { ConversationUpdateScopeSummary } from "src/components/conversationUpdates/conversationUpdateTypes";
import Editor from "src/components/editor/Editor.vue";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import type { ConversationEmailExample } from "src/shared/branding/emailExamples";
import { ZodSupportedDisplayLanguageCodes } from "src/shared/languages";
import { validateRichTextInput } from "src/shared/richText";
import {
  CONVERSATION_EMAIL_UPDATE_PLAIN_TEXT_MAX_LENGTH,
  CONVERSATION_EMAIL_UPDATE_SUBJECT_MAX_LENGTH,
  Dto,
} from "src/shared/types/dto";
import { useAuthenticationStore } from "src/stores/authentication";
import { useBackendConversationEmailUpdatesApi } from "src/utils/api/conversationUpdates/conversationEmailUpdates";
import {
  computed,
  onBeforeUnmount,
  onDeactivated,
  ref,
  shallowRef,
  useId,
  watch,
} from "vue";

import ConversationEmailExampleFields from "./test-components/ConversationEmailExampleFields.vue";
import ConversationUpdateComposerPlayground from "./test-components/ConversationUpdateComposerPlayground.vue";

const { isActive } = usePageLayout({
  enableDrawer: false,
  enableFooter: false,
  reducedWidth: false,
  addBottomPadding: true,
});
const api = useBackendConversationEmailUpdatesApi();
const tool = ref<"compose" | "comparison">("compose");
const auth = useAuthenticationStore();
type ExampleRequest = ReturnType<
  typeof Dto.conversationEmailUpdateDevPreviewRequest.parse
>;
type ComparisonResponse = ReturnType<
  typeof Dto.conversationEmailUpdateDevComparisonResponse.parse
>;
type Comparison = Extract<ComparisonResponse, { success: true }>;
type Snapshot =
  | {
      source: "real";
      metadata: Comparison["metadata"];
      previews: Comparison["previews"];
      language: ExampleRequest["language"];
    }
  | {
      source: "examples";
      fixture: ExampleRequest["fixture"];
      language: ExampleRequest["language"];
      previews: Pick<Comparison["previews"], "ownerCopy" | "participant">;
    };
type WorkspaceState =
  | { kind: "idle" | "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; scopes: readonly ConversationUpdateScopeSummary[] };
const sources = [
  { label: "Real workspace data", value: "real" },
  { label: "Examples (fictional fallback)", value: "examples" },
];
const source = ref<"real" | "examples">("real");
const example = ref<ConversationEmailExample>({
  fixture: "project",
  backgroundPicture: false,
  attributions: [],
  attributionLogos: false,
});
const language = ref<ExampleRequest["language"]>("en");
const narrow = ref(false);
const showTest = ref(false);
const workspace = shallowRef<WorkspaceState>({ kind: "idle" });
const selectedScopeId = ref("");
const selectedConversationIds = ref<readonly string[]>([]);
const subject = ref("");
const bodyHtml = ref("");
const bodyPlainText = ref("");
const messageLabelId = useId();
const simulateSubset = ref(false);
const participantConversationSlugIds = ref<string[]>([]);
const snapshot = shallowRef<Snapshot>();
const stale = ref(false);
const renderState = shallowRef<
  { kind: "idle" | "loading" } | { kind: "error"; message: string }
>({ kind: "idle" });
const busy = computed(
  () =>
    workspace.value.kind === "loading" || renderState.value.kind === "loading"
);
const selectedScope = computed(() =>
  workspace.value.kind === "ready"
    ? workspace.value.scopes.find((scope) => scope.id === selectedScopeId.value)
    : undefined
);
const participantOptions = computed(
  () =>
    selectedScope.value?.conversations
      .filter((conversation) =>
        selectedConversationIds.value.includes(conversation.id)
      )
      .map((conversation) => ({
        label: conversation.title,
        value: conversation.id,
      })) ?? []
);
const request = computed(() =>
  Dto.conversationEmailUpdateDevComparisonRequest.safeParse({
    selection:
      selectedScope.value === undefined
        ? undefined
        : createConversationEmailUpdateSelection({
            scope: selectedScope.value,
            selectedConversationIds: selectedConversationIds.value,
          }),
    subject: subject.value,
    bodyHtml: bodyHtml.value,
    language: language.value,
    ...(simulateSubset.value
      ? { participantConversationSlugIds: participantConversationSlugIds.value }
      : {}),
  })
);
const canRender = computed(
  () =>
    !busy.value &&
    (source.value === "examples" ||
      (auth.isLoggedIn &&
        request.value.success &&
        selectedConversationIds.value.every((id) =>
          selectedScope.value?.conversations.some(
            (conversation) => conversation.id === id
          )
        ) &&
        (!simulateSubset.value ||
          participantConversationSlugIds.value.every((id) =>
            selectedConversationIds.value.includes(id)
          )) &&
        validateRichTextInput({
          htmlString: bodyHtml.value,
          mode: "conversation_email_update",
        }).success))
);
const failureMessages = {
  scope_not_found:
    "This scope was not found or you are no longer authorized to manage it. Reload the authorized workspace.",
  conversation_not_in_scope:
    "A selected conversation or simulated subset is no longer in this scope. Reload the workspace and select again.",
  content_invalid:
    "The subject or message is invalid. Edit the content, then render again.",
  missing_participant_contact_email:
    "This scope has no participant contact email. Configure its reply-to contact in the real workspace before rendering.",
  configuration_disabled:
    "Email Updates are disabled or blocked for one or more selected conversations. Adjust the selection or its settings.",
} satisfies Record<
  Extract<ComparisonResponse, { success: false }>["reason"],
  string
>;
let generation = 0;
let workspaceGeneration = 0;

function invalidatePreview(): void {
  generation += 1;
  stale.value = snapshot.value !== undefined;
  renderState.value = { kind: "idle" };
}
watch(
  [
    subject,
    bodyHtml,
    language,
    example,
    selectedScopeId,
    selectedConversationIds,
    simulateSubset,
    participantConversationSlugIds,
  ],
  invalidatePreview,
  { deep: true, flush: "sync" }
);
watch(
  selectedConversationIds,
  () => {
    participantConversationSlugIds.value =
      participantConversationSlugIds.value.filter((id) =>
        selectedConversationIds.value.includes(id)
      );
  },
  { flush: "sync" }
);
watch(
  source,
  () => {
    invalidatePreview();
    snapshot.value = undefined;
    showTest.value = false;
    workspaceGeneration += 1;
    if (workspace.value.kind === "loading") workspace.value = { kind: "idle" };
  },
  { flush: "sync" }
);
watch(
  [() => auth.userId, () => auth.isLoggedIn],
  () => {
    invalidatePreview();
    snapshot.value = undefined;
    showTest.value = false;
    workspaceGeneration += 1;
    workspace.value = { kind: "idle" };
    selectedScopeId.value = "";
    selectedConversationIds.value = [];
    subject.value = "";
    bodyHtml.value = "";
    bodyPlainText.value = "";
  },
  { flush: "sync" }
);

function updateTestDisclosure(event: Event): void {
  if (event.target instanceof HTMLDetailsElement)
    showTest.value = event.target.open;
}

function updateSubject(value: string | number | null): void {
  subject.value = value === null ? "" : String(value);
}

async function loadWorkspace(): Promise<void> {
  if (busy.value || source.value !== "real") return;
  if (!auth.isLoggedIn) {
    workspace.value = {
      kind: "error",
      message:
        "Sign in to load your authorized workspace, or choose Examples without signing in.",
    };
    return;
  }
  const token = ++workspaceGeneration;
  invalidatePreview();
  workspace.value = { kind: "loading" };
  try {
    const response = await api.getWorkspace({ context: { kind: "global" } });
    if (token !== workspaceGeneration) return;
    if (!response.success) {
      workspace.value = {
        kind: "error",
        message:
          response.reason === "feature_not_available"
            ? "Email Updates are not available for this account. Check your authorization or choose Examples."
            : "The workspace was not found or is not authorized. Sign in with an account that manages conversations, then retry.",
      };
      return;
    }
    workspace.value = {
      kind: "ready",
      scopes: mapConversationEmailUpdateScopes(response.scopes),
    };
    selectedScopeId.value = "";
    selectedConversationIds.value = [];
  } catch {
    if (token !== workspaceGeneration) return;
    workspace.value = {
      kind: "error",
      message:
        "Could not load the authorized workspace. Check that you are signed in, have management permissions, and the development API is available, then retry.",
    };
  }
}

async function renderComparison(): Promise<void> {
  if (!canRender.value) return;
  const token = ++generation;
  renderState.value = { kind: "loading" };
  stale.value = snapshot.value !== undefined;
  try {
    if (source.value === "real") {
      const parsed = request.value;
      if (!parsed.success) {
        renderState.value = {
          kind: "error",
          message: failureMessages.content_invalid,
        };
        return;
      }
      const response = await api.getDevComparison(parsed.data);
      if (token !== generation) return;
      if (!response.success) {
        renderState.value = {
          kind: "error",
          message: failureMessages[response.reason],
        };
        return;
      }
      snapshot.value = {
        source: "real",
        metadata: response.metadata,
        previews: response.previews,
        language: response.metadata.language,
      };
    } else {
      const requestedExample = { ...example.value };
      const requestedLanguage = language.value;
      const [ownerCopy, participant] = await Promise.all([
        api.getDevPreview({
          ...requestedExample,
          language: requestedLanguage,
          variant: "owner_copy",
        }),
        api.getDevPreview({
          ...requestedExample,
          language: requestedLanguage,
          variant: "participant",
        }),
      ]);
      if (token !== generation) return;
      if (!ownerCopy.success || !participant.success) {
        renderState.value = {
          kind: "error",
          message:
            "The example fixture was not found. Choose another example and render again.",
        };
        return;
      }
      snapshot.value = {
        source: "examples",
        fixture: requestedExample.fixture,
        language: requestedLanguage,
        previews: {
          ownerCopy: ownerCopy.preview,
          participant: participant.preview,
        },
      };
    }
    stale.value = false;
    renderState.value = { kind: "idle" };
  } catch {
    if (token !== generation) return;
    renderState.value = {
      kind: "error",
      message:
        source.value === "real"
          ? "Comparison failed. Check your sign-in, authorization, and development API configuration, then render again."
          : "Example rendering failed. Check that the development fixture endpoint is enabled and reachable, then render again.",
    };
  }
}
function discardPending(): void {
  invalidatePreview();
  workspaceGeneration += 1;
  if (workspace.value.kind === "loading") workspace.value = { kind: "idle" };
}
onBeforeUnmount(discardPending);
onDeactivated(discardPending);
</script>

<style scoped lang="scss">
.email-dev {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
  width: min(78rem, calc(100% - 2rem));
  margin-inline: auto;
  padding-block: 1.5rem 3rem;
  overflow-wrap: anywhere;

  p {
    margin: 0;
    color: $color-text-weak;
    line-height: 1.5;
  }
  &__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    p {
      margin-top: 0.5rem;
    }
  }
  &__workspace-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: $primary;
    font-weight: var(--font-weight-semibold);
    min-height: 2.75rem;
  }
  &__tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  &__comparison,
  &__panel {
    display: grid;
    gap: 1.5rem;
    min-width: 0;
  }
  &__panel {
    padding: clamp(1rem, 3vw, 1.5rem);
    border: 1px solid $grey-4;
    border-radius: 1rem;
    background: $color-background-default;
  }
  &__section-heading {
    display: grid;
    gap: 0.5rem;
  }
  &__load {
    justify-self: start;
  }

  h1 {
    margin: 0;
    font-size: clamp(1.5rem, 4vw, 2.2rem);
    line-height: 1.3;
  }
  h2,
  h3,
  h4 {
    margin: 0;
    font-size: 1.15rem;
    line-height: 1.4;
  }
  h4 {
    font-size: 1rem;
  }

  &__authoring,
  &__results {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1rem;
    min-width: 0;
  }
  &__controls {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
    align-items: center;
  }
  &__metadata {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
    dt {
      font-weight: var(--font-weight-semibold);
    }
    dd {
      margin: 0 0 0.5rem;
    }
  }
  &__pair {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1.5rem;
    article {
      min-width: 0;
      display: grid;
      gap: 0.75rem;
      align-content: start;
      padding: 1rem;
      border: 1px solid $grey-4;
      border-radius: 1rem;
      background: $color-background-default;
    }
    &--narrow :deep(.email-viewer) {
      width: min(320px, 100%);
      margin-inline: auto;
    }
  }
}
@media (min-width: 800px) {
  .email-dev__pair {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .email-dev__metadata {
    grid-template-columns: minmax(0, 10rem) minmax(0, 1fr);
  }
}
</style>
