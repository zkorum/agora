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

    <ConversationUpdateAuthFreePreferenceManager
      v-else
      :items="state.items"
      :pending-key="pendingKey"
      :error-key="errorKey"
      :successful-keys="successfulKeys"
      :translate="t"
      @opt-out="submitOptOut"
    />
  </main>
</template>

<script setup lang="ts">
import {
  isManageOptOutDisabled,
  type ManageOptOutItem,
} from "src/components/conversationUpdates/authFreePreferenceManager";
import ConversationUpdateAuthFreePreferenceManager from "src/components/conversationUpdates/ConversationUpdateAuthFreePreferenceManager.vue";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { usePublicConversationEmailUpdateActionsApi } from "src/utils/api/conversationUpdates/publicConversationEmailUpdateActions";
import { getSingleRouteParam } from "src/utils/router/params";
import { computed, ref, shallowRef, watch } from "vue";
import { useRoute } from "vue-router";

import {
  getManageOptOutItems,
  getPreferencesResolution,
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
</style>
