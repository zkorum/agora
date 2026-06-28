<template>
  <section v-if="entries.length > 0" class="project-attribution-section">
    <h3>{{ title }}</h3>

    <div class="project-attribution-section__list">
      <article
        v-for="entry in entries"
        :key="`${entry.role}-${entry.displayName}`"
        class="project-attribution-section__entry"
      >
        <div class="project-attribution-section__logo" :style="logoStyle(entry.accentColor)">
          {{ entry.initials }}
        </div>

        <div class="project-attribution-section__body">
          <div class="project-attribution-section__name">{{ entry.displayName }}</div>
          <p v-if="entry.description !== undefined">{{ entry.description }}</p>
        </div>

        <a
          v-if="entry.websiteUrl !== undefined"
          class="project-attribution-section__link"
          :href="entry.websiteUrl"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`Open ${entry.displayName} website`"
        >
          <q-icon name="mdi-open-in-new" size="1rem" />
        </a>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ProjectAttribution } from "./projectPageTypes";

defineProps<{
  title: string;
  entries: readonly ProjectAttribution[];
}>();

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

h3 {
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
  gap: 0.65rem;
}

.project-attribution-section__entry {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.project-attribution-section__logo {
  width: 2.35rem;
  height: 2.35rem;
  display: grid;
  place-items: center;
  flex: none;
  border-radius: 0.75rem;
  color: white;
  font-size: 0.78rem;
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.02em;
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

p {
  display: -webkit-box;
  margin: 0.15rem 0 0;
  overflow: hidden;
  color: $ink-light;
  font-size: 0.78rem;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.project-attribution-section__link {
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  border: 1px solid $sky-lighter;
  border-radius: 0.65rem;
  color: $primary;
  text-decoration: none;
  transition:
    border-color 160ms ease,
    background-color 160ms ease;

  @media (hover: hover) {
    &:hover {
      border-color: rgba($primary, 0.38);
      background: rgba($primary, 0.06);
    }
  }
}
</style>
