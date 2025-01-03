<template>
  <div>
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
  </div>
</template>

<script setup lang="ts">
import { useBackendReportApi } from "src/utils/api/report";
import { useNotify } from "src/utils/ui/notify";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import type { UserReportItem } from "src/shared/types/zod";
import { useTimeAgo } from "@vueuse/core";

const route = useRoute();

console.log(route.params.reportType);
console.log(route.params.slugId);

const { showNotifyMessage } = useNotify();

const { fetchUserReportsByPostSlugId, fetchUserReportsByCommentSlugId } =
  useBackendReportApi();

const reportItemList = ref<UserReportItem[]>([]);

onMounted(() => {
  loadReports();
});

async function loadReports() {
  if (typeof route.params.slugId === "string") {
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
