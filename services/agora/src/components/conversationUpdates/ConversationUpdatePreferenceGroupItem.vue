<template>
  <q-expansion-item
    :model-value="expanded"
    switch-toggle-side
    expand-icon-toggle
    :hide-expand-icon="group.conversations.length === 0"
    @update:model-value="expanded = $event"
  >
    <template #header>
      <q-item-section>
        <SpaLink
          v-if="group.kind === 'project'"
          class="preference-group-item__link"
          :to="`/project/${group.projectSlug}`"
          target="_blank"
          rel="noopener noreferrer"
          @click.stop
        >
          <ConversationUpdatePreferenceAvatar
            :fallback-label="label"
            :owner="group.owner"
          />
          <strong>{{ label }}</strong>
        </SpaLink>
        <strong v-else class="preference-group-item__label">
          {{ label }}
        </strong>
      </q-item-section>
      <q-item-section v-if="group.kind === 'project'" side>
        <div class="preference-group-item__switch" @click.stop>
          <ZKSwitch
            :model-value="group.state === 'enabled'"
            :disable="
              group.availability === 'temporarily_unavailable' || savingProject
            "
            :aria-label="t('receiveEmailUpdatesFor', { name: label })"
            @update:model-value="
              emit('setProjectEnabled', { group, enabled: $event })
            "
          />
        </div>
      </q-item-section>
    </template>

    <q-list separator class="preference-group-item__conversations">
      <ConversationUpdatePreferenceRow
        v-for="conversation in group.conversations"
        :key="conversation.conversationSlugId"
        :conversation="conversation"
        :destination="getConversationDestination(conversation.conversationSlugId)"
        :nested="true"
        :open-in-new-tab="group.kind === 'project'"
        :owner="getConversationOwner(conversation)"
        :saving="savingConversationSlugIds.has(conversation.conversationSlugId)"
        @set-enabled="
          emit('setConversationEnabled', {
            conversationSlugId: conversation.conversationSlugId,
            enabled: $event,
          })
        "
      />
    </q-list>
  </q-expansion-item>
</template>

<script setup lang="ts">
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKSwitch from "src/components/ui-library/ZKSwitch.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  ConversationEmailUpdatePreferenceAvatar,
  ConversationEmailUpdatePreferenceGroup,
} from "src/shared/types/dto";

import ConversationUpdatePreferenceAvatar from "./ConversationUpdatePreferenceAvatar.vue";
import {
  type ConversationUpdatePreferenceControlsTranslations,
  conversationUpdatePreferenceControlsTranslations,
} from "./conversationUpdatePreferenceControls.i18n";
import ConversationUpdatePreferenceRow from "./ConversationUpdatePreferenceRow.vue";
import type {
  ConversationEmailUpdatePreference,
  ConversationEmailUpdatePreferenceChange,
  ProjectEmailUpdatePreferenceGroup,
} from "./conversationUpdatePreferenceTypes";

const props = defineProps<{
  group: ConversationEmailUpdatePreferenceGroup;
  label: string;
  savingConversationSlugIds: ReadonlySet<string>;
  savingProject: boolean;
}>();

const emit = defineEmits<{
  setConversationEnabled: [preference: ConversationEmailUpdatePreferenceChange];
  setProjectEnabled: [preference: {
    group: ProjectEmailUpdatePreferenceGroup;
    enabled: boolean;
  }];
}>();
const expanded = defineModel<boolean>("expanded", { required: true });
const { t } =
  useComponentI18n<ConversationUpdatePreferenceControlsTranslations>(
    conversationUpdatePreferenceControlsTranslations
  );

function getConversationDestination(conversationSlugId: string): string {
  return props.group.kind === "project"
    ? `/project/${props.group.projectSlug}/conversation/${conversationSlugId}`
    : `/conversation/${conversationSlugId}`;
}

function getConversationOwner(
  conversation: ConversationEmailUpdatePreference
): ConversationEmailUpdatePreferenceAvatar | undefined {
  if (props.group.kind === "project") {
    return props.group.owner;
  }
  return "owner" in conversation ? conversation.owner : undefined;
}
</script>

<style scoped lang="scss">
.preference-group-item {
  &__link {
    display: inline-flex;
    align-items: center;
    gap: 0.625rem;
    width: fit-content;
    color: $color-text-strong;
  }

  &__label {
    color: $color-text-strong;
  }

  &__switch {
    display: flex;
  }

  &__conversations {
    border-top: 1px solid $grey-4;
    background: rgba($primary, 0.025);
  }
}
</style>
