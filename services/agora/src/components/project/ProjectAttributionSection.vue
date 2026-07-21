<template>
  <section v-if="entries.length > 0" class="project-attribution-section">
    <h2>{{ title }}</h2>

    <div class="project-attribution-section__list">
      <component
        :is="entry.safeWebsiteUrl === undefined ? 'article' : 'a'"
        v-for="entry in safeEntries"
        :key="`${entry.role}-${entry.displayName}`"
        class="project-attribution-section__entry"
        :class="{
          'project-attribution-section__entry--linkable':
            entry.safeWebsiteUrl !== undefined,
        }"
        v-bind="entryLinkAttributes(entry)"
      >
        <div
          class="project-attribution-section__logo"
          :class="{
            'project-attribution-section__logo--image':
              entry.imageUrl !== undefined,
          }"
          :style="
            entry.imageUrl === undefined
              ? logoStyle(entry.accentColor)
              : undefined
          "
        >
          <OrganizationImage
            v-if="entry.imageUrl !== undefined"
            class="project-attribution-section__logo-image"
            height="100%"
            :organization-image-url="entry.imageUrl"
            :organization-name="entry.displayName"
          />
          <template v-else>{{ entry.initials }}</template>
        </div>

        <div class="project-attribution-section__body">
          <div class="project-attribution-section__name">
            {{ entry.displayName }}
          </div>
        </div>

        <span
          v-if="entry.safeWebsiteUrl !== undefined"
          class="project-attribution-section__link"
          aria-hidden="true"
        >
          <q-icon name="mdi-open-in-new" size="1rem" />
        </span>
      </component>
    </div>
  </section>
</template>

<script setup lang="ts">
import OrganizationImage from "src/components/account/OrganizationImage.vue";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import { computed } from "vue";

import { translateProjectPageText } from "./projectPageI18n";
import type { ProjectAttribution } from "./projectPageTypes";
import { getSafeProjectWebHref } from "./projectUrlSafety";

type ProjectAttributionSectionEntry = Pick<
  ProjectAttribution,
  | "accentColor"
  | "displayName"
  | "imageUrl"
  | "initials"
  | "role"
  | "websiteUrl"
>;

const props = defineProps<{
  title: string;
  entries: readonly ProjectAttributionSectionEntry[];
  languageCode: SupportedDisplayLanguageCodes;
}>();

type SafeProjectAttributionSectionEntry = ProjectAttributionSectionEntry & {
  safeWebsiteUrl: string | undefined;
};

const safeEntries = computed<readonly SafeProjectAttributionSectionEntry[]>(
  () =>
    props.entries.map((entry) => ({
      ...entry,
      safeWebsiteUrl:
        entry.websiteUrl === undefined
          ? undefined
          : getSafeProjectWebHref(entry.websiteUrl),
    }))
);

interface EntryLinkAttributes {
  href: string;
  target: "_blank";
  rel: "noopener noreferrer";
  "aria-label": string;
}

function entryLinkAttributes(
  entry: SafeProjectAttributionSectionEntry
): EntryLinkAttributes | undefined {
  if (entry.safeWebsiteUrl === undefined) return undefined;

  return {
    href: entry.safeWebsiteUrl,
    target: "_blank",
    rel: "noopener noreferrer",
    "aria-label": translateProjectPageText({
      languageCode: props.languageCode,
      key: "openWebsiteAriaLabel",
      params: { name: entry.displayName },
    }),
  };
}

function logoStyle(color: string): { backgroundColor: string } {
  return { backgroundColor: color };
}
</script>

<style scoped lang="scss">
.project-attribution-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

h2 {
  margin: 0;
  color: $ink-light;
  font-size: 0.78rem;
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.08em;
  line-height: 1.2;
  text-transform: uppercase;
}

.project-attribution-section__list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.project-attribution-section__entry {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  margin: 0 -0.5rem;
  padding: 0.45rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 0.7rem;
  color: inherit;
  text-decoration: none;
}

.project-attribution-section__entry--linkable {
  cursor: pointer;
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    box-shadow 140ms ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      border-color: rgba($primary, 0.18);
      background: white;
      box-shadow: 0 0.45rem 1rem rgba(10, 7, 20, 0.06);

      .project-attribution-section__link {
        border-color: rgba($primary, 0.2);
        background: $primary-lightest;
      }
    }
  }

  &:active {
    background: $app-background-color;
    box-shadow: 0 0.18rem 0.55rem rgba(10, 7, 20, 0.04);
  }

  &:focus-visible {
    outline: 2px solid rgba($primary, 0.45);
    outline-offset: 2px;
  }
}

.project-attribution-section__logo {
  width: 3rem;
  height: 3rem;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  flex: none;
  overflow: hidden;
  border-radius: 50%;
  color: white;
  font-size: 0.78rem;
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.02em;
}

.project-attribution-section__logo--image {
  padding: 0;
  border: 1px solid $sky-lighter;
  background: white;
  color: inherit;
}

.project-attribution-section__logo-image {
  width: 100%;
  height: 100%;
  max-width: 100%;
  display: block;
  object-fit: contain;
}

.project-attribution-section__body {
  min-width: 0;
}

.project-attribution-section__name {
  overflow: hidden;
  color: $ink-darker;
  font-size: 0.95rem;
  font-weight: var(--font-weight-bold);
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-attribution-section__link {
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  border: 1px solid $sky-lighter;
  border-radius: 0.65rem;
  color: $primary;
  pointer-events: none;
}
</style>
