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

    <q-pull-to-refresh @refresh="handleRefresh">
      <WidthWrapper :enable="true">
        <div class="export-page">
          <!-- Active Export Banner -->
          <ActiveExportBanner
            v-if="readinessQuery.data.value?.status === 'active'"
            :export-slug-id="readinessQuery.data.value.exportSlugId"
            :conversation-slug-id="conversationSlugId"
          />

          <!-- Cooldown Banner -->
          <CooldownBanner
            v-if="readinessQuery.data.value?.status === 'cooldown'"
            :cooldown-ends-at="
              readinessQuery.data.value.cooldownEndsAt.toISOString()
            "
            :last-export-slug-id="readinessQuery.data.value.lastExportSlugId"
            :conversation-slug-id="conversationSlugId"
          />

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
              :disabled="readinessQuery.data.value?.status !== 'ready'"
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
            <ExportHistoryList
              :conversation-slug-id="conversationSlugId"
              :export-history-query="exportHistoryQuery"
            />
          </section>
        </div>
      </WidthWrapper>
    </q-pull-to-refresh>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useNow } from "@vueuse/core";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import ExportHistoryList from "src/components/conversation/export/ExportHistoryList.vue";
import RequestExportButton from "src/components/conversation/export/RequestExportButton.vue";
import ActiveExportBanner from "src/components/conversation/export/ActiveExportBanner.vue";
import CooldownBanner from "src/components/conversation/export/CooldownBanner.vue";
import PostDetails from "src/components/post/PostDetails.vue";
import AsyncStateHandler from "src/components/ui/AsyncStateHandler.vue";
import {
  useRequestExportMutation,
  useExportHistoryQuery,
  useExportReadinessQuery,
} from "src/utils/api/conversationExport/useConversationExportQueries";
import { useConversationQuery } from "src/utils/api/post/useConversationQuery";
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

const route = useRoute("/conversation/[conversationSlugId]/export");
const conversationSlugId = computed(() => {
  const value = route.params.conversationSlugId;
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

const exportHistoryQuery = useExportHistoryQuery({
  conversationSlugId: conversationSlugId.value,
  enabled: computed(() => isAuthInitialized.value && isGuestOrLoggedIn.value),
});

const readinessQuery = useExportReadinessQuery({
  conversationSlugId: conversationSlugId.value,
  enabled: computed(() => isAuthInitialized.value && isGuestOrLoggedIn.value),
});

const requestExportMutation = useRequestExportMutation();

async function navigateToConversation(): Promise<void> {
  await router.push({
    name: "/conversation/[postSlugId]",
    params: { postSlugId: conversationSlugId.value },
  });
}

function handleRefresh(done: () => void): void {
  const minDelay = new Promise((resolve) => setTimeout(resolve, 500));

  void Promise.all([
    conversationQuery.refetch(),
    exportHistoryQuery.refetch(),
    readinessQuery.refetch(),
    minDelay,
  ]).finally(() => {
    done();
  });
}

// Reactive time using VueUse
const now = useNow({ interval: 1000 });

async function handleRequestExport(): Promise<void> {
  try {
    const result = await requestExportMutation.mutateAsync(
      conversationSlugId.value
    );

    // Handle failure responses (success: false)
    if (!result.success) {
      // Map reason to i18n key
      const reasonMessages: Record<typeof result.reason, string> = {
        active_export_in_progress: t("errorActiveExportInProgress"),
        conversation_not_found: t("errorConversationNotFound"),
        no_opinions: t("errorNoOpinions"),
      };
      showNotifyMessage(reasonMessages[result.reason]);
      return;
    }

    // Handle cooldown response (success: true, but cooldown active)
    if (result.status === "cooldown_active") {
      // Validate cooldownEndsAt is present (Zod can't narrow nested discriminated unions)
      if (result.cooldownEndsAt === undefined) {
        console.error(
          "[Export] Invalid response: cooldown_active status but cooldownEndsAt is undefined",
          result
        );
        showNotifyMessage(t("exportRequestError"));
        return;
      }

      // Calculate remaining time
      const cooldownEnd = new Date(result.cooldownEndsAt);
      const remainingMs = cooldownEnd.getTime() - now.value.getTime();
      const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

      // Format duration message with manual placeholder replacement
      let message: string;
      if (remainingSeconds < 60) {
        message = t("exportCooldownSeconds").replace(
          "{seconds}",
          String(remainingSeconds)
        );
      } else {
        const minutes = Math.ceil(remainingSeconds / 60);
        message = t("exportCooldownMinutes").replace(
          "{minutes}",
          String(minutes)
        );
      }

      showNotifyMessage(message);
      return;
    }

    // Success (queued) - validate exportSlugId is present
    if (result.exportSlugId === undefined) {
      console.error(
        "[Export] Invalid response: queued status but exportSlugId is undefined",
        result
      );
      showNotifyMessage(t("exportRequestError"));
      return;
    }

    // Navigate to export status page
    await router.push({
      name: "/conversation/[conversationSlugId]/export.[exportId]",
      params: {
        conversationSlugId: conversationSlugId.value,
        exportId: result.exportSlugId,
      },
    });
  } catch (error) {
    console.error("[Export] Failed to request export:", error);
    showNotifyMessage(t("exportRequestError"));
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
