<template>
  <NewConversationLayout>
    <TopMenuWrapper>
      <NavigationButton
        icon="ci:chevron-left"
        aria-label="Go back"
        @click="handleBack"
      />

      <PrimeButton
        :label="isSubmitButtonLoading ? t('posting') : t('post')"
        :loading="isSubmitButtonLoading"
        @click="onSubmit()"
      />
    </TopMenuWrapper>

    <div class="container">
      <!-- Title with Privacy Label -->
      <ConversationTitle
        :is-private="conversationDraft.isPrivate"
        :title="conversationDraft.title"
        size="large"
        :conversation-type="conversationDraft.conversationType"
        :external-source-config="conversationDraft.externalSourceConfig"
      />

      <!-- GitHub-linked: show read-only preview (items will sync from GitHub) -->
      <div v-if="conversationDraft.externalSourceConfig !== null" class="seed-opinions-section">
        <div class="section-title">{{ t("githubSyncTitle") }}</div>
        <p class="section-description">
          {{ t("githubSyncDescription") }}
        </p>
        <div v-if="isLoadingPreview" class="preview-loading">
          <q-spinner size="1.5rem" />
          <span>{{ t("loadingGithubPreview") }}</span>
        </div>
        <ErrorRetryBlock
          v-else-if="previewError"
          compact
          :title="t('githubPreviewError')"
          :retry-label="t('githubPreviewRetry')"
          @retry="retryPreview"
        />
        <div v-else-if="githubPreviewItems.length > 0" class="opinions-list">
          <div
            v-for="item in githubPreviewItems"
            :key="item.number"
            class="github-preview-item"
          >
            <span class="preview-item-title">{{ item.title }}</span>
            <a
              :href="item.htmlUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="preview-item-link"
              @click.stop
            >
              <q-icon name="mdi-open-in-new" size="0.875rem" />
            </a>
          </div>
        </div>
        <div v-else class="preview-empty">
          {{ t("noGithubIssuesFound") }}
        </div>
      </div>

      <!-- Manual: Add Seed Opinions Section -->
      <div v-else class="seed-opinions-section">
        <div class="section-title">{{ conversationDraft.conversationType === "maxdiff" ? t("addMaxDiffItems") : t("addSeedOpinions") }}</div>
        <p class="section-description">
          {{
            conversationDraft.conversationType === "maxdiff"
              ? t("maxDiffSeedDescription")
              : t("seedOpinionsDescription")
          }}
        </p>

        <!-- Seed Opinions List -->
        <div
          v-if="conversationDraft.seedOpinions.length > 0"
          class="opinions-list"
        >
          <SeedOpinionItem
            v-for="(opinion, index) in conversationDraft.seedOpinions"
            :key="index"
            :ref="
              (el: Element | ComponentPublicInstance | null) =>
                setOpinionRef(el, index)
            "
            :model-value="opinion"
            :error-message="opinionErrors[index]"
            :is-active="currentActiveOpinionIndex === index"
            @update:model-value="
              (val) => {
                conversationDraft.seedOpinions[index] = val;
              }
            "
            @focus="
              () => {
                currentActiveOpinionIndex = index;
                clearOpinionError(index);
              }
            "
            @blur="currentActiveOpinionIndex = -1"
            @remove="removeOpinion(index)"
          />
        </div>

        <!-- Add Opinion Button -->
        <div class="add-button-container">
          <ConversationControlButton
            :label="conversationDraft.conversationType === 'maxdiff' ? t('addMaxDiffItem') : t('addOpinion')"
            icon="pi pi-plus"
            :show-border="false"
            icon-position="left"
            @click="addNewOpinion"
          />
        </div>
      </div>
    </div>

    <NewConversationRouteGuard
      ref="routeGuard"
      :allowed-routes="['/conversation/new/create/', '/welcome/']"
      :has-unsaved-changes="isDraftModified"
      :reset-draft="resetDraft"
    />

    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      active-intention="newConversation"
    />
  </NewConversationLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import Button from "primevue/button";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";

import {
  type ConversationReviewTranslations,
  conversationReviewTranslations,
} from "./index.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

import ConversationTitle from "src/components/features/conversation/ConversationTitle.vue";
import NavigationButton from "src/components/navigation/NavigationButton.vue";
import TopMenuWrapper from "src/components/navigation/header/TopMenuWrapper.vue";
import ConversationControlButton from "src/components/newConversation/ConversationControlButton.vue";
import NewConversationLayout from "src/components/newConversation/NewConversationLayout.vue";
import NewConversationRouteGuard from "src/components/newConversation/NewConversationRouteGuard.vue";
import SeedOpinionItem from "src/components/newConversation/SeedOpinionItem.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import { useConversationDraft } from "src/composables/conversation/draft";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  MAX_LENGTH_OPINION,
  validateHtmlStringCharacterCount,
} from "src/shared/shared";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useNavigationStore } from "src/stores/navigation";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { useCommonApi } from "src/utils/api/common";
import { useMaxDiffApi } from "src/utils/api/maxdiff/maxdiff";
import { useBackendPostApi } from "src/utils/api/post/post";
import { useInvalidateFeedQuery } from "src/utils/api/post/useFeedQuery";
import { useNotify } from "src/utils/ui/notify";
import { type ComponentPublicInstance, nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const { isLoggedIn } = storeToRefs(useAuthenticationStore());
const router = useRouter();
const { showNotifyMessage } = useNotify();

// Use composable for validation and draft management (with syncToStore: true since we're in create flow)
const { validateForReview, isDraftModified, resetDraft } = useConversationDraft(
  { syncToStore: true }
);
const { conversationDraft } = storeToRefs(useNewPostDraftsStore());

const { createNewPost } = useBackendPostApi();
const { syncMaxDiff, previewGitHubIssues } = useMaxDiffApi();
const { invalidateFeed } = useInvalidateFeedQuery();
const { handleAxiosErrorStatusCodes } = useCommonApi();

const showLoginDialog = ref(false);
const isSubmitButtonLoading = ref(false);
const currentActiveOpinionIndex = ref(-1);
const routeGuard = ref<{ unlockRoute: () => void } | undefined>(undefined);

async function handleBack(event: MouseEvent) {
  event.preventDefault();
  routeGuard.value?.unlockRoute();
  await router.replace({ name: "/conversation/new/create/" });
}

// Validation state
const opinionErrors = ref<Record<number, string>>({});
const opinionRefs = ref<Record<number, HTMLElement>>({});
const opinionComponentRefs = ref<
  Record<number, InstanceType<typeof SeedOpinionItem>>
>({});

// GitHub preview state
interface GitHubPreviewItem {
  number: number;
  title: string;
  htmlUrl: string;
}
const isLoadingPreview = ref(false);
const previewError = ref(false);
const githubPreviewItems = ref<GitHubPreviewItem[]>([]);

const { createNewConversationIntention } = useLoginIntentionStore();
const navigationStore = useNavigationStore();

const { t } = useComponentI18n<ConversationReviewTranslations>(
  conversationReviewTranslations
);

onMounted(async () => {
  const validation = validateForReview();
  if (!validation.isValid) {
    await router.replace({ name: "/conversation/new/create/" });
    return;
  }

  // Fetch GitHub preview if this is a GitHub-linked conversation
  if (conversationDraft.value.externalSourceConfig !== null) {
    await fetchGitHubPreview();
  }
});

function onLoginCallback() {
  createNewConversationIntention();
}

async function fetchGitHubPreview(): Promise<void> {
  const config = conversationDraft.value.externalSourceConfig;
  if (config === null) return;

  isLoadingPreview.value = true;
  previewError.value = false;
  githubPreviewItems.value = [];

  const response = await previewGitHubIssues({
    repository: config.repository,
    label: config.label,
  });

  if (response.status === "success") {
    githubPreviewItems.value = response.data.issues.map((issue) => ({
      number: issue.number,
      title: issue.title,
      htmlUrl: issue.htmlUrl,
    }));
  } else {
    previewError.value = true;
  }

  isLoadingPreview.value = false;
}

async function retryPreview(): Promise<void> {
  await fetchGitHubPreview();
}

function setOpinionRef(
  el: Element | ComponentPublicInstance | null,
  index: number
): void {
  if (el) {
    // Handle Vue component instance
    if ("$el" in el) {
      opinionRefs.value[index] = el.$el as HTMLElement;
      // Store component instance for calling focus method
      opinionComponentRefs.value[index] = el as InstanceType<
        typeof SeedOpinionItem
      >;
    } else {
      // Handle direct DOM element
      opinionRefs.value[index] = el as HTMLElement;
    }
  }
}

function clearOpinionError(index: number) {
  if (opinionErrors.value[index]) {
    delete opinionErrors.value[index];
  }
}


async function addNewOpinion(): Promise<void> {
  conversationDraft.value.seedOpinions.push("");
  const newIndex = conversationDraft.value.seedOpinions.length - 1;

  // Wait for Vue to render the new element
  await nextTick();

  // Scroll to the new opinion and focus it
  const newElement = opinionRefs.value[newIndex];
  if (newElement) {
    newElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  // Focus the new opinion's editor
  const newComponent = opinionComponentRefs.value[newIndex];
  if (newComponent) {
    // Small delay to ensure scroll completes before focus
    setTimeout(() => {
      newComponent.focus();
    }, 100);
  }
}

function removeOpinion(index: number): void {
  conversationDraft.value.seedOpinions.splice(index, 1);
  // Clear any error for this index
  clearOpinionError(index);
  // Shift errors for indices that come after the removed one
  const newErrors: Record<number, string> = {};
  Object.keys(opinionErrors.value).forEach((key) => {
    const idx = parseInt(key);
    if (idx < index) {
      newErrors[idx] = opinionErrors.value[idx];
    } else if (idx > index) {
      newErrors[idx - 1] = opinionErrors.value[idx];
    }
  });
  opinionErrors.value = newErrors;

  // Clean up opinionRefs to prevent memory leaks
  const newRefs: Record<number, HTMLElement> = {};
  Object.keys(opinionRefs.value).forEach((key) => {
    const idx = parseInt(key);
    if (idx < index) {
      newRefs[idx] = opinionRefs.value[idx];
    } else if (idx > index) {
      newRefs[idx - 1] = opinionRefs.value[idx];
    }
    // Skip the removed index (idx === index) to clean it up
  });
  opinionRefs.value = newRefs;

  // Clean up opinionComponentRefs to prevent memory leaks
  const newComponentRefs: Record<
    number,
    InstanceType<typeof SeedOpinionItem>
  > = {};
  Object.keys(opinionComponentRefs.value).forEach((key) => {
    const idx = parseInt(key);
    if (idx < index) {
      newComponentRefs[idx] = opinionComponentRefs.value[idx];
    } else if (idx > index) {
      newComponentRefs[idx - 1] = opinionComponentRefs.value[idx];
    }
    // Skip the removed index (idx === index) to clean it up
  });
  opinionComponentRefs.value = newComponentRefs;
}

function validateSeedOpinions(): boolean {
  // GitHub-linked conversations don't need manual seeds
  if (conversationDraft.value.externalSourceConfig !== null) {
    return true;
  }

  // MaxDiff requires minimum 2 seed opinions
  if (
    conversationDraft.value.conversationType === "maxdiff" &&
    conversationDraft.value.seedOpinions.filter(
      (s: string) => s.trim().length > 0
    ).length < 2
  ) {
    showNotifyMessage(t("needMinimumForMaxDiff"));
    return false;
  }

  // Clear previous errors
  opinionErrors.value = {};

  let hasErrors = false;
  let firstErrorIndex = -1;

  // Check each opinion for validation issues
  conversationDraft.value.seedOpinions.forEach(
    (opinion: string, index: number) => {
      const trimmedOpinion = opinion.trim();

      // Check for empty opinions
      if (trimmedOpinion.length === 0) {
        opinionErrors.value[index] = t("opinionCannotBeEmpty");
        hasErrors = true;
        if (firstErrorIndex === -1) firstErrorIndex = index;
        return;
      }

      // Check word count limit
      const validation = validateHtmlStringCharacterCount(opinion, "opinion");
      if (!validation.isValid) {
        opinionErrors.value[index] = t("opinionExceedsLimit")
          .replaceAll("{limit}", MAX_LENGTH_OPINION.toString())
          .replaceAll("{count}", validation.characterCount.toString());
        hasErrors = true;
        if (firstErrorIndex === -1) firstErrorIndex = index;
        return;
      }

      // Check for duplicate opinions
      const duplicateIndex = conversationDraft.value.seedOpinions.findIndex(
        (otherOpinion: string, otherIndex: number) =>
          otherIndex !== index &&
          otherOpinion.trim().toLowerCase() === trimmedOpinion.toLowerCase()
      );

      if (duplicateIndex !== -1) {
        opinionErrors.value[index] = t("opinionDuplicate");
        hasErrors = true;
        if (firstErrorIndex === -1) firstErrorIndex = index;
      }
    }
  );

  // If there are errors, scroll to the first problematic item
  if (hasErrors && firstErrorIndex !== -1) {
    setTimeout(() => {
      const errorElement = opinionRefs.value[firstErrorIndex];
      if (errorElement) {
        errorElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 100);
  }

  return !hasErrors;
}

async function onSubmit() {
  if (!isLoggedIn.value) {
    showLoginDialog.value = true;
  } else {
    if (!validateSeedOpinions()) {
      return;
    }

    isSubmitButtonLoading.value = true;

    const response = await createNewPost({
      postTitle: conversationDraft.value.title,
      postBody:
        conversationDraft.value.content == ""
          ? undefined
          : conversationDraft.value.content,
      pollingOptionList: conversationDraft.value.poll.enabled
        ? conversationDraft.value.poll.options
        : undefined,
      postAsOrganizationName: conversationDraft.value.postAs.postAsOrganization
        ? conversationDraft.value.postAs.organizationName
        : "",
      targetIsoConvertDateString: conversationDraft.value
        .privateConversationSettings.hasScheduledConversion
        ? conversationDraft.value.privateConversationSettings.conversionDate.toISOString()
        : undefined,
      isIndexed: !conversationDraft.value.isPrivate,
      participationMode: conversationDraft.value.participationMode,
      conversationType: conversationDraft.value.conversationType,
      seedOpinionList: conversationDraft.value.seedOpinions,
      requiresEventTicket: conversationDraft.value.requiresEventTicket,
      externalSourceConfig: conversationDraft.value.externalSourceConfig,
    });

    if (response.status == "success") {
      // Sync GitHub issues if this is a GitHub-linked conversation
      if (conversationDraft.value.externalSourceConfig !== null) {
        await syncMaxDiff({
          conversationSlugId: response.data.conversationSlugId,
        });
      }

      invalidateFeed();

      // Set navigation context to indicate user came from conversation creation
      navigationStore.setConversationCreationContext(true);

      // Clear draft before navigation (successful submission)
      resetDraft();

      // Unlock route to prevent "save draft" dialog
      routeGuard.value?.unlockRoute();

      await router.replace({
        name: "/conversation/[postSlugId]/",
        params: { postSlugId: response.data.conversationSlugId },
      });

      // Don't stop loading - let component unmount with loading state active
    } else {
      isSubmitButtonLoading.value = false;
      handleAxiosErrorStatusCodes({
        axiosErrorCode: response.code,
        defaultMessage: t("errorCreatingConversation"),
      });
    }
  }
}
</script>

<style scoped lang="scss">
.container {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.seed-opinions-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: var(--font-weight-medium);
  margin: 0;
  color: #333;
}

.section-description {
  color: #666;
  font-size: 0.9rem;
  line-height: 1.4;
  margin: 0;
}

.add-button-container {
  display: flex;
  justify-content: flex-start;
}

.opinions-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.preview-loading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: $color-text-weak;
  padding: 1rem 0;
}

.github-preview-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: $app-background-color;
  border-radius: 8px;
}

.preview-item-title {
  flex: 1;
  min-width: 0;
  font-size: 0.95rem;
  color: #333;
}

.preview-item-link {
  color: $color-text-weak;
  flex-shrink: 0;

  &:hover {
    color: $primary;
  }
}

.preview-empty {
  color: $color-text-weak;
  font-size: 0.9rem;
  padding: 1rem 0;
}
</style>
