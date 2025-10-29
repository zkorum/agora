<template>
  <NewConversationLayout>
    <TopMenuWrapper>
      <BackButton />

      <ZKButton
        button-type="largeButton"
        color="primary"
        :label="isSubmitButtonLoading ? t('posting') : t('post')"
        size="0.8rem"
        :loading="isSubmitButtonLoading"
        @click="onSubmit()"
      />
    </TopMenuWrapper>

    <div class="container">
      <!-- Title with Privacy Label -->
      <ConversationTitleWithPrivacyLabel
        :is-private="conversationDraft.isPrivate"
        :title="conversationDraft.title"
        size="large"
      />

      <!-- Add Seed Opinions Section -->
      <div class="seed-opinions-section">
        <div class="section-title">{{ t("addSeedOpinions") }}</div>
        <p class="section-description">
          {{ t("seedOpinionsDescription") }}
        </p>

        <!-- Add Opinion Button -->
        <div class="add-button-container">
          <ConversationControlButton
            :label="t('add')"
            icon="pi pi-plus"
            :show-border="false"
            icon-position="left"
            @click="addNewOpinion"
          />
        </div>

        <!-- Seed Opinions List -->
        <div
          v-if="conversationDraft.seedOpinions.length > 0"
          class="opinions-list"
        >
          <div
            v-for="(opinion, index) in conversationDraft.seedOpinions"
            :key="index"
            :ref="
              (el: Element | ComponentPublicInstance | null) =>
                setOpinionRef(el, index)
            "
            class="opinion-item"
          >
            <div class="opinion-input-container">
              <div v-if="opinionErrors[index]" class="opinion-error-message">
                <q-icon name="mdi-alert-circle" class="opinion-error-icon" />
                {{ opinionErrors[index] }}
              </div>

              <ZKEditor
                v-model="conversationDraft.seedOpinions[index]"
                class="textarea-border-style"
                :placeholder="t('inputTextPlaceholder')"
                :show-toolbar="true"
                min-height="1rem"
                :add-background-color="true"
                :class="{
                  'textarea-active-border': currentActiveOpinionIndex === index,
                  'textarea-error-border': opinionErrors[index],
                }"
                @update:model-value="checkOpinionWordCount(index)"
                @manually-focused="
                  () => {
                    currentActiveOpinionIndex = index;
                    clearOpinionError(index);
                  }
                "
              />
            </div>

            <ZKButton
              icon="mdi-delete"
              button-type="icon"
              class="buttonColor"
              @click="removeOpinion(index)"
            />
          </div>
        </div>
      </div>
    </div>

    <NewConversationRouteGuard
      :allowed-routes="['/conversation/new/create/', '/welcome/']"
    />

    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      :active-intention="'newConversation'"
    />
  </NewConversationLayout>
</template>

<script setup lang="ts">
import { ref, type ComponentPublicInstance, onMounted } from "vue";
import { useRouter } from "vue-router";
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import TopMenuWrapper from "src/components/navigation/header/TopMenuWrapper.vue";
import NewConversationLayout from "src/components/newConversation/NewConversationLayout.vue";
import NewConversationRouteGuard from "src/components/newConversation/NewConversationRouteGuard.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ConversationControlButton from "src/components/newConversation/ConversationControlButton.vue";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { useBackendPostApi } from "src/utils/api/post";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useAuthenticationStore } from "src/stores/authentication";
import { storeToRefs } from "pinia";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useCommonApi } from "src/utils/api/common";
import ZKEditor from "src/components/ui-library/ZKEditor.vue";
import ConversationTitleWithPrivacyLabel from "src/components/features/conversation/ConversationTitleWithPrivacyLabel.vue";
import {
  MAX_LENGTH_OPINION,
  validateHtmlStringCharacterCount,
} from "src/shared/shared";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  conversationReviewTranslations,
  type ConversationReviewTranslations,
} from "./index.i18n";
import { useNavigationStore } from "src/stores/navigation";

const { isLoggedIn } = storeToRefs(useAuthenticationStore());
const router = useRouter();

const { createEmptyDraft, validateForReview } = useNewPostDraftsStore();
const { conversationDraft } = storeToRefs(useNewPostDraftsStore());

const { createNewPost } = useBackendPostApi();
const { loadPostData } = useHomeFeedStore();
const { handleAxiosErrorStatusCodes } = useCommonApi();

const showLoginDialog = ref(false);
const isSubmitButtonLoading = ref(false);
const currentActiveOpinionIndex = ref(-1);

// Validation state
const opinionErrors = ref<Record<number, string>>({});
const opinionRefs = ref<Record<number, HTMLElement>>({});

const { createNewConversationIntention } = useLoginIntentionStore();
const navigationStore = useNavigationStore();

const { t } = useComponentI18n<ConversationReviewTranslations>(
  conversationReviewTranslations
);

onMounted(async () => {
  const validation = validateForReview();
  if (!validation.isValid) {
    await router.replace({ name: "/conversation/new/create/" });
  }
});

function onLoginCallback() {
  createNewConversationIntention();
}

function setOpinionRef(
  el: Element | ComponentPublicInstance | null,
  index: number
) {
  if (el) {
    // Handle Vue component instance
    if ("$el" in el) {
      opinionRefs.value[index] = el.$el as HTMLElement;
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

function checkOpinionWordCount(index: number) {
  const opinion = conversationDraft.value.seedOpinions[index];
  const validation = validateHtmlStringCharacterCount(opinion, "opinion");

  if (!validation.isValid) {
    opinionErrors.value[index] = t("opinionExceedsLimit")
      .replace("{limit}", MAX_LENGTH_OPINION.toString())
      .replace("{count}", validation.characterCount.toString());
  } else {
    // Clear word count error if it exists, but keep other errors
    if (opinionErrors.value[index]?.includes("character limit")) {
      clearOpinionError(index);
    }
  }
}

function addNewOpinion() {
  conversationDraft.value.seedOpinions.push("");
}

function removeOpinion(index: number) {
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
}

function validateSeedOpinions(): boolean {
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
          .replace("{limit}", MAX_LENGTH_OPINION.toString())
          .replace("{count}", validation.characterCount.toString());
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

    try {
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
        isLoginRequired: !conversationDraft.value.isPrivate
          ? false
          : conversationDraft.value.privateConversationSettings.requiresLogin,
        seedOpinionList: conversationDraft.value.seedOpinions,
      });

      if (response.status == "success") {
        conversationDraft.value = createEmptyDraft();

        await loadPostData();

        // Set navigation context to indicate user came from conversation creation
        navigationStore.setConversationCreationContext(true);

        await router.replace({
          name: "/conversation/[postSlugId]",
          params: { postSlugId: response.data.conversationSlugId },
        });
      } else {
        handleAxiosErrorStatusCodes({
          axiosErrorCode: response.code,
          defaultMessage: t("errorCreatingConversation"),
        });
      }
    } finally {
      isSubmitButtonLoading.value = false;
    }
  }
}
</script>

<style scoped lang="scss">
.container {
  padding: 2rem 1rem;
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
  gap: 0.75rem;
}

.opinion-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.buttonColor {
  color: #9a97a4;
}

.textarea-border-style {
  border-radius: 12px;
  border-width: 1px;
  border-style: solid;
  border-color: #e2e1e7;
  padding: 1rem;
  background-color: white;

  &:hover {
    border-color: #6b4eff;
  }
}

.textarea-active-border {
  border-color: #6b4eff;
}

.textarea-error-border {
  border-color: #f44336;
}

.opinion-input-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.opinion-error-message {
  display: flex;
  align-items: center;
  color: #f44336;
  font-size: 0.9rem;
}

.opinion-error-icon {
  font-size: 1rem;
  margin-right: 0.5rem;
}
</style>
