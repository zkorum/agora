<template>
  <div v-if="hasProjectDetails" class="project-mobile-details">
    <button
      type="button"
      class="project-mobile-details__button"
      :aria-label="t({ key: 'projectDetailsAriaLabel' })"
      aria-haspopup="dialog"
      :aria-expanded="showProjectDetails"
      :class="{
        'project-mobile-details__button--without-logos': !hasPreviewLogos,
      }"
      @click="showProjectDetails = true"
    >
      <span
        v-if="hasPreviewLogos"
        class="project-mobile-details__logos"
        aria-hidden="true"
      >
        <span
          v-for="(entry, index) in attributionPreviewEntries"
          :key="`${entry.role}-${entry.displayName}-${index.toString()}`"
          class="project-mobile-details__logo"
          :class="{
            'project-mobile-details__logo--image': entry.imageUrl !== undefined,
          }"
          :style="
            entry.imageUrl === undefined
              ? { backgroundColor: entry.accentColor }
              : undefined
          "
        >
          <OrganizationImage
            v-if="entry.imageUrl !== undefined"
            class="project-mobile-details__logo-image"
            height="100%"
            loading="lazy"
            :organization-image-url="entry.imageUrl"
            :organization-name="entry.displayName"
          />
          <template v-else>{{ entry.initials }}</template>
        </span>

        <span
          v-if="hiddenAttributionCount > 0"
          class="project-mobile-details__logo project-mobile-details__logo--more"
        >
          +{{ hiddenAttributionCount }}
        </span>
      </span>

      <span class="project-mobile-details__summary">
        {{ projectDetailsSummary }}
      </span>

      <q-icon
        :name="detailsIcon"
        size="1.1rem"
        class="project-mobile-details__chevron"
        aria-hidden="true"
      />
    </button>
  </div>

  <q-dialog
    v-if="hasProjectDetails"
    v-model="showProjectDetails"
    position="bottom"
  >
    <ZKBottomDialogContainer
      :title="t({ key: 'projectDetailsAriaLabel' })"
      show-close-button
    >
      <ProjectDetailsAside
        :attributions="attributions"
        :contact="contact"
        :language-code="languageCode"
      />
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import OrganizationImage from "src/components/account/OrganizationImage.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import {
  getLanguageTextDirection,
  type SupportedDisplayLanguageCodes,
} from "src/shared/languages";
import { computed, ref } from "vue";

import ProjectDetailsAside from "./ProjectDetailsAside.vue";
import {
  type ProjectPageTranslations,
  translateProjectPageText,
} from "./projectPageI18n";
import type { ProjectAttribution, ProjectContact } from "./projectPageTypes";

const props = defineProps<{
  attributions: readonly ProjectAttribution[];
  contact: ProjectContact | undefined;
  languageCode: SupportedDisplayLanguageCodes;
}>();

const attributionRoleOrder = [
  "sponsor",
  "project_owner",
  "partner",
] satisfies readonly ProjectAttribution["role"][];

const showProjectDetails = ref(false);
const orderedAttributions = computed(() =>
  attributionRoleOrder.flatMap((role) => filterAttributions(role))
);
const attributionPreviewEntries = computed(() =>
  orderedAttributions.value.slice(0, 4)
);
const hasPreviewLogos = computed(
  () => attributionPreviewEntries.value.length > 0
);
const hiddenAttributionCount = computed(
  () =>
    orderedAttributions.value.length - attributionPreviewEntries.value.length
);
const hasProjectDetails = computed(
  () => props.attributions.length > 0 || props.contact !== undefined
);
const projectDetailsSummary = computed(() => {
  const leadEntry =
    props.attributions.find((entry) => entry.role === "project_owner") ??
    orderedAttributions.value.at(0);
  if (leadEntry !== undefined) {
    const otherCount = orderedAttributions.value.length - 1;
    if (otherCount === 0) {
      return leadEntry.displayName;
    }

    return t({
      key: "projectDetailsSummary",
      params: { name: leadEntry.displayName, count: otherCount },
    });
  }

  return projectContactName.value;
});
const projectContactName = computed(() => {
  if (props.contact === undefined) return "";

  return [props.contact.firstName, props.contact.lastName]
    .filter((part): part is string => part !== undefined)
    .join(" ");
});
const detailsIcon = computed(() =>
  getLanguageTextDirection(props.languageCode) === "rtl"
    ? "mdi-chevron-left"
    : "mdi-chevron-right"
);

function filterAttributions(
  role: ProjectAttribution["role"]
): readonly ProjectAttribution[] {
  return props.attributions.filter((entry) => entry.role === role);
}

function t({
  key,
  params,
}: {
  key: keyof ProjectPageTranslations;
  params?: Readonly<Record<string, string | number>>;
}): string {
  return translateProjectPageText({
    languageCode: props.languageCode,
    key,
    params,
  });
}
</script>

<style scoped lang="scss">
.project-mobile-details {
  display: none;
  padding: 0;
  border: 1px solid $sky-lighter;
  border-radius: 12px;
  background: $app-background-color;
  box-shadow: 0 0.35rem 1rem rgba(10, 7, 20, 0.04);
}

.project-mobile-details__button {
  width: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.75rem;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.project-mobile-details__button--without-logos {
  grid-template-columns: minmax(0, 1fr) auto;
}

.project-mobile-details__logos {
  display: flex;
  min-width: 4.1rem;
}

.project-mobile-details__logo {
  width: 1.55rem;
  height: 1.55rem;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid $sky-lighter;
  border-radius: 0.35rem;
  color: white;
  font-size: 0.55rem;
  font-weight: var(--font-weight-bold);
  box-shadow: 0 0 0 2px $app-background-color;

  & + & {
    margin-inline-start: -0.35rem;
  }
}

.project-mobile-details__logo--image,
.project-mobile-details__logo--more {
  background: white;
  color: $ink-light;
}

.project-mobile-details__logo-image {
  width: 100%;
  max-width: 100%;
  display: block;
  object-fit: contain;
}

.project-mobile-details__summary {
  overflow: hidden;
  color: $ink-light;
  font-size: 0.84rem;
  font-weight: var(--font-weight-bold);
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-mobile-details__chevron {
  color: $sky-dark;
}

@media (max-width: 860px) {
  .project-mobile-details {
    display: grid;
  }
}
</style>
