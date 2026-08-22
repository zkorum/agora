<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar :title="t('pageTitle')" fallback-route="/" />
  </Teleport>

  <main class="email-update-action-page">
    <div v-if="state.kind === 'loading'" class="action-state" role="status">
      <div>
        <PageLoadingSpinner />
        <span class="visually-hidden">{{ t("loading") }}</span>
      </div>
    </div>

    <div v-else-if="state.kind === 'unavailable'" class="action-state">
      <section class="action-card">
        <h1>{{ t("unavailableTitle") }}</h1>
        <p class="action-description">{{ t("unavailableDescription") }}</p>
        <SpaLink class="action-home-link" to="/">{{ t("returnHome") }}</SpaLink>
      </section>
    </div>

    <section v-else class="action-card">
      <h1>{{ t("title") }}</h1>
      <p class="action-description">{{ t("description") }}</p>

      <ul class="preference-list">
        <li v-for="item in state.items" :key="item.key" class="preference-item">
          <div class="preference-copy">
            <span class="preference-type">{{ t(item.type) }}</span>
            <h2>{{ item.title }}</h2>
            <span
              v-if="successfulKeys.has(item.key)"
              class="preference-success"
              role="status"
            >
              {{ t("optedOut") }}
            </span>
            <span
              v-else-if="errorKey === item.key"
              class="action-error"
              role="alert"
            >
              {{ t("submitFailed") }}
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
              :aria-label="t('optOutTarget', { title: item.title })"
              @click="submitOptOut(item)"
            >
              {{ pendingKey === item.key ? t("optingOut") : t("optOut") }}
            </ZKButton>
          </div>
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup lang="ts">
import { StandardMenuBar } from "src/components/navigation/header/variants";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { usePublicConversationEmailUpdateActionsApi } from "src/utils/api/conversationUpdates/publicConversationEmailUpdateActions";
import { getSingleRouteParam } from "src/utils/router/params";
import { computed, ref, shallowRef, watch } from "vue";
import { useRoute } from "vue-router";

import {
  getManageOptOutItems,
  getPreferencesResolution,
  isManageOptOutDisabled,
  type ManageOptOutItem,
  useEmailUpdateActionPageMetadata,
} from "../actionPage";
import {
  type EmailUpdatePreferencesTranslations,
  emailUpdatePreferencesTranslations,
} from "./[token].i18n";

type PageState =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "ready"; items: readonly ManageOptOutItem[] };

const { t } = useComponentI18n<EmailUpdatePreferencesTranslations>(
  emailUpdatePreferencesTranslations
);
const { isActive } = usePageLayout({
  enableDrawer: false,
  enableFooter: false,
  reducedWidth: true,
  addBottomPadding: true,
});
useEmailUpdateActionPageMetadata(t("pageTitle"));

const route = useRoute();
const token = computed(() =>
  getSingleRouteParam("token" in route.params ? route.params.token : undefined)
);
const actionsApi = usePublicConversationEmailUpdateActionsApi();
const state = shallowRef<PageState>({ kind: "loading" });
const pendingKey = ref<string>();
const errorKey = ref<string>();
const successfulKeys = ref<ReadonlySet<string>>(new Set());

watch(
  token,
  async (nextToken, _previousToken, onCleanup) => {
    let isCurrent = true;
    onCleanup(() => {
      isCurrent = false;
    });
    state.value = { kind: "loading" };
    pendingKey.value = undefined;
    errorKey.value = undefined;
    successfulKeys.value = new Set();

    try {
      const response = await actionsApi.resolve({ token: nextToken });
      if (!isCurrent) return;
      const resolution = getPreferencesResolution(response);
      state.value =
        resolution === undefined
          ? { kind: "unavailable" }
          : { kind: "ready", items: getManageOptOutItems(resolution) };
    } catch {
      if (isCurrent) {
        state.value = { kind: "unavailable" };
      }
    }
  },
  { immediate: true }
);

async function submitOptOut(item: ManageOptOutItem): Promise<void> {
  if (
    state.value.kind !== "ready" ||
    isManageOptOutDisabled({
      itemKey: item.key,
      pendingKey: pendingKey.value,
      successfulKeys: successfulKeys.value,
    })
  ) {
    return;
  }
  pendingKey.value = item.key;
  errorKey.value = undefined;

  try {
    const response = await actionsApi.optOut({
      token: token.value,
      target: item.target,
    });
    if (!response.success) {
      state.value = { kind: "unavailable" };
      return;
    }
    successfulKeys.value = new Set([...successfulKeys.value, item.key]);
  } catch {
    errorKey.value = item.key;
  } finally {
    pendingKey.value = undefined;
  }
}
</script>

<style scoped lang="scss">
@use "../actionPageStyles";

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

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (min-width: $breakpoint-sm-min) {
  .preference-item {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }
}
</style>
