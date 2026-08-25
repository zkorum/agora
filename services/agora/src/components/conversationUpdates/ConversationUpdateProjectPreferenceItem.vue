<template>
  <q-expansion-item
    :model-value="expanded"
    switch-toggle-side
    expand-icon-toggle
    @update:model-value="expanded = $event"
  >
    <template #header>
      <q-item-section>
        <SpaLink
          class="project-preference-item__link"
          :to="`/project/${group.projectSlug}`"
          @click.stop
        >
          <strong>{{ group.projectTitle }}</strong>
        </SpaLink>
      </q-item-section>
      <q-item-section side>
        <div class="project-preference-item__switch" @click.stop>
          <ZKSwitch
            :model-value="group.state === 'enabled'"
            :disable="
              group.availability === 'temporarily_unavailable' || savingProject
            "
            :aria-label="
              t('receiveEmailUpdatesFor', { name: group.projectTitle })
            "
            @update:model-value="emit('setProjectEnabled', $event)"
          />
        </div>
      </q-item-section>
    </template>

    <q-list separator class="project-preference-item__conversations">
      <ConversationUpdatePreferenceRow
        v-for="conversation in group.conversations"
        :key="conversation.conversationSlugId"
        :conversation="conversation"
        :nested="true"
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

import {
  type ConversationUpdatePreferenceControlsTranslations,
  conversationUpdatePreferenceControlsTranslations,
} from "./conversationUpdatePreferenceControls.i18n";
import ConversationUpdatePreferenceRow from "./ConversationUpdatePreferenceRow.vue";
import type {
  ConversationEmailUpdatePreferenceChange,
  ProjectEmailUpdatePreferenceGroup,
} from "./conversationUpdatePreferenceTypes";

defineProps<{
  group: ProjectEmailUpdatePreferenceGroup;
  savingConversationSlugIds: ReadonlySet<string>;
  savingProject: boolean;
}>();

const emit = defineEmits<{
  setConversationEnabled: [preference: ConversationEmailUpdatePreferenceChange];
  setProjectEnabled: [enabled: boolean];
}>();
const expanded = defineModel<boolean>("expanded", { required: true });
const { t } =
  useComponentI18n<ConversationUpdatePreferenceControlsTranslations>(
    conversationUpdatePreferenceControlsTranslations
  );
</script>

<style scoped lang="scss">
.project-preference-item {
  &__link {
    display: inline-block;
    width: fit-content;
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
