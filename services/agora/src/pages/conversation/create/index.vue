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
        <TopMenuWrapper :reveal="false">
          <div class="menuFlexGroup">
            <ZKButton
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
                unelevated
                rounded
                :label="postDraft.enablePolling ? 'Remove Poll' : 'Add Poll'"
                icon="mdi-poll"
                color="grey-8"
                text-color="white"
                @click="togglePolling()"
              />
            </div>

            <ZKButton
              color="primary"
              label="Post"
              type="submit"
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

      <q-dialog v-model="showExitDialog">
        <ZKCard padding="1rem" :style="{ backgroundColor: 'white' }">
          <div class="exitDialogStyle">
            <div class="dialogTitle">Discard this post?</div>

            <div>Your drafted post will not be saved.</div>

            <div class="dialogButtons">
              <ZKButton v-close-popup flat label="Cancel" />
              <ZKButton
                v-close-popup
                label="Discard"
                text-color="primary"
                @click="leaveRoute()"
              />
            </div>
          </div>
        </ZKCard>
      </q-dialog>
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from "vue";
import {
  onBeforeRouteLeave,
  type RouteLocationNormalized,
  useRouter,
} from "vue-router";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import TopMenuWrapper from "src/components/navigation/TopMenuWrapper.vue";
import ZKEditor from "src/components/ui-library/ZKEditor.vue";
import { useNewPostDraftsStore } from "src/stores/newPostDrafts";
import { useViewPorts } from "src/utils/html/viewPort";
import { getCharacterCount } from "src/utils/component/editor";
import { useBackendPostApi } from "src/utils/api/post";
import {
  MAX_LENGTH_OPTION,
  MAX_LENGTH_TITLE,
  MAX_LENGTH_BODY,
} from "src/shared/shared";
import { usePostStore } from "src/stores/post";
import { useQuasar } from "quasar";
import DrawerLayout from "src/layouts/DrawerLayout.vue";

const bodyWordCount = ref(0);
const exceededBodyWordCount = ref(false);

const router = useRouter();

const quasar = useQuasar();

const { visualViewPortHeight } = useViewPorts();

const pollRef = ref<HTMLElement | null>(null);
const endOfFormRef = ref<HTMLElement | null>();

const showExitDialog = ref(false);

const { postDraft, isPostEdited } = useNewPostDraftsStore();

let grantedRouteLeave = false;

const { createNewPost } = useBackendPostApi();
const { loadPostData } = usePostStore();

let savedToRoute: RouteLocationNormalized = {
  matched: [],
  fullPath: "",
  query: {},
  hash: "",
  name: "/",
  path: "",
  meta: {},
  params: {},
  redirectedFrom: undefined,
};

window.onbeforeunload = function () {
  if (isPostEdited()) {
    return "Changes that you made may not be saved.";
  }
};

onUnmounted(() => {
  window.onbeforeunload = () => {};
});

function checkWordCount() {
  bodyWordCount.value = getCharacterCount(postDraft.value.postBody);

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
  quasar.loading.show();

  grantedRouteLeave = true;

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

async function leaveRoute() {
  grantedRouteLeave = true;
  await router.push(savedToRoute);
}

onBeforeRouteLeave((to) => {
  if (isPostEdited() && !grantedRouteLeave) {
    savedToRoute = to;
    showExitDialog.value = true;
    return false;
  } else {
    return true;
  }
});
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

.exitDialogStyle {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dialogTitle {
  font-size: 1.4rem;
  font-weight: bold;
}

.dialogButtons {
  display: flex;
  justify-content: space-around;
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
  padding-bottom: 20px;
  padding-left: 1rem;
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
  padding: 0.5rem;
  margin-top: 0.5rem;
}
</style>
