<template>
  <footer class="project-page-footer">
    <span class="project-page-footer__line">
      <span>{{ t("poweredBy") }}</span>
      <SpaLink
        to="/"
        class="project-page-footer__link"
        :aria-label="t('homeAriaLabel')"
      >
        <ZKStyledText text="Agora Citizen Network" :add-gradient="true" />
      </SpaLink>
    </span>
    <span class="project-page-footer__line project-page-footer__legal-links">
      <SpaLink
        :to="{ name: '/legal/terms/' }"
        class="project-page-footer__link"
        target="_blank"
        rel="noopener noreferrer"
      >
        <ZKStyledText :text="t('termsOfService')" :add-gradient="true" />
      </SpaLink>
      <span class="project-page-footer__separator" aria-hidden="true">&middot;</span>
      <SpaLink
        :to="{ name: '/legal/privacy/' }"
        class="project-page-footer__link"
        target="_blank"
        rel="noopener noreferrer"
      >
        <ZKStyledText :text="t('privacyPolicy')" :add-gradient="true" />
      </SpaLink>
    </span>
  </footer>
</template>

<script setup lang="ts">
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKStyledText from "src/components/ui-library/ZKStyledText.vue";
import { parseSupportedDisplayLanguageOrUndefined } from "src/shared/languages";
import { computed } from "vue";

import {
  type ProjectPageFooterTranslations,
  projectPageFooterTranslations,
} from "./ProjectPageFooter.i18n";

const props = defineProps<{
  languageCode: string;
}>();

const translations = computed(
  () =>
    projectPageFooterTranslations[
      parseSupportedDisplayLanguageOrUndefined(props.languageCode) ?? "en"
    ]
);

function t(key: keyof ProjectPageFooterTranslations): string {
  return translations.value[key];
}
</script>

<style scoped lang="scss">
.project-page-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 2.5rem 0 0;
  color: $sky-dark;
  font-size: 0.82rem;
  text-align: center;
}

.project-page-footer__line {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem;
}

.project-page-footer__legal-links {
  align-items: center;
  column-gap: 0.5rem;
}

.project-page-footer__separator {
  font-size: 1.25rem;
  font-weight: var(--font-weight-bold);
  line-height: 1;
}

.project-page-footer__link {
  display: inline-block;
  font-weight: var(--font-weight-bold);
  transition: transform 0.15s ease-out;

  &:active {
    transform: scale(0.98);
  }
}
</style>
