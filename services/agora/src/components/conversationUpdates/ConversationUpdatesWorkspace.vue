<template>
  <section class="updates-workspace">
    <div class="updates-workspace__intro">
      <h1>{{ t("introTitle") }}</h1>
      <p>{{ t("introDescription") }}</p>
    </div>
    <PageLoadingSpinner v-if="isLoadingWorkspace" />
    <ErrorRetryBlock
      v-else-if="workspaceError"
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
      <q-tabs
        :model-value="activeTab"
        dense
        no-caps
        align="left"
        active-color="primary"
        indicator-color="primary"
        @update:model-value="updateActiveTab"
      >
        <q-tab
          name="compose"
          icon="mdi-email-edit-outline"
          :label="t('compose')"
          :disable="reviewFlow.busy.value"
        />
        <q-tab
          name="history"
          icon="mdi-history"
          :label="t('history')"
          :disable="reviewFlow.busy.value"
        />
      </q-tabs>
      <template v-if="activeTab === 'compose'">
        <template v-if="review !== undefined">
          <ConversationUpdateEmailPreview :review="review.snapshot" />
          <ZKInfoBanner
            v-if="review.test.kind === 'invalid'"
            :message="tReview('reviewInvalid')"
            variant="warning"
          />
          <ZKInfoBanner
            v-if="review.test.kind === 'send-unknown'"
            :message="tReview('sendUnknown')"
            variant="warning"
          />
          <ZKInfoBanner
            v-if="review.test.kind === 'retry'"
            :message="tReview('testUnknown')"
            variant="warning"
          />
          <ZKInfoBanner
            v-if="review.test.kind === 'delivery-accepted'"
            :message="tReview('deliveryAccepted')"
          />
          <ZKInfoBanner
            v-if="
              review.test.kind !== 'send-unknown' &&
              review.test.kind !== 'delivery-accepted'
            "
            :message="
              tComposer('testEmailNotice', {
                email: review.snapshot.testDestinationEmail,
              })
            "
          />
          <ZKInfoBanner
            :message="
              tComposer('ownerCopySummary', {
                participantCount:
                  review.snapshot.estimatedEligibleRecipientCount,
                managerCount: review.snapshot.requiredOwnerCopyCount,
              })
            "
          />
          <ZKInfoBanner
            :message="tComposer('policyWarning')"
            variant="warning"
          />
          <ZKCheckbox
            v-model="contentConfirmed"
            :label="tComposer('contentConfirmation')"
            :description="undefined"
            required
            :disabled="
              reviewFlow.busy.value ||
              review.test.kind === 'send-unknown' ||
              review.test.kind === 'delivery-accepted'
            "
          />
          <ErrorRetryBlock
            v-if="reviewFlow.testStatusFailed.value"
            :title="tReview('testStatusUnavailable')"
            :retry-label="t('retry')"
            @retry="reviewFlow.retryTestStatus"
          />
          <ErrorRetryBlock
            v-if="reviewFlow.error.value === 'cancelError'"
            :title="tReview('cancelError')"
            :retry-label="t('retry')"
            @retry="confirmLeave"
          />
          <ErrorRetryBlock
            v-if="reviewFlow.error.value === 'reconcileError'"
            :title="tReview('reconcileError')"
            :retry-label="tReview('checkDelivery')"
            @retry="reviewFlow.reconcile"
          />
          <div class="updates-workspace__actions">
            <PrimeButton
              severity="secondary"
              outlined
              :label="tReview('backToEdit')"
              :disabled="
                reviewFlow.busy.value ||
                review.test.kind === 'delivery-accepted'
              "
              @click="requestExit({ kind: 'edit' })"
            />
            <PrimeButton
              outlined
              severity="danger"
              :label="tReview('cancelUpdate')"
              :disabled="
                reviewFlow.busy.value ||
                review.test.kind === 'delivery-accepted'
              "
              @click="requestExit({ kind: 'clear' })"
            />
            <PrimeButton
              outlined
              severity="primary"
              icon="pi pi-envelope"
              :label="testButtonLabel"
              :loading="testPending && !reviewFlow.testStatusFailed.value"
              :disabled="
                testPending ||
                reviewFlow.busy.value ||
                review.test.kind === 'invalid' ||
                review.test.kind === 'send-unknown' ||
                review.test.kind === 'delivery-accepted'
              "
              @click="requestTest"
            />
            <PrimeButton
              severity="primary"
              icon="pi pi-send"
              :label="
                review.test.kind === 'send-unknown'
                  ? tReview('retrySendRequest')
                  : t('sendUpdate')
              "
              :loading="review.test.kind === 'sending'"
              :disabled="
                (review.test.kind !== 'send-unknown' &&
                  (review.test.kind !== 'accepted' || !contentConfirmed)) ||
                reviewFlow.busy.value
              "
              @click="requestSend"
            />
          </div>
          <PageLoadingSpinner
            v-if="review.kind === 'cancelling' || review.kind === 'reconciling'"
          />
        </template>
        <template v-else>
          <ZKInfoBanner
            v-if="audienceEstimateError"
            :message="audienceEstimateError"
            :action-label="t('retry')"
            variant="warning"
            @action="loadAudienceEstimate"
          />
          <ErrorRetryBlock
            v-if="reviewFlow.error.value === 'prepareError'"
            :title="tReview('prepareError')"
            :retry-label="t('retry')"
            @retry="prepareReview"
          />
          <ConversationUpdateComposerForm
            v-model:selected-scope-id="selectedScopeId"
            v-model:selected-conversation-ids="selectedConversationIds"
            v-model:subject="subject"
            v-model:body-html="bodyHtml"
            v-model:body-plain-text="bodyPlainText"
            :scopes="scopes"
            :updates-disabled-conversation-ids="updatesDisabledConversationIds"
            :prepare-pending="reviewFlow.state.value.kind === 'preparing'"
            :audience-estimate-state="audienceEstimateState"
            :test-destination-email="testDestinationEmail"
            @review="prepareReview"
          />
        </template>
      </template>
      <template v-else>
        <PageLoadingSpinner v-if="isLoadingHistory && history.length === 0" />
        <ErrorRetryBlock
          v-else-if="historyError && history.length === 0"
          :title="historyError"
          :retry-label="t('tryAgain')"
          @retry="loadHistory"
        />
        <template v-else>
          <ZKInfoBanner
            v-if="historyError"
            :message="historyError"
            variant="warning"
          />
          <ConversationUpdateHistoryList
            :records="history"
            :language="historyLanguage"
          />
          <PrimeButton
            v-if="historyNextCursor !== undefined"
            outlined
            severity="primary"
            :label="t('loadMore')"
            :loading="isLoadingMoreHistory"
            :disabled="isLoadingMoreHistory"
            @click="loadMoreHistory"
          />
        </template>
      </template>
    </template>
  </section>

  <ZKConfirmDialog
    v-model="showLeaveDialog"
    persistent
    :title="tReview('leaveTitle')"
    :actions="{
      cancel: { label: tReview('stay'), appearance: 'secondary-outlined' },
      confirm: { label: tReview('leave'), appearance: 'primary' },
    }"
    @cancel="stayInReview"
    @confirm="confirmLeave"
  >
    <p>
      {{
        tReview(
          review?.test.kind === "send-unknown"
            ? "leaveSendUnknown"
            : review?.testRequested
              ? "leaveTestWarning"
              : "leaveWarning"
        )
      }}
    </p>
    <p v-if="pendingExit?.kind === 'clear'">{{ tReview("cancelWarning") }}</p>
    <ErrorRetryBlock
      v-if="reviewFlow.error.value === 'cancelError'"
      :title="tReview('cancelError')"
      :retry-label="t('retry')"
      @retry="confirmLeave"
    />
  </ZKConfirmDialog>
  <ZKConfirmDialog
    v-model="showTestDialog"
    persistent
    :title="tComposer('testDialogTitle')"
    :actions="{
      cancel: { label: t('cancel'), appearance: 'secondary-outlined' },
      confirm: { label: tComposer('sendTest'), appearance: 'primary' },
    }"
    @confirm="reviewFlow.sendTest"
  >
    <p>
      {{
        tComposer("testEmailNotice", {
          email: review?.snapshot.testDestinationEmail ?? "",
        })
      }}
    </p>
  </ZKConfirmDialog>
  <ZKConfirmDialog
    v-model="showSendDialog"
    persistent
    :title="t('sendDialogTitle')"
    :actions="{
      cancel: { label: t('cancel'), appearance: 'secondary-outlined' },
      confirm: { label: t('sendUpdate'), appearance: 'primary' },
    }"
    @confirm="sendUpdate"
  >
    <strong>{{
      t("audienceSummary", { count: formattedAudienceEstimate })
    }}</strong>
    <p>{{ t("sendWarning") }}</p>
  </ZKConfirmDialog>
  <ZKConfirmDialog
    v-model="showEmailVerificationDialog"
    :title="t('verifyDialogTitle')"
    :actions="{
      cancel: { label: t('notNow'), appearance: 'secondary-outlined' },
      confirm: { label: t('continueVerification'), appearance: 'primary' },
    }"
    @confirm="startEmailVerification"
  >
    <p>{{ t("verifyDialogDescription") }}</p>
  </ZKConfirmDialog>
</template>

<script setup lang="ts">
import PrimeButton from "primevue/button";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKCheckbox from "src/components/ui-library/ZKCheckbox.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import ZKInfoBanner from "src/components/ui-library/ZKInfoBanner.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { parseSupportedDisplayLanguageOrUndefined } from "src/shared/languages";
import {
  type ConversationEmailUpdateScope,
  type ConversationEmailUpdateWorkspaceRequest,
  Dto,
} from "src/shared/types/dto";
import { useConversationUpdateComposerStore } from "src/stores/conversationUpdateComposer";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { useBackendConversationEmailUpdatesApi } from "src/utils/api/conversationUpdates/conversationEmailUpdates";
import { useNotify } from "src/utils/ui/notify";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRoute,
  useRouter,
} from "vue-router";

import { conversationUpdateComposerFormTranslations } from "./ConversationUpdateComposerForm.i18n";
import ConversationUpdateComposerForm from "./ConversationUpdateComposerForm.vue";
import ConversationUpdateEmailPreview from "./ConversationUpdateEmailPreview.vue";
import ConversationUpdateHistoryList from "./ConversationUpdateHistoryList.vue";
import {
  createConversationEmailUpdateSelection,
  getInitialConversationIds,
  mapConversationEmailUpdateHistoryRecord,
  mapConversationEmailUpdateScopes,
} from "./conversationUpdateLogic";
import { conversationUpdateReviewTranslations } from "./ConversationUpdateReview.i18n";
import {
  type ConversationUpdatesWorkspaceTranslations,
  conversationUpdatesWorkspaceTranslations,
} from "./ConversationUpdatesWorkspace.i18n";
import type {
  ConversationUpdateAudienceEstimateState,
  ConversationUpdateHistoryRecord,
} from "./conversationUpdateTypes";
import {
  type ReviewEvent,
  type ReviewFailure,
  useConversationUpdateReview,
} from "./useConversationUpdateReview";

type WorkspaceTab = "compose" | "history";
type ExitIntent =
  | { kind: "edit" | "clear" }
  | { kind: "tab"; tab: WorkspaceTab }
  | { kind: "route"; resolve: (allowed: boolean) => void };
const props = defineProps<{
  initialTab: WorkspaceTab;
  context: ConversationEmailUpdateWorkspaceRequest["context"];
}>();
const { t, locale } = useComponentI18n(
  conversationUpdatesWorkspaceTranslations
);
const { t: tReview } = useComponentI18n(conversationUpdateReviewTranslations);
const { t: tComposer } = useComponentI18n(
  conversationUpdateComposerFormTranslations
);
const emailUpdatesApi = useBackendConversationEmailUpdatesApi();
const notify = useNotify();
const route = useRoute();
const router = useRouter();
const loginIntentionStore = useLoginIntentionStore();
const flowStore = onboardingFlowStore();
const composerStore = useConversationUpdateComposerStore().forCurrentAccount();
let composerContext:
  | ConversationEmailUpdateWorkspaceRequest["context"]
  | undefined;
const historyLanguage = computed(
  () => parseSupportedDisplayLanguageOrUndefined(locale.value) ?? "en"
);
const apiScopes = ref<readonly ConversationEmailUpdateScope[]>([]);
const scopes = computed(() =>
  mapConversationEmailUpdateScopes(apiScopes.value)
);
const selectedScopeId = ref("");
const selectedConversationIds = ref<readonly string[]>([]);
const activeTab = ref<WorkspaceTab>(props.initialTab);
const subject = ref("");
const bodyHtml = ref("");
const bodyPlainText = ref("");
const contentConfirmed = ref(false);
const showSendDialog = ref(false);
const showTestDialog = ref(false);
const showLeaveDialog = ref(false);
const pendingExit = ref<ExitIntent>();
const showEmailVerificationDialog = ref(false);
const isLoadingWorkspace = ref(true);
const workspaceError = ref<string>();
const isLoadingHistory = ref(false);
const isLoadingMoreHistory = ref(false);
const historyError = ref<string>();
const history = ref<readonly ConversationUpdateHistoryRecord[]>([]);
const historyNextCursor = ref<string>();
const hasLoadedHistory = ref(false);
const resolvedContext =
  ref<ConversationEmailUpdateWorkspaceRequest["context"]>();
const audienceEstimateState = ref<ConversationUpdateAudienceEstimateState>({
  kind: "loading",
});
const audienceEstimateError = ref<string>();
const testDestinationEmail = ref<string>();
let generation = 0;
let audienceRequestId = 0;
let audienceTimer: number | undefined;
let audienceAbort: AbortController | undefined;
let historyRequestId = 0;
const reviewFlow = useConversationUpdateReview({
  notify: notifyReviewEvent,
  onSent(record) {
    stayInReview();
    showLeaveDialog.value = false;
    showSendDialog.value = false;
    showTestDialog.value = false;
    history.value = [
      mapConversationEmailUpdateHistoryRecord(record),
      ...history.value.filter((item) => item.id !== record.updateId),
    ];
    hasLoadedHistory.value = true;
    clearComposer();
    saveComposer();
    setActiveTab("history");
  },
});
const review = reviewFlow.review;
const testPending = computed(
  () =>
    review.value?.test.kind === "requesting" ||
    review.value?.test.kind === "polling"
);
const testButtonLabel = computed(() =>
  review.value?.test.kind === "retry"
    ? tReview("retryTestRequest")
    : tComposer(
        testPending.value
          ? "sendingTest"
          : review.value?.testRequested
            ? "sendAnotherTest"
            : "sendTest"
      )
);
const formattedAudienceEstimate = computed(() =>
  new Intl.NumberFormat(locale.value).format(
    review.value?.snapshot.estimatedEligibleRecipientCount ?? 0
  )
);
const currentScope = computed(() =>
  scopes.value.find((scope) => scope.id === selectedScopeId.value)
);
const currentSelection = computed(() =>
  currentScope.value === undefined
    ? undefined
    : createConversationEmailUpdateSelection({
        scope: currentScope.value,
        selectedConversationIds: selectedConversationIds.value,
      })
);
const updatesDisabledConversationIds = computed(() =>
  apiScopes.value.flatMap((scope) =>
    scope.conversations
      .filter((conversation) => !conversation.sendingEnabled)
      .map((conversation) => conversation.conversationSlugId)
  )
);

watch(selectedScopeId, () => {
  const ids = new Set(
    currentScope.value?.conversations.map((conversation) => conversation.id)
  );
  if (!selectedConversationIds.value.every((id) => ids.has(id)))
    selectedConversationIds.value = [];
});
watch([selectedScopeId, selectedConversationIds], () => {
  cancelAudienceEstimate();
  audienceRequestId += 1;
  audienceEstimateState.value = { kind: "loading" };
  audienceEstimateError.value = undefined;
  audienceTimer = window.setTimeout(() => {
    void loadAudienceEstimate();
  }, 250);
});
watch(
  () => JSON.stringify(props.context),
  async () => {
    saveComposer();
    const token = ++generation;
    historyRequestId += 1;
    audienceRequestId += 1;
    cancelAudienceEstimate();
    if (!(await reviewFlow.leave()) || token !== generation) return;
    clearComposer();
    composerContext = undefined;
    apiScopes.value = [];
    resolvedContext.value = undefined;
    history.value = [];
    historyNextCursor.value = undefined;
    hasLoadedHistory.value = false;
    isLoadingHistory.value = false;
    isLoadingMoreHistory.value = false;
    activeTab.value = props.initialTab;
    void loadWorkspace();
  },
  { immediate: true, flush: "sync" }
);
watch(
  () => props.initialTab,
  (tab) => {
    if (tab !== activeTab.value) updateActiveTab(tab);
  }
);

async function prepareReview(): Promise<void> {
  if (
    audienceEstimateState.value.kind !== "ready" ||
    audienceEstimateState.value.eligibleParticipantCount === 0
  )
    return;
  const request = Dto.conversationEmailUpdatePrepareDraftRequest.safeParse({
    selection: currentSelection.value,
    subject: subject.value,
    bodyHtml: bodyHtml.value,
  });
  if (!request.success) {
    notify.showNotifyMessage(t("contentInvalid"));
    return;
  }
  contentConfirmed.value = false;
  await reviewFlow.prepare(request.data);
}

function requestExit(intent: ExitIntent): void {
  if (reviewFlow.busy.value) {
    if (intent.kind === "route") intent.resolve(false);
    return;
  }
  if (review.value?.test.kind === "delivery-accepted") {
    if (intent.kind === "route") intent.resolve(false);
    void reviewFlow.reconcile();
    return;
  }
  if (pendingExit.value !== undefined) {
    if (intent.kind === "route") intent.resolve(false);
    return;
  }
  pendingExit.value = intent;
  showLeaveDialog.value = true;
}

function stayInReview(): void {
  if (pendingExit.value?.kind === "route") pendingExit.value.resolve(false);
  pendingExit.value = undefined;
  reviewFlow.dismissExitError();
}

async function confirmLeave(): Promise<void> {
  const intent = pendingExit.value;
  if (intent === undefined || reviewFlow.busy.value) return;
  showLeaveDialog.value = false;
  const left = await reviewFlow.leave();
  if (pendingExit.value !== intent) return;
  if (!left) {
    if (reviewFlow.error.value === "reconcileError") stayInReview();
    else showLeaveDialog.value = true;
    return;
  }
  showLeaveDialog.value = false;
  pendingExit.value = undefined;
  contentConfirmed.value = false;
  showTestDialog.value = false;
  showSendDialog.value = false;
  if (intent.kind === "clear") {
    clearComposer();
    saveComposer();
  }
  if (intent.kind === "tab") setActiveTab(intent.tab);
  if (intent.kind === "route") intent.resolve(true);
}

async function guardNavigation(): Promise<boolean> {
  const allowed =
    reviewFlow.state.value.kind === "preparing"
      ? await reviewFlow.leave()
      : review.value === undefined
        ? true
        : await new Promise<boolean>((resolve) =>
            requestExit({ kind: "route", resolve })
          );
  if (allowed) saveComposer();
  return allowed;
}
onBeforeRouteLeave(guardNavigation);
onBeforeRouteUpdate(guardNavigation);

function beforeUnload(event: BeforeUnloadEvent): void {
  if (reviewFlow.state.value.kind !== "composing") {
    event.preventDefault();
    event.returnValue = "";
  }
}
window.addEventListener("beforeunload", beforeUnload);

function updateActiveTab(value: string | number): void {
  if ((value !== "compose" && value !== "history") || value === activeTab.value)
    return;
  if (review.value !== undefined) requestExit({ kind: "tab", tab: value });
  else if (!reviewFlow.busy.value) setActiveTab(value);
}
function setActiveTab(tab: WorkspaceTab): void {
  activeTab.value = tab;
  void router.replace({ query: { ...route.query, tab } });
  if (tab === "history" && !hasLoadedHistory.value && !isLoadingHistory.value)
    void loadHistory();
}
async function sendUpdate(): Promise<void> {
  if (
    (contentConfirmed.value || review.value?.test.kind === "send-unknown") &&
    pendingExit.value === undefined
  )
    await reviewFlow.send();
}
function requestTest(): void {
  if (review.value?.test.kind === "retry") void reviewFlow.sendTest();
  else showTestDialog.value = true;
}
function requestSend(): void {
  if (review.value?.test.kind === "send-unknown") void sendUpdate();
  else showSendDialog.value = true;
}
function clearComposer(): void {
  selectedScopeId.value = "";
  selectedConversationIds.value = [];
  subject.value = "";
  bodyHtml.value = "";
  bodyPlainText.value = "";
  contentConfirmed.value = false;
}
function saveComposer(): void {
  if (composerContext === undefined) return;
  composerStore.save({
    context: composerContext,
    draft: {
      selectedScopeId: selectedScopeId.value,
      selectedConversationIds: [...selectedConversationIds.value],
      subject: subject.value,
      bodyHtml: bodyHtml.value,
      bodyPlainText: bodyPlainText.value,
    },
  });
}

async function loadWorkspace(): Promise<void> {
  const token = generation;
  isLoadingWorkspace.value = true;
  workspaceError.value = undefined;
  try {
    const response = await emailUpdatesApi.getWorkspace({
      context: props.context,
    });
    if (token !== generation) return;
    if (!response.success) {
      workspaceError.value = t(
        response.reason === "context_not_found"
          ? "contextNotFound"
          : "workspaceUnavailable"
      );
      return;
    }
    apiScopes.value = response.scopes;
    resolvedContext.value = response.resolvedContext;
    testDestinationEmail.value = response.testDestinationEmail;
    composerContext = props.context;
    const saved = composerStore.get(composerContext);
    const initial = response.initialSelection;
    if (saved !== undefined) {
      selectedScopeId.value = saved.selectedScopeId;
      selectedConversationIds.value = saved.selectedConversationIds;
      subject.value = saved.subject;
      bodyHtml.value = saved.bodyHtml;
      bodyPlainText.value = saved.bodyPlainText;
    } else if (initial?.kind === "project") {
      selectedScopeId.value = initial.projectSlug;
      selectedConversationIds.value = initial.conversationSlugIds;
    } else if (initial?.kind === "no_project") {
      selectedScopeId.value =
        scopes.value.find((scope) =>
          scope.conversations.some(
            (conversation) => conversation.id === initial.conversationSlugId
          )
        )?.id ?? "";
      selectedConversationIds.value = [initial.conversationSlugId];
    } else if (response.resolvedContext.kind === "project") {
      selectedScopeId.value = response.resolvedContext.projectSlug;
      selectedConversationIds.value = [];
    } else {
      const first = scopes.value.at(0);
      selectedScopeId.value = first?.id ?? "";
      selectedConversationIds.value = getInitialConversationIds(first);
    }
    if (activeTab.value === "history") void loadHistory();
  } catch (cause) {
    if (token !== generation) return;
    console.error("Failed to load Email Updates workspace", cause);
    workspaceError.value = t("workspaceUnavailable");
  } finally {
    if (token === generation) isLoadingWorkspace.value = false;
  }
}

function cancelAudienceEstimate(): void {
  window.clearTimeout(audienceTimer);
  audienceTimer = undefined;
  audienceAbort?.abort();
  audienceAbort = undefined;
}
async function loadAudienceEstimate(): Promise<void> {
  cancelAudienceEstimate();
  audienceEstimateState.value = { kind: "loading" };
  audienceEstimateError.value = undefined;
  const selection = currentSelection.value;
  if (selection === undefined || testDestinationEmail.value === undefined)
    return;
  const requestId = ++audienceRequestId;
  const token = generation;
  const controller = new AbortController();
  audienceAbort = controller;
  try {
    const response = await emailUpdatesApi.estimateAudience({
      request: { selection },
      signal: controller.signal,
    });
    if (requestId !== audienceRequestId || token !== generation) return;
    if (!response.success) {
      audienceEstimateState.value = { kind: "error" };
      audienceEstimateError.value = t("audienceEstimateUnavailable");
      notifyReviewEvent({ kind: "dto", error: response });
      return;
    }
    audienceEstimateState.value = {
      kind: "ready",
      eligibleParticipantCount: response.estimatedEligibleRecipientCount,
      ownerCopyCount: response.requiredOwnerCopyCount,
    };
  } catch (cause) {
    if (
      controller.signal.aborted ||
      requestId !== audienceRequestId ||
      token !== generation
    )
      return;
    console.error("Failed to estimate Email Update audience", cause);
    audienceEstimateState.value = { kind: "error" };
    audienceEstimateError.value = t("audienceEstimateUnavailable");
  }
}

async function loadHistory(): Promise<void> {
  await fetchHistory(undefined);
}
async function loadMoreHistory(): Promise<void> {
  if (historyNextCursor.value !== undefined && !isLoadingMoreHistory.value)
    await fetchHistory(historyNextCursor.value);
}
async function fetchHistory(cursor: string | undefined): Promise<void> {
  const context = resolvedContext.value;
  if (context === undefined) return;
  const token = generation;
  const requestId = ++historyRequestId;
  isLoadingHistory.value = cursor === undefined;
  isLoadingMoreHistory.value = cursor !== undefined;
  historyError.value = undefined;
  try {
    const response = await emailUpdatesApi.listHistory({
      context,
      cursor,
      limit: 20,
    });
    if (token !== generation || requestId !== historyRequestId) return;
    if (!response.success) {
      historyError.value = t("historyUnavailable");
      return;
    }
    const records = response.items.map(mapConversationEmailUpdateHistoryRecord);
    const existingIds = new Set(history.value.map((record) => record.id));
    history.value =
      cursor === undefined
        ? records
        : [
            ...history.value,
            ...records.filter((record) => !existingIds.has(record.id)),
          ];
    historyNextCursor.value = response.nextCursor;
    hasLoadedHistory.value = true;
  } catch (cause) {
    if (token !== generation || requestId !== historyRequestId) return;
    console.error("Failed to load Email Update history", cause);
    historyError.value = t(
      cursor === undefined ? "historyUnavailable" : "moreHistoryUnavailable"
    );
  } finally {
    if (token === generation && requestId === historyRequestId) {
      isLoadingHistory.value = false;
      isLoadingMoreHistory.value = false;
    }
  }
}

async function startEmailVerification(): Promise<void> {
  loginIntentionStore.createEmailUpdatesIntention(route.fullPath);
  flowStore.onboardingMode = "LOGIN";
  await router.push({ name: "/verify/email/" });
}
function notifyReviewEvent(event: ReviewEvent): void {
  if (event.kind === "test-accepted") {
    notify.showNotifyMessage(t("testAccepted"));
    return;
  }
  if (event.kind === "transport") {
    const messages = {
      prepare: "prepareError",
      test: "testUnknown",
      send: "sendUnknown",
      cancel: "cancelError",
      reconcile: "reconcileError",
    } satisfies Record<
      typeof event.operation,
      keyof typeof conversationUpdateReviewTranslations.en
    >;
    notify.showNotifyMessage(tReview(messages[event.operation]));
    return;
  }
  const failure = event.error;
  const { reason } = failure;
  if (reason === "no_verified_test_email")
    testDestinationEmail.value = undefined;
  if (
    failure.reason === "review_rate_limited" ||
    failure.reason === "test_rate_limited"
  ) {
    notify.showNotifyMessage(
      tReview("rateLimited", {
        date: failure.retryAt.toLocaleString(locale.value),
      })
    );
    return;
  }
  const messages = {
    scope_not_found: "scopeUnavailable",
    conversation_not_in_scope: "conversationsUnavailable",
    content_invalid: "contentInvalid",
    missing_participant_contact_email: "missingContactEmail",
    no_verified_test_email: "verifyBeforeTest",
    no_eligible_participants: "noEligibleParticipants",
    sending_disabled: "sendingDisabled",
    test_not_found: "successfulTestNotFound",
    test_not_accepted: "testNotAccepted",
    test_used: "testUsed",
    delivery_already_active: "deliveryAlreadyActive",
    required_owner_copy_unavailable: "ownerCopyUnavailable",
    retryable_rejected: "testDeliveryRetryable",
    permanent_rejected: "testDeliveryPermanent",
    authorization_rejected: "testDeliveryAuthorization",
    unknown: "testDeliveryUnknown",
  } satisfies Record<
    Exclude<
      ReviewFailure["reason"],
      | "review_rate_limited"
      | "test_rate_limited"
      | "review_required"
      | "review_not_found"
      | "review_expired"
      | "review_cancelled"
      | "request_id_conflict"
      | "delivery_already_accepted"
      | "update_not_found"
      | "test_status_unavailable"
    >,
    keyof ConversationUpdatesWorkspaceTranslations
  >;
  switch (failure.reason) {
    case "review_required":
    case "review_not_found":
    case "review_expired":
    case "review_cancelled":
      notify.showNotifyMessage(tReview("reviewInvalid"));
      return;
    case "request_id_conflict":
      notify.showNotifyMessage(tReview("requestIdConflict"));
      return;
    case "delivery_already_accepted":
      notify.showNotifyMessage(tReview("deliveryAccepted"));
      return;
    case "update_not_found":
      notify.showNotifyMessage(tReview("deliveryNotFound"));
      return;
    case "test_status_unavailable":
      notify.showNotifyMessage(tReview("testStatusUnavailable"));
      return;
    case "unknown":
    case "no_eligible_participants":
    case "scope_not_found":
    case "conversation_not_in_scope":
    case "content_invalid":
    case "missing_participant_contact_email":
    case "no_verified_test_email":
    case "sending_disabled":
    case "test_not_found":
    case "test_not_accepted":
    case "test_used":
    case "delivery_already_active":
    case "required_owner_copy_unavailable":
    case "retryable_rejected":
    case "permanent_rejected":
    case "authorization_rejected":
      notify.showNotifyMessage(t(messages[failure.reason]));
  }
}
onBeforeUnmount(() => {
  saveComposer();
  generation += 1;
  historyRequestId += 1;
  audienceRequestId += 1;
  cancelAudienceEstimate();
  stayInReview();
  window.removeEventListener("beforeunload", beforeUnload);
});
</script>

<style scoped lang="scss">
.updates-workspace {
  display: grid;
  gap: 1rem;
  width: min(100%, 62rem);
  margin-inline: auto;
  padding: 1rem;
  &__intro {
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
      margin: 0 0 0.65rem;
      font-size: clamp(1.5rem, 4vw, 2.35rem);
      line-height: 1.12;
      color: $color-text-strong;
    }
    p {
      margin: 0;
      color: $color-text-weak;
      line-height: 1.55;
    }
  }
  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: flex-end;
  }
}
</style>
