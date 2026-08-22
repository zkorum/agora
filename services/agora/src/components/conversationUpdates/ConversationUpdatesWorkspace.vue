<template>
  <section class="updates-workspace">
    <div class="updates-workspace__intro">
      <div>
        <span>Email Updates</span>
        <h1>Keep participants connected to the work they joined</h1>
        <p>
          Share a focused update about selected conversations, test the exact
          email, and review accepted sends in one place.
        </p>
      </div>
      <q-icon name="mdi-email-fast-outline" size="2.25rem" />
    </div>

    <PageLoadingSpinner v-if="isLoadingWorkspace" />

    <ErrorRetryBlock
      v-else-if="workspaceError !== undefined"
      :title="workspaceError"
      retry-label="Try again"
      @retry="loadWorkspace"
    />

    <template v-else>
      <q-tabs
        :model-value="activeTab"
        dense
        no-caps
        align="left"
        active-color="primary"
        indicator-color="primary"
        class="updates-workspace__tabs"
        @update:model-value="updateActiveTab"
      >
        <q-tab name="compose" icon="mdi-email-edit-outline" label="Compose" />
        <q-tab name="history" icon="mdi-history" label="History" />
      </q-tabs>

      <q-tab-panels
        :model-value="activeTab"
        animated
        class="updates-workspace__panels"
        @update:model-value="updateActiveTab"
      >
        <q-tab-panel name="compose" class="updates-workspace__panel">
          <div class="updates-workspace__compose-grid">
            <ConversationUpdateComposerForm
              v-model:selected-scope-id="selectedScopeId"
              v-model:selected-conversation-ids="selectedConversationIds"
              v-model:subject="subject"
              v-model:body-html="bodyHtml"
              v-model:body-plain-text="bodyPlainText"
              v-model:content-confirmed="contentConfirmed"
              :scopes="scopes"
              :updates-disabled-conversation-ids="
                updatesDisabledConversationIds
              "
              :test-pending="activeTestOperationId !== undefined"
              :notice="notice"
              :has-successful-test="hasSuccessfulTest"
              :audience-estimate-available="audienceEstimateAvailable"
              :related-conversation-owner-count="relatedConversationOwnerCount"
              @test="sendTest"
              @send="showSendDialog = true"
            />

            <ConversationUpdateEmailPreview
              class="updates-workspace__preview"
              :subject="subject"
              :body-html="bodyHtml"
              :reply-to="currentContactEmail"
              :scope-kind="currentScope?.kind ?? 'project'"
              :scope-href="currentScope?.href"
              :scope-label="currentScope?.label ?? ''"
              :conversations="selectedConversations"
              :audience-estimate="audienceEstimate"
            />
          </div>
        </q-tab-panel>

        <q-tab-panel name="history" class="updates-workspace__panel">
          <PageLoadingSpinner v-if="isLoadingHistory && history.length === 0" />
          <ErrorRetryBlock
            v-else-if="historyError !== undefined && history.length === 0"
            :title="historyError"
            retry-label="Try again"
            @retry="loadHistory"
          />
          <template v-else>
            <ZKInfoBanner
              v-if="historyError !== undefined"
              :message="historyError"
              variant="warning"
            />
            <ConversationUpdateHistoryList :records="history" />
            <div
              v-if="historyNextCursor !== undefined"
              class="updates-workspace__history-more"
            >
              <ZKButton
                button-type="standardButton"
                outline
                color="primary"
                label="Load more"
                :loading="isLoadingMoreHistory"
                :disable="isLoadingMoreHistory"
                @click="loadMoreHistory"
              />
            </div>
          </template>
        </q-tab-panel>
      </q-tab-panels>
    </template>
  </section>

  <ZKConfirmDialog
    v-model="showSendDialog"
    title="Send this update?"
    confirm-text="Send update"
    cancel-text="Cancel"
    @confirm="sendUpdate"
  >
    <div class="updates-workspace__send-summary">
      <strong
        >About {{ formattedAudienceEstimate }} eligible participants</strong
      >
      <p>
        Required owner copies are sent first. Participant delivery cannot be
        canceled after the update is accepted.
      </p>
    </div>
  </ZKConfirmDialog>
</template>

<script setup lang="ts">
import ConversationUpdateComposerForm from "src/components/conversationUpdates/ConversationUpdateComposerForm.vue";
import ConversationUpdateEmailPreview from "src/components/conversationUpdates/ConversationUpdateEmailPreview.vue";
import ConversationUpdateHistoryList from "src/components/conversationUpdates/ConversationUpdateHistoryList.vue";
import {
  createConversationEmailUpdateSelection,
  createTestedDraftKey,
  getInitialConversationIds,
  getSelectedConversations,
  mapConversationEmailUpdateHistoryRecord,
  mapConversationEmailUpdateScopes,
} from "src/components/conversationUpdates/conversationUpdateLogic";
import type {
  ConversationUpdateHistoryRecord,
  ConversationUpdateScopeSummary,
} from "src/components/conversationUpdates/conversationUpdateTypes";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import ZKInfoBanner from "src/components/ui-library/ZKInfoBanner.vue";
import type {
  ConversationEmailUpdateHistoryRecord,
  ConversationEmailUpdateScope,
  ConversationEmailUpdateWorkspaceRequest,
} from "src/shared/types/dto";
import { useBackendConversationEmailUpdatesApi } from "src/utils/api/conversationUpdates/conversationEmailUpdates";
import { computed, onBeforeUnmount, ref, watch } from "vue";

type WorkspaceTab = "compose" | "history";

const props = defineProps<{
  initialTab: WorkspaceTab;
  context: ConversationEmailUpdateWorkspaceRequest["context"];
}>();

const emailUpdatesApi = useBackendConversationEmailUpdatesApi();
const apiScopes = ref<readonly ConversationEmailUpdateScope[]>([]);
const displayScopes = computed(() =>
  mapConversationEmailUpdateScopes(apiScopes.value)
);
const selectedScopeId = ref("");
const selectedConversationIds = ref<readonly string[]>([]);
const activeTab = ref<WorkspaceTab>(props.initialTab);
const subject = ref("");
const bodyHtml = ref("");
const bodyPlainText = ref("");
const contentConfirmed = ref(false);
const notice = ref<string | undefined>(undefined);
const testedDraftKey = ref<string | undefined>(undefined);
const successfulUpdateId = ref<string | undefined>(undefined);
const successfulTestAttemptId = ref<string | undefined>(undefined);
const showSendDialog = ref(false);
const isLoadingWorkspace = ref(true);
const workspaceError = ref<string | undefined>(undefined);
const isLoadingHistory = ref(false);
const isLoadingMoreHistory = ref(false);
const historyError = ref<string | undefined>(undefined);
const history = ref<readonly ConversationUpdateHistoryRecord[]>([]);
const historyNextCursor = ref<string | undefined>(undefined);
const hasLoadedHistory = ref(false);
const resolvedContext = ref<
  ConversationEmailUpdateWorkspaceRequest["context"] | undefined
>(undefined);
const audienceEstimate = ref(0);
const audienceEstimateAvailable = ref(false);
const relatedConversationOwnerCount = ref(0);
let audienceRequestId = 0;
let historyRequestId = 0;
let workspaceGeneration = 0;
let activeTestAttemptId: string | undefined;
const activeTestOperationId = ref<number | undefined>(undefined);
let nextTestOperationId = 0;
let isUnmounted = false;

const scopes = computed<readonly ConversationUpdateScopeSummary[]>(() =>
  displayScopes.value.map((scope) =>
    scope.kind === "no-project"
      ? { ...scope, contactEmail: currentNoProjectContactEmail.value }
      : scope
  )
);

const currentScope = computed(() =>
  scopes.value.find((scope) => scope.id === selectedScopeId.value)
);
const selectedConversations = computed(() =>
  getSelectedConversations({
    scope: currentScope.value,
    selectedConversationIds: selectedConversationIds.value,
  })
);
const currentNoProjectContactEmail = computed(() => {
  const selectedConversationId = selectedConversationIds.value.at(0);
  const noProjectScope = apiScopes.value.find(
    (scope) => scope.kind === "no_project"
  );
  return (
    noProjectScope?.conversations.find(
      (conversation) =>
        conversation.conversationSlugId === selectedConversationId
    )?.participantContactEmail ?? ""
  );
});
const currentContactEmail = computed(() =>
  currentScope.value?.kind === "no-project"
    ? currentNoProjectContactEmail.value
    : (currentScope.value?.contactEmail ?? "")
);
const updatesDisabledConversationIds = computed(() =>
  apiScopes.value.flatMap((scope) =>
    scope.conversations
      .filter((conversation) => !conversation.sendingEnabled)
      .map((conversation) => conversation.conversationSlugId)
  )
);
const currentDraftKey = computed(() =>
  createTestedDraftKey({
    scopeId: selectedScopeId.value,
    contactEmail: currentContactEmail.value,
    selectedConversationIds: selectedConversationIds.value,
    subject: subject.value,
    bodyHtml: bodyHtml.value,
  })
);
const hasSuccessfulTest = computed(
  () => testedDraftKey.value === currentDraftKey.value
);
const formattedAudienceEstimate = computed(() =>
  new Intl.NumberFormat().format(audienceEstimate.value)
);
const contextKey = computed(() => JSON.stringify(props.context));

watch(selectedScopeId, () => {
  const conversationIds = new Set(
    currentScope.value?.conversations.map((conversation) => conversation.id) ??
      []
  );
  if (
    selectedConversationIds.value.length > 0 &&
    selectedConversationIds.value.every((id) => conversationIds.has(id))
  ) {
    return;
  }
  selectedConversationIds.value = getInitialConversationIds(currentScope.value);
});

watch(
  currentDraftKey,
  () => {
    testedDraftKey.value = undefined;
    successfulUpdateId.value = undefined;
    successfulTestAttemptId.value = undefined;
    activeTestAttemptId = undefined;
    activeTestOperationId.value = undefined;
  },
  { flush: "sync" }
);

watch(
  () => JSON.stringify([selectedScopeId.value, selectedConversationIds.value]),
  async () => {
    await loadAudienceEstimate();
  }
);

watch(
  contextKey,
  () => {
    resetScopeState();
    void loadWorkspace();
  },
  { immediate: true, flush: "sync" }
);

watch(
  () => props.initialTab,
  (nextTab, previousTab) => {
    activeTab.value = nextTab;
    if (
      nextTab === "history" &&
      previousTab !== undefined &&
      resolvedContext.value !== undefined &&
      !hasLoadedHistory.value &&
      !isLoadingHistory.value
    ) {
      void loadHistory();
    }
  }
);

function resetScopeState(): void {
  workspaceGeneration += 1;
  audienceRequestId += 1;
  historyRequestId += 1;
  activeTestAttemptId = undefined;
  activeTestOperationId.value = undefined;
  apiScopes.value = [];
  selectedScopeId.value = "";
  selectedConversationIds.value = [];
  activeTab.value = props.initialTab;
  subject.value = "";
  bodyHtml.value = "";
  bodyPlainText.value = "";
  contentConfirmed.value = false;
  notice.value = undefined;
  testedDraftKey.value = undefined;
  successfulUpdateId.value = undefined;
  successfulTestAttemptId.value = undefined;
  showSendDialog.value = false;
  isLoadingWorkspace.value = true;
  workspaceError.value = undefined;
  isLoadingHistory.value = false;
  isLoadingMoreHistory.value = false;
  historyError.value = undefined;
  history.value = [];
  historyNextCursor.value = undefined;
  hasLoadedHistory.value = false;
  resolvedContext.value = undefined;
  audienceEstimate.value = 0;
  audienceEstimateAvailable.value = false;
  relatedConversationOwnerCount.value = 0;
}

async function loadWorkspace(): Promise<void> {
  const generation = workspaceGeneration;
  const context = copyContext(props.context);
  isLoadingWorkspace.value = true;
  workspaceError.value = undefined;
  try {
    const response = await emailUpdatesApi.getWorkspace({ context });
    if (generation !== workspaceGeneration) {
      return;
    }
    if (!response.success) {
      workspaceError.value = getWorkspaceError(response.reason);
      return;
    }
    apiScopes.value = response.scopes;
    resolvedContext.value = response.resolvedContext;
    const initialSelection = response.initialSelection;
    if (initialSelection?.kind === "project") {
      selectedScopeId.value = initialSelection.projectSlug;
      selectedConversationIds.value = initialSelection.conversationSlugIds;
    } else if (initialSelection?.kind === "no_project") {
      selectedScopeId.value = "no-project";
      selectedConversationIds.value = [initialSelection.conversationSlugId];
    } else {
      const firstScope = displayScopes.value.at(0);
      selectedScopeId.value = firstScope?.id ?? "";
      selectedConversationIds.value = getInitialConversationIds(firstScope);
    }
    if (activeTab.value === "history") {
      void loadHistory();
    }
  } catch (error) {
    if (generation !== workspaceGeneration) {
      return;
    }
    console.error("Failed to load Email Updates workspace", error);
    workspaceError.value = "Email Updates are unavailable right now.";
  } finally {
    if (generation === workspaceGeneration) {
      isLoadingWorkspace.value = false;
    }
  }
}

async function loadAudienceEstimate(): Promise<void> {
  audienceEstimateAvailable.value = false;
  const scope = currentScope.value;
  if (scope === undefined) {
    audienceEstimate.value = 0;
    relatedConversationOwnerCount.value = 0;
    return;
  }
  const selection = createConversationEmailUpdateSelection({
    scope,
    selectedConversationIds: selectedConversationIds.value,
  });
  if (selection === undefined) {
    audienceEstimate.value = 0;
    relatedConversationOwnerCount.value = 0;
    return;
  }

  const requestId = ++audienceRequestId;
  const generation = workspaceGeneration;
  try {
    const response = await emailUpdatesApi.estimateAudience({ selection });
    if (requestId !== audienceRequestId || generation !== workspaceGeneration) {
      return;
    }
    if (!response.success) {
      audienceEstimate.value = 0;
      relatedConversationOwnerCount.value = 0;
      notice.value = `Audience estimate unavailable: ${response.reason.replaceAll("_", " ")}.`;
      return;
    }
    audienceEstimate.value = response.estimatedEligibleRecipientCount;
    relatedConversationOwnerCount.value = response.requiredOwnerCopyCount;
    audienceEstimateAvailable.value = true;
  } catch (error) {
    console.error("Failed to estimate Email Update audience", error);
    if (requestId === audienceRequestId && generation === workspaceGeneration) {
      notice.value = "The audience estimate could not be loaded.";
    }
  }
}

async function loadHistory(): Promise<void> {
  const context = resolvedContext.value;
  if (context === undefined) {
    return;
  }
  const requestId = ++historyRequestId;
  const generation = workspaceGeneration;
  isLoadingHistory.value = true;
  isLoadingMoreHistory.value = false;
  historyError.value = undefined;
  try {
    const response = await emailUpdatesApi.listHistory({ context, limit: 20 });
    if (!isCurrentHistoryRequest({ requestId, generation })) {
      return;
    }
    if (!response.success) {
      historyError.value = "Email Update history is unavailable right now.";
      return;
    }
    const records = loadHistoryRecords(response.items);
    if (!isCurrentHistoryRequest({ requestId, generation })) {
      return;
    }
    history.value = records;
    historyNextCursor.value = response.nextCursor;
    hasLoadedHistory.value = true;
  } catch (error) {
    if (!isCurrentHistoryRequest({ requestId, generation })) {
      return;
    }
    console.error("Failed to load Email Update history", error);
    historyError.value = "Email Update history is unavailable right now.";
  } finally {
    if (isCurrentHistoryRequest({ requestId, generation })) {
      isLoadingHistory.value = false;
    }
  }
}

async function loadMoreHistory(): Promise<void> {
  const context = resolvedContext.value;
  const cursor = historyNextCursor.value;
  if (
    context === undefined ||
    cursor === undefined ||
    isLoadingMoreHistory.value
  ) {
    return;
  }

  const requestId = historyRequestId;
  const generation = workspaceGeneration;
  isLoadingMoreHistory.value = true;
  historyError.value = undefined;
  try {
    const response = await emailUpdatesApi.listHistory({
      context,
      cursor,
      limit: 20,
    });
    if (!isCurrentHistoryRequest({ requestId, generation })) {
      return;
    }
    if (!response.success) {
      historyError.value = "More Email Update history could not be loaded.";
      return;
    }
    const records = loadHistoryRecords(response.items);
    if (!isCurrentHistoryRequest({ requestId, generation })) {
      return;
    }
    const existingIds = new Set(history.value.map((record) => record.id));
    history.value = [
      ...history.value,
      ...records.filter((record) => !existingIds.has(record.id)),
    ];
    historyNextCursor.value = response.nextCursor;
  } catch (error) {
    if (!isCurrentHistoryRequest({ requestId, generation })) {
      return;
    }
    console.error("Failed to load more Email Update history", error);
    historyError.value = "More Email Update history could not be loaded.";
  } finally {
    if (isCurrentHistoryRequest({ requestId, generation })) {
      isLoadingMoreHistory.value = false;
    }
  }
}

function loadHistoryRecords(
  items: readonly ConversationEmailUpdateHistoryRecord[]
): readonly ConversationUpdateHistoryRecord[] {
  return items.map((record) => mapConversationEmailUpdateHistoryRecord(record));
}

function isCurrentHistoryRequest({
  requestId,
  generation,
}: {
  requestId: number;
  generation: number;
}): boolean {
  return requestId === historyRequestId && generation === workspaceGeneration;
}

async function sendTest(): Promise<void> {
  const generation = workspaceGeneration;
  const scope = currentScope.value;
  if (
    scope === undefined ||
    activeTestAttemptId !== undefined ||
    activeTestOperationId.value !== undefined
  ) {
    return;
  }
  const selection = createConversationEmailUpdateSelection({
    scope,
    selectedConversationIds: selectedConversationIds.value,
  });
  if (selection === undefined) {
    return;
  }
  const draftKey = currentDraftKey.value;
  const operationId = ++nextTestOperationId;
  activeTestOperationId.value = operationId;
  notice.value = "Queueing your test email...";
  try {
    const response = await emailUpdatesApi.sendTest({
      selection,
      subject: subject.value,
      bodyHtml: bodyHtml.value,
    });
    if (
      generation !== workspaceGeneration ||
      currentDraftKey.value !== draftKey ||
      activeTestOperationId.value !== operationId
    ) {
      return;
    }
    if (!response.success) {
      notice.value = `Test email failed: ${response.reason.replaceAll("_", " ")}.`;
      return;
    }
    activeTestAttemptId = response.testAttemptId;
    notice.value =
      "Test queued. Waiting for the email provider to accept it...";
    await pollTestStatus({
      updateId: response.updateId,
      testAttemptId: response.testAttemptId,
      draftKey,
      generation,
    });
  } catch (error) {
    if (generation !== workspaceGeneration) {
      return;
    }
    console.error("Failed to send Email Update test", error);
    notice.value = "The test email could not be queued.";
    activeTestAttemptId = undefined;
  } finally {
    if (activeTestOperationId.value === operationId) {
      activeTestOperationId.value = undefined;
    }
  }
}

async function pollTestStatus({
  updateId,
  testAttemptId,
  draftKey,
  generation,
}: {
  updateId: string;
  testAttemptId: string;
  draftKey: string;
  generation: number;
}): Promise<void> {
  while (
    !isUnmounted &&
    generation === workspaceGeneration &&
    activeTestAttemptId === testAttemptId
  ) {
    await waitForTestPoll();
    if (
      isUnmounted ||
      generation !== workspaceGeneration ||
      activeTestAttemptId !== testAttemptId
    ) {
      return;
    }
    try {
      const response = await emailUpdatesApi.getTestStatus({ testAttemptId });
      if (
        activeTestAttemptId !== testAttemptId ||
        generation !== workspaceGeneration ||
        currentDraftKey.value !== draftKey
      ) {
        return;
      }
      if (!response.success) {
        if (response.reason === "test_not_found") {
          notice.value = "The queued test email could not be found.";
          activeTestAttemptId = undefined;
          return;
        }
        notice.value =
          "Waiting for the email provider. Test status is temporarily unavailable...";
        continue;
      }
      if (response.status.state === "provider_accepted") {
        testedDraftKey.value = draftKey;
        successfulUpdateId.value = updateId;
        successfulTestAttemptId.value = testAttemptId;
        activeTestAttemptId = undefined;
        notice.value = "Test accepted for this exact email version.";
        return;
      }
      if (response.status.state === "failed") {
        notice.value = `Test delivery failed: ${response.status.reason.replaceAll("_", " ")}.`;
        activeTestAttemptId = undefined;
        return;
      }
    } catch (error) {
      if (generation !== workspaceGeneration) {
        return;
      }
      console.error("Failed to poll Email Update test status", error);
      notice.value =
        "Waiting for the email provider. Test status is temporarily unavailable...";
    }
  }
}

async function waitForTestPoll(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 1_500);
  });
}

function updateActiveTab(value: string | number): void {
  if (value === "compose" || value === "history") {
    activeTab.value = value;
    if (
      value === "history" &&
      resolvedContext.value !== undefined &&
      !hasLoadedHistory.value &&
      !isLoadingHistory.value
    ) {
      void loadHistory();
    }
  }
}

async function sendUpdate(): Promise<void> {
  const generation = workspaceGeneration;
  const updateId = successfulUpdateId.value;
  const testAttemptId = successfulTestAttemptId.value;
  if (
    updateId === undefined ||
    testAttemptId === undefined ||
    !hasSuccessfulTest.value ||
    !audienceEstimateAvailable.value ||
    !contentConfirmed.value
  ) {
    return;
  }
  try {
    const response = await emailUpdatesApi.send({
      updateId,
      testAttemptId,
      displayedParticipantEstimate: audienceEstimate.value,
      contentPolicyAcknowledged: true,
    });
    if (generation !== workspaceGeneration) {
      return;
    }
    if (!response.success) {
      notice.value = `Update not sent: ${response.reason.replaceAll("_", " ")}.`;
      return;
    }
    history.value = [
      mapConversationEmailUpdateHistoryRecord(response.record),
      ...history.value.filter(
        (record) => record.id !== response.record.updateId
      ),
    ];
    hasLoadedHistory.value = true;
    notice.value = undefined;
    contentConfirmed.value = false;
    testedDraftKey.value = undefined;
    successfulUpdateId.value = undefined;
    successfulTestAttemptId.value = undefined;
    activeTab.value = "history";
  } catch (error) {
    if (generation !== workspaceGeneration) {
      return;
    }
    console.error("Failed to send Email Update", error);
    notice.value = "The update could not be sent.";
  }
}

function copyContext(
  context: ConversationEmailUpdateWorkspaceRequest["context"]
): ConversationEmailUpdateWorkspaceRequest["context"] {
  if (context.kind === "project") {
    return { kind: "project", projectSlug: context.projectSlug };
  }
  if (context.kind === "conversation") {
    return {
      kind: "conversation",
      conversationSlugId: context.conversationSlugId,
    };
  }
  return { kind: "global" };
}

function getWorkspaceError(
  reason:
    | "context_not_found"
    | "feature_not_available"
    | "workspace_unavailable"
): string {
  return reason === "context_not_found"
    ? "This Email Updates context could not be found."
    : "Email Updates are unavailable right now.";
}

onBeforeUnmount(() => {
  isUnmounted = true;
  workspaceGeneration += 1;
  historyRequestId += 1;
  audienceRequestId += 1;
  activeTestAttemptId = undefined;
  activeTestOperationId.value = undefined;
});
</script>

<style scoped lang="scss">
.updates-workspace {
  display: grid;
  gap: 1rem;
  width: min(100%, 78rem);
  margin-inline: auto;
  padding: 1rem;

  &__intro {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    padding: clamp(1.25rem, 4vw, 2.5rem);
    border: 1px solid rgba($primary, 0.2);
    border-radius: 1.25rem;
    background:
      radial-gradient(
        circle at top right,
        rgba($primary, 0.14),
        transparent 45%
      ),
      $color-background-default;

    span {
      color: $primary;
      font-size: 0.78rem;
      font-weight: var(--font-weight-semibold);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    h1 {
      max-width: 38rem;
      margin: 0.35rem 0 0.65rem;
      color: $color-text-strong;
      font-size: clamp(1.5rem, 4vw, 2.35rem);
      line-height: 1.12;
    }

    p {
      max-width: 42rem;
      margin: 0;
      color: $color-text-weak;
      line-height: 1.55;
    }

    > .q-icon {
      flex: 0 0 auto;
      color: $primary;
    }
  }

  &__tabs {
    border-bottom: 1px solid $grey-4;
  }

  &__panels,
  &__panel {
    padding: 0;
    background: transparent;
  }

  &__compose-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(20rem, 0.92fr);
    align-items: start;
    gap: 1rem;
  }

  &__preview {
    position: sticky;
    top: 1rem;
  }

  &__send-summary {
    display: grid;
    gap: 0.75rem;

    p {
      margin: 0;
      color: $color-text-weak;
      line-height: 1.5;
    }
  }

  &__history-more {
    display: flex;
    justify-content: center;
    margin-block-start: 1rem;
  }
}

@media (max-width: $breakpoint-sm-max) {
  .updates-workspace {
    &__intro > .q-icon {
      display: none;
    }

    &__compose-grid {
      grid-template-columns: 1fr;
    }

    &__preview {
      position: static;
    }
  }
}
</style>
