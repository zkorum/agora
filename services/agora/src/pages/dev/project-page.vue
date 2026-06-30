<template>
  <div class="project-page-dev">
    <div v-if="controlsVisible" class="project-page-dev__scenario-bar">
      <div class="project-page-dev__scenario-header">
        <div>
          <p>Dev controls</p>
          <strong>Project page variants</strong>
        </div>

        <div class="project-page-dev__scenario-header-actions">
          <q-btn
            dense
            round
            flat
            icon="mdi-close"
            aria-label="Hide dev controls"
            @click="controlsVisible = false"
          />
        </div>
      </div>

      <div class="project-page-dev__scenario-controls">
        <q-btn-toggle
          v-model="activityStatusScenario"
          unelevated
          no-caps
          toggle-color="primary"
          color="white"
          text-color="primary"
          :options="activityStatusScenarioOptions"
        />

        <q-btn-toggle
          v-model="contactScenario"
          unelevated
          no-caps
          toggle-color="primary"
          color="white"
          text-color="primary"
          :options="contactScenarioOptions"
        />

        <q-btn-toggle
          v-model="activityVolumeScenario"
          unelevated
          no-caps
          toggle-color="primary"
          color="white"
          text-color="primary"
          :options="activityVolumeScenarioOptions"
        />

        <q-btn-toggle
          v-model="bodyLengthScenario"
          unelevated
          no-caps
          toggle-color="primary"
          color="white"
          text-color="primary"
          :options="bodyLengthScenarioOptions"
        />
      </div>
    </div>

    <q-btn
      v-else
      class="project-page-dev__show-controls"
      unelevated
      no-caps
      color="primary"
      icon="mdi-tune"
      label="Show dev controls"
      @click="controlsVisible = true"
    />

    <ProjectPageView
      v-model:selected-language="selectedLanguage"
      :project="project"
      :activities="activities"
      :can-load-more-activities="false"
      :is-loading-more-activities="false"
      :is-requesting-project-translation="false"
      :language-options="languageOptions"
      initial-language="en"
      @request-project-translation="ignoreProjectTranslationRequest"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  ProjectActivity,
  ProjectContact,
  ProjectLanguageOption,
  ProjectPageData,
} from "src/components/project/projectPageTypes";
import ProjectPageView from "src/components/project/ProjectPageView.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { computed, ref } from "vue";

type ContactScenario = "email" | "web" | "both";
type ActivityStatusScenario = "mixed" | "closed" | "empty";
type ActivityVolumeScenario = "default" | "many" | "lots";
type BodyLengthScenario =
  | "normal"
  | "long-project"
  | "long-cards"
  | "long-both";
type ProjectPageLanguage = "en" | "ky" | "ru";
type DevAttributionKey =
  | "civicUnion"
  | "europeanUnion"
  | "searchForCommonGround";
type DevProjectAttribution = ProjectPageData["attributions"][number] & {
  devKey?: DevAttributionKey;
};
type BaseDevActivity = Omit<
  ProjectActivity,
  | "bodyPlainText"
  | "dynamicTranslationEnabled"
  | "machineTranslation"
  | "originalContent"
  | "sourceLanguageCode"
  | "title"
>;
type BaseDevProjectData = Omit<
  ProjectPageData,
  "activityCount" | "attributions" | "contact" | "participantCount" | "voteCount"
>;

usePageLayout({
  enableDrawer: false,
  enableFooter: false,
  enableHeader: false,
});

const contactScenario = ref<ContactScenario>("both");
const activityStatusScenario = ref<ActivityStatusScenario>("mixed");
const activityVolumeScenario = ref<ActivityVolumeScenario>("default");
const bodyLengthScenario = ref<BodyLengthScenario>("normal");
const selectedLanguage = ref<string | readonly string[]>("en");
const controlsVisible = ref(true);

const contactScenarioOptions: {
  label: string;
  value: ContactScenario;
}[] = [
  { label: "Email only", value: "email" },
  { label: "Web only", value: "web" },
  { label: "Both", value: "both" },
];

const activityStatusScenarioOptions: {
  label: string;
  value: ActivityStatusScenario;
}[] = [
  { label: "Live + closed", value: "mixed" },
  { label: "Closed only", value: "closed" },
  { label: "No activities", value: "empty" },
];

const activityVolumeScenarioOptions: {
  label: string;
  value: ActivityVolumeScenario;
}[] = [
  { label: "4 activities", value: "default" },
  { label: "48 activities", value: "many" },
  { label: "240 activities", value: "lots" },
];

const bodyLengthScenarioOptions: {
  label: string;
  value: BodyLengthScenario;
}[] = [
  { label: "Normal text", value: "normal" },
  { label: "Long project", value: "long-project" },
  { label: "Long cards", value: "long-cards" },
  { label: "Long both", value: "long-both" },
];

const localProjectAssetBaseUrl = "/local-project-assets/project-page";

const projectBannerImageUrlsByLanguage = {
  en: `${localProjectAssetBaseUrl}/project-banner-en.png`,
  ky: `${localProjectAssetBaseUrl}/project-banner-ky.png`,
  ru: `${localProjectAssetBaseUrl}/project-banner-ru.png`,
} satisfies Readonly<Record<string, string>>;

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
} satisfies Readonly<Record<ProjectPageLanguage, string>>;

const attributionImageUrls = {
  civicUnion: civicUnionImageUrlsByLanguage.en,
  europeanUnion: `${localProjectAssetBaseUrl}/eu-funded-logo.png`,
  searchForCommonGround: `${localProjectAssetBaseUrl}/search-common-ground-logo.png`,
} satisfies Readonly<Record<string, string>>;

const activityCountByScenario = {
  default: 4,
  many: 48,
  lots: 240,
} satisfies Record<ActivityVolumeScenario, number>;

const projectContentByLanguage = {
  en: {
    title: "Amplify: Civil Society Collaboration",
    subtitle: "Local to national solutions in Kyrgyzstan",
    bodyPlainText:
      "A consultation gathering ideas from civil-society organizations, community members, and public institutions to identify shared priorities and practical solutions across Kyrgyzstan.",
    longBodyPlainText: [
      "A consultation gathering ideas from civil-society organizations, community members, and public institutions to identify shared priorities and practical solutions across Kyrgyzstan.",
      "This dev scenario intentionally makes the project description long enough to trigger the shared show more and show less behavior reused from conversation pages.",
      "Use it to verify that the intro starts collapsed, keeps the metrics close to the banner, expands without losing readable spacing, and collapses back while preserving the visual rhythm of the page.",
      "The text also includes a second paragraph break so the plain-text rendering path can be checked alongside the overflow detection.",
    ].join("\n\n"),
  },
  ky: {
    title: "Кереге: жарандык коомдун кызматташуусу",
    subtitle: "Кыргызстанда жергиликтүү жана улуттук чечимдер",
    bodyPlainText:
      "Кыргызстан боюнча жалпы артыкчылыктарды жана практикалык чечимдерди аныктоо үчүн жарандык коом уюмдарынан, коомчулук мүчөлөрүнөн жана мамлекеттик институттардан идеяларды чогулткан консультация.",
    longBodyPlainText: [
      "Кыргызстан боюнча жалпы артыкчылыктарды жана практикалык чечимдерди аныктоо үчүн жарандык коом уюмдарынан, коомчулук мүчөлөрүнөн жана мамлекеттик институттардан идеяларды чогулткан консультация.",
      "Бул dev сценарий долбоордун сүрөттөмөсүн узун кылып, сүйлөшүү барактарында колдонулган show more жана show less жүрүм-турумун текшерүүгө арналган.",
      "Киришүү башында жыйналып турарын, көрсөткүчтөр баннерге жакын каларын жана ачылганда да барактын ритми сакталарына көз салыңыз.",
      "Текстте экинчи абзац да бар, ошондуктан plain-text көрсөтүү жолу жана ашып кеткен текстти аныктоо бирге текшерилет.",
    ].join("\n\n"),
  },
  ru: {
    title: "Кереге: сотрудничество гражданского общества",
    subtitle: "Решения от местного до национального уровня в Кыргызстане",
    bodyPlainText:
      "Консультация собирает идеи от организаций гражданского общества, жителей и государственных институтов, чтобы определить общие приоритеты и практические решения для Кыргызстана.",
    longBodyPlainText: [
      "Консультация собирает идеи от организаций гражданского общества, жителей и государственных институтов, чтобы определить общие приоритеты и практические решения для Кыргызстана.",
      "Этот dev-сценарий намеренно делает описание проекта достаточно длинным, чтобы проверить поведение show more и show less, переиспользованное со страниц обсуждений.",
      "Проверьте, что вступление сначала свернуто, метрики остаются рядом с баннером, а раскрытие и повторное сворачивание сохраняют визуальный ритм страницы.",
      "В тексте также есть второй абзац, чтобы проверить plain-text отображение и определение переполнения.",
    ].join("\n\n"),
  },
} satisfies Record<
  ProjectPageLanguage,
  {
    title: string;
    subtitle: string;
    bodyPlainText: string;
    longBodyPlainText: string;
  }
>;

const languageOptions: readonly ProjectLanguageOption[] = [
  {
    label: "English",
    shortLabel: "EN",
    value: "en",
    caption: "Default language",
    searchText: "EN English",
  },
  {
    label: "Кыргызча",
    shortLabel: "KY",
    value: "ky",
    caption: "Kyrgyz",
    searchText: "KY Kyrgyz",
  },
  {
    label: "Русский",
    shortLabel: "RU",
    value: "ru",
    caption: "Russian",
    searchText: "RU Russian",
  },
];

const contactByScenario = {
  email: {
    name: "Aida Saparova",
    roleLabel: "Facilitator",
    affiliationName: "Kurak Foundation",
    imageUrl: undefined,
    email: "aida.saparova@example.org",
    websiteUrl: undefined,
  },
  web: {
    name: "Aida Saparova",
    roleLabel: "Facilitator",
    affiliationName: "Kurak Foundation",
    imageUrl: undefined,
    email: undefined,
    websiteUrl: "https://example.org/project-contact",
  },
  both: {
    name: "Aida Saparova",
    roleLabel: "Facilitator",
    affiliationName: "Kurak Foundation",
    imageUrl: undefined,
    email: "aida.saparova@example.org",
    websiteUrl: "https://example.org/project-contact",
  },
} satisfies Record<ContactScenario, ProjectContact>;

const contactLocalizationByLanguage = {
  en: {
    name: "Aida Saparova",
    roleLabel: "Facilitator",
    affiliationName: "Search for Common Ground Kyrgyzstan",
    imageUrl: attributionImageUrls.searchForCommonGround,
  },
  ky: {
    name: "Айда Сапарова (KG)",
    roleLabel: "Фасилитатор",
    affiliationName: "Граждандык союз",
    imageUrl: civicUnionImageUrlsByLanguage.ky,
  },
  ru: {
    name: "Аида Сапарова (RU)",
    roleLabel: "Координатор проекта",
    affiliationName: "Европейский союз",
    imageUrl: attributionImageUrls.europeanUnion,
  },
} satisfies Record<
  ProjectPageLanguage,
  Pick<ProjectContact, "name" | "roleLabel" | "affiliationName" | "imageUrl">
>;

const attributionLocalizationByLanguage = {
  en: {
    europeanUnion: {
      displayName: "European Union",
      imageUrl: attributionImageUrls.europeanUnion,
    },
    searchForCommonGround: {
      displayName: "Search for Common Ground",
      imageUrl: attributionImageUrls.searchForCommonGround,
    },
    civicUnion: {
      displayName: "Civic Union",
      imageUrl: civicUnionImageUrlsByLanguage.en,
    },
  },
  ky: {
    europeanUnion: {
      displayName: "Европа Биримдиги",
      imageUrl: attributionImageUrls.europeanUnion,
    },
    searchForCommonGround: {
      displayName: "Search for Common Ground Кыргызстан",
      imageUrl: attributionImageUrls.searchForCommonGround,
    },
    civicUnion: {
      displayName: "Граждандык союз",
      imageUrl: civicUnionImageUrlsByLanguage.ky,
    },
  },
  ru: {
    europeanUnion: {
      displayName: "Европейский союз",
      imageUrl: attributionImageUrls.europeanUnion,
    },
    searchForCommonGround: {
      displayName: "Search for Common Ground Кыргызстан",
      imageUrl: attributionImageUrls.searchForCommonGround,
    },
    civicUnion: {
      displayName: "Гражданский союз",
      imageUrl: civicUnionImageUrlsByLanguage.ru,
    },
  },
} satisfies Record<
  ProjectPageLanguage,
  Record<
    "civicUnion" | "europeanUnion" | "searchForCommonGround",
    Pick<ProjectPageData["attributions"][number], "displayName" | "imageUrl">
  >
>;

const activityLocalizationByLanguage = {
  en: [
    {
      title: "Share your ideas",
      bodyPlainText:
        "The opening conversation gathers statements from participants about what should change first. Add a statement, react to others, and help surface the priorities that matter across communities.",
    },
    {
      title: "Rank the shared priorities",
      bodyPlainText:
        "Compare proposed priorities head to head so the project can understand which ideas feel strongest across the participant group.",
    },
    {
      title: "Youth access to public services",
      bodyPlainText:
        "Participants discussed practical barriers for young people trying to access civic programs, local services, and public decision-making spaces.",
    },
    {
      title: "Select the most useful follow-up actions",
      bodyPlainText:
        "The final ranking asked participants to compare the concrete follow-up actions that project owners could take after the consultation closes.",
    },
  ],
  ky: [
    {
      title: "Идеяларыңыз менен бөлүшүңүз",
      bodyPlainText:
        "Ачылыш сүйлөшүүсү катышуучулардан биринчи кезекте эмне өзгөрүшү керектиги тууралуу сунуштарды чогултат. Сунуш кошуп, башкаларга жооп берип, коомдор үчүн маанилүү артыкчылыктарды алдыга чыгарыңыз.",
    },
    {
      title: "Жалпы артыкчылыктарды рейтингдеңиз",
      bodyPlainText:
        "Сунушталган артыкчылыктарды бири-бири менен салыштырып, катышуучулар үчүн кайсы идеялар күчтүү экенин түшүнүүгө жардам бериңиз.",
    },
    {
      title: "Жаштардын мамлекеттик кызматтарга жеткиликтүүлүгү",
      bodyPlainText:
        "Катышуучулар жаштардын жарандык программаларга, жергиликтүү кызматтарга жана коомдук чечим кабыл алуу мейкиндиктерине жетүүсүндөгү тоскоолдуктарды талкуулашты.",
    },
    {
      title: "Эң пайдалуу кийинки аракеттерди тандаңыз",
      bodyPlainText:
        "Жыйынтыктоочу рейтинг консультация аяктагандан кийин долбоор ээлери жасай ала турган конкреттүү кийинки аракеттерди салыштырды.",
    },
  ],
  ru: [
    {
      title: "Поделитесь идеями",
      bodyPlainText:
        "Стартовое обсуждение собирает предложения участников о том, что стоит изменить в первую очередь. Добавьте предложение, реагируйте на другие и помогите выявить общие приоритеты.",
    },
    {
      title: "Оцените общие приоритеты",
      bodyPlainText:
        "Сравнивайте предложенные приоритеты попарно, чтобы проект мог понять, какие идеи участники считают наиболее сильными.",
    },
    {
      title: "Доступ молодежи к государственным услугам",
      bodyPlainText:
        "Участники обсудили практические барьеры для молодых людей при доступе к гражданским программам, местным услугам и пространствам принятия решений.",
    },
    {
      title: "Выберите самые полезные дальнейшие действия",
      bodyPlainText:
        "Финальный рейтинг предложил участникам сравнить конкретные дальнейшие действия, которые владельцы проекта могут предпринять после завершения консультации.",
    },
  ],
} satisfies Record<
  ProjectPageLanguage,
  readonly [
    Pick<ProjectActivity, "title" | "bodyPlainText">,
    Pick<ProjectActivity, "title" | "bodyPlainText">,
    Pick<ProjectActivity, "title" | "bodyPlainText">,
    Pick<ProjectActivity, "title" | "bodyPlainText">,
  ]
>;

const baseActivities = [
  {
    slug: "voices-for-change-share-ideas",
    kind: "conversation",
    isClosed: false,
    stats: { opinionCount: 62, participantCount: 214, voteCount: 1238 },
  },
  {
    slug: "voices-for-change-rank-priorities",
    kind: "vote",
    isClosed: false,
    stats: { opinionCount: 18, participantCount: 188, voteCount: 941 },
  },
  {
    slug: "voices-for-change-youth-access",
    kind: "conversation",
    isClosed: true,
    stats: { opinionCount: 34, participantCount: 126, voteCount: 438 },
  },
  {
    slug: "voices-for-change-final-feedback",
    kind: "vote",
    isClosed: true,
    stats: { opinionCount: 12, participantCount: 82, voteCount: 224 },
  },
] satisfies readonly [
  BaseDevActivity,
  BaseDevActivity,
  BaseDevActivity,
  BaseDevActivity,
];

const baseAttributions = [
  {
    devKey: "searchForCommonGround",
    role: "project_owner",
    displayName: "Search for Common Ground",
    description: "Project coordination and peacebuilding expertise.",
    websiteUrl: "https://www.searchforcommonground.org/",
    initials: "SFCG",
    accentColor: "#005EB8",
    imageUrl: attributionImageUrls.searchForCommonGround,
  },
  {
    devKey: "europeanUnion",
    role: "sponsor",
    displayName: "European Union",
    description: "Funding partner for civic participation programs.",
    websiteUrl: "https://european-union.europa.eu/",
    initials: "EU",
    accentColor: "#003399",
    imageUrl: attributionImageUrls.europeanUnion,
  },
  {
    devKey: "civicUnion",
    role: "partner",
    displayName: "Civic Union",
    description: "Local implementation and community outreach partner.",
    websiteUrl: undefined,
    initials: "CU",
    accentColor: "#F28A20",
    imageUrl: attributionImageUrls.civicUnion,
  },
  {
    role: "partner",
    displayName: "Naryn Community Lab",
    description: "Regional workshop host.",
    websiteUrl: "https://example.org/naryn-community-lab",
    initials: "NL",
    accentColor: "#0E7490",
    imageUrl: undefined,
  },
  {
    role: "partner",
    displayName: "Talas Youth Network",
    description: "Youth participant recruitment partner.",
    websiteUrl: undefined,
    initials: "TY",
    accentColor: "#D8639A",
    imageUrl: undefined,
  },
] satisfies readonly DevProjectAttribution[];

const baseProject = {
  slug: "amplify-civil-society-kyrgyzstan",
  title: "Amplify: Civil Society Collaboration",
  subtitle: "Local to national solutions in Kyrgyzstan",
  bodyHtml:
    "A consultation gathering ideas from civil-society organizations, community members, and public institutions to identify shared priorities and practical solutions across Kyrgyzstan.",
  originalContent: {
    title: "Amplify: Civil Society Collaboration",
    subtitle: "Local to national solutions in Kyrgyzstan",
    bodyHtml:
      "A consultation gathering ideas from civil-society organizations, community members, and public institutions to identify shared priorities and practical solutions across Kyrgyzstan.",
  },
  machineTranslation: undefined,
  bannerVariant: "blue",
  bannerImageUrl: projectBannerImageUrlsByLanguage.en,
} satisfies BaseDevProjectData;

const selectedProjectLanguage = computed<ProjectPageLanguage>(() => {
  const value = Array.isArray(selectedLanguage.value)
    ? selectedLanguage.value.at(0)
    : selectedLanguage.value;

  return normalizeProjectPageLanguage({ value });
});

const projectContent = computed(
  () => projectContentByLanguage[selectedProjectLanguage.value]
);

const activities = computed<readonly ProjectActivity[]>(() => {
  if (activityStatusScenario.value === "empty") {
    return [];
  }

  const activityCount = activityCountByScenario[activityVolumeScenario.value];
  let scenarioActivities: readonly BaseDevActivity[];
  const useGeneratedActivityLabels = activityCount !== baseActivities.length;

  if (activityCount === baseActivities.length) {
    scenarioActivities = baseActivities;
  } else {
    const generatedActivities: BaseDevActivity[] = [];

    for (
      let activityIndex = 0;
      activityIndex < activityCount;
      activityIndex += 1
    ) {
      generatedActivities.push(createGeneratedActivity({ activityIndex }));
    }

    scenarioActivities = generatedActivities;
  }

  const localizedActivities = scenarioActivities.map(
    (activity, activityIndex) =>
      localizeActivity({
        activity,
        activityIndex,
        language: selectedProjectLanguage.value,
        useGeneratedActivityLabels,
      })
  );

  const activitiesWithBodyLength = hasLongActivityBodies({
    scenario: bodyLengthScenario.value,
  })
    ? localizedActivities.map((activity, activityIndex) => {
        const bodyPlainText = createLongActivityBody({
          activity,
          activityIndex,
          language: selectedProjectLanguage.value,
        });
        return {
          ...activity,
          bodyPlainText,
          originalContent: {
            ...activity.originalContent,
            bodyPlainText,
          },
        };
      })
    : localizedActivities;

  if (activityStatusScenario.value === "closed") {
    return activitiesWithBodyLength.map((activity) => ({
      ...activity,
      isClosed: true,
    }));
  }

  return activitiesWithBodyLength;
});

const project = computed<ProjectPageData>(() => ({
  ...baseProject,
  attributions: localizeAttributions({
    attributions: baseAttributions,
    language: selectedProjectLanguage.value,
  }),
  title: projectContent.value.title,
  subtitle: projectContent.value.subtitle,
  bodyHtml: hasLongProjectBody({ scenario: bodyLengthScenario.value })
    ? projectContent.value.longBodyPlainText
    : projectContent.value.bodyPlainText,
  originalContent: {
    title: projectContent.value.title,
    subtitle: projectContent.value.subtitle,
    bodyHtml: hasLongProjectBody({ scenario: bodyLengthScenario.value })
      ? projectContent.value.longBodyPlainText
      : projectContent.value.bodyPlainText,
  },
  machineTranslation: undefined,
  bannerImageUrl: projectBannerImageUrlsByLanguage[selectedProjectLanguage.value],
  participantCount: calculateParticipantCount({ activities: activities.value }),
  voteCount: calculateVoteCount({ activities: activities.value }),
  activityCount: activities.value.length,
  contact: localizeContact({
    contact: contactByScenario[contactScenario.value],
    language: selectedProjectLanguage.value,
  }),
}));

function normalizeProjectPageLanguage({
  value,
}: {
  value: string | undefined;
}): ProjectPageLanguage {
  switch (value) {
    case "en":
      return "en";
    case "ky":
      return "ky";
    case "ru":
      return "ru";
    case undefined:
      return "en";
    default:
      return "en";
  }
}

function localizeContact({
  contact,
  language,
}: {
  contact: ProjectContact;
  language: ProjectPageLanguage;
}): ProjectContact {
  return {
    ...contact,
    ...contactLocalizationByLanguage[language],
  };
}

function localizeAttributions({
  attributions,
  language,
}: {
  attributions: readonly DevProjectAttribution[];
  language: ProjectPageLanguage;
}): ProjectPageData["attributions"] {
  return attributions.map((attribution) => {
    const localization =
      attribution.devKey === undefined
        ? undefined
        : attributionLocalizationByLanguage[language][attribution.devKey];

    return {
      role: attribution.role,
      displayName: localization?.displayName ?? attribution.displayName,
      description: attribution.description,
      websiteUrl: attribution.websiteUrl,
      initials: attribution.initials,
      accentColor: attribution.accentColor,
      imageUrl: localization?.imageUrl ?? attribution.imageUrl,
    };
  });
}

function ignoreProjectTranslationRequest(): void {}

function localizeActivity({
  activity,
  activityIndex,
  language,
  useGeneratedActivityLabels,
}: {
  activity: BaseDevActivity;
  activityIndex: number;
  language: ProjectPageLanguage;
  useGeneratedActivityLabels: boolean;
}): ProjectActivity {
  const localization =
    activityLocalizationByLanguage[language][
      activityIndex % baseActivities.length
    ];
  const activityNumber = activityIndex + 1;
  const roundNumber = Math.floor(activityIndex / baseActivities.length) + 1;

  return {
    ...activity,
    title: useGeneratedActivityLabels
      ? `${localization.title} ${activityNumber.toString()}`
      : localization.title,
    bodyPlainText: useGeneratedActivityLabels
      ? `${localization.bodyPlainText} ${localizedGeneratedActivitySuffix({
          language,
          roundNumber,
        })}`
      : localization.bodyPlainText,
    originalContent: {
      title: useGeneratedActivityLabels
        ? `${localization.title} ${activityNumber.toString()}`
        : localization.title,
      bodyPlainText: useGeneratedActivityLabels
        ? `${localization.bodyPlainText} ${localizedGeneratedActivitySuffix({
            language,
            roundNumber,
          })}`
        : localization.bodyPlainText,
    },
    sourceLanguageCode: language,
    dynamicTranslationEnabled: false,
    machineTranslation: undefined,
  };
}

function localizedGeneratedActivitySuffix({
  language,
  roundNumber,
}: {
  language: ProjectPageLanguage;
  roundNumber: number;
}): string {
  switch (language) {
    case "ky":
      return `Бул ${roundNumber.toString()}-айлампадагы generated пункт узун долбоор барактарын жана infinite loading жүрүм-турумун текшерүү үчүн кошулган.`;
    case "ru":
      return `Этот generated пункт раунда ${roundNumber.toString()} добавлен для проверки длинных страниц проекта и infinite loading.`;
    case "en":
      return `This generated round ${roundNumber.toString()} item is here to test long project pages and infinite loading behavior.`;
  }
}

function hasLongProjectBody({
  scenario,
}: {
  scenario: BodyLengthScenario;
}): boolean {
  return scenario === "long-project" || scenario === "long-both";
}

function hasLongActivityBodies({
  scenario,
}: {
  scenario: BodyLengthScenario;
}): boolean {
  return scenario === "long-cards" || scenario === "long-both";
}

function createLongActivityBody({
  activity,
  activityIndex,
  language,
}: {
  activity: ProjectActivity;
  activityIndex: number;
  language: ProjectPageLanguage;
}): string {
  const activityNumber = activityIndex + 1;

  const extraSentencesByLanguage = {
    en: [
      `Dev clamp test ${activityNumber.toString()}: this extra copy should overflow the card body and prove that the activity preview stays at three lines with an ellipsis instead of stretching the card.`,
      "The participant should still understand the activity from the first lines, while the rest remains hidden until they open the activity itself.",
      "Additional sentence for narrow mobile widths, where the clamp should still hold without pushing the stats or action button too far down.",
    ],
    ky: [
      `Dev clamp test ${activityNumber.toString()}: бул кошумча текст карточканын body бөлүгүнөн ашып, preview үч сапта ellipsis менен токторун текшериши керек.`,
      "Катышуучу иш-аракетти биринчи саптардан түшүнө алышы керек, ал эми калган текст иш-аракет ачылганга чейин жашырылып турат.",
      "Тар мобилдик экрандар үчүн кошумча сүйлөм: clamp статистиканы же action button'ду өтө ылдый түртпөшү керек.",
    ],
    ru: [
      `Dev clamp test ${activityNumber.toString()}: этот дополнительный текст должен переполнить body карточки и подтвердить, что preview остается в три строки с ellipsis.`,
      "Участник должен понимать активность по первым строкам, а остальной текст остается скрытым до открытия самой активности.",
      "Дополнительное предложение для узких мобильных экранов, где clamp не должен слишком сильно сдвигать статистику или action button вниз.",
    ],
  } satisfies Record<ProjectPageLanguage, readonly string[]>;

  return [activity.bodyPlainText, ...extraSentencesByLanguage[language]].join(
    " "
  );
}

function createGeneratedActivity({
  activityIndex,
}: {
  activityIndex: number;
}): BaseDevActivity {
  const baseActivity = getBaseActivity({ activityIndex });
  const activityNumber = activityIndex + 1;

  return {
    ...baseActivity,
    slug: `${baseActivity.slug}-${activityNumber}`,
    isClosed: activityIndex % 5 === 2 || activityIndex % 7 === 4,
    stats: {
      opinionCount: baseActivity.stats.opinionCount + (activityIndex % 9) * 3,
      participantCount:
        baseActivity.stats.participantCount + Math.floor(activityIndex * 1.7),
      voteCount: baseActivity.stats.voteCount + activityIndex * 19,
    },
  };
}

function getBaseActivity({
  activityIndex,
}: {
  activityIndex: number;
}): BaseDevActivity {
  switch (activityIndex % baseActivities.length) {
    case 0:
      return baseActivities[0];
    case 1:
      return baseActivities[1];
    case 2:
      return baseActivities[2];
    default:
      return baseActivities[3];
  }
}

function calculateParticipantCount({
  activities,
}: {
  activities: readonly ProjectActivity[];
}): number {
  let participantCount = 0;

  for (const activity of activities) {
    participantCount = Math.max(
      participantCount,
      activity.stats.participantCount
    );
  }

  return participantCount;
}

function calculateVoteCount({
  activities,
}: {
  activities: readonly ProjectActivity[];
}): number {
  let voteCount = 0;

  for (const activity of activities) {
    voteCount += activity.stats.voteCount;
  }

  return voteCount;
}
</script>

<style scoped lang="scss">
.project-page-dev {
  min-height: 100dvh;
}

.project-page-dev__scenario-bar {
  position: fixed;
  z-index: 10;
  inset-inline-end: 1rem;
  bottom: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
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

.project-page-dev__scenario-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}

.project-page-dev__scenario-header-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.project-page-dev__scenario-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.project-page-dev__show-controls {
  position: fixed;
  z-index: 10;
  inset-inline-end: 1rem;
  bottom: 1rem;
  box-shadow: 0 0.7rem 1.75rem rgba(10, 7, 20, 0.14);
}

@media (max-width: 680px) {
  .project-page-dev__scenario-bar {
    inset-inline-start: 0.75rem;
    inset-inline-end: 0.75rem;
    bottom: 0.75rem;
    top: auto;
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
