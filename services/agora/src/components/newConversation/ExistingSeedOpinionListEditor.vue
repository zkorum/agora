<template>
  <div class="existing-seed-editor">
    <p v-if="changeLimitError" class="statement-error" role="alert">
      {{ changeLimitError }}
    </p>
    <ZKCard
      v-for="opinion in modelValue"
      :key="opinion.slugId"
      padding="1rem"
      class="existing-seed-card"
      :class="{
        'is-deleted': opinion.deleted,
        'is-edited':
          !opinion.deleted && opinion.content !== opinion.originalContent,
      }"
    >
      <div class="statement-controls">
        <span
          v-if="opinion.deleted"
          class="draft-status deleted-status"
          role="status"
        >
          <i class="pi pi-trash" aria-hidden="true" />
          {{ t("deletedStatus") }}
        </span>
        <span
          v-else-if="opinion.content !== opinion.originalContent"
          class="draft-status edited-status"
          role="status"
        >
          <i class="pi pi-pencil" aria-hidden="true" />
          {{ t("editedStatus") }}
        </span>
        <div v-if="editable" class="statement-actions">
          <PrimeButton
            v-if="opinion.deleted"
            :label="t('undoDelete')"
            icon="pi pi-undo"
            text
            :disabled="disabled"
            @click="
              updateOpinion({
                slugId: opinion.slugId,
                action: { kind: 'restore' },
              })
            "
          />
          <template v-else>
            <PrimeButton
              v-if="opinion.content !== opinion.originalContent"
              :label="t('undoEdit')"
              text
              :disabled="disabled"
              @click="
                updateOpinion({
                  slugId: opinion.slugId,
                  action: { kind: 'undo_edit' },
                })
              "
            />
            <PrimeButton
              v-if="opinion.editing.allowed"
              :label="
                activeSlugId === opinion.slugId
                  ? t('doneEditing')
                  : t('editStatement')
              "
              :icon="
                activeSlugId === opinion.slugId ? 'pi pi-check' : 'pi pi-pencil'
              "
              text
              :disabled="disabled"
              @click="
                activeSlugId =
                  activeSlugId === opinion.slugId ? undefined : opinion.slugId
              "
            />
            <PrimeButton
              :aria-label="t('deleteStatement')"
              icon="pi pi-trash"
              severity="danger"
              text
              :disabled="disabled"
              @click="
                updateOpinion({
                  slugId: opinion.slugId,
                  action: { kind: 'delete' },
                })
              "
            />
          </template>
        </div>
      </div>
      <p v-if="errors.has(opinion.slugId)" class="statement-error" role="alert">
        {{ errors.get(opinion.slugId) }}
      </p>
      <p
        v-if="editable && !opinion.editing.allowed && !opinion.deleted"
        class="editing-restricted"
      >
        {{ restrictionMessage(opinion.editing.reason) }}
      </p>
      <Editor
        v-if="
          editable &&
          opinion.editing.allowed &&
          !opinion.deleted &&
          activeSlugId === opinion.slugId
        "
        :model-value="opinion.content"
        :placeholder="itemT('inputTextPlaceholder')"
        :show-toolbar="true"
        :single-line="false"
        :disabled="disabled"
        :max-length="MAX_LENGTH_OPINION"
        :show-character-count="true"
        min-height="3rem"
        @update:model-value="
          (content: string) =>
            updateOpinion({
              slugId: opinion.slugId,
              action: { kind: 'edit', content },
            })
        "
      />
      <div v-else :class="{ 'deleted-content': opinion.deleted }">
        <ZKHtmlContent
          :html-body="opinion.content"
          :compact-mode="false"
          :enable-links="!opinion.deleted"
          :collapsible="false"
        />
      </div>
    </ZKCard>
  </div>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import { seedOpinionItemTranslations } from "src/components/newConversation/SeedOpinionItem.i18n";
import { useSeedOpinionValidationMessages } from "src/components/newConversation/useSeedOpinionValidationMessages";
import { opinionEditingTranslations } from "src/components/post/comments/opinionEditing.i18n";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { editSeedOpinionsTranslations } from "src/pages/conversation/[conversationSlugId]/edit/seed/index.i18n";
import { MAX_SEED_OPINIONS_PER_SUBMISSION } from "src/shared/seedOpinions";
import { MAX_LENGTH_OPINION } from "src/shared/shared";
import type {
  SeedOpinionValidationFailure,
  UpdateConversationResponse,
} from "src/shared/types/dto";
import type { OpinionEditingAvailability } from "src/shared/types/zod";
import { validateSeedOpinionAdditions } from "src/shared/utils/seedOpinions";
import type { ExistingSeedOpinionDraft } from "src/stores/editConversation";
import { defineAsyncComponent, ref, watch } from "vue";

defineOptions({ components: { PrimeButton: Button } });
const props = defineProps<{
  modelValue: ExistingSeedOpinionDraft[];
  editable: boolean;
  disabled: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: ExistingSeedOpinionDraft[]];
}>();
const { t } = useComponentI18n(editSeedOpinionsTranslations);
const { getFailureMessage } = useSeedOpinionValidationMessages();
const { t: itemT } = useComponentI18n(seedOpinionItemTranslations);
const { t: editT } = useComponentI18n(opinionEditingTranslations);
const activeSlugId = ref<string>();
const Editor = defineAsyncComponent(
  () => import("src/components/editor/Editor.vue")
);
const errors = ref(new Map<string, string>());
const changeLimitError = ref<string>();
watch(
  () => props.modelValue,
  (next, previous) => {
    if (
      next.length !== previous.length ||
      next.some((opinion, index) => {
        const old = previous[index];
        return (
          old === undefined ||
          opinion.slugId !== old.slugId ||
          opinion.content !== old.content ||
          opinion.deleted !== old.deleted
        );
      })
    ) {
      errors.value.clear();
      changeLimitError.value = undefined;
    }
  }
);

type DraftAction =
  | { kind: "edit"; content: string }
  | { kind: "delete" }
  | { kind: "restore" }
  | { kind: "undo_edit" };
function updateOpinion({
  slugId,
  action,
}: {
  slugId: string;
  action: DraftAction;
}): void {
  if (props.disabled || !props.editable) return;
  if (action.kind === "delete" && activeSlugId.value === slugId)
    activeSlugId.value = undefined;
  emit(
    "update:modelValue",
    props.modelValue.map((opinion) => {
      if (opinion.slugId !== slugId) return opinion;
      switch (action.kind) {
        case "delete":
          return { ...opinion, deleted: true };
        case "restore":
          return { ...opinion, deleted: false };
        case "undo_edit":
          return { ...opinion, content: opinion.originalContent };
        case "edit":
          return opinion.editing.allowed && !opinion.deleted
            ? { ...opinion, content: action.content }
            : opinion;
      }
    })
  );
}

function showFailure({
  slugId,
  failure,
}: {
  slugId: string;
  failure: SeedOpinionValidationFailure;
}): void {
  errors.value.set(slugId, getFailureMessage(failure));
  activeSlugId.value = slugId;
}

function showChangeFailure(
  response: Extract<
    UpdateConversationResponse,
    { reason: "seed_opinion_change_rejected" }
  >
): void {
  errors.value.set(
    response.seedOpinionSlugId,
    response.changeFailure === "version_conflict" ||
      response.changeFailure === "not_found"
      ? t("statementChanged")
      : restrictionMessage(response.changeFailure)
  );
  if (response.changeFailure === "has_votes") {
    emit(
      "update:modelValue",
      props.modelValue.map((opinion) =>
        opinion.slugId === response.seedOpinionSlugId
          ? { ...opinion, editing: { allowed: false, reason: "has_votes" } }
          : opinion
      )
    );
  }
}

function restrictionMessage(
  reason: Extract<OpinionEditingAvailability, { allowed: false }>["reason"]
): string {
  return reason === "has_votes" ? editT("hasVotes") : t("editingUnavailable");
}

function validate(): boolean {
  errors.value.clear();
  const changedCount = props.modelValue.filter(
    (opinion) => opinion.deleted || opinion.content !== opinion.originalContent
  ).length;
  changeLimitError.value =
    changedCount > MAX_SEED_OPINIONS_PER_SUBMISSION
      ? t("changeLimit", { limit: MAX_SEED_OPINIONS_PER_SUBMISSION })
      : undefined;
  const surviving = props.modelValue.filter((opinion) => !opinion.deleted);
  const edited = surviving.filter(
    (opinion) => opinion.content !== opinion.originalContent
  );
  const failures = validateSeedOpinionAdditions({
    opinions: edited.map((opinion) => opinion.content),
    existingOpinions: surviving
      .filter((opinion) => opinion.content === opinion.originalContent)
      .map((opinion) => opinion.content),
  });
  for (const failure of failures) {
    const opinion = edited[failure.index];
    if (opinion !== undefined)
      errors.value.set(opinion.slugId, getFailureMessage(failure));
  }
  for (const opinion of edited) {
    if (!opinion.editing.allowed)
      errors.value.set(
        opinion.slugId,
        restrictionMessage(opinion.editing.reason)
      );
  }
  const first = failures.at(0);
  if (first !== undefined) activeSlugId.value = edited[first.index]?.slugId;
  return errors.value.size === 0 && changeLimitError.value === undefined;
}

defineExpose({ validate, showFailure, showChangeFailure });
</script>

<style scoped lang="scss">
.existing-seed-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.existing-seed-card {
  border: 1px solid #e7e7ef;
  background-color: white;
}
.is-edited {
  border-color: $primary;
}
.is-deleted {
  border-color: $negative;
  background-color: #fff5f5;
}
.statement-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-block-end: 0.5rem;
}
.statement-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-inline-start: auto;
  gap: 0.25rem;
}
.draft-status {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: var(--font-weight-medium);
}
.edited-status {
  color: $primary;
}
.deleted-status,
.statement-error {
  color: $negative;
}
.deleted-content {
  color: $color-text-weak;
  text-decoration: line-through;
  opacity: 0.65;
}
.deleted-content :deep(*) {
  text-decoration: line-through;
}
.statement-error {
  margin-block: 0 0.75rem;
  font-size: 0.85rem;
}
.editing-restricted {
  margin-block: 0 0.75rem;
  color: $color-text-weak;
  font-size: 0.85rem;
}
</style>
