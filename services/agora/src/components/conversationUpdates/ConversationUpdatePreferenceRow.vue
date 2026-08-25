<template>
  <q-item
    class="conversation-preference-row"
    :class="{ 'conversation-preference-row--nested': nested }"
  >
    <q-item-section>
      <SpaLink
        class="conversation-preference-row__link"
        :to="destination"
        :target="openInNewTab ? '_blank' : undefined"
        :rel="openInNewTab ? 'noopener noreferrer' : undefined"
      >
        <ConversationUpdatePreferenceAvatar
          :fallback-label="conversation.conversationTitle"
          :owner="owner"
        />
        <span>{{ conversation.conversationTitle }}</span>
      </SpaLink>
    </q-item-section>
    <q-item-section side>
      <ZKSwitch
        :model-value="conversation.state === 'enabled'"
        :disable="
          conversation.availability === 'temporarily_unavailable' || saving
        "
        :aria-label="
          t('receiveEmailUpdatesFor', {
            name: conversation.conversationTitle,
          })
        "
        @update:model-value="emit('setEnabled', $event)"
      />
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKSwitch from "src/components/ui-library/ZKSwitch.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ConversationEmailUpdatePreferenceAvatar } from "src/shared/types/dto";

import ConversationUpdatePreferenceAvatar from "./ConversationUpdatePreferenceAvatar.vue";
import {
  type ConversationUpdatePreferenceControlsTranslations,
  conversationUpdatePreferenceControlsTranslations,
} from "./conversationUpdatePreferenceControls.i18n";
import type { ConversationEmailUpdatePreference } from "./conversationUpdatePreferenceTypes";

defineProps<{
  conversation: ConversationEmailUpdatePreference;
  destination: string;
  nested: boolean;
  openInNewTab: boolean;
  owner: ConversationEmailUpdatePreferenceAvatar | undefined;
  saving: boolean;
}>();

const emit = defineEmits<{
  setEnabled: [enabled: boolean];
}>();
const { t } =
  useComponentI18n<ConversationUpdatePreferenceControlsTranslations>(
    conversationUpdatePreferenceControlsTranslations
  );
</script>

<style scoped lang="scss">
.conversation-preference-row {
  min-height: 3.75rem;

  &--nested {
    padding-inline-start: 2.5rem;
  }

  &__link {
    display: inline-flex;
    align-items: center;
    gap: 0.625rem;
    width: fit-content;
    color: $color-text-strong;
    font-weight: var(--font-weight-medium);
  }
}
</style>
