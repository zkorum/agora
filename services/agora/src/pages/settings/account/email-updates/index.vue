<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar
      :title="t('pageTitle')"
      :center-content="true"
      fallback-route="/settings/"
    />
  </Teleport>

  <ConversationUpdatePreferenceSettings
    :initial-focus="initialFocus"
    :initial-search="initialSearch"
  />
</template>

<script setup lang="ts">
import ConversationUpdatePreferenceSettings from "src/components/conversationUpdates/ConversationUpdatePreferenceSettings.vue";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type ConversationEmailUpdatePreferenceFocus,
  Dto,
} from "src/shared/types/dto";
import { computed } from "vue";
import { useRoute } from "vue-router";

import {
  type EmailUpdatesSettingsPageTranslations,
  emailUpdatesSettingsPageTranslations,
} from "./emailUpdatesSettingsPage.i18n";

const { t } = useComponentI18n<EmailUpdatesSettingsPageTranslations>(
  emailUpdatesSettingsPageTranslations
);
const route = useRoute();
type PreferenceRouteState =
  | { mode: "browse"; search: string | undefined }
  | { mode: "focus"; focus: ConversationEmailUpdatePreferenceFocus };

const preferenceRouteState = computed<PreferenceRouteState>(() => {
    const conversationSlugId = route.query.conversationSlugId;
    const projectSlug = route.query.projectSlug;
    const focus =
      typeof conversationSlugId === "string"
        ? { kind: "conversation", conversationSlugId }
        : typeof projectSlug === "string"
          ? { kind: "project", projectSlug }
          : undefined;
    if (focus !== undefined) {
      const focusRequest =
        Dto.conversationEmailUpdatePreferencesRequest.safeParse({
          mode: "focus",
          focus,
        });
      if (focusRequest.success && focusRequest.data.mode === "focus") {
        return { mode: "focus", focus: focusRequest.data.focus };
      }
    }
    const search = route.query.search;
    const browseRequest =
      Dto.conversationEmailUpdatePreferencesRequest.safeParse({
        mode: "browse",
        search: typeof search === "string" ? search : undefined,
      });
    return {
      mode: "browse",
      search:
        browseRequest.success && browseRequest.data.mode === "browse"
          ? browseRequest.data.search
          : undefined,
    };
});
const initialSearch = computed(() =>
  preferenceRouteState.value.mode === "browse"
    ? preferenceRouteState.value.search
    : undefined
);
const initialFocus = computed<ConversationEmailUpdatePreferenceFocus | undefined>(
  () => {
    return preferenceRouteState.value.mode === "focus"
      ? preferenceRouteState.value.focus
      : undefined;
  }
);

const { isActive } = usePageLayout({
  enableFooter: false,
  reducedWidth: false,
  addBottomPadding: true,
});
</script>
