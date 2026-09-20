<template>
  <section
    v-if="documents.length > 0"
    class="project-documents"
    :aria-labelledby="headingId"
  >
    <ProjectSectionHeading
      :heading-id="headingId"
      :title="t('documentsTitle')"
    />

    <div class="project-documents__list">
      <ProjectDocumentListItem
        v-for="(document, index) in documents"
        :key="document.documentId"
        :document="document"
        :view-label="t('viewDocument')"
        :download-label="t('downloadDocument')"
        :participant-version-label="t('documentParticipantVersion')"
        :owner-version-label="t('documentOwnerVersion')"
        :active-action="activeAction"
        :show-divider="index < documents.length - 1"
        @view="viewDocument({ document, version: $event })"
        @download="downloadDocument({ document, version: $event })"
      />
    </div>

    <p class="project-documents__access-hint">
      <q-icon name="mdi-lock-outline" size="0.9rem" />
      {{ t("documentsAccessHint") }}
    </p>

    <q-dialog
      v-model="isViewerOpen"
      maximized
      transition-show="fade"
      transition-hide="fade"
    >
      <div v-if="viewer !== undefined" class="project-documents__viewer">
        <header
          class="project-documents__viewer-header"
          :dir="getLanguageTextDirection(languageCode)"
        >
          <ZKIconButton
            class="project-documents__viewer-back"
            :icon="backIcon"
            icon-color="var(--q-primary)"
            :aria-label="t('closeDocument')"
            :title="t('closeDocument')"
            @click="closeViewer"
          />
          <div class="project-documents__viewer-heading">
            <strong :title="viewer.selection.document.name">{{
              viewer.selection.document.name
            }}</strong>
            <div class="project-documents__viewer-metadata">
              <span class="project-documents__viewer-version">{{
                t(
                  viewer.access.audience === "owner"
                    ? "documentOwnerVersion"
                    : "documentParticipantVersion"
                )
              }}</span>
              <span class="project-documents__viewer-filename">{{
                viewer.access.downloadFileName
              }}</span>
            </div>
          </div>
          <div class="project-documents__viewer-actions">
            <ZKButton
              button-type="icon"
              flat
              color="primary"
              icon="mdi-refresh"
              :loading="
                activeAction?.mode === 'inline' ||
                viewer.loadState === 'loading'
              "
              :disable="activeAction !== undefined"
              :aria-label="t('reloadDocument')"
              @click="retryViewer"
            >
              <q-tooltip>{{ t("reloadDocument") }}</q-tooltip>
            </ZKButton>
            <ZKButton
              button-type="icon"
              flat
              color="primary"
              icon="mdi-download-outline"
              :loading="activeAction?.mode === 'download'"
              :disable="activeAction !== undefined"
              :aria-label="t('downloadDocument')"
              @click="downloadActiveDocument"
            >
              <q-tooltip>{{ t("downloadDocument") }}</q-tooltip>
            </ZKButton>
          </div>
        </header>
        <SandboxedHtmlFrame
          v-if="viewer.access.contentType === 'text/html'"
          :id="viewer.id"
          :key="viewer.id"
          :mode="viewer.access.htmlScriptsEnabled ? 'interactive' : 'static'"
          class="project-documents__frame"
          :source="{ kind: 'url', url: viewer.access.url }"
          :title="viewer.selection.document.name"
          @load="handleFrameLoad"
        />
        <!-- Native PDF viewers cannot render inside an empty sandbox. -->
        <iframe
          v-else
          :id="viewer.id"
          :key="viewer.id"
          class="project-documents__frame"
          :src="viewer.access.url"
          :title="viewer.selection.document.name"
          referrerpolicy="no-referrer"
          @load="handleFrameLoad"
        />
        <div
          v-if="viewer.loadState !== 'loaded'"
          class="project-documents__viewer-loading"
        >
          <ErrorRetryBlock
            v-if="
              viewer.loadState === 'timeout' && activeAction?.mode !== 'inline'
            "
            :title="t('documentLoadFailed')"
            :retry-label="t('retryAction')"
            compact
            @retry="retryViewer"
          />
          <PageLoadingSpinner
            v-else
            role="status"
            :aria-label="t('documentLoading')"
          />
        </div>
      </div>
    </q-dialog>
  </section>
</template>

<script setup lang="ts">
import { isAxiosError } from "axios";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import SandboxedHtmlFrame from "src/components/ui-library/SandboxedHtmlFrame.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKIconButton from "src/components/ui-library/ZKIconButton.vue";
import {
  getLanguageTextDirection,
  type SupportedDisplayLanguageCodes,
} from "src/shared/languages";
import type { ProjectPageDocument } from "src/shared/types/dto";
import { useNotify } from "src/utils/ui/notify";
import { computed, useId } from "vue";

import ProjectDocumentListItem from "./ProjectDocumentListItem.vue";
import {
  type ProjectPageTranslations,
  translateProjectPageText,
} from "./projectPageI18n";
import type { ProjectDocumentAccess } from "./projectPageTypes";
import ProjectSectionHeading from "./ProjectSectionHeading.vue";
import { useProjectDocuments } from "./useProjectDocuments";

const props = defineProps<{
  projectSlug: string;
  documents: readonly ProjectPageDocument[];
  languageCode: SupportedDisplayLanguageCodes;
  accessDocument: ProjectDocumentAccess;
}>();
const headingId = `project-documents-${useId()}`;
const { showNotifyMessage } = useNotify();
const {
  viewer,
  activeAction,
  viewDocument,
  downloadDocument,
  retryViewer,
  downloadActiveDocument,
  closeViewer,
  handleViewerLoaded,
} = useProjectDocuments({
  projectSlug: () => props.projectSlug,
  documents: () => props.documents,
  languageCode: () => props.languageCode,
  accessDocument: (request) => props.accessDocument(request),
  onAccessError: ({ error, retry }) => {
    const accessDenied =
      isAxiosError(error) &&
      (error.response?.status === 401 || error.response?.status === 403);
    showNotifyMessage(
      accessDenied
        ? t("documentAccessDenied")
        : {
            message: t("documentLoadFailed"),
            actionLabel: t("retryAction"),
            onAction: retry,
          }
    );
  },
});
const isViewerOpen = computed({
  get: () => viewer.value !== undefined,
  set: (open: boolean) => {
    if (!open) closeViewer();
  },
});
const backIcon = computed(() =>
  getLanguageTextDirection(props.languageCode) === "rtl"
    ? "mdi:arrow-right"
    : "mdi:arrow-left"
);

function t(key: keyof ProjectPageTranslations): string {
  return translateProjectPageText({ languageCode: props.languageCode, key });
}

function handleFrameLoad(event: Event): void {
  if (event.target instanceof HTMLIFrameElement) {
    handleViewerLoaded(event.target.id);
  }
}
</script>

<style scoped lang="scss">
.project-documents {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.project-documents__list {
  margin-block-start: 0.4rem;
  min-width: 0;
}

.project-documents__access-hint {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0.65rem 0 0;
  color: $ink-light;
  font-size: 0.72rem;
  line-height: 1.35;
}

.project-documents__viewer {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: 100%;
  height: 100%;
  background: $app-background-color;
}

.project-documents__viewer-header {
  display: grid;
  grid-template-columns: minmax(5.5rem, 1fr) minmax(0, 2fr) minmax(5.5rem, 1fr);
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 0.75rem;
  color: $ink-darker;
  background: $app-background-color;
  border-block-end: 1px solid $sky-lighter;
}

.project-documents__viewer-back {
  justify-self: start;
}

.project-documents__viewer-heading {
  display: grid;
  min-width: 0;
  text-align: center;
  strong {
    font-size: 0.95rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.project-documents__viewer-filename {
  color: $ink-light;
  font-size: 0.72rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-documents__viewer-metadata {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-width: 0;
}

.project-documents__viewer-version {
  flex: none;
  font-size: 0.72rem;
  color: $primary;
}

.project-documents__viewer-actions {
  display: flex;
  justify-self: end;
  align-items: center;
  gap: 0.25rem;
}

@media (max-width: 600px) {
  .project-documents__viewer-filename {
    display: none;
  }
}

.project-documents__frame {
  grid-row: 2;
  grid-column: 1;
  width: 100%;
  height: 100%;
  border: 0;
  background: white;
}

.project-documents__viewer-loading {
  z-index: 1;
  display: grid;
  grid-row: 2;
  grid-column: 1;
  place-items: center;
  background: rgba(white, 0.86);
}
</style>
