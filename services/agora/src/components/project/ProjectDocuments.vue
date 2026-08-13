<template>
  <section
    v-if="documents.length > 0"
    class="project-documents"
    aria-labelledby="project-documents-title"
  >
    <ProjectSectionHeading
      heading-id="project-documents-title"
      :title="t({ key: 'documentsTitle' })"
    />

    <div class="project-documents__list">
      <ProjectDocumentListItem
        v-for="(document, index) in documents"
        :key="document.documentId"
        :document="document"
        :view-label="t({ key: 'viewDocument' })"
        :download-label="t({ key: 'downloadDocument' })"
        :loading-mode="loadingMode(document.documentId)"
        :disabled="activeAction !== undefined"
        :show-divider="index < documents.length - 1"
        @view="viewDocument(document)"
        @download="downloadDocument(document)"
      />
    </div>

    <p class="project-documents__access-hint">
      <q-icon name="mdi-lock-outline" size="0.9rem" />
      {{ t({ key: "documentsAccessHint" }) }}
    </p>

    <q-dialog
      v-model="isViewerOpen"
      maximized
      transition-show="fade"
      transition-hide="fade"
      @hide="closeViewer"
    >
      <div class="project-documents__viewer">
        <header class="project-documents__viewer-header">
          <div>
            <strong>{{ activeDocument?.name }}</strong>
            <span>{{ viewerFileName }}</span>
          </div>
          <div class="project-documents__viewer-actions">
            <q-btn
              flat
              no-caps
              icon="mdi-refresh"
              :loading="activeAction?.mode === 'inline'"
              :disable="
                activeDocument === undefined || activeAction !== undefined
              "
              :label="t({ key: 'reloadDocument' })"
              :aria-label="t({ key: 'reloadDocument' })"
              @click="retryViewer"
            />
            <q-btn
              flat
              no-caps
              icon="mdi-download-outline"
              :loading="activeAction?.mode === 'download'"
              :disable="
                activeDocument === undefined || activeAction !== undefined
              "
              :label="t({ key: 'downloadDocument' })"
              :aria-label="t({ key: 'downloadDocument' })"
              @click="downloadActiveDocument"
            />
            <q-btn
              flat
              no-caps
              :icon="backIcon"
              :label="t({ key: 'closeDocument' })"
              :aria-label="t({ key: 'closeDocument' })"
              @click="isViewerOpen = false"
            />
          </div>
        </header>
        <iframe
          v-if="viewerUrl !== undefined && activeDocument !== undefined"
          :key="viewerKey"
          class="project-documents__frame"
          :src="viewerUrl"
          :title="activeDocument.name"
          :sandbox="viewerSandbox"
          referrerpolicy="no-referrer"
          @load="handleViewerLoaded"
        ></iframe>
        <div
          v-if="viewerStatus === 'loading'"
          class="project-documents__viewer-loading"
          role="status"
          aria-live="polite"
        >
          <q-spinner color="primary" size="2.5rem" />
          <span class="visually-hidden">{{
            t({ key: "documentLoading" })
          }}</span>
        </div>
      </div>
    </q-dialog>
  </section>
</template>

<script setup lang="ts">
import { isAxiosError } from "axios";
import {
  getLanguageTextDirection,
  type SupportedDisplayLanguageCodes,
} from "src/shared/languages";
import type { ProjectDocumentContentType } from "src/shared/projectDocument";
import type {
  AccessProjectDocumentResponse,
  ProjectPageDocument,
} from "src/shared/types/dto";
import { useBackendProjectPageApi } from "src/utils/api/projectPage";
import { useNotify } from "src/utils/ui/notify";
import { computed, onBeforeUnmount, ref, watch } from "vue";

import ProjectDocumentListItem from "./ProjectDocumentListItem.vue";
import {
  type ProjectPageTranslations,
  translateProjectPageText,
} from "./projectPageI18n";
import ProjectSectionHeading from "./ProjectSectionHeading.vue";

const props = defineProps<{
  projectSlug: string;
  documents: readonly ProjectPageDocument[];
  languageCode: SupportedDisplayLanguageCodes;
}>();

const { accessProjectDocument } = useBackendProjectPageApi();
const { showNotifyMessage } = useNotify();
const isViewerOpen = ref(false);
const viewerUrl = ref<string | undefined>();
const viewerFileName = ref<string | undefined>();
const viewerContentType = ref<ProjectDocumentContentType | undefined>();
const activeDocument = ref<ProjectPageDocument | undefined>();
type ViewerStatus = "idle" | "loading" | "loaded";
const viewerStatus = ref<ViewerStatus>("idle");
const viewerKey = ref(0);
let viewerLoadingTimeout: ReturnType<typeof setTimeout> | undefined;
type DocumentActionMode = "inline" | "download";
interface DocumentAction {
  documentId: string;
  mode: DocumentActionMode;
}
const activeAction = ref<DocumentAction | undefined>();
let latestActionRequest = 0;
const backIcon = computed(() =>
  getLanguageTextDirection(props.languageCode) === "rtl"
    ? "mdi-arrow-right"
    : "mdi-arrow-left"
);
const viewerSandbox = computed(() =>
  viewerContentType.value === "text/html" ? "allow-scripts" : undefined
);

function invalidateDocumentActions(): void {
  latestActionRequest += 1;
  activeAction.value = undefined;
  isViewerOpen.value = false;
  closeViewer();
}

function startViewerLoad(): void {
  clearViewerLoadingTimeout();
  viewerStatus.value = "loading";
  viewerLoadingTimeout = setTimeout(handleViewerLoaded, 15_000);
}

function handleViewerLoaded(): void {
  clearViewerLoadingTimeout();
  viewerStatus.value = "loaded";
}

function clearViewerLoadingTimeout(): void {
  if (viewerLoadingTimeout === undefined) return;
  clearTimeout(viewerLoadingTimeout);
  viewerLoadingTimeout = undefined;
}

async function retryViewer(): Promise<void> {
  const document = activeDocument.value;
  if (document === undefined) return;
  viewerStatus.value = "loading";
  const response = await getDocumentUrl({ document, mode: "inline" });
  if (response === undefined) {
    viewerStatus.value = "loaded";
    return;
  }
  viewerUrl.value = response.url;
  viewerFileName.value = response.downloadFileName;
  viewerContentType.value = response.contentType;
  viewerKey.value += 1;
  startViewerLoad();
}

watch(
  [() => props.projectSlug, () => props.documents],
  invalidateDocumentActions
);
onBeforeUnmount(invalidateDocumentActions);

function t({
  key,
  params,
}: {
  key: keyof ProjectPageTranslations;
  params?: Readonly<Record<string, string | number>>;
}): string {
  return translateProjectPageText({
    languageCode: props.languageCode,
    key,
    params,
  });
}

function loadingMode(documentId: string): "inline" | "download" | undefined {
  return activeAction.value?.documentId === documentId
    ? activeAction.value.mode
    : undefined;
}

function getCurrentDocument(
  document: ProjectPageDocument
): ProjectPageDocument | undefined {
  return props.documents.find(
    (currentDocument) =>
      currentDocument.documentId === document.documentId &&
      currentDocument.languageCode === document.languageCode &&
      currentDocument.contentType === document.contentType
  );
}

async function getDocumentUrl({
  document,
  mode,
}: {
  document: ProjectPageDocument;
  mode: "inline" | "download";
}): Promise<AccessProjectDocumentResponse | undefined> {
  if (activeAction.value !== undefined) return undefined;
  const currentDocument = getCurrentDocument(document);
  if (currentDocument === undefined) return undefined;
  latestActionRequest += 1;
  const requestId = latestActionRequest;
  activeAction.value = { documentId: currentDocument.documentId, mode };
  try {
    const response = await accessProjectDocument({
      projectSlug: props.projectSlug,
      documentId: currentDocument.documentId,
      languageCode: currentDocument.languageCode,
      mode,
    });
    return requestId === latestActionRequest ? response : undefined;
  } catch (error) {
    if (requestId === latestActionRequest) {
      const accessDenied =
        isAxiosError(error) &&
        (error.response?.status === 401 || error.response?.status === 403);
      showNotifyMessage(
        accessDenied
          ? t({ key: "documentAccessDenied" })
          : {
              message: t({ key: "documentLoadFailed" }),
              actionLabel: t({ key: "retryAction" }),
              onAction: () => {
                if (mode === "inline") {
                  void viewDocument(currentDocument);
                } else {
                  void downloadDocument(currentDocument);
                }
              },
            }
      );
    }
    return undefined;
  } finally {
    if (requestId === latestActionRequest) {
      activeAction.value = undefined;
    }
  }
}

async function viewDocument(document: ProjectPageDocument): Promise<void> {
  const response = await getDocumentUrl({ document, mode: "inline" });
  if (response === undefined) return;
  activeDocument.value = document;
  viewerUrl.value = response.url;
  viewerFileName.value = response.downloadFileName;
  viewerContentType.value = response.contentType;
  startViewerLoad();
  isViewerOpen.value = true;
}

async function downloadDocument(document: ProjectPageDocument): Promise<void> {
  const response = await getDocumentUrl({ document, mode: "download" });
  if (response === undefined) return;
  const anchor = window.document.createElement("a");
  anchor.href = response.url;
  anchor.download = response.downloadFileName;
  anchor.rel = "noopener";
  window.document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

function downloadActiveDocument(): void {
  if (activeDocument.value === undefined) return;
  void downloadDocument(activeDocument.value);
}

function closeViewer(): void {
  viewerUrl.value = undefined;
  viewerFileName.value = undefined;
  viewerContentType.value = undefined;
  activeDocument.value = undefined;
  clearViewerLoadingTimeout();
  viewerStatus.value = "idle";
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
  background: #eef1f6;
}

.project-documents__viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.65rem 1rem;
  color: #fff;
  background: #24273a;
}

.project-documents__viewer-header div {
  display: grid;
  min-width: 0;
}

.project-documents__viewer-header span {
  color: #cbd0df;
  font-size: 0.78rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-documents__viewer-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 0.25rem;
}

.project-documents__frame {
  grid-row: 2;
  grid-column: 1;
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}

.project-documents__viewer-loading {
  z-index: 1;
  display: grid;
  grid-row: 2;
  grid-column: 1;
  place-items: center;
  background: rgba(white, 0.86);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
</style>
