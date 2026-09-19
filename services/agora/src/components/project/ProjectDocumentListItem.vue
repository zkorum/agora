<template>
  <article
    class="project-document-list-item"
    :class="{
      'project-document-list-item--with-divider': showDivider,
    }"
  >
    <div class="project-document-list-item__details">
      <div class="project-document-list-item__name">
        {{ document.name }}
      </div>
    </div>

    <div
      v-for="version in versions"
      :key="version.audience"
      class="project-document-list-item__version-row"
    >
      <span class="project-document-list-item__version">
        <q-icon
          v-if="version.audience === 'owner'"
          name="mdi-lock-outline"
          size="0.9rem"
        />
        {{ versionLabel(version.audience) }}
      </span>
      <div class="project-document-list-item__actions">
        <ZKButton
          v-if="isInlineProjectDocumentContentType(version.contentType)"
          button-type="compactButton"
          flat
          color="primary"
          :loading="isLoading({ version, mode: 'inline' })"
          :disable="activeAction !== undefined"
          :aria-label="`${viewLabel}: ${document.name} — ${versionLabel(version.audience)}`"
          @click="emit('view', version)"
        >
          <span class="project-document-list-item__action-content">
            <q-icon name="mdi-eye-outline" size="1rem" />
            {{ viewLabel }}
          </span>
        </ZKButton>
        <ZKButton
          button-type="compactButton"
          flat
          color="primary"
          :loading="isLoading({ version, mode: 'download' })"
          :disable="activeAction !== undefined"
          :aria-label="`${downloadLabel}: ${document.name} — ${versionLabel(version.audience)}`"
          @click="emit('download', version)"
        >
          <span class="project-document-list-item__action-content">
            <q-icon name="mdi-download-outline" size="1rem" />
            {{ downloadLabel }}
          </span>
        </ZKButton>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { isInlineProjectDocumentContentType } from "src/shared/projectDocument";
import type {
  ProjectDocumentVersion,
  ProjectPageDocument,
} from "src/shared/types/dto";
import { computed } from "vue";

import type { ProjectDocumentAction } from "./projectPageTypes";

const props = defineProps<{
  document: ProjectPageDocument;
  viewLabel: string;
  downloadLabel: string;
  participantVersionLabel: string;
  ownerVersionLabel: string;
  activeAction: ProjectDocumentAction | undefined;
  showDivider: boolean;
}>();

const emit = defineEmits<{
  view: [version: ProjectDocumentVersion];
  download: [version: ProjectDocumentVersion];
}>();

const versions = computed<ProjectDocumentVersion[]>(() => {
  const { participant, owner } = props.document.versions;
  return owner === undefined ? [participant] : [participant, owner];
});

function versionLabel(audience: ProjectDocumentVersion["audience"]): string {
  return audience === "owner"
    ? props.ownerVersionLabel
    : props.participantVersionLabel;
}

function isLoading({
  version,
  mode,
}: {
  version: ProjectDocumentVersion;
  mode: ProjectDocumentAction["mode"];
}): boolean {
  return (
    props.activeAction?.documentId === props.document.documentId &&
    props.activeAction.audience === version.audience &&
    props.activeAction.mode === mode
  );
}
</script>

<style scoped lang="scss">
.project-document-list-item {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
  padding-block: 0.7rem;
}

.project-document-list-item--with-divider {
  border-block-end: 1px solid $sky-lighter;
}

.project-document-list-item__details {
  min-width: 0;
}

.project-document-list-item__version-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem 0.6rem;
  min-width: 0;
}

.project-document-list-item__name {
  color: $ink-darker;
  font-size: 0.95rem;
  font-weight: var(--font-weight-medium);
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.project-document-list-item__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 0.15rem;
  margin-inline-start: auto;
}

.project-document-list-item__version {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: $ink-light;
  font-size: 0.75rem;
}

.project-document-list-item__action-content {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: $primary;
  font-size: 0.78rem;
  font-weight: var(--font-weight-semibold);
}

.project-document-list-item :deep(.q-btn:focus-visible) {
  outline: 2px solid $primary;
  outline-offset: 2px;
}
</style>
