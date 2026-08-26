<template>
  <ZKCard
    v-if="hasEntitlement"
    padding="1rem"
    class="conversation-updates-configuration"
  >
    <AdminSectionHeader
      :title="t('title')"
      :description="configurationDescription"
    />

    <ZKInfoBanner
      v-if="!hasParticipantContactEmail"
      :message="t('missingContact')"
      variant="warning"
      :action-label="t('editParticipantContact')"
      @action="emit('editContact')"
    />

    <div class="conversation-updates-configuration__activation">
      <div>
        <strong>{{ t("defaultLabel") }}</strong>
        <span>{{ activationDescription }}</span>
      </div>
      <ZKSwitch
        v-model="enabled"
        :aria-label="t('defaultAriaLabel')"
        :disable="disabled || (!hasParticipantContactEmail && !enabled)"
      />
    </div>
  </ZKCard>
</template>

<script setup lang="ts">
import AdminSectionHeader from "src/components/administrator/AdminSectionHeader.vue";
import ZKCard from "src/components/ui-library/ZKCard.vue";
import ZKInfoBanner from "src/components/ui-library/ZKInfoBanner.vue";
import ZKSwitch from "src/components/ui-library/ZKSwitch.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { computed } from "vue";

import {
  type ProjectConversationUpdatesActivationTranslations,
  projectConversationUpdatesActivationTranslations,
} from "./ProjectConversationUpdatesActivation.i18n";

const props = defineProps<{
  activationKind: "listed-project" | "no-project-container";
  projectTitle: string;
  hasParticipantContactEmail: boolean;
  hasEntitlement: boolean;
  disabled: boolean;
}>();
const emit = defineEmits<{
  editContact: [];
}>();

const enabled = defineModel<boolean>({ required: true });
const { t } = useComponentI18n<ProjectConversationUpdatesActivationTranslations>(
  projectConversationUpdatesActivationTranslations
);

const configurationDescription = computed(() =>
  props.activationKind === "listed-project"
    ? t("listedDescription", { projectTitle: props.projectTitle })
    : t("noProjectDescription")
);
const activationDescription = computed(() =>
  props.activationKind === "listed-project"
    ? t("listedDefaultDescription")
    : t("noProjectDefaultDescription")
);
</script>

<style scoped lang="scss">
.conversation-updates-configuration {
  display: grid;
  gap: 1.25rem;
  background: $color-background-default;

  &__activation {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  &__activation {
    padding-block-start: 1rem;
    border-top: 1px solid $grey-4;

    > div {
      display: grid;
      gap: 0.25rem;
    }

    strong {
      color: $color-text-strong;
    }

    span {
      color: $grey-7;
      font-size: 0.78rem;
      line-height: 1.4;
    }
  }
}
</style>
