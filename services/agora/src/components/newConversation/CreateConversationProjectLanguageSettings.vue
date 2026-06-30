<template>
  <div class="project-language-settings">
    <q-select
      v-if="actualProjects.length > 0"
      v-model="projectSelectValue"
      outlined
      emit-value
      map-options
      :label="tProject('projectLabel')"
      :options="projectOptions"
    />

    <ConversationLanguageSettingsRow
      :title="tLanguage('languagesTitle')"
      :value="languageControlSummary"
      :description="languageControlDescription"
      :icon="forwardIcon"
      :disabled="false"
      :clickable="true"
      @click="openProjectLanguageSettings"
    />
  </div>

  <q-dialog v-model="showProjectLanguageDialog" position="bottom">
    <ZKBottomDialogContainer
      :title="tLanguage('languagesTitle')"
      :subtitle="tProject('projectLanguagesDescription')"
    >
      <div class="language-settings-list">
        <ConversationLanguageSettingsRow
          v-if="selectedProject !== undefined"
          :title="tProject('inheritProjectLanguagesTitle')"
          :value="selectedProject.title"
          :description="tProject('inheritProjectLanguagesDescription')"
          :icon="undefined"
          :disabled="false"
          :clickable="false"
        >
          <template #actions>
            <q-toggle v-model="inheritProjectLanguages" />
          </template>
        </ConversationLanguageSettingsRow>

        <template v-if="selectedProject !== undefined && inheritProjectLanguages">
          <ConversationLanguageSettingsRow
            :title="tLanguage('languagesTitle')"
            :value="projectLanguageSummary"
            :description="tProject('inheritedProjectLanguagesDescription')"
            :icon="forwardIcon"
            :disabled="false"
            :clickable="true"
            @click="startLanguageOverride"
          />
          <ConversationLanguageSettingsRow
            :title="tLanguage('dynamicTranslationTitle')"
            :value="projectDynamicTranslationSummary"
            :description="tLanguage('dynamicTranslationDescription')"
            :icon="undefined"
            :disabled="false"
            :clickable="false"
          >
            <template #actions>
              <q-toggle
                :model-value="selectedProject.multilingualSetting.dynamicTranslationEnabled"
                @update:model-value="startDynamicTranslationOverride"
              />
            </template>
          </ConversationLanguageSettingsRow>
        </template>

        <template v-else>
          <ConversationLanguageSettingsRow
            :title="tLanguage('languagesTitle')"
            :value="overrideLanguageSummary"
            :description="tProject('customLanguagesDescription')"
            :icon="forwardIcon"
            :disabled="false"
            :clickable="true"
            @click="openOverrideLanguagePicker({ returnToProjectDialog: true })"
          />
          <ConversationLanguageSettingsRow
            :title="tLanguage('dynamicTranslationTitle')"
            :value="undefined"
            :description="tLanguage('dynamicTranslationDescription')"
            :icon="undefined"
            :disabled="false"
            :clickable="false"
          >
            <template #actions>
              <q-toggle v-model="overrideMultilingualSetting.dynamicTranslationEnabled" />
            </template>
          </ConversationLanguageSettingsRow>
        </template>
      </div>
    </ZKBottomDialogContainer>
  </q-dialog>

  <ConversationAdditionalLanguagesDialog
    v-model:show-dialog="showOverrideLanguagePicker"
    v-model:multilingual-setting="languagePickerMultilingualSetting"
    :can-edit-languages="true"
    :show-auto-language="true"
    :auto-language-caption="tLanguage('detectedLanguageAfterPublishing')"
    :detected-language-code="undefined"
    @back="goBackFromOverrideLanguagePicker"
  />
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import {
  type CreateConversationProjectLanguageSettingsTranslations,
  createConversationProjectLanguageSettingsTranslations,
} from "src/components/newConversation/CreateConversationProjectLanguageSettings.i18n";
import ConversationAdditionalLanguagesDialog from "src/components/newConversation/dialog/ConversationAdditionalLanguagesDialog.vue";
import {
  type ConversationLanguageSettingDialogTranslations,
  conversationLanguageSettingDialogTranslations,
} from "src/components/newConversation/dialog/ConversationLanguageSettingDialog.i18n";
import { getLanguageLabel as getLocalizedLanguageLabel } from "src/components/newConversation/dialog/conversationLanguageSettings.utils";
import ConversationLanguageSettingsRow from "src/components/newConversation/dialog/ConversationLanguageSettingsRow.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { type SupportedDisplayLanguageCodes } from "src/shared/languages";
import type {
  ConversationLanguageSettingInput,
  ConversationMultilingualSetting,
} from "src/shared/types/zod";
import { computed, ref, watch } from "vue";

export interface CreateConversationProjectLanguageProject {
  slug: string;
  title: string;
  directoryVisible: boolean;
  deletedAt: string | null;
  defaultLanguageCode: SupportedDisplayLanguageCodes;
  multilingualSetting: ConversationMultilingualSetting;
}

interface ProjectOption {
  label: string;
  value: string;
}

const props = defineProps<{
  projectList: CreateConversationProjectLanguageProject[];
}>();

const selectedProjectSlug = defineModel<string | undefined>(
  "selectedProjectSlug",
  { required: true }
);
const inheritProjectLanguages = defineModel<boolean>("inheritProjectLanguages", {
  required: true,
});
const overrideLanguageSetting = defineModel<ConversationLanguageSettingInput>(
  "overrideLanguageSetting",
  { required: true }
);
const overrideMultilingualSetting =
  defineModel<ConversationMultilingualSetting>("overrideMultilingualSetting", {
    required: true,
  });

const noProjectValue = "__no_project__";
const $q = useQuasar();
const { t: tLanguage, locale } =
  useComponentI18n<ConversationLanguageSettingDialogTranslations>(
    conversationLanguageSettingDialogTranslations
  );
const { t: tProject } =
  useComponentI18n<CreateConversationProjectLanguageSettingsTranslations>(
    createConversationProjectLanguageSettingsTranslations
  );
const showProjectLanguageDialog = ref(false);
const showOverrideLanguagePicker = ref(false);
const returnToProjectLanguageDialog = ref(false);
const hasInitializedProjectSelection = ref(false);
const isEditingInheritedProjectLanguages = ref(false);
const inheritedLanguagePickerSetting = ref<ConversationMultilingualSetting>({
  additionalLanguageCodes: [],
  dynamicTranslationEnabled: false,
});

const actualProjects = computed(() =>
  props.projectList.filter(
    (project) => project.directoryVisible && project.deletedAt === null
  )
);

const projectOptions = computed<ProjectOption[]>(() => [
  { label: tProject("noProjectLabel"), value: noProjectValue },
  ...actualProjects.value.map((project) => ({
    label: project.title,
    value: project.slug,
  })),
]);

const selectedProject = computed(() =>
  actualProjects.value.find((project) => project.slug === selectedProjectSlug.value)
);

const projectSelectValue = computed({
  get: () => selectedProjectSlug.value ?? noProjectValue,
  set: (value: string) => {
    if (
      value === noProjectValue &&
      !hasInitializedProjectSelection.value &&
      actualProjects.value.length > 0
    ) {
      return;
    }

    hasInitializedProjectSelection.value = true;
    const nextProjectSlug = value === noProjectValue ? undefined : value;
    selectedProjectSlug.value = nextProjectSlug;
    inheritProjectLanguages.value = nextProjectSlug !== undefined;
  },
});

const forwardIcon = computed(() =>
  $q.lang.rtl ? "mdi-chevron-left" : "mdi-chevron-right"
);

const projectLanguageSummary = computed(() => {
  const project = selectedProject.value;
  if (project === undefined) {
    return undefined;
  }

  return formatLanguageSummary({
    defaultLanguageCode: project.defaultLanguageCode,
    multilingualSetting: project.multilingualSetting,
  });
});

const overrideLanguageSummary = computed(() =>
  formatOverrideLanguageSummary({
    multilingualSetting: overrideMultilingualSetting.value,
  })
);

const projectDynamicTranslationSummary = computed(() => {
  const project = selectedProject.value;
  if (project === undefined) {
    return undefined;
  }

  return project.multilingualSetting.dynamicTranslationEnabled
    ? tLanguage("dynamicTranslationOn")
    : tLanguage("dynamicTranslationOff");
});

const languageControlSummary = computed(() => {
  if (selectedProject.value !== undefined && inheritProjectLanguages.value) {
    return `${tProject("inheritSummaryPrefix")}: ${
      projectLanguageSummary.value ?? tProject("projectLanguagesFallback")
    }`;
  }

  return `${tProject("overrideSummaryPrefix")}: ${overrideLanguageSummary.value}`;
});

const languageControlDescription = computed(() => {
  const project = selectedProject.value;
  if (project === undefined) {
    return tProject("noProjectLanguagesDescription");
  }

  return inheritProjectLanguages.value
    ? tProject("usingProjectLanguagesDescription", { projectTitle: project.title })
    : tProject("overridingProjectLanguagesDescription", {
        projectTitle: project.title,
      });
});

const languagePickerMultilingualSetting = computed({
  get: () =>
    isEditingInheritedProjectLanguages.value
      ? inheritedLanguagePickerSetting.value
      : overrideMultilingualSetting.value,
  set: (nextSetting: ConversationMultilingualSetting) => {
    if (!isEditingInheritedProjectLanguages.value) {
      overrideMultilingualSetting.value = nextSetting;
      return;
    }

    inheritedLanguagePickerSetting.value = copyMultilingualSetting(nextSetting);
    const project = selectedProject.value;
    if (project === undefined) {
      return;
    }

    if (
      areMultilingualSettingsEqual({
        first: nextSetting,
        second: project.multilingualSetting,
      })
    ) {
      return;
    }

    overrideLanguageSetting.value = { mode: "auto" };
    overrideMultilingualSetting.value = copyMultilingualSetting(nextSetting);
    inheritProjectLanguages.value = false;
    isEditingInheritedProjectLanguages.value = false;
  },
});

watch(
  () => props.projectList,
  () => {
    hasInitializedProjectSelection.value = false;
  }
);

watch(
  actualProjects,
  (projects) => {
    if (projects.length === 0) {
      selectedProjectSlug.value = undefined;
      inheritProjectLanguages.value = false;
      hasInitializedProjectSelection.value = false;
      return;
    }

    const selectedProjectStillExists = projects.some(
      (project) => project.slug === selectedProjectSlug.value
    );
    if (selectedProjectSlug.value !== undefined && !selectedProjectStillExists) {
      const nextProjectSlug = projects[0]?.slug;
      selectedProjectSlug.value = nextProjectSlug;
      inheritProjectLanguages.value = nextProjectSlug !== undefined;
      return;
    }

    if (!hasInitializedProjectSelection.value) {
      const nextProjectSlug = projects[0]?.slug;
      selectedProjectSlug.value = nextProjectSlug;
      inheritProjectLanguages.value = nextProjectSlug !== undefined;
      hasInitializedProjectSelection.value = true;
    }
  },
  { immediate: true }
);

watch(showOverrideLanguagePicker, (isShown) => {
  if (!isShown) {
    isEditingInheritedProjectLanguages.value = false;
  }
});

function openProjectLanguageSettings(): void {
  if (selectedProject.value === undefined) {
    openOverrideLanguagePicker({ returnToProjectDialog: false });
    return;
  }

  showProjectLanguageDialog.value = true;
}

function openOverrideLanguagePicker({
  returnToProjectDialog,
}: {
  returnToProjectDialog: boolean;
}): void {
  returnToProjectLanguageDialog.value = returnToProjectDialog;
  showProjectLanguageDialog.value = false;
  showOverrideLanguagePicker.value = true;
}

function startLanguageOverride(): void {
  const project = selectedProject.value;
  if (project === undefined) {
    return;
  }

  inheritedLanguagePickerSetting.value = copyMultilingualSetting(
    project.multilingualSetting
  );
  isEditingInheritedProjectLanguages.value = true;
  openOverrideLanguagePicker({ returnToProjectDialog: true });
}

function goBackFromOverrideLanguagePicker(): void {
  showOverrideLanguagePicker.value = false;
  isEditingInheritedProjectLanguages.value = false;
  showProjectLanguageDialog.value = returnToProjectLanguageDialog.value;
}

function startDynamicTranslationOverride(value: boolean): void {
  copySelectedProjectSettingsToOverride();
  inheritProjectLanguages.value = false;
  overrideMultilingualSetting.value = {
    ...overrideMultilingualSetting.value,
    dynamicTranslationEnabled: value,
  };
}

function copySelectedProjectSettingsToOverride(): void {
  const project = selectedProject.value;
  if (project === undefined) {
    return;
  }

  overrideLanguageSetting.value = { mode: "auto" };
  overrideMultilingualSetting.value = copyMultilingualSetting(
    project.multilingualSetting
  );
}

function copyMultilingualSetting(
  setting: ConversationMultilingualSetting
): ConversationMultilingualSetting {
  return {
    additionalLanguageCodes: [...setting.additionalLanguageCodes],
    dynamicTranslationEnabled: setting.dynamicTranslationEnabled,
  };
}

function areMultilingualSettingsEqual({
  first,
  second,
}: {
  first: ConversationMultilingualSetting;
  second: ConversationMultilingualSetting;
}): boolean {
  return (
    first.dynamicTranslationEnabled === second.dynamicTranslationEnabled &&
    first.additionalLanguageCodes.length === second.additionalLanguageCodes.length &&
    first.additionalLanguageCodes.every(
      (languageCode, index) => second.additionalLanguageCodes[index] === languageCode
    )
  );
}

function formatLanguageSummary({
  defaultLanguageCode,
  multilingualSetting,
}: {
  defaultLanguageCode: SupportedDisplayLanguageCodes;
  multilingualSetting: ConversationMultilingualSetting;
}): string {
  return [
    getLanguageSummaryLabel(defaultLanguageCode),
    ...multilingualSetting.additionalLanguageCodes.map(getLanguageSummaryLabel),
  ].join(", ");
}

function formatOverrideLanguageSummary({
  multilingualSetting,
}: {
  multilingualSetting: ConversationMultilingualSetting;
}): string {
  return [
    tLanguage("languageAutoLabel"),
    ...multilingualSetting.additionalLanguageCodes.map(getLanguageSummaryLabel),
  ].join(", ");
}

function getLanguageSummaryLabel(
  languageCode: SupportedDisplayLanguageCodes
): string {
  return getLocalizedLanguageLabel({ languageCode, locale: locale.value });
}
</script>

<style scoped lang="scss">
.project-language-settings,
.language-settings-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.language-settings-list {
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 18px;
  background: white;
}
</style>
