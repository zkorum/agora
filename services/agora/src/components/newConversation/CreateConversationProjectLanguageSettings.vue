<template>
  <div class="project-language-settings">
    <q-select
      v-if="actualProjects.length > 0"
      v-model="projectSelectValue"
      outlined
      emit-value
      map-options
      label="Project"
      :options="projectOptions"
    />

    <ConversationLanguageSettingsRow
      title="Languages"
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
      title="Languages"
      subtitle="Choose whether this conversation should inherit project language settings or override them."
    >
      <div class="language-settings-list">
        <ConversationLanguageSettingsRow
          v-if="selectedProject !== undefined"
          title="Inherit project languages"
          :value="selectedProject.title"
          description="Use the selected project's language and translation settings."
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
            title="Languages"
            :value="projectLanguageSummary"
            :description="undefined"
            :icon="forwardIcon"
            :disabled="false"
            :clickable="true"
            @click="startLanguageOverride"
          />
          <ConversationLanguageSettingsRow
            title="Dynamic Translation"
            :value="projectDynamicTranslationSummary"
            :description="undefined"
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
            title="Languages"
            :value="overrideLanguageSummary"
            description="Custom language settings for this conversation."
            :icon="forwardIcon"
            :disabled="false"
            :clickable="true"
            @click="openOverrideLanguagePicker({ returnToProjectDialog: true })"
          />
          <ConversationLanguageSettingsRow
            title="Dynamic Translation"
            :value="undefined"
            description="Translate content, statements, and surveys into the selected languages."
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
    v-model:multilingual-setting="overrideMultilingualSetting"
    :can-edit-languages="true"
    :show-auto-language="true"
    auto-language-caption="Detect main language after publishing"
    :detected-language-code="undefined"
    @back="goBackFromOverrideLanguagePicker"
  />
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import ConversationAdditionalLanguagesDialog from "src/components/newConversation/dialog/ConversationAdditionalLanguagesDialog.vue";
import { getLanguageLabel as getLocalizedLanguageLabel } from "src/components/newConversation/dialog/conversationLanguageSettings.utils";
import ConversationLanguageSettingsRow from "src/components/newConversation/dialog/ConversationLanguageSettingsRow.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
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
const showProjectLanguageDialog = ref(false);
const showOverrideLanguagePicker = ref(false);
const returnToProjectLanguageDialog = ref(false);
const hasInitializedProjectSelection = ref(false);

const actualProjects = computed(() =>
  props.projectList.filter(
    (project) => project.directoryVisible && project.deletedAt === null
  )
);

const projectOptions = computed<ProjectOption[]>(() => [
  { label: "No project", value: noProjectValue },
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

  return project.multilingualSetting.dynamicTranslationEnabled ? "On" : "Off";
});

const languageControlSummary = computed(() => {
  if (selectedProject.value !== undefined && inheritProjectLanguages.value) {
    return `Inherit: ${projectLanguageSummary.value ?? "Project languages"}`;
  }

  return `Override: ${overrideLanguageSummary.value}`;
});

const languageControlDescription = computed(() => {
  const project = selectedProject.value;
  if (project === undefined) {
    return "No project selected. Use conversation-specific language settings.";
  }

  return inheritProjectLanguages.value
    ? `Using ${project.title}'s language settings.`
    : `Overriding ${project.title}'s language settings for this conversation.`;
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
  copySelectedProjectSettingsToOverride();
  inheritProjectLanguages.value = false;
  openOverrideLanguagePicker({ returnToProjectDialog: true });
}

function goBackFromOverrideLanguagePicker(): void {
  showOverrideLanguagePicker.value = false;
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
  overrideMultilingualSetting.value = {
    additionalLanguageCodes: [...project.multilingualSetting.additionalLanguageCodes],
    dynamicTranslationEnabled: project.multilingualSetting.dynamicTranslationEnabled,
  };
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
    "Auto",
    ...multilingualSetting.additionalLanguageCodes.map(getLanguageSummaryLabel),
  ].join(", ");
}

function getLanguageSummaryLabel(
  languageCode: SupportedDisplayLanguageCodes
): string {
  return getLocalizedLanguageLabel({ languageCode, locale: "en" });
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
