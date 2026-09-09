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
        <template v-if="state.availableAction !== undefined">
          <p class="action-description">{{ unsubscribePrompt }}</p>
          <ul
            v-if="state.availableAction.scope.kind === 'no_project'"
            class="unsubscribe-conversations"
          >
            <li
              v-for="conversation in state.availableAction.scope.conversations"
              :key="conversation.conversationSlugId"
            >
              {{ conversation.title }}
            </li>
          </ul>
          <p v-if="unsubscribeFailed" class="action-error" role="alert">
            {{ t("unsubscribeFailed") }}
          </p>
          <div class="action-button-row">
            <ZKButton
              button-type="largeButton"
              color="negative"
              :disable="isSubmitting"
              :loading="isSubmitting"
              @click="confirmUnsubscribe"
            >
              {{ t("unsubscribe") }}
            </ZKButton>
            <ZKButton
              button-type="largeButton"
              color="secondary"
              :disable="isSubmitting"
              @click="dismissUnsubscribe"
            >
              {{ t("noThanks") }}
            </ZKButton>
          </div>
        </template>
        <p v-if="unsubscribed" class="action-description">
          {{ t("unsubscribed") }}
        </p>
        <SpaLink class="action-home-link" to="/">{{ t("returnHome") }}</SpaLink>
      </section>
    </div>

    <form v-else class="action-card" @submit.prevent="submitReport">
      <h1>{{ t("title") }}</h1>
      <p class="action-description">
        {{ t("description", { subject: state.resolution.subject }) }}
      </p>

      <fieldset class="reason-list">
        <legend class="visually-hidden">{{ t("title") }}</legend>
        <q-radio
          v-for="reason in reportReasons"
          :key="reason"
          v-model="selectedReason"
          :val="reason"
          :label="reasonLabel(reason)"
          color="primary"
        />
      </fieldset>

      <q-input
        :model-value="details"
        outlined
        autogrow
        type="textarea"
        :label="t('details')"
        :hint="t('detailsHint')"
        :maxlength="2000"
        counter
        @update:model-value="updateDetails"
      />

      <p v-if="submitFailed" class="action-error" role="alert">
        {{ t("submitFailed") }}
      </p>
      <div class="action-button-row">
        <ZKButton
          type="submit"
          button-type="largeButton"
          color="primary"
          :disable="selectedReason === undefined || isSubmitting"
          :loading="isSubmitting"
        >
          {{ isSubmitting ? t("submitting") : t("submit") }}
        </ZKButton>
      </div>
    </form>
  </main>
</template>

<script setup lang="ts">
import { StandardMenuBar } from "src/components/navigation/header/variants";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ConversationEmailUpdateActionReportResponse } from "src/shared/types/dto";
import { usePublicConversationEmailUpdateActionsApi } from "src/utils/api/conversationUpdates/publicConversationEmailUpdateActions";
import { getSingleRouteParam } from "src/utils/router/params";
import { computed, ref, shallowRef, watch } from "vue";
import { useRoute } from "vue-router";

import {
  getReportResolution,
  optionalReportDetails,
  type ReportReason,
  reportReasons,
  type ReportResolution,
  useEmailUpdateActionPageMetadata,
} from "../actionPage";
import {
  type EmailUpdateReportTranslations,
  emailUpdateReportTranslations,
} from "./[token].i18n";

type PageState =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "ready"; resolution: ReportResolution }
  | {
      kind: "success";
      availableAction: Extract<
        ConversationEmailUpdateActionReportResponse,
        { success: true }
      >["availableAction"];
    };

const { t } = useComponentI18n<EmailUpdateReportTranslations>(
  emailUpdateReportTranslations
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
const selectedReason = ref<ReportReason>();
const details = ref("");
const isSubmitting = ref(false);
const submitFailed = ref(false);
const unsubscribeFailed = ref(false);
const unsubscribed = ref(false);
const unsubscribePrompt = computed(() => {
  if (state.value.kind !== "success") return "";
  const scope = state.value.availableAction?.scope;
  if (scope === undefined) return "";
  return scope.kind === "project"
    ? t("unsubscribeProject", { title: scope.title })
    : t(
        scope.conversations.length === 1
          ? "unsubscribeConversation"
          : "unsubscribeConversations"
      );
});

watch(
  token,
  async (nextToken, _previousToken, onCleanup) => {
    let isCurrent = true;
    onCleanup(() => {
      isCurrent = false;
    });
    state.value = { kind: "loading" };
    selectedReason.value = undefined;
    details.value = "";
    submitFailed.value = false;
    unsubscribeFailed.value = false;
    unsubscribed.value = false;

    try {
      const response = await actionsApi.resolve({ token: nextToken });
      if (!isCurrent) return;
      const resolution = getReportResolution(response);
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

function reasonLabel(reason: ReportReason): string {
  if (reason === "unrelated_content") return t("unrelatedContent");
  return t(reason);
}

function updateDetails(value: string | number | null): void {
  details.value = typeof value === "string" ? value : String(value ?? "");
}

async function submitReport(): Promise<void> {
  const reason = selectedReason.value;
  if (
    state.value.kind !== "ready" ||
    reason === undefined ||
    isSubmitting.value
  ) {
    return;
  }

  isSubmitting.value = true;
  submitFailed.value = false;
  const parsedDetails = optionalReportDetails(details.value);
  const requestToken = token.value;

  try {
    const response = await actionsApi.report(
      parsedDetails === undefined
        ? { token: requestToken, reason }
        : { token: requestToken, reason, details: parsedDetails }
    );
    if (token.value !== requestToken) return;
    state.value = response.success
      ? { kind: "success", availableAction: response.availableAction }
      : { kind: "unavailable" };
  } catch {
    if (token.value === requestToken) submitFailed.value = true;
  } finally {
    isSubmitting.value = false;
  }
}

function dismissUnsubscribe(): void {
  if (state.value.kind !== "success" || isSubmitting.value) return;
  state.value = { kind: "success", availableAction: undefined };
}

async function confirmUnsubscribe(): Promise<void> {
  if (state.value.kind !== "success" || isSubmitting.value) return;
  const action = state.value.availableAction;
  if (action === undefined) return;
  const requestToken = token.value;
  isSubmitting.value = true;
  unsubscribeFailed.value = false;
  try {
    const response = await actionsApi.unsubscribe({ token: action.token });
    if (token.value !== requestToken) return;
    if (response.success) {
      state.value = { kind: "success", availableAction: undefined };
      unsubscribed.value = true;
    } else {
      unsubscribeFailed.value = true;
    }
  } catch {
    if (token.value === requestToken) unsubscribeFailed.value = true;
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped lang="scss">
@use "../actionPageStyles";

.action-state .action-button-row {
  display: grid;
  gap: 0.75rem;
  justify-self: center;
}

.action-description,
.unsubscribe-conversations {
  overflow-wrap: anywhere;
}

.unsubscribe-conversations {
  margin: 0;
  padding-inline-start: 1.25rem;
  text-align: start;
}

.reason-list {
  display: grid;
  gap: 0.25rem;
  padding: 0;
  margin: 0;
  border: 0;
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
</style>
