<template>
  <article class="project-conversation-header-card">
    <div class="project-conversation-header-card__title-block">
      <div class="project-conversation-header-card__context-row">
        <nav
          class="project-conversation-header-card__breadcrumb"
          :aria-label="t({ key: 'projectDetailsAriaLabel' })"
        >
          <SpaLink
            :to="projectRoute"
            class="project-conversation-header-card__breadcrumb-link"
          >
            {{ projectTitle }}
          </SpaLink>
          <q-icon
            :name="breadcrumbIcon"
            size="1.1rem"
            class="project-conversation-header-card__breadcrumb-icon"
            aria-hidden="true"
          />
          <span class="project-conversation-header-card__breadcrumb-current">
            {{ t({ key: "conversationType" }) }}
          </span>
          <span class="project-conversation-header-card__breadcrumb-separator"
            >•</span
          >
          <ContentMetadataLine
            :created-at="conversationData.metadata.createdAt"
            :is-edited="conversationData.metadata.isEdited"
            :edited-label="userIdentityText.edited"
          />
        </nav>

        <div class="project-conversation-header-card__post-menu">
          <PostMetadata
            :author-verified="false"
            :poster-user-name="conversationData.metadata.authorUsername"
            :author-username="conversationData.metadata.authorUsername"
            :created-at="new Date(conversationData.metadata.createdAt)"
            :is-edited="conversationData.metadata.isEdited"
            :post-slug-id="conversationData.metadata.conversationSlugId"
            :organization-url="
              conversationData.metadata.organization?.imageUrl ?? ''
            "
            :organization-name="
              conversationData.metadata.organization?.name ?? ''
            "
            :participation-mode="conversationData.metadata.participationMode"
            :is-closed="conversationData.metadata.isClosed"
            :conversation-title="displayedTitle"
            :conversation-type-config="conversationData.metadata"
            :external-source-config="
              conversationData.metadata.externalSourceConfig ?? null
            "
            :show-identity-card="false"
            :project-slug="project.slug"
            @conversation-deleted="emit('conversationDeleted')"
          />
        </div>
      </div>

      <div class="project-conversation-header-card__title-row">
        <ContentTranslationControl
          v-if="translationPreview?.isAvailable === true"
          :model-value="translationPreview.mode"
          :source-language-label="translationPreview.sourceLanguageLabel"
          :translation-status="translationPreview.translationStatus"
          class="project-conversation-header-card__translation-control"
          @update:model-value="setTranslationMode"
        />

        <ConversationTitle
          :is-private="!conversationData.metadata.isIndexed"
          :title="displayedTitle"
          size="medium"
          :conversation-type-config="conversationData.metadata"
          :external-source-config="
            conversationData.metadata.externalSourceConfig ?? null
          "
          :project-context="undefined"
          project-context-title-mode="original"
        />
      </div>

      <div
        v-if="displayedBody !== undefined && displayedBody.length > 0"
        class="project-conversation-header-card__conversation-body"
      >
        <ZKHtmlContent
          :html-body="displayedBody"
          :compact-mode="false"
          :enable-links="true"
          :desktop-collapsed-line-count="18"
        />
      </div>

      <div class="project-conversation-header-card__status-badges">
        <ZKChip
          :color="participationStatusBadge.color"
          class="project-conversation-header-card__status-badge"
        >
          <q-icon :name="participationStatusBadge.icon" size="0.78rem" />
          <span>{{ participationStatusBadge.label }}</span>
        </ZKChip>
      </div>
    </div>

    <div
      v-if="hasMobileProjectDetails"
      class="project-conversation-header-card__mobile-project-details"
    >
      <button
        type="button"
        class="project-conversation-header-card__mobile-project-details-button"
        :class="{
          'project-conversation-header-card__mobile-project-details-button--without-logos':
            !hasMobileProjectDetailLogos,
        }"
        @click="showMobileProjectDetails = true"
      >
        <span
          v-if="hasMobileProjectDetailLogos"
          class="project-conversation-header-card__mobile-project-details-logos"
          aria-hidden="true"
        >
          <span
            v-for="entry in mobileAttributionPreviewEntries"
            :key="`${entry.role}-${entry.displayName}`"
            class="project-conversation-header-card__mobile-project-details-logo"
            :class="{
              'project-conversation-header-card__mobile-project-details-logo--image':
                entry.imageUrl !== undefined,
            }"
            :style="
              entry.imageUrl === undefined
                ? logoStyle(entry.accentColor)
                : undefined
            "
          >
            <OrganizationImage
              v-if="entry.imageUrl !== undefined"
              class="project-conversation-header-card__mobile-project-details-logo-image"
              height="100%"
              :organization-image-url="entry.imageUrl"
              :organization-name="entry.displayName"
            />
            <template v-else>{{ entry.initials }}</template>
          </span>

          <span
            v-if="mobileAttributionHiddenCount > 0"
            class="project-conversation-header-card__mobile-project-details-logo project-conversation-header-card__mobile-project-details-logo--more"
          >
            +{{ mobileAttributionHiddenCount }}
          </span>
        </span>

        <span
          class="project-conversation-header-card__mobile-project-details-summary"
        >
          {{ mobileProjectDetailsSummary }}
        </span>

        <q-icon
          :name="breadcrumbIcon"
          size="1.1rem"
          class="project-conversation-header-card__mobile-project-details-chevron"
          aria-hidden="true"
        />
      </button>
    </div>

    <q-dialog v-model="showMobileProjectDetails" position="bottom">
      <ZKBottomDialogContainer show-close-button>
        <ProjectDetailsAside
          :attributions="project.attributions"
          :contact="project.contact"
          :language-code="selectedLanguage"
        />
      </ZKBottomDialogContainer>
    </q-dialog>
  </article>
</template>

<script setup lang="ts">
import OrganizationImage from "src/components/account/OrganizationImage.vue";
import ConversationTitle from "src/components/features/conversation/ConversationTitle.vue";
import {
  type UserIdentityCardTranslations,
  userIdentityCardTranslations,
} from "src/components/features/user/UserIdentityCard.i18n";
import PostMetadata from "src/components/post/display/PostMetadata.vue";
import ContentTranslationControl from "src/components/translation/ContentTranslationControl.vue";
import ContentMetadataLine from "src/components/ui-library/ContentMetadataLine.vue";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKChip from "src/components/ui-library/ZKChip.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import {
  getLanguageTextDirection,
  parseSupportedDisplayLanguageOrUndefined,
  type SupportedDisplayLanguageCodes,
} from "src/shared/languages";
import type { ConversationContentFetchResponse } from "src/shared/types/dto";
import type {
  ExtendedConversation,
  ExtendedConversationDisplayData,
  ParticipationMode,
} from "src/shared/types/zod";
import { useConversationDisplayContent } from "src/utils/translation/useConversationDisplayContent";
import { computed, ref } from "vue";
import type { RouteLocationRaw } from "vue-router";

import ProjectDetailsAside from "./ProjectDetailsAside.vue";
import {
  type ProjectPageTranslations,
  translateProjectPageText,
} from "./projectPageI18n";
import type { ProjectAttribution, ProjectPageData } from "./projectPageTypes";

interface ProjectConversationStatusBadge {
  key: string;
  label: string;
  icon: string;
  color: "muted";
}

const props = defineProps<{
  project: ProjectPageData;
  conversationData: ExtendedConversation | ExtendedConversationDisplayData;
  initialDisplayContent?: ConversationContentFetchResponse;
  selectedLanguage: SupportedDisplayLanguageCodes;
}>();

const emit = defineEmits<{
  conversationDeleted: [];
}>();

const showMobileProjectDetails = ref(false);
const selectedSupportedLanguage = computed(
  () => parseSupportedDisplayLanguageOrUndefined(props.selectedLanguage) ?? "en"
);
const userIdentityText = computed<UserIdentityCardTranslations>(
  () => userIdentityCardTranslations[selectedSupportedLanguage.value]
);
const projectRoute = computed<RouteLocationRaw>(() => ({
  path: `/project/${props.project.slug}`,
}));
const projectTitle = computed(() =>
  props.project.displayContent.status === "available"
    ? props.project.displayContent.content.title
    : ""
);
const projectTextDirection = computed(() =>
  getLanguageTextDirection(props.selectedLanguage)
);
const breadcrumbIcon = computed(() =>
  projectTextDirection.value === "rtl"
    ? "mdi-chevron-left"
    : "mdi-chevron-right"
);
const extendedConversation = computed(() => props.conversationData);
const initialDisplayContent = computed(() => props.initialDisplayContent);
const fallbackPayload = computed(() =>
  "payload" in props.conversationData ? props.conversationData.payload : undefined
);
const {
  displayedTitle,
  displayedBody,
  translationPreview,
  setTranslationMode,
} = useConversationDisplayContent({
  conversationData: extendedConversation,
  initialDisplayContent,
  fallbackPayload,
});
const projectOwnerAttributions = computed(() =>
  filterAttributions("project_owner")
);
const sponsorAttributions = computed(() => filterAttributions("sponsor"));
const partnerAttributions = computed(() => filterAttributions("partner"));
const orderedAttributions = computed(() => [
  ...sponsorAttributions.value,
  ...projectOwnerAttributions.value,
  ...partnerAttributions.value,
]);
const mobileAttributionPreviewEntries = computed(() =>
  orderedAttributions.value.slice(0, 4)
);
const hasMobileProjectDetailLogos = computed(
  () => mobileAttributionPreviewEntries.value.length > 0
);
const mobileAttributionHiddenCount = computed(() =>
  Math.max(
    orderedAttributions.value.length -
      mobileAttributionPreviewEntries.value.length,
    0
  )
);
const hasMobileProjectDetails = computed(
  () =>
    props.project.attributions.length > 0 || props.project.contact !== undefined
);
const mobileProjectDetailsSummary = computed(() => {
  const leadEntry =
    projectOwnerAttributions.value.at(0) ?? orderedAttributions.value.at(0);
  if (leadEntry !== undefined) {
    const otherCount = orderedAttributions.value.length - 1;
    if (otherCount <= 0) {
      return leadEntry.displayName;
    }

    return `${leadEntry.displayName} & ${otherCount.toString()} others`;
  }

  return projectContactName.value;
});
const projectContactName = computed(() => {
  const contact = props.project.contact;
  if (contact === undefined) return "";

  return [contact.firstName, contact.lastName]
    .filter((part): part is string => part !== undefined)
    .join(" ");
});
const participationStatusBadge = computed<ProjectConversationStatusBadge>(() =>
  getParticipationStatusBadge(props.conversationData.metadata.participationMode)
);

function filterAttributions(
  role: ProjectAttribution["role"]
): readonly ProjectAttribution[] {
  return props.project.attributions.filter((entry) => entry.role === role);
}

function logoStyle(color: string): { backgroundColor: string } {
  return { backgroundColor: color };
}

function getParticipationStatusBadge(
  participationMode: ParticipationMode
): ProjectConversationStatusBadge {
  if (participationMode === "guest") {
    return {
      key: "guest-participation",
      label: userIdentityText.value.guestParticipationTooltip,
      icon: "mdi-account-plus",
      color: "muted",
    };
  }

  if (participationMode === "account_required") {
    return {
      key: "account-required",
      label: userIdentityText.value.accountRequiredTooltip,
      icon: "mdi-account-check",
      color: "muted",
    };
  }

  if (participationMode === "email_verification") {
    return {
      key: "email-verification",
      label: userIdentityText.value.emailVerificationTooltip,
      icon: "mdi-email-check",
      color: "muted",
    };
  }

  return {
    key: "strong-verification",
    label: userIdentityText.value.strongVerificationTooltip,
    icon: "mdi-shield-check",
    color: "muted",
  };
}

function t({
  key,
  params,
}: {
  key: keyof ProjectPageTranslations;
  params?: Readonly<Record<string, string | number>>;
}): string {
  return translateProjectPageText({
    languageCode: props.selectedLanguage,
    key,
    params,
  });
}
</script>

<style scoped lang="scss">
.project-conversation-header-card {
  position: relative;
  z-index: 1;
  grid-area: title;
  min-width: 0;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
  margin-top: -2.2rem;
  padding: clamp(1.2rem, 2.6vw, 1.7rem);
  border: 1px solid rgba(233, 235, 239, 0.8);
  border-radius: 26px;
  background: rgba(white, 0.97);
  box-shadow:
    0 0.2rem 0.9rem rgba(10, 7, 20, 0.05),
    0 1.35rem 2.8rem -1.6rem rgba(10, 7, 20, 0.22);
}

.project-conversation-header-card::before {
  content: "";
  position: absolute;
  z-index: -1;
  inset: auto 1rem -0.35rem;
  height: 2.25rem;
  border-radius: inherit;
  background: rgba($ink-darkest, 0.08);
  filter: blur(22px);
}

.project-conversation-header-card__title-block {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.45rem;
}

.project-conversation-header-card__context-row {
  display: flex;
  align-items: flex-start;
  min-width: 0;
  gap: 0.75rem;
}

.project-conversation-header-card__breadcrumb {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  min-width: 0;
  gap: 0.35rem;
  color: $sky-dark;
  font-size: 0.92rem;
  font-weight: var(--font-weight-bold);
  line-height: 1.25;
}

.project-conversation-header-card__breadcrumb-link {
  min-width: 0;
  max-width: 100%;
  color: $primary-dark;
  text-decoration: none;
  overflow-wrap: anywhere;
}

.project-conversation-header-card__breadcrumb-link:hover {
  color: $primary;
}

.project-conversation-header-card__breadcrumb-icon,
.project-conversation-header-card__breadcrumb-current,
.project-conversation-header-card__breadcrumb-separator {
  flex: none;
}

.project-conversation-header-card__breadcrumb-separator {
  color: $ink-light;
  font-size: 0.75rem;
  font-weight: var(--font-weight-normal);
  line-height: 1.2;
  opacity: 0.65;
}

.project-conversation-header-card__breadcrumb-icon {
  color: $sky-dark;
}

.project-conversation-header-card__post-menu {
  flex: none;
  margin-inline-start: auto;
}

.project-conversation-header-card__title-row {
  min-width: 0;
}

.project-conversation-header-card__title-row :deep(.title-section) {
  min-width: 0;
}

.project-conversation-header-card__title-row :deep(.conversation-title) {
  overflow-wrap: anywhere;
}

.project-conversation-header-card__translation-control {
  margin-block-end: 0.35rem;
}

.project-conversation-header-card__status-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.project-conversation-header-card__status-badge {
  :deep(.q-chip__content) {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
}

.project-conversation-header-card__conversation-body {
  max-width: 42rem;
  color: $ink-light;
}

.project-conversation-header-card__conversation-body :deep(.textBreak) {
  font-size: 1rem;
  line-height: 1.65;
}

.project-conversation-header-card__mobile-project-details {
  display: none;
  padding: 0;
  border: 1px solid $sky-lighter;
  border-radius: 12px;
  background: $app-background-color;
  box-shadow: 0 0.35rem 1rem rgba(10, 7, 20, 0.04);
}

.project-conversation-header-card__mobile-project-details-button {
  width: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.75rem;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.project-conversation-header-card__mobile-project-details-button--without-logos {
  grid-template-columns: minmax(0, 1fr) auto;
}

.project-conversation-header-card__mobile-project-details-logos {
  display: flex;
  min-width: 4.1rem;
}

.project-conversation-header-card__mobile-project-details-logo {
  width: 1.55rem;
  height: 1.55rem;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid $sky-lighter;
  border-radius: 0.35rem;
  color: white;
  font-size: 0.55rem;
  font-weight: var(--font-weight-bold);
  box-shadow: 0 0 0 2px $app-background-color;

  & + & {
    margin-inline-start: -0.35rem;
  }
}

.project-conversation-header-card__mobile-project-details-logo--image,
.project-conversation-header-card__mobile-project-details-logo--more {
  background: white;
  color: $ink-light;
}

.project-conversation-header-card__mobile-project-details-logo-image {
  width: 100%;
  max-width: 100%;
  display: block;
  object-fit: contain;
}

.project-conversation-header-card__mobile-project-details-summary {
  overflow: hidden;
  color: $ink-light;
  font-size: 0.84rem;
  font-weight: var(--font-weight-bold);
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-conversation-header-card__mobile-project-details-chevron {
  color: $sky-dark;
}

@media (max-width: 860px) {
  .project-conversation-header-card__mobile-project-details {
    display: grid;
  }
}

@media (max-width: 520px) {
  .project-conversation-header-card {
    margin-top: -1.65rem;
    border-radius: 20px;
  }

  .project-conversation-header-card__context-row {
    gap: 0.45rem;
  }
}
</style>
