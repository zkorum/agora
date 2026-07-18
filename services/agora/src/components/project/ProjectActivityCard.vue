<template>
  <article class="project-activity-card">
    <SpaLink
      v-if="activityLinkTarget !== undefined"
      :to="activityLinkTarget"
      class="project-activity-card__link"
      :aria-label="activityActionAccessibleLabel"
    />
    <div class="project-activity-card__surface">
      <div class="activity-card__topline">
        <div class="activity-card__topline-left">
          <span
            class="activity-card__type"
            :class="`activity-card__type--${activityTypeClass}`"
          >
            <q-icon :name="activityTypeIcon" size="1rem" />
            {{ activityTypeLabel }}
          </span>

          <ContentMetadataLine
            :created-at="activity.createdAt"
            :is-edited="activity.isEdited"
            :edited-label="userIdentityText.edited"
          />
        </div>

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
          :accessible-label="undefined"
          :interactive="false"
        />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import {
  type UserIdentityCardTranslations,
  userIdentityCardTranslations,
} from "src/components/features/user/UserIdentityCard.i18n";
import ContentTranslationControl from "src/components/translation/ContentTranslationControl.vue";
import ContentMetadataLine from "src/components/ui-library/ContentMetadataLine.vue";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKPlainTextContent from "src/components/ui-library/ZKPlainTextContent.vue";
import type {
  LanguageTextDirection,
  SupportedDisplayLanguageCodes,
} from "src/shared/languages";
import { htmlToCountedText } from "src/shared/shared";
import type { LocalizedContentTranslationStatus } from "src/shared/types/zod";
import { useConversationContentQuery } from "src/utils/api/contentTranslation/useContentTranslationQueries";
import type { ContentTranslationDisplayMode } from "src/utils/translation/contentTranslation";
import { computed, ref, watch } from "vue";

import ProjectActionButton from "./ProjectActionButton.vue";
import {
  type ProjectPageTranslations,
  translateProjectPageText,
} from "./projectPageI18n";
import {
  getProjectActivityIdentity,
  type ProjectActionButtonVariant,
  type ProjectActivity,
} from "./projectPageTypes";

const props = defineProps<{
  activity: ProjectActivity;
  projectSlug: string;
  languageCode: SupportedDisplayLanguageCodes;
  textDirection: LanguageTextDirection;
}>();

const activityTranslationModePreference = ref<
  ContentTranslationDisplayMode | undefined
>();
const userIdentityText = computed<UserIdentityCardTranslations>(
  () => userIdentityCardTranslations[props.languageCode]
);

const isRankingActivity = computed(
  () => props.activity.conversationType === "ranking"
);

const activityTypeClass = computed(() =>
  isRankingActivity.value ? "vote" : "conversation"
);

const activityTypeLabel = computed(() =>
  isRankingActivity.value ? t("voteType") : t("conversationType")
);

const activityTypeIcon = computed(() =>
  isRankingActivity.value ? "mdi-poll" : "mdi-forum-outline"
);

const isActivityInteractive = computed(() => props.activity.isIndexed);

const activityIdentity = computed(() => getProjectActivityIdentity(props.activity));

const activityLinkTarget = computed(() => {
  if (!props.activity.isIndexed) {
    return undefined;
  }

  return {
    name: "/project/[projectSlug]/conversation/[postSlugId]/" as const,
    params: { projectSlug: props.projectSlug, postSlugId: props.activity.slugId },
  };
});

const actionLabel = computed(() => {
  if (!isActivityInteractive.value) {
    return t("invitationOnlyAction");
  }

  if (props.activity.isClosed) {
    return t("viewAction");
  }

  return isRankingActivity.value ? t("voteAction") : t("joinAction");
});

const actionIconName = computed(() => {
  if (!isActivityInteractive.value) {
    return "mdi-link-variant";
  }

  return props.textDirection === "rtl" ? "mdi-arrow-left" : "mdi-arrow-right";
});

const actionVariant = computed<ProjectActionButtonVariant>(() =>
  !isActivityInteractive.value || props.activity.isClosed ? "muted" : "primary"
);

const activityActionAccessibleLabel = computed(() =>
  t("activityActionAriaLabel", {
    action: actionLabel.value,
    title: displayedActivityContent.value.title,
  })
);

const requestedActivityContentMode = computed<ContentTranslationDisplayMode>(
  () =>
    activityTranslationModePreference.value ??
    (props.activity.displayContent.status === "available"
      ? props.activity.displayContent.mode
      : "original")
);
const requestedActivityContentQuery = useConversationContentQuery({
  conversationSlugId: computed(() =>
    props.activity.isIndexed ? props.activity.slugId : ""
  ),
  sourceVersion: computed(() => props.activity.displayContent.sourceVersion),
  mode: requestedActivityContentMode,
  requestMode: computed(() =>
    requestedActivityContentMode.value === "translated"
      ? "queue_if_missing"
      : "read_existing"
  ),
  enabled: computed(
    () => activityTranslationModePreference.value !== undefined && props.activity.isIndexed
  ),
});
const activeActivityDisplayContent = computed(() => {
  if (
    activityTranslationModePreference.value !== undefined &&
    requestedActivityContentQuery.data.value !== undefined
  ) {
    const fetchedContent = requestedActivityContentQuery.data.value;
    if (fetchedContent.status !== "available") {
      return {
        sourceVersion: fetchedContent.sourceVersion,
        status: fetchedContent.status,
        translationControl: fetchedContent.translationControl,
      };
    }

    return {
      sourceVersion: fetchedContent.sourceVersion,
      status: "available" as const,
      mode: fetchedContent.mode,
      content: {
        title: fetchedContent.content.title,
        bodyPlainText: htmlToCountedText(fetchedContent.content.body ?? ""),
      },
      translationControl: fetchedContent.translationControl,
    };
  }

  return props.activity.displayContent;
});

const activityTranslationMode = computed<ContentTranslationDisplayMode>({
  get: () =>
    activeActivityDisplayContent.value.status === "available"
      ? activeActivityDisplayContent.value.mode
      : requestedActivityContentMode.value,
  set: (mode) => {
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
  const translationControl = activeActivityDisplayContent.value.translationControl;
  if (translationControl === null) {
    return undefined;
  }

  return {
    sourceLanguageLabel: translationControl.sourceLanguageLabel,
    status: requestedActivityContentQuery.isFetching.value
      ? "pending"
      : translationControl.status,
  };
});

const displayedActivityContent = computed(() => {
  const displayContent = activeActivityDisplayContent.value;
  if (displayContent.status === "available") {
    return displayContent.content;
  }

  return props.activity.displayContent.status === "available"
    ? props.activity.displayContent.content
    : { title: "", bodyPlainText: "" };
});

watch(
  () => [
    activityIdentity.value,
    props.activity.displayContent.sourceVersion,
    props.activity.displayContent.status,
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
  position: relative;
  border-radius: 20px;
}

.project-activity-card__link {
  position: absolute;
  z-index: 1;
  inset: 0;
  border-radius: inherit;

  &:focus-visible {
    outline: none;

    + .project-activity-card__surface {
      border-color: rgba($primary, 0.5);
      box-shadow:
        0 0.75rem 2rem rgba(10, 7, 20, 0.09),
        0 0 0 3px rgba($primary, 0.16);
    }
  }
}

.project-activity-card__surface {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.25rem;
  border: 1.5px solid rgba($primary, 0.22);
  border-radius: 20px;
  background: white;
  pointer-events: none;
  box-shadow: 0 0.2rem 1rem rgba(10, 7, 20, 0.04);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 100ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .project-activity-card__link:hover + .project-activity-card__surface {
    border-color: rgba($primary, 0.38);
    box-shadow: 0 0.8rem 2rem rgba(10, 7, 20, 0.08);
    transform: translateY(-1px);
  }
}

.project-activity-card__link:active + .project-activity-card__surface {
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

.activity-card__topline-left {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  min-width: 0;
  gap: 0.5rem;
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
  position: relative;
  z-index: 2;
  margin-bottom: -0.25rem;
  pointer-events: auto;
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
  .project-activity-card__surface {
    transition: none;
  }
}
</style>
