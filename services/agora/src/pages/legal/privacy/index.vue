<template>
  <div>
    <Teleport v-if="isActive" to="#page-header">
      <StandardMenuBar :title="renderedContent.title" :center-content="true" />
    </Teleport>

    <aside
      v-if="hasAutomatedTranslation"
      class="translation-notice"
      :lang="selectedDisplayLanguage"
      aria-labelledby="privacy-translation-notice-title"
    >
      <h2
        id="privacy-translation-notice-title"
        class="translation-notice__title"
      >
        {{ selectedContent.automatedTranslationNotice.title }}
      </h2>
      <p class="translation-notice__statement">
        {{ selectedContent.automatedTranslationNotice.statement }}
      </p>
      <button
        type="button"
        class="translation-notice__button"
        :aria-pressed="isViewingAuthoritativeEnglish"
        aria-controls="privacy-policy-content"
        @click="toggleAuthoritativeEnglish"
      >
        {{ translationToggleLabel }}
      </button>
    </aside>

    <article
      id="privacy-policy-content"
      class="privacy-content"
      :lang="renderedContentLanguage"
      :dir="isViewingAuthoritativeEnglish ? 'ltr' : undefined"
    >
      <PolicyContent :nodes="renderedContent.nodes" />
    </article>
  </div>
</template>

<script setup lang="ts">
import { StandardMenuBar } from "src/components/navigation/header/variants";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { parseSupportedDisplayLanguageOrUndefined } from "src/shared/languages";
import { computed, Fragment, h, ref, type VNodeChild, watch } from "vue";
import { useI18n } from "vue-i18n";

import { privacyPolicyContent, type PrivacyPolicyNode } from "./index.i18n";

const { isActive } = usePageLayout({ reducedWidth: true });
const { locale } = useI18n();
const isViewingAuthoritativeEnglish = ref(false);

const selectedDisplayLanguage = computed(() =>
  parseSupportedDisplayLanguageOrUndefined(locale.value)
);
const selectedContent = computed(
  () => privacyPolicyContent[selectedDisplayLanguage.value ?? "en"]
);
const hasAutomatedTranslation = computed(
  () =>
    selectedDisplayLanguage.value !== undefined &&
    selectedDisplayLanguage.value !== "en"
);
const renderedContent = computed(() =>
  isViewingAuthoritativeEnglish.value
    ? privacyPolicyContent.en
    : selectedContent.value
);
const renderedContentLanguage = computed(() =>
  isViewingAuthoritativeEnglish.value
    ? "en"
    : (selectedDisplayLanguage.value ?? "en")
);
const translationToggleLabel = computed(() =>
  isViewingAuthoritativeEnglish.value
    ? selectedContent.value.automatedTranslationNotice.returnToTranslation
    : selectedContent.value.automatedTranslationNotice.viewEnglish
);

watch(locale, () => {
  isViewingAuthoritativeEnglish.value = false;
});

function toggleAuthoritativeEnglish(): void {
  isViewingAuthoritativeEnglish.value = !isViewingAuthoritativeEnglish.value;
}

function renderPolicyNode(node: PrivacyPolicyNode): VNodeChild {
  if (typeof node === "string") {
    return node;
  }

  const children = node.children.map(renderPolicyNode);
  if (node.tag === "a") {
    return h(
      "a",
      {
        href: node.href,
        rel: node.external === true ? "noopener noreferrer" : undefined,
        target: node.external === true ? "_blank" : undefined,
      },
      children
    );
  }

  return h(node.tag, null, children);
}

const PolicyContent = ({
  nodes,
}: {
  nodes: readonly PrivacyPolicyNode[];
}): VNodeChild => h(Fragment, null, nodes.map(renderPolicyNode));
</script>

<style scoped lang="scss">
.translation-notice {
  max-width: 800px;
  margin-block: 0 1.5rem;
  margin-inline: auto;
  padding-block: 1rem;
  padding-inline: 1.25rem;
  border: 2px solid $warning;
  border-inline-start-width: 0.5rem;
  border-radius: 0.5rem;
  background-color: rgba($warning, 0.14);
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.12);
}

.translation-notice__title {
  margin-block: 0 0.5rem;
  font-size: 1.2rem;
  font-weight: 700;
}

.translation-notice__statement {
  margin-block: 0 1rem;
}

.translation-notice__button {
  min-height: 2.75rem;
  padding-block: 0.625rem;
  padding-inline: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.35);
  border-radius: 0.375rem;
  background-color: $warning;
  color: #1d1d1d;
  font: inherit;
  font-weight: 700;
  line-height: 1.25;
  cursor: pointer;

  &:hover {
    filter: brightness(0.96);
  }

  &:active {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 3px solid $primary;
    outline-offset: 3px;
  }
}

.privacy-content {
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.6;

  :deep(h2) {
    margin-top: 2rem;
    margin-bottom: 1rem;
    font-size: 1.5rem;
    font-weight: 600;
  }

  :deep(h3) {
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    font-size: 1.2rem;
    font-weight: 600;
  }

  :deep(section) {
    margin-bottom: 2rem;
  }

  :deep(p) {
    margin-bottom: 1rem;
  }

  :deep(ul),
  :deep(ol) {
    margin-bottom: 1rem;
    padding-inline-start: 1.5rem;

    li {
      margin-bottom: 0.5rem;
    }
  }

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1.5rem;

    th,
    td {
      border: 1px solid #ddd;
      padding: 0.75rem;
      text-align: start;
      vertical-align: top;
    }

    th {
      background-color: rgba($primary, 0.1);
      font-weight: 600;
    }
  }

  :deep(a) {
    color: $primary;
    text-decoration: underline;

    &:hover {
      opacity: 0.8;
    }
  }
}
</style>
