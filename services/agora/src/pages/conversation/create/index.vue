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
              :disable="exceededBodyWordCount"
            />
          </div>
        </TopMenuWrapper>

        <div class="contentFlexStyle">
          <ZKCard padding="1rem" class="cardBackground">
            <div class="organizationSection">
              <q-toggle
                v-model="postAsOrganization"
                label="Post as an organization"
              />

              <div v-if="postAsOrganization" class="organizationFlexList">
                <div
                  v-for="organization in userOrganizationList"
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
import { useQuasar } from "quasar";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import ExitRoutePrompt from "src/components/routeGuard/ExitRoutePrompt.vue";
import { useRouteGuard } from "src/utils/component/routing/routeGuard";
import { useAuthenticationStore } from "src/stores/authentication";
import { storeToRefs } from "pinia";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import CloseButton from "src/components/navigation/buttons/CloseButton.vue";
import DatePicker from "primevue/datepicker";

const { isAuthenticated } = storeToRefs(useAuthenticationStore());

const bodyWordCount = ref(0);
const exceededBodyWordCount = ref(false);

const router = useRouter();

const quasar = useQuasar();

const { visualViewPortHeight } = useViewPorts();

const pollRef = ref<HTMLElement | null>(null);
const endOfFormRef = ref<HTMLElement | null>();

const postAsOrganization = ref(false);
const userOrganizationList = ref<string[]>([
  "Google Inc.",
  "Facebook Inc.",
  "Apple Inc.",
]);
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

const showLoginDialog = ref(false);

const { createNewConversationIntention, clearNewConversationIntention } =
  useLoginIntentionStore();
clearNewConversationIntention();

onMounted(() => {
  lockRoute();
});

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
    if (isAuthenticated.value) {
      savedToRoute.value = to;
    }
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
    console.log("post edited...");
    return "Changes that you made may not be saved.";
  } else {
    console.log("???");
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
  if (!isAuthenticated.value) {
    showLoginDialog.value = true;
  } else {
    quasar.loading.show();

    unlockRoute();

    const response = await createNewPost(
      postDraft.value.postTitle,
      postDraft.value.postBody == "" ? undefined : postDraft.value.postBody,
      postDraft.value.enablePolling
        ? postDraft.value.pollingOptionList
        : undefined
    );

    if (response != null) {
      postDraft.value = getEmptyConversationDraft();

      quasar.loading.hide();

      await loadPostData(false);

      await router.push({
        name: "/conversation/[postSlugId]",
        params: { postSlugId: response.conversationSlugId },
      });
    } else {
      quasar.loading.hide();
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
</style>
