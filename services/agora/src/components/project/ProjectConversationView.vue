<template>
  <div
    class="project-conversation-view"
    :class="{ 'project-conversation-view--report-layout': reportLayout }"
    :dir="projectTextDirection"
  >
    <main>
      <section
        class="project-conversation-view__banner"
        :class="[
          `project-conversation-view__banner--${project.bannerVariant}`,
          {
            'project-conversation-view__banner--with-image':
              effectiveBannerImageUrl !== undefined,
          },
        ]"
      >
        <img
          v-if="effectiveBannerImageUrl !== undefined"
          :key="effectiveBannerImageUrl"
          :src="effectiveBannerImageUrl"
          :alt="t('bannerImageAlt', { title: project.title })"
          class="project-conversation-view__banner-image"
        />
        <div class="project-conversation-view__banner-grid"></div>
        <div
          class="project-conversation-view__banner-controls"
          :class="{
            'project-conversation-view__banner-controls--without-language':
              !hasMultipleLanguageOptions,
          }"
        >
          <ProjectLanguageSelect
            v-if="hasMultipleLanguageOptions"
            v-model:selected-language="selectedLanguage"
            :language-options="languageOptions"
            :text-direction="projectTextDirection"
          />

          <div
            class="project-conversation-view__consultation-pill"
            :class="{
              'project-conversation-view__consultation-pill--closed':
                conversation.isClosed,
            }"
          >
            <ZKLiveStatusDot
              class="project-conversation-view__consultation-dot"
              :active="!conversation.isClosed"
              tone="positive"
            />
            {{ conversation.isClosed ? t("closedConsultation") : t("liveConsultation") }}
          </div>
        </div>
      </section>

      <div class="project-conversation-view__shell">
        <div class="project-conversation-view__content-grid">
          <article class="project-conversation-view__conversation-card">
            <div class="project-conversation-view__title-block">
              <div class="project-conversation-view__context-row">
                <nav
                  class="project-conversation-view__breadcrumb"
                  :aria-label="t('projectDetailsAriaLabel')"
                >
                  <SpaLink
                    :to="projectRoute"
                    class="project-conversation-view__breadcrumb-link"
                  >
                    {{ project.title }}
                  </SpaLink>
                  <q-icon
                    :name="breadcrumbIcon"
                    size="1.1rem"
                    class="project-conversation-view__breadcrumb-icon"
                    aria-hidden="true"
                  />
                  <span>{{ t("conversationType") }}</span>

                </nav>
              </div>

              <div class="project-conversation-view__title-row">
                <div class="project-conversation-view__translated-title">
                  <ContentTranslationControl
                    v-if="translationPreview?.isAvailable === true"
                    :model-value="translationPreview.mode"
                    :source-language-label="translationPreview.sourceLanguageLabel"
                    :translation-status="translationPreview.translationStatus"
                    class="project-conversation-view__translation-control"
                    @update:model-value="setTranslationMode"
                  />

                  <ConversationTitle
                    :is-private="!conversationData.metadata.isIndexed"
                    :title="displayedTitle"
                    size="medium"
                    :conversation-type="conversationData.metadata.conversationType"
                    :external-source-config="conversationData.metadata.externalSourceConfig ?? null"
                    :show-chips="false"
                  />
                </div>

                <div class="project-conversation-view__post-menu">
                  <PostMetadata
                    :author-verified="false"
                    :poster-user-name="conversationData.metadata.authorUsername"
                    :author-username="conversationData.metadata.authorUsername"
                    :created-at="new Date(conversationData.metadata.createdAt)"
                    :is-edited="conversationData.metadata.isEdited"
                    :post-slug-id="conversationData.metadata.conversationSlugId"
                    organization-url=""
                    organization-name=""
                    :participation-mode="conversationData.metadata.participationMode"
                    :is-closed="conversationData.metadata.isClosed"
                    :conversation-title="conversationData.payload.title"
                    :conversation-type="conversationData.metadata.conversationType"
                    :external-source-config="conversationData.metadata.externalSourceConfig ?? null"
                    :show-identity-card="false"
                    :project-slug="project.slug"
                  />
                </div>
              </div>

              <div
                v-if="displayedBody !== undefined && displayedBody.length > 0"
                class="project-conversation-view__conversation-body"
              >
                <ZKHtmlContent
                  :html-body="displayedBody"
                  :compact-mode="false"
                  :enable-links="true"
                  :desktop-collapsed-line-count="18"
                />
              </div>

              <div
                v-if="statusBadges.length > 0"
                class="project-conversation-view__status-badges"
              >
                <ZKChip
                  v-for="statusBadge in statusBadges"
                  :key="statusBadge.key"
                  :color="statusBadge.color"
                  class="project-conversation-view__status-badge"
                  :class="{
                    'project-conversation-view__status-badge--private':
                      statusBadge.key === 'private',
                  }"
                >
                  <q-icon
                    v-if="statusBadge.icon !== undefined"
                    :name="statusBadge.icon"
                    size="0.78rem"
                  />
                  <span>{{ statusBadge.label }}</span>
                </ZKChip>
              </div>
            </div>

            <div
              v-if="project.attributions.length > 0"
              class="project-conversation-view__mobile-attributions"
            >
              <button
                type="button"
                class="project-conversation-view__mobile-attributions-button"
                @click="showMobileAttributions = true"
              >
                <span
                  class="project-conversation-view__mobile-attribution-logos"
                  aria-hidden="true"
                >
                  <span
                    v-for="entry in mobileAttributionPreviewEntries"
                    :key="`${entry.role}-${entry.displayName}`"
                    class="project-conversation-view__mobile-attribution-logo"
                    :class="{
                      'project-conversation-view__mobile-attribution-logo--image':
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
                      class="project-conversation-view__mobile-attribution-logo-image"
                      height="100%"
                      :organization-image-url="entry.imageUrl"
                      :organization-name="entry.displayName"
                    />
                    <template v-else>{{ entry.initials }}</template>
                  </span>

                  <span
                    v-if="mobileAttributionHiddenCount > 0"
                    class="project-conversation-view__mobile-attribution-logo project-conversation-view__mobile-attribution-logo--more"
                  >
                    +{{ mobileAttributionHiddenCount }}
                  </span>
                </span>

                <span class="project-conversation-view__mobile-attribution-summary">
                  {{ mobileAttributionSummary }}
                </span>

                <q-icon
                  :name="breadcrumbIcon"
                  size="1.1rem"
                  class="project-conversation-view__mobile-attribution-chevron"
                  aria-hidden="true"
                />
              </button>
            </div>
          </article>

          <section class="project-conversation-view__conversation-stream">
            <slot name="conversation-actions" />

            <div class="project-conversation-view__toolbar">
              <slot name="conversation-toolbar" />
            </div>

            <div class="project-conversation-view__feed">
              <slot name="conversation-feed" />
            </div>
          </section>

          <aside
            class="project-conversation-view__aside"
            :aria-label="t('projectDetailsAriaLabel')"
          >
            <section class="project-conversation-view__info-section">
              <h2 class="project-conversation-view__aside-title">
                {{ t("behindThisTitle") }}
              </h2>
              <ProjectAttributionSection
                :title="t('sponsorsTitle')"
                :entries="sponsorAttributions"
                :language-code="selectedLanguageValue"
              />
              <ProjectAttributionSection
                :title="t('projectOwnersTitle')"
                :entries="projectOwnerAttributions"
                :language-code="selectedLanguageValue"
              />
              <ProjectAttributionSection
                :title="t('partnersTitle')"
                :entries="partnerAttributions"
                :language-code="selectedLanguageValue"
              />
            </section>

            <section
              v-if="project.contact !== undefined"
              class="project-conversation-view__info-section project-conversation-view__info-section--contact"
            >
              <h2 class="project-conversation-view__aside-title">
                {{ t("projectContactTitle") }}
              </h2>
              <ProjectContactCard
                :contact="project.contact"
                :language-code="selectedLanguageValue"
              />
            </section>
          </aside>

          <ProjectPageFooter
            class="project-conversation-view__footer"
            :language-code="selectedLanguageValue"
          />
        </div>
      </div>
    </main>

    <q-dialog v-model="showMobileAttributions" position="bottom">
      <ZKBottomDialogContainer :title="t('behindThisTitle')">
        <ProjectAttributionSection
          :title="t('sponsorsTitle')"
          :entries="sponsorAttributions"
          :language-code="selectedLanguageValue"
        />
        <ProjectAttributionSection
          :title="t('projectOwnersTitle')"
          :entries="projectOwnerAttributions"
          :language-code="selectedLanguageValue"
        />
        <ProjectAttributionSection
          :title="t('partnersTitle')"
          :entries="partnerAttributions"
          :language-code="selectedLanguageValue"
        />
      </ZKBottomDialogContainer>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import OrganizationImage from "src/components/account/OrganizationImage.vue";
import {
  type ConversationTitleTranslations,
  conversationTitleTranslations,
} from "src/components/features/conversation/ConversationTitle.i18n";
import ConversationTitle from "src/components/features/conversation/ConversationTitle.vue";
import {
  type UserIdentityCardTranslations,
  userIdentityCardTranslations,
} from "src/components/features/user/UserIdentityCard.i18n";
import PostMetadata from "src/components/post/display/PostMetadata.vue";
import ContentTranslationControl from "src/components/translation/ContentTranslationControl.vue";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKChip from "src/components/ui-library/ZKChip.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import ZKLiveStatusDot from "src/components/ui-library/ZKLiveStatusDot.vue";
import {
  getLanguageTextDirection,
  parseSupportedDisplayLanguageOrUndefined,
} from "src/shared/languages";
import type {
  ConversationType,
  ExtendedConversation,
  ExternalSourceConfig,
  ParticipationMode,
} from "src/shared/types/zod";
import { useConversationDisplayContent } from "src/utils/translation/useConversationDisplayContent";
import { computed, ref } from "vue";
import type { RouteLocationRaw } from "vue-router";

import ProjectAttributionSection from "./ProjectAttributionSection.vue";
import ProjectContactCard from "./ProjectContactCard.vue";
import ProjectLanguageSelect from "./ProjectLanguageSelect.vue";
import ProjectPageFooter from "./ProjectPageFooter.vue";
import {
  type ProjectPageTranslations,
  translateProjectPageText,
} from "./projectPageI18n";
import type {
  ProjectActivityStats,
  ProjectAttribution,
  ProjectLanguageOption,
  ProjectPageData,
} from "./projectPageTypes";

export interface ProjectConversationViewConversation {
  slugId: string;
  title: string;
  bodyHtml: string | undefined;
  isClosed: boolean;
  stats: ProjectActivityStats;
  conversationType: ConversationType;
  externalSourceConfig: ExternalSourceConfig | null;
}

interface ProjectConversationStatusBadge {
  key: string;
  label: string;
  icon: string | undefined;
  color: "neutral" | "primary" | "warning" | "muted";
}

const props = defineProps<{
  project: ProjectPageData;
  conversation: ProjectConversationViewConversation;
  conversationData: ExtendedConversation;
  languageOptions: readonly ProjectLanguageOption[];
  initialLanguage: string;
  bannerImageUrl?: string;
  reportLayout?: boolean;
}>();

const selectedLanguage = defineModel<string | readonly string[]>(
  "selectedLanguage",
  {
    required: true,
  }
);
const showMobileAttributions = ref(false);

const selectedLanguageValue = computed(() => {
  if (Array.isArray(selectedLanguage.value)) {
    return selectedLanguage.value.at(0) ?? props.initialLanguage;
  }

  return selectedLanguage.value;
});
const projectTextDirection = computed(() =>
  getLanguageTextDirection(selectedLanguageValue.value)
);
const selectedSupportedLanguage = computed(
  () => parseSupportedDisplayLanguageOrUndefined(selectedLanguageValue.value) ?? "en"
);
const conversationTitleText = computed<ConversationTitleTranslations>(
  () => conversationTitleTranslations[selectedSupportedLanguage.value]
);
const userIdentityText = computed<UserIdentityCardTranslations>(
  () => userIdentityCardTranslations[selectedSupportedLanguage.value]
);
const projectRoute = computed<RouteLocationRaw>(() => ({
  path: `/project/${props.project.slug}`,
}));
const extendedConversation = computed(() => props.conversationData);
const { displayedTitle, displayedBody, translationPreview, setTranslationMode } =
  useConversationDisplayContent({
    extendedConversation,
  });
const effectiveBannerImageUrl = computed(
  () => props.bannerImageUrl ?? props.project.bannerImageUrl
);
const hasMultipleLanguageOptions = computed(
  () => new Set(props.languageOptions.map((option) => option.value)).size > 1
);
const breadcrumbIcon = computed(() =>
  projectTextDirection.value === "rtl" ? "mdi-chevron-left" : "mdi-chevron-right"
);
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
const mobileAttributionHiddenCount = computed(() =>
  Math.max(orderedAttributions.value.length - mobileAttributionPreviewEntries.value.length, 0)
);
const mobileAttributionSummary = computed(() => {
  const leadEntry = projectOwnerAttributions.value.at(0) ?? orderedAttributions.value.at(0);
  if (leadEntry === undefined) {
    return "";
  }

  const otherCount = orderedAttributions.value.length - 1;
  if (otherCount <= 0) {
    return leadEntry.displayName;
  }

  return `${leadEntry.displayName} & ${otherCount.toString()} others`;
});
const statusBadges = computed<readonly ProjectConversationStatusBadge[]>(() => {
  const badges: ProjectConversationStatusBadge[] = [];

  const participationBadge = getParticipationStatusBadge(
    props.conversationData.metadata.participationMode
  );
  badges.push(participationBadge);

  if (props.conversationData.metadata.conversationType === "maxdiff") {
    badges.push({
      key: "maxdiff",
      label: conversationTitleText.value.prioritizationLabel,
      icon: "mdi-sort-numeric-ascending",
      color: "primary",
    });
  }

  if (props.conversationData.metadata.externalSourceConfig !== null) {
    badges.push({
      key: "github",
      label: "GitHub",
      icon: "mdi-github",
      color: "neutral",
    });
  }

  if (!props.conversationData.metadata.isIndexed) {
    badges.push({
      key: "private",
      label: conversationTitleText.value.privateLabel,
      icon: undefined,
      color: "neutral",
    });
  }

  return badges;
});

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

function t(
  key: keyof ProjectPageTranslations,
  params?: Readonly<Record<string, string | number>>
): string {
  return translateProjectPageText({
    languageCode: selectedLanguageValue.value,
    key,
    params,
  });
}
</script>

<style scoped lang="scss">
.project-conversation-view {
  min-height: 100dvh;
  background:
    radial-gradient(
      circle at 1px 1px,
      rgba($ink-darkest, 0.035) 1px,
      transparent 0
    ),
    $app-background-color;
  background-size: 24px 24px;
  color: $ink-darker;
}

main {
  padding-bottom: 3rem;
}

.project-conversation-view__banner {
  position: relative;
  height: clamp(12.5rem, 25vw, 17rem);
  overflow: hidden;
  background: linear-gradient(135deg, #1d4f9f, #6b4eff);
}

.project-conversation-view__banner::after {
  content: "";
  position: absolute;
  z-index: 1;
  inset-inline: 0;
  bottom: -0.05rem;
  height: 2.35rem;
  background: linear-gradient(
    180deg,
    rgba($app-background-color, 0),
    rgba($app-background-color, 0.42) 62%,
    $app-background-color
  );
  backdrop-filter: blur(3px) saturate(1.02);
  -webkit-backdrop-filter: blur(3px) saturate(1.02);
  pointer-events: none;
}

.project-conversation-view__banner--purple {
  background: linear-gradient(135deg, #5538ee, #d8639a);
}

.project-conversation-view__banner--green {
  background: linear-gradient(135deg, #177a41, #4f92f6);
}

.project-conversation-view__banner-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-conversation-view__banner-grid {
  position: absolute;
  z-index: 1;
  inset: 0;
  background:
    radial-gradient(circle at 20% 20%, rgba(white, 0.22), transparent 26%),
    radial-gradient(circle at 72% 26%, rgba(white, 0.2), transparent 22%),
    linear-gradient(
      180deg,
      rgba($ink-darkest, 0.08),
      rgba($app-background-color, 0.88)
    );
}

.project-conversation-view__banner--with-image {
  background: $app-background-color;

  .project-conversation-view__banner-grid {
    background: linear-gradient(
      180deg,
      rgba($ink-darkest, 0.02),
      rgba($app-background-color, 0.16)
    );
  }
}

.project-conversation-view__banner-controls {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: min(72rem, calc(100% - 2rem));
  margin: 0 auto;
  padding-top: 0.85rem;
}

.project-conversation-view__banner-controls--without-language {
  justify-content: flex-end;
}

.project-conversation-view__consultation-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.48rem 0.75rem;
  border-radius: 999px;
  background: rgba($ink-base, 0.78);
  color: white;
  font-size: 0.78rem;
  font-weight: var(--font-weight-bold);
  line-height: 1;
  box-shadow: 0 0.25rem 1rem rgba(10, 7, 20, 0.14);
  white-space: nowrap;
}

.project-conversation-view__consultation-dot {
  flex: none;
  width: 0.6rem;
  height: 0.6rem;
}

.project-conversation-view__consultation-pill--closed {
  .project-conversation-view__consultation-dot {
    background: $sky-dark;
  }
}

.project-conversation-view__shell {
  position: relative;
  width: min(72rem, calc(100% - 2rem));
  margin: 0 auto;
}

.project-conversation-view__content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(18rem, 22rem);
  grid-template-areas:
    "title ."
    "stream aside"
    "footer aside";
  column-gap: clamp(1.4rem, 4vw, 2.7rem);
  row-gap: 1rem;
  align-items: start;
}

.project-conversation-view__conversation-stream,
.project-conversation-view__aside,
.project-conversation-view__info-section {
  min-width: 0;
}

.project-conversation-view__conversation-stream {
  grid-area: stream;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.project-conversation-view__conversation-card {
  position: relative;
  z-index: 1;
  grid-area: title;
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

.project-conversation-view__conversation-card::before {
  content: "";
  position: absolute;
  z-index: -1;
  inset: auto 1rem -0.35rem;
  height: 2.25rem;
  border-radius: inherit;
  background: rgba($ink-darkest, 0.08);
  filter: blur(22px);
}

.project-conversation-view__title-block {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.project-conversation-view__context-row {
  display: flex;
  align-items: flex-start;
  min-width: 0;
  margin-bottom: 0.35rem;
}

.project-conversation-view__title-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.75rem;
}

.project-conversation-view__title-row :deep(.title-section) {
  min-width: 0;
}

.project-conversation-view__translated-title {
  min-width: 0;
}

.project-conversation-view__translation-control {
  margin-block-end: 0.35rem;
}

.project-conversation-view__breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  min-width: 0;
  gap: 0.35rem;
  color: $sky-dark;
  font-size: 0.92rem;
  font-weight: var(--font-weight-bold);
  line-height: 1.25;
}

.project-conversation-view__breadcrumb-link {
  overflow: hidden;
  min-width: 0;
  max-width: min(28rem, 100%);
  color: $primary-dark;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-conversation-view__breadcrumb-link:hover {
  color: $primary;
}

.project-conversation-view__breadcrumb-icon {
  color: $sky-dark;
}

.project-conversation-view__post-menu {
  flex: none;
  margin-block-start: -0.42rem;
}

.project-conversation-view__status-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.project-conversation-view__status-badge {
  :deep(.q-chip__content) {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
}

.project-conversation-view__status-badge--private {
  background: #333;
  color: white;
}

.project-conversation-view__conversation-body {
  max-width: 42rem;
  color: $ink-light;
}

.project-conversation-view__conversation-body :deep(.textBreak) {
  font-size: 1rem;
  line-height: 1.65;
}

.project-conversation-view__mobile-attributions {
  display: none;
  padding: 0;
  border: 1px solid $sky-lighter;
  border-radius: 12px;
  background: $app-background-color;
  box-shadow: 0 0.35rem 1rem rgba(10, 7, 20, 0.04);
}

.project-conversation-view__mobile-attributions-button {
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

.project-conversation-view__mobile-attribution-logos {
  display: flex;
  min-width: 4.1rem;
}

.project-conversation-view__mobile-attribution-logo {
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

.project-conversation-view__mobile-attribution-logo--image,
.project-conversation-view__mobile-attribution-logo--more {
  background: white;
  color: $ink-light;
}

.project-conversation-view__mobile-attribution-logo-image {
  width: 100%;
  max-width: 100%;
  display: block;
  object-fit: contain;
}

.project-conversation-view__mobile-attribution-summary {
  overflow: hidden;
  color: $ink-light;
  font-size: 0.84rem;
  font-weight: var(--font-weight-bold);
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-conversation-view__mobile-attribution-chevron {
  color: $sky-dark;
}

.project-conversation-view__action-bar {
  padding-block: 0.25rem 0;
}

.project-conversation-view__toolbar {
  display: flex;
  justify-content: flex-end;
}

.project-conversation-view__feed {
  min-width: 0;
}

.project-conversation-view__footer {
  grid-area: footer;
  padding-block: 2.5rem 5.5rem;
}

.project-conversation-view__aside,
.project-conversation-view__info-section {
  display: flex;
  flex-direction: column;
}

.project-conversation-view__aside {
  grid-area: aside;
  position: sticky;
  top: 1.25rem;
  gap: 2.35rem;
}

.project-conversation-view__info-section {
  gap: 0;
}

.project-conversation-view__info-section--contact {
  gap: 0.65rem;
}

.project-conversation-view__aside-title {
  margin: 0 0 1rem;
  color: $ink-light;
  font-size: 1rem;
  font-weight: var(--font-weight-semibold);
  letter-spacing: -0.01em;
}

.project-conversation-view__info-section :deep(.project-attribution-section + .project-attribution-section) {
  margin-top: 1.15rem;
}

@media (max-width: 860px) {
  .project-conversation-view__content-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "title"
      "stream"
      "footer";
  }

  .project-conversation-view__aside {
    display: none;
  }

  .project-conversation-view__mobile-attributions {
    display: grid;
  }

}

@media (max-width: 1180px) {
  .project-conversation-view--report-layout {
    .project-conversation-view__content-grid {
      grid-template-columns: 1fr;
      grid-template-areas:
        "title"
        "stream"
        "footer";
    }

    .project-conversation-view__aside {
      display: none;
    }

    .project-conversation-view__mobile-attributions {
      display: grid;
    }
  }
}

@media (max-width: 520px) {
  .project-conversation-view__banner-controls {
    width: calc(100% - 1.2rem);
    padding-top: 0.7rem;
  }

  .project-conversation-view__consultation-pill {
    padding: 0.5rem 0.7rem;
    font-size: 0.78rem;
  }

  .project-conversation-view__shell {
    width: calc(100% - 1rem);
  }

  .project-conversation-view__conversation-card {
    margin-top: -1.65rem;
    border-radius: 20px;
  }

  .project-conversation-view__context-row {
    margin-bottom: 0.2rem;
  }

  .project-conversation-view__title-row {
    gap: 0.45rem;
  }

  .project-conversation-view__post-menu {
    margin-block-start: -0.5rem;
  }
}
</style>
