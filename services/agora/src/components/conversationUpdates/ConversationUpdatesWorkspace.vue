<template>
  <section class="updates-workspace">
    <div class="updates-workspace__intro">
      <div>
        <h1>{{ t("introTitle") }}</h1>
        <p>{{ t("introDescription") }}</p>
      </div>
      <q-icon name="mdi-email-fast-outline" size="2.25rem" />
    </div>

    <ZKLiveRegion :message="audienceEstimateError ?? ''" politeness="polite" />

    <PageLoadingSpinner v-if="isLoadingWorkspace" />

    <ErrorRetryBlock
      v-else-if="workspaceError !== undefined"
      :title="workspaceError"
      :retry-label="t('tryAgain')"
      @retry="loadWorkspace"
    />

    <template v-else>
      <ZKInfoBanner
        v-if="testDestinationEmail === undefined"
        :message="t('verifyEmailBanner')"
        :action-label="t('verifyEmail')"
        variant="warning"
        @action="showEmailVerificationDialog = true"
      />
      <ZKInfoBanner
        v-if="activeTab === 'compose' && audienceEstimateError !== undefined"
        :message="audienceEstimateError"
        :action-label="t('retry')"
        variant="warning"
        @action="loadAudienceEstimate"
      />

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
        <q-tab
          name="compose"
          icon="mdi-email-edit-outline"
          :label="t('compose')"
        />
        <q-tab name="history" icon="mdi-history" :label="t('history')" />
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
              :send-pending="isSendingUpdate"
              :has-successful-test="hasSuccessfulTest"
              :audience-estimate-state="audienceEstimateState"
              :test-destination-email="testDestinationEmail"
              @test="sendTest"
              @send="showSendDialog = true"
            >
              <template #preview>
                <div
                  v-if="$q.screen.lt.md"
                  class="updates-workspace__preview updates-workspace__preview--mobile"
                >
                  <ConversationUpdateEmailPreview
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
              </template>
            </ConversationUpdateComposerForm>

            <div v-if="!$q.screen.lt.md" class="updates-workspace__preview">
              <ConversationUpdateEmailPreview
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
          </div>
        </q-tab-panel>

        <q-tab-panel name="history" class="updates-workspace__panel">
          <PageLoadingSpinner v-if="isLoadingHistory && history.length === 0" />
          <ErrorRetryBlock
            v-else-if="historyError !== undefined && history.length === 0"
            :title="historyError"
            :retry-label="t('tryAgain')"
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
                :label="t('loadMore')"
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
    :title="t('sendDialogTitle')"
    :confirm-text="t('sendUpdate')"
    :cancel-text="t('cancel')"
    @confirm="sendUpdate"
  >
    <div class="updates-workspace__send-summary">
      <strong>{{
        t("audienceSummary", { count: formattedAudienceEstimate })
      }}</strong>
      <p>{{ t("sendWarning") }}</p>
    </div>
  </ZKConfirmDialog>

  <ZKConfirmDialog
    v-model="showEmailVerificationDialog"
    :title="t('verifyDialogTitle')"
    :confirm-text="t('continueVerification')"
    :cancel-text="t('notNow')"
    @confirm="startEmailVerification"
  >
    <p>{{ t("verifyDialogDescription") }}</p>
  </ZKConfirmDialog>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
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
import {
  CONVERSATION_UPDATE_NO_PROJECT_SCOPE_ID,
  type ConversationUpdateAudienceEstimateState,
  type ConversationUpdateHistoryRecord,
  type ConversationUpdateScopeSummary,
} from "src/components/conversationUpdates/conversationUpdateTypes";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import ZKInfoBanner from "src/components/ui-library/ZKInfoBanner.vue";
import ZKLiveRegion from "src/components/ui-library/ZKLiveRegion.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  ConversationEmailUpdateHistoryRecord,
  ConversationEmailUpdateScope,
  ConversationEmailUpdateSendResponse,
  ConversationEmailUpdateSendTestResponse,
  ConversationEmailUpdateWorkspaceRequest,
} from "src/shared/types/dto";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { useBackendConversationEmailUpdatesApi } from "src/utils/api/conversationUpdates/conversationEmailUpdates";
import { useNotify } from "src/utils/ui/notify";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  type ConversationUpdatesWorkspaceTranslations,
  conversationUpdatesWorkspaceTranslations,
} from "./ConversationUpdatesWorkspace.i18n";

type WorkspaceTab = "compose" | "history";
type TestSendFailure = Extract<
  ConversationEmailUpdateSendTestResponse,
  { success: false }
>["error"];
type SendFailure = Extract<
  ConversationEmailUpdateSendResponse,
  { success: false }
>;

const props = defineProps<{
  initialTab: WorkspaceTab;
  context: ConversationEmailUpdateWorkspaceRequest["context"];
}>();

const AUDIENCE_ESTIMATE_DEBOUNCE_MS = 250;
const $q = useQuasar();
const { t, locale } =
  useComponentI18n<ConversationUpdatesWorkspaceTranslations>(
    conversationUpdatesWorkspaceTranslations
  );
const emailUpdatesApi = useBackendConversationEmailUpdatesApi();
const notify = useNotify();
const route = useRoute();
const router = useRouter();
const loginIntentionStore = useLoginIntentionStore();
const flowStore = onboardingFlowStore();
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
const testedDraftKey = ref<string | undefined>(undefined);
const successfulUpdateId = ref<string | undefined>(undefined);
const successfulTestAttemptId = ref<string | undefined>(undefined);
const showSendDialog = ref(false);
const showEmailVerificationDialog = ref(false);
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
const audienceEstimateError = ref<string | undefined>(undefined);
const testDestinationEmail = ref<string | undefined>(undefined);
const relatedConversationOwnerCount = ref(0);
let audienceRequestId = 0;
let audienceEstimateTimer: number | undefined;
let audienceAbortController: AbortController | undefined;
let historyRequestId = 0;
let workspaceGeneration = 0;
let activeTestAttemptId: string | undefined;
const activeTestOperationId = ref<number | undefined>(undefined);
const isSendingUpdate = ref(false);
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
const currentSelection = computed(() => {
  const scope = currentScope.value;
  return scope === undefined
    ? undefined
    : createConversationEmailUpdateSelection({
        scope,
        selectedConversationIds: selectedConversationIds.value,
      });
});
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
  new Intl.NumberFormat(locale.value).format(audienceEstimate.value)
);
const audienceEstimateState = computed<ConversationUpdateAudienceEstimateState>(
  () => {
    if (audienceEstimateError.value !== undefined) {
      return { kind: "error" };
    }
    if (!audienceEstimateAvailable.value) {
      return { kind: "loading" };
    }
    return {
      kind: "ready",
      eligibleParticipantCount: audienceEstimate.value,
      ownerCopyCount: relatedConversationOwnerCount.value,
    };
  }
);
const contextKey = computed(() => JSON.stringify(props.context));

watch(selectedScopeId, () => {
  const conversationIds = new Set(
    currentScope.value?.conversations.map((conversation) => conversation.id) ??
      []
  );
  if (selectedConversationIds.value.every((id) => conversationIds.has(id))) {
    return;
  }
  selectedConversationIds.value = [];
});

watch(
  currentDraftKey,
  () => {
    clearSuccessfulTestAuthorization();
    activeTestAttemptId = undefined;
    activeTestOperationId.value = undefined;
  },
  { flush: "sync" }
);

watch(
  () => JSON.stringify([selectedScopeId.value, selectedConversationIds.value]),
  scheduleAudienceEstimate
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

watch(activeTab, (tab) => {
  void router.replace({
    query: {
      ...route.query,
      tab,
    },
  });
});

function resetScopeState(): void {
  workspaceGeneration += 1;
  audienceRequestId += 1;
  cancelAudienceEstimate();
  historyRequestId += 1;
  activeTestAttemptId = undefined;
  activeTestOperationId.value = undefined;
  isSendingUpdate.value = false;
  apiScopes.value = [];
  selectedScopeId.value = "";
  selectedConversationIds.value = [];
  activeTab.value = props.initialTab;
  subject.value = "";
  bodyHtml.value = "";
  bodyPlainText.value = "";
  contentConfirmed.value = false;
  clearSuccessfulTestAuthorization();
  showSendDialog.value = false;
  showEmailVerificationDialog.value = false;
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
  audienceEstimateError.value = undefined;
  testDestinationEmail.value = undefined;
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
    testDestinationEmail.value = response.testDestinationEmail;
    const initialSelection = response.initialSelection;
    if (initialSelection?.kind === "project") {
      selectedScopeId.value = initialSelection.projectSlug;
      selectedConversationIds.value = initialSelection.conversationSlugIds;
    } else if (initialSelection?.kind === "no_project") {
      selectedScopeId.value = CONVERSATION_UPDATE_NO_PROJECT_SCOPE_ID;
      selectedConversationIds.value = [initialSelection.conversationSlugId];
    } else if (response.resolvedContext.kind === "project") {
      selectedScopeId.value = response.resolvedContext.projectSlug;
      selectedConversationIds.value = [];
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
    workspaceError.value = t("workspaceUnavailable");
  } finally {
    if (generation === workspaceGeneration) {
      isLoadingWorkspace.value = false;
    }
  }
}

async function loadAudienceEstimate(): Promise<void> {
  cancelAudienceEstimate();
  audienceEstimateAvailable.value = false;
  audienceEstimateError.value = undefined;
  if (testDestinationEmail.value === undefined) {
    audienceEstimate.value = 0;
    relatedConversationOwnerCount.value = 0;
    return;
  }
  const selection = currentSelection.value;
  if (selection === undefined) {
    audienceEstimate.value = 0;
    relatedConversationOwnerCount.value = 0;
    return;
  }

  const requestId = ++audienceRequestId;
  const generation = workspaceGeneration;
  const abortController = new AbortController();
  audienceAbortController = abortController;
  try {
    const response = await emailUpdatesApi.estimateAudience({
      request: { selection },
      signal: abortController.signal,
    });
    if (requestId !== audienceRequestId || generation !== workspaceGeneration) {
      return;
    }
    if (!response.success) {
      audienceEstimate.value = 0;
      relatedConversationOwnerCount.value = 0;
      audienceEstimateError.value = getAudienceEstimateError(response.reason);
      return;
    }
    audienceEstimate.value = response.estimatedEligibleRecipientCount;
    relatedConversationOwnerCount.value = response.requiredOwnerCopyCount;
    audienceEstimateAvailable.value = true;
  } catch (error) {
    if (abortController.signal.aborted) {
      return;
    }
    console.error("Failed to estimate Email Update audience", error);
    if (requestId === audienceRequestId && generation === workspaceGeneration) {
      audienceEstimate.value = 0;
      relatedConversationOwnerCount.value = 0;
      audienceEstimateError.value = t("audienceEstimateUnavailable");
    }
  } finally {
    if (audienceAbortController === abortController) {
      audienceAbortController = undefined;
    }
  }
}

function scheduleAudienceEstimate(): void {
  cancelAudienceEstimate();
  audienceRequestId += 1;
  audienceEstimateAvailable.value = false;
  audienceEstimateError.value = undefined;
  audienceEstimateTimer = window.setTimeout(() => {
    audienceEstimateTimer = undefined;
    void loadAudienceEstimate();
  }, AUDIENCE_ESTIMATE_DEBOUNCE_MS);
}

function cancelAudienceEstimate(): void {
  if (audienceEstimateTimer !== undefined) {
    window.clearTimeout(audienceEstimateTimer);
    audienceEstimateTimer = undefined;
  }
  audienceAbortController?.abort();
  audienceAbortController = undefined;
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
      historyError.value = t("historyUnavailable");
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
    historyError.value = t("historyUnavailable");
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
      historyError.value = t("moreHistoryUnavailable");
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
    historyError.value = t("moreHistoryUnavailable");
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
  const selection = currentSelection.value;
  if (
    selection === undefined ||
    testDestinationEmail.value === undefined ||
    !audienceEstimateAvailable.value ||
    audienceEstimate.value === 0 ||
    activeTestAttemptId !== undefined ||
    activeTestOperationId.value !== undefined ||
    isSendingUpdate.value
  ) {
    return;
  }
  const draftKey = currentDraftKey.value;
  const operationId = ++nextTestOperationId;
  activeTestOperationId.value = operationId;
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
      reconcileTestSendFailure(response.error);
      notify.showNotifyMessage(getTestSendFailureMessage(response.error));
      return;
    }
    activeTestAttemptId = response.testAttemptId;
    await pollTestStatus({
      updateId: response.updateId,
      testAttemptId: response.testAttemptId,
      draftKey,
      generation,
    });
  } catch (error) {
    if (
      generation !== workspaceGeneration ||
      currentDraftKey.value !== draftKey ||
      activeTestOperationId.value !== operationId
    ) {
      return;
    }
    console.error("Failed to send Email Update test", error);
    notify.showNotifyMessage(t("testQueueUnavailable"));
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
          notify.showNotifyMessage(t("queuedTestNotFound"));
          activeTestAttemptId = undefined;
          return;
        }
        continue;
      }
      if (response.status.state === "provider_accepted") {
        testedDraftKey.value = draftKey;
        successfulUpdateId.value = updateId;
        successfulTestAttemptId.value = testAttemptId;
        activeTestAttemptId = undefined;
        notify.showNotifyMessage(t("testAccepted"));
        return;
      }
      if (response.status.state === "failed") {
        notify.showNotifyMessage(
          getTestDeliveryFailureMessage(response.status.reason)
        );
        activeTestAttemptId = undefined;
        return;
      }
    } catch (error) {
      if (
        generation !== workspaceGeneration ||
        currentDraftKey.value !== draftKey ||
        activeTestAttemptId !== testAttemptId
      ) {
        return;
      }
      console.error("Failed to poll Email Update test status", error);
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
    audienceEstimate.value === 0 ||
    !contentConfirmed.value ||
    isSendingUpdate.value
  ) {
    return;
  }
  isSendingUpdate.value = true;
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
      reconcileSendFailure(response);
      notify.showNotifyMessage(getSendFailureMessage(response));
      return;
    }
    history.value = [
      mapConversationEmailUpdateHistoryRecord(response.record),
      ...history.value.filter(
        (record) => record.id !== response.record.updateId
      ),
    ];
    hasLoadedHistory.value = true;
    contentConfirmed.value = false;
    clearSuccessfulTestAuthorization();
    activeTab.value = "history";
  } catch (error) {
    if (generation !== workspaceGeneration) {
      return;
    }
    console.error("Failed to send Email Update", error);
    notify.showNotifyMessage(t("updateSendUnavailable"));
  } finally {
    if (generation === workspaceGeneration) {
      isSendingUpdate.value = false;
    }
  }
}

async function startEmailVerification(): Promise<void> {
  loginIntentionStore.createEmailUpdatesIntention(route.fullPath);
  flowStore.onboardingMode = "LOGIN";
  await router.push({ name: "/verify/email/" });
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
  reason: "context_not_found" | "feature_not_available"
): string {
  return reason === "context_not_found"
    ? t("contextNotFound")
    : t("workspaceUnavailable");
}

function getAudienceEstimateError(
  reason: "scope_not_found" | "conversation_not_in_scope" | "sending_disabled"
): string {
  switch (reason) {
    case "scope_not_found":
      return t("scopeUnavailable");
    case "conversation_not_in_scope":
      return t("conversationsUnavailable");
    case "sending_disabled":
      return t("sendingDisabled");
  }
}

function clearSuccessfulTestAuthorization(): void {
  testedDraftKey.value = undefined;
  successfulUpdateId.value = undefined;
  successfulTestAttemptId.value = undefined;
}

function reconcileTestSendFailure(error: TestSendFailure): void {
  switch (error.reason) {
    case "no_verified_test_email":
      testDestinationEmail.value = undefined;
      return;
    case "no_eligible_participants":
      audienceEstimate.value = 0;
      audienceEstimateAvailable.value = true;
      return;
    case "scope_not_found":
    case "conversation_not_in_scope":
    case "missing_participant_contact_email":
    case "sending_disabled":
      void loadWorkspace();
      return;
    case "content_invalid":
    case "test_rate_limited":
      return;
  }
}

function reconcileSendFailure(response: SendFailure): void {
  switch (response.reason) {
    case "test_not_found":
    case "test_not_accepted":
    case "test_used":
      clearSuccessfulTestAuthorization();
      return;
    case "sending_disabled":
      void loadWorkspace();
      return;
    case "no_eligible_participants":
      audienceEstimate.value = 0;
      audienceEstimateAvailable.value = true;
      return;
    case "delivery_already_active":
    case "required_owner_copy_unavailable":
      return;
  }
}

function getTestSendFailureMessage(error: TestSendFailure): string {
  switch (error.reason) {
    case "scope_not_found":
      return t("scopeUnavailable");
    case "conversation_not_in_scope":
      return t("conversationsUnavailable");
    case "content_invalid":
      return t("contentInvalid");
    case "missing_participant_contact_email":
      return t("missingContactEmail");
    case "no_verified_test_email":
      return t("verifyBeforeTest");
    case "no_eligible_participants":
      return t("noEligibleParticipants");
    case "sending_disabled":
      return t("sendingDisabled");
    case "test_rate_limited":
      return t("testRateLimited", {
        retryAt: error.retryAt.toLocaleString(locale.value),
      });
  }
}

function getSendFailureMessage(response: SendFailure): string {
  switch (response.reason) {
    case "test_not_found":
      return t("successfulTestNotFound");
    case "test_not_accepted":
      return t("testNotAccepted");
    case "test_used":
      return t("testUsed");
    case "sending_disabled":
      return t("sendingDisabled");
    case "no_eligible_participants":
      return t("noEligibleParticipants");
    case "delivery_already_active":
      return t("deliveryAlreadyActive");
    case "required_owner_copy_unavailable":
      return t("ownerCopyUnavailable");
  }
}

function getTestDeliveryFailureMessage(
  reason:
    | "retryable_rejected"
    | "permanent_rejected"
    | "authorization_rejected"
    | "unknown"
): string {
  switch (reason) {
    case "retryable_rejected":
      return t("testDeliveryRetryable");
    case "authorization_rejected":
      return t("testDeliveryAuthorization");
    case "permanent_rejected":
      return t("testDeliveryPermanent");
    case "unknown":
      return t("testDeliveryUnknown");
  }
}

onBeforeUnmount(() => {
  isUnmounted = true;
  workspaceGeneration += 1;
  historyRequestId += 1;
  audienceRequestId += 1;
  cancelAudienceEstimate();
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

      &--mobile {
        margin: 0 1rem 1rem;
      }
    }
  }
}
</style>
