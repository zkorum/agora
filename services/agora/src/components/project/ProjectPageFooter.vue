<template>
  <footer class="project-page-footer">
    <span class="project-page-footer__line">
      <span>{{ t("poweredBy") }}</span>
      <SpaLink to="/" class="project-page-footer__brand-link" :aria-label="t('homeAriaLabel')">
        <ZKStyledText text="Agora Citizen Network" :add-gradient="true" />
      </SpaLink>
    </span>
    <span>{{ t("contentOwnedByProjectOwners") }}</span>
  </footer>
</template>

<script setup lang="ts">
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKStyledText from "src/components/ui-library/ZKStyledText.vue";

import {
  type ProjectPageTranslations,
  translateProjectPageText,
} from "./projectPageI18n";

const props = defineProps<{
  languageCode: string;
}>();

function t(key: keyof ProjectPageTranslations): string {
  return translateProjectPageText({
    languageCode: props.languageCode,
    key,
  });
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

.project-page-footer__brand-link {
  display: inline-block;
  font-weight: var(--font-weight-bold);
  transition: transform 0.15s ease-out;

  &:active {
    transform: scale(0.98);
  }
}
</style>
