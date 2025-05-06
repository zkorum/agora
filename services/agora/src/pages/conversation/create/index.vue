<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: false,
      enableFooter: false,
      enableHeader: false,
      reducedWidth: true,
    }"
  >
    <div class="container">
      <q-form @submit="onSubmit()">
        <TopMenuWrapper>
          <div class="menuFlexGroup">
            <CloseButton />
          </div>

          <div class="menuFlexGroup">
            <div
              :class="{ weakColor: postDraft.enablePolling }"
              :style="{ top: visualViewPortHeight - 120 + 'px', right: '2rem' }"
            >
              <ZKButton
                button-type="standardButton"
                unelevated
                rounded
                :label="postDraft.enablePolling ? 'Remove Poll' : 'Add Poll'"
                icon="mdi-poll"
                color="grey-8"
                text-color="white"
                size="0.8rem"
                @click="togglePolling()"
              />
            </div>

            <ZKButton
              button-type="standardButton"
              color="primary"
              label="Post"
              type="submit"
              size="0.8rem"
              :loading="isSubmitButtonLoading"
              :disable="exceededBodyWordCount || isSubmitButtonLoading"
            />
          </div>
        </TopMenuWrapper>

        <div class="contentFlexStyle">
          <ZKCard
            v-if="profileData.organizationList.length > 0"
            padding="1rem"
            class="cardBackground"
          >
            <div class="organizationSection">
              <q-toggle
                v-model="postAsOrganization"
                label="Post as an organization"
              />

              <div v-if="postAsOrganization" class="organizationFlexList">
                <div
                  v-for="organization in profileData.organizationList"
                  :key="organization"
                >
                  <q-radio
                    v-model="selectedOrganization"
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
                v-model="isPrivatePost"
                label="This is a private conversation"
              />

              <div v-if="isPrivatePost" class="organizationSection">
                <q-checkbox
                  v-model="isLoginRequiredToParticipate"
                  label="Require user login to participate"
                />

                <q-checkbox
                  v-if="isPrivatePost"
                  v-model="autoConvertDate"
                  label="Convert to public conversation on a scheduled date"
                />

                <DatePicker
                  v-if="autoConvertDate"
                  v-model="targetConvertDate"
                  show-time
                  hour-format="12"
                  :min-date="new Date()"
                  fluid
                />
              </div>
            </div>
          </ZKCard>

          <ZKCard padding="1rem" class="cardBackground">
            <div class="topicInstructions">Select one or more topics:</div>

            <div class="topicSelectorDiv">
              <div v-for="topic in fullTopicList" :key="topic.code">
                <q-btn
                  :ripple="false"
                  no-caps
                  no-wrap
                  size="md"
                  :label="topic.name"
                  unelevated
                  :outline="!selectedTopicCodeSet.has(topic.code)"
                  :color="
                    selectedTopicCodeSet.has(topic.code) ? 'primary' : undefined
                  "
                  :icon="
                    selectedTopicCodeSet.has(topic.code)
                      ? 'mdi-check-circle-outline'
                      : undefined
                  "
                  @click="toggleTopic(topic.code)"
                />
              </div>
            </div>
          </ZKCard>

          <q-input
            v-model="postDraft.postTitle"
            borderless
            no-error-icon
            type="textarea"
            label="Title"
            lazy-rules
            :rules="[(val) => val && val.length > 0]"
            class="titleStyle"
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
                placeholder="body text"
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

        <div ref="endOfForm"></div>
      </q-form>

      <ExitRoutePrompt
        v-model="showExitDialog"
        title="Save conversation as draft?"
        description="Your drafted conversation will be here when you return."
        :save-draft="saveDraft"
        :no-save-draft="noSaveDraft"
      />
    </div>

    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      :active-intention="'newConversation'"
    />
  </DrawerLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { type RouteLocationNormalized, useRouter } from "vue-router";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import TopMenuWrapper from "src/components/navigation/header/TopMenuWrapper.vue";
import ZKEditor from "src/components/ui-library/ZKEditor.vue";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { useViewPorts } from "src/utils/html/viewPort";
import { useBackendPostApi } from "src/utils/api/post";
import {
  MAX_LENGTH_OPTION,
  MAX_LENGTH_TITLE,
  MAX_LENGTH_BODY,
  validateHtmlStringCharacterCount,
} from "src/shared/shared";
import { usePostStore } from "src/stores/post";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import ExitRoutePrompt from "src/components/routeGuard/ExitRoutePrompt.vue";
import { useRouteGuard } from "src/utils/component/routing/routeGuard";
import { useAuthenticationStore } from "src/stores/authentication";
import { storeToRefs } from "pinia";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import CloseButton from "src/components/navigation/buttons/CloseButton.vue";
import DatePicker from "primevue/datepicker";
import { useUserStore } from "src/stores/user";
import { useCommonApi } from "src/utils/api/common";
import { useTopicStore } from "src/stores/topic";
import { useNotify } from "src/utils/ui/notify";

const { isLoggedIn } = storeToRefs(useAuthenticationStore());

const bodyWordCount = ref(0);
const exceededBodyWordCount = ref(false);

const router = useRouter();

const { visualViewPortHeight } = useViewPorts();

const pollRef = ref<HTMLElement | null>(null);
const endOfFormRef = ref<HTMLElement | null>();

const postAsOrganization = ref(false);
const selectedOrganization = ref("");
const isLoginRequiredToParticipate = ref(false);
const isPrivatePost = ref(false);
const autoConvertDate = ref(false);
const targetConvertDate = ref(getTomorrowsDate());

const { isPostEdited, getEmptyConversationDraft } = useNewPostDraftsStore();
const { postDraft } = storeToRefs(useNewPostDraftsStore());
const {
  isLockedRoute,
  lockRoute,
  unlockRoute,
  savedToRoute,
  showExitDialog,
  leaveRoute,
} = useRouteGuard(routeLeaveCallback, onBeforeRouteLeaveCallback);

const { createNewPost } = useBackendPostApi();
const { loadPostData } = usePostStore();
const { profileData } = storeToRefs(useUserStore());
const showLoginDialog = ref(false);

const isSubmitButtonLoading = ref(false);

const { handleAxiosErrorStatusCodes } = useCommonApi();

const { createNewConversationIntention, clearNewConversationIntention } =
  useLoginIntentionStore();
clearNewConversationIntention();

const { fullTopicList } = storeToRefs(useTopicStore());
const { loadTopicList } = useTopicStore();

const selectedTopicCodeSet = ref(new Set<string>());

const { showNotifyMessage } = useNotify();

onMounted(async () => {
  await loadTopicList();
  lockRoute();
});

function toggleTopic(code: string) {
  if (selectedTopicCodeSet.value.has(code)) {
    selectedTopicCodeSet.value.delete(code);
  } else {
    if (selectedTopicCodeSet.value.size == 3) {
      showNotifyMessage("A maximum of 3 topics can be selected");
    } else {
      selectedTopicCodeSet.value.add(code);
    }
  }
}

function getTomorrowsDate(): Date {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

async function saveDraft() {
  await leaveRoute(() => {});
}

async function noSaveDraft() {
  postDraft.value = getEmptyConversationDraft();
  await leaveRoute(() => {});
}

function onLoginCallback() {
  unlockRoute();
  createNewConversationIntention();
}

function onBeforeRouteLeaveCallback(to: RouteLocationNormalized): boolean {
  if (isPostEdited() && isLockedRoute()) {
    showExitDialog.value = true;
    savedToRoute.value = to;
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

function routeLeaveCallback() {
  if (isPostEdited()) {
    return "Changes that you made may not be saved.";
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

async function onSubmit() {
  if (selectedTopicCodeSet.value.size == 0) {
    showNotifyMessage("Add topics for the conversation");
    return;
  }

  if (!isLoggedIn.value) {
    showLoginDialog.value = true;
  } else {
    unlockRoute();

    isSubmitButtonLoading.value = true;

    const response = await createNewPost({
      postTitle: postDraft.value.postTitle,
      postBody:
        postDraft.value.postBody == "" ? undefined : postDraft.value.postBody,
      pollingOptionList: postDraft.value.enablePolling
        ? postDraft.value.pollingOptionList
        : undefined,
      postAsOrganizationName: postAsOrganization.value
        ? selectedOrganization.value
        : "",
      targetIsoConvertDateString: autoConvertDate.value
        ? targetConvertDate.value.toISOString()
        : undefined,
      isIndexed: !isPrivatePost.value,
      isLoginRequired: !isPrivatePost.value
        ? false
        : isLoginRequiredToParticipate.value,
      topicCodeList: Array.from(selectedTopicCodeSet.value),
    });

    isSubmitButtonLoading.value = false;

    if (response.status == "success") {
      postDraft.value = getEmptyConversationDraft();

      await loadPostData(false);

      await router.replace({
        name: "/conversation/[postSlugId]",
        params: { postSlugId: response.data.conversationSlugId },
      });
    } else {
      handleAxiosErrorStatusCodes({
        axiosErrorCode: response.code,
        defaultMessage: "Error while trying to create a new conversation",
      });
    }
  }
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

.titleStyle {
  font-size: 1.1rem;
  font-weight: bold;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.pollingItem {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.menuFlexGroup {
  display: flex;
  gap: 1.5rem;
}

.editorPadding {
  padding-bottom: 8rem;
}

.wordCountDiv {
  display: flex;
  justify-content: right;
  align-items: center;
  color: $color-text-weak;
  font-size: 0.8rem;
  font-weight: bold;
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

.weakColor {
  color: $color-text-weak;
}

.pollTopBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 1rem;
  font-weight: bold;
}

.container {
  padding-bottom: 0.5rem;
  padding-left: 0.5rem;
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

.topicSelectorDiv {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.5rem;
}

.topicInstructions {
  padding-bottom: 0.5rem;
  font-weight: 500;
}
</style>
