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
            <ZKButton
              button-type="icon"
              icon="mdi-close"
              text-color="color-text-strong"
              flat
              @click="router.back()"
            />
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

        <div>
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
        title="Discard this conversation?"
        description="Your drafted conversation will not be saved"
        @leave-foute="leaveRoute()"
      />
    </div>

    <LoginConfirmationDialog
      v-model="showLoginDialog"
      :ok-callback="onLoginCallback"
      :active-intention="'newConversation'"
    />
  </DrawerLayout>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { type RouteLocationNormalized, useRouter } from "vue-router";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import TopMenuWrapper from "src/components/navigation/header/TopMenuWrapper.vue";
import ZKEditor from "src/components/ui-library/ZKEditor.vue";
import {
  emptyConversationDraft,
  useNewPostDraftsStore,
} from "src/utils/component/conversation/newPostDrafts";
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
import LoginConfirmationDialog from "src/components/authentication/LoginConfirmationDialog.vue";
import { useLoginIntentionStore } from "src/stores/loginIntention";

const { isAuthenticated } = storeToRefs(useAuthenticationStore());

const bodyWordCount = ref(0);
const exceededBodyWordCount = ref(false);

const router = useRouter();

const quasar = useQuasar();

const { visualViewPortHeight } = useViewPorts();

const pollRef = ref<HTMLElement | null>(null);
const endOfFormRef = ref<HTMLElement | null>();

const { postDraft, isPostEdited } = useNewPostDraftsStore();
const { grantedRouteLeave, savedToRoute, showExitDialog, leaveRoute } =
  useRouteGuard(routeLeaveCallback, onBeforeRouteLeaveCallback);

const { createNewPost } = useBackendPostApi();
const { loadPostData } = usePostStore();

const showLoginDialog = ref(false);

const { createNewConversationIntention, clearNewConversationIntention } =
  useLoginIntentionStore();
const newConversationIntention = clearNewConversationIntention();
postDraft.value = {
  enablePolling: newConversationIntention.conversationDraft.enablePolling,
  pollingOptionList:
    newConversationIntention.conversationDraft.pollingOptionList,
  postBody: newConversationIntention.conversationDraft.postBody,
  postTitle: newConversationIntention.conversationDraft.postTitle,
};

function onLoginCallback() {
  grantedRouteLeave.value = true;
  createNewConversationIntention(postDraft.value);
}

function onBeforeRouteLeaveCallback(to: RouteLocationNormalized): boolean {
  if (isPostEdited() && !grantedRouteLeave.value) {
    if (isAuthenticated.value) {
      savedToRoute.value = to;
      showExitDialog.value = true;
      return false;
    } else {
      return true;
    }
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
    postDraft.value.pollingOptionList = structuredClone(
      emptyConversationDraft
    ).pollingOptionList;
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

    grantedRouteLeave.value = true;

    const response = await createNewPost(
      postDraft.value.postTitle,
      postDraft.value.postBody == "" ? undefined : postDraft.value.postBody,
      postDraft.value.enablePolling
        ? postDraft.value.pollingOptionList
        : undefined
    );

    if (response != null) {
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
</style>
