<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar title="Conversation project context" :center-content="true" />
  </Teleport>

  <div class="dev-page">
    <section class="dev-panel">
      <div class="dev-panel__header">
        <div>
          <p class="eyebrow">Actual component test</p>
          <h1>Conversation project context pill</h1>
        </div>
        <SpaLink to="/dev/component-testing" class="back-link">
          Back to component testing
        </SpaLink>
      </div>

      <p class="description">
        This page renders the real <code>PostContent</code>,
        <code>ConversationTitle</code>, <code>ContentTranslationControl</code>, and
        <code>ConversationProjectContextPill</code> components. Scenario data mimics
        what the backend sends after resolving project title translation.
      </p>

      <div class="control-grid">
        <label class="control-group">
          <span>Display language</span>
          <q-btn-toggle
            v-model="displayLanguage"
            unelevated
            no-caps
            toggle-color="primary"
            color="white"
            text-color="primary"
            :options="displayLanguageOptions"
          />
        </label>

        <label class="control-group">
          <span>Scenario</span>
          <q-btn-toggle
            v-model="scenarioKey"
            unelevated
            no-caps
            toggle-color="primary"
            color="white"
            text-color="primary"
            :options="scenarioOptions"
          />
        </label>
      </div>
    </section>

    <section class="preview-grid">
      <article class="dev-panel preview-card">
        <div class="preview-card__header">
          <div>
            <p class="eyebrow">Conversation page header</p>
            <h2>Normal conversation URL</h2>
          </div>
          <q-chip dense color="primary" text-color="white">
            {{ scenario.summary }}
          </q-chip>
        </div>

        <PostContent
          :key="`${scenarioKey}-${displayLanguage}`"
          :extended-post-data="conversationData"
          :compact-mode="false"
          :content-translation="contentTranslationPreview"
          :displayed-title="displayedConversationContent.title"
          :displayed-body="displayedConversationContent.body"
          @update:content-translation-mode="contentMode = $event"
        />
      </article>

      <aside class="dev-panel state-card">
        <p class="eyebrow">Expected behavior</p>
        <h2>Resolved backend state</h2>

        <dl>
          <div>
            <dt>Project title in pill</dt>
            <dd>{{ displayedProjectTitle }}</dd>
          </div>
          <div>
            <dt>Project original title</dt>
            <dd>{{ projectContext.originalProjectTitle }}</dd>
          </div>
          <div>
            <dt>Project translated title</dt>
            <dd>{{ projectContext.translatedProjectTitle ?? "Unavailable" }}</dd>
          </div>
          <div>
            <dt>Conversation mode</dt>
            <dd>{{ contentMode }}</dd>
          </div>
          <div>
            <dt>Conversation translation button</dt>
            <dd>{{ contentTranslationPreview === undefined ? "Hidden" : "Visible" }}</dd>
          </div>
          <div>
            <dt>Project supports display language</dt>
            <dd>{{ scenario.projectTranslations[displayLanguage] === undefined ? "No" : "Yes" }}</dd>
          </div>
          <div>
            <dt>Conversation supports display language</dt>
            <dd>{{ scenario.conversationTranslations[displayLanguage] === undefined ? "No" : "Yes" }}</dd>
          </div>
        </dl>

        <div class="project-shell-preview">
          <p class="eyebrow">Project shell preview</p>
          <div class="project-banner" :class="`project-banner--${displayLanguage}`">
            {{ projectShellTitle }}
          </div>
          <p>
            The project shell/title/banner would stay in the display language. The
            conversation translation toggle above changes conversation title,
            description, and the project-context pill title together.
          </p>
        </div>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { StandardMenuBar } from "src/components/navigation/header/variants";
import PostContent from "src/components/post/display/PostContent.vue";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type {
  ConversationProjectContext,
  ExtendedConversation,
  LocalizedContentTranslationStatus,
} from "src/shared/types/zod";
import { getConversationProjectContextTitle } from "src/utils/project/conversationProjectContext";
import type { ContentTranslationDisplayMode } from "src/utils/translation/contentTranslation";
import { computed, ref, watch } from "vue";

type ScenarioKey =
  | "both-translated"
  | "project-only"
  | "conversation-only"
  | "neither-translated";
type DevDisplayLanguage = Extract<SupportedDisplayLanguageCodes, "en" | "fr" | "ky">;

interface DevConversationContent {
  title: string;
  body: string;
}

interface DevScenario {
  label: string;
  summary: string;
  projectSourceTitle: string;
  projectTranslations: Partial<Record<DevDisplayLanguage, string>>;
  conversationSourceLanguage: DevDisplayLanguage;
  conversationOriginal: DevConversationContent;
  conversationTranslations: Partial<Record<DevDisplayLanguage, DevConversationContent>>;
  conversationTranslationStatus: LocalizedContentTranslationStatus;
}

const { isActive } = usePageLayout({
  enableFooter: false,
  reducedWidth: false,
  addBottomPadding: true,
});

const displayLanguage = ref<DevDisplayLanguage>("fr");
const scenarioKey = ref<ScenarioKey>("both-translated");
const contentMode = ref<ContentTranslationDisplayMode>("translated");

const displayLanguageOptions = [
  { label: "English", value: "en" },
  { label: "French", value: "fr" },
  { label: "Kyrgyz", value: "ky" },
] satisfies readonly { label: string; value: DevDisplayLanguage }[];

const scenarioOptions = [
  { label: "Both translated", value: "both-translated" },
  { label: "Project only", value: "project-only" },
  { label: "Conversation only", value: "conversation-only" },
  { label: "Neither", value: "neither-translated" },
] satisfies readonly { label: string; value: ScenarioKey }[];

const scenarios: Record<ScenarioKey, DevScenario> = {
  "both-translated": {
    label: "Both translated",
    summary: "Project and conversation support display language",
    projectSourceTitle: "Amplify",
    projectTranslations: {
      fr: "Amplifier",
      ky: "Үндү күчөтүү",
    },
    conversationSourceLanguage: "en",
    conversationOriginal: {
      title: "What should the village prioritize first?",
      body: "Choose the public-service issue that should receive attention first.",
    },
    conversationTranslations: {
      fr: {
        title: "Quelle priorité le village doit-il traiter en premier ?",
        body: "Choisissez le service public qui devrait recevoir l'attention en premier.",
      },
      ky: {
        title: "Айыл биринчи эмнеге артыкчылык бериши керек?",
        body: "Биринчи көңүл бурулушу керек болгон коомдук кызмат маселесин тандаңыз.",
      },
    },
    conversationTranslationStatus: "completed",
  },
  "project-only": {
    label: "Project only",
    summary: "Project translated, conversation original only",
    projectSourceTitle: "Amplify",
    projectTranslations: {
      fr: "Amplifier",
      ky: "Үндү күчөтүү",
    },
    conversationSourceLanguage: "en",
    conversationOriginal: {
      title: "Local infrastructure priorities",
      body: "This conversation has dynamic translation disabled, so the project-context pill stays original even though the project has localized titles.",
    },
    conversationTranslations: {},
    conversationTranslationStatus: "not_requested",
  },
  "conversation-only": {
    label: "Conversation only",
    summary: "Conversation translated, project falls back to source",
    projectSourceTitle: "Amplify",
    projectTranslations: {},
    conversationSourceLanguage: "en",
    conversationOriginal: {
      title: "What would make participation easier?",
      body: "The conversation supports the display language, but the project does not have a localized title for it.",
    },
    conversationTranslations: {
      fr: {
        title: "Qu'est-ce qui faciliterait la participation ?",
        body: "La conversation prend en charge la langue d'affichage, mais pas le titre du projet.",
      },
      ky: {
        title: "Катышууну эмне жеңилдетет?",
        body: "Талкуу көрсөтүү тилин колдойт, бирок долбоордун аталышы ошол тилде жок.",
      },
    },
    conversationTranslationStatus: "completed",
  },
  "neither-translated": {
    label: "Neither translated",
    summary: "Both fall back to source language",
    projectSourceTitle: "Amplify",
    projectTranslations: {},
    conversationSourceLanguage: "en",
    conversationOriginal: {
      title: "Original-only consultation",
      body: "Neither the project nor conversation has content for the selected display language.",
    },
    conversationTranslations: {},
    conversationTranslationStatus: "not_requested",
  },
};

const scenario = computed(() => scenarios[scenarioKey.value]);
const translatedConversationContent = computed(
  () => scenario.value.conversationTranslations[displayLanguage.value]
);
const canShowConversationTranslation = computed(
  () => translatedConversationContent.value !== undefined
);
const projectContext = computed<ConversationProjectContext>(() => ({
  projectSlug: "amplify",
  originalProjectTitle: scenario.value.projectSourceTitle,
  translatedProjectTitle: scenario.value.projectTranslations[displayLanguage.value],
  conversationSlugId: "prior01",
}));
const displayedProjectTitle = computed(() => {
  return getConversationProjectContextTitle({
    projectContext: projectContext.value,
    titleMode: contentMode.value,
  });
});
const projectShellTitle = computed(
  () =>
    projectContext.value.translatedProjectTitle ??
    projectContext.value.originalProjectTitle
);
const displayedConversationContent = computed(() => {
  if (contentMode.value === "translated" && translatedConversationContent.value !== undefined) {
    return translatedConversationContent.value;
  }

  return scenario.value.conversationOriginal;
});
const contentTranslationPreview = computed(() => {
  const translated = translatedConversationContent.value;
  if (translated === undefined) {
    return undefined;
  }

  return {
    isAvailable: true,
    isLoadingInitialTranslation: false,
    mode: contentMode.value,
    sourceLanguageLabel: scenario.value.conversationSourceLanguage.toUpperCase(),
    translationStatus: scenario.value.conversationTranslationStatus,
    translatedTitle: translated.title,
    translatedBody: translated.body,
  };
});
const conversationData = computed<ExtendedConversation>(() => {
  const now = new Date("2026-07-01T12:00:00.000Z");

  return {
    metadata: {
      conversationSlugId: "prior01",
      createdAt: now,
      updatedAt: now,
      lastReactedAt: now,
      opinionCount: 0,
      voteCount: 0,
      participantCount: 0,
      totalOpinionCount: 0,
      totalVoteCount: 0,
      totalParticipantCount: 0,
      moderatedOpinionCount: 0,
      hiddenOpinionCount: 0,
      authorUsername: "project-team",
      participationMode: "guest",
      isIndexed: false,
      aiLabelingEnabled: false,
      preferredOpinionGroupCount: null,
      contentLanguageMetadata: {
        detectedDisplayLanguageCode: scenario.value.conversationSourceLanguage,
        detectedSourceLanguageCode: scenario.value.conversationSourceLanguage,
        detectedRawLanguageCode: scenario.value.conversationSourceLanguage,
        detectionConfidence: 1,
        autoDetectionStatus: "detected",
      },
      languageSetting: {
        mode: "manual",
        languageCode: scenario.value.conversationSourceLanguage,
        detectedLanguageCode: scenario.value.conversationSourceLanguage,
        detectedSourceLanguageCode: scenario.value.conversationSourceLanguage,
        detectedRawLanguageCode: scenario.value.conversationSourceLanguage,
        detectionConfidence: 1,
        autoDetectionStatus: "detected",
      },
      multilingualSetting: {
        additionalLanguageCodes: canShowConversationTranslation.value
          ? [displayLanguage.value]
          : [],
        dynamicTranslationEnabled: canShowConversationTranslation.value,
      },
      isClosed: false,
      isEdited: false,
      organization: undefined,
      moderation: { status: "unmoderated" },
      requiresEventTicket: undefined,
      externalSourceConfig: null,
      importInfo: undefined,
      conversationType: "polis",
      projectContext: projectContext.value,
    },
    payload: scenario.value.conversationOriginal,
    interaction: {
      hasVoted: false,
      votedIndex: 0,
      surveyGate: undefined,
    },
  };
});

watch([scenarioKey, displayLanguage], () => {
  contentMode.value = canShowConversationTranslation.value ? "translated" : "original";
});
</script>

<style scoped lang="scss">
.dev-page {
  width: min(72rem, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1.5rem 0 4rem;
}

.dev-panel {
  border: 1px solid rgba($ink-darkest, 0.08);
  border-radius: 1rem;
  padding: 1.25rem;
  background: white;
  box-shadow: 0 0.5rem 1.5rem rgba(10, 7, 20, 0.05);
}

.dev-panel__header,
.preview-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.eyebrow {
  margin: 0 0 0.25rem;
  color: $primary;
  font-size: 0.78rem;
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

h1,
h2 {
  margin: 0;
  color: $ink-darkest;
}

h1 {
  font-size: 1.45rem;
}

h2 {
  font-size: 1.05rem;
}

.back-link {
  color: $primary;
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.description {
  max-width: 54rem;
  margin: 1rem 0 0;
  color: $ink-light;
  line-height: 1.55;
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 1rem;
  margin-top: 1.25rem;
}

.control-group {
  display: grid;
  gap: 0.5rem;
  color: $ink-light;
  font-weight: var(--font-weight-semibold);
}

.preview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(20rem, 0.8fr);
  gap: 1rem;
  margin-top: 1rem;
}

.state-card dl {
  display: grid;
  gap: 0.85rem;
  margin: 1rem 0 0;
}

.state-card dl > div {
  display: grid;
  gap: 0.2rem;
}

dt {
  color: $ink-light;
  font-size: 0.8rem;
}

dd {
  margin: 0;
  color: $ink-darkest;
  font-weight: var(--font-weight-semibold);
}

.project-shell-preview {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba($ink-darkest, 0.08);
  color: $ink-light;
  line-height: 1.5;
}

.project-banner {
  display: grid;
  min-height: 7rem;
  margin-top: 0.5rem;
  place-items: center;
  border-radius: 0.85rem;
  padding: 1rem;
  color: white;
  font-size: 1.25rem;
  font-weight: var(--font-weight-bold);
  text-align: center;
}

.project-banner--en {
  background: linear-gradient(135deg, #5538ee, #4f92f6);
}

.project-banner--fr {
  background: linear-gradient(135deg, #177a41, #4f92f6);
}

.project-banner--ky {
  background: linear-gradient(135deg, #d8639a, #5538ee);
}

@media (max-width: 860px) {
  .preview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
