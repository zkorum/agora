<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar
      title="Email Updates"
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
import type { ConversationEmailUpdateWorkspaceRequest } from "src/shared/types/dto";
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
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
