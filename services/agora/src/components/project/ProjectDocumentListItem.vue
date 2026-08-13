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

    <div class="project-document-list-item__actions">
      <ZKButton
        v-if="isInlineProjectDocumentContentType(document.contentType)"
        button-type="compactButton"
        flat
        color="primary"
        :loading="loadingMode === 'inline'"
        :disable="disabled"
        :aria-label="`${viewLabel}: ${document.name}`"
        @click="emit('view')"
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
        :loading="loadingMode === 'download'"
        :disable="disabled"
        :aria-label="`${downloadLabel}: ${document.name}`"
        @click="emit('download')"
      >
        <span class="project-document-list-item__action-content">
          <q-icon name="mdi-download-outline" size="1rem" />
          {{ downloadLabel }}
        </span>
      </ZKButton>
    </div>
  </article>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { isInlineProjectDocumentContentType } from "src/shared/projectDocument";
import type { ProjectPageDocument } from "src/shared/types/dto";

defineProps<{
  document: ProjectPageDocument;
  viewLabel: string;
  downloadLabel: string;
  loadingMode: "inline" | "download" | undefined;
  disabled: boolean;
  showDivider: boolean;
}>();

const emit = defineEmits<{
  view: [];
  download: [];
}>();
</script>

<style scoped lang="scss">
.project-document-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
  padding-block: 0.7rem;
}

.project-document-list-item--with-divider {
  border-block-end: 1px solid $sky-lighter;
}

.project-document-list-item__details {
  min-width: 0;
}

.project-document-list-item__name {
  overflow: hidden;
  color: $ink-darker;
  font-size: 0.95rem;
  font-weight: var(--font-weight-medium);
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-document-list-item__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 0.15rem;
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

@media (max-width: 400px) {
  .project-document-list-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .project-document-list-item__actions {
    align-self: flex-end;
  }
}
</style>
