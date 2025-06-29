<!-- eslint-disable vue/no-v-html -->
<template>
  <NewConversationLayout>
    <TopMenuWrapper>
      <BackButton />

      <ZKButton
        button-type="largeButton"
        color="primary"
        :label="isSubmitButtonLoading ? 'Submitting...' : 'Submit'"
        size="0.8rem"
        :loading="isSubmitButtonLoading"
        @click="onSubmit()"
      />
    </TopMenuWrapper>

    <div class="container">
      {{ postDraft }}
    </div>

    <NewConversationRouteGuard
      :allowed-routes="['/conversation/new/compose/']"
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
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import TopMenuWrapper from "src/components/navigation/header/TopMenuWrapper.vue";
import NewConversationLayout from "src/components/newConversation/NewConversationLayout.vue";
import NewConversationRouteGuard from "src/components/newConversation/NewConversationRouteGuard.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useNewPostDraftsStore } from "src/stores/newConversationDrafts";
import { useBackendPostApi } from "src/utils/api/post";
import { useHomeFeedStore } from "src/stores/homeFeed";
import { useAuthenticationStore } from "src/stores/authentication";
import { storeToRefs } from "pinia";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useCommonApi } from "src/utils/api/common";

const { isLoggedIn } = storeToRefs(useAuthenticationStore());
const router = useRouter();

const { getEmptyConversationDraft } = useNewPostDraftsStore();
const { postDraft } = storeToRefs(useNewPostDraftsStore());

const { createNewPost } = useBackendPostApi();
const { loadPostData } = useHomeFeedStore();
const { handleAxiosErrorStatusCodes } = useCommonApi();

const showLoginDialog = ref(false);
const isSubmitButtonLoading = ref(false);

const { createNewConversationIntention } = useLoginIntentionStore();

function onLoginCallback() {
  createNewConversationIntention();
}

async function onSubmit() {
  if (!isLoggedIn.value) {
    showLoginDialog.value = true;
  } else {
    isSubmitButtonLoading.value = true;

    const response = await createNewPost({
      postTitle: postDraft.value.postTitle,
      postBody:
        postDraft.value.postBody == "" ? undefined : postDraft.value.postBody,
      pollingOptionList: postDraft.value.enablePolling
        ? postDraft.value.pollingOptionList
        : undefined,
      postAsOrganizationName: postDraft.value.postAsOrganization
        ? postDraft.value.selectedOrganization
        : "",
      targetIsoConvertDateString: postDraft.value.autoConvertDate
        ? postDraft.value.targetConvertDate.toISOString()
        : undefined,
      isIndexed: !postDraft.value.isPrivatePost,
      isLoginRequired: !postDraft.value.isPrivatePost
        ? false
        : postDraft.value.isLoginRequiredToParticipate,
    });

    isSubmitButtonLoading.value = false;

    if (response.status == "success") {
      postDraft.value = getEmptyConversationDraft();

      await loadPostData();

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
.container {
  padding: 2rem 1rem;
}
</style>
