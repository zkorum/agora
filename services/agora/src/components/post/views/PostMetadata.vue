<template>
  <div>
    <div class="container">
      <div>
        <UserIdentity
          v-if="!skeletonMode"
          :author-verified="authorVerified"
          :created-at="createdAt"
          :user-identity="
            props.organizationName == ''
              ? posterUserName
              : props.organizationName
          "
          :show-verified-text="false"
          :organization-image-url="props.organizationUrl"
        />

        <div v-if="skeletonMode" class="identityFlex">
          <Skeleton shape="circle" size="2rem" />
          <Skeleton width="10rem" height="2rem" />
        </div>
      </div>

      <div>
        <div v-if="!skeletonMode">
          <ZKButton
            button-type="icon"
            flat
            text-color="color-text-weak"
            icon="mdi-dots-vertical"
            size="0.656rem"
            @click.stop.prevent="clickedMoreIcon()"
          />
        </div>
        <Skeleton
          v-if="skeletonMode"
          width="3rem"
          height="2rem"
          border-radius="16px"
        ></Skeleton>
      </div>
    </div>
  </div>

  <q-dialog v-model="showReportDialog">
    <ReportContentDialog
      :slug-id="props.postSlugId"
      report-type="conversation"
      @close="showReportDialog = false"
    />
  </q-dialog>

  <PreLoginIntentionDialog
    v-model="showLoginDialog"
    :ok-callback="() => onLoginConfirmationOk()"
    :active-intention="'reportUserContent'"
  />
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useBottomSheet } from "src/utils/ui/bottomSheet";
import Skeleton from "primevue/skeleton";
import { ref } from "vue";
import ReportContentDialog from "src/components/report/ReportContentDialog.vue";
import { useRoute, useRouter } from "vue-router";
import { useBackendUserMuteApi } from "src/utils/api/muteUser";
import { usePostStore } from "src/stores/post";
import UserIdentity from "./UserIdentity.vue";
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { storeToRefs } from "pinia";
import { useLoginIntentionStore } from "src/stores/loginIntention";

const emit = defineEmits(["openModerationHistory"]);

const props = defineProps<{
  authorVerified: boolean;
  posterUserName: string;
  createdAt: Date;
  skeletonMode: boolean;
  postSlugId: string;
  organizationUrl: string;
  organizationName: string;
}>();

const router = useRouter();
const route = useRoute();

const { showPostOptionSelector } = useBottomSheet();

const { isLoggedIn } = storeToRefs(useAuthenticationStore());

const { muteUser } = useBackendUserMuteApi();
const { loadPostData } = usePostStore();

const showReportDialog = ref(false);

const showLoginDialog = ref(false);

const { createReportUserContentIntention } = useLoginIntentionStore();

function onLoginConfirmationOk() {
  createReportUserContentIntention(props.postSlugId, "");
}

function reportContentCallback() {
  if (isLoggedIn.value) {
    showReportDialog.value = true;
  } else {
    showLoginDialog.value = true;
  }
}

async function openUserReportsCallback() {
  await router.push({
    name: "/reports/[reportType]/[conversationSlugId]/[[opinionSlugId]]",
    params: {
      reportType: "conversation",
      conversationSlugId: props.postSlugId,
    },
  });
}

async function muteUserCallback() {
  const isSuccessful = await muteUser(props.posterUserName, "mute");
  if (isSuccessful) {
    await loadPostData(false);
  }
}

async function moderatePostCallback() {
  await router.push({
    name: "/moderate/conversation/[conversationSlugId]/",
    params: { conversationSlugId: props.postSlugId },
  });
}

async function moderationHistoryCallback() {
  if (route.name == "/conversation/[postSlugId]") {
    emit("openModerationHistory");
  } else {
    await router.push({
      name: "/conversation/[postSlugId]",
      params: { postSlugId: props.postSlugId },
      query: { filter: "moderated" },
    });
  }
}

function clickedMoreIcon() {
  showPostOptionSelector(
    props.postSlugId,
    props.posterUserName,
    reportContentCallback,
    openUserReportsCallback,
    muteUserCallback,
    moderatePostCallback,
    moderationHistoryCallback
  );
}
</script>

<style scoped lang="scss">
.container {
  display: flex;
  gap: 1rem;
  align-items: start;
  justify-content: space-between;
  color: $color-text-weak;
}

.iconSizeLarge {
  width: 4rem;
}

.reportDialog {
  background-color: white;
}

.identityFlex {
  display: flex;
  gap: 1rem;
  align-items: center;
}
</style>
