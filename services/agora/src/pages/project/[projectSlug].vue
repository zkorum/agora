<template>
  <router-view v-if="!isProjectRootRoute" />

  <PageLoadingSpinner
    v-else-if="projectPageQuery.isPending.value && projectPageData === undefined"
  />

  <ErrorRetryBlock
    v-else-if="projectPageQuery.isError.value && projectPageData === undefined"
    :title="t('loadErrorTitle')"
    :retry-label="t('retryAction')"
    @retry="projectPageQuery.refetch()"
  />

  <ProjectPageView
    v-else-if="projectPageData !== undefined"
    v-model:selected-language="selectedLanguage"
    :project="projectPageData.project"
    :activities="activities"
    :can-load-more-activities="nextActivityCursor !== undefined"
    :is-loading-more-activities="isLoadingMoreActivities"
    :language-options="projectPageData.languageOptions"
    @load-more-activities="loadMoreActivities"
  />
</template>

<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import {
  type ProjectPageTranslations,
  translateProjectPageText,
} from "src/components/project/projectPageI18n";
import ProjectPageView from "src/components/project/ProjectPageView.vue";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import {
  type SupportedDisplayLanguageCodes,
} from "src/shared/languages";
import type { ProjectPageActivity, ProjectPageActivityCursor } from "src/shared/types/dto";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLanguageStore } from "src/stores/language";
import { useBackendProjectPageApi } from "src/utils/api/projectPage";
import { getSingleRouteParam } from "src/utils/router/params";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

const activityPageSize = 12;

const route = useRoute();
const { fetchProjectPage, fetchProjectPageActivities } =
  useBackendProjectPageApi();
const { isAuthInitialized, isGuestOrLoggedIn } = storeToRefs(
  useAuthenticationStore()
);
const languageStore = useLanguageStore();
const { displayLanguage } = storeToRefs(languageStore);
const { changeDisplayLanguage } = languageStore;

const projectSlug = computed(() =>
  getSingleRouteParam(route.params.projectSlug)
);
const isProjectRootRoute = computed(() => route.name === "/project/[projectSlug]");
const activities = ref<ProjectPageActivity[]>([]);
const nextActivityCursor = ref<ProjectPageActivityCursor | undefined>();
const isLoadingMoreActivities = ref(false);
const selectedLanguage = computed<SupportedDisplayLanguageCodes>({
  get: () => displayLanguage.value,
  set: (newLanguage) => {
    if (newLanguage === displayLanguage.value) {
      return;
    }
    void changeDisplayLanguage({ newLanguage });
  },
});

const projectPageQueryKey = computed(() => [
  "projectPage",
  projectSlug.value,
  displayLanguage.value,
  isGuestOrLoggedIn.value,
]);

const projectPageQuery = useQuery({
  queryKey: projectPageQueryKey,
  queryFn: async () =>
    await fetchProjectPage({
      request: {
        projectSlug: projectSlug.value,
        activityLimit: activityPageSize,
      },
      authenticated: isGuestOrLoggedIn.value,
    }),
  enabled: computed(
    () =>
      isProjectRootRoute.value &&
      projectSlug.value !== "" &&
      isAuthInitialized.value
  ),
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
  },
  { immediate: true }
);

async function loadMoreActivities(done: () => void): Promise<void> {
  const cursor = nextActivityCursor.value;
  const data = projectPageData.value;
  if (
    cursor === undefined ||
    data === undefined ||
    isLoadingMoreActivities.value
  ) {
    done();
    return;
  }

  isLoadingMoreActivities.value = true;
  try {
    const response = await fetchProjectPageActivities({
      request: {
        projectSlug: projectSlug.value,
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

function t(key: keyof ProjectPageTranslations): string {
  return translateProjectPageText({
    languageCode: displayLanguage.value,
    key,
  });
}
</script>
