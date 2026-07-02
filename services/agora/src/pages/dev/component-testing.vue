<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar :title="t('componentTesting')" :center-content="true" />
  </Teleport>

  <div class="container">
    <SpaLink to="/dev/long-rich-text-disclosure" class="route-card">
      <div class="route-card-header">
        <i class="pi pi-align-left section-icon"></i>
        <span>Long rich text disclosure</span>
      </div>
      <p class="route-card-description">
        Open a conversation-page preview with controls for long descriptions,
        compact mode, and statements.
      </p>
    </SpaLink>

    <SpaLink to="/dev/project-page" class="route-card">
      <div class="route-card-header">
        <i class="pi pi-sitemap section-icon"></i>
        <span>Project page</span>
      </div>
      <p class="route-card-description">
        Open a full-screen project-page showcase with static project, activity,
        attribution, language, and contact variants.
      </p>
    </SpaLink>

    <SpaLink to="/dev/project-conversation-layout" class="route-card">
      <div class="route-card-header">
        <i class="pi pi-comments section-icon"></i>
        <span>Project conversation layout</span>
      </div>
      <p class="route-card-description">
        Open a view-only project-scoped conversation layout using the reusable
        project shell, existing conversation action bar, and statement list.
      </p>
    </SpaLink>

    <SpaLink to="/dev/project-conversation-report-layout" class="route-card">
      <div class="route-card-header">
        <i class="pi pi-chart-bar section-icon"></i>
        <span>Project conversation report</span>
      </div>
      <p class="route-card-description">
        Open a project-scoped report layout preview with mocked report data and
        the reusable project conversation shell.
      </p>
    </SpaLink>

    <AnalysisVariantLoadingTest />
    <CreateConversationProjectLanguageTest />
    <ConversationLanguageSettingDialogTest />
    <PreferencesDialogTest />
    <OpinionGroupVisualizationTest />
    <AnalysisReportTest />
    <AsyncStateHandlerTest />
    <EmbeddedBrowserWarningTest />
  </div>
</template>

<script setup lang="ts">
import { StandardMenuBar } from "src/components/navigation/header/variants";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type ComponentTestingTranslations,
  componentTestingTranslations,
} from "./component-testing.i18n";
import AnalysisReportTest from "./test-components/AnalysisReportTest.vue";
import AnalysisVariantLoadingTest from "./test-components/AnalysisVariantLoadingTest.vue";
import AsyncStateHandlerTest from "./test-components/AsyncStateHandlerTest.vue";
import ConversationLanguageSettingDialogTest from "./test-components/ConversationLanguageSettingDialogTest.vue";
import CreateConversationProjectLanguageTest from "./test-components/CreateConversationProjectLanguageTest.vue";
import EmbeddedBrowserWarningTest from "./test-components/EmbeddedBrowserWarningTest.vue";
import OpinionGroupVisualizationTest from "./test-components/OpinionGroupVisualizationTest.vue";
import PreferencesDialogTest from "./test-components/PreferencesDialogTest.vue";

const { isActive } = usePageLayout({
  enableFooter: false,
  reducedWidth: true,
  addBottomPadding: true,
});

const { t } = useComponentI18n<ComponentTestingTranslations>(
  componentTestingTranslations
);
</script>

<style scoped lang="scss">
.container {
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}

.route-card {
  display: block;
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid $grey-4;
  border-radius: 0.75rem;
  background: white;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.route-card:hover {
  border-color: $primary;
  box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 8%);
}

.route-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: var(--font-weight-semibold);

  .section-icon {
    color: $primary;
  }
}

.route-card-description {
  margin: 0.75rem 0 0;
  color: $grey-8;
  line-height: 1.5;
}
</style>
