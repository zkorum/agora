<template>
  <SpaLink :to="projectConversationRoute" class="project-context-pill">
    <span class="project-context-pill__label">
      {{ t("partOfProject") }}
      <strong class="project-context-pill__title">{{ projectTitle }}</strong>
    </span>
    <span class="project-context-pill__cta">
      {{ t("openProjectView") }}
      <q-icon name="mdi-open-in-new" size="0.9rem" aria-hidden="true" />
    </span>
  </SpaLink>
</template>

<script setup lang="ts">
import SpaLink from "src/components/ui-library/SpaLink.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { computed } from "vue";
import type { RouteLocationRaw } from "vue-router";

import {
  type ConversationProjectContextPillTranslations,
  conversationProjectContextPillTranslations,
} from "./ConversationProjectContextPill.i18n";

const props = defineProps<{
  projectSlug: string;
  projectTitle: string;
  conversationSlugId: string;
}>();

const { t } = useComponentI18n<ConversationProjectContextPillTranslations>(
  conversationProjectContextPillTranslations
);
const projectConversationRoute = computed<RouteLocationRaw>(() => ({
  path: `/project/${props.projectSlug}/conversation/${props.conversationSlugId}/`,
}));
</script>

<style scoped lang="scss">
.project-context-pill {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid rgba($primary, 0.22);
  border-radius: 999px;
  padding: 0.25rem 0.3rem 0.25rem 0.6rem;
  background: rgba($primary, 0.08);
  color: rgba($ink-darkest, 0.72);
  font-size: 0.78rem;
  font-weight: var(--font-weight-medium);
  line-height: 1.2;
  text-decoration: none;
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease,
    transform 120ms ease;
}

.project-context-pill:hover,
.project-context-pill:focus-visible {
  border-color: rgba($primary, 0.42);
  box-shadow: 0 0.35rem 0.9rem rgba($primary, 0.12);
  outline: none;
  transform: translateY(-1px);
}

.project-context-pill__label {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.25rem;
}

.project-context-pill__title {
  overflow: hidden;
  max-width: min(15rem, 42vw);
  color: $ink-darkest;
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-context-pill__cta {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.25rem;
  border-radius: 999px;
  padding: 0.25rem 0.45rem;
  background: white;
  color: $primary;
  font-size: 0.72rem;
  font-weight: var(--font-weight-bold);
  box-shadow: inset 0 0 0 1px rgba($primary, 0.16);
  white-space: nowrap;
}

@media (max-width: 420px) {
  .project-context-pill {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
