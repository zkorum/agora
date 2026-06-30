<template>
  <section class="project-contact-card">
    <div class="project-contact-card__header">
      <div
        class="project-contact-card__avatar"
        :class="{
          'project-contact-card__avatar--image': contact.imageUrl !== undefined,
        }"
      >
        <img
          v-if="contact.imageUrl !== undefined"
          :src="contact.imageUrl"
          :alt="t('contactImageAlt', { name: contact.name })"
        />
        <template v-else>{{ initials }}</template>
      </div>
      <div>
        <h3>{{ contact.name }}</h3>
        <p>{{ subtitle }}</p>
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
        :accessible-label="t('emailContactAriaLabel', { name: contact.name })"
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
        :accessible-label="t('contactPageAriaLabel', { name: contact.name })"
        :interactive="true"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

import ProjectActionButton from "./ProjectActionButton.vue";
import {
  type ProjectPageTranslations,
  translateProjectPageText,
} from "./projectPageI18n";
import type { ProjectContact } from "./projectPageTypes";
import {
  getSafeProjectHref,
  getSafeProjectWebHref,
} from "./projectUrlSafety";

const props = defineProps<{
  contact: ProjectContact;
  languageCode: string;
}>();

const subtitle = computed(() => {
  return [props.contact.roleLabel, props.contact.affiliationName]
    .filter((value): value is string => value !== undefined)
    .join(" · ");
});

const initials = computed(() => {
  return props.contact.name
    .split(" ")
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}

h3,
p {
  margin: 0;
}

h3 {
  color: $ink-darker;
  font-size: 1rem;
  font-weight: var(--font-weight-bold);
  line-height: 1.25;
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
