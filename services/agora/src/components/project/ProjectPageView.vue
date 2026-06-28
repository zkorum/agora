<template>
  <div class="project-page-view">
    <main>
      <section class="project-page-view__hero" :class="`project-page-view__hero--${project.heroVariant}`">
        <div class="project-page-view__hero-grid"></div>
        <div class="project-page-view__hero-controls">
          <BackButton :fallback-route="{ name: '/dev/component-testing' }" />

          <div class="project-page-view__hero-actions">
            <div class="project-page-view__consultation-pill" :class="consultationStatusClass">
              <span></span>
              {{ consultationStatusLabel }}
            </div>

            <ZKSearchableBottomSheetSelect
              v-model="selectedLanguage"
              class="project-page-view__language"
              variant="pill"
              label="Language"
              dialog-title="Your display language"
              dialog-subtitle="Choose the language used in the Agora interface."
              search-placeholder="Search languages"
              search-mode="always"
              :options="languageOptions"
            />
          </div>
        </div>
      </section>

      <div class="project-page-view__shell">
        <section class="project-page-view__intro">
          <h1>{{ project.title }}</h1>
          <p v-if="project.subtitle !== undefined" class="project-page-view__subtitle">
            {{ project.subtitle }}
          </p>
          <p v-if="project.bodyPlainText !== undefined" class="project-page-view__body">
            {{ project.bodyPlainText }}
          </p>

          <div class="project-page-view__stats">
            <span v-if="project.participantCount >= 2">
              <q-icon name="mdi-account-outline" size="1rem" />
              {{ formatNumber(project.participantCount) }} participants have joined
            </span>
            <span>
              <q-icon name="mdi-format-list-bulleted" size="1rem" />
              {{ formatNumber(project.activityCount) }} activities
            </span>
            <span>
              <q-icon name="mdi-check-circle-outline" size="1rem" />
              {{ formatNumber(project.voteCount) }} votes
            </span>
          </div>
        </section>

        <div class="project-page-view__content-grid">
          <section class="project-page-view__activities" aria-labelledby="project-activities-title">
            <div class="project-page-view__section-heading">
              <div>
                <p>{{ formatNumber(project.activityCount) }} activities</p>
                <h2 id="project-activities-title" class="visually-hidden">Activities</h2>
              </div>
            </div>

            <div class="project-page-view__activity-list">
              <ProjectActivityCard
                v-for="activity in project.activities"
                :key="activity.slug"
                :activity="activity"
              />
            </div>
          </section>

          <aside class="project-page-view__aside" aria-label="Project details">
            <section class="project-page-view__info-section">
              <h2 class="project-page-view__aside-title">Who is behind this</h2>
              <ProjectAttributionSection
                title="Project Owners"
                :entries="projectOwnerAttributions"
              />
              <ProjectAttributionSection title="Sponsors" :entries="sponsorAttributions" />
              <ProjectAttributionSection title="Partners" :entries="partnerAttributions" />
            </section>

            <section v-if="project.contact !== undefined" class="project-page-view__info-section">
              <h2 class="project-page-view__aside-title">Project contact</h2>
              <ProjectContactCard :contact="project.contact" />
            </section>
          </aside>
        </div>

        <footer class="project-page-view__footer">
          <span>Powered by <strong>Agora Citizen Network</strong></span>
          <span>Project content is owned by the Project Owners.</span>
        </footer>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import BackButton from "src/components/navigation/buttons/BackButton.vue";
import ZKSearchableBottomSheetSelect from "src/components/ui-library/ZKSearchableBottomSheetSelect.vue";
import { computed, ref } from "vue";

import ProjectActivityCard from "./ProjectActivityCard.vue";
import ProjectAttributionSection from "./ProjectAttributionSection.vue";
import ProjectContactCard from "./ProjectContactCard.vue";
import type { ProjectAttribution, ProjectLanguageOption, ProjectPageData } from "./projectPageTypes";

const props = defineProps<{
  project: ProjectPageData;
  languageOptions: readonly ProjectLanguageOption[];
  initialLanguage: string;
}>();

const selectedLanguage = ref<string | readonly string[]>(props.initialLanguage);

const projectOwnerAttributions = computed(() => filterAttributions("project_owner"));
const sponsorAttributions = computed(() => filterAttributions("sponsor"));
const partnerAttributions = computed(() => filterAttributions("partner"));
const hasOpenActivity = computed(() =>
  props.project.activities.some(
    (activity) => activity.kind === "conversation" && !activity.isClosed
  )
);
const consultationStatusLabel = computed(() =>
  hasOpenActivity.value ? "Live consultation" : "Closed consultation"
);
const consultationStatusClass = computed(() => ({
  "project-page-view__consultation-pill--closed": !hasOpenActivity.value,
}));

const numberFormatter = new Intl.NumberFormat();

function filterAttributions(role: ProjectAttribution["role"]): readonly ProjectAttribution[] {
  return props.project.attributions.filter((entry) => entry.role === role);
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}
</script>

<style scoped lang="scss">
.project-page-view {
  min-height: 100dvh;
  background:
    radial-gradient(circle at 1px 1px, rgba($ink-darkest, 0.035) 1px, transparent 0),
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

.project-page-view__hero {
  position: relative;
  height: clamp(12rem, 25vw, 17rem);
  overflow: hidden;
  background: linear-gradient(135deg, #1d4f9f, #6b4eff);
}

.project-page-view__hero--purple {
  background: linear-gradient(135deg, #5538ee, #d8639a);
}

.project-page-view__hero--green {
  background: linear-gradient(135deg, #177a41, #4f92f6);
}

.project-page-view__hero-grid {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 20%, rgba(white, 0.22), transparent 26%),
    radial-gradient(circle at 72% 26%, rgba(white, 0.2), transparent 22%),
    linear-gradient(180deg, rgba($ink-darkest, 0.08), rgba($app-background-color, 0.88));
}

.project-page-view__hero-controls {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  width: min(72rem, calc(100% - 2rem));
  margin: 0 auto;
  padding-top: 0.85rem;

  :deep(.zk-icon-button) {
    min-width: 2.75rem;
    min-height: 2.75rem;
    padding: 0.55rem;
    border-radius: 14px;
    background: rgba(white, 0.92);
    box-shadow: 0 0.25rem 1rem rgba(10, 7, 20, 0.08);
  }
}

.project-page-view__hero-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.55rem;
}

.project-page-view__consultation-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.48rem 0.75rem;
  border-radius: 999px;
  background: rgba($ink-base, 0.78);
  color: white;
  font-size: 0.78rem;
  font-weight: var(--font-weight-bold);
  line-height: 1;
  box-shadow: 0 0.25rem 1rem rgba(10, 7, 20, 0.14);

  span {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
    background: #46d17f;
    box-shadow: 0 0 0 0 rgba(#46d17f, 0.6);
  }
}

.project-page-view__consultation-pill--closed span {
  background: $sky-dark;
  box-shadow: none;
}

.project-page-view__shell {
  width: min(72rem, calc(100% - 2rem));
  margin: 0 auto;
  position: relative;
}

.project-page-view__intro {
  max-width: 48rem;
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

.project-page-view__body {
  max-width: 42rem;
  margin: 1rem 0 0;
  color: $ink-light;
  font-size: 1rem;
  line-height: 1.65;
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
  gap: clamp(1.4rem, 4vw, 2.7rem);
  align-items: start;
  margin-top: 2rem;
}

.project-page-view__activities,
.project-page-view__aside {
  min-width: 0;
}

.project-page-view__section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
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

.project-page-view__activity-list,
.project-page-view__aside,
.project-page-view__info-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.project-page-view__aside {
  position: sticky;
  top: 5.2rem;
}

.project-page-view__info-section {
  gap: 1.1rem;
}

.project-page-view__aside-title {
  margin: 0 0 0.1rem;
  color: $ink-light;
  font-size: 1rem;
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.01em;
}

.project-page-view__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem 1rem;
  padding: 2.5rem 0 0;
  color: $sky-dark;
  font-size: 0.82rem;
  text-align: center;

  strong {
    color: $ink-light;
  }
}

@media (max-width: 860px) {
  .project-page-view__content-grid {
    grid-template-columns: 1fr;
  }

  .project-page-view__aside {
    position: static;
  }
}

@media (max-width: 520px) {
  .project-page-view__hero-controls {
    width: calc(100% - 1.2rem);
    padding-top: 0.7rem;
  }

  .project-page-view__consultation-pill {
    padding: 0.5rem 0.7rem;
    font-size: 0.78rem;
  }
}
</style>
