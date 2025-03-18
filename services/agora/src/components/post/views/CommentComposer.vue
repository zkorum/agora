<template>
  <div>
    <div class="container borderStyle">
      <ZKEditor
        :key="resetKey"
        v-model="commentText"
        placeholder="Add your own opinion"
        :min-height="innerFocus ? '6rem' : '2rem'"
        :focus-editor="showControls"
        :show-toolbar="innerFocus || showControls"
        :add-background-color="true"
        @update:model-value="checkWordCount()"
        @manually-focused="editorFocused()"
      />
      <div v-if="innerFocus || showControls" class="actionButtonCluster">
        <div v-if="characterProgress > 100">
          {{ MAX_LENGTH_OPINION - characterCount }}
        </div>

        <q-circular-progress
          :value="characterProgress"
          size="1.5rem"
          :thickness="0.3"
        />

        <q-separator vertical inset />

        <div>
          <ZKButton
            button-type="largeButton"
            label="Cancel"
            color="white"
            text-color="primary"
            @click="cancelClicked()"
          />
        </div>

        <ZKButton
          button-type="largeButton"
          label="Post"
          color="primary"
          :disable="characterProgress > 100 || characterProgress == 0"
          @click="submitPostClicked()"
        />
      </div>
    </div>

    <ExitRoutePrompt
      v-model="showExitDialog"
      title="Discard this opinion?"
      description="Your drafted opinion will not be saved"
      @leave-foute="leaveRoute()"
    />

    <LoginConfirmationDialog
      v-model="showLoginDialog"
      :on-ok-callback="onLoginCallback"
      :active-intention="'newOpinion'"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import LoginConfirmationDialog from "src/components/authentication/LoginConfirmationDialog.vue";
import ExitRoutePrompt from "src/components/routeGuard/ExitRoutePrompt.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKEditor from "src/components/ui-library/ZKEditor.vue";
import {
  MAX_LENGTH_OPINION,
  validateHtmlStringCharacterCount,
} from "src/shared/shared";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useBackendCommentApi } from "src/utils/api/comment";
import { useRouteGuard } from "src/utils/component/routing/routeGuard";
import { computed, ref, watch } from "vue";
import { RouteLocationNormalized } from "vue-router";

const props = defineProps<{
  showControls: boolean;
  postSlugId: string;
}>();

const { isAuthenticated } = storeToRefs(useAuthenticationStore());

const { createNewComment } = useBackendCommentApi();

const innerFocus = ref(false);

const characterProgress = computed(() => {
  return (characterCount.value / MAX_LENGTH_OPINION) * 100;
});

const commentText = ref("");
const characterCount = ref(0);
const resetKey = ref(0);

const showLoginDialog = ref(false);

const { createNewOpinionIntention } = useLoginIntentionStore();

const { grantedRouteLeave, savedToRoute, showExitDialog, leaveRoute } =
  useRouteGuard(routeLeaveCallback, onBeforeRouteLeaveCallback);

const emit = defineEmits<{
  (e: "cancelClicked"): void;
  (e: "editorFocused"): void;
  (e: "submittedComment", conversationSlugId: string): void;
}>();

watch(
  () => props.showControls,
  () => {
    if (props.showControls == false) {
      innerFocus.value = false;
    } else {
      innerFocus.value = true;
    }
  }
);

function onLoginCallback() {
  createNewOpinionIntention(props.postSlugId, commentText.value);
}

function routeLeaveCallback() {
  if (characterCount.value > 0) {
    return "Changes that you made may not be saved.";
  }
}

function onBeforeRouteLeaveCallback(to: RouteLocationNormalized): boolean {
  if (characterCount.value > 0 && !grantedRouteLeave.value) {
    savedToRoute.value = to;
    showExitDialog.value = true;
    return false;
  } else {
    return true;
  }
}

function editorFocused() {
  innerFocus.value = true;
  emit("editorFocused");
}

function checkWordCount() {
  characterCount.value = validateHtmlStringCharacterCount(
    commentText.value,
    "opinion"
  ).characterCount;
}

function cancelClicked() {
  emit("cancelClicked");
  innerFocus.value = false;
  resetKey.value = resetKey.value + 1;
  characterCount.value = 0;
}

async function submitPostClicked() {
  if (isAuthenticated.value) {
    const response = await createNewComment(
      commentText.value,
      props.postSlugId
    );
    if (response?.success) {
      emit("submittedComment", response.opinionSlugId);
      innerFocus.value = false;
      resetKey.value = resetKey.value + 1;
      characterCount.value = 0;
    }
  } else {
    showLoginDialog.value = true;
  }
}
</script>

<style scoped lang="scss">
.container {
  width: 100%;
  background-color: #e5e5e5;
}

.actionBar {
  display: flex;
  padding: 0.5rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: $color-text-weak;
}

.actionButtonCluster {
  display: flex;
  align-items: center;
  justify-content: right;
  gap: 1rem;
  padding: 1rem;
}

.borderStyle {
  border-radius: 15px;
  padding: 0.5rem;
  border-color: rgb(222, 222, 222);
  border-style: solid;
  border-width: 1px;
}
</style>
