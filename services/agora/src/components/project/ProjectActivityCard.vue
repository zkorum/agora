<template>
  <SpaLink
    :to="{ name: '/conversation/[postSlugId]/', params: { postSlugId: activity.slug } }"
    class="project-activity-card"
  >
    <article>
      <div class="activity-card__topline">
        <span class="activity-card__type" :class="`activity-card__type--${activity.kind}`">
          <q-icon :name="activityTypeIcon" size="1rem" />
          {{ activityTypeLabel }}
        </span>

        <span class="activity-card__status" :class="statusClass">
          {{ activity.isClosed ? "Closed" : "Open" }}
        </span>
      </div>

      <h3>{{ activity.title }}</h3>
      <p class="activity-card__body">{{ activity.bodyPlainText }}</p>

      <div class="activity-card__footer">
        <div class="activity-card__stats" aria-label="Activity statistics">
          <span>
            <q-icon name="mdi-message-text-outline" size="1rem" />
            {{ formatNumber(activity.stats.opinionCount) }} statements
          </span>
          <span>
            <q-icon name="mdi-account-outline" size="1rem" />
            {{ formatNumber(activity.stats.participantCount) }} participants
          </span>
          <span>
            <q-icon name="mdi-check-circle-outline" size="1rem" />
            {{ formatNumber(activity.stats.voteCount) }} votes
          </span>
        </div>

        <span class="activity-card__open" :class="{ 'activity-card__open--closed': activity.isClosed }">
          {{ actionLabel }}
          <q-icon name="mdi-arrow-right" size="1rem" />
        </span>
      </div>
    </article>
  </SpaLink>
</template>

<script setup lang="ts">
import SpaLink from "src/components/ui-library/SpaLink.vue";
import { computed } from "vue";

import type { ProjectActivity } from "./projectPageTypes";

const props = defineProps<{
  activity: ProjectActivity;
}>();

const activityTypeLabel = computed(() =>
  props.activity.kind === "conversation" ? "Conversation" : "Vote"
);

const activityTypeIcon = computed(() =>
  props.activity.kind === "conversation" ? "mdi-forum-outline" : "mdi-poll"
);

const statusClass = computed(() => ({
  "activity-card__status--closed": props.activity.isClosed,
  "activity-card__status--open": !props.activity.isClosed,
}));

const actionLabel = computed(() => {
  if (props.activity.isClosed) {
    return "View";
  }

  return props.activity.kind === "conversation" ? "Join" : "Vote";
});

const numberFormatter = new Intl.NumberFormat();

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}
</script>

<style scoped lang="scss">
.project-activity-card {
  display: block;
}

article {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.25rem;
  border: 1.5px solid rgba($primary, 0.22);
  border-radius: 20px;
  background: white;
  box-shadow: 0 0.2rem 1rem rgba(10, 7, 20, 0.04);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  @media (hover: hover) {
    &:hover {
      border-color: rgba($primary, 0.38);
      box-shadow: 0 0.8rem 2rem rgba(10, 7, 20, 0.08);
      transform: translateY(-1px);
    }
  }
}

.activity-card__topline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
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

h3 {
  margin: 0;
  color: $ink-darker;
  font-size: clamp(1.12rem, 2vw, 1.35rem);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.activity-card__body {
  display: -webkit-box;
  min-height: 3.9em;
  margin: 0;
  overflow: hidden;
  color: $ink-light;
  font-size: 0.95rem;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
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

.activity-card__open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-width: 7.5rem;
  min-height: 2.8rem;
  padding: 0.7rem 1rem;
  border-radius: 0.9rem;
  background: $gradient-hero;
  color: white;
  font-size: 0.9rem;
  font-weight: var(--font-weight-bold);
  box-shadow: 0 0.45rem 1.15rem rgba($primary, 0.25);
}

.activity-card__open--closed {
  background: $app-background-color;
  color: $ink-light;
  box-shadow: none;
}

@media (min-width: 920px) {
  .activity-card__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .activity-card__open {
    width: 100%;
  }
}
</style>
