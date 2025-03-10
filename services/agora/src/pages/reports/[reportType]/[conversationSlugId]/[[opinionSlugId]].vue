<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: true,
      enableFooter: true,
      enableHeader: true,
      reducedWidth: true,
    }"
  >
    <template #header>
      <DefaultMenuBar
        :has-back-button="true"
        :has-close-button="false"
        :has-login-button="false"
        :has-menu-button="false"
        :fixed-height="true"
      >
      </DefaultMenuBar>
    </template>

    <div class="container">
      <div class="titleBar">
        <div class="title">
          <div>User Reports Viewer</div>
          <q-badge :label="reportType" />
        </div>

        <div>
          <ZKButton
            :use-extra-padding="true"
            :label="
              reportType == 'conversation'
                ? 'Open ' + 'Conversation'
                : 'Open ' + 'Opinion'
            "
            color="primary"
            @click="openPage()"
          />
        </div>
      </div>

      <div v-if="reportItemList.length == 0">
        No reports are available for this {{ reportType }}.
      </div>

      <div v-if="reportItemList.length > 0" class="tableStyle">
        <div v-for="report in reportItemList" :key="report.id">
          <div>ID: {{ report.id }}</div>
          <div>Username: {{ report.username }}</div>
          <div>Created At: {{ useTimeAgo(report.createdAt) }}</div>
          <div>Reason: {{ report.reason }}</div>
          <div>Explanation: {{ report.explanation ?? "n/a" }}</div>
        </div>
      </div>
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { useBackendReportApi } from "src/utils/api/report";
import { useNotify } from "src/utils/ui/notify";
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { UserReportItem } from "src/shared/types/zod";
import { useTimeAgo } from "@vueuse/core";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";

const route = useRoute();
const router = useRouter();

const { showNotifyMessage } = useNotify();

const { fetchUserReportsByPostSlugId, fetchUserReportsByCommentSlugId } =
  useBackendReportApi();

const reportItemList = ref<UserReportItem[]>([]);

const reportType = ref<"conversation" | "opinion">("conversation");

onMounted(async () => {
  await loadReports();
});

async function openPage() {
  if (
    route.name ===
    "/reports/[reportType]/[conversationSlugId]/[[opinionSlugId]]"
  ) {
    if (route.params.reportType == "conversation") {
      await router.push({
        name: "/conversation/[postSlugId]",
        params: { postSlugId: route.params.conversationSlugId },
      });
    } else if (route.params.reportType == "opinion") {
      await router.push({
        name: "/conversation/[postSlugId]",
        params: { postSlugId: route.params.conversationSlugId },
        query: { opinionSlugId: route.params.opinionSlugId },
      });
    } else {
      console.log("Unknown report type");
    }
  }
}

async function loadReports() {
  if (
    route.name ===
    "/reports/[reportType]/[conversationSlugId]/[[opinionSlugId]]"
  ) {
    if (route.params.reportType == "conversation") {
      reportType.value = "conversation";
      reportItemList.value = await fetchUserReportsByPostSlugId(
        route.params.conversationSlugId
      );
    } else if (
      route.params.reportType == "opinion" &&
      route.params.opinionSlugId
    ) {
      reportType.value = "opinion";
      reportItemList.value = await fetchUserReportsByCommentSlugId(
        route.params.opinionSlugId
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
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
}

.titleBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
