<template>
  <template v-if="shouldShow">
    <ConversationControlButton
      :label="controlLabel"
      :icon="showDialog ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
      @click="showDialog = true"
    />

    <q-dialog v-model="showDialog" position="bottom">
      <ZKBottomDialogContainer
        :title="t('emailUpdates')"
        :subtitle="dialogSubtitle"
      >
        <div class="conversation-updates-settings__list">
          <ConversationLanguageSettingsRow
            :title="t('emailUpdates')"
            :value="settingValue"
            :description="settingDescription"
            :icon="undefined"
            :disabled="false"
            :clickable="false"
          >
            <template #actions>
              <q-toggle
                :model-value="displayEnabled"
                :aria-label="
                  t('enableAriaLabel', { conversationTitle })
                "
                @update:model-value="updateEnabled"
              />
            </template>
          </ConversationLanguageSettingsRow>
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>
  </template>
</template>

<script setup lang="ts">
import ConversationControlButton from "src/components/newConversation/ConversationControlButton.vue";
import ConversationLanguageSettingsRow from "src/components/newConversation/dialog/ConversationLanguageSettingsRow.vue";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { computed, ref } from "vue";

import {
  type CreateConversationUpdatesSettingsTranslations,
  createConversationUpdatesSettingsTranslations,
} from "./CreateConversationUpdatesSettings.i18n";

const props = defineProps<{
  conversationTitle: string;
  scopeKind: "project" | "no-project";
  projectTitle: string | undefined;
  scopeDefaultEnabled: boolean;
  inheritsScopeDefault: boolean;
  hasEntitlement: boolean;
}>();

const enabled = defineModel<boolean>({ required: true });
const showDialog = ref(false);
const { t } = useComponentI18n<CreateConversationUpdatesSettingsTranslations>(
  createConversationUpdatesSettingsTranslations
);

const shouldShow = computed(() => props.hasEntitlement);
const displayEnabled = computed(() => enabled.value);
const settingValue = computed(() =>
  displayEnabled.value ? t("on") : t("off")
);
const dialogSubtitle = computed(() => t("manualUpdatesSubtitle"));
const controlLabel = computed(() => {
  const value = enabled.value ? t("on") : t("off");
  const inheritedSource =
    props.scopeKind === "project"
      ? t("projectDefault")
      : t("noProjectDefault");
  const source = props.inheritsScopeDefault ? inheritedSource : t("override");
  return t("controlLabel", { value, source });
});
const settingDescription = computed(() => {
  const defaultValue = props.scopeDefaultEnabled ? t("on") : t("off");
  const scopeLabel =
    props.scopeKind === "project"
      ? (props.projectTitle ?? t("projectFallback"))
      : t("noProjectGroup");
  if (props.inheritsScopeDefault) {
    return t("inheritsDescription", { defaultValue, scopeLabel });
  }
  return t("overridesDescription", { defaultValue, scopeLabel });
});
function updateEnabled(value: boolean): void {
  enabled.value = value;
  showDialog.value = false;
}
</script>

<style scoped lang="scss">
.conversation-updates-settings__list {
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 18px;
  background: white;
}
</style>
