<template>
  <div class="scope-fields">
    <ZKSearchableBottomSheetSelect
      :model-value="selectedScopeId"
      :options="scopeOptions"
      label="Project"
      dialog-title="Choose a project"
      dialog-subtitle="Authorization is inferred from your eligible project memberships."
      search-mode="always"
      @update:model-value="updateSelectedScope"
    />

    <div class="scope-fields__conversation-heading">
      <div>
        <strong>Conversations</strong>
        <p>
          The email will add the recipient-specific intersection automatically.
        </p>
      </div>
    </div>

    <ZKSearchableBottomSheetSelect
      :model-value="conversationSelectionModel"
      :options="conversationOptions"
      label="Included conversations"
      placeholder="Select at least one conversation (required)"
      dialog-title="Choose conversations"
      :dialog-subtitle="conversationDialogSubtitle"
      search-mode="always"
      :multiple="currentScope?.kind === 'project'"
      :show-bulk-actions="currentScope?.kind === 'project'"
      :select-all-label="selectAllLabel"
      clear-all-label="Clear all"
      :selected-count-label="getSelectedCountLabel"
      @update:model-value="updateSelectedConversations"
    />

    <p v-if="currentScope?.kind === 'no-project'" class="scope-fields__hint">
      Choose one eligible conversation created without a project.
    </p>
  </div>
</template>

<script setup lang="ts">
import type {
  ConversationUpdateConversationSummary,
  ConversationUpdateScopeSummary,
} from "src/components/conversationUpdates/conversationUpdateTypes";
import ZKSearchableBottomSheetSelect from "src/components/ui-library/ZKSearchableBottomSheetSelect.vue";
import { computed } from "vue";

const props = defineProps<{
  scopes: readonly ConversationUpdateScopeSummary[];
  updatesDisabledConversationIds: readonly string[];
}>();

const selectedScopeId = defineModel<string>("selectedScopeId", {
  required: true,
});
const selectedConversationIds = defineModel<readonly string[]>(
  "selectedConversationIds",
  { required: true }
);

const currentScope = computed(() =>
  props.scopes.find((scope) => scope.id === selectedScopeId.value)
);
const conversationSelectionModel = computed<string | readonly string[]>(() =>
  currentScope.value?.kind === "no-project"
    ? (selectedConversationIds.value.at(0) ?? "")
    : selectedConversationIds.value
);
const scopeOptions = computed(() =>
  props.scopes.flatMap((scope) => {
    const selectableConversations = getSelectableConversations(scope);
    if (selectableConversations.length === 0) {
      return [];
    }
    return [
      {
        label: scope.label,
        value: scope.id,
        caption:
          scope.kind === "no-project"
            ? `${String(selectableConversations.length)} eligible conversations without a project`
            : `${String(selectableConversations.length)} eligible conversations`,
        searchText: `${scope.label} ${selectableConversations
          .map((conversation) => conversation.title)
          .join(" ")}`,
      },
    ];
  })
);
const conversationOptions = computed(
  () =>
    currentScope.value?.conversations.map((conversation) => ({
      label: conversation.title,
      value: conversation.id,
      caption: props.updatesDisabledConversationIds.includes(conversation.id)
        ? "Email Updates disabled for this conversation"
        : `About ${new Intl.NumberFormat().format(
            conversation.eligibleParticipantCount
          )} participants before email consent filters`,
      disabled: props.updatesDisabledConversationIds.includes(conversation.id),
    })) ?? []
);
const conversationDialogSubtitle = computed(() =>
  currentScope.value?.kind === "no-project"
    ? "Choose exactly one conversation created without a project."
    : "Choose one or more conversations from this project."
);
const selectAllLabel = computed(() => {
  const count = getSelectableConversations(currentScope.value).length;
  return `Select all ${String(count)} eligible conversations`;
});

function getSelectedCountLabel({ count }: { count: number }): string {
  return count === 1 ? "1 conversation" : `${String(count)} conversations`;
}

function getSelectableConversations(
  scope: ConversationUpdateScopeSummary | undefined
): readonly ConversationUpdateConversationSummary[] {
  return (
    scope?.conversations.filter(
      (conversation) =>
        !props.updatesDisabledConversationIds.includes(conversation.id)
    ) ?? []
  );
}

function updateSelectedScope(value: string | readonly string[]): void {
  if (typeof value === "string") {
    selectedScopeId.value = value;
    selectedConversationIds.value = [];
  }
}

function updateSelectedConversations(value: string | readonly string[]): void {
  selectedConversationIds.value = typeof value === "string" ? [value] : value;
}
</script>

<style scoped lang="scss">
.scope-fields {
  display: grid;
  gap: 1rem;

  &__conversation-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;

    p {
      margin: 0.25rem 0 0;
      color: $grey-7;
      font-size: 0.78rem;
      line-height: 1.4;
    }
  }

  &__hint {
    margin: -0.4rem 0 0;
    color: $grey-7;
    font-size: 0.75rem;
  }
}
</style>
