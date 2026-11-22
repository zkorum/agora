<template>
  <div
    v-if="
      !hideComposerForRoute &&
      (editingOpinion !== undefined ||
        creationEnabled ||
        opinionBody.length > 0)
    "
    ref="target"
  >
    <p v-if="editingOpinion === undefined && !creationEnabled" role="status">
      {{ participantT("disabled") }}
    </p>
    <div
      class="container borderStyle"
      :class="{ focused: innerFocus, editing: editingOpinion !== undefined }"
      :style="composerViewportStyle"
    >
      <div ref="composerContent" class="composer-content">
        <Editor
          v-if="isEditorMounted"
          :key="editingOpinion?.displayContent.sourceVersion ?? 'creation'"
          ref="editorRef"
          v-model="opinionBody"
          v-model:plain-text="opinionPlainText"
          :placeholder="
            innerFocus ? t('placeholderExpanded') : t('placeholder')
          "
          :min-height="innerFocus ? '6rem' : '2rem'"
          :show-toolbar="innerFocus"
          :single-line="false"
          :disabled="
            editMutation.isPending.value ||
            editSession.isInitializing.value ||
            (editingOpinion === undefined && !creationEnabled)
          "
          :max-length="MAX_LENGTH_OPINION"
          :show-character-count="innerFocus"
          @update:character-count="onCharacterCountUpdate"
          @update:is-over-limit="(v: boolean) => (isOverLimit = v)"
          @manually-focused="editorFocused()"
          @ready="onEditorReady"
        />

        <div v-if="validationWarning" class="validation-warning">
          <q-icon name="mdi-alert-circle" class="warning-icon" />
          {{ validationWarning }}
        </div>
      </div>

      <div v-if="innerFocus" class="actionButtonCluster">
        <input ref="dummyInput" type="button" class="dummyInputStyle" />

        <ZKButton
          button-type="icon"
          :aria-label="t('opinionWritingGuidelines')"
          @click="showGuidelinesDialog = true"
        >
          <ZKIcon
            color="#6d6a74"
            name="mdi-information-outline"
            size="1.2rem"
          />
        </ZKButton>

        <PrimeButton
          v-if="editingOpinion"
          :label="editT('cancel')"
          severity="primary"
          outlined
          :disabled="editMutation.isPending.value"
          @click="cancelEdit"
        />
        <PrimeButton
          v-if="editingOpinion"
          :label="editT('save')"
          :disabled="
            !isEditDirty ||
            isOverLimit ||
            !hasVisibleOpinionText ||
            editMutation.isPending.value
          "
          :loading="editMutation.isPending.value"
          @click="saveEdit"
        />
        <PrimeButton
          v-else
          :label="t('postButton')"
          severity="primary"
          :disabled="
            isOverLimit ||
            !hasVisibleOpinionText ||
            isSubmissionLoading ||
            !creationEnabled ||
            isComposerDisabled
          "
          :loading="isSubmissionLoading"
          @click="submitPostClicked()"
        />
      </div>
    </div>

    <ExitRoutePrompt
      v-if="editingOpinion === undefined"
      v-model="showExitDialog"
      :title="t('exitPromptTitle')"
      :description="t('exitPromptDescription')"
      :save-draft="saveDraft"
      :no-save-draft="noSaveDraft"
    />
    <ZKConfirmDialog
      v-else
      v-model="showExitDialog"
      :title="editT('discard')"
      :message="editT('discardDescription')"
      :actions="{
        cancel: {
          label: editT('keepEditing'),
          appearance: 'secondary-outlined',
        },
        confirm: { label: editT('cancel'), appearance: 'danger' },
      }"
      @confirm="discardEditAndLeave"
    />

    <OpinionWritingGuidelinesDialog v-model="showGuidelinesDialog" />
  </div>
</template>

<script setup lang="ts">
import {
  onClickOutside,
  useRafFn,
  useResizeObserver,
  useWindowScroll,
} from "@vueuse/core";
import Button from "primevue/button";
import { participantStatementsTranslations } from "src/components/newConversation/ParticipantStatements.i18n";
import ExitRoutePrompt from "src/components/routeGuard/ExitRoutePrompt.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import type { SubmittedCommentData } from "src/composables/conversation/useConversationParentState";
import { useParticipationGate } from "src/composables/conversation/useParticipationGate";
import type { OpinionEditRequest } from "src/composables/opinion/types";
import { useOpinionComposerEditing } from "src/composables/opinion/useOpinionComposerEditing";
import { useOpinionComposerViewport } from "src/composables/opinion/useOpinionComposerViewport";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useIdleMount } from "src/composables/ui/useIdleMount";
import { hasVisiblePlainText, MAX_LENGTH_OPINION } from "src/shared/shared";
import type { DisplayedOpinionItem } from "src/shared/types/zod";
import type { ParticipantStatements } from "src/shared/types/zod";
import { useNewOpinionDraftsStore } from "src/stores/newOpinionDrafts";
import {
  useCreateCommentMutation,
  useEditOpinionMutation,
} from "src/utils/api/comment/useCommentQueries";
import { useInvalidateConversationQuery } from "src/utils/api/post/useConversationQuery";
import {
  type RouteGuardDestination,
  useRouteGuard,
} from "src/utils/component/routing/routeGuard";
import {
  isConversationOnboardingRoutePath,
  isConversationRoutePath,
} from "src/utils/router/conversationRouteContext";
import { useNotify } from "src/utils/ui/notify";
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onMounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";
import { useRoute } from "vue-router";
import type { RouteNamedMap } from "vue-router/auto-routes";

import {
  type CommentComposerTranslations,
  commentComposerTranslations,
} from "./CommentComposer.i18n";
import { opinionEditingTranslations } from "./opinionEditing.i18n";
import OpinionWritingGuidelinesDialog from "./OpinionWritingGuidelinesDialog.vue";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

const props = defineProps<{
  editingTarget: OpinionEditRequest | undefined;
  participantStatements: ParticipantStatements;
  postSlugId: string;
  isComposerDisabled: boolean;
  actionBarElement: HTMLElement | undefined;
}>();

const emit = defineEmits<{
  editCancelled: [];
  editedOpinion: [opinion: DisplayedOpinionItem];
  submittedComment: [data: SubmittedCommentData];
}>();

const editingOpinion = computed(() => props.editingTarget?.opinion);
const creationEnabled = computed(
  () =>
    props.participantStatements.supported && props.participantStatements.enabled
);
const { t: participantT } = useComponentI18n(participantStatementsTranslations);

const Editor = defineAsyncComponent(
  () => import("src/components/editor/Editor.vue")
);

type RouteName = keyof RouteNamedMap;

const sameConversationTabRouteNames = [
  "/conversation/[postSlugId]",
  "/conversation/[postSlugId]/",
  "/conversation/[postSlugId]/analysis",
  "/conversation/[postSlugId].embed",
  "/conversation/[postSlugId].embed/",
  "/conversation/[postSlugId].embed/analysis",
  "/project/[projectSlug]/conversation/[postSlugId]",
  "/project/[projectSlug]/conversation/[postSlugId]/",
  "/project/[projectSlug]/conversation/[postSlugId]/analysis",
] satisfies readonly RouteName[];

const draftAutoSaveRouteNames = [
  "/welcome/",
  "/conversation/[conversationSlugId]/report",
  "/project/[projectSlug]/conversation/[postSlugId]/report",
  "/verify/email/",
  "/verify/email-code/",
  "/verify/hard/",
  "/verify/identity/",
  "/verify/passport/",
  "/verify/phone/",
  "/verify/phone-code/",
  "/conversation/[postSlugId].onboarding",
  "/conversation/[postSlugId].onboarding/",
  "/conversation/[postSlugId].onboarding/complete",
  "/conversation/[postSlugId].onboarding/question.[questionSlugId]",
  "/conversation/[postSlugId].onboarding/summary",
  "/conversation/[postSlugId].onboarding/verify",
  "/conversation/[postSlugId].onboarding/verify/email",
  "/conversation/[postSlugId].onboarding/verify/email-code",
  "/conversation/[postSlugId].onboarding/verify/hard",
  "/conversation/[postSlugId].onboarding/verify/identity",
  "/conversation/[postSlugId].onboarding/verify/passport",
  "/conversation/[postSlugId].onboarding/verify/phone",
  "/conversation/[postSlugId].onboarding/verify/phone-code",
] satisfies readonly RouteName[];

const route = useRoute();

// Defer Editor mounting until browser is idle to improve initial page load performance
const { isMounted: isEditorMounted, mount: mountEditor } = useIdleMount({});

const dummyInput = ref<HTMLInputElement>();

const { saveOpinionDraft, getOpinionDraft, deleteOpinionDraft } =
  useNewOpinionDraftsStore();

const createCommentMutation = useCreateCommentMutation();
const editMutation = useEditOpinionMutation(props.postSlugId);
const { t: editT } = useComponentI18n(opinionEditingTranslations);

const { showNotifyMessage } = useNotify();
const {
  participationStatus,
  openParticipationOnboarding,
  captureParticipationAction,
} = useParticipationGate(() => props.postSlugId);

const { invalidateConversation } = useInvalidateConversationQuery();

const hideComposerForRoute = computed(() => {
  const routePath = route.path;
  return (
    !isConversationRoutePath(routePath) ||
    isConversationOnboardingRoutePath(routePath)
  );
});

const characterCount = ref(0);
const isOverLimit = ref(false);

const innerFocus = ref(false);

const target = useTemplateRef<HTMLElement>("target");
onClickOutside(target, () => {
  if (editingOpinion.value === undefined) innerFocus.value = false;
});

const opinionBody = ref("");
const opinionPlainText = ref("");
const hasVisibleOpinionText = computed(() =>
  hasVisiblePlainText(opinionPlainText.value)
);

const showGuidelinesDialog = ref(false);

const editorRef = useTemplateRef<InstanceType<typeof Editor>>("editorRef");
const composerContent = useTemplateRef<HTMLElement>("composerContent");
const { resume: revealCaretOnNextFrame } = useRafFn(
  () => editorRef.value?.scrollSelectionIntoView(),
  { immediate: false, once: true }
);
useResizeObserver(composerContent, revealCaretOnNextFrame);

async function onEditorReady(serializedContent: string): Promise<void> {
  if (editingOpinion.value === undefined) return;
  editSession.ready(serializedContent);
  const session = editSession.capture();
  await nextTick();
  if (session === undefined || !editSession.isCurrent(session)) return;
  // Let Tiptap reveal its caret first, then reveal the statement outside the
  // fixed editor without changing the editor's own selection or scrolling.
  editorRef.value?.focusEnd();
  revealEditingOpinion();
}

function cancelEdit(): void {
  emit("editCancelled");
}

async function discardEditAndLeave(): Promise<void> {
  await proceedWithNavigation(cancelEdit);
}

async function saveEdit(): Promise<void> {
  const session = editSession.capture();
  if (
    session === undefined ||
    !isEditDirty.value ||
    isOverLimit.value ||
    !hasVisibleOpinionText.value ||
    editMutation.isPending.value
  )
    return;
  try {
    const result = await editMutation.mutateAsync({
      opinionSlugId: session.opinion.opinionSlugId,
      sourceVersion: session.opinion.displayContent.sourceVersion,
      opinionBody: opinionBody.value,
    });
    if (!editSession.isCurrent(session)) return;
    if (result.success) emit("editedOpinion", result.displayedOpinionItem);
    else
      showNotifyMessage({
        message:
          result.reason === "has_votes"
            ? editT("hasVotes")
            : result.reason === "version_conflict"
              ? editT("changed")
              : editT("failed"),
        force: true,
      });
  } catch {
    showNotifyMessage(editT("failed"));
  }
}

// Handle guidelines dialog close - restore focus to editor
function handleGuidelinesDialogClose() {
  void nextTick(() => {
    editorRef.value?.focus();
  });
}

// Watch for guidelines dialog close to restore focus
watch(showGuidelinesDialog, (isOpen, wasOpen) => {
  if (wasOpen && !isOpen) {
    handleGuidelinesDialogClose();
  }
});

watch(characterCount, (count) => {
  if (count === 0 && editingOpinion.value === undefined) {
    deleteOpinionDraft(props.postSlugId);
  }
});

// Validation warning for multiple ideas
const validationWarning = computed(() => {
  const htmlContent = opinionBody.value;

  // Check 1: HTML lists (bullet points or numbered lists)
  const hasLists = /<[uo]l>/i.test(htmlContent) || /<li>/i.test(htmlContent);
  if (hasLists) {
    return t("validationWarningMultipleIdeas");
  }

  // Convert HTML to plain text for further checks
  const plainText = htmlContent
    .replace(/<[^>]*>/g, " ") // Remove HTML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  // Too short to analyze meaningfully
  if (plainText.length < 20) {
    return null;
  }

  // Check 2: Multiple sentences (high confidence indicator of multiple ideas)
  const sentenceEndings = plainText.match(/[.!?]+\s+[A-Z]/g);
  if (sentenceEndings && sentenceEndings.length >= 1) {
    return t("validationWarningMultipleIdeas");
  }

  // Check 3: Multiple coordinating conjunctions (suggests compound ideas)
  const coordinatingConjunctions = plainText
    .toLowerCase()
    .match(/\b(and|but|or|yet|nor)\b/g);

  if (
    coordinatingConjunctions &&
    coordinatingConjunctions.length >= 2 &&
    plainText.length > 50
  ) {
    return t("validationWarningMultipleIdeas");
  }

  // Check 4: Complexity indicators (many clauses or transition words)
  const commaCount = (plainText.match(/,/g) || []).length;
  const clauseIndicators = plainText
    .toLowerCase()
    .match(
      /\b(however|moreover|furthermore|therefore|thus|consequently|although|whereas|while|because|since)\b/g
    );

  if (commaCount >= 3 || (clauseIndicators && clauseIndicators.length >= 2)) {
    return t("validationWarningMultipleIdeas");
  }

  return null;
});

const {
  lockRoute,
  unlockRoute,
  showExitDialog,
  proceedWithNavigation,
  isRouteLockedCheck,
} = useRouteGuard(
  () =>
    editingOpinion.value !== undefined
      ? isEditDirty.value
      : characterCount.value > 0,
  onBeforeRouteLeaveCallback
);

const savedCreationDraft = getOpinionDraft(props.postSlugId);
if (savedCreationDraft !== undefined)
  opinionBody.value = savedCreationDraft.body;
const editSession = useOpinionComposerEditing({
  target: editingOpinion,
  body: opinionBody,
  saveCreationDraft: (body) => {
    if (body.length > 0) saveOpinionDraft(props.postSlugId, body);
  },
  activate: () => {
    innerFocus.value = true;
    mountEditor();
    lockRoute();
  },
  deactivate: () => {
    innerFocus.value = false;
    lockRoute();
  },
});
const isEditDirty = editSession.isDirty;
const { composerViewportStyle, revealEditingOpinion } =
  useOpinionComposerViewport({
    composer: () => target.value,
    actionBar: () => props.actionBarElement,
    sourceElements: () => props.editingTarget?.sourceElements,
    enabled: () =>
      !hideComposerForRoute.value && !editSession.isInitializing.value,
  });

const { y: yScroll } = useWindowScroll();

let disableAutocollapse = false;

const isSubmissionLoading = ref(false);

const { t } = useComponentI18n<CommentComposerTranslations>(
  commentComposerTranslations
);

onMounted(() => {
  lockRoute();
});

watch(yScroll, () => {
  if (disableAutocollapse === false && editingOpinion.value === undefined) {
    innerFocus.value = false;
    dummyInput.value?.focus();
  }
});

async function saveDraft() {
  saveOpinionDraft(props.postSlugId, opinionBody.value);
  await proceedWithNavigation(() => {});
}

async function noSaveDraft() {
  deleteOpinionDraft(props.postSlugId);
  await proceedWithNavigation(() => {});
}

function routeNameMatches({
  routeName,
  routes,
}: {
  routeName: string;
  routes: readonly RouteName[];
}): boolean {
  return routes.some((route) => route === routeName);
}

function isSameConversationTabRoute(to: RouteGuardDestination): boolean {
  if (typeof to.name !== "string") {
    return false;
  }

  if (
    !routeNameMatches({
      routeName: to.name,
      routes: sameConversationTabRouteNames,
    })
  ) {
    return false;
  }

  const postSlugId = to.params.postSlugId;
  return postSlugId === props.postSlugId;
}

async function openOnboarding(): Promise<void> {
  // Save draft before any async operations
  saveOpinionDraft(props.postSlugId, opinionBody.value);

  unlockRoute();
  await openParticipationOnboarding();
}

function discardDraft(): void {
  opinionBody.value = "";
  characterCount.value = 0;
  innerFocus.value = false;
  deleteOpinionDraft(props.postSlugId);
  unlockRoute();
}

defineExpose({
  discardDraft,
});

function onBeforeRouteLeaveCallback(to: RouteGuardDestination): boolean {
  if (editingOpinion.value !== undefined) {
    if (isSameConversationTabRoute(to)) return true;
    if (isEditDirty.value || editMutation.isPending.value) return false;
    cancelEdit();
    return true;
  }
  if (characterCount.value === 0) {
    deleteOpinionDraft(props.postSlugId);
    return true;
  }

  if (!isRouteLockedCheck()) {
    return true;
  }

  if (isSameConversationTabRoute(to)) {
    return true;
  }

  if (
    typeof to.name === "string" &&
    routeNameMatches({ routeName: to.name, routes: draftAutoSaveRouteNames })
  ) {
    saveOpinionDraft(props.postSlugId, opinionBody.value);
    return true;
  }

  return false;
}

function editorFocused() {
  // Disable the auto collapse for a few seconds for mobile
  // because mobile keyboard will trigger it
  disableAutocollapse = true;
  innerFocus.value = true;

  setTimeout(function () {
    disableAutocollapse = false;
  }, 1000);
}

function onCharacterCountUpdate(count: number) {
  characterCount.value = count;
}

async function submitPostClicked() {
  if (!creationEnabled.value) {
    showNotifyMessage(participantT("disabled"));
    return;
  }
  const participation = captureParticipationAction();
  if (participationStatus.value.status !== "ready") {
    await openOnboarding();
    return;
  }

  isSubmissionLoading.value = true;

  try {
    const response = await createCommentMutation.mutateAsync({
      commentBody: opinionBody.value,
      conversationSlugId: props.postSlugId,
    });
    if (response === undefined) {
      isSubmissionLoading.value = false;
      return;
    }

    if (response.success) {
      emit("submittedComment", {
        displayedOpinionItem: response.displayedOpinionItem,
        needsCacheRefresh: response.needsCacheRefresh,
      });

      isSubmissionLoading.value = false;
      innerFocus.value = false;
      opinionBody.value = "";
      characterCount.value = 0;
      unlockRoute(); // Clear the draft since we successfully submitted
      deleteOpinionDraft(props.postSlugId);
    } else {
      isSubmissionLoading.value = false;
      if (!participation.isCurrent()) return;
      // Business logic failure
      switch (response.reason) {
        case "participant_statements_disabled":
        case "participant_statements_unsupported":
          showNotifyMessage(participantT("disabled"));
          invalidateConversation(props.postSlugId);
          break;
        case "conversation_locked":
          showNotifyMessage(t("conversationLockedError"));
          break;
        case "conversation_closed":
          // Show error message but keep text so user can copy it
          showNotifyMessage(t("conversationClosedError"));
          // Invalidate conversation to refresh UI and show disabled state
          invalidateConversation(props.postSlugId);
          // Don't clear opinionBody or unlock route - preserve the text
          break;
        case "account_required":
        case "strong_verification_required":
        case "email_verification_required":
        case "survey_required":
        case "survey_outdated":
          await participation.handleBlockedReason(response);
          break;
        case "plain_text_empty":
        case "plain_text_too_long":
        case "html_too_long":
          showNotifyMessage(t("createOpinionError"));
          break;
      }
    }
  } catch {
    isSubmissionLoading.value = false;
  }
}
</script>

<style scoped lang="scss">
.container {
  width: 100%;
  background-color: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
}

.container.focused {
  max-block-size: min(
    calc(var(--visible-viewport-height, 100dvh) * 0.65),
    max(
      10rem,
      calc(
        var(--composer-available-height) - var(--composer-context-height) - var(
            --floating-bottom-clearance,
            0px
          )
      )
    )
  );
}

.composer-content {
  min-block-size: 0;
  max-block-size: calc(40vh + 2rem);
  overflow-y: auto;
}

.container :deep(.editor-wrapper) {
  overflow: visible;
}

.container :deep(.editor .ProseMirror) {
  max-height: none;
  overflow-y: visible;
}

.container.editing .composer-content {
  max-block-size: calc(min(14rem, 35vh) + 2rem);
}

.actionButtonCluster {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem;
}

.borderStyle {
  border-radius: 20px;
  padding: 0.5rem;
  border-color: rgba(255, 255, 255, 0.3);
  border-style: solid;
  border-width: 1px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &.focused {
    border-color: rgba(255, 255, 255, 0.6);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }
}
.borderStyle.editing {
  border-color: $primary;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
}
.dummyInputStyle {
  border: none;
  background-color: transparent;
  width: 1px;
  height: 1px;
}

.validation-warning {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  margin: 0.5rem 0;
  background-color: #fff9e6;
  border-left: 3px solid #f59e0b;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #92400e;
}

.warning-icon {
  color: #f59e0b;
  font-size: 1.1rem;
  margin-right: 0.5rem;
}
</style>
