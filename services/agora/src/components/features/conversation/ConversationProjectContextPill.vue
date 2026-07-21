<template>
  <SpaLink
    v-if="interactive"
    :to="projectConversationRoute"
    class="project-context-pill"
    target="_blank"
    rel="noopener noreferrer"
  >
    <span class="project-context-pill__label">
      {{ t("partOfProject") }}
      <strong class="project-context-pill__title">{{ projectTitle }}</strong>
    </span>
    <span class="project-context-pill__cta">
      {{ t("openProject") }}
      <q-icon name="mdi-open-in-new" size="0.9rem" aria-hidden="true" />
    </span>
  </SpaLink>
  <span v-else class="project-context-text" @click.stop.prevent>
    {{ t("partOfProject") }}
    <strong class="project-context-text__title">{{ projectTitle }}</strong>
  </span>
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

const props = withDefaults(
  defineProps<{
    projectSlug: string;
    projectTitle: string;
    conversationSlugId: string;
    interactive?: boolean;
  }>(),
  {
    interactive: true,
  }
);

const { t } = useComponentI18n<ConversationProjectContextPillTranslations>(
  conversationProjectContextPillTranslations
);
const projectConversationRouteName =
  "/project/[projectSlug]/conversation/[postSlugId]/";
const projectConversationRoute = computed(
  () =>
    ({
      name: projectConversationRouteName,
      params: {
        projectSlug: props.projectSlug,
        postSlugId: props.conversationSlugId,
      },
    }) satisfies RouteLocationRaw<typeof projectConversationRouteName>
);
</script>

<style scoped lang="scss">
.project-context-pill {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid rgba($primary, 0.22);
  border-radius: 6px;
  padding-block: 0.25rem;
  padding-inline: 0.55rem 0.35rem;
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
  transform: translateY(-1px);
}

.project-context-pill:focus-visible {
  outline: 2px solid rgba($primary, 0.36);
  outline-offset: 2px;
}

.project-context-pill__label {
  display: inline-flex;
  flex: 1 1 auto;
  min-width: 0;
  align-items: center;
  gap: 0.25rem;
  overflow: hidden;
}

.project-context-pill__title {
  display: block;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  max-width: min(16rem, 44vw);
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
  border-radius: 4px;
  padding: 0.25rem 0.45rem;
  background: white;
  color: $primary;
  font-size: 0.72rem;
  font-weight: var(--font-weight-bold);
  box-shadow: inset 0 0 0 1px rgba($primary, 0.16);
  white-space: nowrap;
}

.project-context-text {
  display: inline;
  max-width: 100%;
  color: $color-text-weak;
  font-size: 0.75rem;
  font-weight: var(--font-weight-medium);
  line-height: 1.25;
}

.project-context-text__title {
  color: $ink-darkest;
  font-weight: var(--font-weight-semibold);
}

@media (max-width: 420px) {
  .project-context-pill {
    gap: 0.35rem;
    padding-inline: 0.45rem 0.25rem;
  }

  .project-context-pill__title {
    max-width: min(12rem, 36vw);
  }

  .project-context-pill__cta {
    padding: 0.2rem 0.35rem;
  }
}
</style>
