<template>
  <SpaLink
    :to="{
      name: '/project/[projectSlug]/conversation/[postSlugId]/',
      params: { projectSlug, postSlugId: activity.slug },
    }"
    class="project-activity-card"
  >
    <article>
      <div class="activity-card__topline">
        <span
          class="activity-card__type"
          :class="`activity-card__type--${activity.kind}`"
        >
          <q-icon :name="activityTypeIcon" size="1rem" />
          {{ activityTypeLabel }}
        </span>

        <span
          class="activity-card__status"
          :class="
            activity.isClosed
              ? 'activity-card__status--closed'
              : 'activity-card__status--open'
          "
        >
          {{ activity.isClosed ? t("closedStatus") : t("openStatus") }}
        </span>
      </div>

      <ContentTranslationControl
        v-if="activityTranslationControl !== undefined"
        v-model="activityTranslationMode"
        class="activity-card__translation-control"
        :source-language-label="activityTranslationControl.sourceLanguageLabel"
        :translation-status="activityTranslationControl.status"
      />

      <h3>{{ displayedActivityContent.title }}</h3>
      <ZKPlainTextContent
        class="activity-card__body"
        :plain-text="displayedActivityContent.bodyPlainText"
        :compact-mode="true"
        :compact-line-count="3"
      />

      <div class="activity-card__footer">
        <div
          class="activity-card__stats"
          :aria-label="t('activityStatisticsAriaLabel')"
        >
          <span>
            <q-icon name="mdi-message-text-outline" size="1rem" />
            {{
              t("statementsCount", {
                count: activity.stats.opinionCount,
              })
            }}
          </span>
          <span>
            <q-icon name="mdi-account-outline" size="1rem" />
            {{
              t("participantsCount", {
                count: activity.stats.participantCount,
              })
            }}
          </span>
          <span>
            <q-icon name="mdi-check-circle-outline" size="1rem" />
            {{ t("votesCount", { count: activity.stats.voteCount }) }}
          </span>
        </div>

        <ProjectActionButton
          :label="actionLabel"
          :icon-name="actionIconName"
          :href="undefined"
          :external="false"
          :variant="actionVariant"
          :block="true"
          :accessible-label="
            t('activityActionAriaLabel', {
              action: actionLabel,
              title: activity.title,
            })
          "
          :interactive="false"
        />
      </div>
    </article>
  </SpaLink>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ContentTranslationControl from "src/components/translation/ContentTranslationControl.vue";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKPlainTextContent from "src/components/ui-library/ZKPlainTextContent.vue";
import type { LanguageTextDirection } from "src/shared/languages";
import type { LocalizedContentTranslationStatus } from "src/shared/types/zod";
import { useLanguageStore } from "src/stores/language";
import {
  type ContentTranslationDisplayMode,
  resolveContentTranslationState,
} from "src/utils/translation/contentTranslation";
import { computed, ref, watch } from "vue";

import ProjectActionButton from "./ProjectActionButton.vue";
import {
  type ProjectPageTranslations,
  translateProjectPageText,
} from "./projectPageI18n";
import type {
  ProjectActionButtonVariant,
  ProjectActivity,
} from "./projectPageTypes";

const props = defineProps<{
  activity: ProjectActivity;
  projectSlug: string;
  languageCode: string;
  textDirection: LanguageTextDirection;
}>();

const { spokenLanguages } = storeToRefs(useLanguageStore());
const activityTranslationModePreference = ref<
  ContentTranslationDisplayMode | undefined
>();

const activityTypeLabel = computed(() =>
  props.activity.kind === "conversation" ? t("conversationType") : t("voteType")
);

const activityTypeIcon = computed(() =>
  props.activity.kind === "conversation" ? "mdi-forum-outline" : "mdi-poll"
);

const actionLabel = computed(() => {
  if (props.activity.isClosed) {
    return t("viewAction");
  }

  return props.activity.kind === "conversation"
    ? t("joinAction")
    : t("voteAction");
});

const actionIconName = computed(() =>
  props.textDirection === "rtl" ? "mdi-arrow-left" : "mdi-arrow-right"
);

const actionVariant = computed<ProjectActionButtonVariant>(() =>
  props.activity.isClosed ? "muted" : "primary"
);

const activityMachineTranslation = computed(() => {
  const machineTranslation = props.activity.machineTranslation;
  if (
    machineTranslation === undefined ||
    machineTranslation.targetLanguageCode !== props.languageCode
  ) {
    return undefined;
  }

  return machineTranslation;
});

const activityTranslationInitialMode = computed<ContentTranslationDisplayMode>(
  () => {
    const machineTranslation = activityMachineTranslation.value;
    if (
      machineTranslation?.status !== "completed" ||
      machineTranslation.translatedContent === undefined
    ) {
      return "original";
    }

    return resolveContentTranslationState({
      dynamicTranslationEnabled: true,
      sourceLanguageCode: machineTranslation.sourceLanguageCode,
      displayLanguage: machineTranslation.targetLanguageCode,
      spokenLanguages: spokenLanguages.value,
      supportedTargetLanguageCodes: [machineTranslation.targetLanguageCode],
      hasTranslatedContent: true,
    }).initialMode;
  }
);

const activityTranslationMode = computed<ContentTranslationDisplayMode>({
  get: () =>
    activityTranslationModePreference.value ?? activityTranslationInitialMode.value,
  set: (mode) => {
    const machineTranslation = activityMachineTranslation.value;
    if (
      mode === "translated" &&
      (machineTranslation?.status !== "completed" ||
        machineTranslation.translatedContent === undefined)
    ) {
      return;
    }
    activityTranslationModePreference.value = mode;
  },
});

const activityTranslationControl = computed<
  | {
      sourceLanguageLabel: string | undefined;
      status: LocalizedContentTranslationStatus;
    }
  | undefined
>(() => {
  const machineTranslation = activityMachineTranslation.value;
  if (machineTranslation === undefined) {
    return undefined;
  }

  return {
    sourceLanguageLabel: machineTranslation.sourceLanguageLabel,
    status: machineTranslation.status,
  };
});

const displayedActivityContent = computed(() => {
  const machineTranslation = activityMachineTranslation.value;
  if (
    activityTranslationMode.value === "translated" &&
    machineTranslation?.status === "completed" &&
    machineTranslation.translatedContent !== undefined
  ) {
    return machineTranslation.translatedContent;
  }

  return props.activity.originalContent;
});

watch(
  () => [
    props.activity.slug,
    props.activity.machineTranslation?.targetLanguageCode,
    props.activity.machineTranslation?.status,
  ],
  () => {
    activityTranslationModePreference.value = undefined;
  }
);

function t(
  key: keyof ProjectPageTranslations,
  params?: Readonly<Record<string, string | number>>
): string {
  return translateProjectPageText({
    languageCode: props.languageCode,
    key,
    params,
  });
}
</script>

<style scoped lang="scss">
.project-activity-card {
  display: block;
  border-radius: 20px;

  &:focus-visible {
    outline: none;

    article {
      border-color: rgba($primary, 0.5);
      box-shadow:
        0 0.75rem 2rem rgba(10, 7, 20, 0.09),
        0 0 0 3px rgba($primary, 0.16);
    }
  }
}

article {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.25rem;
  border: 1.5px solid rgba($primary, 0.22);
  border-radius: 20px;
  background: white;
  box-shadow: 0 0.2rem 1rem rgba(10, 7, 20, 0.04);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 100ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .project-activity-card:hover article {
    border-color: rgba($primary, 0.38);
    box-shadow: 0 0.8rem 2rem rgba(10, 7, 20, 0.08);
    transform: translateY(-1px);
  }
}

.project-activity-card:active article {
  box-shadow: 0 0.18rem 0.55rem rgba(10, 7, 20, 0.04);
  transform: translateY(1px) scale(0.99);
}

.activity-card__topline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
}

.activity-card__type,
.activity-card__status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: var(--font-weight-bold);
  line-height: 1;
}

.activity-card__type--conversation {
  background: $primary-lightest;
  color: $primary-dark;
}

.activity-card__type--vote {
  background: #e2f1e8;
  color: #177a41;
}

.activity-card__status--open {
  background: rgba($primary, 0.08);
  color: $primary-dark;
}

.activity-card__status--closed {
  background: $sky-lighter;
  color: $ink-light;
}

.activity-card__translation-control {
  margin-bottom: -0.25rem;
}

h3 {
  margin: 0;
  color: $ink-darker;
  font-size: clamp(1.12rem, 2vw, 1.35rem);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.activity-card__body {
  margin: 0;
  color: $ink-light;
  font-size: 0.95rem;
  line-height: 1.5;
}

.activity-card__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.3rem;
}

.activity-card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem 1rem;
  color: $ink-light;
  font-size: 0.82rem;
  font-weight: var(--font-weight-medium);

  span {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }
}

@media (min-width: 920px) {
  .activity-card__footer {
    align-items: stretch;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  article {
    transition: none;
  }
}
</style>
