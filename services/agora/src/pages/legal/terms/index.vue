<template>
  <div>
    <Teleport v-if="isActive" to="#page-header">
      <StandardMenuBar
        :title="renderedContent.termsOfService"
        :center-content="true"
      />
    </Teleport>

    <aside
      v-if="selectedLanguageCode !== 'en'"
      class="terms-translation-notice"
      role="note"
      aria-live="polite"
      aria-labelledby="terms-translation-notice-title"
    >
      <h2 id="terms-translation-notice-title">
        {{ selectedLocaleContent.automatedTranslationNoticeTitle }}
      </h2>
      <p>{{ selectedLocaleContent.automatedTranslationNotice }}</p>
      <button
        type="button"
        class="terms-translation-toggle"
        :aria-label="translationToggleLabel"
        :aria-pressed="showAuthoritativeEnglishVersion"
        aria-controls="terms-document"
        @click="
          showAuthoritativeEnglishVersion = !showAuthoritativeEnglishVersion
        "
      >
        {{ translationToggleLabel }}
      </button>
    </aside>

    <article
      id="terms-document"
      class="terms-content"
      :lang="showAuthoritativeEnglishVersion ? 'en' : selectedLanguageCode"
      :dir="showAuthoritativeEnglishVersion ? 'ltr' : undefined"
    >
      <p>
        <strong>{{ renderedContent.lastUpdatedLabel }}</strong
        >: {{ renderedContent.lastUpdatedDate }}
      </p>

      <p><TermsInlineContent :content="renderedContent.introduction" /></p>

      <section
        v-for="section in renderedContent.sections"
        :key="section.heading"
      >
        <h2>{{ section.heading }}</h2>

        <template
          v-for="(block, blockIndex) in section.blocks"
          :key="blockIndex"
        >
          <p v-if="block.type === 'paragraph'">
            <TermsInlineContent :content="block.content" />
          </p>

          <h3 v-else-if="block.type === 'subheading'">
            <TermsInlineContent :content="block.content" />
          </h3>

          <component
            :is="block.ordered ? 'ol' : 'ul'"
            v-else-if="block.type === 'list'"
            :class="{ 'lower-alpha-list': block.marker === 'lower-alpha' }"
          >
            <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
              <TermsInlineContent :content="item.content" />
            </li>
          </component>

          <address v-else>
            <template v-for="(line, lineIndex) in block.lines" :key="line">
              {{ line }}<br v-if="lineIndex < block.lines.length - 1" />
            </template>
          </address>
        </template>
      </section>
    </article>
  </div>
</template>

<script setup lang="ts">
import { StandardMenuBar } from "src/components/navigation/header/variants";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { parseSupportedDisplayLanguageOrUndefined } from "src/shared/languages";
import { computed, type FunctionalComponent, h, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { termsOfServiceContent, type TermsText } from "./index.i18n";

const TermsInlineContent: FunctionalComponent<{
  content: readonly TermsText[];
}> = (props) =>
  props.content.map((part) => {
    if (part.kind === "strong") {
      return h("strong", part.text);
    }

    if (part.kind === "link") {
      if (part.href.startsWith("/")) {
        return h(
          SpaLink,
          { to: part.href, class: "terms-inline-link" },
          () => part.text
        );
      }

      return h(
        "a",
        {
          href: part.href,
          target: part.external ? "_blank" : undefined,
          rel: part.external ? "noopener noreferrer" : undefined,
        },
        part.text
      );
    }

    return part.text;
  });

const { isActive } = usePageLayout({ reducedWidth: true });
const { locale } = useI18n();
const showAuthoritativeEnglishVersion = ref(false);

const selectedLanguageCode = computed(
  () => parseSupportedDisplayLanguageOrUndefined(locale.value) ?? "en"
);
const selectedLocaleContent = computed(
  () => termsOfServiceContent[selectedLanguageCode.value]
);
const renderedContent = computed(() => {
  if (showAuthoritativeEnglishVersion.value) {
    return termsOfServiceContent.en;
  }

  return selectedLocaleContent.value;
});
const translationToggleLabel = computed(() =>
  showAuthoritativeEnglishVersion.value
    ? selectedLocaleContent.value.returnToTranslatedVersion
    : selectedLocaleContent.value.viewAuthoritativeEnglishVersion
);

watch(selectedLanguageCode, () => {
  showAuthoritativeEnglishVersion.value = false;
});
</script>

<style scoped lang="scss">
.terms-translation-notice {
  max-width: 800px;
  margin-block: 1rem 1.5rem;
  margin-inline: auto;
  padding-block: 1rem;
  padding-inline: 1.25rem;
  border: 1px solid rgba($warning, 0.75);
  border-inline-start-width: 0.4rem;
  border-radius: 0.5rem;
  background-color: rgba($warning, 0.14);
  box-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.1);

  h2 {
    margin: 0;
    margin-block-end: 0.5rem;
    font-size: 1.2rem;
    font-weight: 700;
  }

  p {
    margin: 0;
    margin-block-end: 1rem;
    line-height: 1.6;
  }
}

.terms-translation-toggle {
  font: inherit;
  font-weight: 600;
  color: inherit;
  padding-block: 0.625rem;
  padding-inline: 1rem;
  border: 2px solid currentColor;
  border-radius: 0.375rem;
  background-color: transparent;
  cursor: pointer;

  &:hover {
    background-color: rgba($warning, 0.2);
  }

  &:focus-visible {
    outline: 3px solid $primary;
    outline-offset: 0.1875rem;
  }
}

.terms-content {
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.6;

  h2 {
    margin-top: 2rem;
    margin-bottom: 1rem;
    font-size: 1.5rem;
    font-weight: 600;
  }

  h3 {
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    font-size: 1.2rem;
    font-weight: 600;
  }

  section {
    margin-bottom: 2rem;
  }

  p {
    margin-bottom: 1rem;
  }

  ul,
  ol {
    margin-bottom: 1rem;
    padding-inline-start: 1.5rem;

    li {
      margin-bottom: 0.5rem;
    }
  }

  .lower-alpha-list {
    list-style-type: lower-alpha;
  }

  address {
    font-style: normal;
    margin-top: 1rem;
  }

  a {
    color: $primary;
    text-decoration: underline;

    &:hover {
      opacity: 0.8;
    }
  }

  :deep(.terms-inline-link) {
    display: inline;
  }
}
</style>
