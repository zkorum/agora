<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar
      :title="t('pageTitle')"
      :center-content="true"
      fallback-route="/"
    />
  </Teleport>

  <ConversationUpdatesWorkspace :initial-tab="initialTab" :context="context" />
</template>

<script setup lang="ts">
import ConversationUpdatesWorkspace from "src/components/conversationUpdates/ConversationUpdatesWorkspace.vue";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ConversationEmailUpdateWorkspaceRequest } from "src/shared/types/dto";
import { computed } from "vue";
import { useRoute } from "vue-router";

import {
  type EmailUpdatesPageTranslations,
  emailUpdatesPageTranslations,
} from "./emailUpdatesPage.i18n";

const route = useRoute();
const { t } = useComponentI18n<EmailUpdatesPageTranslations>(
  emailUpdatesPageTranslations
);
const { isActive } = usePageLayout({
  enableDrawer: false,
  enableFooter: false,
  reducedWidth: false,
  addBottomPadding: true,
});

const initialTab = computed(() =>
  route.query.tab === "history" ? "history" : "compose"
);
const context = computed<ConversationEmailUpdateWorkspaceRequest["context"]>(
  () => {
    const conversationSlugId = getStringQueryValue(
      route.query.conversationSlugId
    );
    if (conversationSlugId !== undefined) {
      return { kind: "conversation", conversationSlugId };
    }
    const projectSlug = getStringQueryValue(route.query.projectSlug);
    if (projectSlug !== undefined) {
      return { kind: "project", projectSlug };
    }
    return { kind: "global" };
  }
);

function getStringQueryValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
</script>
