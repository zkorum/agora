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
      <NewConversationControlBar
        :enable-polling="postDraft.enablePolling"
        @show-as-dialog="showAsDialog = true"
        @show-public-dialog="showPublicDialog = true"
        @toggle-polling="togglePolling()"
      />

      <div class="contentFlexStyle">
        <ZKCard
          v-if="profileData.organizationList.length > 0"
          padding="1rem"
          class="cardBackground"
        >
          <div class="organizationSection">
            <q-toggle
              v-model="postDraft.postAsOrganization"
              label="Post as an organization"
            />

            <div
              v-if="postDraft.postAsOrganization"
              class="organizationFlexList"
            >
              <div
                v-for="organization in profileData.organizationList"
                :key="organization"
              >
                <q-radio
                  v-model="postDraft.selectedOrganization"
                  :val="organization"
                  :label="organization"
                />
              </div>
            </div>
          </div>
        </ZKCard>

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

        <q-input
          v-model="postDraft.postTitle"
          borderless
          no-error-icon
          label="What do you want to ask?"
          type="textarea"
          lazy-rules
          :rules="[(val) => val && val.length > 0]"
          autogrow
          :maxlength="MAX_LENGTH_TITLE"
          required
        >
          <template #after>
            <div class="wordCountDiv">
              {{ postDraft.postTitle.length }} /
              {{ MAX_LENGTH_TITLE }}
            </div>
          </template>
        </q-input>

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

          <ZKCard
            v-if="postDraft.enablePolling"
            padding="1rem"
            :style="{ marginTop: '1rem', backgroundColor: 'white' }"
          >
            <div>
              <div class="pollTopBar">
                <div>Add a Poll</div>
                <ZKButton
                  button-type="icon"
                  flat
                  text-color="black"
                  icon="mdi-close"
                  @click="togglePolling()"
                />
              </div>
              <div ref="pollRef" class="pollingFlexStyle">
                <div
                  v-for="index in postDraft.pollingOptionList.length"
                  :key="index"
                  class="pollingItem"
                >
                  <q-input
                    v-model="postDraft.pollingOptionList[index - 1]"
                    :rules="[(val) => val && val.length > 0]"
                    type="text"
                    :label="'Option ' + index"
                    :style="{ width: '100%' }"
                    :maxlength="MAX_LENGTH_OPTION"
                    autogrow
                    clearable
                  />
                  <div
                    v-if="postDraft.pollingOptionList.length != 2"
                    class="deletePollOptionDiv"
                  >
                    <ZKButton
                      button-type="icon"
                      flat
                      round
                      icon="mdi-delete"
                      text-color="primary"
                      @click="removePollOption(index - 1)"
                    />
                  </div>
                </div>

                <div>
                  <ZKButton
                    button-type="standardButton"
                    flat
                    text-color="primary"
                    icon="mdi-plus"
                    label="Add Option"
                    :disable="postDraft.pollingOptionList.length == 6"
                    @click="addPollOption()"
                  />
                </div>
              </div>
            </div>
          </ZKCard>
        </div>
      </div>
    </div>

    <div ref="endOfFormRef"></div>

    <ExitRoutePrompt
      v-model="showExitDialog"
      title="Save conversation as draft?"
      description="Your drafted conversation will be here when you return."
      :save-draft="saveDraft"
      :no-save-draft="noSaveDraft"
    />

    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      :active-intention="'newConversation'"
    />

    <q-dialog v-model="showAsDialog" position="bottom">
      <ZKBottomDialogContainer>
        <div class="title-style">Post As:</div>
      </ZKBottomDialogContainer>
    </q-dialog>

    <q-dialog v-model="showPublicDialog" position="bottom">
      <ZKBottomDialogContainer>
        <div class="title-style">Visibility:</div>
      </ZKBottomDialogContainer>
    </q-dialog>
  </NewConversationLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { type RouteLocationNormalized, useRouter } from "vue-router";
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
import ExitRoutePrompt from "src/components/routeGuard/ExitRoutePrompt.vue";
import { useRouteGuard } from "src/utils/component/routing/routeGuard";
import { storeToRefs } from "pinia";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import DatePicker from "primevue/datepicker";
import { useUserStore } from "src/stores/user";
import NewConversationLayout from "src/components/newConversation/NewConversationLayout.vue";
import NewConversationControlBar from "src/components/newConversation/NewConversationControlBar.vue";
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";

const bodyWordCount = ref(0);
const exceededBodyWordCount = ref(false);

const router = useRouter();

const pollRef = ref<HTMLElement | null>(null);
const endOfFormRef = ref<HTMLElement | null>();

const { isPostEdited, getEmptyConversationDraft } = useNewPostDraftsStore();
const { postDraft } = storeToRefs(useNewPostDraftsStore());

const {
  lockRoute,
  unlockRoute,
  showExitDialog,
  proceedWithNavigation,
  isRouteLockedCheck,
} = useRouteGuard(() => isPostEdited(), onBeforeRouteLeaveCallback);

const { profileData } = storeToRefs(useUserStore());
const showLoginDialog = ref(false);
const showAsDialog = ref(false);
const showPublicDialog = ref(false);

const { createNewConversationIntention, clearNewConversationIntention } =
  useLoginIntentionStore();
clearNewConversationIntention();

onMounted(async () => {
  lockRoute();
});

async function saveDraft() {
  await proceedWithNavigation(() => {});
}

async function noSaveDraft() {
  postDraft.value = getEmptyConversationDraft();
  await proceedWithNavigation(() => {});
}

function onLoginCallback() {
  unlockRoute();
  createNewConversationIntention();
}

function onBeforeRouteLeaveCallback(_to: RouteLocationNormalized): boolean {
  if (isPostEdited() && isRouteLockedCheck()) {
    return false;
  } else {
    return true;
  }
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
  postDraft.value.enablePolling = !postDraft.value.enablePolling;

  if (postDraft.value.enablePolling) {
    setTimeout(function () {
      pollRef.value?.scrollIntoView({
        behavior: "smooth",
        inline: "start",
      });
    }, 100);
  } else {
    postDraft.value.pollingOptionList =
      getEmptyConversationDraft().pollingOptionList;
    setTimeout(function () {
      endOfFormRef.value?.scrollIntoView({
        behavior: "smooth",
        inline: "start",
      });
    }, 100);
  }
}

function addPollOption() {
  postDraft.value.pollingOptionList.push("");
}

function removePollOption(index: number) {
  postDraft.value.pollingOptionList.splice(index, 1);
}

async function goToPreview() {
  unlockRoute();
  await router.push({ name: "/conversation/new/preview/" });
}
</script>

<style scoped lang="scss">
.pollingFlexStyle {
  display: flex;
  flex-direction: column;
}

.pollingForm {
  padding-top: 1rem;
  padding-bottom: 6rem;
}

.title-style {
  font-size: 1.1rem;
  font-weight: 600;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.pollingItem {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.editorPadding {
  padding-bottom: 8rem;
  font-size: 1.1rem;
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

.deletePollOptionDiv {
  width: 3rem;
  padding-bottom: 1rem;
  padding-left: 0.5rem;
}

.pollTopBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 1rem;
  font-weight: bold;
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
</style>
