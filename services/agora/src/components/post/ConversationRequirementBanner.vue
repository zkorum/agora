<template>
  <q-banner v-if="shouldShowBanner" rounded inline-actions class="survey-banner" :class="bannerClass">
    <template #avatar>
      <q-icon :name="bannerIcon" size="sm" />
    </template>

    <div class="survey-banner__content">
      <div class="survey-banner__title">{{ bannerTitle }}</div>
      <div class="survey-banner__message">{{ bannerMessage }}</div>
    </div>

    <template #action>
      <q-btn
        v-if="showActionButton"
        flat
        no-caps
        :color="buttonColor"
        :label="buttonLabel"
        :loading="isNavigating"
        @click="handleOpenSurvey"
      />
    </template>
  </q-banner>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useParticipationGate } from "src/composables/conversation/useParticipationGate";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  EventSlug,
  ParticipationMode,
  SurveyGateSummary,
} from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import {
  useSurveyFormQuery,
  useSurveyStatusQuery,
} from "src/utils/api/survey/useSurveyQueries";
import { computed, ref } from "vue";

import {
  type ConversationRequirementBannerTranslations,
  conversationRequirementBannerTranslations,
} from "./ConversationRequirementBanner.i18n";
import { resolveRequirementBannerCopy } from "./conversationRequirementBannerLogic";

const props = defineProps<{
  conversationSlugId: string;
  participationMode: ParticipationMode;
  requiresEventTicket?: EventSlug;
  surveyGate: SurveyGateSummary;
}>();

const { t } = useComponentI18n<ConversationRequirementBannerTranslations>(
  conversationRequirementBannerTranslations
);
const { isAuthInitialized } = storeToRefs(useAuthenticationStore());

const {
  needsAuth,
  needsTicket,
  openParticipationOnboarding,
} = useParticipationGate({
  conversationSlugId: computed(() => props.conversationSlugId),
  participationMode: computed(() => props.participationMode),
  requiresEventTicket: computed(() => props.requiresEventTicket),
  surveyGate: computed(() => props.surveyGate),
});

const isNavigating = ref(false);

const hasSurvey = computed(() => props.surveyGate.hasSurvey);

useSurveyStatusQuery({
  conversationSlugId: computed(() => props.conversationSlugId),
  enabled: computed(() => isAuthInitialized.value && hasSurvey.value),
});

useSurveyFormQuery({
  conversationSlugId: computed(() => props.conversationSlugId),
  enabled: computed(() => isAuthInitialized.value && hasSurvey.value),
});

const shouldShowBanner = computed(() => {
  return hasSurvey.value || props.requiresEventTicket !== undefined;
});

const showActionButton = computed(() => {
  if (hasSurvey.value) {
    return true;
  }

  return needsAuth.value || needsTicket.value;
});

const bannerClass = computed(() => {
  if (!hasSurvey.value) {
    return needsTicket.value || needsAuth.value
      ? "survey-banner--required"
      : "survey-banner--complete";
  }

  if (needsAuth.value || needsTicket.value) {
    return "survey-banner--required";
  }

  const status = props.surveyGate.status;
  if (status === "complete_valid") {
    return "survey-banner--complete";
  }

  if (status === "in_progress" || status === "not_started") {
    return props.surveyGate.canParticipate
      ? "survey-banner--progress"
      : "survey-banner--required";
  }

  return "survey-banner--required";
});

const bannerIcon = computed(() => {
  if (!hasSurvey.value) {
    return needsTicket.value || needsAuth.value
      ? "verified_user"
      : "check_circle";
  }

  if (needsAuth.value || needsTicket.value) {
    return "verified_user";
  }

  switch (props.surveyGate.status) {
    case "complete_valid":
      return "check_circle";
    case "needs_update":
      return "edit";
    case "in_progress":
      return "assignment";
    case "not_started":
      return "quiz";
    case "no_survey":
      return "info";
  }

  return "info";
});

const buttonColor = computed<"warning" | "primary" | "positive">(() => {
  if (bannerClass.value === "survey-banner--complete") {
    return "positive";
  }

  if (bannerClass.value === "survey-banner--required") {
    return "warning";
  }

  return "primary";
});

const bannerCopy = computed(() => {
  return resolveRequirementBannerCopy({
    hasSurvey: hasSurvey.value,
    needsAuth: needsAuth.value,
    needsTicket: needsTicket.value,
    surveyGateStatus: props.surveyGate.status,
    canParticipate: props.surveyGate.canParticipate,
  });
});

const bannerTitle = computed(() => {
  return t(bannerCopy.value.titleKey);
});

const bannerMessage = computed(() => {
  return t(bannerCopy.value.messageKey);
});

const buttonLabel = computed(() => {
  return t(bannerCopy.value.buttonKey);
});

async function handleOpenSurvey(): Promise<void> {
  isNavigating.value = true;

  try {
    await openParticipationOnboarding();
  } finally {
    isNavigating.value = false;
  }
}
</script>

<style scoped lang="scss">
@use "sass:color";

.survey-banner {
  margin-top: 0.5rem;
  border-radius: 12px;
  border: 1px solid transparent;

  &.survey-banner--required {
    background-color: rgba($warning, 0.12);
    border-color: rgba($warning, 0.24);
    color: color.adjust($warning, $lightness: -28%);
  }

  &.survey-banner--progress {
    background-color: rgba($primary, 0.08);
    border-color: rgba($primary, 0.18);
    color: $primary;
  }

  &.survey-banner--complete {
    background-color: rgba($positive, 0.08);
    border-color: rgba($positive, 0.22);
    color: color.adjust($positive, $lightness: -12%);
  }
}

.survey-banner__content {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.survey-banner__title {
  font-weight: 600;
}

.survey-banner__message {
  font-size: 0.875rem;
  line-height: 1.35;
}
</style>
