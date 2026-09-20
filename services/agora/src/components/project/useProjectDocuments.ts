import type { SupportedDisplayLanguageCodes } from "src/shared/languages";
import { isInlineProjectDocumentContentType } from "src/shared/projectDocument";
import type {
  AccessProjectDocumentResponse,
  ProjectPageDocument,
} from "src/shared/types/dto";
import {
  computed,
  onActivated,
  onDeactivated,
  onScopeDispose,
  readonly,
  shallowRef,
  useId,
  watch,
} from "vue";

import type {
  ProjectDocumentAccess,
  ProjectDocumentAction,
  ProjectDocumentSelection,
  ProjectDocumentViewerState,
} from "./projectPageTypes";

export function useProjectDocuments({
  projectSlug,
  documents,
  languageCode,
  accessDocument,
  onAccessError,
}: {
  projectSlug: () => string;
  documents: () => readonly ProjectPageDocument[];
  languageCode: () => SupportedDisplayLanguageCodes;
  accessDocument: ProjectDocumentAccess;
  onAccessError: (error: { error: unknown; retry: () => void }) => void;
}) {
  const viewer = shallowRef<ProjectDocumentViewerState>();
  const pending = shallowRef<{
    selection: ProjectDocumentSelection;
    action: ProjectDocumentAction;
  }>();
  let requestId = 0;
  let nextFrameId = 0;
  const frameIdPrefix = `project-document-${useId()}`;
  let isActive = true;
  let loadingTimeout: ReturnType<typeof setTimeout> | undefined;

  function clearLoadingTimeout(): void {
    clearTimeout(loadingTimeout);
    loadingTimeout = undefined;
  }

  function closeViewer(): void {
    requestId += 1;
    pending.value = undefined;
    viewer.value = undefined;
    clearLoadingTimeout();
  }

  function resolveSelection({
    document,
    version,
  }: ProjectDocumentSelection): ProjectDocumentSelection | undefined {
    const currentDocument = documents().find(
      (current) =>
        current.documentId === document.documentId &&
        current.languageCode === document.languageCode
    );
    const currentVersion = currentDocument?.versions[version.audience];
    return currentDocument === undefined ||
      currentVersion === undefined ||
      currentVersion.contentType !== version.contentType
      ? undefined
      : { document: currentDocument, version: currentVersion };
  }

  function handleViewerLoaded(frameId: string): void {
    const current = viewer.value;
    if (current === undefined || current.id !== frameId) return;
    clearLoadingTimeout();
    viewer.value = { ...current, loadState: "loaded" };
  }

  function showViewer({
    selection,
    access,
  }: {
    selection: ProjectDocumentSelection;
    access: AccessProjectDocumentResponse;
  }): void {
    if (!isInlineProjectDocumentContentType(access.contentType)) {
      throw new Error("The document service returned a non-previewable file");
    }
    clearLoadingTimeout();
    const id = `${frameIdPrefix}-${++nextFrameId}`;
    viewer.value = {
      id,
      selection,
      access: { ...access, contentType: access.contentType },
      loadState: "loading",
    };
    loadingTimeout = setTimeout(() => {
      const current = viewer.value;
      if (current?.id === id)
        viewer.value = { ...current, loadState: "timeout" };
      loadingTimeout = undefined;
    }, 15_000);
  }

  async function performAction({
    selection,
    mode,
  }: {
    selection: ProjectDocumentSelection;
    mode: ProjectDocumentAction["mode"];
  }): Promise<void> {
    if (!isActive || pending.value !== undefined) return;
    const currentSelection = resolveSelection(selection);
    if (currentSelection === undefined) return;
    const { document: selectedDocument, version } = currentSelection;
    const id = ++requestId;
    const action = {
      documentId: selectedDocument.documentId,
      audience: version.audience,
      mode,
    };
    pending.value = { selection: currentSelection, action };
    try {
      const access = await accessDocument({
        ...action,
        projectSlug: projectSlug(),
        languageCode: languageCode(),
      });
      if (id !== requestId || !isActive) return;
      if (
        access.audience !== version.audience ||
        access.contentType !== version.contentType
      ) {
        throw new Error(
          "The document service returned a different version than requested"
        );
      }
      const latestSelection = resolveSelection(currentSelection);
      if (latestSelection === undefined) return;
      if (mode === "inline") {
        showViewer({ selection: latestSelection, access });
      } else {
        const anchor = window.document.createElement("a");
        anchor.href = access.url;
        anchor.download = access.downloadFileName;
        anchor.rel = "noopener noreferrer";
        window.document.body.append(anchor);
        anchor.click();
        anchor.remove();
      }
    } catch (error) {
      if (id === requestId && isActive) {
        onAccessError({
          error,
          retry: () => {
            // A notification must not revive a dismissed viewer or a previous page.
            if (id === requestId && isActive)
              void performAction({ selection: currentSelection, mode });
          },
        });
      }
    } finally {
      if (id === requestId) pending.value = undefined;
    }
  }

  function viewDocument(selection: ProjectDocumentSelection): Promise<void> {
    return performAction({ selection, mode: "inline" });
  }

  function downloadDocument(
    selection: ProjectDocumentSelection
  ): Promise<void> {
    return performAction({ selection, mode: "download" });
  }

  function retryViewer(): void {
    if (viewer.value !== undefined) void viewDocument(viewer.value.selection);
  }

  function downloadActiveDocument(): void {
    if (viewer.value !== undefined)
      void downloadDocument(viewer.value.selection);
  }

  watch(projectSlug, closeViewer, { flush: "sync" });
  watch(languageCode, closeViewer, { flush: "sync" });
  watch(
    documents,
    () => {
      if (
        pending.value !== undefined &&
        resolveSelection(pending.value.selection) === undefined
      ) {
        requestId += 1;
        pending.value = undefined;
      }
      const current = viewer.value;
      if (current === undefined) return;
      const selection = resolveSelection(current.selection);
      if (selection === undefined) closeViewer();
      else viewer.value = { ...current, selection };
    },
    { flush: "sync" }
  );
  onActivated(() => {
    isActive = true;
  });
  onDeactivated(() => {
    isActive = false;
    closeViewer();
  });
  onScopeDispose(() => {
    isActive = false;
    closeViewer();
  });

  return {
    viewer: readonly(viewer),
    activeAction: computed(() => pending.value?.action),
    viewDocument,
    downloadDocument,
    retryViewer,
    downloadActiveDocument,
    closeViewer,
    handleViewerLoaded,
  };
}
