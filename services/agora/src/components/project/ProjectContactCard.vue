<template>
  <section class="project-contact-card">
    <div class="project-contact-card__header">
      <div class="project-contact-card__avatar">{{ initials }}</div>
      <div>
        <h3>{{ contact.name }}</h3>
        <p>{{ subtitle }}</p>
      </div>
    </div>

    <div class="project-contact-card__actions">
      <a
        v-if="contact.email !== undefined"
        class="project-contact-card__button"
        :href="`mailto:${contact.email}`"
      >
        <q-icon name="mdi-email-outline" size="1rem" />
        Email contact
      </a>

      <a
        v-if="contact.websiteUrl !== undefined"
        class="project-contact-card__button"
        :href="contact.websiteUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        <q-icon name="mdi-open-in-new" size="1rem" />
        Contact page
      </a>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { ProjectContact } from "./projectPageTypes";

const props = defineProps<{
  contact: ProjectContact;
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
</script>

<style scoped lang="scss">
.project-contact-card {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
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
  gap: 0.55rem;
}

.project-contact-card__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.7rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid rgba($primary, 0.24);
  border-radius: 0.85rem;
  background: rgba(white, 0.46);
  color: $primary;
  font-size: 0.9rem;
  font-weight: var(--font-weight-bold);
  text-align: center;
  text-decoration: none;
}
</style>
