<template>
  <div class="project-conversation-layout-dev">
    <div
      v-if="controlsVisible"
      class="project-conversation-layout-dev__controls"
    >
      <div class="project-conversation-layout-dev__controls-header">
        <div>
          <p>Dev controls</p>
          <strong>Project conversation layout</strong>
        </div>
        <q-btn
          dense
          round
          flat
          icon="mdi-close"
          aria-label="Hide dev controls"
          @click="controlsVisible = false"
        />
      </div>

      <div class="project-conversation-layout-dev__control-row">
        <q-btn-toggle
          v-model="statementScenario"
          unelevated
          no-caps
          toggle-color="primary"
          color="white"
          text-color="primary"
          :options="statementScenarioOptions"
        />
      </div>

      <div class="project-conversation-layout-dev__control-row">
        <q-btn-toggle
          v-model="privacyMode"
          unelevated
          no-caps
          toggle-color="primary"
          color="white"
          text-color="primary"
          :options="privacyModeOptions"
        />
      </div>

      <div class="project-conversation-layout-dev__control-row">
        <q-btn-toggle
          v-model="participationMode"
          unelevated
          no-caps
          toggle-color="primary"
          color="white"
          text-color="primary"
          :options="participationModeOptions"
        />
      </div>
    </div>

    <q-btn
      v-else
      class="project-conversation-layout-dev__show-controls"
      unelevated
      no-caps
      color="primary"
      icon="mdi-tune"
      label="Show dev controls"
      @click="controlsVisible = true"
    />

    <ProjectConversationView
      v-model:selected-language="selectedLanguage"
      :project="project"
      :conversation-data="conversationData"
      :language-options="languageOptions"
    >
      <template #conversation-actions>
        <ConversationStickyActionBar
          layout="project"
          :sticky-top="0"
          @update:action-bar-element="setActionBarElement"
        >
          <PostActionBar
            v-model="currentTab"
            :compact-mode="false"
            :opinion-count="conversation.stats.opinionCount"
            :participant-count="conversation.stats.participantCount"
            :vote-count="conversation.stats.voteCount"
            :total-participant-count="conversation.stats.participantCount"
            :total-vote-count="conversation.stats.voteCount"
            :conversation-slug-id="conversation.slugId"
            :conversation-title="conversation.title"
            author-username="project-team"
            :on-same-tab-click="scrollToActionBar"
            :conversation-type-config="{ conversationType: 'polis' }"
            :enable-route-navigation="false"
          />
        </ConversationStickyActionBar>
      </template>

      <template #conversation-toolbar>
        <CommentSortingSelector
          v-if="currentTab === 'comment'"
          :filter-value="commentFilter"
          :moderated-opinion-count="3"
          :hidden-opinion-count="1"
          @changed-algorithm="updateCommentFilter"
        />
      </template>

      <template #conversation-feed>
        <div class="tab-content">
          <div
            v-if="currentTab === 'comment'"
            class="project-conversation-layout-dev__statement-list"
            role="list"
            :aria-label="`Statements section with ${commentItems.length.toString()} statements`"
          >
            <ZKCard
              v-for="commentItem in commentItems"
              :id="`comment-${commentItem.opinionSlugId}`"
              :key="commentItem.opinionSlugId"
              role="listitem"
              padding="0rem"
              class="project-conversation-layout-dev__statement-card"
            >
              <TranslatedCommentItem
                :comment-item="commentItem"
                :post-slug-id="conversation.slugId"
                conversation-author-username="project-team"
                conversation-organization-name=""
                :voting-utilities="votingUtilities"
                :participation-mode="participationMode"
                :survey-gate="undefined"
                :on-view-analysis="showAnalysisTab"
                :is-voting-disabled="false"
                :conversation-route-context="projectConversationRouteContext"
              />
            </ZKCard>

            <div class="project-conversation-layout-dev__statement-end">
              <q-icon name="mdi-check" size="1rem" />
              <span>All statements loaded</span>
            </div>
          </div>

          <AnalysisPage
            v-else
            :conversation-slug-id="conversation.slugId"
            conversation-author-username="project-team"
            conversation-organization-name=""
            :analysis-query="analysisQuery"
            :analysis-checkpoints-query="analysisCheckpointsQuery"
            :live-conversation-view-snapshot-id="undefined"
            :survey-query="surveyQuery"
            :has-survey="false"
            :survey-gate="undefined"
            :ai-labeling-enabled="false"
            :show-report-button="true"
            :report-route-override="{
              path: '/dev/project-conversation-report-layout',
            }"
            :is-live-analysis-paused="false"
            :is-conversation-closed="conversation.isClosed"
            :navigate-to-discover-tab="showStatementsTab"
            :conversation-scroll-context="conversationScrollContext"
          />
        </div>
      </template>
    </ProjectConversationView>
  </div>
</template>

<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import AnalysisPage from "src/components/post/analysis/AnalysisPage.vue";
import CommentSortingSelector from "src/components/post/comments/group/CommentSortingSelector.vue";
import TranslatedCommentItem from "src/components/post/comments/group/item/TranslatedCommentItem.vue";
import ConversationStickyActionBar from "src/components/post/interactionBar/ConversationStickyActionBar.vue";
import PostActionBar from "src/components/post/interactionBar/PostActionBar.vue";
import ProjectConversationView from "src/components/project/ProjectConversationView.vue";
import type {
  ProjectLanguageOption,
  ProjectPageData,
} from "src/components/project/projectPageTypes";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import type { ConversationScrollContext } from "src/composables/conversation/useConversationParentState";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import type {
  OpinionVotingUtilities,
  UserVote,
} from "src/composables/opinion/types";
import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import type {
  CastVoteResponse,
  FetchAnalysisCheckpointsResponse,
  SurveyResultsAggregatedResponse,
} from "src/shared/types/dto";
import type {
  DisplayedOpinionItem,
  ExtendedConversation,
  ParticipationMode,
  VotingAction,
} from "src/shared/types/zod";
import type { AnalysisData } from "src/utils/api/comment/analysisData";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import {
  getElementScrollTop,
  getScrollTop,
  scrollTo,
} from "src/utils/html/scroll";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

type ProjectConversationDevLanguage = "en" | "ky" | "ru";
type StatementScenario = "short" | "medium" | "long";
type PrivacyMode = "public" | "private";

const controlsVisible = ref(true);
const actionBarElement = ref<HTMLElement | null>(null);
usePageLayout({
  enableDrawer: false,
  enableFooter: false,
  enableHeader: false,
});
const projectConversationRouteContext: ConversationRouteContext = {
  kind: "project",
  projectSlug: "voices-for-change",
};
const selectedLanguage = ref<SupportedDisplayLanguageCodes>("en");
const route = useRoute();
const currentTab = ref<"comment" | "analysis">(getRouteTab());
const commentFilter = ref<CommentFilterOptions>("discover");
const statementScenario = ref<StatementScenario>("medium");
const privacyMode = ref<PrivacyMode>("private");
const participationMode = ref<ParticipationMode>("guest");
const userVotes = ref<UserVote[]>([]);

const localProjectAssetBaseUrl = "/local-project-assets/project-page";
const projectBannerImageUrlsByLanguage = {
  en: `${localProjectAssetBaseUrl}/project-banner-en.png`,
  ky: `${localProjectAssetBaseUrl}/project-banner-ky.png`,
  ru: `${localProjectAssetBaseUrl}/project-banner-ru.png`,
} satisfies Readonly<Record<ProjectConversationDevLanguage, string>>;
const civicUnionImageUrlsByLanguage = {
  en: new URL(
    "../../assets/project-page/civic-union-logo-en.svg",
    import.meta.url
  ).href,
  ky: new URL(
    "../../assets/project-page/civic-union-logo-ky.svg",
    import.meta.url
  ).href,
  ru: new URL(
    "../../assets/project-page/civic-union-logo-ru.svg",
    import.meta.url
  ).href,
} satisfies Readonly<Record<ProjectConversationDevLanguage, string>>;

const statementScenarioOptions = [
  { label: "8 statements", value: "short" },
  { label: "24 statements", value: "medium" },
  { label: "72 statements", value: "long" },
] satisfies readonly { label: string; value: StatementScenario }[];
const privacyModeOptions = [
  { label: "Public", value: "public" },
  { label: "Private", value: "private" },
] satisfies readonly { label: string; value: PrivacyMode }[];
const participationModeOptions = [
  { label: "Guest", value: "guest" },
  { label: "Account", value: "account_required" },
  { label: "Email", value: "email_verification" },
  { label: "Strong", value: "strong_verification" },
] satisfies readonly { label: string; value: ParticipationMode }[];

const activeScenarioLanguage = computed<ProjectConversationDevLanguage>(() => {
  const language = selectedLanguage.value;
  if (language === "ky" || language === "ru") {
    return language;
  }

  return "en";
});

const languageOptions = computed<readonly ProjectLanguageOption[]>(() => [
  {
    label: "English",
    shortLabel: "EN",
    value: "en",
    caption: "Supported by this project",
    projectSupported: true,
    searchText: "EN English",
  },
  {
    label: "Кыргызча",
    shortLabel: "KY",
    value: "ky",
    caption: "Supported by this project",
    projectSupported: true,
    searchText: "KY Kyrgyz",
  },
  {
    label: "Русский",
    shortLabel: "RU",
    value: "ru",
    caption: "Supported by this project",
    projectSupported: true,
    searchText: "RU Russian",
  },
]);

const projectContentByLanguage = {
  en: {
    title: "Voices for Change",
    subtitle: "Civic dialogue in Kyrgyzstan",
    bodyHtml:
      "A national consultation gathering ideas from community members, public institutions, and civil-society groups to shape priorities for Kyrgyzstan's future.",
    conversationTitle: "Share your ideas",
    conversationBody:
      "The opening conversation asks participants to add a statement or react to others. The layout around this conversation belongs to the project, while the conversation module keeps Agora's familiar interaction model.",
  },
  ky: {
    title: "Өзгөрүү үчүн үн кошуу",
    subtitle: "Кыргызстандагы жарандык диалог",
    bodyHtml:
      "Коомчулук мүчөлөрүнөн, мамлекеттик институттардан жана жарандык коомдон идеяларды чогулткан улуттук консультация.",
    conversationTitle: "Идеяларыңыз менен бөлүшүңүз",
    conversationBody:
      "Ачылыш талкуусу катышуучуларды сунуш кошууга же башкаларга жооп берүүгө чакырат. Бул dev көрүнүшүндө долбоордун айланасындагы layout текшерилет.",
  },
  ru: {
    title: "Голоса за перемены",
    subtitle: "Гражданский диалог в Кыргызстане",
    bodyHtml:
      "Национальная консультация собирает идеи жителей, государственных институтов и организаций гражданского общества для определения будущих приоритетов.",
    conversationTitle: "Поделитесь идеями",
    conversationBody:
      "Стартовое обсуждение предлагает участникам добавить высказывание или отреагировать на другие. Здесь проверяется проектная оболочка вокруг существующего модуля обсуждения.",
  },
} satisfies Record<
  ProjectConversationDevLanguage,
  {
    title: string;
    subtitle: string;
    bodyHtml: string;
    conversationTitle: string;
    conversationBody: string;
  }
>;

const project = computed<ProjectPageData>(() => {
  const content = projectContentByLanguage[activeScenarioLanguage.value];
  const projectOwner = localizedAttributions.value.find(
    (entry) => entry.role === "project_owner"
  );

  return {
    slug: "voices-for-change",
    displayContent: {
      sourceVersion:
        projectSourceVersionByLanguage[activeScenarioLanguage.value],
      status: "available",
      mode: "original",
      content: {
        title: content.title,
        subtitle: content.subtitle,
        bodyHtml: content.bodyHtml,
      },
      translationControl: null,
    },
    bannerVariant: "blue",
    bannerImageUrl:
      projectBannerImageUrlsByLanguage[activeScenarioLanguage.value],
    participantCount: 214,
    voteCount: 2100,
    activityCount: 4,
    attributions: localizedAttributions.value,
    contact: {
      firstName: "Aida",
      lastName: "Saparova",
      roleLabel: "Facilitator",
      affiliationName: projectOwner?.displayName,
      imageUrl: undefined,
      email: "contact@example.org",
      websiteUrl: "https://example.org/project-contact",
    },
  };
});

const projectSourceVersionByLanguage = {
  en: "00000000-0000-4000-8000-000000000101",
  ky: "00000000-0000-4000-8000-000000000102",
  ru: "00000000-0000-4000-8000-000000000103",
} satisfies Record<ProjectConversationDevLanguage, string>;

interface ProjectConversationPreview {
  slugId: string;
  title: string;
  bodyHtml: string;
  isClosed: boolean;
  stats: { opinionCount: number; participantCount: number; voteCount: number };
  conversationType: ExtendedConversation["metadata"]["conversationType"];
  externalSourceConfig: null;
}

const conversation = computed<ProjectConversationPreview>(() => ({
  slugId: "share01",
  title:
    projectContentByLanguage[activeScenarioLanguage.value].conversationTitle,
  bodyHtml:
    projectContentByLanguage[activeScenarioLanguage.value].conversationBody,
  isClosed: false,
  stats: {
    opinionCount: commentItems.value.length,
    participantCount: 214,
    voteCount: 2100,
  },
  conversationType: "polis",
  externalSourceConfig: null,
}));

const conversationData = computed<ExtendedConversation>(() => {
  const content = projectContentByLanguage[activeScenarioLanguage.value];
  const now = new Date("2026-07-01T12:00:00.000Z");

  return {
    metadata: {
      conversationSlugId: "share01",
      createdAt: now,
      updatedAt: now,
      lastReactedAt: now,
      opinionCount: commentItems.value.length,
      voteCount: 2100,
      participantCount: 214,
      totalOpinionCount: commentItems.value.length,
      totalVoteCount: 2100,
      totalParticipantCount: 214,
      moderatedOpinionCount: 3,
      hiddenOpinionCount: 1,
      authorUsername: "project-team",
      participationMode: participationMode.value,
      conversationType: "polis",
      isIndexed: privacyMode.value === "public",
      aiLabelingEnabled: false,
      preferredOpinionGroupCount: null,
      contentLanguageMetadata: {
        detectedDisplayLanguageCode: activeScenarioLanguage.value,
        detectedSourceLanguageCode: activeScenarioLanguage.value,
        detectedRawLanguageCode: activeScenarioLanguage.value,
        detectionConfidence: 1,
        autoDetectionStatus: "detected",
      },
      languageSetting: {
        mode: "manual",
        languageCode: activeScenarioLanguage.value,
        detectedLanguageCode: activeScenarioLanguage.value,
        detectedSourceLanguageCode: activeScenarioLanguage.value,
        detectedRawLanguageCode: activeScenarioLanguage.value,
        detectionConfidence: 1,
        autoDetectionStatus: "detected",
      },
      multilingualSetting: {
        additionalLanguageCodes: [],
        dynamicTranslationEnabled: false,
      },
      isClosed: false,
      isEdited: false,
      organization: undefined,
      moderation: { status: "unmoderated" },
      externalSourceConfig: null,
    },
    payload: {
      title: content.conversationTitle,
      body: content.conversationBody,
    },
    interaction: {
      hasVoted: userVotes.value.length > 0,
      votedIndex: 0,
      surveyGate: undefined,
    },
  };
});

const localizedAttributions = computed<ProjectPageData["attributions"]>(() => [
  {
    role: "sponsor",
    displayName: attributionName({ key: "eu" }),
    description: "Funding partner for public dialogue programs.",
    websiteUrl: "https://european-union.europa.eu/",
    initials: "EU",
    accentColor: "#003399",
    imageUrl: undefined,
  },
  {
    role: "project_owner",
    displayName: attributionName({ key: "kurak" }),
    description: "Project coordination and outreach.",
    websiteUrl: "https://example.org/kurak",
    initials: "KF",
    accentColor: "#1A5FB4",
    imageUrl: civicUnionImageUrlsByLanguage[activeScenarioLanguage.value],
  },
  {
    role: "partner",
    displayName: attributionName({ key: "sfcg" }),
    description: "Peacebuilding and facilitation partner.",
    websiteUrl: "https://www.searchforcommonground.org/",
    initials: "SFCG",
    accentColor: "#0E7490",
    imageUrl: undefined,
  },
  {
    role: "partner",
    displayName: attributionName({ key: "naryn" }),
    description: "Regional workshop host.",
    websiteUrl: undefined,
    initials: "NL",
    accentColor: "#D8639A",
    imageUrl: undefined,
  },
  {
    role: "partner",
    displayName: attributionName({ key: "talas" }),
    description: "Youth recruitment partner.",
    websiteUrl: undefined,
    initials: "TY",
    accentColor: "#177A41",
    imageUrl: undefined,
  },
]);

const commentItems = computed<readonly DisplayedOpinionItem[]>(() =>
  createCommentItems({ count: statementCount.value })
);
const statementCount = computed(() => {
  switch (statementScenario.value) {
    case "short":
      return 8;
    case "medium":
      return 24;
    case "long":
      return 72;
  }

  return 24;
});
const votingUtilities = computed<OpinionVotingUtilities>(() => ({
  userVotes: userVotes.value,
  castVote,
}));

const devAnalysisData = computed<AnalysisData>(() => ({
  consensusAgree: [],
  consensusDisagree: [],
  controversial: [],
  polisClusters: {},
  emptyReason: "not_enough_votes",
  hasVotedOnAllAvailableOpinions: false,
}));

const analysisQuery = useQuery<AnalysisData, Error>({
  queryKey: computed(() => [
    "project-conversation-layout-dev-analysis",
    activeScenarioLanguage.value,
    statementCount.value,
  ]),
  queryFn: () => devAnalysisData.value,
  staleTime: Infinity,
});

const analysisCheckpointsQuery = useQuery<
  FetchAnalysisCheckpointsResponse,
  Error
>({
  queryKey: ["project-conversation-layout-dev-analysis-checkpoints"],
  queryFn: () => [],
  staleTime: Infinity,
});

const surveyQuery = useQuery<SurveyResultsAggregatedResponse, Error>({
  queryKey: ["project-conversation-layout-dev-survey"],
  queryFn: () => ({
    hasSurvey: false,
    accessLevel: "public",
    suppressionThreshold: 5,
    suppressedRows: [],
  }),
  staleTime: Infinity,
});

const conversationScrollContext = computed<ConversationScrollContext>(() => ({
  actionBarElement: actionBarElement.value,
  scrollContainerElement: null,
  getScrollPosition: () => getScrollTop({ scrollContainer: null }),
  getElementScrollPosition: ({ element }) =>
    getElementScrollTop({ element, scrollContainer: null }),
  scrollToPosition: ({ top, behavior }) =>
    scrollTo({ top, behavior, scrollContainer: null }),
}));

watch(
  () => route.query.tab,
  () => {
    currentTab.value = getRouteTab();
  }
);

function updateCommentFilter(filter: CommentFilterOptions): void {
  commentFilter.value = filter;
}

function showAnalysisTab(): void {
  currentTab.value = "analysis";
}

function showStatementsTab(): void {
  currentTab.value = "comment";
}

function setActionBarElement(element: HTMLElement | null): void {
  actionBarElement.value = element;
}

function scrollToActionBar(): void {
  const element = actionBarElement.value;
  if (element === null) {
    return;
  }

  const elementTop = getElementScrollTop({ element, scrollContainer: null });
  scrollTo({
    top: elementTop,
    behavior: "smooth",
    scrollContainer: null,
  });
}

function getRouteTab(): "comment" | "analysis" {
  return route.query.tab === "analysis" ? "analysis" : "comment";
}

function castVote(
  opinionSlugId: string,
  voteAction: VotingAction
): Promise<CastVoteResponse> {
  userVotes.value = userVotes.value.filter(
    (vote) => vote.opinionSlugId !== opinionSlugId
  );

  if (voteAction !== "cancel") {
    userVotes.value = [
      ...userVotes.value,
      { opinionSlugId, votingAction: voteAction },
    ];
  }

  return Promise.resolve({ success: true });
}

function attributionName({
  key,
}: {
  key: "kurak" | "eu" | "sfcg" | "naryn" | "talas";
}): string {
  const names = {
    en: {
      kurak: "Kurak Foundation",
      eu: "European Union",
      sfcg: "Search for Common Ground",
      naryn: "Naryn Community Lab",
      talas: "Talas Youth Network",
    },
    ky: {
      kurak: "Курак фонду",
      eu: "Европа Биримдиги",
      sfcg: "Search for Common Ground Кыргызстан",
      naryn: "Нарын коомдук лабораториясы",
      talas: "Талас жаштар тармагы",
    },
    ru: {
      kurak: "Фонд Курак",
      eu: "Европейский союз",
      sfcg: "Search for Common Ground Кыргызстан",
      naryn: "Нарынская общественная лаборатория",
      talas: "Таласская молодежная сеть",
    },
  } satisfies Record<
    ProjectConversationDevLanguage,
    Record<typeof key, string>
  >;

  return names[activeScenarioLanguage.value][key];
}

function createCommentItems({
  count,
}: {
  count: number;
}): DisplayedOpinionItem[] {
  const baseStatements =
    statementContentByLanguage[activeScenarioLanguage.value];
  const generatedStatements: DisplayedOpinionItem[] = [];
  const now = new Date();

  for (let statementIndex = 0; statementIndex < count; statementIndex += 1) {
    const content = baseStatements[statementIndex % baseStatements.length];
    const sequenceNumber = statementIndex + 1;
    generatedStatements.push({
      opinionSlugId: `statement-${sequenceNumber.toString()}`,
      createdAt: now,
      updatedAt: now,
      opinion: `<p>${content}</p>`,
      displayContent: {
        sourceVersion: `00000000-0000-4000-8000-${sequenceNumber.toString().padStart(12, "0")}`,
        status: "available",
        mode: "original",
        content: { content: `<p>${content}</p>` },
        translationControl: null,
      },
      sourceLanguageCode: activeScenarioLanguage.value,
      numParticipants: 24 + (statementIndex % 9) * 5,
      numAgrees: 18 + (statementIndex % 9) * 3,
      numPasses: 4 + (statementIndex % 5),
      numDisagrees: 6 + (statementIndex % 7) * 2,
      username: "project-participant",
      moderation: { status: "unmoderated" },
      isSeed: statementIndex === 0,
    });
  }

  return generatedStatements;
}

const statementContentByLanguage = {
  en: [
    "More co-working space for young professionals and students.",
    "Publish simple updates after each consultation so people know what changed.",
    "Local service centers should have clear online instructions in Kyrgyz and Russian.",
    "Youth councils need small budgets they can actually decide how to spend.",
    "Bring mobile consultation booths to markets and villages, not only city halls.",
    "Public hearings should include summaries that are readable on a phone.",
  ],
  ky: [
    "Жаш адистер жана студенттер үчүн көбүрөөк коворкинг мейкиндиги керек.",
    "Ар бир консультациядан кийин эмне өзгөргөнү тууралуу жөнөкөй жаңыртуулар жарыялансын.",
    "Жергиликтүү кызмат борборлорунда кыргызча жана орусча түшүнүктүү онлайн нускамалар болсун.",
    "Жаштар кеңештеринде өздөрү бөлүштүрө алган чакан бюджеттер болушу керек.",
    "Мобилдик консультация пункттары базарларга жана айылдарга да барсын.",
    "Коомдук угуулар телефондон окууга ыңгайлуу кыскача жыйынтык чыгарсын.",
  ],
  ru: [
    "Нужно больше коворкингов для молодых специалистов и студентов.",
    "После каждой консультации стоит публиковать простые обновления о том, что изменилось.",
    "У местных сервисных центров должны быть понятные онлайн-инструкции на кыргызском и русском.",
    "Молодежным советам нужны небольшие бюджеты, которыми они реально распоряжаются.",
    "Мобильные консультационные точки должны приезжать на рынки и в села, а не только в мэрии.",
    "Публичные слушания должны давать краткие итоги, которые удобно читать с телефона.",
  ],
} satisfies Record<ProjectConversationDevLanguage, readonly string[]>;
</script>

<style scoped lang="scss">
.project-conversation-layout-dev {
  min-height: 100dvh;
}

.project-conversation-layout-dev__controls {
  position: fixed;
  z-index: 10;
  inset-inline-end: 1rem;
  bottom: 1rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1rem;
  max-width: calc(100% - 2rem);
  padding: 0.75rem;
  border: 1px solid rgba($primary, 0.18);
  border-radius: 18px;
  background: rgba(white, 0.92);
  box-shadow: 0 1rem 2.5rem rgba(10, 7, 20, 0.14);
  backdrop-filter: blur(16px);

  p,
  strong {
    margin: 0;
    line-height: 1.2;
  }

  p {
    color: $ink-light;
    font-size: 0.72rem;
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  strong {
    color: $ink-darker;
    font-size: 0.9rem;
  }
}

.project-conversation-layout-dev__controls-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.project-conversation-layout-dev__control-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.project-conversation-layout-dev__show-controls {
  position: fixed;
  z-index: 10;
  inset-inline-end: 1rem;
  bottom: 1rem;
  box-shadow: 0 0.7rem 1.75rem rgba(10, 7, 20, 0.14);
}

.project-conversation-layout-dev__statement-list {
  display: flex;
  flex-direction: column;
  gap: $feed-flex-gap;
}

.project-conversation-layout-dev__statement-card {
  background-color: white;
}

.project-conversation-layout-dev__statement-end {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.8rem 0;
  color: $sky-dark;
  font-size: 0.86rem;
  font-weight: var(--font-weight-semibold);
}

@media (max-width: 680px) {
  .project-conversation-layout-dev__controls {
    inset-inline-start: 0.75rem;
    inset-inline-end: 0.75rem;
    bottom: 0.75rem;
  }
}
</style>
