<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: true,
      addBottomPadding: true,
      enableHeader: true,
      enableFooter: false,
      reducedWidth: false,
    }"
  >
    <template #header>
      <StandardMenuBar :title="t('pageTitle')" :center-content="true" />
    </template>

    <WidthWrapper :enable="true">
      <div class="export-page">
        <AsyncStateHandler
          :query="conversationQuery"
          :config="{
            error: { title: t('conversationLoadError') },
          }"
        >
          <div
            v-if="conversationQuery.data.value"
            tabindex="0"
            role="button"
            :aria-label="t('viewConversation')"
            @click="navigateToConversation"
            @keydown.enter="navigateToConversation"
            @keydown.space="navigateToConversation"
          >
            <PostDetails
              :conversation-data="conversationQuery.data.value"
              :compact-mode="true"
            />
          </div>
        </AsyncStateHandler>

        <section class="export-actions">
          <p class="page-description">
            {{ t("pageDescription") }}
          </p>

          <RequestExportButton
            :loading="requestExportMutation.isPending.value"
            :aria-label="t('requestExportAriaLabel')"
            @request="handleRequestExport"
          />
        </section>

        <section
          class="export-history-section"
          aria-labelledby="previous-exports-heading"
        >
          <h2 id="previous-exports-heading" class="section-title">
            {{ t("previousExports") }}
          </h2>
          <ExportHistoryList :conversation-slug-id="conversationSlugId" />
        </section>
      </div>
    </WidthWrapper>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouteParams } from "@vueuse/router";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import ExportHistoryList from "src/components/conversation/export/ExportHistoryList.vue";
import RequestExportButton from "src/components/conversation/export/RequestExportButton.vue";
import PostDetails from "src/components/post/PostDetails.vue";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import { useRequestExportMutation } from "src/utils/api/conversationExport/useConversationExportQueries";
import { useConversationQuery } from "src/utils/api/post/useConversationQuery";
import { axiosInstance } from "src/utils/api/client";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  exportPageTranslations,
  type ExportPageTranslations,
} from "./export.i18n";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNotify } from "src/utils/ui/notify";

const { t } = useComponentI18n<ExportPageTranslations>(exportPageTranslations);
const router = useRouter();
const { showNotifyMessage } = useNotify();

const authStore = useAuthenticationStore();
const { isAuthInitialized, isGuestOrLoggedIn } = storeToRefs(authStore);

const conversationSlugIdParam = useRouteParams("conversationSlugId");
const conversationSlugId = computed(() => {
  const value = conversationSlugIdParam.value;
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
});

const conversationQuery = useConversationQuery({
  conversationSlugId: conversationSlugId,
  loadUserPollResponse: false,
  enabled: computed(() => isAuthInitialized.value && isGuestOrLoggedIn.value),
});

const requestExportMutation = useRequestExportMutation();

async function navigateToConversation(): Promise<void> {
  await router.push({
    name: "/conversation/[postSlugId]",
    params: { postSlugId: conversationSlugId.value },
  });
}

async function handleRequestExport(): Promise<void> {
  try {
    const result = await requestExportMutation.mutateAsync(
      conversationSlugId.value
    );
    await router.push({
      name: "/conversation/[conversationSlugId]/export.[exportId]",
      params: {
        conversationSlugId: conversationSlugId.value,
        exportId: result.exportSlugId,
      },
    });
  } catch (error) {
    console.error(error);

    if (axiosInstance.isAxiosError(error)) {
      if (error.response?.status === 400 && error.response?.data?.message) {
        // Display the specific error message from the server for bad requests
        showNotifyMessage(error.response.data.message);
      } else {
        // Display generic error for other cases
        showNotifyMessage(t("exportRequestError"));
      }
    } else {
      showNotifyMessage(t("exportRequestError"));
    }
  }
}
</script>

<style scoped lang="scss">
.export-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1rem 0;
}

.export-actions {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-description {
  font-size: 1rem;
  color: $color-text-strong;
  line-height: 1.5;
  margin: 0;
}

.export-history-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);
  color: $color-text-strong;
  margin: 0;
}
</style>
