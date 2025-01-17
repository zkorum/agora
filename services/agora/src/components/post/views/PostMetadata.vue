<template>
  <div>
    <div class="container">
      <div class="metadata">
        <div v-if="showAuthor">
          <UserAvatar
            v-if="!skeletonMode"
            :user-name="posterUserName"
            :size="40"
            class="avatarIcon"
          />

          <Skeleton v-if="skeletonMode" shape="circle" size="2.5rem">
          </Skeleton>
        </div>

        <div class="userNameTime">
          <div v-if="showAuthor">
            <div v-if="!skeletonMode">
              {{ posterUserName }}
            </div>
            <Skeleton v-if="skeletonMode" width="5rem"></Skeleton>
          </div>

          <div>
            <div v-if="!skeletonMode">
              <div v-if="displayAbsoluteTime">
                <Tag>
                  {{ getDateString(new Date(createdAt)) }}
                </Tag>
              </div>
              <div v-if="!displayAbsoluteTime">
                {{ formatTimeAgo(new Date(createdAt)) }}
              </div>
            </div>
            <Skeleton v-if="skeletonMode" width="2rem"></Skeleton>
          </div>
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
import UserAvatar from "src/components/account/UserAvatar.vue";
import Tag from "primevue/tag";
import { formatTimeAgo } from "@vueuse/core";
import { getDateString } from "src/utils/common";
import { ref } from "vue";
import ReportContentDialog from "src/components/report/ReportContentDialog.vue";
import { useRouter } from "vue-router";
import { useBackendUserMuteApi } from "src/utils/api/muteUser";
import { usePostStore } from "src/stores/post";

const props = defineProps<{
  posterUserName: string;
  createdAt: Date;
  skeletonMode: boolean;
  showAuthor: boolean;
  displayAbsoluteTime: boolean;
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
    name: "/user-reports/[reportType]/[conversationSlugId]/[[opinionSlugId]]",
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
    name: "/moderate/conversation/[postSlugId]/",
    params: { postSlugId: props.postSlugId },
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
  align-items: center;
  justify-content: space-between;
  color: $color-text-weak;
}

.iconSizeLarge {
  width: 4rem;
}

.avatarIcon {
  margin-right: 0.5rem;
}

.metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.reportDialog {
  background-color: white;
}

.userNameTime {
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
}
</style>
