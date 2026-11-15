<template>
  <RoutedBottomSheet
    :dismissal="sheet"
    :allow-focus-outside="false"
    :label="t('dialogLabel')"
    :return-target="returnTarget"
  >
    <router-view v-slot="{ Component }">
      <component :is="Component" :sheet="sheet" />
    </router-view>
  </RoutedBottomSheet>
</template>

<script setup lang="ts">
import RoutedBottomSheet from "src/components/ui-library/RoutedBottomSheet.vue";
import { useConversationOnboardingExit } from "src/composables/conversation/useConversationOnboardingExit";
import { useConversationOnboardingRoute } from "src/composables/conversation/useConversationOnboardingRoute";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type ConversationOnboardingLayoutTranslations,
  conversationOnboardingLayoutTranslations,
} from "src/layouts/ConversationOnboardingLayout.i18n";
import { useConversationOnboardingStore } from "src/stores/conversationOnboarding";
import { createDismissalController } from "src/utils/ui/dismissalController";

const { routeConversationSlugId, routeContext } =
  useConversationOnboardingRoute();
const { exitToConversation } = useConversationOnboardingExit();
const returnTarget = useConversationOnboardingStore().returnTarget ?? undefined;
const sheet = createDismissalController({
  fallbackDismiss: async () => {
    await exitToConversation({
      conversationSlugId: routeConversationSlugId.value,
      routeContext: routeContext.value,
    });
  },
});
const { t } = useComponentI18n<ConversationOnboardingLayoutTranslations>(
  conversationOnboardingLayoutTranslations
);
</script>
