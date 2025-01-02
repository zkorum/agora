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
    <ReportPostDialog
      :post-slug-id="props.postSlugId"
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
import ReportPostDialog from "src/components/report/ReportPostDialog.vue";

const props = defineProps<{
  posterUserName: string;
  createdAt: Date;
  skeletonMode: boolean;
  showAuthor: boolean;
  displayAbsoluteTime: boolean;
  postSlugId: string;
}>();

const { showPostOptionSelector } = useBottomSheet();

const showReportDialog = ref(false);

function selectedReportOption() {
  showReportDialog.value = true;
}

function clickedMoreIcon() {
  showPostOptionSelector(
    props.postSlugId,
    props.posterUserName,
    selectedReportOption
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
