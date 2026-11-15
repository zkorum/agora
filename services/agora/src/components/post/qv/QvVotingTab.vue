<template>
  <QvVotingSession
    :key="sessionKey"
    :conversation-metadata="conversationMetadata"
  />
</template>

<script setup lang="ts">
import { useViewerQueryScope } from "src/utils/query/viewerScope";
import { computed } from "vue";

import type { QvConversationMetadata } from "./QvVoting.types";
import QvVotingSession from "./QvVotingSession.vue";

const props = defineProps<{ conversationMetadata: QvConversationMetadata }>();
const viewerScope = useViewerQueryScope();
// Remount local state on identity changes, including while this tab is cached.
const sessionKey = computed(() =>
  JSON.stringify([
    props.conversationMetadata.conversationSlugId,
    viewerScope.value.userId,
  ])
);
</script>
