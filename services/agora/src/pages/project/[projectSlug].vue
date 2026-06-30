<template>
  <PageLoadingSpinner v-if="projectPageQuery.isPending.value && projectPageData === undefined" />

  <ErrorRetryBlock
    v-else-if="projectPageQuery.isError.value && projectPageData === undefined"
    title="Project could not be loaded"
    retry-label="Retry"
    @retry="projectPageQuery.refetch()"
  />

  <ProjectPageView
    v-else-if="projectPageData !== undefined"
    v-model:selected-language="selectedLanguage"
    :project="projectPageData.project"
    :activities="activities"
    :can-load-more-activities="nextActivityCursor !== undefined"
    :is-loading-more-activities="isLoadingMoreActivities"
    :is-requesting-project-translation="isRequestingProjectTranslation"
    :language-options="projectPageData.languageOptions"
    :initial-language="projectPageData.effectiveProjectDisplayLanguage"
    @load-more-activities="loadMoreActivities"
    @request-project-translation="requestProjectTranslation"
  />
</template>

<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import ProjectPageView from "src/components/project/ProjectPageView.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import {
  type SupportedDisplayLanguageCodes,
  ZodSupportedDisplayLanguageCodes,
} from "src/shared/languages";
import type {
  FetchProjectPageResponse,
  ProjectPageActivity,
  ProjectPageActivityCursor,
} from "src/shared/types/dto";
import { useAuthenticationStore } from "src/stores/authentication";
import {
  type ContentTranslationResponse,
  useBackendContentTranslationApi,
} from "src/utils/api/contentTranslation/contentTranslation";
import { useBackendProjectPageApi } from "src/utils/api/projectPage";
import { getSingleRouteParam } from "src/utils/router/params";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

const activityPageSize = 12;

const route = useRoute();
const queryClient = useQueryClient();
const { fetchProjectPage, fetchProjectPageActivities, updateProjectPageDisplayLanguage } =
  useBackendProjectPageApi();
const { requestContentTranslation } = useBackendContentTranslationApi();
const { isAuthInitialized, isGuestOrLoggedIn } = storeToRefs(
  useAuthenticationStore()
);

const projectSlug = computed(() => getSingleRouteParam(route.params.projectSlug));
const selectedLanguage = ref<string | readonly string[]>("");
const persistedSelectedLanguage = ref<SupportedDisplayLanguageCodes | undefined>();
const activities = ref<ProjectPageActivity[]>([]);
const nextActivityCursor = ref<ProjectPageActivityCursor | undefined>();
const isLoadingMoreActivities = ref(false);
const isRequestingProjectTranslation = ref(false);
const isApplyingServerLanguage = ref(false);

const selectedLanguageValue = computed(() => {
  if (Array.isArray(selectedLanguage.value)) {
    return selectedLanguage.value.at(0) ?? "";
  }

  return selectedLanguage.value;
});

const selectedProjectDisplayLanguage = computed(
  (): SupportedDisplayLanguageCodes | undefined => persistedSelectedLanguage.value
);
const projectPageQueryKey = computed(() => [
  "projectPage",
  projectSlug.value,
  selectedProjectDisplayLanguage.value ?? "auto",
  isGuestOrLoggedIn.value,
]);

const projectPageQuery = useQuery({
  queryKey: projectPageQueryKey,
  queryFn: async () =>
    await fetchProjectPage({
      request: {
        projectSlug: projectSlug.value,
        selectedLanguageCode: selectedProjectDisplayLanguage.value,
        activityLimit: activityPageSize,
      },
      authenticated: isGuestOrLoggedIn.value,
    }),
  enabled: computed(() => projectSlug.value !== "" && isAuthInitialized.value),
  retry: false,
});
const projectPageData = computed(() => projectPageQuery.data.value);

watch(
  projectPageData,
  (data) => {
    if (data === undefined) {
      return;
    }
    activities.value = data.activities;
    nextActivityCursor.value = data.nextActivityCursor;
    isApplyingServerLanguage.value = true;
    selectedLanguage.value = data.effectiveProjectDisplayLanguage;
    queueMicrotask(() => {
      isApplyingServerLanguage.value = false;
    });
    persistedSelectedLanguage.value = data.selectedProjectDisplayLanguage;
  },
  { immediate: true },
);

watch(selectedLanguageValue, async (languageCode, previousLanguageCode) => {
  if (
    isApplyingServerLanguage.value ||
    languageCode === "" ||
    previousLanguageCode === undefined ||
    languageCode === previousLanguageCode ||
    projectPageData.value === undefined
  ) {
    return;
  }

  const selectedDisplayLanguage =
    ZodSupportedDisplayLanguageCodes.safeParse(languageCode);
  if (!selectedDisplayLanguage.success) {
    return;
  }

  if (isGuestOrLoggedIn.value) {
    const result = await updateProjectPageDisplayLanguage({
      projectSlug: projectSlug.value,
      languageCode: selectedDisplayLanguage.data,
    });
    persistedSelectedLanguage.value = result.selectedProjectDisplayLanguage;
    isApplyingServerLanguage.value = true;
    selectedLanguage.value = result.effectiveProjectDisplayLanguage;
    queueMicrotask(() => {
      isApplyingServerLanguage.value = false;
    });
    return;
  }

  persistedSelectedLanguage.value = selectedDisplayLanguage.data;
});

async function loadMoreActivities(done: () => void): Promise<void> {
  const cursor = nextActivityCursor.value;
  const data = projectPageData.value;
  if (cursor === undefined || data === undefined || isLoadingMoreActivities.value) {
    done();
    return;
  }

  isLoadingMoreActivities.value = true;
  try {
    const response = await fetchProjectPageActivities({
      request: {
        projectSlug: projectSlug.value,
        displayLanguageCode: data.effectiveProjectDisplayLanguage,
        activityLimit: activityPageSize,
        activityCursor: cursor,
      },
      authenticated: isGuestOrLoggedIn.value,
    });
    activities.value = [...activities.value, ...response.activities];
    nextActivityCursor.value = response.nextActivityCursor;
  } finally {
    isLoadingMoreActivities.value = false;
    done();
  }
}

async function requestProjectTranslation(
  targetLanguageCode: SupportedDisplayLanguageCodes
): Promise<void> {
  if (isRequestingProjectTranslation.value) {
    return;
  }

  isRequestingProjectTranslation.value = true;
  try {
    const response = await requestContentTranslation({
      subject: { kind: "project", projectSlug: projectSlug.value },
      targetLanguageCode,
      requestMode: "queue_if_missing",
    });
    if (
      !isProjectContentTranslationResponse(response) ||
      response.content.kind !== "translatable"
    ) {
      return;
    }

    const translation = response.content.translation;
    const translatedContent = response.content.variants.translated;

    queryClient.setQueryData<FetchProjectPageResponse>(
      projectPageQueryKey.value,
      (previousData) => {
        if (previousData === undefined) {
          return previousData;
        }

        if (
          translation.status === "completed" &&
          translatedContent !== undefined
        ) {
          return {
            ...previousData,
            project: {
              ...previousData.project,
              title: translatedContent.title,
              subtitle: translatedContent.subtitle,
              bodyHtml: translatedContent.bodyHtml,
              machineTranslation: {
                targetLanguageCode,
                sourceLanguageCode: translation.sourceLanguageCode,
                sourceLanguageLabel: translation.sourceLanguageLabel,
                status: "completed",
                translatedContent,
              },
            },
          };
        }

        return {
          ...previousData,
          project: {
            ...previousData.project,
            machineTranslation: {
              targetLanguageCode,
              sourceLanguageCode: translation.sourceLanguageCode,
              sourceLanguageLabel: translation.sourceLanguageLabel,
              status: translation.status,
            },
          },
        };
      }
    );
  } finally {
    isRequestingProjectTranslation.value = false;
  }
}

type ProjectContentTranslationResponse = Extract<
  ContentTranslationResponse,
  { success: true; subject: { kind: "project" } }
>;

function isProjectContentTranslationResponse(
  response: ContentTranslationResponse
): response is ProjectContentTranslationResponse {
  return response.success && response.subject.kind === "project";
}
</script>
