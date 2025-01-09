<template>
  <MainLayout
    :general-props="{
      addBottomPadding: true,
      enableFooter: true,
      enableHeader: true,
      reducedWidth: false,
    }"
    :menu-bar-props="{
      hasBackButton: false,
      hasCloseButton: false,
      hasLoginButton: true,
      hasSettingsButton: true,
    }"
  >
    <div class="container">
      <div class="title">User Reports Viewer</div>

      <div class="tableStyle">
        <div v-for="report in reportItemList" :key="report.id">
          <div>ID: {{ report.id }}</div>
          <div>Username: {{ report.username }}</div>
          <div>Created At: {{ useTimeAgo(report.createdAt) }}</div>
          <div>Reason: {{ report.reason }}</div>
          <div>Explanation: {{ report.explanation ?? "n/a" }}</div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { useBackendReportApi } from "src/utils/api/report";
import { useNotify } from "src/utils/ui/notify";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import type { UserReportItem } from "src/shared/types/zod";
import { useTimeAgo } from "@vueuse/core";
import MainLayout from "src/layouts/MainLayout.vue";

const route = useRoute();

const { showNotifyMessage } = useNotify();

const { fetchUserReportsByPostSlugId, fetchUserReportsByCommentSlugId } =
  useBackendReportApi();

const reportItemList = ref<UserReportItem[]>([]);

onMounted(() => {
  loadReports();
});

async function loadReports() {
  if (
    route.name === "/user-reports/[reportType]/[slugId]/" &&
    typeof route.params.slugId === "string"
  ) {
    if (route.params.reportType == "post") {
      reportItemList.value = await fetchUserReportsByPostSlugId(
        route.params.slugId
      );
    } else if (route.params.reportType == "comment") {
      reportItemList.value = await fetchUserReportsByCommentSlugId(
        route.params.slugId
      );
    } else {
      showNotifyMessage("Invlid report type");
    }
  } else {
    showNotifyMessage("Invlid slug ID param");
  }
}
</script>

<style lang="scss" scoped>
.title {
  font-size: 1.2rem;
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.tableStyle {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.container {
  padding: 1rem;
}
</style>
