<template>
  <div>
    <div class="container">
      <div>
        <UserIdentity
          v-if="!skeletonMode"
          :author-verified="authorVerified"
          :created-at="createdAt"
          :username="posterUserName"
        />

        <div v-if="skeletonMode" class="identityFlex">
          <Skeleton shape="circle" size="2rem" />
          <Skeleton width="10rem" height="2rem" />
        </div>
      </div>

      <div>
        <div v-if="!skeletonMode">
          <ZKButton
            flat
            text-color="color-text-weak"
            icon="mdi-dots-vertical"
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
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useBottomSheet } from "src/utils/ui/bottomSheet";
import Skeleton from "primevue/skeleton";
import { ref } from "vue";
import ReportContentDialog from "src/components/report/ReportContentDialog.vue";
import { useRouter } from "vue-router";
import { useBackendUserMuteApi } from "src/utils/api/muteUser";
import { usePostStore } from "src/stores/post";
import UserIdentity from "./UserIdentity.vue";

const props = defineProps<{
  authorVerified: boolean;
  posterUserName: string;
  createdAt: Date;
  skeletonMode: boolean;
  postSlugId: string;
}>();

const router = useRouter();

const { showPostOptionSelector } = useBottomSheet();

const { muteUser } = useBackendUserMuteApi();
const { loadPostData } = usePostStore();

const showReportDialog = ref(false);

function reportContentCallback() {
  showReportDialog.value = true;
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

function clickedMoreIcon() {
  showPostOptionSelector(
    props.postSlugId,
    props.posterUserName,
    reportContentCallback,
    openUserReportsCallback,
    muteUserCallback,
    moderatePostCallback
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
