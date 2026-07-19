<template>
  <aside
    class="project-details-aside"
    :aria-label="t('projectDetailsAriaLabel')"
  >
    <div v-if="hasAttributionEntries" class="project-details-aside__section">
      <div class="project-details-aside__attribution-groups">
        <ProjectAttributionSection
          v-for="section in attributionSections"
          :key="section.role"
          :title="t(section.titleKey)"
          :entries="section.entries"
          :language-code="languageCode"
        />
      </div>
    </div>

    <section
      v-if="contact !== undefined"
      class="project-details-aside__section project-details-aside__section--contact"
    >
      <h2 class="project-details-aside__title">
        {{ t("projectContactTitle") }}
      </h2>
      <ProjectContactCard :contact="contact" :language-code="languageCode" />
    </section>
  </aside>
</template>

<script setup lang="ts">
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import { computed } from "vue";

import ProjectAttributionSection from "./ProjectAttributionSection.vue";
import ProjectContactCard from "./ProjectContactCard.vue";
import {
  type ProjectPageTranslations,
  translateProjectPageText,
} from "./projectPageI18n";
import type { ProjectAttribution, ProjectContact } from "./projectPageTypes";

type ProjectDetailsAttributionTitleKey = Extract<
  keyof ProjectPageTranslations,
  "sponsorsTitle" | "projectOwnersTitle" | "partnersTitle"
>;

interface ProjectDetailsAttributionSectionConfig {
  role: ProjectAttribution["role"];
  titleKey: ProjectDetailsAttributionTitleKey;
}

interface ProjectDetailsAttributionSection extends ProjectDetailsAttributionSectionConfig {
  entries: readonly ProjectAttribution[];
}

const props = defineProps<{
  attributions: readonly ProjectAttribution[];
  contact: ProjectContact | undefined;
  languageCode: SupportedDisplayLanguageCodes;
}>();

const attributionSectionConfigs = [
  { role: "sponsor", titleKey: "sponsorsTitle" },
  { role: "project_owner", titleKey: "projectOwnersTitle" },
  { role: "partner", titleKey: "partnersTitle" },
] satisfies readonly ProjectDetailsAttributionSectionConfig[];

const attributionSections = computed<
  readonly ProjectDetailsAttributionSection[]
>(() =>
  attributionSectionConfigs
    .map((section) => ({
      ...section,
      entries: filterAttributions(section.role),
    }))
    .filter((section) => section.entries.length > 0)
);
const hasAttributionEntries = computed(
  () => attributionSections.value.length > 0
);

function filterAttributions(
  role: ProjectAttribution["role"]
): readonly ProjectAttribution[] {
  return props.attributions.filter((entry) => entry.role === role);
}

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
.project-details-aside {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2.35rem;
}

.project-details-aside__section {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.project-details-aside__section--contact {
  gap: 0.65rem;
}

.project-details-aside__title {
  margin: 0 0 0.1rem;
  color: $ink-light;
  font-size: 1rem;
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.01em;
  line-height: 1.15;
}

.project-details-aside__attribution-groups {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}
</style>
