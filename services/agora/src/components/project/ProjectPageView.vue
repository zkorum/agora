<template>
  <div class="project-page-view" :dir="projectTextDirection">
    <main>
      <section
        class="project-page-view__banner"
        :class="[
          `project-page-view__banner--${project.bannerVariant}`,
          {
            'project-page-view__banner--with-image':
              selectedBannerImageUrl !== undefined,
          },
        ]"
      >
        <img
          v-if="selectedBannerImageUrl !== undefined"
          :key="selectedBannerImageUrl"
          class="project-page-view__banner-image"
          :src="selectedBannerImageUrl"
          :alt="t('bannerImageAlt', { title: displayedProjectContent.title })"
        />
        <div class="project-page-view__banner-grid"></div>
        <div
          class="project-page-view__banner-controls"
          :class="{
            'project-page-view__banner-controls--without-language':
              !hasMultipleLanguageOptions,
          }"
        >
          <ProjectLanguageSelect
            v-if="hasMultipleLanguageOptions"
            v-model:selected-language="selectedLanguage"
            class="project-page-view__language"
            :language-options="languageOptions"
            :conversation-supported-language-codes="[]"
            :text-direction="projectTextDirection"
          />

          <div
            v-if="consultationStatus !== 'none'"
            class="project-page-view__consultation-pill"
            :class="consultationStatusClass"
          >
            <ZKLiveStatusDot
              class="project-page-view__consultation-dot"
              :active="consultationStatus === 'live'"
              tone="positive"
            />
            {{ consultationStatusLabel }}
          </div>
        </div>
      </section>

      <div class="project-page-view__shell">
        <section class="project-page-view__intro">
          <h1>{{ displayedProjectContent.title }}</h1>
          <p
            v-if="displayedProjectContent.subtitle !== undefined"
            class="project-page-view__subtitle"
          >
            {{ displayedProjectContent.subtitle }}
          </p>
          <ContentTranslationControl
            v-if="translationPreview !== undefined"
            :model-value="translationPreview.mode"
            class="project-page-view__translation-control"
            :source-language-label="translationPreview.sourceLanguageLabel"
            :translation-status="translationPreview.translationStatus"
            @update:model-value="setTranslationMode"
          />
          <ZKHtmlContent
            v-if="displayedProjectContent.bodyHtml !== undefined"
            class="project-page-view__body"
            :html-body="displayedProjectContent.bodyHtml"
            :compact-mode="false"
            :enable-links="true"
            :collapsed-line-count="4"
            :desktop-collapsed-line-count="4"
          />

          <div class="project-page-view__stats">
            <span>
              <q-icon name="mdi-account-outline" size="1rem" />
              {{
                t("uniqueParticipantsCount", {
                  count: project.participantCount,
                })
              }}
            </span>
            <span>
              <q-icon name="mdi-account-multiple-outline" size="1rem" />
              {{
                t("participationsCount", {
                  count: project.participationCount,
                })
              }}
            </span>
            <span>
              <q-icon name="mdi-format-list-bulleted" size="1rem" />
              {{
                t("activitiesCount", {
                  count: project.activityCount,
                })
              }}
            </span>
            <span>
              <q-icon name="mdi-check-circle-outline" size="1rem" />
              {{ t("votesCount", { count: project.voteCount }) }}
            </span>
          </div>
        </section>

        <div
          class="project-page-view__content-grid"
          :class="{
            'project-page-view__content-grid--without-aside': !hasAttributions,
          }"
        >
          <section
            class="project-page-view__activities"
            aria-labelledby="project-activities-title"
          >
            <div class="project-page-view__section-heading">
              <div>
                <p>
                  {{
                    t("activitiesCount", {
                      count: project.activityCount,
                    })
                  }}
                </p>
                <h2 id="project-activities-title" class="visually-hidden">
                  {{ t("activitiesTitle") }}
                </h2>
              </div>
            </div>

            <div
              v-if="activities.length > 0"
              class="project-page-view__activity-list"
            >
              <ProjectActivityCard
                v-for="activity in activities"
                :key="getProjectActivityIdentity(activity)"
                :activity="activity"
                :project-slug="project.slug"
                :language-code="selectedLanguage"
                :text-direction="projectTextDirection"
              />
            </div>

            <div
              v-if="activities.length === 0"
              class="project-page-view__empty-activities"
            >
              <q-icon name="mdi-forum-outline" size="2rem" />
              <span>{{ t("emptyActivities") }}</span>
            </div>

            <div
              v-if="activities.length > 0 && canLoadMoreActivities"
              class="project-page-view__load-more"
            >
              <ZKButton
                button-type="compactButton"
                color="primary"
                flat
                :loading="isLoadingMoreActivities"
                :disable="isLoadingMoreActivities"
                @click="emit('loadMoreActivities')"
              >
                {{ t("loadMoreActivities") }}
              </ZKButton>
            </div>

            <div
              v-if="activities.length > 0 && !canLoadMoreActivities"
              class="project-page-view__list-complete"
            >
              <q-icon name="mdi-check" size="1.15rem" />
              <span>{{ t("allActivitiesLoaded") }}</span>
            </div>
          </section>

          <ProjectDetailsAside
            v-if="hasAttributions"
            class="project-page-view__aside"
            :attributions="project.attributions"
            :contact="undefined"
            :language-code="selectedLanguage"
          />

          <div
            v-if="project.documents.length > 0 || project.contact !== undefined"
            class="project-page-view__supplemental"
          >
            <ProjectDocuments
              :project-slug="project.slug"
              :documents="project.documents"
              :language-code="selectedLanguage"
            />

            <section
              v-if="project.contact !== undefined"
              class="project-page-view__facilitator"
              aria-labelledby="project-facilitator-title"
            >
              <ProjectSectionHeading
                heading-id="project-facilitator-title"
                :title="t('facilitatorTitle')"
              />
              <ProjectContactCard
                :contact="project.contact"
                :language-code="selectedLanguage"
                layout="wide"
              />
            </section>
          </div>
        </div>

        <ProjectPageFooter :language-code="selectedLanguage" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import ContentTranslationControl from "src/components/translation/ContentTranslationControl.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import ZKLiveStatusDot from "src/components/ui-library/ZKLiveStatusDot.vue";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import { getLanguageTextDirection } from "src/shared/languages";
import { useProjectDisplayContent } from "src/utils/translation/useProjectDisplayContent";
import { computed } from "vue";

import ProjectActivityCard from "./ProjectActivityCard.vue";
import ProjectContactCard from "./ProjectContactCard.vue";
import ProjectDetailsAside from "./ProjectDetailsAside.vue";
import ProjectDocuments from "./ProjectDocuments.vue";
import ProjectLanguageSelect from "./ProjectLanguageSelect.vue";
import ProjectPageFooter from "./ProjectPageFooter.vue";
import {
  type ProjectPageTranslations,
  translateProjectPageText,
} from "./projectPageI18n";
import {
  getProjectActivityIdentity,
  type ProjectActivity,
  type ProjectLanguageOption,
  type ProjectPageData,
} from "./projectPageTypes";
import ProjectSectionHeading from "./ProjectSectionHeading.vue";

type ConsultationStatus = "none" | "live" | "closed";

const props = defineProps<{
  project: ProjectPageData;
  activities: readonly ProjectActivity[];
  canLoadMoreActivities: boolean;
  isLoadingMoreActivities: boolean;
  languageOptions: readonly ProjectLanguageOption[];
}>();
const emit = defineEmits<{
  loadMoreActivities: [];
}>();

const selectedLanguage = defineModel<SupportedDisplayLanguageCodes>(
  "selectedLanguage",
  { required: true }
);

const projectTextDirection = computed(() =>
  getLanguageTextDirection(selectedLanguage.value)
);

const selectedBannerImageUrl = computed(() => {
  return props.project.bannerImageUrl;
});
const {
  displayedContent: displayedProjectContent,
  translationPreview,
  setTranslationMode,
} = useProjectDisplayContent({
  projectSlug: computed(() => props.project.slug),
  displayContent: computed(() => props.project.displayContent),
});

const consultationStatus = computed<ConsultationStatus>(() => {
  if (props.activities.length === 0) {
    return "none";
  }

  if (props.activities.some((activity) => !activity.isClosed)) {
    return "live";
  }

  return "closed";
});
const consultationStatusLabel = computed(() => {
  if (consultationStatus.value === "none") return "";

  return consultationStatus.value === "live"
    ? t("liveConsultation")
    : t("closedConsultation");
});
const consultationStatusClass = computed(() => ({
  "project-page-view__consultation-pill--closed":
    consultationStatus.value === "closed",
}));
const canLoadMoreActivities = computed(() => props.canLoadMoreActivities);
const hasAttributions = computed(() => props.project.attributions.length > 0);
const hasMultipleLanguageOptions = computed(
  () => new Set(props.languageOptions.map((option) => option.value)).size > 1
);
function t(
  key: keyof ProjectPageTranslations,
  params?: Readonly<Record<string, string | number>>
): string {
  return translateProjectPageText({
    languageCode: selectedLanguage.value,
    key,
    params,
  });
}
</script>

<style scoped lang="scss">
.project-page-view {
  min-height: 100dvh;
  background:
    radial-gradient(
      circle at 1px 1px,
      rgba($ink-darkest, 0.035) 1px,
      transparent 0
    ),
    $app-background-color;
  background-size: 24px 24px;
  color: $ink-darker;
}

.project-page-view__language {
  flex: none;
}

main {
  padding-bottom: 3rem;
}

.project-page-view__banner {
  position: relative;
  height: clamp(12.5rem, 25vw, 17rem);
  overflow: hidden;
  background: linear-gradient(135deg, #1d4f9f, #6b4eff);
}

.project-page-view__banner--purple {
  background: linear-gradient(135deg, #5538ee, #d8639a);
}

.project-page-view__banner--green {
  background: linear-gradient(135deg, #177a41, #4f92f6);
}

.project-page-view__banner-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-page-view__banner-grid {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 20%, rgba(white, 0.22), transparent 26%),
    radial-gradient(circle at 72% 26%, rgba(white, 0.2), transparent 22%),
    linear-gradient(
      180deg,
      rgba($ink-darkest, 0.08),
      rgba($app-background-color, 0.88)
    );
}

.project-page-view__banner--with-image {
  background: $app-background-color;

  .project-page-view__banner-grid {
    background: linear-gradient(
      180deg,
      rgba($ink-darkest, 0.02),
      rgba($app-background-color, 0.16)
    );
  }
}

.project-page-view__banner-controls {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: min(72rem, calc(100% - 2rem));
  margin: 0 auto;
  padding-top: 0.85rem;
}

.project-page-view__banner-controls--without-language {
  justify-content: flex-end;
}

.project-page-view__consultation-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.48rem 0.75rem;
  border-radius: 999px;
  background: rgba($ink-base, 0.78);
  color: white;
  font-size: 0.78rem;
  font-weight: var(--font-weight-bold);
  line-height: 1;
  box-shadow: 0 0.25rem 1rem rgba(10, 7, 20, 0.14);
  white-space: nowrap;
}

.project-page-view__consultation-dot {
  flex: none;
  width: 0.6rem;
  height: 0.6rem;
}

.project-page-view__consultation-pill--closed {
  .project-page-view__consultation-dot {
    background: $sky-dark;
  }
}

.project-page-view__shell {
  width: min(72rem, calc(100% - 2rem));
  margin: 0 auto;
  position: relative;
}

.project-page-view__intro {
  max-width: 64rem;
  padding: clamp(1rem, 2.4vw, 1.6rem) 0 0;
}

.project-page-view__section-heading p {
  margin: 0;
  color: $primary;
  font-size: 0.78rem;
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.1em;
  line-height: 1.2;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: $ink-darkest;
  font-size: clamp(2rem, 4.6vw, 3.35rem);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.045em;
  line-height: 1.02;
}

.project-page-view__subtitle {
  margin: 0.7rem 0 0;
  color: $primary-dark;
  font-size: clamp(1.1rem, 2.4vw, 1.45rem);
  font-weight: var(--font-weight-semibold);
  line-height: 1.25;
}

.project-page-view__translation-control {
  margin-top: 0.55rem;
}

.project-page-view__body {
  max-width: 42rem;
  margin: 1rem 0 0;
  color: $ink-light;

  :deep(.textBreak) {
    font-size: 1rem;
    line-height: 1.65;
  }
}

.project-page-view__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1.2rem;

  span {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.7rem;
    border: 1px solid $sky-lighter;
    border-radius: 999px;
    background: $app-background-color;
    color: $ink-light;
    font-size: 0.85rem;
    font-weight: var(--font-weight-semibold);
  }
}

.project-page-view__content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(18rem, 22rem);
  grid-template-areas:
    "activities aside"
    "supplemental aside";
  gap: clamp(1.4rem, 4vw, 2.7rem);
  align-items: start;
  margin-top: 2rem;
}

.project-page-view__content-grid--without-aside {
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    "activities"
    "supplemental";
}

.project-page-view__activities,
.project-page-view__aside {
  min-width: 0;
}

.project-page-view__activities {
  grid-area: activities;
}

.project-page-view__aside {
  grid-area: aside;
}

.project-page-view__supplemental {
  display: flex;
  grid-area: supplemental;
  min-width: 0;
  flex-direction: column;
  gap: 1.5rem;
  margin-block-start: 0.5rem;
}

.project-page-view__facilitator {
  container-type: inline-size;
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.75rem;
}

.project-page-view__section-heading {
  margin-bottom: 1rem;
}

h2 {
  margin: 0.25rem 0 0;
  color: $ink-darkest;
  font-size: clamp(1.3rem, 2.8vw, 1.8rem);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.025em;
  line-height: 1.15;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.project-page-view__activity-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.project-page-view__empty-activities,
.project-page-view__list-complete,
.project-page-view__load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  color: $sky-dark;
  font-size: 0.86rem;
  font-weight: var(--font-weight-semibold);
  text-align: center;
}

.project-page-view__empty-activities {
  min-height: 12rem;
  flex-direction: column;
  padding: 1.25rem;
  border: 1px dashed $sky-light;
  border-radius: 20px;
  background: rgba(white, 0.62);
}

.project-page-view__list-complete {
  padding: 1.15rem 0 0.25rem;
}

.project-page-view__load-more {
  padding-block-start: 1rem;
}

.project-page-view__aside {
  position: sticky;
  top: 5.2rem;
}

@media (max-width: 860px) {
  .project-page-view__content-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "activities"
      "supplemental"
      "aside";
  }

  .project-page-view__aside {
    position: static;
  }
}

@media (max-width: 520px) {
  .project-page-view__banner-controls {
    width: calc(100% - 1.2rem);
    padding-top: 0.7rem;
  }

  .project-page-view__consultation-pill {
    padding: 0.5rem 0.7rem;
    font-size: 0.78rem;
  }
}
</style>
