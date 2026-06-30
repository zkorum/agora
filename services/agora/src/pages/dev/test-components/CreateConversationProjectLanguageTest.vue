<template>
  <PrimeCard class="test-section-card">
    <template #title>
      <div class="section-header">
        <i class="pi pi-folder section-icon"></i>
        <span>Create conversation project languages</span>
      </div>
    </template>
    <template #content>
      <p class="section-description">
        Uses the real create-conversation project language component with mock
        project data. Actual projects are filtered with
        <code>directoryVisible === true</code> and <code>deletedAt === null</code>.
      </p>

      <div class="scenario-grid">
        <PrimeButton
          label="Visible projects"
          severity="secondary"
          outlined
          @click="loadVisibleProjectsScenario"
        />
        <PrimeButton
          label="Only hidden/deleted"
          severity="secondary"
          outlined
          @click="loadHiddenProjectsScenario"
        />
      </div>

      <div class="prototype-panel">
        <CreateConversationProjectLanguageSettings
          v-model:selected-project-slug="selectedProjectSlug"
          v-model:inherit-project-languages="inheritProjectLanguages"
          v-model:override-language-setting="overrideLanguageSetting"
          v-model:override-multilingual-setting="overrideMultilingualSetting"
          :project-list="projects"
        />
      </div>

      <div class="current-state">
        <div class="current-state__title">Current prototype state</div>
        <div>Actual projects: {{ actualProjects.length }}</div>
        <div>Selected project: {{ selectedProject?.title ?? "No project" }}</div>
        <div>
          Language mode:
          {{ selectedProject !== undefined && inheritProjectLanguages ? "inherit" : "override" }}
        </div>
      </div>
    </template>
  </PrimeCard>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import CreateConversationProjectLanguageSettings from "src/components/newConversation/CreateConversationProjectLanguageSettings.vue";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type {
  ConversationLanguageSettingInput,
  ConversationMultilingualSetting,
} from "src/shared/types/zod";
import { computed, ref } from "vue";

defineOptions({
  components: {
    PrimeButton: Button,
    PrimeCard: Card,
  },
});

interface DevProject {
  slug: string;
  title: string;
  directoryVisible: boolean;
  deletedAt: string | null;
  defaultLanguageCode: SupportedDisplayLanguageCodes;
  multilingualSetting: ConversationMultilingualSetting;
}

const visibleProjectsScenario: DevProject[] = [
  {
    slug: "citizens-assembly",
    title: "Citizens' Assembly",
    directoryVisible: true,
    deletedAt: null,
    defaultLanguageCode: "en",
    multilingualSetting: {
      additionalLanguageCodes: ["fr", "ar"],
      dynamicTranslationEnabled: true,
    },
  },
  {
    slug: "youth-forum",
    title: "Youth Forum",
    directoryVisible: true,
    deletedAt: null,
    defaultLanguageCode: "es",
    multilingualSetting: {
      additionalLanguageCodes: ["en"],
      dynamicTranslationEnabled: false,
    },
  },
  {
    slug: "private-working-group",
    title: "Private Working Group",
    directoryVisible: false,
    deletedAt: null,
    defaultLanguageCode: "fr",
    multilingualSetting: {
      additionalLanguageCodes: ["en"],
      dynamicTranslationEnabled: true,
    },
  },
  {
    slug: "archived-project",
    title: "Archived Project",
    directoryVisible: true,
    deletedAt: "2026-06-01T00:00:00.000Z",
    defaultLanguageCode: "en",
    multilingualSetting: {
      additionalLanguageCodes: ["ja"],
      dynamicTranslationEnabled: true,
    },
  },
];

const hiddenProjectsScenario: DevProject[] = [
  {
    slug: "hidden-only",
    title: "Hidden Only",
    directoryVisible: false,
    deletedAt: null,
    defaultLanguageCode: "en",
    multilingualSetting: {
      additionalLanguageCodes: ["fr"],
      dynamicTranslationEnabled: true,
    },
  },
  {
    slug: "deleted-only",
    title: "Deleted Only",
    directoryVisible: true,
    deletedAt: "2026-06-01T00:00:00.000Z",
    defaultLanguageCode: "es",
    multilingualSetting: {
      additionalLanguageCodes: ["en"],
      dynamicTranslationEnabled: false,
    },
  },
];

const projects = ref<DevProject[]>(visibleProjectsScenario);
const selectedProjectSlug = ref<string | undefined>(undefined);
const inheritProjectLanguages = ref(false);
const overrideLanguageSetting = ref<ConversationLanguageSettingInput>({
  mode: "auto",
});
const overrideMultilingualSetting = ref<ConversationMultilingualSetting>({
  additionalLanguageCodes: ["fr"],
  dynamicTranslationEnabled: true,
});

const actualProjects = computed(() =>
  projects.value.filter(
    (project) => project.directoryVisible && project.deletedAt === null
  )
);

const selectedProject = computed(() =>
  actualProjects.value.find((project) => project.slug === selectedProjectSlug.value)
);

function loadVisibleProjectsScenario(): void {
  projects.value = visibleProjectsScenario;
  selectedProjectSlug.value = undefined;
  inheritProjectLanguages.value = false;
}

function loadHiddenProjectsScenario(): void {
  projects.value = hiddenProjectsScenario;
  selectedProjectSlug.value = undefined;
  inheritProjectLanguages.value = false;
}
</script>

<style scoped lang="scss">
.test-section-card {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);

  .section-icon {
    color: $primary;
  }
}

.section-description {
  margin: 0 0 1.25rem;
  color: $grey-8;
  font-size: 1rem;
  line-height: 1.5;
}

.scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 0.75rem;
}

.prototype-panel {
  margin-top: 1.25rem;
}

.current-state {
  margin-top: 1.25rem;
  padding: 1rem;
  border-radius: 0.75rem;
  background: $grey-1;
  color: $grey-9;
  line-height: 1.6;
}

.current-state__title {
  margin-bottom: 0.35rem;
  font-weight: var(--font-weight-semibold);
}
</style>
