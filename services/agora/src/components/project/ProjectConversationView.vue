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
          :alt="t('bannerImageAlt', { title: projectTitle })"
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
                conversationData.metadata.isClosed,
            }"
          >
            <ZKLiveStatusDot
              class="project-conversation-view__consultation-dot"
              :active="!conversationData.metadata.isClosed"
              tone="positive"
            />
            {{
              conversationData.metadata.isClosed
                ? t("closedConsultation")
                : t("liveConsultation")
            }}
          </div>
        </div>
      </section>

      <div class="project-conversation-view__shell">
        <div class="project-conversation-view__content-grid">
          <ProjectConversationHeaderCard
            :project="project"
            :conversation-data="conversationData"
            :initial-display-content="initialDisplayContent"
            :selected-language="selectedLanguage"
            @conversation-deleted="emit('conversationDeleted')"
          />

          <section class="project-conversation-view__conversation-stream">
            <slot name="conversation-actions" />

            <div class="project-conversation-view__toolbar">
              <slot name="conversation-toolbar" />
            </div>

            <div class="project-conversation-view__feed">
              <slot name="conversation-feed" />
            </div>
          </section>

          <ProjectDetailsAside
            class="project-conversation-view__aside"
            :attributions="project.attributions"
            :contact="project.contact"
            :language-code="selectedLanguage"
          />

          <ProjectPageFooter
            class="project-conversation-view__footer"
            :language-code="selectedLanguage"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import ZKLiveStatusDot from "src/components/ui-library/ZKLiveStatusDot.vue";
import {
  getLanguageTextDirection,
  type SupportedDisplayLanguageCodes,
} from "src/shared/languages";
import type { ConversationContentFetchResponse } from "src/shared/types/dto";
import type { ExtendedConversationDisplayData } from "src/shared/types/zod";
import { computed } from "vue";

import ProjectConversationHeaderCard from "./ProjectConversationHeaderCard.vue";
import ProjectDetailsAside from "./ProjectDetailsAside.vue";
import ProjectLanguageSelect from "./ProjectLanguageSelect.vue";
import ProjectPageFooter from "./ProjectPageFooter.vue";
import {
  type ProjectPageTranslations,
  translateProjectPageText,
} from "./projectPageI18n";
import type {
  ProjectLanguageOption,
  ProjectPageData,
} from "./projectPageTypes";

const props = defineProps<{
  project: ProjectPageData;
  conversationData: ExtendedConversationDisplayData;
  initialDisplayContent?: ConversationContentFetchResponse;
  languageOptions: readonly ProjectLanguageOption[];
  bannerImageUrl?: string;
  reportLayout?: boolean;
}>();

const emit = defineEmits<{
  conversationDeleted: [];
}>();

const selectedLanguage = defineModel<SupportedDisplayLanguageCodes>(
  "selectedLanguage",
  { required: true }
);

const projectTextDirection = computed(() =>
  getLanguageTextDirection(selectedLanguage.value)
);
const effectiveBannerImageUrl = computed(
  () => props.bannerImageUrl ?? props.project.bannerImageUrl
);
const projectTitle = computed(() =>
  props.project.displayContent.status === "available"
    ? props.project.displayContent.content.title
    : ""
);
const hasMultipleLanguageOptions = computed(
  () => new Set(props.languageOptions.map((option) => option.value)).size > 1
);
function t(
  key: keyof ProjectPageTranslations,
  params?: Readonly<Record<string, string | number>>
): string {
  return translateProjectPageText({
    languageCode: selectedLanguage.value,
    key,
    params,
  });
}
</script>

<style scoped lang="scss">
.project-conversation-view {
  box-sizing: border-box;
  min-height: 100dvh;
  overflow-x: hidden;
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

.project-conversation-view *,
.project-conversation-view *::before,
.project-conversation-view *::after {
  box-sizing: inherit;
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
  width: 100%;
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
.project-conversation-view__aside {
  min-width: 0;
}

.project-conversation-view__conversation-stream {
  grid-area: stream;
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.project-conversation-view__aside {
  grid-area: aside;
  position: sticky;
  top: 1.25rem;
}

@media (min-width: 861px) {
  .project-conversation-view__aside {
    padding-block-start: 1rem;
  }
}

@media (max-width: 860px) {
  .project-conversation-view__shell {
    width: min(35.9375rem, 100%);
  }

  .project-conversation-view__content-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "title"
      "stream"
      "footer";
    padding-inline: 1rem;
  }

  .project-conversation-view__aside {
    display: none;
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
}
</style>
