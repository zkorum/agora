<template>
  <div>
    <Teleport v-if="isActive" to="#page-header">
      <StandardMenuBar :title="content.title" :center-content="true" />
    </Teleport>

    <aside
      v-if="isAutomatedTranslation"
      class="translation-notice"
      role="note"
      aria-live="polite"
      :lang="selectedLanguageCode"
      aria-labelledby="automated-translation-title"
    >
      <div class="translation-notice__heading">
        <span class="translation-notice__marker" aria-hidden="true">!</span>
        <strong id="automated-translation-title">
          {{ selectedContent.automatedTranslationNotice.title }}
        </strong>
      </div>
      <p>{{ selectedContent.automatedTranslationNotice.message }}</p>
      <button
        type="button"
        class="translation-notice__toggle"
        aria-controls="community-guidelines-content"
        :aria-pressed="showAuthoritativeEnglish"
        @click="toggleAuthoritativeEnglish"
      >
        {{
          showAuthoritativeEnglish
            ? selectedContent.automatedTranslationNotice.returnTranslated
            : selectedContent.automatedTranslationNotice.viewEnglish
        }}
      </button>
    </aside>

    <article
      id="community-guidelines-content"
      class="guidelines-content"
      :lang="showAuthoritativeEnglish ? 'en' : selectedLanguageCode"
      :dir="showAuthoritativeEnglish ? 'ltr' : undefined"
    >
      <section>
        <h2>{{ content.moderationPrinciples.heading }}</h2>
        <p>{{ content.moderationPrinciples.introduction }}</p>
        <ul>
          <li
            v-for="principle in content.moderationPrinciples.principles"
            :key="principle.label"
          >
            <strong>{{ principle.label }}</strong>
            {{ principle.description }}
          </li>
        </ul>
      </section>

      <section>
        <h2>{{ content.communityStandards.heading }}</h2>
        <p>{{ content.communityStandards.introduction }}</p>

        <template
          v-for="subsection in content.communityStandards.subsections"
          :key="subsection.heading"
        >
          <h3>{{ subsection.heading }}</h3>
          <ul>
            <li v-for="rule in subsection.rules" :key="rule">{{ rule }}</li>
          </ul>
        </template>
      </section>

      <section>
        <h2>{{ content.moderationProcess.heading }}</h2>

        <h3>{{ content.moderationProcess.reporting.heading }}</h3>
        <p>{{ content.moderationProcess.reporting.introduction }}</p>
        <ul>
          <li
            v-for="category in content.moderationProcess.reporting.categories"
            :key="category.label"
          >
            <strong>{{ category.label }}</strong>
            {{ category.description }}
          </li>
        </ul>

        <h3>{{ content.moderationProcess.review.heading }}</h3>
        <ul>
          <li
            v-for="rule in content.moderationProcess.review.rules"
            :key="rule"
          >
            {{ rule }}
          </li>
        </ul>
      </section>

      <section>
        <h2>{{ content.consequences.heading }}</h2>
        <table>
          <thead>
            <tr>
              <th>{{ content.consequences.violationHeader }}</th>
              <th>{{ content.consequences.consequenceHeader }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in content.consequences.rows" :key="row.label">
              <td>
                <strong>{{ row.label }}</strong>
              </td>
              <td>{{ row.description }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>{{ content.feedback.heading }}</h2>
        <ul>
          <li v-for="point in content.feedback.points" :key="point">
            {{ point }}
          </li>
        </ul>
        <p>{{ content.feedback.closing }}</p>
        <p>
          {{ content.feedback.contactBeforeEmail
          }}<a href="mailto:legal@zkorum.com">legal@zkorum.com</a
          >{{ content.feedback.contactAfterEmail }}
        </p>
      </section>
    </article>
  </div>
</template>

<script setup lang="ts">
import { StandardMenuBar } from "src/components/navigation/header/variants";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { parseSupportedDisplayLanguageOrUndefined } from "src/shared/languages";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { guidelinesContent } from "./index.i18n";

const { isActive } = usePageLayout({ reducedWidth: true });
const { locale } = useI18n();
const showAuthoritativeEnglish = ref(false);

const selectedLanguageCode = computed(
  () => parseSupportedDisplayLanguageOrUndefined(locale.value) ?? "en"
);
const selectedContent = computed(
  () => guidelinesContent[selectedLanguageCode.value]
);
const isAutomatedTranslation = computed(
  () => selectedLanguageCode.value !== "en"
);
const content = computed(() =>
  showAuthoritativeEnglish.value ? guidelinesContent.en : selectedContent.value
);

function toggleAuthoritativeEnglish(): void {
  showAuthoritativeEnglish.value = !showAuthoritativeEnglish.value;
}

watch(locale, () => {
  showAuthoritativeEnglish.value = false;
});
</script>

<style scoped lang="scss">
.translation-notice {
  max-width: 800px;
  margin: 1rem auto 1.5rem;
  padding: 1rem;
  border: 2px solid #b45309;
  border-inline-start-width: 0.5rem;
  border-radius: 0.5rem;
  color: #7c2d12;
  background-color: #fff7ed;
  box-shadow: 0 2px 8px rgba(124, 45, 18, 0.15);

  p {
    margin: 0.75rem 0;
    line-height: 1.5;
  }
}

.translation-notice__heading {
  display: flex;
  gap: 0.625rem;
  align-items: center;
  font-size: 1.1rem;
}

.translation-notice__marker {
  display: inline-flex;
  flex: 0 0 1.5rem;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  background-color: #b45309;
}

.translation-notice__toggle {
  padding: 0.5rem 0.75rem;
  border: 1px solid currentcolor;
  border-radius: 0.375rem;
  color: inherit;
  background-color: #fff;
  font: inherit;
  font-weight: 600;
  text-align: start;
  cursor: pointer;

  &:hover {
    background-color: #ffedd5;
  }

  &:focus-visible {
    outline: 3px solid rgba(180, 83, 9, 0.35);
    outline-offset: 2px;
  }
}

.guidelines-content {
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

  table {
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
}
</style>
