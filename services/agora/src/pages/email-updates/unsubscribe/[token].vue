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

    <div v-else-if="state.kind === 'success'" class="action-state">
      <section class="action-card" aria-live="polite">
        <h1>{{ t("successTitle") }}</h1>
        <p class="action-description">{{ t("successDescription") }}</p>
        <SpaLink class="action-home-link" to="/">{{ t("returnHome") }}</SpaLink>
      </section>
    </div>

    <section v-else class="action-card">
      <h1>{{ t("title") }}</h1>
      <p class="action-description">{{ unsubscribeDescription }}</p>
      <p v-if="submitFailed" class="action-error" role="alert">
        {{ t("submitFailed") }}
      </p>
      <div class="action-button-row">
        <ZKButton
          button-type="largeButton"
          color="negative"
          :disable="isSubmitting"
          :loading="isSubmitting"
          @click="confirmUnsubscribe"
        >
          {{ isSubmitting ? t("submitting") : t("confirm") }}
        </ZKButton>
      </div>
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
  getUnsubscribeResolution,
  type UnsubscribeResolution,
  useEmailUpdateActionPageMetadata,
} from "../actionPage";
import {
  type EmailUpdateUnsubscribeTranslations,
  emailUpdateUnsubscribeTranslations,
} from "./[token].i18n";

type PageState =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "ready"; resolution: UnsubscribeResolution }
  | { kind: "success" };

const { t } = useComponentI18n<EmailUpdateUnsubscribeTranslations>(
  emailUpdateUnsubscribeTranslations
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
const isSubmitting = ref(false);
const submitFailed = ref(false);

const unsubscribeDescription = computed(() => {
  if (state.value.kind !== "ready") {
    return "";
  }
  const resolution = state.value.resolution;
  if (resolution.scope.kind === "project") {
    return t("projectDescription", { title: resolution.scope.title });
  }
  const conversation = resolution.scope.conversations.at(0);
  return resolution.scope.conversations.length === 1 && conversation !== undefined
    ? t("conversationDescription", { title: conversation.title })
    : t("conversationsDescription");
});

watch(
  token,
  async (nextToken, _previousToken, onCleanup) => {
    let isCurrent = true;
    onCleanup(() => {
      isCurrent = false;
    });
    state.value = { kind: "loading" };
    submitFailed.value = false;

    try {
      const response = await actionsApi.resolve({ token: nextToken });
      if (!isCurrent) return;
      const resolution = getUnsubscribeResolution(response);
      state.value =
        resolution === undefined
          ? { kind: "unavailable" }
          : { kind: "ready", resolution };
    } catch {
      if (isCurrent) {
        state.value = { kind: "unavailable" };
      }
    }
  },
  { immediate: true }
);

async function confirmUnsubscribe(): Promise<void> {
  if (state.value.kind !== "ready" || isSubmitting.value) return;
  isSubmitting.value = true;
  submitFailed.value = false;

  try {
    const response = await actionsApi.unsubscribe({ token: token.value });
    state.value = response.success
      ? { kind: "success" }
      : { kind: "unavailable" };
  } catch {
    submitFailed.value = true;
  } finally {
    isSubmitting.value = false;
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
