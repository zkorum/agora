<template>
  <div class="project-page-dev">
    <div class="project-page-dev__scenario-bar">
      <div>
        <p>Dev scenario</p>
        <strong>Project contact variant</strong>
      </div>

      <q-btn-toggle
        v-model="contactScenario"
        unelevated
        no-caps
        toggle-color="primary"
        color="white"
        text-color="primary"
        :options="contactScenarioOptions"
      />
    </div>

    <ProjectPageView
      :project="project"
      :language-options="languageOptions"
      initial-language="en"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  ProjectContact,
  ProjectLanguageOption,
  ProjectPageData,
} from "src/components/project/projectPageTypes";
import ProjectPageView from "src/components/project/ProjectPageView.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { computed, ref } from "vue";

type ContactScenario = "email" | "web" | "both";

usePageLayout({
  enableDrawer: false,
  enableFooter: false,
  enableHeader: false,
});

const contactScenario = ref<ContactScenario>("both");

const contactScenarioOptions: {
  label: string;
  value: ContactScenario;
}[] = [
  { label: "Email only", value: "email" },
  { label: "Web only", value: "web" },
  { label: "Both", value: "both" },
];

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
  {
    label: "Français",
    shortLabel: "FR",
    value: "fr",
    caption: "French",
    searchText: "FR French",
  },
  {
    label: "Español",
    shortLabel: "ES",
    value: "es",
    caption: "Spanish",
    searchText: "ES Spanish",
  },
  {
    label: "العربية",
    shortLabel: "AR",
    value: "ar",
    caption: "Arabic",
    searchText: "AR Arabic",
  },
];

const contactByScenario = {
  email: {
    name: "Aida Saparova",
    roleLabel: "Facilitator",
    affiliationName: "Kurak Foundation",
    email: "aida.saparova@example.org",
    websiteUrl: undefined,
  },
  web: {
    name: "Aida Saparova",
    roleLabel: "Facilitator",
    affiliationName: "Kurak Foundation",
    email: undefined,
    websiteUrl: "https://example.org/project-contact",
  },
  both: {
    name: "Aida Saparova",
    roleLabel: "Facilitator",
    affiliationName: "Kurak Foundation",
    email: "aida.saparova@example.org",
    websiteUrl: "https://example.org/project-contact",
  },
} satisfies Record<ContactScenario, ProjectContact>;

const baseProject = {
  slug: "voices-for-change",
  title: "Voices for Change",
  subtitle: "Civic Dialogue in Kyrgyzstan",
  bodyPlainText:
    "A national consultation gathering ideas from community members, public institutions, and civil-society groups to shape priorities for Kyrgyzstan's future.",
  heroVariant: "blue",
  participantCount: 214,
  voteCount: 2841,
  activityCount: 4,
  activities: [
    {
      slug: "voices-for-change-share-ideas",
      kind: "conversation",
      isClosed: false,
      title: "Share your ideas",
      bodyPlainText:
        "The opening conversation gathers statements from participants about what should change first. Add a statement, react to others, and help surface the priorities that matter across communities.",
      stats: { opinionCount: 62, participantCount: 214, voteCount: 1238 },
    },
    {
      slug: "voices-for-change-rank-priorities",
      kind: "vote",
      isClosed: false,
      title: "Rank the shared priorities",
      bodyPlainText:
        "Compare proposed priorities head to head so the project can understand which ideas feel strongest across the participant group.",
      stats: { opinionCount: 18, participantCount: 188, voteCount: 941 },
    },
    {
      slug: "voices-for-change-youth-access",
      kind: "conversation",
      isClosed: true,
      title: "Youth access to public services",
      bodyPlainText:
        "Participants discussed practical barriers for young people trying to access civic programs, local services, and public decision-making spaces.",
      stats: { opinionCount: 34, participantCount: 126, voteCount: 438 },
    },
    {
      slug: "voices-for-change-final-feedback",
      kind: "vote",
      isClosed: true,
      title: "Select the most useful follow-up actions",
      bodyPlainText:
        "The final ranking asked participants to compare the concrete follow-up actions that project owners could take after the consultation closes.",
      stats: { opinionCount: 12, participantCount: 82, voteCount: 224 },
    },
  ],
  attributions: [
    {
      role: "project_owner",
      displayName: "Kurak Foundation",
      description: "Project coordination and local facilitation.",
      websiteUrl: "https://example.org/kurak-foundation",
      initials: "KF",
      accentColor: "#1A5FB4",
    },
    {
      role: "sponsor",
      displayName: "European Civic Fund",
      description: "Funding partner for civic participation programs.",
      websiteUrl: "https://example.org/european-civic-fund",
      initials: "EU",
      accentColor: "#5538EE",
    },
    {
      role: "partner",
      displayName: "Osh Civic Forum",
      description: "Community outreach partner.",
      websiteUrl: undefined,
      initials: "OF",
      accentColor: "#A05E03",
    },
    {
      role: "partner",
      displayName: "Naryn Community Lab",
      description: "Regional workshop host.",
      websiteUrl: "https://example.org/naryn-community-lab",
      initials: "NL",
      accentColor: "#0E7490",
    },
    {
      role: "partner",
      displayName: "Talas Youth Network",
      description: "Youth participant recruitment partner.",
      websiteUrl: undefined,
      initials: "TY",
      accentColor: "#D8639A",
    },
  ],
} satisfies Omit<ProjectPageData, "contact">;

const project = computed<ProjectPageData>(() => ({
  ...baseProject,
  contact: contactByScenario[contactScenario.value],
}));
</script>

<style scoped lang="scss">
.project-page-dev {
  min-height: 100dvh;
}

.project-page-dev__scenario-bar {
  position: fixed;
  z-index: 10;
  right: 1rem;
  bottom: 1rem;
  display: flex;
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

@media (max-width: 680px) {
  .project-page-dev__scenario-bar {
    right: 0.75rem;
    bottom: 0.75rem;
    left: 0.75rem;
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
