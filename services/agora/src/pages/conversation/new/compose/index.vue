<template>
  <NewConversationLayout>
    <TopMenuWrapper>
      <div class="menuFlexGroup">
        <BackButton />
      </div>

      <ZKButton
        button-type="largeButton"
        color="primary"
        label="Next"
        size="0.8rem"
        @click="goToPreview()"
      />
    </TopMenuWrapper>

    <div class="container">
      <NewConversationControlBar @toggle-polling="togglePolling()" />

      <div class="contentFlexStyle">
        <ZKCard padding="1rem" class="cardBackground">
          <div class="organizationSection">
            <q-toggle
              v-model="postDraft.isPrivatePost"
              label="This is a private conversation"
            />

            <div v-if="postDraft.isPrivatePost" class="organizationSection">
              <q-checkbox
                v-model="postDraft.isLoginRequiredToParticipate"
                label="Require user login to participate"
              />

              <q-checkbox
                v-if="postDraft.isPrivatePost"
                v-model="postDraft.autoConvertDate"
                label="Convert to public conversation on a scheduled date"
              />

              <DatePicker
                v-if="postDraft.autoConvertDate"
                v-model="postDraft.targetConvertDate"
                show-time
                hour-format="12"
                :min-date="new Date()"
                fluid
              />
            </div>
          </div>
        </ZKCard>

        <div :style="{ paddingLeft: '0.5rem' }">
          <q-input
            v-model="postDraft.postTitle"
            borderless
            no-error-icon
            placeholder="What do you want to ask?"
            type="textarea"
            autogrow
            :maxlength="MAX_LENGTH_TITLE"
            required
            :error="titleError"
            class="large-text-input"
            @input="clearTitleError"
          >
            <template #after>
              <div class="wordCountDiv">
                {{ postDraft.postTitle.length }} /
                {{ MAX_LENGTH_TITLE }}
              </div>
            </template>
          </q-input>
        </div>

        <div v-if="titleError" class="titleErrorMessage">
          <q-icon name="mdi-alert-circle" class="titleErrorIcon" />
          Title is required to continue
        </div>

        <div>
          <div class="editorPadding">
            <ZKEditor
              v-model="postDraft.postBody"
              placeholder="Body text. Provide context or relevant resources. Make sure it’s aligned with the main question!"
              min-height="5rem"
              :focus-editor="false"
              :show-toolbar="true"
              :add-background-color="false"
              @update:model-value="checkWordCount()"
            />

            <div class="wordCountDiv">
              <q-icon
                v-if="bodyWordCount > MAX_LENGTH_BODY"
                name="mdi-alert-circle"
                class="bodySizeWarningIcon"
              />
              <span
                :class="{
                  wordCountWarning: bodyWordCount > MAX_LENGTH_BODY,
                }"
                >{{ bodyWordCount }}
              </span>
              &nbsp; / {{ MAX_LENGTH_BODY }}
            </div>
          </div>

          <div
            v-if="postDraft.enablePolling"
            :style="{ paddingBottom: '8rem' }"
          >
            <PollComponent
              ref="pollComponentRef"
              v-model:polling-options="postDraft.pollingOptionList"
              :max-length-option="MAX_LENGTH_OPTION"
              @close="togglePolling()"
            />
          </div>
        </div>
      </div>
    </div>

    <div></div>

    <NewConversationRouteGuard
      ref="routeGuardRef"
      :allowed-routes="['/conversation/new/preview/']"
    />

    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      :active-intention="'newConversation'"
    />
  </NewConversationLayout>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import TopMenuWrapper from "src/components/navigation/header/TopMenuWrapper.vue";
import ZKEditor from "src/components/ui-library/ZKEditor.vue";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import {
  MAX_LENGTH_OPTION,
  MAX_LENGTH_TITLE,
  MAX_LENGTH_BODY,
  validateHtmlStringCharacterCount,
} from "src/shared/shared";
import { storeToRefs } from "pinia";
import DatePicker from "primevue/datepicker";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import NewConversationLayout from "src/components/newConversation/NewConversationLayout.vue";
import NewConversationControlBar from "src/components/newConversation/NewConversationControlBar.vue";
import NewConversationRouteGuard from "src/components/newConversation/NewConversationRouteGuard.vue";
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import PollComponent from "src/components/newConversation/PollComponent.vue";

const bodyWordCount = ref(0);
const exceededBodyWordCount = ref(false);
const titleError = ref(false);

const router = useRouter();
const routeGuardRef = ref<InstanceType<
  typeof NewConversationRouteGuard
> | null>(null);

const pollComponentRef = ref<InstanceType<typeof PollComponent> | null>(null);

const { getEmptyConversationDraft } = useNewPostDraftsStore();
const { postDraft } = storeToRefs(useNewPostDraftsStore());

const { createNewConversationIntention } = useLoginIntentionStore();

const showLoginDialog = ref(false);

function onLoginCallback() {
  createNewConversationIntention();
}

function checkWordCount() {
  bodyWordCount.value = validateHtmlStringCharacterCount(
    postDraft.value.postBody,
    "conversation"
  ).characterCount;

  if (bodyWordCount.value > MAX_LENGTH_BODY) {
    exceededBodyWordCount.value = true;
  } else {
    exceededBodyWordCount.value = false;
  }
}

async function togglePolling() {
  if (postDraft.value.enablePolling) {
    setTimeout(function () {
      pollComponentRef.value?.$el?.scrollIntoView({
        behavior: "smooth",
        inline: "start",
      });
    }, 100);
  } else {
    postDraft.value.pollingOptionList =
      getEmptyConversationDraft().pollingOptionList;
  }
}

function clearTitleError() {
  if (titleError.value && postDraft.value.postTitle.trim().length > 0) {
    titleError.value = false;
  }
}

async function goToPreview() {
  if (postDraft.value.postTitle.trim().length === 0) {
    titleError.value = true;
    return;
  }

  titleError.value = false;
  routeGuardRef.value?.unlockRoute();
  await router.push({ name: "/conversation/new/preview/" });
}
</script>

<style scoped lang="scss">
.title-style {
  font-size: 1.1rem;
  font-weight: 600;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.editorPadding {
  padding-bottom: 8rem;
  font-size: 1rem;
}

.wordCountDiv {
  display: flex;
  justify-content: right;
  align-items: center;
  color: $color-text-weak;
  font-size: 1rem;
}

.wordCountWarning {
  color: $negative;
  font-weight: bold;
}

.bodySizeWarningIcon {
  font-size: 1rem;
  padding-right: 0.5rem;
}

.cardBackground {
  background-color: white;
}

.organizationSection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.organizationFlexList {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.contentFlexStyle {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1rem;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding-top: 2rem;
}

.titleErrorMessage {
  display: flex;
  align-items: center;
  color: $negative;
  font-size: 0.9rem;
  padding-left: 0.5rem;
}

.titleErrorIcon {
  font-size: 1rem;
  margin-right: 0.5rem;
}

.large-text-input :deep(.q-field__control) {
  font-size: 1.2rem;
}

.large-text-input :deep(.q-field__native) {
  font-weight: 500;
}
</style>
