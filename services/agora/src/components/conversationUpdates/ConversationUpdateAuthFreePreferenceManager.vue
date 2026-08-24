<template>
  <section class="action-card">
    <h1>{{ translate("title") }}</h1>
    <p class="action-description">{{ translate("description") }}</p>

    <ul class="preference-list">
      <li v-for="item in items" :key="item.key" class="preference-item">
        <div class="preference-copy">
          <span class="preference-type">{{ translate(item.type) }}</span>
          <h2>{{ item.title }}</h2>
          <span
            v-if="successfulKeys.has(item.key)"
            class="preference-success"
            role="status"
          >
            {{ translate("optedOut") }}
          </span>
          <span
            v-else-if="errorKey === item.key"
            class="action-error"
            role="alert"
          >
            {{ translate("submitFailed") }}
          </span>
        </div>
        <div class="preference-action">
          <ZKButton
            button-type="standardButton"
            outline
            color="primary"
            :disable="
              isManageOptOutDisabled({
                itemKey: item.key,
                pendingKey,
                successfulKeys,
              })
            "
            :loading="pendingKey === item.key"
            :aria-label="translate('optOutTarget', { title: item.title })"
            @click="emit('optOut', item)"
          >
            {{
              pendingKey === item.key
                ? translate("optingOut")
                : translate("optOut")
            }}
          </ZKButton>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";

import {
  isManageOptOutDisabled,
  type ManageOptOutItem,
} from "./authFreePreferenceManager";

type TranslationKey =
  | "conversation"
  | "description"
  | "optedOut"
  | "optOut"
  | "optOutTarget"
  | "optingOut"
  | "project"
  | "submitFailed"
  | "title";

defineProps<{
  items: readonly ManageOptOutItem[];
  pendingKey: string | undefined;
  errorKey: string | undefined;
  successfulKeys: ReadonlySet<string>;
  translate: (
    key: TranslationKey,
    params?: Readonly<Record<string, string | number>>
  ) => string;
}>();
const emit = defineEmits<{
  optOut: [item: ManageOptOutItem];
}>();
</script>

<style scoped lang="scss">
@use "../../pages/email-updates/actionPageStyles";

.preference-list {
  display: grid;
  gap: 0.8rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.preference-item {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid $grey-4;
  border-radius: 14px;
}

.preference-copy {
  display: grid;
  gap: 0.3rem;
}

.preference-type {
  color: $grey-7;
  font-size: 0.8rem;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.preference-success {
  color: $positive;
  font-weight: var(--font-weight-semibold);
}

.preference-action {
  width: 8rem;
}

@media (min-width: $breakpoint-sm-min) {
  .preference-item {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }
}
</style>
