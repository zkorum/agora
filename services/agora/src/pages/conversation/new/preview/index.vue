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

.previewContent {
  max-width: 800px;
  margin: 0 auto;
}

.previewSection {
  margin-bottom: 2rem;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.previewSection h3 {
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  color: #333;
}

.previewSection p {
  margin: 0;
  color: #666;
}

.previewSection ul {
  margin: 0;
  padding-left: 1.5rem;
}

.previewSection li {
  color: #666;
  margin-bottom: 0.25rem;
}

h2 {
  text-align: center;
  margin-bottom: 1rem;
  color: #333;
}
</style>
