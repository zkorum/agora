<template>
  <div class="scope-fields">
    <ZKSearchableBottomSheetSelect
      :model-value="selectedScopeId"
      :options="scopeOptions"
      :label="t('projectLabel')"
      required
      :required-text="t('required')"
      :dialog-title="t('chooseProject')"
      :dialog-subtitle="t('projectAuthorizationDescription')"
      search-mode="always"
      :disable="disabled"
      @update:model-value="updateSelectedScope"
    />

    <div class="scope-fields__conversation-heading">
      <div>
        <strong>{{ t("conversationsHeading") }}</strong>
        <p>{{ t("recipientIntersectionDescription") }}</p>
      </div>
    </div>

    <ZKSearchableBottomSheetSelect
      :model-value="conversationSelectionModel"
      :options="conversationOptions"
      :label="t('includedConversationsLabel')"
      required
      :required-text="t('required')"
      :placeholder="t('conversationPlaceholder')"
      :dialog-title="t('chooseConversations')"
      :dialog-subtitle="conversationDialogSubtitle"
      search-mode="always"
      :multiple="currentScope?.kind === 'project'"
      :show-bulk-actions="currentScope?.kind === 'project'"
      :select-all-label="selectAllLabel"
      :clear-all-label="t('clearAll')"
      :selected-count-label="getSelectedCountLabel"
      :disable="disabled"
      @update:model-value="updateSelectedConversations"
    />

    <p v-if="currentScope?.kind === 'no-project'" class="scope-fields__hint">
      {{ t("noProjectHint") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type {
  ConversationUpdateConversationSummary,
  ConversationUpdateScopeSummary,
} from "src/components/conversationUpdates/conversationUpdateTypes";
import ZKSearchableBottomSheetSelect from "src/components/ui-library/ZKSearchableBottomSheetSelect.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { computed } from "vue";

import {
  type ConversationUpdateScopeFieldsTranslations,
  conversationUpdateScopeFieldsTranslations,
} from "./ConversationUpdateScopeFields.i18n";

const props = defineProps<{
  scopes: readonly ConversationUpdateScopeSummary[];
  updatesDisabledConversationIds: readonly string[];
  disabled: boolean;
}>();

const { t, locale } =
  useComponentI18n<ConversationUpdateScopeFieldsTranslations>(
    conversationUpdateScopeFieldsTranslations
  );

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
  props.scopes.map((scope) => {
    const selectableConversations = getSelectableConversations(scope);
    return {
      label: scope.label,
      value: scope.id,
      caption: getEligibleConversationCountLabel({
        count: selectableConversations.length,
        withoutProject: scope.kind === "no-project",
      }),
      searchText: `${scope.label} ${scope.conversations
        .map((conversation) => conversation.title)
        .join(" ")}`,
      disabled: selectableConversations.length === 0,
    };
  })
);
const conversationOptions = computed(
  () =>
    currentScope.value?.conversations.map((conversation) => ({
      label: conversation.title,
      value: conversation.id,
      caption: props.updatesDisabledConversationIds.includes(conversation.id)
        ? t("updatesDisabled")
        : t(
            conversation.eligibleParticipantCount === 1
              ? "participantEstimateSingular"
              : "participantEstimatePlural",
            { count: formatNumber(conversation.eligibleParticipantCount) }
          ),
      disabled: props.updatesDisabledConversationIds.includes(conversation.id),
    })) ?? []
);
const conversationDialogSubtitle = computed(() =>
  currentScope.value?.kind === "no-project"
    ? t("noProjectDialogSubtitle")
    : t("projectDialogSubtitle")
);
const selectAllLabel = computed(() => {
  const count = getSelectableConversations(currentScope.value).length;
  return t(
    count === 1 ? "selectAllEligibleSingular" : "selectAllEligiblePlural",
    { count: formatNumber(count) }
  );
});

function getSelectedCountLabel({ count }: { count: number }): string {
  return t(count === 1 ? "conversationSingular" : "conversationPlural", {
    count: formatNumber(count),
  });
}

function getEligibleConversationCountLabel({
  count,
  withoutProject,
}: {
  count: number;
  withoutProject: boolean;
}): string {
  const key = withoutProject
    ? count === 1
      ? "eligibleWithoutProjectSingular"
      : "eligibleWithoutProjectPlural"
    : count === 1
      ? "eligibleConversationSingular"
      : "eligibleConversationPlural";
  return t(key, { count: formatNumber(count) });
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(locale.value).format(value);
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
  if (!props.disabled && typeof value === "string") {
    selectedScopeId.value = value;
    selectedConversationIds.value = [];
  }
}

function updateSelectedConversations(value: string | readonly string[]): void {
  if (!props.disabled) {
    selectedConversationIds.value = typeof value === "string" ? [value] : value;
  }
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
