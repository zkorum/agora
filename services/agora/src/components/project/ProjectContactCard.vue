<template>
  <section class="project-contact-card">
    <div class="project-contact-card__header">
      <div
        class="project-contact-card__avatar"
        :class="{
          'project-contact-card__avatar--image': contact.imageUrl !== undefined,
        }"
      >
        <OrganizationImage
          v-if="contact.imageUrl !== undefined"
          class="project-contact-card__avatar-image"
          height="100%"
          :organization-image-url="contact.imageUrl"
          :organization-name="displayName"
        />
        <template v-else>{{ initials }}</template>
      </div>
      <div class="project-contact-card__body">
        <h3>{{ displayName }}</h3>
        <p v-if="subtitle !== ''">{{ subtitle }}</p>
      </div>
    </div>

    <div class="project-contact-card__actions">
      <ProjectActionButton
        v-if="safeEmailHref !== undefined"
        :label="t('emailContactLabel')"
        icon-name="mdi-email-outline"
        :href="safeEmailHref"
        :external="false"
        variant="outline"
        :block="true"
        :accessible-label="t('emailContactAriaLabel', { name: displayName })"
        :interactive="true"
      />

      <ProjectActionButton
        v-if="safeWebsiteHref !== undefined"
        :label="t('contactPageLabel')"
        icon-name="mdi-open-in-new"
        :href="safeWebsiteHref"
        :external="true"
        variant="outline"
        :block="true"
        :accessible-label="t('contactPageAriaLabel', { name: displayName })"
        :interactive="true"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import OrganizationImage from "src/components/account/OrganizationImage.vue";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import { computed } from "vue";

import ProjectActionButton from "./ProjectActionButton.vue";
import {
  type ProjectPageTranslations,
  translateProjectPageText,
} from "./projectPageI18n";
import type { ProjectContact } from "./projectPageTypes";
import { getSafeProjectHref, getSafeProjectWebHref } from "./projectUrlSafety";

const props = defineProps<{
  contact: ProjectContact;
  languageCode: SupportedDisplayLanguageCodes;
}>();

const subtitle = computed(() => {
  return [props.contact.roleLabel, props.contact.affiliationName]
    .filter((value): value is string => value !== undefined)
    .join(" · ");
});

const displayName = computed(() =>
  [props.contact.firstName, props.contact.lastName]
    .filter((part): part is string => part !== undefined)
    .join(" ")
);

const initials = computed(() => {
  const firstInitial = props.contact.firstName.trim().at(0) ?? "";
  const lastInitial = props.contact.lastName?.trim().at(0) ?? "";
  return `${firstInitial}${lastInitial}`.toUpperCase();
});

const safeEmailHref = computed(() =>
  props.contact.email === undefined
    ? undefined
    : getSafeProjectHref(`mailto:${props.contact.email}`)
);
const safeWebsiteHref = computed(() =>
  props.contact.websiteUrl === undefined
    ? undefined
    : getSafeProjectWebHref(props.contact.websiteUrl)
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
.project-contact-card {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.project-contact-card__header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
}

.project-contact-card__avatar {
  width: 3rem;
  height: 3rem;
  display: grid;
  place-items: center;
  flex: none;
  border-radius: 50%;
  background: $primary-lightest;
  color: $primary-dark;
  font-weight: var(--font-weight-bold);
}

.project-contact-card__avatar--image {
  padding: 0.35rem;
  border: 1px solid $sky-lighter;
  background: white;
}

.project-contact-card__avatar-image {
  width: 100%;
  max-width: 100%;
  display: block;
  object-fit: contain;
}

.project-contact-card__body {
  min-width: 0;
}

h3,
p {
  margin: 0;
}

h3 {
  overflow: hidden;
  color: $ink-darker;
  font-size: 1rem;
  font-weight: var(--font-weight-bold);
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

p {
  margin-top: 0.2rem;
  color: $ink-light;
  font-size: 0.85rem;
  line-height: 1.35;
}

.project-contact-card__actions {
  display: grid;
  gap: 0.85rem;
}
</style>
