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
      <StandardMenuBar :title="''" :center-content="false" />
    </template>

    <div class="container">
      <div class="titleBar">
        <div class="title">
          <div>{{ t("userReportsViewer") }}</div>
          <q-badge
            :label="
              reportType == 'conversation' ? t('conversation') : t('opinion')
            "
          />
        </div>

        <div>
          <ZKButton
            button-type="largeButton"
            :label="
              reportType == 'conversation'
                ? t('openConversation')
                : t('openOpinion')
            "
            color="primary"
            @click="openPage()"
          />
        </div>
      </div>

      <div v-if="reportItemList.length == 0">
        {{
          t("noReportsAvailable").replace(
            "{type}",
            reportType == "conversation" ? t("conversation") : t("opinion")
          )
        }}
      </div>

      <div v-if="reportItemList.length > 0" class="tableStyle">
        <div v-for="report in reportItemList" :key="report.id">
          <div>{{ t("id") }} {{ report.id }}</div>
          <div>{{ t("username") }} {{ report.username }}</div>
          <div>{{ t("createdAt") }} {{ useTimeAgo(report.createdAt) }}</div>
          <div>{{ t("reason") }} {{ report.reason }}</div>
          <div>
            {{ t("explanation") }} {{ report.explanation ?? t("notAvailable") }}
          </div>
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
import { StandardMenuBar } from "src/components/navigation/header/variants";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  userReportsViewerTranslations,
  type UserReportsViewerTranslations,
} from "./[[opinionSlugId]].i18n";

const route = useRoute();
const router = useRouter();

const { showNotifyMessage } = useNotify();

const { fetchUserReportsByPostSlugId, fetchUserReportsByCommentSlugId } =
  useBackendReportApi();

const reportItemList = ref<UserReportItem[]>([]);

const reportType = ref<"conversation" | "opinion">("conversation");

const { t } = useComponentI18n<UserReportsViewerTranslations>(
  userReportsViewerTranslations
);

onMounted(async () => {
  await loadReports();
});

async function openPage() {
  if (
    route.name ===
    "/reports/[reportType]/[conversationSlugId]/[[opinionSlugId]]"
  ) {
    const conversationSlugId = Array.isArray(route.params.conversationSlugId)
      ? route.params.conversationSlugId[0]
      : route.params.conversationSlugId;

    if (route.params.reportType == "conversation") {
      await router.push({
        name: "/conversation/[postSlugId]",
        params: { postSlugId: conversationSlugId },
      });
    } else if (route.params.reportType == "opinion") {
      const opinionSlugId = Array.isArray(route.params.opinionSlugId)
        ? route.params.opinionSlugId[0]
        : route.params.opinionSlugId;

      await router.push({
        name: "/conversation/[postSlugId]",
        params: { postSlugId: conversationSlugId },
        query: { opinion: opinionSlugId },
      });
    } else {
      console.log(t("unknownReportType"));
    }
  }
}

async function loadReports() {
  if (
    route.name ===
    "/reports/[reportType]/[conversationSlugId]/[[opinionSlugId]]"
  ) {
    const conversationSlugId = Array.isArray(route.params.conversationSlugId)
      ? route.params.conversationSlugId[0]
      : route.params.conversationSlugId;

    if (route.params.reportType == "conversation") {
      reportType.value = "conversation";
      reportItemList.value =
        await fetchUserReportsByPostSlugId(conversationSlugId);
    } else if (
      route.params.reportType == "opinion" &&
      route.params.opinionSlugId
    ) {
      reportType.value = "opinion";
      const opinionSlugId = Array.isArray(route.params.opinionSlugId)
        ? route.params.opinionSlugId[0]
        : route.params.opinionSlugId;

      reportItemList.value =
        await fetchUserReportsByCommentSlugId(opinionSlugId);
    } else {
      showNotifyMessage(t("invalidReportType"));
    }
  } else {
    showNotifyMessage(t("invalidSlugIdParam"));
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
